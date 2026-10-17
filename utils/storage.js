require("dotenv").config();
const crypto = require("crypto");
const sharp = require("sharp");

let containerClient = null;
if (process.env.AZURE_STORAGE_CONNECTION_STRING && process.env.CONTAINER_NAME) {
  try {
    const { BlobServiceClient } = require("@azure/storage-blob");
    const blobServiceClient = BlobServiceClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING
    );
    containerClient = blobServiceClient.getContainerClient(
      process.env.CONTAINER_NAME
    );
  } catch (e) {
    console.error("Fehler beim Initialisieren von Azure Blob Storage:", e);
  }
}

function isImage(attachment) {
  if (attachment.contentType) return attachment.contentType.startsWith("image/");
  return /\.(png|jpe?g|gif|webp)$/i.test(attachment.name || "");
}

// Long edge in pixels; larger screenshots are scaled down
const MAX_IMAGE_SIZE = 2560;
const WEBP_QUALITY = 80;

// Re-encodes an image as compressed WebP, keeping GIF/WebP animations
async function toWebp(buffer) {
  return sharp(buffer, { animated: true })
    .rotate() // apply EXIF orientation before metadata is stripped
    .resize(MAX_IMAGE_SIZE, MAX_IMAGE_SIZE, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY, effort: 5 })
    .toBuffer();
}

// Uploads a Discord attachment and returns its CDN URL,
// or null if storage isn't configured or the upload failed.
async function uploadAttachment(userId, attachment) {
  if (!containerClient) return null;
  try {
    const response = await fetch(attachment.url);
    if (!response.ok) throw new Error(`Download fehlgeschlagen (HTTP ${response.status})`);
    let buffer = Buffer.from(await response.arrayBuffer());
    let filetype = (attachment.name?.match(/\.([^./?#]+)$/)?.[1] || "png").toLowerCase();
    let contentType = attachment.contentType || undefined;
    try {
      buffer = await toWebp(buffer);
      filetype = "webp";
      contentType = "image/webp";
    } catch (err) {
      // Unsupported or broken image: keep the original rather than losing the submission
      console.error("Fehler beim Konvertieren zu WebP, lade Original hoch:", err.message);
    }
    const blobName = `${userId}/${crypto.randomUUID()}.${filetype}`;
    await containerClient.getBlockBlobClient(blobName).uploadData(buffer, {
      blobHTTPHeaders: { blobContentType: contentType },
    });
    return `${process.env.CDN_URL}/${process.env.CONTAINER_NAME}/${blobName}`;
  } catch (err) {
    console.error("Fehler beim Hochladen eines Bildes:", err);
    return null;
  }
}

// Deletes an image previously returned by uploadAttachment; other URLs are ignored
async function deleteUploadedImage(url) {
  const prefix = `${process.env.CDN_URL}/${process.env.CONTAINER_NAME}/`;
  if (!containerClient || !url?.startsWith(prefix)) return;
  try {
    await containerClient.deleteBlob(url.slice(prefix.length), { deleteSnapshots: "include" });
  } catch (err) {
    console.error(`Fehler beim Löschen von ${url}:`, err.message);
  }
}

module.exports = {
  containerClient,
  isImage,
  uploadAttachment,
  deleteUploadedImage,
};
