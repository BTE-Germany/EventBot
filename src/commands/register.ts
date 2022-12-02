import {
    ApplicationCommandOptionTypes,
    ApplicationCommandTypes,
    InteractionResponseTypes,
} from "../../deps.ts";
import { createCommand } from "./mod.ts";
import { PrismaClient } from "../../generated/client/deno/edge.ts";
import { config } from "https://deno.land/std@0.163.0/dotenv/mod.ts";
import {updateLeaderBoard} from "../utils/updateLeaderBoard.ts";

const env = await config();
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: env.DATABASE_URL,
        },
    },
});

createCommand({
    name: "register",
    description: "Event-Registrierung",
    options: [
        {
            name: "minecraft",
            description: "Dein Minecraft-Name. Unwahrheitsgemäße Angaben können zu einem Bann führen.",
            type: ApplicationCommandOptionTypes.String,
            required: true,
        }
    ],
    type: ApplicationCommandTypes.ChatInput,
    execute: async (Bot, interaction) => {
        const minecraft = await fetch(`https://api.mojang.com/users/profiles/minecraft/${interaction.data.options[0].value}`);
        if (minecraft.status === 204) {
            await Bot.helpers.sendInteractionResponse(
                interaction.id,
                interaction.token,
                {
                    type: InteractionResponseTypes.ChannelMessageWithSource,
                    data: {
                        content: "Dieser Minecraft-Name existiert nicht.",
                    },
                }
            );
        }
        else {
        const { id } = await minecraft.json();
            prisma.user.findFirst({
                where: {
                    minecraft_id: id,
                }
            }).then(async (user) => {
                if(user){
                    await Bot.helpers.sendInteractionResponse(
                        interaction.id,
                        interaction.token,
                        {
                            type: InteractionResponseTypes.ChannelMessageWithSource,
                            data: {
                                content: "Du bist bereits registriert.",
                            },
                        }
                    );
                }else{
                    prisma.user.create({
                        data: {
                            minecraft_id: id,
                            id: interaction.member.user.id
                        }
                    }).then(async () => {
                        await Bot.helpers.sendInteractionResponse(
                            interaction.id,
                            interaction.token,
                            {
                                type: InteractionResponseTypes.ChannelMessageWithSource,
                                data: {
                                    content: "Du wurdest erfolgreich registriert.",
                                },
                            }
                        );
                    }).catch(async () => {
                        await Bot.helpers.sendInteractionResponse(
                            interaction.id,
                            interaction.token,
                            {
                                type: InteractionResponseTypes.ChannelMessageWithSource,
                                data: {
                                    content: "Du bist bereits registriert.",
                                },
                            }
                        );
                    });
                }
            });
        }
        await updateLeaderBoard(Bot);
    }
});
