const { PAGE_SIZE, getRankedUsers, formatRanking, pageButton } = require("../utils/leaderboard.js");

module.exports = {
  time: 300000,
  run: async (client, prisma) => {
    if (!process.env.LEADERBOARD_CHANNEL || !process.env.LEADERBOARD_MESSAGE) {
      return;
    }

    console.log(new Date().toLocaleString(), "Leaderboard wird aktualisiert...");
    const users = await getRankedUsers(prisma);
    const [buildCount, userCount] = await Promise.all([
      prisma.build.count(),
      prisma.user.count({ where: { banned: false } }),
    ]);
    const points = users.reduce((sum, user) => sum + user.points, 0);

    const channel = await client.channels.fetch(process.env.LEADERBOARD_CHANNEL);
    const message = await channel.messages.fetch(process.env.LEADERBOARD_MESSAGE);
    await message.edit({
      content: null,
      embeds: [
        {
          title: "Leaderboard",
          description: formatRanking(users, 0) || "Noch keine Punkte vergeben.",
          color: 13697024,
          fields: [
            {
              name: "Statistik",
              value: `Builds gesamt: \`${buildCount}\`\nRegistrierte Builder: \`${userCount}\`\nPunkte gesamt: \`${points}\``,
            },
          ],
          footer: {
            text: "Starte noch heute und kämpfe dich an die Spitze! Registrierung via /register",
          },
          thumbnail: process.env.EVENT_IMG ? { url: process.env.EVENT_IMG } : undefined,
        },
      ],
      components: users.length > PAGE_SIZE ? [pageButton(1)] : [],
    });
  },
};
