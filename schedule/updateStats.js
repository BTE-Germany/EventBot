const axios = require("axios");
require("dotenv").config();

// Sends the current stats to WEBHOOK_URL (if configured)
module.exports = {
  time: 60000,
  run: async (client, prisma) => {
    const webhook = process.env.WEBHOOK_URL;
    if (!webhook) return;

    const users = await prisma.user.findMany({
      where: { banned: false },
      select: { id: true, points: true, minecraft_id: true },
    });
    const builds = await prisma.build.findMany();
    const completedBuilds = builds
      .filter((build) => build.judges.length >= 2)
      // Judge-internal data is not part of the public stats
      .map(({ judge_details, extra_info, ...build }) => build);

    const statsObject = {
      users,
      builds: completedBuilds,
      points: users.reduce((sum, user) => sum + user.points, 0),
      timestamp: new Date().toUTCString(),
    };

    try {
      await axios.post(
        webhook,
        JSON.stringify(statsObject, (_, v) => (typeof v === "bigint" ? v.toString() : v)),
        { headers: { "Content-Type": "application/json" } }
      );
    } catch (err) {
      console.error(
        new Date().toLocaleString(),
        "Fehler beim Senden der Statistiken an Webhook:",
        err.message
      );
    }
  },
};
