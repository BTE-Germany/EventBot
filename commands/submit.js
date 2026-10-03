require("dotenv").config();
const crypto = require("crypto");

let containerClient = null;
if (process.env.AZURE_STORAGE_CONNECTION_STRING && process.env.CONTAINER_NAME) {
  try {
    const { BlobServiceClient } = require("@azure/storage-blob");
    const blobServiceClient = BlobServiceClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING
    );
    containerClient = blobServiceClient.getContainerClient(
      process.env.CONTAINER_NAME
    );
  } catch (e) {
    console.error("Fehler beim Initialisieren von Azure Blob Storage:", e);
  }
}

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
    // 1. Check if user is registered
    const dbUser = await prisma.user.findUnique({
      where: {
        id: BigInt(interaction.user.id),
      },
    });

    if (!dbUser) {
      return interaction.reply({
        content: "Du bist noch nicht registriert! Bitte registriere dich zuerst mit `/register`.",
        ephemeral: true,
      });
    }

    // 2. Validate Link (Quellenpflicht)
    const link = interaction.options.getString("link").trim();
    const urlPattern = /^https?:\/\/.+/i;
    if (!urlPattern.test(link)) {
      return interaction.reply({
        content: "❌ **Ungültiger Link!** Die Quellenpflicht verlangt einen gültigen Link (z. B. `https://maps.google.com/...`).",
        ephemeral: true,
      });
    }

    const koordinaten = interaction.options.getString("koordinaten").trim();
    const referenz = interaction.options.getString("referenz");

    await interaction.deferReply({ ephemeral: true });

    // 3. Collect attachments
    const rawAttachments = [
      interaction.options.getAttachment("bild1"),
      interaction.options.getAttachment("bild2"),
      interaction.options.getAttachment("bild3"),
    ].filter(Boolean);

    // 4. Create Build in DB
    const build = await prisma.build.create({
      data: {
        builder_id: BigInt(interaction.user.id),
        location: koordinaten,
        reference_type: referenz,
        reference_link: link,
        images: ["loading"],
      },
    });

    let images = [];
    let embeds = [
      {
        title: `#${build.id}`,
        description: `Koordinaten: ${build.location}\nReferenz: **${referenz}**\nQuelle: ${link}`,
        url: "https://bte-germany.de",
        author: {
          name: `${dbUser.minecraft_id}`,
        },
      },
    ];

    for (const image of rawAttachments) {
      if (containerClient) {
        try {
          let uuid = crypto.randomUUID();
          const response = await fetch(image.url);
          const buffer = await response.arrayBuffer();
          let filetype = image.name.match(/\.([^/?#]+)(?=[?#]|$)/)?.[1] || "png";
          const blockBlobClient = containerClient.getBlockBlobClient(
            `${interaction.user.id}/${uuid}.${filetype}`
          );
          await blockBlobClient.uploadData(buffer, buffer.byteLength);
          const cdnUrl = `${process.env.CDN_URL}/${process.env.CONTAINER_NAME}/${interaction.user.id}/${uuid}.${filetype}`;
          embeds.push({
            url: "https://bte-germany.de",
            image: { url: cdnUrl },
          });
          images.push(cdnUrl);
          continue;
        } catch (uploadErr) {
          console.error("Azure Upload Fehler in /submit, fallback auf Discord-URL:", uploadErr);
        }
      }
      embeds.push({
        url: "https://bte-germany.de",
        image: { url: image.url },
      });
      images.push(image.url);
    }

    await prisma.build.update({
      where: { id: build.id },
      data: { images: images },
    });

    // 5. Send message to SUBMISSION_CHANNEL
    const submissionChannel = client.channels.cache.get(process.env.SUBMISSION_CHANNEL);
    let subMessageId = null;
    if (submissionChannel) {
      const sentMsg = await submissionChannel.send({
        content: " ",
        embeds: embeds,
        components: [
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 2,
                label: "Zusätzliche Informationen",
                custom_id: `info_${build.id}`,
                emoji: "📍",
              },
            ],
          },
        ],
      });
      subMessageId = sentMsg.id;
    }

    // 6. Send message to JUDGE_CHANNEL
    const judgeChannel = client.channels.cache.get(process.env.JUDGE_CHANNEL);
    let judgeMsgId = null;
    if (judgeChannel) {
      const sentJudgeMsg = await judgeChannel.send({
        content: `<@&${process.env.PING_ROLE}>`,
        embeds: embeds,
      });
      judgeMsgId = sentJudgeMsg.id;
    }

    await prisma.build.update({
      where: { id: build.id },
      data: {
        message: subMessageId ? BigInt(subMessageId) : null,
        judge_msg: judgeMsgId ? BigInt(judgeMsgId) : null,
      },
    });

    console.log(
      new Date().toLocaleString(),
      `Neuer Build #${build.id} über /submit eingereicht von ${dbUser.minecraft_id} (Referenz: ${referenz}, Link: ${link})`
    );

    interaction.editReply({
      content: `✅ Dein Build **#${build.id}** wurde erfolgreich mit Quellenangabe eingereicht!`,
    });
  },
};
