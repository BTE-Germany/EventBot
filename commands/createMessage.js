module.exports = {
  command: {
    name: "createmsg",
    description: "Erzeugt eine Platzhalter-Nachricht für den Leaderboard-Kanal",
    // Only visible to admins
    default_member_permissions: "0",
  },
  run: async (client, interaction, prisma) => {
    await interaction.reply({
      content: "Ok.",
      ephemeral: true,
    });
    await interaction.channel.send(
      "Kopiere die ID dieser Nachricht und füge sie in die `LEADERBOARD_MESSAGE`-Variable und die ID dieses Kanals in `LEADERBOARD_CHANNEL` der `.env`-Datei ein."
    );
  },
};
