/* Schéma de la base locale (IndexedDB via Dexie).
   Toutes les tables « métier » partagent : id (uuid), cat_id, created_at, updated_at, deleted_at (suppression douce).
   Pour ajouter une version : ajouter une entrée à VERSIONS (jamais modifier une version publiée) ; Dexie migre seul. */

/* Tables synchronisées plus tard avec le serveur (Phase 3), dans l'ordre d'export. */
export const TABLES = [
  "cats", "contacts", "allergies", "records", "reminders", "journal", "day_notes", "weights",
  "food_products", "meal_plan", "meals", "activities", "expenses", "photos", "chat"
];

export const VERSIONS = [
  {
    version: 1,
    stores: {
      cats: "id",
      contacts: "id, cat_id",
      allergies: "id, cat_id",
      records: "id, cat_id, type, date",
      reminders: "id, cat_id, date",
      // une seule saisie par (chat, jour, moment) ; une seule note par (chat, jour)
      journal: "id, &[cat_id+date+moment], date",
      day_notes: "id, &[cat_id+date], date",
      weights: "id, &[cat_id+date+moment], date",
      food_products: "id, cat_id",
      meal_plan: "id, cat_id",
      meals: "id, cat_id, date, plan_id",
      activities: "id, &[cat_id+date], date",
      expenses: "id, cat_id, date",
      photos: "id, cat_id, date",
      chat: "id, cat_id, created_at",
      outbox: "++seq, table, row_id",   // file d'envoi vers le serveur (Phase 3)
      meta: "key"                       // réglages techniques, journal des imports
    }
  }
];

/* Clés d'unicité « métier » : servent à mettre à jour la ligne existante au lieu d'en créer une seconde. */
export const NATURAL_KEYS = {
  journal: ["cat_id", "date", "moment"],
  day_notes: ["cat_id", "date"],
  weights: ["cat_id", "date", "moment"],
  activities: ["cat_id", "date"]
};
