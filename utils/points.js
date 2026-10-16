// A builder's points are the sum of their fully judged builds. Recalculating
// instead of adding/subtracting deltas keeps points correct after
// judging, corrections and deletions, even if one of those failed halfway.
async function recalculateUserPoints(prisma, builderId) {
  const builds = await prisma.build.findMany({
    where: { builder_id: BigInt(builderId) },
  });
  const points = builds
    .filter((b) => b.judges.length >= 2)
    .reduce((sum, b) => sum + (b.base_points || 0) + (b.A || 0) + (b.B || 0), 0);

  await prisma.user.updateMany({
    where: { id: BigInt(builderId) },
    data: { points },
  });
  return points;
}

function buildTotal(build) {
  return Number(((build.base_points || 0) + (build.A || 0) + (build.B || 0)).toFixed(2));
}

const MAX_AUFWAND = 6;
const MAX_DETAILS = 10;

// Slash command choices in 0.5 steps from 0 to max
function scoreChoices(max) {
  return Array.from({ length: max * 2 + 1 }, (_, i) => ({
    name: String(i / 2),
    value: i / 2,
  }));
}

function categoryName(basePoints) {
  return basePoints === 2 ? "Gebäude" : "Infrastruktur";
}

module.exports = {
  MAX_AUFWAND,
  MAX_DETAILS,
  recalculateUserPoints,
  buildTotal,
  scoreChoices,
  categoryName,
};
