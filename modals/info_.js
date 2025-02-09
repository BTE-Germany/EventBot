module.exports = {
    modal: {
        name: "info_"
    },
    run: async (client, interaction, prisma) => {
        //handle modal submit
        //add information to judge_msg in discord
        //get judge_msg
        const judge_msg = await prisma.build.findUnique({
            where: {
                id: parseInt(interaction.customId.split("_")[1])
            }
        });

        //get the message
        const message = await client.channels.cache.get(process.env.JUDGE_CHANNEL).messages.fetch(judge_msg.judge_msg.toString());
        let newMessage = message;

        const possible_Inputs = ["3d_view", "street_view", "street_view_link", "other_info"];
        const value = possible_Inputs.map((v) => {
            const value = interaction.fields.getTextInputValue(v);
            if(!value || value === "") return;
            switch (v) {
                case "3d_view":
                    return `3D-View benutzt: ${value}`;
                case "street_view":
                    return `Street-View benutzt: ${value}`;
                case "street_view_link":
                    return `Link zu Street-View: ${value}`;
                case "other_info":
                    return `Sonstige Informationen: ${value}`;
            }
        }).filter((v) => v !== undefined).join("\n");

        newMessage.embeds[0].fields.push({
            name: "Zusätzliche Informationen",
            value: value
        });

        //edit the message
        message.edit(
            {
                content: newMessage.content,
                embeds: newMessage.embeds
            }
        )

        //reply to the user
        await interaction.reply({
            content: "Zusätzliche Informationen hinzugefügt.",
            ephemeral: true
        });

    }
}