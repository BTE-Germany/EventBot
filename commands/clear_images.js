require("dotenv").config();
const { isAdmin, denyAdmin } = require("../utils/permissions.js");
const { containerClient } = require("../utils/storage.js");

module.exports = {
  command: {
    name: "clearimages",
    description: "Löscht PERMANENT den Inhalt des Bild-Speichers",
    // Only visible to admins
    default_member_permissions: "0",
    options: [
      {
        name: "sure",
        description: "Bist du sicher, dass du den Speicher löschen willst?",
        type: 5,
        required: true,
      },
      {
        name: "reason",
        description: "Grund für die Löschung des Speichers.",
        type: 3,
        required: true,
      }
    ],
  },
  run: async (client, interaction, prisma) => {
    if (!isAdmin(interaction)) return denyAdmin(interaction);

    if (interaction.options.getBoolean("sure") === false) {
      return interaction.reply({
        content: "Du musst sicherstellen, dass du den Speicher wirklich löschen möchtest.",
        ephemeral: true,
      });
    }

    if (!containerClient) {
      return interaction.reply({
        content: "Es ist kein Bild-Speicher konfiguriert (`AZURE_STORAGE_CONNECTION_STRING`, `CONTAINER_NAME`).",
        ephemeral: true,
      });
    }

    // Deleting many blobs takes longer than Discord's 3s reply window
    await interaction.deferReply();

    const reason = interaction.options.getString("reason");
    let deleted = 0;
    try {
      for await (const blob of containerClient.listBlobsFlat()) {
        if (!blob.name.startsWith("wichtig/")) { // Do not delete important files
          await containerClient.deleteBlob(blob.name, { deleteSnapshots: "include" });
          deleted++;
        }
      }

      console.log(
        new Date().toLocaleString(),
        `${interaction.user.username} (${interaction.user.id}) hat den Bild-Speicher geleert (${deleted} Dateien). Grund: ${reason}`
      );
      await interaction.editReply({
        content: `Die Gesamtheit von ${process.env.CDN_URL}/${process.env.CONTAINER_NAME}/ wurde geleert. ${deleted} Dateien. Grund: ${reason}`,
      });
    }
    catch (error) {
      console.error(error);
      await interaction.editReply({
        content: `Fehler beim Löschen des Speichers nach ${deleted} Dateien: ${error.message}`,
      });
    }
  }
}
