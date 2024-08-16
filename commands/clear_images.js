require("dotenv").config();

const { BlobServiceClient } = require("@azure/storage-blob");
const blobServiceClient = BlobServiceClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING
);
const containerClient = blobServiceClient.getContainerClient(
  process.env.CONTAINER_NAME
);

module.exports = {
  command: {
    name: "cleardatabase",
    description: "Löscht PERMANENT den Inhalt des Bild-Speichers",
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
    if (interaction.options.getBoolean("sure") === false) {
      return interaction.reply({
        content: "Du musst sicherstellen, dass du die Datenbank wirklich löschen möchtest.",
        ephemeral: true,
      });
    }

    const blobs = containerClient.listBlobsFlat();
    console.log(blobs)
    for await (const blob of blobs) {
      if(blob.name.startsWith("wichtig/")) return;
      console.log(`Blob ${i++}: ${blob.name}`);
      await containerClient.deleteBlob(blob.name, {deleteSnapshots: "include"});
    }

    return interaction.reply({
      content: `Die Gesamtheit von https://${process.env.CDN_URL}/${process.env.CONTAINER_NAME}/ wurde geleert. Grund: ${interaction.options.getString("reason")}`,
    });
  }
};
