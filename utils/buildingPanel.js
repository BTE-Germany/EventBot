require("dotenv").config();

function generateBuildingEmbeds(build, user, isJudgeView = false) {
  const judgeCount = build.judges ? build.judges.length : 0;
  const isCompleted = judgeCount >= 2;
  const isInProgress = judgeCount === 1;

  let color = 16761344; // Gelb/Gold für in progress / pending
  if (isCompleted) {
    color = 7119627; // Grün für abgeschlossen
  }

  let description = `📍 **Koordinaten**: ${build.location}`;
  if (build.reference_type) {
    description += `\n🔍 **Referenz**: **${build.reference_type}**`;
  }
  if (build.reference_link) {
    description += `\n🔗 **Quelle**: ${build.reference_link}`;
  }

  if (isJudgeView) {
    if (judgeCount > 0) {
      const judgesMentions = build.judges.map((id) => `<@${id}>`).join(" und ");
      description += `\n⚖️ **Bewertet von**: ${judgesMentions}`;
    }
  }

  const fields = [];

  const existingDetails = Array.isArray(build.judge_details)
    ? build.judge_details
    : [];
  const j1 = existingDetails[0] || (build.judges && build.judges[0] ? {
    judge_id: build.judges[0],
    grundpunkte: build.base_points,
    aufwand: build.B,
    details: build.A,
  } : null);
  const j2 = existingDetails[1] || (build.judges && build.judges[1] ? {
    judge_id: build.judges[1],
    aufwand: build.B,
    details: build.A,
  } : null);

  if (judgeCount === 0) {
    fields.push({
      name: "📋 Status",
      value: isJudgeView
        ? "⏳ **Wartet auf Bewertung** (0/2 Judges)\n*Bewerte dieses Build mit `/judge`.*"
        : "⏳ **Eingereicht** (Wartet auf Prüfung durch Judges)",
      inline: false,
    });
  } else if (isInProgress) {
    const intermediateSum = build.base_points + build.B + build.A;
    if (isJudgeView) {
      fields.push({
        name: "📋 Zwischenbewertung (1/2 Judges)",
        value:
          `• **Judge 1** (<@${build.judges[0]}>):\n` +
          `  - Grundpunkte: **${build.base_points}** (${build.base_points === 2 ? "Gebäude" : "Infrastruktur"})\n` +
          `  - Aufwand & Komplexität: **${build.B}** / 6\n` +
          `  - Technik, Farben & Details: **${build.A}** / 10\n` +
          `  - Zwischensumme: **${intermediateSum}** / 18 Pkt\n\n` +
          `*Ein 2. Judge muss noch bewerten (` +
          "`/judge`" +
          `)*`,
        inline: false,
      });
    } else {
      fields.push({
        name: "📋 Status",
        value: "🟡 **In Bewertung** (1 von 2 Judges hat bereits bewertet)",
        inline: false,
      });
    }
  } else {
    // Completed (>= 2 judges)
    const totalPoints = Number((build.base_points + build.B + build.A).toFixed(2));

    if (isJudgeView) {
      fields.push({
        name: "📊 Endergebnis",
        value:
          `• Grundpunkte: **${build.base_points}** (${build.base_points === 2 ? "Gebäude" : "Infrastruktur"} - entschieden von <@${j1?.judge_id || build.judges[0]}>)\n` +
          `• Aufwand & Komplexität: **${build.B}** / 6\n` +
          `• Technik, Farben & Details: **${build.A}** / 10\n` +
          `• 🏆 **Gesamtpunktzahl: ${totalPoints} / 18 Punkte**`,
        inline: false,
      });

      if (j1 && j2) {
        fields.push({
          name: "👥 Judge-Transparenz",
          value:
            `• **Judge 1** (<@${j1.judge_id}>): G: **${j1.grundpunkte}** | A: **${j1.aufwand}** | T: **${j1.details}**\n` +
            `• **Judge 2** (<@${j2.judge_id}>): A: **${j2.aufwand}** | T: **${j2.details}**`,
          inline: false,
        });
      }
    } else {
      fields.push({
        name: "🏆 Bewertung abgeschlossen",
        value:
          `• Grundpunkte: **${build.base_points}** (${build.base_points === 2 ? "Gebäude" : "Infrastruktur"})\n` +
          `• Aufwand & Komplexität: **${build.B}** / 6\n` +
          `• Technik, Farben & Details: **${build.A}** / 10\n` +
          `• **Gesamtergebnis: ${totalPoints} / 18 Punkte**`,
        inline: false,
      });
    }
  }

  // Extra info from the builder (via the "Zusätzliche Informationen" button) is meant for judges
  if (isJudgeView && build.extra_info) {
    fields.push({
      name: "📍 Zusätzliche Informationen",
      value: build.extra_info.slice(0, 1024),
      inline: false,
    });
  }

  // Correction log is internal (corrector + reason), only show it to judges
  const corrections = existingDetails.filter((d) => d.action === "CORRECTION");
  if (isJudgeView && corrections.length > 0) {
    const lastCorr = corrections[corrections.length - 1];
    fields.push({
      name: "✏️ Letzte Korrektur",
      value: `Von: <@${lastCorr.corrector_id}>\nGrund: *${lastCorr.reason}*`,
      inline: false,
    });
  }

  const primaryEmbed = {
    title: `${isJudgeView ? "⚖️ " : ""}Build #${build.id}`,
    description: description,
    url: "https://bte-germany.de",
    color: color,
    author: {
      name: `${user ? user.minecraft_id : "Builder"}`,
    },
    fields: fields,
  };

  const embeds = [primaryEmbed];

  // Embeds sharing the same url are shown as one gallery (max. 4 images)
  const images = (build.images || []).filter((img) => img && img !== "loading");
  if (images.length > 0) {
    primaryEmbed.image = { url: images[0] };
  }
  for (const image of images.slice(1, 4)) {
    embeds.push({
      url: "https://bte-germany.de",
      image: { url: image },
    });
  }

  return embeds;
}

function submissionComponents(buildId) {
  return [
    {
      type: 1,
      components: [
        {
          type: 2,
          style: 2,
          label: "Zusätzliche Informationen",
          custom_id: `info_${buildId}`,
          emoji: "📍",
        },
      ],
    },
  ];
}

function judgePanelContent(build) {
  return build.judges.length < 2 ? `<@&${process.env.PING_ROLE}>` : " ";
}

async function refreshBuildingPanel(client, prisma, buildId) {
  const build = await prisma.build.findUnique({
    where: { id: parseInt(buildId) },
  });

  if (!build) {
    throw new Error(`Build #${buildId} existiert nicht.`);
  }

  const user = await prisma.user.findUnique({
    where: { id: build.builder_id },
  });

  const submissionEmbeds = generateBuildingEmbeds(build, user, false);
  const judgeEmbeds = generateBuildingEmbeds(build, user, true);

  let updatedSubmission = false;
  let updatedJudge = false;

  // 1. Update in SUBMISSION_CHANNEL
  if (process.env.SUBMISSION_CHANNEL && build.message) {
    try {
      const subChannel = await client.channels.fetch(process.env.SUBMISSION_CHANNEL);
      if (subChannel) {
        const msg = await subChannel.messages.fetch(build.message.toString());
        if (msg) {
          await msg.edit({
            content: " ",
            embeds: submissionEmbeds,
            components: submissionComponents(build.id),
          });
          updatedSubmission = true;
        }
      }
    } catch (subErr) {
      console.error(`Fehler beim Aktualisieren des Submission-Panels für #${build.id}:`, subErr.message);
    }
  }

  // 2. Update in JUDGE_CHANNEL
  if (process.env.JUDGE_CHANNEL && build.judge_msg) {
    try {
      const judgeChannel = await client.channels.fetch(process.env.JUDGE_CHANNEL);
      if (judgeChannel) {
        const msg = await judgeChannel.messages.fetch(build.judge_msg.toString());
        if (msg) {
          await msg.edit({
            content: judgePanelContent(build),
            embeds: judgeEmbeds,
          });
          updatedJudge = true;
        }
      }
    } catch (judgeErr) {
      console.error(`Fehler beim Aktualisieren des Judge-Panels für #${build.id}:`, judgeErr.message);
    }
  }

  return {
    build,
    user,
    updatedSubmission,
    updatedJudge,
  };
}

module.exports = {
  generateBuildingEmbeds,
  submissionComponents,
  judgePanelContent,
  refreshBuildingPanel,
};
