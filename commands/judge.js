require("dotenv").config();
const { isJudge, denyJudge } = require("../utils/permissions.js");
const { refreshBuildingPanel } = require("../utils/buildingPanel.js");
const { respondWithBuilds } = require("../utils/autocomplete.js");
const {
  MAX_AUFWAND,
  MAX_DETAILS,
  recalculateUserPoints,
  buildTotal,
  scoreChoices,
  categoryName,
} = require("../utils/points.js");

function judgePanelLink(build) {
  if (!build.judge_msg) return [];
  return [
    {
      type: 1,
      components: [
        {
          type: 2,
          label: "Zum Build",
          style: 5,
          url: `https://discord.com/channels/${process.env.GUILD_ID}/${process.env.JUDGE_CHANNEL}/${build.judge_msg}`,
        },
      ],
    },
  ];
}

module.exports = {
  command: {
    name: "judge",
    description: "Bewerte ein Build!",
    // Hidden for everyone except admins; grant the judge role access under
    // Server Settings > Integrations > Bot
    default_member_permissions: "0",
    options: [
      {
        name: "id",
        description: "Die ID des zu beurteilenden Builds.",
        type: 4,
        autocomplete: true,
        required: true,
      },
      {
        name: "aufwand_komplexitaet",
        description: `Aufwand & Komplexität (0 bis ${MAX_AUFWAND} Punkte)`,
        type: 10,
        choices: scoreChoices(MAX_AUFWAND),
        required: true,
      },
      {
        name: "technik_farben_details",
        description: `Technik, Farben & Details (0 bis ${MAX_DETAILS} Punkte)`,
        type: 10,
        choices: scoreChoices(MAX_DETAILS),
        required: true,
      },
      {
        name: "grundpunkte",
        description:
          "Grundpunkte: 1 für Infrastruktur, 2 für Gebäude (nur 1. Judge)",
        type: 10,
        autocomplete: true,
        required: false,
      },
    ],
  },
  autocomplete: async (client, interaction, prisma) => {
    const focusedOption = interaction.options.getFocused(true);
    if (focusedOption.name === "id") {
      return respondWithBuilds(interaction, prisma, { filter: "unfinished", order: "ASC" });
    }

    if (focusedOption.name === "grundpunkte") {
      const buildId = interaction.options.getInteger("id");
      const build = buildId
        ? await prisma.build.findUnique({ where: { id: buildId } })
        : null;
      if (build && build.judges.length >= 1) {
        return interaction.respond([
          {
            name: `${build.base_points} (${categoryName(build.base_points)}) - von Judge 1 festgelegt`,
            value: build.base_points,
          },
        ]);
      }
      return interaction.respond([
        { name: "2 (Gebäude)", value: 2 },
        { name: "1 (Infrastruktur)", value: 1 },
      ]);
    }
  },
  run: async (client, interaction, prisma) => {
    if (!isJudge(interaction)) return denyJudge(interaction);

    const buildId = interaction.options.getInteger("id");
    const aufwand = interaction.options.getNumber("aufwand_komplexitaet");
    const details = interaction.options.getNumber("technik_farben_details");
    const grundpunkteInput = interaction.options.getNumber("grundpunkte");
    const judgeId = interaction.user.id;

    await interaction.deferReply({ ephemeral: true });
    const fail = (content) => interaction.editReply({ content });

    const build = await prisma.build.findUnique({ where: { id: buildId } });
    if (!build) {
      return fail("Build nicht gefunden.");
    }
    if (build.judges.length >= 2) {
      return fail("Dieses Build wurde bereits vollständig bewertet. Nutze `/correct` für Korrekturen.");
    }
    if (build.judges.includes(judgeId)) {
      return fail("Du hast dieses Build bereits bewertet.");
    }
    if (build.builder_id.toString() === judgeId) {
      return fail("Du kannst dein eigenes Build nicht bewerten.");
    }
    if (grundpunkteInput !== null && ![1, 2].includes(grundpunkteInput)) {
      return fail("Grundpunkte müssen 1 (Infrastruktur) oder 2 (Gebäude) sein.");
    }

    const isFirstJudge = build.judges.length === 0;
    const existingDetails = Array.isArray(build.judge_details) ? build.judge_details : [];
    const entry = {
      judge_id: judgeId,
      judge_name: interaction.user.username,
      aufwand,
      details,
      timestamp: new Date().toISOString(),
    };

    let data;
    if (isFirstJudge) {
      const grundpunkte = grundpunkteInput ?? 2;
      data = {
        judges: [judgeId],
        base_points: grundpunkte,
        B: aufwand,
        A: details,
        judge_details: [{ ...entry, grundpunkte, total: grundpunkte + aufwand + details }],
      };
    } else {
      // Grundpunkte are decided by judge 1 only; the other categories are averaged
      // Older builds may lack judge 1's entry, so look it up instead of assuming index 0
      const storedJudge1 = existingDetails.find(
        (d) => !d.action && d.judge_id === build.judges[0]
      );
      const judge1 = storedJudge1 || {
        judge_id: build.judges[0],
        grundpunkte: build.base_points,
        aufwand: build.B,
        details: build.A,
      };
      // The panel reads judge 1 and 2 from index 0 and 1, corrections follow
      data = {
        judges: [...build.judges, judgeId],
        B: (build.B + aufwand) / 2,
        A: (build.A + details) / 2,
        judge_details: [
          judge1,
          { ...entry, total: build.base_points + aufwand + details },
          ...existingDetails.filter((d) => d !== storedJudge1),
        ],
      };
    }

    // Only apply if nobody else judged in the meantime
    const { count } = await prisma.build.updateMany({
      where: { id: buildId, judges: { equals: build.judges } },
      data,
    });
    if (count === 0) {
      return fail("Dieses Build wurde gerade von jemand anderem bewertet. Bitte versuche es erneut.");
    }

    if (!isFirstJudge) {
      await recalculateUserPoints(prisma, build.builder_id);
    }
    const { build: updated } = await refreshBuildingPanel(client, prisma, buildId);

    let content;
    if (isFirstJudge) {
      content = `Build **#${buildId}** bewertet. Du warst der 1. Judge (1/2). Grundpunkte wurden auf **${updated.base_points}** (${categoryName(updated.base_points)}) festgelegt.`;
    } else {
      content = `Build **#${buildId}** abgeschlossen. **${buildTotal(updated)}** Punkte wurden dem Builder gutgeschrieben.`;
      if (grundpunkteInput !== null && grundpunkteInput !== updated.base_points) {
        content += `\n*Deine Grundpunkte wurden ignoriert, sie werden nur vom 1. Judge festgelegt (${updated.base_points}).*`;
      }
    }
    await interaction.editReply({ content, components: judgePanelLink(updated) });

    console.log(
      new Date().toLocaleString(),
      `[JUDGE ${updated.judges.length}/2] ${interaction.user.username} (${judgeId}) hat Build #${buildId} bewertet: A=${aufwand}, T=${details}` +
        (isFirstJudge ? `, G=${updated.base_points}` : ` -> Gesamt: ${buildTotal(updated)} Pkt.`)
    );
  },
};
