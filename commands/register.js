module.exports = {
    command: {
        name: "register", description: "Event-Registrierung", options: [{
            name: "minecraft",
            description: "Dein Minecraft-Name. Unwahrheitsgemäße Angaben können zu einem Bann führen.",
            type: 3,
            required: true,
        }],
    }, run: async (client, interaction, prisma) => {
        prisma.user.findFirst({
            where: {
                minecraft_id: interaction.options.getString("minecraft"),
            }
        }).then(async (user) => {
            if (user) {
                await interaction.reply("Du bist bereits registriert.");

            } else {
                prisma.user.create({
                    data: {
                        minecraft_id: interaction.options.getString("minecraft"),
                        id: BigInt(interaction.member.user.id)
                    }
                }).then(async () => {
                    await interaction.reply("Du wurdest erfolgreich registriert.");
                    console.log(new Date().toLocaleString(), `Registered ${interaction.member.user.tag} (${interaction.member.user.id}) as ${interaction.options.getString("minecraft")}`);
                }).catch(async (e) => {
                    console.log(e)
                    console.log("Error while creating user.");
                    interaction.reply("Du bist bereits registriert.");
                });
            }
        });
    }
}
