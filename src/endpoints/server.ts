import {Oak} from "../../deps.ts";
import log from "../utils/logger.ts";
import {PrismaClient} from "../../generated/client/deno/edge.ts";
import {config} from "https://deno.land/std@0.163.0/dotenv/mod.ts";

const port = 6969;
const app = new Oak.Application();
const router = new Oak.Router();
const env = await config();

export default async function startServer() {
    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: env.DATABASE_URL,
            },
        },
    });
    app.addEventListener('listen', () => {
        log.info("[API] Server started on port " + port);
    });
    app.use(router.routes());
    app.use(router.allowedMethods());
    router.get("/leaderboard", async (ctx) => {
        let users = await prisma.user.findMany();
        users = users.sort((a, b) => b.points - a.points);
        const builds = await prisma.build.findMany();
        let points = 0;
        users.forEach((user) => {
            points = points + user.points;
        });
        ctx.response.body = {
            users: JSON.parse(JSON.stringify(users, (_, v) => typeof v === 'bigint' ? v.toString() : v)),
            builds: JSON.parse(JSON.stringify(builds, (_, v) => typeof v === 'bigint' ? v.toString() : v)),
            points: points
        }
    });

    await app.listen({port});
}
