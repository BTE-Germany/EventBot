require("dotenv").config();
const { getRankedUsers } = require("./leaderboard.js");
const { buildTotal, categoryName } = require("./points.js");

const TIME_ZONE = "Europe/Berlin";
const DAY_MS = 24 * 60 * 60 * 1000;
const HISTORY_DAYS = 14;
const REFRESH_SECONDS = 300;
const ACTIVITY_LIMIT = 300;

// ---------- helpers ----------

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatTime(ms) {
  return new Date(ms).toLocaleString("de-DE", {
    timeZone: TIME_ZONE,
    dateStyle: "short",
    timeStyle: "medium",
  });
}

function formatShortTime(ms) {
  return new Date(ms).toLocaleString("de-DE", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).replace(", ", " ");
}

function formatPoints(delta) {
  const sign = delta > 0 ? "+" : "−";
  return `${sign}${formatNumber(Math.abs(delta))} Pkt`;
}

function formatDuration(ms) {
  const minutes = Math.floor(ms / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0) return `${days} T ${hours} Std`;
  if (hours > 0) return `${hours} Std ${minutes % 60} Min`;
  return `${minutes} Min`;
}

function formatNumber(n) {
  return Number(n).toLocaleString("de-DE", { maximumFractionDigits: 2 });
}

function berlinDateKey(ms) {
  // sv-SE formats as YYYY-MM-DD
  return new Date(ms).toLocaleDateString("sv-SE", { timeZone: TIME_ZONE });
}

function niceScale(max, maxTicks = 4) {
  if (max <= 0) return { top: 1, step: 1 };
  const rough = max / maxTicks;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough);
  const roundedStep = Math.max(1, step);
  return { top: Math.ceil(max / roundedStep) * roundedStep, step: roundedStep };
}

// Bar with a 4px rounded data end and a square baseline
function columnPath(x, y, w, h) {
  const r = Math.min(4, h, w / 2);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

function barPath(x, y, w, h) {
  const r = Math.min(4, w, h / 2);
  return `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`;
}

// ---------- charts (inline SVG, single series) ----------

function columnChart(items, { height = 200, unit = "" } = {}) {
  const width = 640;
  const pad = { top: 18, right: 8, bottom: 26, left: 34 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const max = Math.max(0, ...items.map((i) => i.value));
  const { top, step } = niceScale(max);
  const band = plotW / items.length;
  const barW = Math.min(24, band * 0.6);
  const yOf = (v) => pad.top + plotH - (v / top) * plotH;

  let grid = "";
  for (let v = 0; v <= top; v += step) {
    const y = yOf(v);
    grid += `<line class="grid" x1="${pad.left}" x2="${width - pad.right}" y1="${y}" y2="${y}"/>`;
    grid += `<text class="tick" x="${pad.left - 6}" y="${y + 4}" text-anchor="end">${formatNumber(v)}</text>`;
  }

  // Only the highest bar gets a direct label; the tooltip carries the rest
  const maxIndex = max > 0 ? items.findIndex((i) => i.value === max) : -1;
  let bars = "";
  items.forEach((item, i) => {
    const cx = pad.left + band * i + band / 2;
    const h = (item.value / top) * plotH;
    const y = pad.top + plotH - h;
    bars += `<g class="mark"><title>${esc(item.tooltip ?? `${item.label}: ${formatNumber(item.value)}${unit}`)}</title>`;
    bars += `<rect class="hit" x="${pad.left + band * i}" y="${pad.top}" width="${band}" height="${plotH}"/>`;
    if (h > 0) bars += `<path class="bar" d="${columnPath(cx - barW / 2, y, barW, h)}"/>`;
    if (i === maxIndex) {
      bars += `<text class="value" x="${cx}" y="${y - 5}" text-anchor="middle">${formatNumber(item.value)}</text>`;
    }
    bars += `<text class="tick" x="${cx}" y="${height - 8}" text-anchor="middle">${esc(item.label)}</text></g>`;
  });

  return `<svg class="chart" viewBox="0 0 ${width} ${height}" role="img" preserveAspectRatio="xMidYMid meet">${grid}<line class="axis" x1="${pad.left}" x2="${width - pad.right}" y1="${pad.top + plotH}" y2="${pad.top + plotH}"/>${bars}</svg>`;
}

function barChart(items) {
  const width = 640;
  const rowH = 30;
  const labelW = 120;
  const valueW = 48;
  const barH = 16;
  const height = Math.max(1, items.length) * rowH + 4;
  const max = Math.max(1, ...items.map((i) => i.value));
  const plotW = width - labelW - valueW;

  const rows = items
    .map((item, i) => {
      const y = i * rowH + 4;
      const w = (item.value / max) * plotW;
      return (
        `<g class="mark"><title>${esc(`${item.label}: ${formatNumber(item.value)}`)}</title>` +
        `<rect class="hit" x="0" y="${y}" width="${width}" height="${rowH}"/>` +
        `<text class="label" x="0" y="${y + barH - 2}">${esc(item.label)}</text>` +
        (w > 0 ? `<path class="bar" d="${barPath(labelW, y, w, barH)}"/>` : "") +
        `<text class="value" x="${labelW + w + 6}" y="${y + barH - 3}">${formatNumber(item.value)}</text></g>`
      );
    })
    .join("");

  return `<svg class="chart" viewBox="0 0 ${width} ${height}" role="img" preserveAspectRatio="xMinYMid meet"><line class="axis" x1="${labelW}" x2="${labelW}" y1="0" y2="${height}"/>${rows}</svg>`;
}

function dataTable(headers, rows) {
  return `<table><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
}

// ---------- data ----------

async function collectStats(client, prisma) {
  const [users, builds, rankedUsers, activities] = await Promise.all([
    prisma.user.findMany(),
    prisma.build.findMany({ orderBy: { id: "desc" } }),
    getRankedUsers(prisma),
    prisma.activity.findMany({ orderBy: { id: "desc" }, take: ACTIVITY_LIMIT }),
  ]);
  const usersById = new Map(users.map((u) => [u.id.toString(), u]));
  const now = Date.now();

  const completed = builds.filter((b) => b.judges.length >= 2);
  const inReview = builds.filter((b) => b.judges.length === 1);
  const open = builds.filter((b) => b.judges.length === 0);
  const waiting = [...open, ...inReview].sort((a, b) => a.created_timestamp - b.created_timestamp);

  const todayKey = berlinDateKey(now);
  const days = [];
  for (let i = HISTORY_DAYS - 1; i >= 0; i--) {
    const d = new Date(Date.parse(`${todayKey}T12:00:00Z`) - i * DAY_MS);
    days.push(d.toISOString().slice(0, 10));
  }
  const perDay = new Map(days.map((d) => [d, 0]));
  for (const b of builds) {
    const key = berlinDateKey(b.created_timestamp.getTime());
    if (perDay.has(key)) perDay.set(key, perDay.get(key) + 1);
  }

  // Score bins of 2 points: 0–2, 2–4, …, 16–18
  const bins = Array.from({ length: 9 }, (_, i) => ({ from: i * 2, to: i * 2 + 2, value: 0 }));
  for (const b of completed) {
    const index = Math.min(8, Math.floor(buildTotal(b) / 2));
    bins[index].value++;
  }

  const referenceTypes = new Map();
  for (const b of builds) {
    const type = b.reference_type || "Keine Angabe";
    referenceTypes.set(type, (referenceTypes.get(type) || 0) + 1);
  }

  const judges = new Map();
  const judgeRow = (name) => {
    if (!judges.has(name)) judges.set(name, { judged: 0, corrected: 0 });
    return judges.get(name);
  };
  for (const b of builds) {
    const details = Array.isArray(b.judge_details) ? b.judge_details : [];
    const named = details.filter((d) => !d.action && d.judge_name);
    for (const d of named) judgeRow(d.judge_name).judged++;
    // Builds judged before names were recorded
    const unnamed = b.judges.length - named.length;
    if (unnamed > 0) judgeRow("Unbekannt (ältere Builds)").judged += unnamed;
    for (const d of details.filter((d) => d.action === "CORRECTION")) {
      judgeRow(d.corrector_name || "Unbekannt").corrected++;
    }
  }

  const lastDay = activities.filter((a) => now - a.created_at.getTime() < DAY_MS);
  const pointsLastDay = lastDay.reduce((sum, a) => sum + (a.points || 0), 0);

  return {
    now,
    users,
    usersById,
    builds,
    rankedUsers,
    completed,
    inReview,
    open,
    oldestWaiting: waiting[0] || null,
    perDay: days.map((d) => ({ key: d, value: perDay.get(d) })),
    bins,
    referenceTypes: [...referenceTypes.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value),
    judges: [...judges.entries()].sort((a, b) => b[1].judged - a[1].judged),
    activities,
    activitiesLastDay: lastDay.length,
    pointsLastDay,
    bot: {
      ready: client.isReady(),
      tag: client.user?.tag || "–",
      ping: client.ws.ping,
      uptime: process.uptime() * 1000,
      memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      node: process.version,
      guilds: client.guilds.cache.size,
    },
  };
}

// ---------- page ----------

function statusLabel(build) {
  if (build.judges.length >= 2) return `<span class="badge done">✓ Abgeschlossen</span>`;
  if (build.judges.length === 1) return `<span class="badge review">◐ In Bewertung (1/2)</span>`;
  return `<span class="badge open">○ Offen (0/2)</span>`;
}

// group drives the feed filters
const ACTIVITY_TYPES = {
  REGISTERED: { label: "Registrierung", group: "users" },
  BUILD_CREATED: { label: "Einreichung", group: "builds" },
  JUDGED: { label: "Bewertung", group: "judging" },
  CORRECTED: { label: "Korrektur", group: "judging" },
  DELETED: { label: "Löschung", group: "builds" },
  DATABASE_CLEARED: { label: "Datenbank geleert", group: "builds" },
};

function activityText(a, builder) {
  const who = `<b>${esc(a.actor || "Unbekannt")}</b>`;
  const build = a.build_id ? `Build #${a.build_id}` : "Build";
  const of = builder ? ` von <b>${esc(builder)}</b>` : "";
  switch (a.type) {
    case "REGISTERED":
      return `${who} hat sich registriert`;
    case "BUILD_CREATED":
      return `${who} hat ${build} eingereicht`;
    case "JUDGED":
      return `${build}${of} wurde von ${who} bewertet`;
    case "CORRECTED":
      return `${build}${of} wurde von ${who} korrigiert`;
    case "DELETED":
      return `${build}${of} wurde von ${who} gelöscht`;
    case "DATABASE_CLEARED":
      return `${who} hat die Datenbank geleert`;
    default:
      return esc(a.type);
  }
}

function renderStatsPage(s) {
  const eventName = process.env.EVENT_NAME || "EventBot";
  const totalPoints = s.rankedUsers.reduce((sum, u) => sum + u.points, 0);
  const avgScore = s.completed.length
    ? s.completed.reduce((sum, b) => sum + buildTotal(b), 0) / s.completed.length
    : 0;
  const buildings = s.completed.filter((b) => b.base_points === 2).length;
  const registered = s.users.filter((u) => !u.banned).length;
  const banned = s.users.length - registered;
  const builderName = (b) => esc(s.usersById.get(b.builder_id.toString())?.minecraft_id || "Unbekannt");

  const tiles = [
    ["Registrierte Builder", formatNumber(registered), banned ? `${banned} gesperrt` : ""],
    ["Builds eingereicht", formatNumber(s.builds.length), `${formatNumber(s.completed.length)} abgeschlossen`],
    ["Warten auf Judges", formatNumber(s.open.length + s.inReview.length), `${s.open.length} offen · ${s.inReview.length} bei 1/2`],
    [
      "Längste Wartezeit",
      s.oldestWaiting ? formatDuration(s.now - s.oldestWaiting.created_timestamp.getTime()) : "–",
      s.oldestWaiting ? `Build #${s.oldestWaiting.id}` : "Alles bewertet",
    ],
    ["Punkte gesamt", formatNumber(totalPoints), `Ø ${formatNumber(avgScore.toFixed(1))} / 18 pro Build`],
    ["Kategorien", `${buildings} / ${s.completed.length - buildings}`, "Gebäude / Infrastruktur"],
  ];

  const perDayItems = s.perDay.map((d) => {
    const [y, m, day] = d.key.split("-");
    return { label: `${day}.${m}.`, value: d.value, tooltip: `${day}.${m}.${y}: ${d.value} Builds` };
  });

  const leaderboardRows = s.rankedUsers
    .slice(0, 10)
    .map((u, i) => [`${i + 1}.`, esc(u.minecraft_id), `<span class="num">${formatNumber(u.points)}</span>`]);

  const recentRows = s.builds
    .slice(0, 10)
    .map((b) => [
      `#${b.id}`,
      builderName(b),
      statusLabel(b),
      b.judges.length >= 2 ? `<span class="num">${formatNumber(buildTotal(b))}</span>` : "–",
      b.judges.length >= 1 ? esc(categoryName(b.base_points)) : "–",
      `<span class="nowrap">${esc(formatShortTime(b.created_timestamp.getTime()))}</span>`,
    ]);

  const judgeRows = s.judges.map(([name, j]) => [
    esc(name),
    `<span class="num">${j.judged}</span>`,
    `<span class="num">${j.corrected}</span>`,
  ]);

  const activityItems = s.activities
    .map((a) => {
      const type = ACTIVITY_TYPES[a.type] || { label: a.type, group: "other" };
      const builder = a.user_id ? s.usersById.get(a.user_id.toString())?.minecraft_id : null;
      const hasPoints = a.points !== null && a.points !== 0;
      return (
        `<li class="act" data-group="${type.group}" data-points="${hasPoints ? 1 : 0}">` +
        `<time>${esc(formatShortTime(a.created_at.getTime()))}</time>` +
        `<span class="badge type-${type.group}">${esc(type.label)}</span>` +
        `<div class="act-text">${activityText(a, builder)}${a.details ? `<div class="act-details">${esc(a.details)}</div>` : ""}</div>` +
        `<span class="pts ${hasPoints ? (a.points > 0 ? "plus" : "minus") : ""}">${hasPoints ? formatPoints(a.points) : ""}</span>` +
        `</li>`
      );
    })
    .join("");

  const bot = s.bot;

  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="${REFRESH_SECONDS}">
<meta name="robots" content="noindex, nofollow">
<title>${esc(eventName)} – Status</title>
<style>
:root {
  color-scheme: light;
  --surface-0: #f4f3f0;
  --surface-1: #fcfcfb;
  --surface-2: #efeeea;
  --border: #e2e1dc;
  --text-primary: #0b0b0b;
  --text-secondary: #52514e;
  --text-muted: #6f6e69;
  --grid: #e7e6e1;
  --series-1: #2a78d6;
  --good-bg: #dcefdc; --good-ink: #1f5e1f;
  --warn-bg: #fbeccb; --warn-ink: #6b4a00;
  --bad-bg: #f9dcdc; --bad-ink: #8a1f1f;
  --info-bg: #dde8f7; --info-ink: #1c4a85;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
    --surface-0: #111110;
    --surface-1: #1a1a19;
    --surface-2: #242422;
    --border: #2f2f2d;
    --text-primary: #f0efec;
    --text-secondary: #c3c2b7;
    --text-muted: #9a998f;
    --grid: #2c2c2a;
    --series-1: #3987e5;
    --good-bg: #1d3a1f; --good-ink: #a8dca8;
    --warn-bg: #3d3115; --warn-ink: #f0cf85;
    --bad-bg: #452022; --bad-ink: #f3b0b0;
    --info-bg: #1c2d45; --info-ink: #a9c8f0;
  }
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--surface-0);
  color: var(--text-primary);
  font: 15px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
main { max-width: 1120px; margin: 0 auto; padding: 24px 16px 48px; }
header { display: flex; flex-wrap: wrap; gap: 8px 24px; align-items: baseline; justify-content: space-between; margin-bottom: 20px; }
h1 { font-size: 26px; margin: 0; letter-spacing: -0.01em; }
h2 { font-size: 16px; margin: 0 0 12px; }
.meta { color: var(--text-secondary); font-size: 13px; }
.grid-tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 16px; }
.card { background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; padding: 16px; min-width: 0; }
.tile .label { color: var(--text-secondary); font-size: 13px; }
.tile .value { font-size: 26px; font-weight: 600; margin: 2px 0; font-variant-numeric: proportional-nums; }
.tile .sub { color: var(--text-muted); font-size: 12px; }
.row { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr)); gap: 16px; margin-bottom: 16px; }
.subtitle { color: var(--text-muted); font-size: 13px; margin: -8px 0 12px; }
.chart { width: 100%; height: auto; display: block; overflow: visible; }
.chart .grid { stroke: var(--grid); stroke-width: 1; }
.chart .axis { stroke: var(--border); stroke-width: 1; }
.chart .bar { fill: var(--series-1); }
.chart .hit { fill: transparent; }
.chart .mark:hover .hit { fill: var(--surface-2); }
.chart .tick { fill: var(--text-muted); font-size: 11px; }
.chart .label { fill: var(--text-secondary); font-size: 13px; }
.chart .value { fill: var(--text-primary); font-size: 12px; font-weight: 600; }
details { margin-top: 8px; font-size: 13px; color: var(--text-secondary); }
summary { cursor: pointer; }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th { text-align: left; font-weight: 600; color: var(--text-secondary); font-size: 12px; padding: 6px 8px; border-bottom: 1px solid var(--border); }
td { padding: 7px 8px; border-bottom: 1px solid var(--grid); vertical-align: top; }
tr:last-child td { border-bottom: 0; }
.num { font-variant-numeric: tabular-nums; }
.table-wrap { overflow-x: auto; }
.badge { display: inline-block; font-size: 12px; font-weight: 600; border-radius: 999px; padding: 1px 8px; white-space: nowrap; }
.done { background: var(--info-bg); color: var(--info-ink); }
.review { background: var(--warn-bg); color: var(--warn-ink); }
.open { background: var(--surface-2); color: var(--text-secondary); }
.online { background: var(--good-bg); color: var(--good-ink); }
.offline { background: var(--bad-bg); color: var(--bad-ink); }
.bot-facts { display: flex; flex-wrap: wrap; gap: 6px 20px; font-size: 13px; color: var(--text-secondary); }
.bot-facts b { color: var(--text-primary); font-weight: 600; }
.stack { display: grid; gap: 16px; align-content: start; min-width: 0; }
.nowrap { white-space: nowrap; }
.feed-controls { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.feed-controls button, .feed-controls input {
  font: inherit; font-size: 13px; color: var(--text-primary); background: var(--surface-2);
  border: 1px solid var(--border); border-radius: 8px; padding: 5px 10px;
}
.feed-controls button { cursor: pointer; }
.feed-controls button[aria-pressed="true"] { background: var(--text-primary); color: var(--surface-1); border-color: var(--text-primary); }
.feed-controls input { flex: 1 1 220px; min-width: 0; }
.feed { list-style: none; margin: 0; padding: 0; max-height: 640px; overflow-y: auto; }
.act { display: grid; grid-template-columns: 92px 128px 1fr auto; gap: 4px 12px; align-items: baseline; padding: 8px 0; border-bottom: 1px solid var(--grid); }
.act[hidden] { display: none; }
.act time { color: var(--text-muted); font-size: 12px; font-variant-numeric: tabular-nums; white-space: nowrap; }
.act .badge { justify-self: start; }
.act-text { min-width: 0; font-size: 14px; }
.act-text b { font-weight: 600; }
.act-details { color: var(--text-muted); font-size: 12.5px; overflow-wrap: anywhere; }
.pts { font-weight: 600; font-size: 13px; font-variant-numeric: tabular-nums; white-space: nowrap; text-align: right; }
.pts.plus { color: var(--good-ink); }
.pts.minus { color: var(--bad-ink); }
.type-users { background: var(--surface-2); color: var(--text-secondary); }
.type-builds { background: var(--info-bg); color: var(--info-ink); }
.type-judging { background: var(--warn-bg); color: var(--warn-ink); }
.type-other { background: var(--surface-2); color: var(--text-secondary); }
.empty { color: var(--text-muted); font-size: 14px; }
@media (max-width: 640px) {
  .act { grid-template-columns: auto 1fr auto; }
  .act-text { grid-column: 1 / -1; }
}
</style>
</head>
<body>
<main>
<header>
  <div>
    <h1>${esc(eventName)}</h1>
    <div class="meta">Stand: ${esc(formatTime(s.now))} · aktualisiert sich alle ${REFRESH_SECONDS / 60} Minuten</div>
  </div>
  <span class="badge ${bot.ready ? "online" : "offline"}">${bot.ready ? "● Bot online" : "✕ Bot offline"}</span>
</header>

<section class="card" style="margin-bottom:16px">
  <div class="bot-facts">
    <span>Bot <b>${esc(bot.tag)}</b></span>
    <span>Laufzeit <b>${esc(formatDuration(bot.uptime))}</b></span>
    <span>Discord-Latenz <b>${bot.ping >= 0 ? `${bot.ping} ms` : "–"}</b></span>
    <span>Speicher <b>${bot.memoryMb} MB</b></span>
    <span>Node <b>${esc(bot.node)}</b></span>
    <span>Aktivitäten (24 h) <b>${s.activitiesLastDay}</b></span>
    <span>Punkte (24 h) <b>${s.pointsLastDay ? formatPoints(s.pointsLastDay) : "±0 Pkt"}</b></span>
  </div>
</section>

<section class="grid-tiles">
${tiles
  .map(
    ([label, value, sub]) =>
      `<div class="card tile"><div class="label">${esc(label)}</div><div class="value">${esc(value)}</div><div class="sub">${esc(sub)}</div></div>`
  )
  .join("\n")}
</section>

<section class="row">
  <div class="card">
    <h2>Einreichungen pro Tag</h2>
    <p class="subtitle">Letzte ${HISTORY_DAYS} Tage</p>
    ${columnChart(perDayItems)}
    <details><summary>Als Tabelle</summary>${dataTable(
      ["Tag", "Builds"],
      perDayItems.map((d) => [esc(d.tooltip.split(":")[0]), `<span class="num">${d.value}</span>`])
    )}</details>
  </div>
  <div class="card">
    <h2>Punkteverteilung</h2>
    <p class="subtitle">Abgeschlossene Builds nach Gesamtpunkten (von 18)</p>
    ${
      s.completed.length
        ? columnChart(
            s.bins.map((b) => ({
              label: `${b.from}–${b.to}`,
              value: b.value,
              tooltip: `${b.from}–${b.to} Punkte: ${b.value} Builds`,
            }))
          )
        : `<p class="empty">Noch keine abgeschlossenen Builds.</p>`
    }
  </div>
</section>

<section class="row">
  <div class="card">
    <h2>Top 10 Builder</h2>
    ${leaderboardRows.length ? `<div class="table-wrap">${dataTable(["Platz", "Builder", "Punkte"], leaderboardRows)}</div>` : `<p class="empty">Noch keine Punkte vergeben.</p>`}
  </div>
  <div class="stack">
    <div class="card">
      <h2>Judges</h2>
      ${judgeRows.length ? `<div class="table-wrap">${dataTable(["Judge", "Bewertet", "Korrigiert"], judgeRows)}</div>` : `<p class="empty">Noch keine Bewertungen.</p>`}
    </div>
    <div class="card">
      <h2>Genutzte Referenzen</h2>
      <p class="subtitle">Alle eingereichten Builds</p>
      ${s.referenceTypes.length ? barChart(s.referenceTypes) : `<p class="empty">Noch keine Builds.</p>`}
    </div>
  </div>
</section>

<section class="card" style="margin-bottom:16px">
  <h2>Neueste Builds</h2>
  ${recentRows.length ? `<div class="table-wrap">${dataTable(["Build", "Builder", "Status", "Punkte", "Kategorie", "Eingereicht"], recentRows)}</div>` : `<p class="empty">Noch keine Builds.</p>`}
</section>

<section class="card">
  <h2>Aktivität</h2>
  <p class="subtitle">Letzte ${s.activities.length} Ereignisse, neueste zuerst</p>
  <div class="feed-controls" hidden>
    <button type="button" data-filter="all" aria-pressed="true">Alle</button>
    <button type="button" data-filter="points" aria-pressed="false">Punkteänderungen</button>
    <button type="button" data-filter="builds" aria-pressed="false">Builds</button>
    <button type="button" data-filter="judging" aria-pressed="false">Bewertungen</button>
    <button type="button" data-filter="users" aria-pressed="false">Registrierungen</button>
    <input type="search" placeholder="Builder, Judge oder Build-Nr. suchen…" aria-label="Aktivität durchsuchen">
  </div>
  ${activityItems ? `<ul class="feed">${activityItems}</ul>` : `<p class="empty">Noch keine Aktivität.</p>`}
</section>
</main>
<script>
(function () {
  var controls = document.querySelector(".feed-controls");
  var feed = document.querySelector(".feed");
  if (!controls || !feed) return;
  controls.hidden = false;
  var filter = "all";
  var query = "";
  function apply() {
    feed.querySelectorAll(".act").forEach(function (li) {
      var matchesFilter =
        filter === "all" ||
        (filter === "points" ? li.dataset.points === "1" : li.dataset.group === filter);
      var matchesQuery = query === "" || li.textContent.toLowerCase().indexOf(query) !== -1;
      li.hidden = !(matchesFilter && matchesQuery);
    });
  }
  controls.addEventListener("click", function (e) {
    var button = e.target.closest("button");
    if (!button) return;
    filter = button.dataset.filter;
    controls.querySelectorAll("button").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b === button));
    });
    apply();
  });
  controls.querySelector("input").addEventListener("input", function (e) {
    query = e.target.value.toLowerCase().trim();
    apply();
  });
})();
</script>
</body>
</html>
`;
}

async function generateStatsPage(client, prisma) {
  return renderStatsPage(await collectStats(client, prisma));
}

module.exports = {
  REFRESH_SECONDS,
  generateStatsPage,
  renderStatsPage,
  collectStats,
};
