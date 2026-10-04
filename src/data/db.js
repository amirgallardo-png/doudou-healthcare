/* Ouverture de la base locale. Une fonction (et non un singleton figé) pour que les tests ouvrent des bases isolées. */
import Dexie from "dexie";
import { VERSIONS } from "./schema.js";

export const DB_NAME = "doudou-healthcare";

export function openDB(name = DB_NAME) {
  const db = new Dexie(name);
  for (const v of VERSIONS) {
    const s = db.version(v.version).stores(v.stores);
    if (v.upgrade) s.upgrade(v.upgrade);
  }
  return db;
}
