require("dotenv").config();
const crypto = require("crypto");
const { containerClient } = require("../utils/storage.js");
const { generateStatsPage, REFRESH_SECONDS } = require("../utils/statsPage.js");

// The page is public and contains logs, so by default it lives at a stable but
// unguessable path. Under "wichtig/" it also survives /clearimages.
function pagePath() {
  if (process.env.STATS_PAGE_PATH) return process.env.STATS_PAGE_PATH.replace(/^\/+/, "");
  const hash = crypto
    .createHash("sha256")
    .update(`stats-page:${process.env.BOT_TOKEN || ""}`)
    .digest("hex")
    .slice(0, 16);
  return `wichtig/stats-${hash}.html`;
}

let announced = false;

module.exports = {
  time: REFRESH_SECONDS * 1000,
  run: async (client, prisma) => {
    if (!containerClient) {
      if (!announced) {
        console.warn("Status-Seite deaktiviert: kein Azure-Speicher konfiguriert.");
        announced = true;
      }
      return;
    }

    const html = Buffer.from(await generateStatsPage(client, prisma), "utf-8");
    const path = pagePath();
    await containerClient.getBlockBlobClient(path).uploadData(html, {
      blobHTTPHeaders: {
        blobContentType: "text/html; charset=utf-8",
        // Always fetch the latest version, also through the Cloudflare CDN
        blobCacheControl: "no-cache, max-age=0",
      },
    });

    if (!announced) {
      console.log(
        new Date().toLocaleString(),
        `Status-Seite wird alle ${REFRESH_SECONDS / 60} Minuten hochgeladen: ${process.env.CDN_URL}/${process.env.CONTAINER_NAME}/${path}`
      );
      announced = true;
    }
  },
};
