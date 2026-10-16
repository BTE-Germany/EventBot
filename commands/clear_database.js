require("dotenv").config();
const { isAdmin, denyAdmin } = require("../utils/permissions.js");

module.exports = {
  command: {
    name: "cleardatabase",
    description: "Löscht PERMANENT den Inhalt der BUILD-Tabelle und setzt alle Punkte auf 0.",
    // Only visible to admins
    default_member_permissions: "0",
    options: [
      {
        name: "sure",
        description: "Bist du sicher, dass du die Datenbank löschen willst?",
        type: 5,
        required: true,
      },
      {
        name: "reason",
        description: "Grund für die Löschung der Datenbank.",
        type: 3,
        required: true,
      }
    ],
  },
  run: async (client, interaction, prisma) => {
    if (!isAdmin(interaction)) return denyAdmin(interaction);

    if (interaction.options.getBoolean("sure") === false) {
      return interaction.reply({
        content: "Du musst sicherstellen, dass du die Datenbank wirklich löschen möchtest.",
        ephemeral: true,
      });
    }

    if ((await prisma.build.count()) === 0) {
      return interaction.reply({
        content: "Die Datenbank ist bereits leer.",
        ephemeral: true,
      });
    }

    const reason = interaction.options.getString("reason");

    await prisma.$transaction([
      prisma.build.deleteMany(),
      prisma.$executeRaw`ALTER SEQUENCE "Build_id_seq" RESTART WITH 1;`,
      prisma.user.updateMany({ data: { points: 0 } }),
    ]);

    console.log(
      new Date().toLocaleString(),
      `${interaction.user.username} (${interaction.user.id}) hat die BUILD-Tabelle geleert. Grund: ${reason}`
    );
    await interaction.reply({
      content: `BUILD-Tabelle geleert. Alle Punkte auf 0 zurückgesetzt. Grund: ${reason}`,
    });
  }
};
