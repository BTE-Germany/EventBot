module.exports = {
  command: {
    name: "correct",
    description: "Korrigiert nachträglich die Bewertung eines Builds.",
    options: [
      {
        name: "id",
        description: "Die ID des zu korrigierenden Builds.",
        type: 4,
        autocomplete: true,
        required: true,
      },
      {
        name: "reason",
        description: "Grund für die nachträgliche Korrektur",
        type: 3,
        required: true,
      },
      {
        name: "grundpunkte",
        description: "Neue Grundpunkte (1 für Infrastruktur, 2 für Gebäude)",
        type: 10,
        choices: [
          { name: "2 (Gebäude)", value: 2 },
          { name: "1 (Infrastruktur)", value: 1 },
        ],
        required: false,
      },
      {
        name: "aufwand_komplexitaet",
        description: "Neuer Aufwand & Komplexität (0 bis 6 Punkte)",
        type: 10,
        choices: [
          { name: "0", value: 0 },
          { name: "0.5", value: 0.5 },
          { name: "1", value: 1 },
          { name: "1.5", value: 1.5 },
          { name: "2", value: 2 },
          { name: "2.5", value: 2.5 },
          { name: "3", value: 3 },
          { name: "3.5", value: 3.5 },
          { name: "4", value: 4 },
          { name: "4.5", value: 4.5 },
          { name: "5", value: 5 },
          { name: "5.5", value: 5.5 },
          { name: "6", value: 6 },
        ],
        required: false,
      },
      {
        name: "technik_farben_details",
        description: "Neue Technik, Farben & Details (0 bis 10 Punkte)",
        type: 10,
        choices: [
          { name: "0", value: 0 },
          { name: "0.5", value: 0.5 },
          { name: "1", value: 1 },
          { name: "1.5", value: 1.5 },
          { name: "2", value: 2 },
          { name: "2.5", value: 2.5 },
          { name: "3", value: 3 },
          { name: "3.5", value: 3.5 },
          { name: "4", value: 4 },
          { name: "4.5", value: 4.5 },
          { name: "5", value: 5 },
          { name: "5.5", value: 5.5 },
          { name: "6", value: 6 },
          { name: "6.5", value: 6.5 },
          { name: "7", value: 7 },
          { name: "7.5", value: 7.5 },
          { name: "8", value: 8 },
          { name: "8.5", value: 8.5 },
          { name: "9", value: 9 },
          { name: "9.5", value: 9.5 },
          { name: "10", value: 10 },
        ],
        required: false,
      },
    ],
  },
  autocomplete: async (client, interaction, prisma) => {
    try {
      const focusedOption = interaction.options.getFocused(true);
      if (focusedOption.name === "id") {
        const builds = await prisma.build.findMany({
          orderBy: { id: "desc" },
          take: 50,
        });
        const matching = builds
          .filter(
            (b) =>
              b.judges.length > 0 &&
              (!focusedOption.value ||
                b.id.toString().includes(focusedOption.value.toString()))
          )
          .slice(0, 25);

        return interaction.respond(
          matching.map((b) => ({
            name: `#${b.id} (${b.judges.length}/2 Judges) - ${b.location ? b.location.slice(0, 45) : ""}`,
            value: b.id,
          }))
        );
      }
    } catch (err) {
      console.error("Autocomplete Fehler in /correct:", err);
    }
  },
  run: async (client, interaction, prisma) => {
    if (
      !interaction.member.roles.cache.some(
        (role) => role.id === process.env.PING_ROLE
      )
    ) {
      return interaction.reply({
        content: "Du bist kein Judge.",
        ephemeral: true,
      });
    }

    const buildId = interaction.options.getInteger("id");
    const reason = interaction.options.getString("reason");
    const newGrund = interaction.options.getNumber("grundpunkte");
    const newAufwandInput = interaction.options.getNumber("aufwand_komplexitaet");
    const newDetailsInput = interaction.options.getNumber("technik_farben_details");

    if (newGrund === null && newAufwandInput === null && newDetailsInput === null) {
      return interaction.reply({
        content:
          "Bitte gib mindestens eine Kategorie an, die du korrigieren möchtest (Grundpunkte, Aufwand oder Technik).",
        ephemeral: true,
      });
    }

    const build = await prisma.build.findUnique({
      where: { id: buildId },
    });

    if (!build) {
      return interaction.reply({
        content: "Build nicht gefunden.",
        ephemeral: true,
      });
    }

    if (build.judges.length === 0) {
      return interaction.reply({
        content: "Dieses Build wurde noch gar nicht bewertet. Nutze `/judge`.",
        ephemeral: true,
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: build.builder_id },
    });

    const existingDetails = Array.isArray(build.judge_details)
      ? build.judge_details
      : [];

    const correctionEntry = {
      action: "CORRECTION",
      corrector_id: interaction.user.id.toString(),
      corrector_name: interaction.member.user.username,
      reason: reason,
      old_values: {
        grundpunkte: build.base_points,
        aufwand: build.B,
        details: build.A,
      },
      timestamp: new Date().toISOString(),
    };

    const updatedBase = newGrund !== null ? newGrund : build.base_points;
    const updatedAufwand = newAufwandInput !== null ? newAufwandInput : build.B;
    const updatedDetails = newDetailsInput !== null ? newDetailsInput : build.A;

    // Build only judged by 1 Judge
    if (build.judges.length === 1) {
      await prisma.build.update({
        where: { id: buildId },
        data: {
          base_points: updatedBase,
          B: updatedAufwand,
          A: updatedDetails,
          judge_details: [...existingDetails, correctionEntry],
        },
      });

      let description = `Koordinaten: ${build.location}`;
      if (build.reference_type) description += `\nReferenz: ${build.reference_type}`;
      if (build.reference_link) description += `\nQuelle: ${build.reference_link}`;

      let embeds = [
        {
          title: `#${build.id.toString()} (Korrigiert)`,
          description: description,
          url: "https://bte-germany.de",
          color: 16761344,
          author: {
            name: `${user ? user.minecraft_id : "Unbekannt"}`,
          },
          fields: [
            {
              name: "📋 Bewertung (1/2 Judges - Korrigiert)",
              value: `• **Judge 1** (<@${build.judges[0]}>):\n  - Grundpunkte: **${updatedBase}** (${updatedBase === 2 ? "Gebäude" : "Infrastruktur"})\n  - Aufwand & Komplexität: **${updatedAufwand}** / 6\n  - Technik, Farben & Details: **${updatedDetails}** / 10\n  - Zwischenstand: **${updatedBase + updatedAufwand + updatedDetails}** / 18`,
            },
            {
              name: "✏️ Korrektur-Notiz",
              value: `Korrigiert von: <@${interaction.user.id}>\nGrund: ${reason}`,
            },
          ],
        },
      ];

      build.images.forEach((image) => {
        embeds.push({
          url: "https://bte-germany.de",
          image: { url: image },
        });
      });

      await client.channels.cache
        .get(process.env.JUDGE_CHANNEL)
        .messages.fetch(build.judge_msg.toString())
        .then((message) => {
          message.edit({
            content: `<@&${process.env.PING_ROLE}>`,
            embeds: embeds,
          });
        });

      console.log(
        new Date().toLocaleString(),
        `[KORREKTUR 1/2] Build #${build.id} korrigiert von ${interaction.member.user.username}: G=${updatedBase}, A=${updatedAufwand}, T=${updatedDetails}. Grund: ${reason}`
      );

      return interaction.reply({
        content: `Build **#${buildId}** (Zwischenbewertung 1/2) erfolgreich korrigiert!\n• Grund: ${reason}`,
      });
    }

    // Build fully judged (judges.length >= 2)
    const oldTotal = build.base_points + build.B + build.A;
    const newTotal = updatedBase + updatedAufwand + updatedDetails;
    const pointDiff = newTotal - oldTotal;

    await prisma.build.update({
      where: { id: buildId },
      data: {
        base_points: updatedBase,
        B: updatedAufwand,
        A: updatedDetails,
        judge_details: [...existingDetails, correctionEntry],
      },
    });

    if (user) {
      await prisma.user.update({
        where: { id: build.builder_id },
        data: {
          points: Math.max(0, user.points + pointDiff),
        },
      });
    }

    let description = `Koordinaten: ${build.location}`;
    if (build.reference_type) description += `\nReferenz: ${build.reference_type}`;
    if (build.reference_link) description += `\nQuelle: ${build.reference_link}`;

    let submissionEmbeds = [
      {
        title: `#${build.id.toString()}`,
        description: description,
        url: "https://bte-germany.de",
        color: 7119627,
        author: {
          name: `${user ? user.minecraft_id : "Unbekannt"}`,
        },
        fields: [
          {
            name: "Bewertung (Korrigiert)",
            value: `Grundpunkte: **${updatedBase}** (${updatedBase === 2 ? "Gebäude" : "Infrastruktur"})\nAufwand & Komplexität: **${updatedAufwand}** / 6\nTechnik, Farben & Details: **${updatedDetails}** / 10\nGesamt: **${newTotal}** / 18 Punkte`,
          },
        ],
      },
    ];

    let judgeEmbeds = [
      {
        title: `#${build.id.toString()}`,
        description:
          description +
          `\nBewertet von: <@${build.judges[0]}> und <@${build.judges[1]}>` +
          `\nZuletzt korrigiert von: <@${interaction.user.id}>`,
        url: "https://bte-germany.de",
        color: 7119627,
        author: {
          name: `${user ? user.minecraft_id : "Unbekannt"}`,
        },
        fields: [
          {
            name: "📊 Endergebnis (Korrigiert)",
            value: `• Grundpunkte: **${updatedBase}** (${updatedBase === 2 ? "Gebäude" : "Infrastruktur"})\n• Aufwand & Komplexität: **${updatedAufwand}** / 6\n• Technik, Farben & Details: **${updatedDetails}** / 10\n• **Gesamtergebnis: ${newTotal} / 18 Punkte**`,
          },
          {
            name: "✏️ Korrektur-Protokoll",
            value: `• Vorher: ${oldTotal} Pkt ➔ Nachher: **${newTotal} Pkt** (${pointDiff >= 0 ? "+" : ""}${pointDiff})\n• Durch: <@${interaction.user.id}>\n• Grund: *${reason}*`,
          },
        ],
      },
    ];

    build.images.forEach((image) => {
      submissionEmbeds.push({
        url: "https://bte-germany.de",
        image: { url: image },
      });
      judgeEmbeds.push({
        url: "https://bte-germany.de",
        image: { url: image },
      });
    });

    await client.channels.cache
      .get(process.env.SUBMISSION_CHANNEL)
      .messages.fetch(build.message.toString())
      .then((message) => {
        message.edit({
          content: " ",
          embeds: submissionEmbeds,
        });
      });

    await client.channels.cache
      .get(process.env.JUDGE_CHANNEL)
      .messages.fetch(build.judge_msg.toString())
      .then((message) => {
        message.edit({
          content: " ",
          embeds: judgeEmbeds,
        });
      });

    console.log(
      new Date().toLocaleString(),
      `[KORREKTUR] Build #${build.id} korrigiert von ${interaction.member.user.username}:\n` +
      `  Alte Punkte: ${oldTotal} -> Neue Punkte: ${newTotal} (${pointDiff >= 0 ? "+" : ""}${pointDiff})\n` +
      `  Grund: ${reason}`
    );

    interaction.reply({
      content: `Build **#${buildId}** erfolgreich korrigiert!\n• Alte Punkte: **${oldTotal}**\n• Neue Punkte: **${newTotal}** (${pointDiff >= 0 ? "+" : ""}${pointDiff})\n• Grund: *${reason}*`,
    });
  },
};
