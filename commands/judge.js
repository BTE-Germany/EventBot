module.exports = {
  command: {
    name: "judge",
    description: "Judge a build!",
    options: [
      {
        name: "id",
        description: "The ID of the build you want to delete.",
        type: 4,
        required: true,
      },
      {
        name: "details",
        description: "Points for details",
        type: 4,
        choices: [
          { name: "1", value: 1 },
          { name: "2", value: 2 },
          { name: "3", value: 3 },
          {
            name: "4",
            value: 4,
          },
          { name: "5", value: 5 },
          { name: "6", value: 6 },
          { name: "7", value: 7 },
          { name: "8", value: 8 },
          {
            name: "9",
            value: 9,
          },
          { name: "10", value: 10 },
        ],
        required: true,
      },
      {
        name: "aufwand",
        description: "Aufwand des Builds",
        type: 4,
        choices: [
          { name: "1", value: 1 },
          { name: "2", value: 2 },
          { name: "3", value: 3 },
          {
            name: "4",
            value: 4,
          },
          { name: "5", value: 5 },
          { name: "6", value: 6 },
          { name: "7", value: 7 },
          { name: "8", value: 8 },
          {
            name: "9",
            value: 9,
          },
          { name: "10", value: 10 },
        ],
        required: true,
      },
      {
        name: "grundpunkte",
        description: "Grundpunkte des Builds",
        type: 5,
        required: false,
      },
    ],
  },
  run: async (client, interaction, prisma) => {
    if (
      interaction.member.roles.cache.some(
        (role) => role.id === process.env.PING_ROLE
      )
    ) {
      const build = await prisma.build.findUnique({
        where: {
          id: interaction.options.getInteger("id") || 0,
        },
      });
      if (!build) {
        await interaction.reply("Build not found.");
      } else {
        if (build.judges.includes(interaction.member.user.id.toString())) {
          //already judged this build
          await interaction.reply("You already judged this build.");
          return;
        }
        const user = await prisma.user.findUnique({
          where: {
            id: build.builder_id,
          },
        });
        if (build.judges?.length === 0) {
          const judges = [interaction.user.id.toString()];
          const base_points =
            typeof interaction.options.getBoolean("grundpunkte") === "boolean"
              ? interaction.options.getBoolean("grundpunkte")
              : true;
          await prisma.build.update({
            where: {
              id: interaction.options.getInteger("id"),
            },
            data: {
              judges: judges,
              A: interaction.options.getInteger("details"),
              B: interaction.options.getInteger("aufwand"),
              base_points: base_points,
            },
          });
          await interaction.reply("Build judged");
          let embeds = [
            {
              title: `#${build.id.toString()}`,
              description: `Koordinaten: ${build.location}`,
              url: "https://bte-germany.de",
              color: 16761344,
              author: {
                name: `${user.minecraft_id}`,
              },
            },
          ];
          build.images.forEach((image) => {
            embeds.push({
              url: "https://bte-germany.de",
              image: {
                url: image,
              },
            });
          });
          await client.channels.cache
            .get(process.env.JUDGE_CHANNEL)
            .messages.fetch(build.judge_msg.toString())
            .then((message) => {
              message.edit({
                content: `<@&${process.env.PING_ROLE}>`,
                embeds: embeds,
              });
            });
          console.log(
            new Date().toLocaleString(),
            `Judge ${interaction.member.user.id} judged build ${
              build.id
            } as ${interaction.options.getInteger(
              "details"
            )}/${interaction.options.getInteger(
              "aufwand"
            )}. Base_points: ${base_points}. 1/2 judges.`
          );
          return;
        }
        if (build.judges?.length === 1) {
          const judges = build.judges;
          judges.push(interaction.user.id.toString());
          await prisma.build.update({
            where: {
              id: interaction.options.getInteger("id"),
            },
            data: {
              judges: judges,
              A: (build.A + interaction.options.getInteger("details")) / 2,
              B: (build.B + interaction.options.getInteger("aufwand")) / 2,
            },
          });
          const base_points = build.base_points ? 0 : -10;
          await prisma.user.update({
            where: {
              id: build.builder_id,
            },
            data: {
              points:
                user?.points +
                (build.A + interaction.options.getInteger("details")) / 2 +
                (build.B + interaction.options.getInteger("aufwand")) / 2 +
                base_points,
            },
          });
          interaction.reply(
            "Build bewertet. Punkte wurden dem User gutgeschrieben. Du warst der 2. Judge. Somit wurde deine Entscheidung für base_points ignoriert."
          );
          let embeds = [
            {
              title: `#${build.id.toString()}`,
              description: `Koordinaten: ${build.location}`,
              url: "https://bte-germany.de",
              color: 7119627,
              author: {
                name: `${user.minecraft_id}`,
              },
              fields: [
                {
                  name: "Bewertung",
                  value: `Details: ${
                    (build.A + interaction.options.getInteger("details")) / 2
                  }\nAufwand / Größe: ${
                    (build.B + interaction.options.getInteger("aufwand")) / 2
                  }\n Grundpunkte: ${
                      (build.base_points) ? "Ja" : "Nein"
                  }`,
                },
              ],
            },
          ];
          build.images.forEach((image) => {
            embeds.push({
              url: "https://bte-germany.de",
              image: {
                url: image,
              },
            });
          });
          await client.channels.cache
            .get(process.env.JUDGE_CHANNEL)
            .messages.fetch(build.judge_msg.toString())
            .then((message) => {
              message.edit({
                content: " ",
                embeds: embeds,
              });
            });
          await client.channels.cache
            .get(process.env.SUBMISSION_CHANNEL)
            .messages.fetch(build.message.toString())
            .then((message) => {
              message.edit({
                content: " ",
                embeds: embeds,
              });
            });
          console.log(
            new Date().toLocaleString(),
            `Judge ${interaction.member.user.id} judged build ${
              build.id
            } as ${interaction.options.getInteger(
              "details"
            )}/${interaction.options.getInteger("aufwand")}. 2/2 judges.`
          );
          return;
        }
        if (build.judges?.length > 1) {
          interaction.reply("Dieses Build wurde bereits bewertet.");
        }
      }
    } else {
      interaction.reply("Du bist kein Judge.");
    }
  },
};
