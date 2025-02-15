const axios = require("axios");
let run = true;

module.exports = {
  time: 3000,
  run: async (client, prisma) => {
    if (!run) return;
    //send relevant data to the webhook
    const webhook = process.env.webhook;
    if (!webhook) {
      return console.log(new Date().toLocaleString(), "Kein Webhook gefunden.");
    }

    let statsObject = {
      users: [],
      builds: [],
      points: 0,
      timestamp: new Date().toUTCString(),
    };

    let users = await prisma.user.findMany({
      select: {
        id: true,
        points: true,
        minecraft_id: true,
      },
    });

    statsObject["users"] = users;

    let builds = await prisma.build.findMany();
    let completedBuilds = builds.filter((build) => build.judges.length > 1);
    statsObject["builds"] = completedBuilds;

    users.forEach((user) => {
      statsObject["points"] += user.points;
    });

    axios
      .post(webhook, statsObject)
      .then(() => {
        console.log(
          new Date().toLocaleString(),
          "Statistiken wurden erfolgreich an Webhook gesendet."
        );
      })
      .catch((err) => {
        console.error(
          new Date().toLocaleString(),
          "Fehler beim Senden der Statistiken an Webhook:",
          err
        );
      });
  },
};
