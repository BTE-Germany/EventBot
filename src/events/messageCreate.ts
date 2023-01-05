import {Bot} from "../../bot.ts";
import {configs} from "../../configs.ts";
import {PrismaClient} from "../../generated/client/deno/edge.ts";
import {config} from "https://deno.land/std@0.163.0/dotenv/mod.ts";
import {setTimeout} from "https://deno.land/std@0.166.0/node/timers.ts";
import {updateLeaderBoard} from "../utils/updateLeaderBoard.ts";
import * as AzureStorageBlob from "npm:@azure/storage-blob";
const env = await config();
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: env.DATABASE_URL,
        },
    },
});

const BlobClient = AzureStorageBlob.BlobServiceClient.fromConnectionString(
    configs.azureconnectionstring,
);
const containerClient = BlobClient.getContainerClient(configs.azure_container);

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
                            images: ["loading"]
                        },
                    })
                    .then(async (obj) => {
                        const user = await Bot.helpers.getUser(message.member?.id || "");
                        let embeds = [
                            {
                                title: `#${obj.id.toString()}`,
                                description: `Koordinaten: ${obj.location}`,
                                url: "https://bte-germany.de",
                                author: {
                                    name: `${user.username}#${user.discriminator}`,
                                },
                            },
                        ];
                        let images = [];
                        for (const image of message.attachments.slice(0, 3)) {
                            let uuid = crypto.randomUUID();
                            const unresponse = await fetch(image.url);
                            const response = await unresponse.arrayBuffer();
                            await containerClient.getBlockBlobClient(`${user.id}.${uuid}${image.url.substring(image.url.lastIndexOf("."))}`).upload(response, response.byteLength);
                            embeds.push({
                                url: "https://bte-germany.de",
                                image: {
                                    url: configs.azure_url + `${user.id}.${uuid}${image.url.substring(image.url.lastIndexOf("."))}`,
                                },
                            });
                            images.push(configs.azure_url + `${user.id}.${uuid}${image.url.substring(image.url.lastIndexOf("."))}`);
                        }
                        await prisma.build.update({
                            where: {
                                id: obj.id
                            },
                            data: {
                                images: images
                            }
                        });
                        Bot.helpers
                            .sendMessage(message.channelId, {
                                content: " ",
                                embeds: embeds,
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
                                embeds: embeds,
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
                await updateLeaderBoard(Bot);
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
