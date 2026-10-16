require("dotenv").config();
const { uploadAttachment } = require("./storage.js");
const {
  generateBuildingEmbeds,
  submissionComponents,
  judgePanelContent,
} = require("./buildingPanel.js");

const MAX_IMAGES = 3;

// Shared by /submit and plain messages in the submission channel
async function createSubmission({
  client,
  prisma,
  dbUser,
  location,
  referenceType,
  referenceLink,
  attachments,
}) {
  const builderId = dbUser.id.toString();

  const images = [];
  let allUploaded = true;
  for (const attachment of attachments.slice(0, MAX_IMAGES)) {
    const cdnUrl = await uploadAttachment(builderId, attachment);
    if (!cdnUrl) allUploaded = false;
    // Discord attachment URLs expire, so they're only a fallback
    images.push(cdnUrl || attachment.url);
  }

  let build = await prisma.build.create({
    data: {
      builder_id: dbUser.id,
      location,
      reference_type: referenceType,
      reference_link: referenceLink,
      images,
    },
  });

  const submissionChannel = await client.channels
    .fetch(process.env.SUBMISSION_CHANNEL)
    .catch(() => null);
  const submissionMsg = submissionChannel
    ? await submissionChannel.send({
        embeds: generateBuildingEmbeds(build, dbUser, false),
        components: submissionComponents(build.id),
      })
    : null;

  const judgeChannel = await client.channels
    .fetch(process.env.JUDGE_CHANNEL)
    .catch(() => null);
  const judgeMsg = judgeChannel
    ? await judgeChannel.send({
        content: judgePanelContent(build),
        embeds: generateBuildingEmbeds(build, dbUser, true),
      })
    : null;

  build = await prisma.build.update({
    where: { id: build.id },
    data: {
      message: submissionMsg ? BigInt(submissionMsg.id) : null,
      judge_msg: judgeMsg ? BigInt(judgeMsg.id) : null,
    },
  });

  console.log(
    new Date().toLocaleString(),
    `Neuer Build #${build.id} eingereicht von ${dbUser.minecraft_id} (Referenz: ${referenceType}, Link: ${referenceLink})`
  );

  return { build, allUploaded };
}

module.exports = {
  MAX_IMAGES,
  createSubmission,
};
