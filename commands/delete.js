require("dotenv").config();
const { isJudge, denyJudge } = require("../utils/permissions.js");
const { respondWithBuilds } = require("../utils/autocomplete.js");
const { recalculateUserPoints } = require("../utils/points.js");
const { TYPES, logActivity } = require("../utils/activity.js");
const { deleteUploadedImage } = require("../utils/storage.js");

async function deleteMessage(client, channelId, messageId) {
  if (!channelId || !messageId) return;
  try {
    const channel = await client.channels.fetch(channelId);
    const message = await channel.messages.fetch(messageId.toString());
    await message.delete();
  } catch (err) {
    console.error(`Nachricht ${messageId} konnte nicht gelöscht werden:`, err.message);
  }
}

module.exports = {
  command: {
    name: "delete",
    description: "Löscht ein Build.",
    // Hidden for everyone except admins; grant the judge role access under
    // Server Settings > Integrations > Bot
    default_member_permissions: "0",
    options: [
      {
        name: "id",
        description: "Die ID des zu löschenden Builds.",
        type: 4,
        autocomplete: true,
        required: true,
      },
      {
        name: "reason",
        description: "Der Grund für die Löschung des Builds.",
        type: 3,
        required: true,
      },
    ],
  },
  autocomplete: async (client, interaction, prisma) => {
    return respondWithBuilds(interaction, prisma);
  },
  run: async (client, interaction, prisma) => {
    if (!isJudge(interaction)) return denyJudge(interaction);

    const buildId = interaction.options.getInteger("id");
    const reason = interaction.options.getString("reason");

    await interaction.deferReply({ ephemeral: true });

    const build = await prisma.build.findUnique({ where: { id: buildId } });
    if (!build) {
      return interaction.editReply({ content: "Dieses Build existiert nicht!" });
    }

    await prisma.build.delete({ where: { id: buildId } });
    // Removes the build's points if it was already fully judged
    const pointChange = await recalculateUserPoints(prisma, build.builder_id);
    await logActivity(prisma, {
      type: TYPES.DELETED,
      buildId,
      userId: build.builder_id,
      actor: interaction.user.username,
      points: pointChange.delta || null,
      details: `Grund: ${reason}`,
    });

    await deleteMessage(client, process.env.SUBMISSION_CHANNEL, build.message);
    await deleteMessage(client, process.env.JUDGE_CHANNEL, build.judge_msg);
    for (const image of build.images) {
      await deleteUploadedImage(image);
    }

    console.log(
      new Date().toLocaleString(),
      `Judge ${interaction.user.username} (${interaction.user.id}) hat Build #${buildId} gelöscht. Grund: ${reason}`
    );
    await interaction.editReply({
      content: `Build **#${buildId}** mit folgendem Grund gelöscht: ${reason}`,
    });
  },
};
