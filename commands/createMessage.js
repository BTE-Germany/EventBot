module.exports = {
  command: {
    name: "createmsg",
    description: "Erzeugt eine Nachricht für den Leaderboard-Kanal",
  },
  run: async (client, interaction, prisma) => {
    interaction.reply({
      content: "Ok.",
      ephemeral: true,
    });
    interaction.channel.send(
      "Kopiere die ID dieser Nachricht und füge sie in die `LEADERBOARD_MESSAGE`-Spalte .der `env`-Datei ein."
    );
  },
};
