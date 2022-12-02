import {BotClient} from "../../bot.ts";
import { PrismaClient } from "../../generated/client/deno/edge.ts";
import {config} from "https://deno.land/std@0.163.0/dotenv/mod.ts";
const env = await config();
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: env.DATABASE_URL,
        },
    },
});
import { configs } from "../../configs.ts";

export async function updateLeaderBoard(Bot: BotClient) {
    let users = await prisma.user.findMany();
    users = users.sort((a, b) => b.points - a.points);
    console.log(users);
    let builds = await prisma.build.findMany();
    let points = 0;
    //calculate points
    users.forEach((user) => {
        points = points + user.points;
    });

    await Bot.helpers.editMessage(configs.leaderboard_channel, configs.leaderboard_message.toString(), {
        "content": null,
        "embeds": [
            {
                "title": "BTE Germany Weihnachtsevent",
                "color": 10630453,
                "fields": [
                    {
                        "name": ":top: Leaderboard",
                        "value": `:one: ${((await Bot.helpers.getUser(users[0].id)).username)}#${((await Bot.helpers.getUser(users[0].id)).discriminator)} - ${users[0].points}
                        :two: ${((await Bot.helpers.getUser(users[1].id)).username)}#${((await Bot.helpers.getUser(users[1].id)).discriminator)} - ${users[1].points}
                        :three: ${((await Bot.helpers.getUser(users[2].id)).username)}#${((await Bot.helpers.getUser(users[2].id)).discriminator)} - ${users[2].points}
                        
                        Runner-ups:
                        5. ${((await Bot.helpers.getUser(users[3].id)).username)}#${((await Bot.helpers.getUser(users[3].id)).discriminator)} - ${users[3].points}
                        6. ${((await Bot.helpers.getUser(users[4].id)).username)}#${((await Bot.helpers.getUser(users[4].id)).discriminator)} - ${users[4].points}`
                    },
                    {
                        "name": "Statistik",
                        "value": `Builds gesamt: **${builds.length}**
                        Registrierte Nutzer*innen: **${users.length}**
                        Punkte gesamt: **${points}**`
                    }
                ],
                "footer": {
                    "text": "Starte noch heute und kämpfe dich an die Spitze! Registrierung via /register"
                },
                "thumbnail": {
                    "url": "https://cdn.discordapp.com/attachments/724288663818600573/1047913656517664849/btede_christmas2.0.gif"
                }
            }
        ],
        "attachments": []
    });
}