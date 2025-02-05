module.exports = {
  time: 3000,
  run: async (client, prisma) => {
    // Disable this schedule
    console.log(new Date().toLocaleString(), "Stats werden geupdated...");
    try {
      // Get all users from the database
      let users = await prisma.user.findMany();
      let builds = await prisma.build.findMany();

      // Get every build message and extract the date of creation and then add it to the builds array
      let buildMessages = await client.channels.cache
        .get(process.env.SUBMISSION_CHANNEL)
        .messages.fetch({ limit: builds.length + 1 });

      builds = builds.map((build) => {
        let message = buildMessages.get(build.message_id);
        if (!message) return;
        return {
          date: message.createdTimestamp,
          user: build.user_id,
        };
      });

      console.log(
        new Date().toLocaleString(),
        "Stats - Builds wurden geladen..."
      );

      // Sort the builds by date
      builds = builds.sort((a, b) => a.date - b.date);

      // Send to webhook
      await fetch(process.env.WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          builds: builds,
          users: users,
        }),
      });

      console.log(
        new Date().toLocaleString(),
        "Stats - Webhook wurde gesendet..."
      );
    } catch (error) {
      console.error(
        new Date().toLocaleString(),
        "Stats - Fehler beim Senden des Webhooks:",
        error
      );
    }

    console.log(new Date().toLocaleString(), "Stats wurden geupdated...");
  },
};
