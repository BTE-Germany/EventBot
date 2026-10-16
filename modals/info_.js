const { refreshBuildingPanel } = require("../utils/buildingPanel.js");

module.exports = {
  modal: {
    name: "info_",
  },
  run: async (client, interaction, prisma) => {
    const buildId = parseInt(interaction.customId.split("_")[1]);
    const build = await prisma.build.findUnique({ where: { id: buildId } });

    if (!build || build.builder_id.toString() !== interaction.user.id) {
      return interaction.reply({
        content: "Dieser Build existiert nicht mehr oder gehört dir nicht.",
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    // Stored on the build so the panel keeps it when it is redrawn
    await prisma.build.update({
      where: { id: buildId },
      data: { extra_info: interaction.fields.getTextInputValue("extra_info").trim() },
    });
    await refreshBuildingPanel(client, prisma, buildId);

    await interaction.editReply({
      content: "Zusätzliche Informationen gespeichert. Die Judges können sie jetzt sehen.",
    });
  },
};
