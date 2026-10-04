/* Préférences locales (thème, animations) dans localStorage, sans jamais planter. */

export const store = {
  get(k, def) { try { const v = localStorage.getItem("doudou." + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
  set(k, v) { try { localStorage.setItem("doudou." + k, JSON.stringify(v)); } catch (e) { /* stockage indisponible : on continue en mémoire */ } }
};
