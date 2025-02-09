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
        message.embeds[0].fields.push({
            name: "Zusätzliche Informationen",
            value: interaction.values.map((v) => {
                switch(v.customId) {
                    case "3d_view":
                        return `3D-View benutzt: ${v.value}`;
                    case "street_view":
                        return `Street-View benutzt: ${v.value}`;
                    case "street_view_link":
                        return `Link zu Street-View: ${v.value}`;
                    case "other_info":
                        return `Sonstige Informationen: ${v.value}`;
                }
            }).join("\n")
        });

        //edit the message
        message.edit(
            {
                content: newMessage.content,
                embeds: newMessage.embeds
            }
        )

    }
}