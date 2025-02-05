module.exports = {
  time: 3000,
  run: async (client, prisma) => {
    return;
    // Disable this schedule
    console.log(new Date().toLocaleString(), "Stats werden geupdated...");
    try {
      // Get all users from the database
      let users = await prisma.user.findMany();
      let builds = await prisma.build.findMany();

      // Get every build message and extract the date of creation and then add it to the builds array
      let buildMessages = await client.channels.cache
        .get(process.env.SUBMISSION_CHANNEL)
        .messages.fetch({ limit: 100 });

      // Fetch more messages if needed
      while (buildMessages.size < builds.length) {
        let lastMessageId = buildMessages.last().id;

        const moreMessages = await client.channels.cache
          .get(process.env.SUBMISSION_CHANNEL)
          .messages.fetch({ limit: 100, before: lastMessageId });

        if (moreMessages.size === 0) break;

        buildMessages = buildMessages.concat(moreMessages);
        lastMessageId = moreMessages.last().id;
      }

      builds = await Promise.all(
        builds.map(async (build) => {
          let message = await buildMessages.get(build.message);
          build.date = message.createdTimestamp || 0;
          return {
            id: build.id,
            location: build.location,
            A: build.A,
            B: build.B,
            base_points: build.base_points,
            builder_id: toString(build.builder_id),
            judges: build.judges,
            images: build.images,
          };
        })
      );

      builds = builds.filter(build => build !== null);

      console.log(
        new Date().toLocaleString(),
        "Stats - Builds wurden geladen..."
      );

      users = users.map((user) => ({
        ...user,
        id: user.id.toString(),
      }));

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
