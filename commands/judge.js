module.exports = {
  command: {
    name: "judge",
    description: "Bewerte ein Build!",
    options: [
      {
        name: "id",
        description: "Die ID des zu beurteilenden Builds.",
        type: 4,
        autocomplete: true,
        required: true,
      },
      {
        name: "aufwand_komplexitaet",
        description: "Aufwand & Komplexität (0 bis 6 Punkte)",
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
        required: true,
      },
      {
        name: "technik_farben_details",
        description: "Technik, Farben & Details (0 bis 10 Punkte)",
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
        required: true,
      },
      {
        name: "grundpunkte",
        description:
          "Grundpunkte: 1 für Infrastruktur, 2 für Gebäude (nur 1. Judge)",
        type: 10,
        autocomplete: true,
        required: false,
      },
    ],
  },
  autocomplete: async (client, interaction, prisma) => {
    try {
      const focusedOption = interaction.options.getFocused(true);
      if (focusedOption.name === "id") {
        const builds = await prisma.build.findMany({
          orderBy: { id: "asc" },
          take: 50,
        });
        const unjudged = builds
          .filter((b) => b.judges.length < 2)
          .filter(
            (b) =>
              !focusedOption.value ||
              b.id.toString().includes(focusedOption.value.toString())
          )
          .slice(0, 25);

        return interaction.respond(
          unjudged.map((b) => ({
            name: `#${b.id} (${b.judges.length}/2 Judges) - ${b.location ? b.location.slice(0, 45) : ""}`,
            value: b.id,
          }))
        );
      }

      if (focusedOption.name === "grundpunkte") {
        const buildId = interaction.options.getInteger("id");
        if (buildId) {
          const build = await prisma.build.findUnique({
            where: { id: buildId },
          });
          if (build && build.judges && build.judges.length >= 1) {
            const label =
              build.base_points === 2 ? "2 (Gebäude)" : "1 (Infrastruktur)";
            return interaction.respond([
              {
                name: `${label} - von Judge 1 festgelegt`,
                value: build.base_points,
              },
            ]);
          }
        }
        return interaction.respond([
          { name: "2 (Gebäude)", value: 2 },
          { name: "1 (Infrastruktur)", value: 1 },
        ]);
      }
    } catch (err) {
      console.error("Autocomplete Fehler in /judge:", err);
    }
  },
  run: async (client, interaction, prisma) => {
    if (
      interaction.member.roles.cache.some(
        (role) => role.id === process.env.PING_ROLE
      )
    ) {
      const buildId = interaction.options.getInteger("id") || 0;
      const build = await prisma.build.findUnique({
        where: {
          id: buildId,
        },
      });
      if (!build) {
        await interaction.reply({
          content: "Build nicht gefunden.",
          ephemeral: true,
        });
        return;
      }

      if (build.judges.includes(interaction.member.user.id.toString())) {
        await interaction.reply({
          content: "Du hast dieses Build bereits bewertet.",
          ephemeral: true,
        });
        return;
      }

      const user = await prisma.user.findUnique({
        where: {
          id: build.builder_id,
        },
      });

      const aufwand = interaction.options.getNumber("aufwand_komplexitaet");
      const details = interaction.options.getNumber("technik_farben_details");

      // ----------------- JUDGE 1 -----------------
      if (build.judges?.length === 0) {
        const grundpunkteInput = interaction.options.getNumber("grundpunkte");
        const grundpunkte = grundpunkteInput !== null ? grundpunkteInput : 2;
        const judges = [interaction.user.id.toString()];

        const judge1Details = {
          judge_id: interaction.user.id.toString(),
          judge_name: interaction.member.user.username,
          grundpunkte: grundpunkte,
          aufwand: aufwand,
          details: details,
          total: grundpunkte + aufwand + details,
          timestamp: new Date().toISOString(),
        };

        await prisma.build.update({
          where: {
            id: buildId,
          },
          data: {
            judges: judges,
            base_points: grundpunkte,
            B: aufwand,
            A: details,
            judge_details: [judge1Details],
          },
        });

        await interaction.reply({
          content: `Build **#${buildId}** bewertet. Du warst der 1. Judge (1/2). Grundpunkte wurden auf **${grundpunkte}** (${grundpunkte === 2 ? "Gebäude" : "Infrastruktur"}) festgelegt.`,
          components: [
            {
              type: 1,
              components: [
                {
                  type: 2,
                  label: "Zurück",
                  style: 5,
                  url: `https://discord.com/channels/${interaction.guild.id}/${interaction.channel.id}/${build.judge_msg}`,
                },
              ],
            },
          ],
        });

        let description = `Koordinaten: ${build.location}`;
        if (build.reference_type) description += `\nReferenz: ${build.reference_type}`;
        if (build.reference_link) description += `\nQuelle: ${build.reference_link}`;

        let embeds = [
          {
            title: `#${build.id.toString()}`,
            description: description,
            url: "https://bte-germany.de",
            color: 16761344,
            author: {
              name: `${user ? user.minecraft_id : "Unbekannt"}`,
            },
            fields: [
              {
                name: "📋 Bewertung (1/2 Judges)",
                value: `• **Judge 1** (<@${interaction.user.id}>):\n  - Grundpunkte: **${grundpunkte}** (${grundpunkte === 2 ? "Gebäude" : "Infrastruktur"})\n  - Aufwand & Komplexität: **${aufwand}** / 6\n  - Technik, Farben & Details: **${details}** / 10\n  - Zwischenstand: **${grundpunkte + aufwand + details}** / 18`,
              },
            ],
          },
        ];

        build.images.forEach((image) => {
          embeds.push({
            url: "https://bte-germany.de",
            image: {
              url: image,
            },
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
          `[JUDGE 1/2] Judge ${interaction.member.user.username} (${interaction.member.user.id}) hat Build #${build.id} bewertet: G=${grundpunkte}, A=${aufwand}, T=${details}.`
        );
        return;
      }

      // ----------------- JUDGE 2 -----------------
      if (build.judges?.length === 1) {
        const judges = [...build.judges, interaction.user.id.toString()];

        // Grundpunkte: Only Judge 1 decides!
        const finalGrundpunkte = build.base_points;
        const finalAufwand = (build.B + aufwand) / 2;
        const finalDetails = (build.A + details) / 2;
        const totalPoints = finalGrundpunkte + finalAufwand + finalDetails;

        const existingDetails = Array.isArray(build.judge_details)
          ? build.judge_details
          : [];
        const judge1Data = existingDetails[0] || {
          judge_id: build.judges[0],
          judge_name: "Judge 1",
          grundpunkte: build.base_points,
          aufwand: build.B,
          details: build.A,
        };

        const judge2Details = {
          judge_id: interaction.user.id.toString(),
          judge_name: interaction.member.user.username,
          aufwand: aufwand,
          details: details,
          total: finalGrundpunkte + aufwand + details,
          timestamp: new Date().toISOString(),
        };

        const updatedJudgeDetails = [judge1Data, judge2Details];

        await prisma.build.update({
          where: {
            id: buildId,
          },
          data: {
            judges: judges,
            base_points: finalGrundpunkte,
            B: finalAufwand,
            A: finalDetails,
            judge_details: updatedJudgeDetails,
          },
        });

        await prisma.user.update({
          where: {
            id: build.builder_id,
          },
          data: {
            points: (user?.points || 0) + totalPoints,
          },
        });

        interaction.reply({
          content: `Build **#${buildId}** bewertet. **${totalPoints}** Punkte wurden dem User gutgeschrieben (Grundpunkte: ${finalGrundpunkte} von Judge 1 übernommen).`,
          components: [
            {
              type: 1,
              components: [
                {
                  type: 2,
                  label: "Zurück",
                  style: 5,
                  url: `https://discord.com/channels/${interaction.guild.id}/${interaction.channel.id}/${build.judge_msg}`,
                },
              ],
            },
          ],
        });

        let description = `Koordinaten: ${build.location}`;
        if (build.reference_type) description += `\nReferenz: ${build.reference_type}`;
        if (build.reference_link) description += `\nQuelle: ${build.reference_link}`;

        // Embed for SUBMISSION_CHANNEL (clean overview for builder)
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
                name: "Bewertung",
                value: `Grundpunkte: **${finalGrundpunkte}** (${finalGrundpunkte === 2 ? "Gebäude" : "Infrastruktur"})\nAufwand & Komplexität: **${finalAufwand}** / 6\nTechnik, Farben & Details: **${finalDetails}** / 10\nGesamt: **${totalPoints}** / 18 Punkte`,
              },
            ],
          },
        ];

        // Embed for JUDGE_CHANNEL (includes full Judge-Transparenz)
        let judgeEmbeds = [
          {
            title: `#${build.id.toString()}`,
            description: description + `\nBewertet von: <@${build.judges[0]}> und <@${interaction.member.user.id}>`,
            url: "https://bte-germany.de",
            color: 7119627,
            author: {
              name: `${user ? user.minecraft_id : "Unbekannt"}`,
            },
            fields: [
              {
                name: "📊 Endergebnis",
                value: `• Grundpunkte: **${finalGrundpunkte}** (${finalGrundpunkte === 2 ? "Gebäude" : "Infrastruktur"} - entschieden von <@${judge1Data.judge_id}>)\n• Aufwand & Komplexität: **${finalAufwand}** / 6 (Ø aus ${judge1Data.aufwand} & ${aufwand})\n• Technik, Farben & Details: **${finalDetails}** / 10 (Ø aus ${judge1Data.details} & ${details})\n• **Gesamtergebnis: ${totalPoints} / 18 Punkte**`,
              },
              {
                name: "👥 Judge-Transparenz",
                value: `• **Judge 1** (<@${judge1Data.judge_id}>): G: ${judge1Data.grundpunkte} | A: ${judge1Data.aufwand} | T: ${judge1Data.details}\n• **Judge 2** (<@${interaction.user.id}>): A: ${aufwand} | T: ${details}`,
              },
            ],
          },
        ];

        build.images.forEach((image) => {
          submissionEmbeds.push({
            url: "https://bte-germany.de",
            image: {
              url: image,
            },
          });
          judgeEmbeds.push({
            url: "https://bte-germany.de",
            image: {
              url: image,
            },
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
          `[JUDGE TRANSPARENZ] Build #${build.id} abgeschlossen:\n` +
          `  Judge 1 (<@${judge1Data.judge_id}>): G=${judge1Data.grundpunkte}, A=${judge1Data.aufwand}, T=${judge1Data.details}\n` +
          `  Judge 2 (<@${interaction.user.id}>): A=${aufwand}, T=${details}\n` +
          `  Ergebnis: Grundpunkte=${finalGrundpunkte}, Aufwand Ø=${finalAufwand}, Technik Ø=${finalDetails} -> Gesamt: ${totalPoints} Pkt.`
        );
        return;
      }

      if (build.judges?.length > 1) {
        interaction.reply({
          content: "Dieses Build wurde bereits vollständig bewertet.",
          ephemeral: true,
        });
      }
    } else {
      interaction.reply({
        content: "Du bist kein Judge.",
        ephemeral: true,
      });
    }
  },
};
