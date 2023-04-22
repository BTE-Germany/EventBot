const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports = {
  path: "/leaderboard",
  method: "GET",
  handler: async (request, reply) => {
    let users = await prisma.user.findMany();
    users = users.sort((a, b) => b.points - a.points);
    const builds = await prisma.build.findMany();
    let points = 0;
    users.forEach((user) => {
      points = points + user.points;
    });

    reply.send({
      users: JSON.parse(
        JSON.stringify(users, (_, v) =>
          typeof v === "bigint" ? v.toString() : v
        )
      ),
      builds: JSON.parse(
        JSON.stringify(builds, (_, v) =>
          typeof v === "bigint" ? v.toString() : v
        )
      ),
      points: points,
    });
  },
};
