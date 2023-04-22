module.exports = {
  command: {
    name: "createmsg",
    description: "Creates a message for the leaderboard channel",
  },
  run: async (client, interaction, prisma) => {
    interaction.reply({
      content: "Done.",
      ephemeral: true,
    });
    interaction.channel.send(
      "Kopiere die ID dieser Nachricht und füge sie in die `LEADERBOARD_MESSAGE`-Spalte .der `env`-Datei ein."
    );
  },
};
