import {
  ApplicationCommandOptionTypes,
  ApplicationCommandTypes,
  InteractionResponseTypes,
} from "../../deps.ts";
import { createCommand } from "./mod.ts";
import { PrismaClient } from "../../generated/client/deno/edge.ts";
import { config } from "https://deno.land/std@0.163.0/dotenv/mod.ts";
import { deleteMessage } from "../../deps.ts";
import { configs } from "../../configs.ts";
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
  name: "delete",
  description: "Delete a build!",
  options: [
    {
      name: "id",
      description: "The ID of the build you want to delete.",
      type: ApplicationCommandOptionTypes.Integer,
      required: true,
    },
    {
      name: "reason",
      description: "The reason for deleting the build.",
      type: ApplicationCommandOptionTypes.String,
      required: true,
    },
  ],
  type: ApplicationCommandTypes.ChatInput,
  execute: (Bot, interaction) => {
    prisma.build
      .findUnique({
        where: {
          id: interaction.data.options[0].value,
        },
      })
      .then(async (build) => {
        if (!build) {
          await Bot.helpers.sendInteractionResponse(
            interaction.id,
            interaction.token,
            {
              type: InteractionResponseTypes.ChannelMessageWithSource,
              data: {
                content: "Build not found.",
              },
            }
          );
        } else {
          if (build.judges.length < 2) {
            await deleteMessage(
              Bot,
              configs.submission_channel,
              build.message.toString()
            );
            await deleteMessage(
              Bot,
              configs.judge_channel,
              build.judge_msg.toString()
            );
            await prisma.build.delete({
              where: {
                id: interaction.data.options[0].value || "",
              },
            });
            await prisma.user
              .findUnique({
                where: {
                  id: build.builder_id,
                },
              })
              .then(async (user) => {
                await prisma.user.update({
                  where: {
                    id: build.builder_id,
                  },
                  data: {
                    points: user.points - 10,
                  },
                });
              });
            await Bot.helpers.sendInteractionResponse(
              interaction.id,
              interaction.token,
              {
                type: InteractionResponseTypes.ChannelMessageWithSource,
                data: {
                  content:
                    "Build deleted with reason: " +
                    interaction.data.options[1].value,
                },
              }
            );
          } else {
            await deleteMessage(
              Bot,
              configs.submission_channel,
              build.message.toString()
            );
            await deleteMessage(
              Bot,
              configs.judge_channel,
              build.judge_msg.toString()
            );
            await prisma.build.delete({
              where: {
                id: interaction.data.options[0].value || "",
              },
            });
            await prisma.user
              .findUnique({
                where: {
                  id: build.builder_id,
                },
              })
              .then(async (user) => {
                await prisma.user.update({
                  where: {
                    id: build.builder_id,
                  },
                  data: {
                    points: user.points - 10 - build.A - build.B,
                  },
                });
              });
            await Bot.helpers.sendInteractionResponse(
              interaction.id,
              interaction.token,
              {
                type: InteractionResponseTypes.ChannelMessageWithSource,
                data: {
                  content:
                    "Build deleted with reason: " +
                    interaction.data.options[1].value,
                },
              }
            );
          }
        }
      });
    updateLeaderBoard(Bot);
  },
});
