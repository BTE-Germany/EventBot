const { Prisma } = require("@prisma/client");

const FILTERS = {
  all: Prisma.empty,
  unfinished: Prisma.sql`AND cardinality(judges) < 2`,
  judged: Prisma.sql`AND cardinality(judges) > 0`,
};

// Autocomplete for build ID options. Filters in SQL so it isn't limited to the latest N builds.
async function respondWithBuilds(interaction, prisma, { filter = "all", order = "DESC" } = {}) {
  const search = `%${interaction.options.getFocused() ?? ""}%`;
  const orderBy = order === "ASC" ? Prisma.sql`ORDER BY id ASC` : Prisma.sql`ORDER BY id DESC`;
  const builds = await prisma.$queryRaw`
    SELECT id, cardinality(judges)::int AS judge_count, location FROM "Build"
    WHERE id::text LIKE ${search} ${FILTERS[filter]}
    ${orderBy}
    LIMIT 25`;

  return interaction.respond(
    builds.map((b) => ({
      name: `#${b.id} (${b.judge_count}/2 Judges) - ${(b.location || "").slice(0, 45)}`,
      value: b.id,
    }))
  );
}

module.exports = { respondWithBuilds };
