import { Bot } from "../../bot.ts";
import { configs } from "../../configs.ts";
import { PrismaClient } from "../../generated/client/deno/edge.ts";
import { config } from "https://deno.land/std@0.163.0/dotenv/mod.ts";
import { setTimeout } from "https://deno.land/std@0.166.0/node/timers.ts";

const env = await config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: env.DATABASE_URL,
    },
  },
});

Bot.events.messageCreate = async function (_, message) {
  if (message.authorId === Bot.id) return;
  if (message.channelId === configs.submission_channel) {
    const [user] = await Promise.all([
      prisma.user.findUnique({
        where: {
          id: BigInt(message.member?.id || ""),
        },
      }),
    ]);
    if (!user) {
      const botmessage = await Bot.helpers.sendMessage(message.channelId, {
        content:
          "Du bist noch nicht registriert. Bitte registriere dich mit /register",
        messageReference: {
          messageId: message.id.toString(),
          failIfNotExists: false,
        },
      });
      setTimeout(async () => {
        await Bot.helpers.deleteMessage(
          message.channelId,
          message.id.toString()
        );
        await Bot.helpers.deleteMessage(
          botmessage.channelId,
          botmessage.id.toString()
        );
      }, 5000);
    } else {
      if (message.attachments.length > 0 && message.content.length > 0) {
        prisma.build
          .create({
            data: {
              builder_id: BigInt(message.member?.id || ""),
              location: message.content,
              images: message.attachments.map((attachment) => attachment.url),
            },
          })
          .then(async (obj) => {
            const user = await Bot.helpers.getUser(message.member?.id || "");
            Bot.helpers
              .sendMessage(message.channelId, {
                content: " ",
                embeds: [
                  {
                    title: `#${obj.id.toString()}`,
                    description: `Koordinaten: ${obj.location}`,
                    url: "https://bte-germany.de",
                    author: {
                      name: `${user.username}#${user.discriminator}`,
                    },
                    image: {
                      url: obj.images[0],
                    },
                  },
                  {
                    url: "https://bte-germany.de",
                    image: {
                      url: obj.images[1] ? obj.images[1] : "https://google.com",
                    },
                  },
                  {
                    url: "https://bte-germany.de",
                    image: {
                      url: obj.images[2] ? obj.images[2] : "https://google.com",
                    },
                  },
                  {
                    url: "https://bte-germany.de",
                    image: {
                      url: obj.images[3] ? obj.images[3] : "https://google.com",
                    },
                  },
                ],
              })
              .then(async (msg) => {
                await prisma.build.update({
                  where: {
                    id: obj.id,
                  },
                  data: {
                    message: msg.id,
                  },
                });
              });
            Bot.helpers
              .sendMessage(configs.judge_channel, {
                content: `<@&${configs.ping_role}>`,
                embeds: [
                  {
                    title: `#${obj.id.toString()}`,
                    description: `Koordinaten: ${obj.location}`,
                    url: "https://bte-germany.de",
                    author: {
                      name: `${user.username}#${user.discriminator}`,
                    },
                    image: {
                      url: obj.images[0],
                    },
                  },
                  {
                    url: "https://bte-germany.de",
                    image: {
                      url: obj.images[1] ? obj.images[1] : "https://google.com",
                    },
                  },
                  {
                    url: "https://bte-germany.de",
                    image: {
                      url: obj.images[2] ? obj.images[2] : "https://google.com",
                    },
                  },
                  {
                    url: "https://bte-germany.de",
                    image: {
                      url: obj.images[3] ? obj.images[3] : "https://google.com",
                    },
                  },
                ],
              })
              .then(async (msg) => {
                await prisma.build.update({
                  where: {
                    id: obj.id,
                  },
                  data: {
                    judge_msg: msg.id,
                  },
                });
              });
            await Bot.helpers.deleteMessage(
              message.channelId.toString(),
              message.id.toString()
            );
          });
        await prisma.user.update({
          where: {
            id: message.member?.id,
          },
          data: {
            points: user.points + 10,
          },
        });
      } else {
        const botmessage = await Bot.helpers.sendMessage(message.channelId, {
          content:
            "Bitte hänge ein Bild an und schreibe die Koordinaten in die Nachricht",
          messageReference: {
            messageId: message.id.toString(),
            failIfNotExists: false,
          },
        });
        setTimeout(async () => {
          await Bot.helpers.deleteMessage(
            message.channelId,
            message.id.toString()
          );
          await Bot.helpers.deleteMessage(
            botmessage.channelId,
            botmessage.id.toString()
          );
        }, 5000);
      }
    }
  }
};
