require("dotenv").config();
const { isImage } = require("../utils/storage.js");
const { createSubmission } = require("../utils/submission.js");

module.exports = {
  command: {
    name: "submit",
    description: "Reiche einen neuen Build mit Quellenangabe ein.",
    options: [
      {
        name: "koordinaten",
        description: "Koordinaten des Builds (z. B. 52.5163, 13.3777)",
        type: 3,
        required: true,
      },
      {
        name: "referenz",
        description: "Welche Referenz wurde genutzt?",
        type: 3,
        choices: [
          { name: "3D-Ansicht", value: "3D-Ansicht" },
          { name: "Streetview", value: "Streetview" },
          { name: "Bilder", value: "Bilder" },
        ],
        required: true,
      },
      {
        name: "link",
        description: "Gültiger Link zur Referenz (z.B. Google Maps / Streetview URL)",
        type: 3,
        required: true,
      },
      {
        name: "bild1",
        description: "1. Screenshot deines Builds",
        type: 11,
        required: true,
      },
      {
        name: "bild2",
        description: "2. Screenshot deines Builds (optional)",
        type: 11,
        required: false,
      },
      {
        name: "bild3",
        description: "3. Screenshot deines Builds (optional)",
        type: 11,
        required: false,
      },
    ],
  },
  run: async (client, interaction, prisma) => {
    const dbUser = await prisma.user.findUnique({
      where: { id: BigInt(interaction.user.id) },
    });

    if (!dbUser) {
      return interaction.reply({
        content: "Du bist noch nicht registriert! Bitte registriere dich zuerst mit `/register`.",
        ephemeral: true,
      });
    }
    if (dbUser.banned) {
      return interaction.reply({
        content: "Du bist vom Event ausgeschlossen.",
        ephemeral: true,
      });
    }

    // Quellenpflicht: a valid link to the reference is required
    const link = interaction.options.getString("link").trim();
    if (!/^https?:\/\/\S+$/i.test(link)) {
      return interaction.reply({
        content: "❌ **Ungültiger Link!** Die Quellenpflicht verlangt einen gültigen Link (z. B. `https://maps.google.com/...`).",
        ephemeral: true,
      });
    }

    const attachments = ["bild1", "bild2", "bild3"]
      .map((name) => interaction.options.getAttachment(name))
      .filter(Boolean);
    if (!attachments.every(isImage)) {
      return interaction.reply({
        content: "❌ Bitte lade nur Bilder (PNG, JPG, GIF, WEBP) hoch.",
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const { build } = await createSubmission({
      client,
      prisma,
      dbUser,
      location: interaction.options.getString("koordinaten").trim(),
      referenceType: interaction.options.getString("referenz"),
      referenceLink: link,
      attachments,
    });

    await interaction.editReply({
      content: `✅ Dein Build **#${build.id}** wurde erfolgreich mit Quellenangabe eingereicht!`,
    });
  },
};
