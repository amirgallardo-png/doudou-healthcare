/* Import d'un fichier choisi par l'utilisateur : reconnaît une sauvegarde de la nouvelle appli (restauration
   complète) ou une sauvegarde de l'ancienne V1 (fusion, sans doublon en cas de réimport). Le fichier n'est jamais modifié. */
import { mapLegacyBackup } from "./legacy-import.js";
import { isBackup, restoreBackup } from "./backup.js";
import { repo, commit, currentCat, uuid } from "./repo.js";

export function detectKind(json) {
  if (isBackup(json)) return "backup";
  if (json && json.data && (json.source === "doudou-healthcare" || json.data.profile)) return "legacy";
  return null;
}

export async function readJSONFile(file) {
  if (file.size > 60 * 1024 * 1024) throw new Error("Fichier trop gros (plus de 60 Mo).");
  try { return JSON.parse(await file.text()); }
  catch { throw new Error("Ce fichier n'est pas un JSON lisible."); }
}

/* Ancienne V1 → nouvelles données. shrink : fonction de réduction des photos (injectée pour les tests). */
export async function importLegacy(json, { shrink } = {}) {
  const byLegacy = (table, legacyId) => {
    if (!legacyId) return null;
    for (const r of repo.data[table].values()) if (r.legacy_id === String(legacyId)) return r.id;
    return null;
  };
  const existingCat = currentCat();
  const res = mapLegacyBackup(json, { idFor: (t, l) => (t === "cats" && existingCat ? existingCat.id : byLegacy(t, l)), uuid });
  const ops = [];
  for (const [table, list] of Object.entries(res.tables)) {
    for (let r of list) {
      // Profil déjà saisi à la main : l'import ne remplit que les champs vides.
      if (table === "cats" && existingCat) r = Object.fromEntries(Object.entries(r).filter(([k, v]) => k === "id" || existingCat[k] == null || existingCat[k] === ""));
      ops.push({ table, row: r });
    }
  }
  if (res.photo && shrink) {
    try {
      const { blob, width, height } = await shrink(res.photo.dataURL);
      const cat = res.tables.cats[0];
      const photoId = (existingCat?.photo_id && repo.data.photos.get(existingCat.photo_id)?.legacy_id === "profile-photo") ? existingCat.photo_id : uuid();
      ops.push({ table: "photos", row: { id: photoId, legacy_id: "profile-photo", cat_id: cat.id, date: res.photo.date, blob, width, height } });
      // Rattache la photo à la ligne du chat déjà présente dans ops (une seule écriture par ligne et par lot).
      if (!existingCat?.photo_id) ops.find(o => o.table === "cats").row.photo_id = photoId;
      res.report.push({ kind: "transformé", text: `Photo du profil réduite à ${width} × ${height} px (${Math.round(blob.size / 1024)} Ko).` });
    } catch (e) {
      res.report.push({ kind: "attention", text: "La photo du profil n'a pas pu être importée : " + e.message });
    }
  }
  await commit(ops);
  return res;
}

export async function importFile(file, opts) {
  const json = await readJSONFile(file);
  const kind = detectKind(json);
  if (kind === "backup") return { kind, counts: await restoreBackup(json) };
  if (kind === "legacy") return { kind, ...(await importLegacy(json, opts)) };
  throw new Error("Fichier non reconnu : choisis une sauvegarde Doudou Healthcare (.json).");
}
