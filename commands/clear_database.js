require("dotenv").config();

module.exports = {
  command: {
    name: "cleardatabase",
    description: "This PERMANENTLY deletes the contents of the BUILD table and RESETS all points (all users are saved)",
    options: [
      {
        name: "sure",
        description: "Are you SURE you want to clear the database?",
        type: 5,
        required: true,
      },
      {
        name: "reason",
        description: "The reason for deleting the database.",
        type: 3,
        required: true,
      },
      {
        name: "backup",
        description: "Do you need a backup of the database?",
        type: 5,
        required: true,
      }
    ],
  },
  run: async (client, interaction, prisma) => {
    if(interaction.getBoolean("sure") === false) {
      return interaction.reply({
        content: "You need to be sure to clear the database.",
        ephemeral: true,
      });
    }
    prisma.build.findMany().then((builds) => {
      if (builds.length === 0) {
        return interaction.reply({
          content: "The database is already empty.",
          ephemeral: true,
        });
      }
      if (interaction.options.getBoolean("backup")) {
        const backup = JSON.stringify(builds);
        const fs = require("fs");
        fs.writeFileSync("backup.json", backup);
        interaction.user.send({
          content: "Here is your backup.",
          files: ["backup.json"],
        });
        fs.rmSync("backup.json");
      }
    });
    prisma.build.deleteMany().then(() => {
      prisma.$executeRaw`ALTER SEQUENCE "Build_id_seq" RESTART WITH 1;`;
      prisma.user.updateMany({
        data: {
          points: 0,
        },
      }).then(() => {
        interaction.reply({
          content: "Done.",
          ephemeral: true,
        });
      });
    });
  }
};
