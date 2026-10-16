// Activity log for the status page. Writing it must never break the action itself.
const TYPES = {
  REGISTERED: "REGISTERED",
  BUILD_CREATED: "BUILD_CREATED",
  JUDGED: "JUDGED",
  CORRECTED: "CORRECTED",
  DELETED: "DELETED",
  DATABASE_CLEARED: "DATABASE_CLEARED",
};

async function logActivity(prisma, { type, buildId = null, userId = null, actor = null, points = null, details = null }) {
  try {
    await prisma.activity.create({
      data: {
        type,
        build_id: buildId,
        user_id: userId !== null ? BigInt(userId) : null,
        actor,
        points,
        details,
      },
    });
  } catch (err) {
    console.error("Aktivität konnte nicht gespeichert werden:", err.message);
  }
}

module.exports = {
  TYPES,
  logActivity,
};
