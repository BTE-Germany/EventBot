module.exports = {
  time: 3000,
  run: async (client, prisma) => {
    // Get all users from the database
    let users = await prisma.user.findMany();
    let builds = await prisma.build.findMany();

    let buildMessages = [];
    //get every build message and extract the date of creation and then add it to the builds array
    builds = await builds.map(async (build) => {
      let buildMessage = await client.channels.cache
        .get(process.env.BUILD_CHANNEL)
        .messages.fetch(build.message_id);
      build["date"] = buildMessage.createdTimestamp;
      return build;
    });

    //sort the builds by date
    builds = await Promise.all(builds);
    builds = builds.sort((a, b) => a.date - b.date);

    //send to webhook
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
  },
};
