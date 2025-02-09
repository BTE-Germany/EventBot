const { ModalBuilder, TextInputBuilder, ActionRowBuilder } = require('@discordjs/builders');

module.exports = {
    button: {
        name: "info_"
    },
    run: async (client, interaction, prisma) => {
        //get the build
        const build = await prisma.build.findUnique({
            where: {
                id: parseInt(interaction.customId.split("_")[1])
            }
        });

        if(!build) {
            await interaction.reply({
                content: "Dieser Build existiert nicht mehr.",
                ephemeral: true
            });
            return;
        }

        //check if the user is the owner of the build
        if (build.builder_id.toString() !== interaction.user.id.toString()) {
            await interaction.reply({
                content: "Du bist nicht der Besitzer dieses Builds. Finger weg!",
                ephemeral: true
            });
            return;
        }
        // Create the modal
        const modal = new ModalBuilder()
            .setCustomId(interaction.customId)
            .setTitle('Zusätzliche Informationen');

        //boolean input "3D-View benutzt"
        const input1 = new TextInputBuilder()
            .setCustomId('3d_view')
            .setLabel('3D-View benutzt')
            .setPlaceholder('Ja/Nein')
            .setRequired(true)
            .setStyle(1);

        //boolean input "Street-View benutzt"
        const input2 = new TextInputBuilder()
            .setCustomId('street_view')
            .setLabel('Street-View benutzt')
            .setPlaceholder('Ja/Nein')
            .setRequired(true)
            .setStyle(1);

        //text input "Link zu Street-View"
        const input3 = new TextInputBuilder()
            .setCustomId('street_view_link')
            .setLabel('Link zu Street-View')
            .setPlaceholder('Link')
            .setRequired(false)
            .setStyle(1);

        //text input "Sonstige Informationen"
        const input4 = new TextInputBuilder()
            .setCustomId('other_info')
            .setLabel('Sonstige Informationen')
            .setPlaceholder('Informationen')
            .setRequired(false)
            .setStyle(2);
        

        // Add inputs to the modal
        modal.addComponents(
            new ActionRowBuilder().addComponents(input1),
            new ActionRowBuilder().addComponents(input2),
            new ActionRowBuilder().addComponents(input3),
            new ActionRowBuilder().addComponents(input4)
        );

        // Show the modal to the user
        await interaction.showModal(modal);
    }
}