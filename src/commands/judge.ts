import {ApplicationCommandOptionTypes, ApplicationCommandTypes, InteractionResponseTypes,} from "../../deps.ts";
import {createCommand} from "./mod.ts";
import {PrismaClient} from "../../generated/client/deno/edge.ts";
import {config} from "https://deno.land/std@0.163.0/dotenv/mod.ts";
import {configs} from "../../configs.ts";
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
  name: "judge",
  description: "Judge a build!",
  options: [
    {
      name: "id",
      description: "The ID of the build you want to delete.",
      type: ApplicationCommandOptionTypes.Integer,
      required: true,
    },
    {
      name: "details",
      description: "Points for details",
      type: ApplicationCommandOptionTypes.Integer,
      choices: [
        { name: "1", value: 1 },
        { name: "2", value: 2 },
        { name: "3", value: 3 },
        { name: "4", value: 4 },
        { name: "5", value: 5 },
        { name: "6", value: 6 },
        { name: "7", value: 7 },
        { name: "8", value: 8 },
        { name: "9", value: 9 },
        { name: "10", value: 10 },
      ],
      required: true,
    },
    {
      name: "aufwand",
      description: "Aufwand des Builds",
      type: ApplicationCommandOptionTypes.Integer,
      choices: [
        { name: "1", value: 1 },
        { name: "2", value: 2 },
        { name: "3", value: 3 },
        { name: "4", value: 4 },
        { name: "5", value: 5 },
        { name: "6", value: 6 },
        { name: "7", value: 7 },
        { name: "8", value: 8 },
        { name: "9", value: 9 },
        { name: "10", value: 10 },
      ],
      required: true,
    },
    {
      name: "grundpunkte",
      description: "Grundpunkte des Builds",
      type: ApplicationCommandOptionTypes.Boolean,
      required: false
    }
  ],
  type: ApplicationCommandTypes.ChatInput,
  execute: async (Bot, interaction) => {
    if (
        interaction.member.user.roles.has(configs.ping_role)
    )
      const [build] = await Promise.all([
        prisma.build.findUnique({
          where: {
            id: interaction.data.options[0].value || 0,
          },
        }),
      ]);
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
        if (build.judges.includes(interaction.member.user.id.toString())) {
          //already judged this build
          await Bot.helpers.sendInteractionResponse(
            interaction.id,
            interaction.token,
            {
              type: InteractionResponseTypes.ChannelMessageWithSource,
              data: {
                content: "You already judged this build.",
              },
            }
          );
          return;
        }
        if (build.judges?.length === 0) {
          const judges = [interaction.user.id.toString()];
          const base_points = (typeof interaction?.data.options[3]?.value === Boolean) ? interaction?.data.options[3].value : true;
          await prisma.build.update({
            where: {
              id: interaction?.data.options[0].value,
            },
            data: {
              judges: judges,
              A: interaction?.data.options[1].value,
              B: interaction?.data.options[2].value,
              base_points: base_points,
            },
          });
          await Bot.helpers.sendInteractionResponse(
            interaction.id,
            interaction.token,
            {
              type: InteractionResponseTypes.ChannelMessageWithSource,
              data: {
                content: "Build judged.",
              },
            }
          );
          const User = await Bot.helpers.getUser(build.builder_id);
          let embeds = [{
            title: `#${build.id.toString()}`,
            description: `Koordinaten: ${build.location}`,
            url: "https://bte-germany.de",
            color: 16761344,
            author: {
              name: `${User.username}#${User.discriminator}`,
            }
          },];
          build.images.forEach((image) => {
            embeds.push({
              url: "https://bte-germany.de",
              image: {
                url: image,
              }
            });
          });
          await Bot.helpers.editMessage(
              configs.judge_channel,
              build.judge_msg.toString(),
              {
                content: " ",
                embeds: embeds
              }
          );
          await updateLeaderBoard(Bot);
        return;
        }
        if (build.judges?.length === 1) {
          const judges = build.judges;
          judges.push(interaction.user.id.toString());
          await prisma.build.update({
            where: {
              id: interaction?.data.options[0].value,
            },
            data: {
              judges: judges,
              A: (build.A + interaction?.data.options[1].value) / 2,
              B: (build.B + interaction?.data.options[2].value) / 2,
            },
          });
          const user = await prisma.user.findUnique({
            where: {
              id: build.builder_id,
            },
          });
          const base_points = build.base_points ? 0 : -10;
          await prisma.user.update({
            where: {
              id: build.builder_id,
            },
            data: {
              points: user?.points + ((build.A + interaction?.data.options[1].value) / 2) + ((build.B + interaction?.data.options[2].value) / 2) + base_points,
            },
          });
          await Bot.helpers.sendInteractionResponse(
            interaction.id,
            interaction.token,
            {
              type: InteractionResponseTypes.ChannelMessageWithSource,
              data: {
                content: "Build bewertet. Punkte wurden dem User gutgeschrieben. Du warst der 2. Judge. Somit wurde deine Entscheidung für base_points ignoriert.",
              },
            }
          );
          const User = await Bot.helpers.getUser(build.builder_id);
          const embeds = [{
            title: `#${build.id.toString()}`,
            description: `Koordinaten: ${build.location}`,
            url: "https://bte-germany.de",
            color: 7119627,
            author: {
              name: `${User.username}#${User.discriminator}`,
            },
            fields: [
              {
                name: "Bewertung",
                value: `Details: ${(build.A + interaction?.data.options[1].value) / 2}\nAufwand: ${(build.B + interaction?.data.options[2].value) / 2}`,
              },
            ],
          },];
          build.images.forEach((image) => {
            embeds.push({
                url: "https://bte-germany.de",
                image: {
                    url: image,
                }
            });
          });
          await Bot.helpers.editMessage(
              configs.submission_channel,
            build.message.toString(),
            {
              content: " ",
              embeds: embeds
            }
          );
          await Bot.helpers.editMessage(
              configs.judge_channel,
            build.judge_msg.toString(),
            {
              content: " ",
              embeds: embeds,
            }
          );
          await updateLeaderBoard(Bot);
          return;
        }
        if (build.judges?.length > 1) {
          await Bot.helpers.sendInteractionResponse(
            interaction.id,
            interaction.token,
            {
              type: InteractionResponseTypes.ChannelMessageWithSource,
              data: {
                content: "This build has already been judged.",
              },
            }
          );
          return;
        }
      }
    } else {
      await Bot.helpers.sendInteractionResponse(
        interaction.id,
        interaction.token,
        {
          type: InteractionResponseTypes.ChannelMessageWithSource,
          data: {
            content: "Du bist kein Judge.",
          },
        }
      );
    }
  },
})
