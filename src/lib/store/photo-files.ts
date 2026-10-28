import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

export const LOCAL_PHOTO_DIR = path.join(process.cwd(), ".data", "photos");

/** Writes an uploaded photo to `.data/photos`, served by `/api/photos/[file]`. */
export async function savePhotoFile(file: File) {
  const id = randomUUID();
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const fileName = `${id}.${ext}`;
  await fs.mkdir(LOCAL_PHOTO_DIR, { recursive: true });
  await fs.writeFile(path.join(LOCAL_PHOTO_DIR, fileName), Buffer.from(await file.arrayBuffer()));
  return { id, fileName };
}

export async function removePhotoFile(fileName: string) {
  await fs.rm(path.join(LOCAL_PHOTO_DIR, path.basename(fileName)), { force: true });
}

export const photoUrl = (fileName: string) => `/api/photos/${fileName}`;
