require("dotenv").config();

function isJudge(interaction) {
  return Boolean(interaction.member?.roles.cache.has(process.env.PING_ROLE));
}

function isAdmin(interaction) {
  return Boolean(interaction.memberPermissions?.has("Administrator"));
}

function denyJudge(interaction) {
  return interaction.reply({ content: "Du bist kein Judge.", ephemeral: true });
}

function denyAdmin(interaction) {
  return interaction.reply({
    content: "Nur Administratoren dürfen diesen Befehl ausführen.",
    ephemeral: true,
  });
}

module.exports = {
  isJudge,
  isAdmin,
  denyJudge,
  denyAdmin,
};
