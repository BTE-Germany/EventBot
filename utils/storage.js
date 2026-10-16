require("dotenv").config();
const crypto = require("crypto");

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

// Uploads a Discord attachment and returns its CDN URL,
// or null if storage isn't configured or the upload failed.
async function uploadAttachment(userId, attachment) {
  if (!containerClient) return null;
  try {
    const response = await fetch(attachment.url);
    if (!response.ok) throw new Error(`Download fehlgeschlagen (HTTP ${response.status})`);
    const buffer = await response.arrayBuffer();
    const filetype = (attachment.name?.match(/\.([^./?#]+)$/)?.[1] || "png").toLowerCase();
    const blobName = `${userId}/${crypto.randomUUID()}.${filetype}`;
    await containerClient.getBlockBlobClient(blobName).uploadData(buffer, {
      blobHTTPHeaders: { blobContentType: attachment.contentType || undefined },
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
