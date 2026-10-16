const path = require("path");
const fs = require("fs");
const discord = require("discord.js");
require("dotenv").config();
const prisma = require("./utils/prisma.js");
const api = require("./api/api.js");

const client = new discord.Client({
  intents: [
    discord.GatewayIntentBits.Guilds,
    discord.GatewayIntentBits.GuildMembers,
    discord.GatewayIntentBits.GuildMessages,
    discord.GatewayIntentBits.MessageContent,
  ],
});

const commands = [];
const buttons = [];
const modals = [];

function loadModules(dir) {
  return fs
    .readdirSync(path.join(__dirname, dir))
    .filter((file) => file.endsWith(".js"))
    .map((file) => ({ file, data: require(path.join(__dirname, dir, file)) }));
}

for (const { data: event } of loadModules("event")) {
  console.log(new Date().toLocaleString(), `Event registriert: ${event.name}`);
  const listener = (...args) =>
    Promise.resolve(event.execute(...args)).catch((err) =>
      console.error(`Fehler im Event ${event.name}:`, err)
    );
  if (event.once) client.once(event.name, listener);
  else client.on(event.name, listener);
}

// "ready" on older discord.js versions, "clientReady" on newer ones
client.once(discord.Events.ClientReady, async () => {
  console.log(new Date().toLocaleString(), "Ready!");

  // Columns added after the initial schema; the start script only runs `prisma generate`
  for (const statement of [
    `ALTER TABLE "Build" ADD COLUMN IF NOT EXISTS "reference_type" TEXT;`,
    `ALTER TABLE "Build" ADD COLUMN IF NOT EXISTS "reference_link" TEXT;`,
    `ALTER TABLE "Build" ADD COLUMN IF NOT EXISTS "judge_details" JSONB;`,
    `ALTER TABLE "Build" ADD COLUMN IF NOT EXISTS "extra_info" TEXT;`,
  ]) {
    await prisma.$executeRawUnsafe(statement).catch((err) =>
      console.error("Fehler bei der Datenbank-Migration:", err.message)
    );
  }

  for (const { data } of loadModules("commands")) commands.push(data);
  // Bulk overwrite, so removed commands also disappear from Discord
  try {
    await client.application.commands.set(commands.map((c) => c.command));
    console.log(
      new Date().toLocaleString(),
      `Commands registriert: ${commands.map((c) => `/${c.command.name}`).join(", ")}`
    );
  } catch (err) {
    console.error("Fehler beim Registrieren der Commands:", err);
  }

  for (const { data } of loadModules("buttons")) buttons.push(data);
  for (const { data } of loadModules("modals")) modals.push(data);

  for (const { file, data } of loadModules("schedule")) {
    console.log(
      new Date().toLocaleString(),
      `Schedule registriert: ${file} (${data.time}ms)`
    );
    const run = () =>
      Promise.resolve(data.run(client, prisma)).catch((err) =>
        console.error(`Fehler im Schedule ${file}:`, err)
      );
    run();
    setInterval(run, data.time);
  }

  // A failing API (e.g. port in use) must not take the bot down with it
  await api.start().catch((err) => console.error("Fehler beim Starten der API:", err));
});

async function replyWithError(interaction, content) {
  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content, ephemeral: true });
    } else {
      await interaction.reply({ content, ephemeral: true });
    }
  } catch (err) {
    console.error("Fehlermeldung konnte nicht gesendet werden:", err.message);
  }
}

client.on("interactionCreate", async (interaction) => {
  if (interaction.isAutocomplete()) {
    const command = commands.find(
      (c) => c.command.name === interaction.commandName
    );
    if (!command || !command.autocomplete) return;
    try {
      await command.autocomplete(client, interaction, prisma);
    } catch (error) {
      console.error(error);
    }
    return;
  }

  let handler;
  let errorMessage;
  if (interaction.isChatInputCommand()) {
    handler = commands.find((c) => c.command.name === interaction.commandName);
    errorMessage = "Beim Ausführen dieses Befehls ist ein Fehler aufgetreten!";
  } else if (interaction.isButton()) {
    handler = buttons.find((b) => interaction.customId.startsWith(b.button.name));
    errorMessage = "Beim Ausführen dieser Schaltfläche ist ein Fehler aufgetreten!";
  } else if (interaction.isModalSubmit()) {
    handler = modals.find((m) => interaction.customId.startsWith(m.modal.name));
    errorMessage = "Beim Ausführen dieses Formulars ist ein Fehler aufgetreten!";
  }
  if (!handler) return;

  try {
    await handler.run(client, interaction, prisma);
  } catch (error) {
    console.error(error);
    await replyWithError(interaction, errorMessage);
  }
});

client.login(process.env.BOT_TOKEN);
