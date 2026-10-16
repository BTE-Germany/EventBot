require("dotenv").config();
const prisma = require("../utils/prisma.js");
const { isImage } = require("../utils/storage.js");
const { createSubmission, MAX_IMAGES } = require("../utils/submission.js");

// Shows a short-lived hint and removes the user's message along with it
async function rejectMessage(message, content, delay) {
  const botMessage = await message.reply({ content });
  setTimeout(async () => {
    await botMessage.delete().catch(() => {});
    await message.delete().catch(() => {});
  }, delay);
}

module.exports = {
  name: "messageCreate",
  once: false,
  async execute(message) {
    if (message.author.bot) return;
    if (message.channel.id !== process.env.SUBMISSION_CHANNEL) return;

    const dbUser = await prisma.user.findUnique({
      where: { id: BigInt(message.author.id) },
    });
    if (!dbUser) {
      return rejectMessage(
        message,
        "Du bist noch nicht registriert! Bitte registriere dich zuerst mit `/register`.",
        5000
      );
    }
    if (dbUser.banned) {
      return rejectMessage(message, "Du bist vom Event ausgeschlossen.", 5000);
    }

    const attachments = [...message.attachments.values()].filter(isImage);
    if (attachments.length === 0 || message.content.trim().length === 0) {
      return rejectMessage(
        message,
        "Bitte hänge mindestens ein Bild an und gib Koordinaten sowie eine Referenz mit Link an (oder nutze `/submit`).",
        6000
      );
    }

    const urlMatch = message.content.match(/https?:\/\/[^\s]+/i);
    if (!urlMatch) {
      return rejectMessage(
        message,
        `❌ **Einreichung abgelehnt (Quellenpflicht):**\nBeim Einreichen muss zwingend angegeben werden, welche Referenz genutzt wurde (3D-Ansicht, Streetview, Bilder) inklusive eines gültigen Links (z. B. Google Maps / Streetview URL).\n*Tipp: Du kannst auch den Befehl \`/submit\` verwenden.*`,
        8000
      );
    }

    const referenceLink = urlMatch[0];
    let referenceType = "Bilder";
    if (/3d/i.test(message.content)) {
      referenceType = "3D-Ansicht";
    } else if (/street/i.test(message.content)) {
      referenceType = "Streetview";
    }

    const location =
      message.content.replace(referenceLink, "").trim() || message.content;

    const { allUploaded } = await createSubmission({
      client: message.client,
      prisma,
      dbUser,
      location,
      referenceType,
      referenceLink,
      attachments: attachments.slice(0, MAX_IMAGES),
    });

    // If an upload failed the build still points at this message's attachments,
    // which stop working once the message is deleted
    if (allUploaded) {
      await message.delete().catch(() => {});
    }
  },
};
