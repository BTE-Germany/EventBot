const path = require("path");
const fs = require("fs");
const discord = require("discord.js");
const { PrismaClient } = require("@prisma/client");
require("dotenv").config();
const client = new discord.Client({
  intents: new discord.IntentsBitField(33283),
});
const prisma = new PrismaClient();
const api = require("./api/api.js");

const commands = [];
client.on("ready", () => {
  console.log(new Date().toLocaleString(), "Ready!");
});

const eventsPath = path.join(__dirname, "event");
const eventFiles = fs.readdirSync(eventsPath);

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.name !== "ready" && event.name !== "interactionCreate") {
    if (event.once) {
      console.log(
        new Date().toLocaleString(),
        `Registering event: ${event.name}`
      );
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      console.log(
        new Date().toLocaleString(),
        `Registering event: ${event.name}`
      );
      client.on(event.name, (...args) => event.execute(...args));
    }
  }
}

client.once("ready", async () => {
  //load command from command handler dir
  // client.application.commands.set([]);
  const commandFiles = fs
    .readdirSync("./commands")
    .filter((file) => file.endsWith(".js"));
  for (const file of commandFiles) {
    let data = require(`./commands/${file}`);
    commands.push(data);
    client.application.commands
      .create(data.command)
      .then(() =>
        console.log(
          new Date().toLocaleString(),
          `Created command /${data.command.name}`
        )
      )
      .catch(console.error);
  }

  const scheduleFiles = fs
    .readdirSync("./schedule")
    .filter((file) => file.endsWith(".js"));
  for (const file of scheduleFiles) {
    let data = require(`./schedule/${file}`);
    console.log(
      new Date().toLocaleString(),
      `registering schedule: ${file} (${data.time}ms)`
    );
    setInterval(() => {
      data.run(client, prisma);
    }, data.time);
  }

  await api.start();
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;
  const command = commands.find(
    (command) => command.command.name === interaction.commandName
  );
  if (!command) return;
  try {
    await command.run(client, interaction, prisma);
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: "There was an error while executing this command!",
      ephemeral: true,
    });
  }
});

client.login(process.env.BOT_TOKEN);
