const prisma = require("../../utils/prisma.js");
const { getRankedUsers } = require("../../utils/leaderboard.js");

const toJSON = (value) =>
  JSON.parse(JSON.stringify(value, (_, v) => (typeof v === "bigint" ? v.toString() : v)));

module.exports = {
  path: "/leaderboard",
  method: "GET",
  handler: async (request, reply) => {
    const users = await getRankedUsers(prisma);
    // Judge-internal data (scores per judge, correction reasons, builder notes) stays private
    const builds = (await prisma.build.findMany()).map(
      ({ judge_details, extra_info, ...build }) => build
    );

    reply.send({
      users: toJSON(users),
      builds: toJSON(builds),
      points: users.reduce((sum, user) => sum + user.points, 0),
    });
  },
};
