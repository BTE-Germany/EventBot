require("dotenv").config();

module.exports = {
  command: {
    name: "cleardatabase",
    description: "This IRRECOVERABLY deletes the contents of the BUILD table and RESETS all points to 0 (all users are preserved)",
    options: [
      {
        name: "sure",
        description: "Are you SURE you want to clear the database?",
        type: 3,
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
    prisma.build.findMany().then((builds) => {
      if (builds.length === 0) {
        return interaction.reply({
          content: "The database is already empty.",
          ephemeral: true,
        });
      }
      if (interaction.options.getBoolean("backup")) {
        // Backup the database as a json and send it to the user in the message as a file
        const backup = JSON.stringify(builds);
        const fs = require("fs");
        fs.writeFileSync("backup.json", backup);
        interaction.user.send({
          content: "Here is your backup.",
          files: ["backup.json"],
        });
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
