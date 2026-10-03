module.exports = {
  command: {
    name: "createstatsmsg",
    description: "Erzeugt eine Platzhalter-Nachricht für den Stats-Panel-Kanal",
  },
  run: async (client, interaction, prisma) => {
    await interaction.reply({
      content: "Ok.",
      ephemeral: true,
    });
    interaction.channel.send(
      "Kopiere die ID dieser Nachricht und füge sie in die `STATS_MESSAGE`-Variable und die ID dieses Kanals in `STATS_CHANNEL` der `.env`-Datei ein."
    );
  },
};
