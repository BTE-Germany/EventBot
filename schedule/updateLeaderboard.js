module.exports = {
  time: 300000,
  run: async (client, prisma) => {
    console.log(new Date().toLocaleString(), "Updating leaderboard...");
    let users = await prisma.user.findMany();
    users = users.map((user) => {
      return {
        id: user.id.toString(),
        points: user.points,
      };
    });
    users = users.sort((a, b) => b.points - a.points);

    const builds = await prisma.build.findMany();
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

    await client.channels.cache
      .get(process.env.LEADERBOARD_CHANNEL)
      .messages.fetch(process.env.LEADERBOARD_MESSAGE)
      .then(async (message) => {
        message.edit({
          "content": null,
          "embeds": [
            {
              "title": "Leaderboard",
              "description": `
              :first_place: ${guildMembers.find((member) => member.id === users[0]?.id) ?.username }#${guildMembers.find((member) => member.id === users[0]?.id)?.discriminator}  |  \`${users[0]?.points}\` \n
              :second_place: ${guildMembers.find((member) => member.id === users[1]?.id) ?.username }#${guildMembers.find((member) => member.id === users[1]?.id)?.discriminator}  |  \`${users[1]?.points}\` \n
              :third_place: ${guildMembers.find((member) => member.id === users[2]?.id) ?.username }#${guildMembers.find((member) => member.id === users[2]?.id)?.discriminator}  |  \`${users[2]?.points}\` \n
              4. ${guildMembers.find((member) => member.id === users[3]?.id) ?.username }#${guildMembers.find((member) => member.id === users[3]?.id)?.discriminator}  |  \`${users[3]?.points}\` \n
              5. ${guildMembers.find((member) => member.id === users[4]?.id) ?.username }#${guildMembers.find((member) => member.id === users[4]?.id)?.discriminator}  |  \`${users[4]?.points}\` \n
              6. ${guildMembers.find((member) => member.id === users[5]?.id) ?.username }#${guildMembers.find((member) => member.id === users[5]?.id)?.discriminator}  |  \`${users[5]?.points}\` \n
              7. ${guildMembers.find((member) => member.id === users[6]?.id) ?.username }#${guildMembers.find((member) => member.id === users[6]?.id)?.discriminator}  |  \`${users[6]?.points}\` \n
              8. ${guildMembers.find((member) => member.id === users[7]?.id) ?.username }#${guildMembers.find((member) => member.id === users[7]?.id)?.discriminator}  |  \`${users[7]?.points}\` \n
              9. ${guildMembers.find((member) => member.id === users[8]?.id) ?.username }#${guildMembers.find((member) => member.id === users[8]?.id)?.discriminator}  |  \`${users[8]?.points}\` \n
              10. ${guildMembers.find((member) => member.id === users[9]?.id) ?.username }#${guildMembers.find((member) => member.id === users[9]?.id)?.discriminator}  |  \`${users[9]?.points}\``,
              "color": 13697024,
              "fields": [
                {
                  "name": "Statistik",
                  "value": `Builds gesamt: \`${builds.length}\` \n
                  Registrierte Builder: \`${users.length}\` \n
                  Punkte gesamt: \`${points}\``
                }
              ],
              "footer": {
                "text": "Starte noch heute und kämpfe dich an die Spitze! Registrierung via /register"
              },
              "thumbnail": {
                "url": process.env.EVENT_IMG
              }
            }
          ],
          "attachments": [],
          "components": [
            {
              "type": 1,
              "components": [
                {
                  "style": 3,
                  "label": `Nächste Seite`,
                  "custom_id": `leader-1`,
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
      });
  },
};
