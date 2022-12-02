import {
    ApplicationCommandTypes,
    InteractionResponseTypes,
} from "../../deps.ts";
import { createCommand } from "./mod.ts";

createCommand({
    name: "createmsg",
    description: "Nö.",
    type: ApplicationCommandTypes.ChatInput,
    execute: async (Bot, interaction) => {
        await Bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
            type: InteractionResponseTypes.ChannelMessageWithSource,
            data: {
                content: "Herzlichen Glückwunsch!",
            }
        });
        await Bot.helpers.sendMessage(interaction.channelId, {
            content: "Kopiere die ID dieser Nachricht und füge sie in die `LEADERBOARD_MESSAGE`-Spalte .der `env`-Datei ein."
        });
    }
});
