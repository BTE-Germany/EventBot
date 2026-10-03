const { generateStatsData } = require("../schedule/updateStatsPanel.js");

module.exports = {
  command: {
    name: "stats",
    description: "Zeigt die aktuellen Event-Statistiken und das Diagramm an.",
  },
  run: async (client, interaction, prisma) => {
    await interaction.deferReply();
    try {
      const { embed } = await generateStatsData(prisma);
      await interaction.editReply({
        embeds: [embed],
      });
    } catch (err) {
      console.error("Fehler beim Ausführen von /stats:", err);
      await interaction.editReply({
        content: "❌ Fehler beim Abrufen der Statistiken.",
      });
    }
  },
};
