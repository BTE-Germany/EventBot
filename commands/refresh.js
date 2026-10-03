const { refreshBuildingPanel } = require("../utils/buildingPanel.js");

module.exports = {
  command: {
    name: "refresh",
    description: "Aktualisiert das Building-Panel in #submissions und #judge.",
    options: [
      {
        name: "id",
        description: "Die ID des zu aktualisierenden Builds (optional für alle offenen Builds)",
        type: 4,
        autocomplete: true,
        required: false,
      },
    ],
  },
  autocomplete: async (client, interaction, prisma) => {
    try {
      const focusedOption = interaction.options.getFocused(true);
      if (focusedOption.name === "id") {
        const builds = await prisma.build.findMany({
          orderBy: { id: "desc" },
          take: 50,
        });
        const filtered = builds
          .filter(
            (b) =>
              !focusedOption.value ||
              b.id.toString().includes(focusedOption.value.toString())
          )
          .slice(0, 25);

        return interaction.respond(
          filtered.map((b) => ({
            name: `#${b.id} (${b.judges.length}/2 Judges) - ${b.location ? b.location.slice(0, 45) : ""}`,
            value: b.id,
          }))
        );
      }
    } catch (err) {
      console.error("Autocomplete Fehler in /refresh:", err);
    }
  },
  run: async (client, interaction, prisma) => {
    if (
      !interaction.member.roles.cache.some(
        (role) => role.id === process.env.PING_ROLE
      )
    ) {
      return interaction.reply({
        content: "Du bist kein Judge.",
        ephemeral: true,
      });
    }

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
        // Refresh all builds that have less than 2 judges or the last 10 builds
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
