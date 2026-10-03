require("dotenv").config();

async function generateStatsData(prisma) {
  let users = await prisma.user.findMany();
  users = users.sort((a, b) => b.points - a.points);

  const builds = await prisma.build.findMany();
  const completedBuilds = builds.filter((b) => b.judges.length >= 2);
  const inProgressBuilds = builds.filter((b) => b.judges.length === 1);
  const openBuilds = builds.filter((b) => b.judges.length === 0);

  const buildings = completedBuilds.filter((b) => b.base_points === 2).length;
  const infrastructures = completedBuilds.filter((b) => b.base_points === 1).length;

  let totalPoints = 0;
  users.forEach((u) => {
    totalPoints += u.points;
  });

  const totalBuildPoints = completedBuilds.reduce(
    (sum, b) => sum + (b.base_points || 0) + (b.A || 0) + (b.B || 0),
    0
  );
  const avgPoints =
    completedBuilds.length > 0
      ? (totalBuildPoints / completedBuilds.length).toFixed(1)
      : "0.0";

  const topUsers = users.filter((u) => u.points > 0).slice(0, 5);

  const chartConfig = {
    type: "bar",
    data: {
      labels:
        topUsers.length > 0
          ? topUsers.map((u) => u.minecraft_id.slice(0, 15))
          : ["Keine Daten"],
      datasets: [
        {
          label: "Punkte",
          data:
            topUsers.length > 0
              ? topUsers.map((u) => u.points)
              : [0],
          backgroundColor: [
            "rgba(255, 215, 0, 0.85)",   // Gold #1
            "rgba(192, 192, 192, 0.85)", // Silber #2
            "rgba(205, 127, 50, 0.85)",  // Bronze #3
            "rgba(88, 101, 242, 0.85)",  // Blurple #4
            "rgba(88, 101, 242, 0.85)",  // Blurple #5
          ],
          borderColor: [
            "#FFD700",
            "#C0C0C0",
            "#CD7F32",
            "#5865F2",
            "#5865F2",
          ],
          borderWidth: 1.5,
          borderRadius: 4,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: "🏆 Top Builder - Rangliste",
          font: { size: 16, weight: "bold" },
          color: "#ffffff",
        },
        legend: { display: false },
      },
      scales: {
        x: {
          ticks: { color: "#ffffff", font: { size: 12 } },
          grid: { color: "rgba(255, 255, 255, 0.1)" },
        },
        y: {
          ticks: { color: "#ffffff", font: { size: 12, weight: "bold" } },
          grid: { display: false },
        },
      },
    },
  };

  const chartUrl = `https://quickchart.io/chart?bkg=%232b2d31&w=650&h=300&c=${encodeURIComponent(
    JSON.stringify(chartConfig)
  )}`;

  const embed = {
    title: "📊 Event-Statistiken & Fortschritt",
    description: `Aktuelle Echtzeit-Statistiken zum Bauevent.\nInsgesamt **${users.length}** registrierte Builder und **${builds.length}** eingereichte Builds.`,
    color: 5793266, // 0x5865F2
    fields: [
      {
        name: "🏗️ Status der Einreichungen",
        value: `✅ Abgeschlossen: **${completedBuilds.length}**\n⏳ In Bewertung (1/2): **${inProgressBuilds.length}**\n🆕 Offen (0/2): **${openBuilds.length}**\n📦 Gesamt: **${builds.length}**`,
        inline: true,
      },
      {
        name: "🏷️ Kategorien",
        value: `🏢 Gebäude: **${buildings}**\n🛣️ Infrastruktur: **${infrastructures}**\n📐 Max. Punkte: **18 Pkt**`,
        inline: true,
      },
      {
        name: "📈 Punkte & Performance",
        value: `⭐ Gesamtpunkte: **${totalPoints}**\n📊 Ø pro Build: **${avgPoints}** / 18 Pkt`,
        inline: true,
      },
    ],
    image: {
      url: chartUrl,
    },
    footer: {
      text: `Zuletzt aktualisiert: ${new Date().toLocaleString("de-DE")} • BTE Germany`,
    },
    thumbnail: {
      url: process.env.EVENT_IMG || undefined,
    },
  };

  return { embed, chartUrl, stats: { totalUsers: users.length, totalBuilds: builds.length } };
}

module.exports = {
  time: 300000, // alle 5 Minuten
  generateStatsData,
  run: async (client, prisma) => {
    if (!process.env.STATS_CHANNEL || !process.env.STATS_MESSAGE) {
      return;
    }

    try {
      console.log(new Date().toLocaleString(), "Stats-Panel wird aktualisiert...");
      const { embed } = await generateStatsData(prisma);

      const channel = await client.channels.fetch(process.env.STATS_CHANNEL);
      if (!channel) return;
      const message = await channel.messages.fetch(process.env.STATS_MESSAGE);
      if (!message) return;

      await message.edit({
        content: null,
        embeds: [embed],
      });
      console.log(new Date().toLocaleString(), "Stats-Panel erfolgreich aktualisiert.");
    } catch (err) {
      console.error("Fehler beim Aktualisieren des Stats-Panels:", err);
    }
  },
};
