require("dotenv").config();
const { isJudge, denyJudge } = require("../utils/permissions.js");

const MAX_LENGTH = 2000;

module.exports = {
  command: {
    name: "unjudged",
    description: "Listet alle Builds auf, die noch nicht vollständig bewertet wurden.",
    // Hidden for everyone except admins; grant the judge role access under
    // Server Settings > Integrations > Bot
    default_member_permissions: "0",
  },
  run: async (client, interaction, prisma) => {
    if (!isJudge(interaction)) return denyJudge(interaction);

    const builds = await prisma.$queryRaw`
      SELECT id, judge_msg, cardinality(judges)::int AS judge_count FROM "Build"
      WHERE cardinality(judges) < 2
      ORDER BY id ASC`;

    if (builds.length === 0) {
      return interaction.reply({
        content: "Alle Builds wurden bereits bewertet.",
        ephemeral: true,
      });
    }

    const header = `Folgende Builds wurden noch nicht vollständig bewertet (${builds.length}):\n`;
    const lines = builds.map((b) =>
      b.judge_msg
        ? `[#${b.id}](https://discord.com/channels/${process.env.GUILD_ID}/${process.env.JUDGE_CHANNEL}/${b.judge_msg}) (${b.judge_count}/2)`
        : `#${b.id} (${b.judge_count}/2)`
    );

    let content = header;
    for (const [i, line] of lines.entries()) {
      const more = `\n… und ${lines.length - i} weitere`;
      if (content.length + line.length + 1 + more.length > MAX_LENGTH) {
        content += more;
        break;
      }
      content += `${line}\n`;
    }

    return interaction.reply({ content, ephemeral: true });
  },
};
