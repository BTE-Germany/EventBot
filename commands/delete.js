require("dotenv").config();

module.exports = {
  command: {
    name: "delete",
    description: "Delete a build!",
    options: [
      {
        name: "id",
        description: "The ID of the build you want to delete.",
        type: 4,
        required: true,
      },
      {
        name: "reason",
        description: "The reason for deleting the build.",
        type: 3,
        required: true,
      },
    ],
  },
  run: async (client, interaction, prisma) => {
    prisma.build
      .findUnique({
        where: {
          id: interaction.options.getInteger("id"),
        },
      })
      .then(async (build) => {
        if (!build) {
          await interaction.reply({
            content: "This build does not exist!",
            ephemeral: true,
          });
        } else {
          if (build.judges.length < 2) {
            client.channels.cache
              .get(process.env.SUBMISSION_CHANNEL)
              .messages.fetch(build.message)
              .then((msg) => msg.delete());
            client.channels.cache
              .get(process.env.JUDGE_CHANNEL)
              .messages.fetch(build.judge_msg)
              .then((msg) => msg.delete());
            await prisma.build.delete({
              where: {
                id: interaction.options.getInteger("id"),
              },
            });
            await prisma.user
              .findUnique({
                where: {
                  id: build.builder_id,
                },
              })
              .then(async (user) => {
                await prisma.user.update({
                  where: {
                    id: build.builder_id,
                  },
                  data: {
                    points: user.points - 10,
                  },
                });
                await interaction.reply({
                  content:
                    "Build deleted with reason: " +
                    interaction.options.getString("reason"),
                });
                console.log(
                  new Date().toLocaleString(),
                  `Judge ${interaction.member.user.id} deleted build ${
                    build.id
                  } with reason: ${interaction.options.getString("reason")}`
                );
              });
          } else {
            client.channels.cache
              .get(process.env.SUBMISSION_CHANNEL)
              .messages.fetch(build.message)
              .then((msg) => msg.delete());
            client.channels.cache
              .get(process.env.JUDGE_CHANNEL)
              .messages.fetch(build.judge_msg)
              .then((msg) => msg.delete());
            await prisma.build
              .delete({
                where: {
                  id: interaction.options.getInteger("id"),
                },
              })
              .then(async () => {
                await prisma.user
                  .findUnique({
                    where: {
                      id: build.builder_id,
                    },
                  })
                  .then(async (user) => {
                    let basepoints = build ? 10 : 0;
                    await prisma.user.update({
                      where: {
                        id: build.builder_id,
                      },
                      data: {
                        points: user.points - basepoints - build.A - build.B,
                      },
                    });
                  });
              });
            await interaction.reply({
              content:
                "Build deleted with reason: " +
                interaction.options.getString("reason"),
            });
          }
        }
      });
  },
};
