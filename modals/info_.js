module.exports = {
    modal: {
      name: "info_",
    },
    run: async (client, interaction, prisma) => {
      try {
        // Get the judge message
        const judge_msg = await prisma.build.findUnique({
          where: {
            id: parseInt(interaction.customId.split("_")[1]),
          },
        });
  
        if (!judge_msg || !judge_msg.judge_msg) {
          console.error("No message ID found in judge_msg.");
          return;
        }
  
        // Get the message from the channel
        const channel = await client.channels.fetch(process.env.JUDGE_CHANNEL);
        const message = await channel.messages.fetch(judge_msg.judge_msg.toString());
  
        let newEmbeds = [...message.embeds]; // Clone all existing embeds
  
        // Check if the message has at least one embed
        if (newEmbeds.length > 0) {
          // Clone the first embed and modify it
          const firstEmbed = newEmbeds[0].toJSON();
  
          const possible_Inputs = [
            "3d_view",
            "street_view",
            "street_view_link",
            "other_info",
          ];
  
          const value = possible_Inputs
            .map((v) => {
              const inputValue = interaction.fields.getTextInputValue(v);
              if (!inputValue || inputValue === "") return;
              switch (v) {
                case "3d_view":
                  return `3D-View benutzt: ${inputValue}`;
                case "street_view":
                  return `Street-View benutzt: ${inputValue}`;
                case "street_view_link":
                  return `Link zu Street-View: ${inputValue}`;
                case "other_info":
                  return `Sonstige Informationen: ${inputValue}`;
              }
            })
            .filter((v) => v !== undefined)
            .join("\n");
  
          // Modify the fields of the first embed
          if (!firstEmbed.fields) {
            firstEmbed.fields = []; // Initialize fields if they don't exist
          }
  
          firstEmbed.fields.push({
            name: "Zusätzliche Informationen",
            value: value,
          });
  
          // Replace the first embed with the modified one
          newEmbeds[0] = firstEmbed;
        }
  
        // Edit the message with the updated embeds (all the original embeds + modified first embed)
        await message.edit({
          content: message.content,  // Keep the original content (if you want)
          embeds: newEmbeds,         // Pass the modified array of embeds
        });
  
        // Reply to the user
        await interaction.reply({
          content: "Zusätzliche Informationen hinzugefügt.",
          ephemeral: true,
        });
      } catch (error) {
        console.error("Error during operation:", error);
        await interaction.reply({
          content: "Etwas ist schiefgegangen. Bitte versuche es später noch einmal.",
          ephemeral: true,
        });
      }
    },
  };
  