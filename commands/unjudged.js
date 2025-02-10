const { Prisma } = require("@prisma/client");

require("dotenv").config();

module.exports = {
  command: {
    name: "unjudged",
    description: "Ruft alle unjudizierten Builds ab.",
  },
  run: async (client, interaction, prisma) => {
    //get all unjudged builds, that means judges[] cardinality is < 2
    const unjudgedBuilds = await prisma.$queryRaw(Prisma.sql`SELECT id, \'https://discord.com/channels/${process.env.GUILD_ID}/${process.env.JUDGE_CHANNEL}/\' || judge_msg AS discord_url FROM \"Builds\" WHERE cardinality(judges) < 2;`);

    if (unjudgedBuilds.length === 0) {
      return interaction.reply({
        content: "Alle Builds wurden bereits bewertet.",
        ephemeral: true,
      });
    }

    const unjudgedBuildsLong = unjudgedBuilds.map((build) => {
        return `[#${build.id}](${build.discord_url})`;
    }).join("\n");

    if(unjudgedBuildsLong.length > 2000) {
        const unjudgedBuildsShort = unjudgedBuilds.map((build) => {
            return `#${build.id}`;
        }).join("\n");
        return interaction.reply({
            content: `Die Liste ist zu lang, um sie anzuzeigen. Hier sind die IDs:\n${unjudgedBuildsShort}`,
            ephemeral: true,
        });
    }

    return interaction.reply({
      content: `Folgende Builds wurden noch nicht bewertet:\n${unjudgedBuildsLong}`,
      ephemeral: true,
    });
  }
};
