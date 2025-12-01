import fs from "fs";
import path from "path";

export const STORAGE = {
  base: null,
  in: null,
  out: null,
  meta: null,
};

export function initStorage(baseDir) {
  STORAGE.base = baseDir;
  STORAGE.in = path.join(baseDir, "in");
  STORAGE.out = path.join(baseDir, "out");
  STORAGE.meta = path.join(baseDir, "meta");
  fs.mkdirSync(STORAGE.in, { recursive: true });
  fs.mkdirSync(STORAGE.out, { recursive: true });
  fs.mkdirSync(STORAGE.meta, { recursive: true });
}

export function deleteIfExists(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return true;
  } catch (e) {
    return false;
  }
}
