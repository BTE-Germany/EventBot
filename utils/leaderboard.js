const PAGE_SIZE = 10;
const MEDALS = [":first_place:", ":second_place:", ":third_place:"];

// Users shown on leaderboards: not banned, at least one point, best first
async function getRankedUsers(prisma) {
  const users = await prisma.user.findMany({
    where: { banned: false, points: { gt: 0 } },
  });
  return users.sort((a, b) => b.points - a.points);
}

function formatRanking(users, page) {
  const start = page * PAGE_SIZE;
  return users
    .slice(start, start + PAGE_SIZE)
    .map((user, i) => {
      const rank = start + i;
      const prefix = MEDALS[rank] || `${rank + 1}.`;
      return `${prefix} \`${user.minecraft_id}\`  |  ${user.points} Punkte`;
    })
    .join("\n");
}

function pageButton(page) {
  return {
    type: 1,
    components: [
      {
        type: 2,
        style: 3,
        label: "Nächste Seite",
        custom_id: `leader-${page}`,
        emoji: { name: "➡" },
      },
    ],
  };
}

module.exports = {
  PAGE_SIZE,
  getRankedUsers,
  formatRanking,
  pageButton,
};
