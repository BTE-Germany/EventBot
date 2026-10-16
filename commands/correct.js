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
} = require("../utils/points.js");

module.exports = {
  command: {
    name: "correct",
    description: "Korrigiert nachträglich die Bewertung eines Builds.",
    // Hidden for everyone except admins; grant the judge role access under
    // Server Settings > Integrations > Bot
    default_member_permissions: "0",
    options: [
      {
        name: "id",
        description: "Die ID des zu korrigierenden Builds.",
        type: 4,
        autocomplete: true,
        required: true,
      },
      {
        name: "reason",
        description: "Grund für die nachträgliche Korrektur",
        type: 3,
        required: true,
      },
      {
        name: "grundpunkte",
        description: "Neue Grundpunkte (1 für Infrastruktur, 2 für Gebäude)",
        type: 10,
        choices: [
          { name: "2 (Gebäude)", value: 2 },
          { name: "1 (Infrastruktur)", value: 1 },
        ],
        required: false,
      },
      {
        name: "aufwand_komplexitaet",
        description: `Neuer Aufwand & Komplexität (0 bis ${MAX_AUFWAND} Punkte)`,
        type: 10,
        choices: scoreChoices(MAX_AUFWAND),
        required: false,
      },
      {
        name: "technik_farben_details",
        description: `Neue Technik, Farben & Details (0 bis ${MAX_DETAILS} Punkte)`,
        type: 10,
        choices: scoreChoices(MAX_DETAILS),
        required: false,
      },
    ],
  },
  autocomplete: async (client, interaction, prisma) => {
    return respondWithBuilds(interaction, prisma, { filter: "judged" });
  },
  run: async (client, interaction, prisma) => {
    if (!isJudge(interaction)) return denyJudge(interaction);

    const buildId = interaction.options.getInteger("id");
    const reason = interaction.options.getString("reason");
    const newGrund = interaction.options.getNumber("grundpunkte");
    const newAufwand = interaction.options.getNumber("aufwand_komplexitaet");
    const newDetails = interaction.options.getNumber("technik_farben_details");

    if (newGrund === null && newAufwand === null && newDetails === null) {
      return interaction.reply({
        content:
          "Bitte gib mindestens eine Kategorie an, die du korrigieren möchtest (Grundpunkte, Aufwand oder Technik).",
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const build = await prisma.build.findUnique({ where: { id: buildId } });
    if (!build) {
      return interaction.editReply({ content: "Build nicht gefunden." });
    }
    if (build.judges.length === 0) {
      return interaction.editReply({
        content: "Dieses Build wurde noch gar nicht bewertet. Nutze `/judge`.",
      });
    }

    const updatedBase = newGrund ?? build.base_points;
    const updatedAufwand = newAufwand ?? build.B;
    const updatedDetails = newDetails ?? build.A;
    const oldTotal = buildTotal(build);

    const existingDetails = Array.isArray(build.judge_details) ? build.judge_details : [];
    const correctionEntry = {
      action: "CORRECTION",
      corrector_id: interaction.user.id,
      corrector_name: interaction.user.username,
      reason,
      old_values: {
        grundpunkte: build.base_points,
        aufwand: build.B,
        details: build.A,
      },
      timestamp: new Date().toISOString(),
    };

    // With only one judge so far, the stored values are judge 1's own scores,
    // which judge 2 will average with, so keep judge 1's entry in sync
    const judgeDetails = [...existingDetails, correctionEntry].map((d) =>
      build.judges.length === 1 && !d.action && d.judge_id === build.judges[0]
        ? { ...d, grundpunkte: updatedBase, aufwand: updatedAufwand, details: updatedDetails }
        : d
    );

    await prisma.build.update({
      where: { id: buildId },
      data: {
        base_points: updatedBase,
        B: updatedAufwand,
        A: updatedDetails,
        judge_details: judgeDetails,
      },
    });

    if (build.judges.length >= 2) {
      await recalculateUserPoints(prisma, build.builder_id);
    }
    const { build: updated } = await refreshBuildingPanel(client, prisma, buildId);

    const newTotal = buildTotal(updated);
    const pointDiff = Number((newTotal - oldTotal).toFixed(2));
    console.log(
      new Date().toLocaleString(),
      `[KORREKTUR] Build #${buildId} korrigiert von ${interaction.user.username}: ${oldTotal} -> ${newTotal} Pkt. Grund: ${reason}`
    );

    await interaction.editReply({
      content:
        `Build **#${buildId}** erfolgreich korrigiert!\n` +
        `• Alte Punkte: **${oldTotal}**\n` +
        `• Neue Punkte: **${newTotal}** (${pointDiff >= 0 ? "+" : ""}${pointDiff})\n` +
        (build.judges.length < 2 ? "• *Zwischenbewertung, Punkte werden erst nach dem 2. Judge vergeben.*\n" : "") +
        `• Grund: *${reason}*`,
    });
  },
};
