const { refreshBuildingPanel } = require("../utils/buildingPanel.js");
const { respondWithBuilds } = require("../utils/autocomplete.js");
const { isJudge, denyJudge } = require("../utils/permissions.js");

module.exports = {
  command: {
    name: "refresh",
    description: "Aktualisiert das Building-Panel in #submissions und #judge.",
    // Hidden for everyone except admins; grant the judge role access under
    // Server Settings > Integrations > Bot
    default_member_permissions: "0",
    options: [
      {
        name: "id",
        description: "Die ID des zu aktualisierenden Builds (ohne ID: die letzten 10 Builds)",
        type: 4,
        autocomplete: true,
        required: false,
      },
    ],
  },
  autocomplete: async (client, interaction, prisma) => {
    return respondWithBuilds(interaction, prisma);
  },
  run: async (client, interaction, prisma) => {
    if (!isJudge(interaction)) return denyJudge(interaction);

    const buildId = interaction.options.getInteger("id");
    await interaction.deferReply({ ephemeral: true });

    try {
      if (buildId) {
        // Refresh specific building panel
        const result = await refreshBuildingPanel(client, prisma, buildId);
        const subStatus = result.updatedSubmission ? "✅ Submissions-Kanal" : "⚠️ Submissions-Nachricht nicht gefunden";
        const judgeStatus = result.updatedJudge ? "✅ Judge-Kanal" : "⚠️ Judge-Nachricht nicht gefunden";

        return interaction.editReply({
          content: `✅ **Building-Panel für Build #${buildId} aktualisiert:**\n• ${subStatus}\n• ${judgeStatus}`,
        });
      } else {
        // Refresh the last 10 builds
        const builds = await prisma.build.findMany({
          orderBy: { id: "desc" },
          take: 10,
        });

        if (builds.length === 0) {
          return interaction.editReply({
            content: "Keine Builds in der Datenbank gefunden.",
          });
        }

        let successCount = 0;
        for (const b of builds) {
          try {
            await refreshBuildingPanel(client, prisma, b.id);
            successCount++;
          } catch (e) {
            console.error(`Fehler bei Refresh von Build #${b.id}:`, e.message);
          }
        }

        return interaction.editReply({
          content: `✅ **Building-Panels für ${successCount} von ${builds.length} Builds in #submissions und #judge erfolgreich aktualisiert!**`,
        });
      }
    } catch (err) {
      console.error("Fehler beim Ausführen von /refresh:", err);
      return interaction.editReply({
        content: `❌ Fehler beim Aktualisieren des Building-Panels: ${err.message}`,
      });
    }
  },
};
