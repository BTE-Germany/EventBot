module.exports = {
  command: {
    name: "register",
    description: "Event-Registrierung",
    options: [
      {
        name: "minecraft",
        description:
          "Dein Minecraft-Name. Unwahrheitsgemäße Angaben können zu einem Bann führen.",
        type: 3,
        required: true,
      },
    ],
  },
  run: async (client, interaction, prisma) => {
    const minecraftName = interaction.options.getString("minecraft").trim();

    if (!/^[A-Za-z0-9_]{3,16}$/.test(minecraftName)) {
      return interaction.reply({
        content: "Ungültiger Minecraft-Name. Erlaubt sind 3–16 Zeichen (Buchstaben, Zahlen, `_`).",
        ephemeral: true,
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: BigInt(interaction.user.id) },
    });
    if (existingUser) {
      return interaction.reply({
        content: `Du bist bereits als \`${existingUser.minecraft_id}\` registriert.`,
        ephemeral: true,
      });
    }

    const nameTaken = await prisma.user.findFirst({
      where: { minecraft_id: { equals: minecraftName, mode: "insensitive" } },
    });
    if (nameTaken) {
      return interaction.reply({
        content: "Dieser Minecraft-Name ist bereits von einem anderen Discord-Account registriert.",
        ephemeral: true,
      });
    }

    await prisma.user.create({
      data: {
        id: BigInt(interaction.user.id),
        minecraft_id: minecraftName,
      },
    });

    await interaction.reply({ content: "Du wurdest erfolgreich registriert.", ephemeral: true });
    console.log(
      new Date().toLocaleString(),
      `${interaction.user.tag} (${interaction.user.id}) registriert als ${minecraftName}`
    );
  },
};
