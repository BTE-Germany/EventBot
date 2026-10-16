const { PrismaClient } = require("@prisma/client");

// One shared client, so the bot, events and API use a single connection pool
module.exports = new PrismaClient();
