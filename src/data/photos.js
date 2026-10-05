/* Photos : réduction à l'import (1280 px max, WebP, JPEG en repli) et adresses d'affichage locales. */
import { get } from "./repo.js";
import { dataURLToBlob } from "./backup.js";

export const MAX_SIDE = 1280;

/* source : Blob/File ou data URL. Rend { blob, width, height }. Navigateur uniquement (canvas). */
export async function shrinkImage(source, max = MAX_SIDE, quality = 0.82) {
  // Conversion en mémoire (pas de fetch : la CSP n'autorise aucune connexion vers des adresses data:)
  const blob = typeof source === "string" ? dataURLToBlob(source) : source;
  const bmp = await createImageBitmap(blob);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const width = Math.round(bmp.width * k), height = Math.round(bmp.height * k);
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  canvas.getContext("2d").drawImage(bmp, 0, 0, width, height);
  bmp.close?.();
  const toBlob = type => new Promise(res => canvas.toBlob(res, type, quality));
  let out = await toBlob("image/webp");
  if (!out || out.type !== "image/webp") out = await toBlob("image/jpeg");
  if (!out) throw new Error("La photo n'a pas pu être réduite.");
  return { blob: out, width, height };
}

/* Adresse blob: d'une photo enregistrée (mise en cache tant que la photo ne change pas). */
const urls = new Map();
export function photoURL(id) {
  const p = id && get("photos", id);
  if (!p?.blob) return null;
  const hit = urls.get(id);
  if (hit && hit.at === p.updated_at) return hit.url;
  if (hit) URL.revokeObjectURL(hit.url);
  const url = URL.createObjectURL(p.blob);
  urls.set(id, { url, at: p.updated_at });
  return url;
}
