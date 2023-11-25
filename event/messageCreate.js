require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { BlobServiceClient } = require("@azure/storage-blob");
const blobServiceClient = BlobServiceClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING
);
const crypto = require("crypto");
const containerClient = blobServiceClient.getContainerClient(
  process.env.CONTAINER_NAME
);

module.exports = {
  name: "messageCreate",
  once: false,
  async execute(args) {
    if (args.author.id === args.client.user.id) return;
    if (args.channel.id === process.env.SUBMISSION_CHANNEL) {
      const dbUser = await prisma.user.findUnique({
        where: {
          id: BigInt(args.author.id),
        },
      });
      if (!dbUser) {
        const botmessage = await args.channel.send({
          content: "You are not registered! Please register with `/register`.",
          messageReference: {
            messageID: args.id,
          },
        });
        setTimeout(async () => {
          await botmessage.delete();
          await args.delete();
        }, 5000);
      } else {
        if (
          args.attachments.map((a) => a).length > 0 &&
          args.content.length > 0
        ) {
          prisma.build
            .create({
              data: {
                builder_id: BigInt(args.author.id),
                message: BigInt(args.id),
                images: ["loading"],
                location: args.content,
              },
            })
            .then(async (obj) => {
              const user = args.author;
              let embeds = [
                {
                  title: `#${obj.id}`,
                  description: "Koordinaten: " + obj.location,
                  url: "https://bte-germany.de",
                  author: {
                    name: `${dbUser.minecraft_id}`,
                  },
                },
              ];
              let images = [];
              for (const image of args.attachments.map((a) => a).slice(0, 3)) {
                let uuid = crypto.randomUUID();
                const response = await fetch(image.url);
                const buffer = await response.arrayBuffer();
                let filetype = image.url.match(/\.([^/?#]+)(?=[?#]|$)/)[1];;
                const blockBlobClient = containerClient.getBlockBlobClient(
                  `${user.id}/${uuid}.${filetype}`
                );
                await blockBlobClient.uploadData(buffer, buffer.byteLength);
                embeds.push({
                  url: "https://bte-germany.de",
                  image: {
                    url: `${process.env.CDN_URL}/${
                      process.env.CONTAINER_NAME
                    }/${user.id}/${uuid}.${filetype}`,
                  },
                });
                images.push(
                  `${process.env.CDN_URL}/${process.env.CONTAINER_NAME}/${
                    user.id
                  }/${uuid}.${filetype}`
                );
              }
              await prisma.build.update({
                where: {
                  id: obj.id,
                },
                data: {
                  images: images,
                },
              });
              args.channel
                .send({
                  content: " ",
                  embeds: embeds,
                })
                .then(async (message) => {
                  await prisma.build.update({
                    where: {
                      id: obj.id,
                    },
                    data: {
                      message: BigInt(message.id),
                    },
                  });
                });
              args.client.channels.cache
                .get(process.env.JUDGE_CHANNEL)
                .send({
                  content: `<@&${process.env.PING_ROLE}>`,
                  embeds: embeds,
                })
                .then(async (msg) => {
                  await prisma.build.update({
                    where: {
                      id: obj.id,
                    },
                    data: {
                      judge_msg: BigInt(msg.id),
                    },
                  });
                });
              await args.delete();
              console.log(
                new Date().toLocaleString(),
                `Created new build by ${dbUser.minecraft_id} with id ${obj.id}`
              );
            });
          await prisma.user.update({
            where: {
              id: BigInt(args.author.id),
            },
            data: {
              points: dbUser.points + 10,
            },
          });
        } else {
          const botmessage = await args.channel.send({
            content:
              "Bitte hänge ein Bild an und schreibe die Koordinaten in die Nachricht",
          });
          setTimeout(async () => {
            await botmessage.delete();
            await args.delete();
          }, 5000);
        }
      }
    }
  },
};
