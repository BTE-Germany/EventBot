module.exports = {
    button: {
        name: "leader-"
    },
    run: async (client, interaction, prisma) => {
        let pageNum = parseInt(interaction.customId.split("leader-")[1]);

        let users = await prisma.user.findMany();
        users = users.map((user) => {
            return {
                id: user.id.toString(),
                points: user.points,
            };
        });
        users = users.sort((a, b) => b.points - a.points);
        users = users.slice(pageNum * 10, (pageNum * 10 + 1) + 10)

        if(users.length === 0) {
            interaction.reply({
                content: "Keine weitere Seite verfügbar.",
                ephemeral: true
            });
            return
        }

        let points = 0;
        users.forEach((user) => {
            points = points + user.points;
        });

        const guildMembers = await client.guilds.cache
            .get(process.env.GUILD_ID)
            .members.fetch()
            .then((members) =>
                members.map((member) => {
                    return {
                        id: member.id,
                        username: member.user.username,
                        discriminator: member.user.discriminator,
                    };
                })
            );

        let userlist = "";
        let increment = pageNum * 10 + 1;
        users.forEach((user) => {
            userlist += `${increment}. ${user.minecraft_id}  |  \`${user.points}\` \n`
        });

        interaction.reply({
            "content": null,
            "embeds": [
                {
                    "title": `Leaderboard - Seite ${pageNum}`,
                    "description": userlist,
                    "color": 13697024,
                    "footer": {
                        "text": "Starte noch heute und kämpfe dich an die Spitze! Registrierung via /register"
                    },
                    "thumbnail": {
                        "url": process.env.EVENT_IMG
                    }
                }
            ],
            "attachments": [],
            "ephemeral": true,
            "components": [
                {
                    "type": 1,
                    "components": [
                        {
                            "style": 3,
                            "label": `Seite ${pageNum + 1}`,
                            "custom_id": `leader-${pageNum + 1}`,
                            "disabled": false,
                            "emoji": {
                                "name": `➡`
                            },
                            "type": 2
                        }
                    ]
                }
            ]
        });
    },
};
