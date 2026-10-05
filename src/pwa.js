/* Service worker : l'appli reste disponible hors ligne et se met à jour proprement.
   Nouvelle version publiée → bandeau « Mettre à jour » (jamais de rechargement forcé en pleine saisie). */
import { registerSW } from "virtual:pwa-register";
import { ico } from "./utils/core.js";
import { toast } from "./ui/shell.js";

export function startPWA() {
  if (!("serviceWorker" in navigator)) return;
  const update = registerSW({
    onNeedRefresh() {
      const box = document.createElement("div");
      box.className = "toast"; box.style.pointerEvents = "auto";
      box.setAttribute("role", "status");
      box.innerHTML = `${ico("refresh")}<span>Nouvelle version disponible.</span><button class="btn sm primary" type="button">Mettre à jour</button>`;
      box.querySelector("button").addEventListener("click", () => { box.remove(); update(true); });
      document.getElementById("toasts").appendChild(box);
    },
    onOfflineReady() { toast("L'appli est prête à fonctionner hors ligne", "cloud"); },
    onRegisterError(e) { console.warn("Service worker non enregistré :", e); }
  });
}
