const { ModalBuilder, TextInputBuilder, ActionRowBuilder } = require('@discordjs/builders');

module.exports = {
    button: {
        name: "info_"
    },
    run: async (client, interaction, prisma) => {
        const build = await prisma.build.findUnique({
            where: {
                id: parseInt(interaction.customId.split("_")[1])
            }
        });

        if (!build) {
            await interaction.reply({
                content: "Dieser Build existiert nicht mehr.",
                ephemeral: true
            });
            return;
        }

        if (build.builder_id.toString() !== interaction.user.id) {
            await interaction.reply({
                content: "Du bist nicht der Besitzer dieses Builds. Finger weg!",
                ephemeral: true
            });
            return;
        }

        // Reference type and link are already required on submission,
        // so this only collects free-form notes for the judges
        const input = new TextInputBuilder()
            .setCustomId('extra_info')
            .setLabel('Informationen für die Judges')
            .setPlaceholder('z. B. besondere Details, Innenausbau, genutzte Quellen …')
            .setRequired(true)
            .setMaxLength(1000)
            .setStyle(2);
        if (build.extra_info) input.setValue(build.extra_info);

        const modal = new ModalBuilder()
            .setCustomId(interaction.customId)
            .setTitle('Zusätzliche Informationen')
            .addComponents(new ActionRowBuilder().addComponents(input));

        await interaction.showModal(modal);
    }
}
