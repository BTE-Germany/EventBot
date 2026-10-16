const { PAGE_SIZE, getRankedUsers, formatRanking, pageButton } = require("../utils/leaderboard.js");

module.exports = {
    button: {
        name: "leader-"
    },
    run: async (client, interaction, prisma) => {
        const page = parseInt(interaction.customId.split("leader-")[1]);
        const users = await getRankedUsers(prisma);

        if (users.length <= page * PAGE_SIZE) {
            return interaction.reply({
                content: "Keine weitere Seite verfügbar.",
                ephemeral: true
            });
        }

        const hasNextPage = users.length > (page + 1) * PAGE_SIZE;
        await interaction.reply({
            embeds: [
                {
                    title: `Leaderboard - Seite ${page + 1}`,
                    description: formatRanking(users, page),
                    color: 13697024,
                    footer: {
                        text: "Starte noch heute und kämpfe dich an die Spitze! Registrierung via /register"
                    },
                    thumbnail: process.env.EVENT_IMG ? { url: process.env.EVENT_IMG } : undefined
                }
            ],
            ephemeral: true,
            components: hasNextPage ? [pageButton(page + 1)] : []
        });
    },
};
