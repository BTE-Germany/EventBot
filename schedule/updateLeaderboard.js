module.exports = {
    time: 300000,
    run: async (client, prisma) => {
        console.log(new Date().toLocaleString(), "Updating leaderboard...");
        let users = await prisma.user.findMany();
        users = users.map((user) => {
            return {
                id: user.id.toString(),
                points: user.points
            };
        });
        users = users.sort((a, b) => b.points - a.points);

        const builds = await prisma.build.findMany();
        let points = 0;
        users.forEach((user) => {
            points = points + user.points;
        });

        const guildMembers = await client.guilds.cache.get(process.env.GUILD_ID).members.fetch().then(members => members.map(member => {
            return {
                id: member.id,
                username: member.user.username,
                discriminator: member.user.discriminator
            };
        }));
        await client.channels.cache.get(process.env.LEADERBOARD_CHANNEL).messages.fetch(process.env.LEADERBOARD_MESSAGE).then(async message => {
            message.edit({
                "content": null, "embeds": [{
                    "title": process.env.EVENT_NAME, "color": 10630453, "fields": [{
                        "name": ":top: Leaderboard",

                        "value": `:one: ${guildMembers.find(member => member.id === users[0]?.id)?.username}#${guildMembers.find(member => member.id === users[0]?.id)?.discriminator} - ${users[0]?.points}
                        :two: ${guildMembers.find(member => member.id === users[1]?.id)?.username}#${guildMembers.find(member => member.id === users[1].id)?.discriminator} - ${users[1]?.points}
                        :three: ${guildMembers.find(member => member.id === users[2]?.id).username}#${guildMembers.find(member => member.id === users[2].id)?.discriminator} - ${users[2].points}
                        
                        Run-ups:
                        5. ${guildMembers.find(member => member.id === users[3]?.id)?.username}#${guildMembers.find(member => member.id === users[3]?.id)?.discriminator} - ${users[3]?.points}
                        6. ${guildMembers.find(member => member.id === users[4]?.id)?.username}#${guildMembers.find(member => member.id === users[4]?.id)?.discriminator} - ${users[4]?.points}`
                    }, {
                        "name": "Statistik", "value": `Builds gesamt: **${builds.length}**
                        Registrierte Nutzer*innen: **${users.length}**
                        Punkte gesamt: **${points}**`
                    }], "footer": {
                        "text": "Starte noch heute und kämpfe dich an die Spitze! Registrierung via /register"
                    }, "thumbnail": {
                        "url": process.env.EVENT_IMG
                    }
                }], "attachments": []
            });
        });
    }
}
