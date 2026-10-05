/* Écran de connexion : e-mail → code à 6 chiffres reçu par e-mail. Pas de mot de passe, pas de lien à ouvrir
   (un lien ouvrirait le navigateur au lieu de l'appli installée sur Android). */
import { SCREENS } from "./registry.js";
import { S } from "../state.js";
import { catSVG } from "../ui/illustrations.js";
import { ico, esc } from "../utils/core.js";
import { toast, render } from "../ui/shell.js";
import { FORMS, form, input, submit, formError } from "../ui/forms.js";
import { sendCode, verifyCode } from "../sync/supabase.js";
import { afterLogin } from "../sync/controller.js";

/* Messages d'erreur de Supabase traduits en français clair. */
function frError(e) {
  const m = String(e?.message || e);
  if (/rate|seconds|too many|security purposes/i.test(m)) return "Trop de demandes rapprochées : attends une minute avant de redemander un code.";
  if (/expired|invalid|token/i.test(m)) return "Ce code est faux ou a expiré. Vérifie les 6 chiffres, ou demande un nouveau code.";
  if (/signups not allowed|not allowed|disabled/i.test(m)) return "Cette adresse n'est pas autorisée sur cette appli.";
  if (/fetch|network/i.test(m)) return "Pas de réseau : la connexion demande internet (ensuite, l'appli marche aussi hors ligne).";
  return "La connexion a échoué : " + m;
}

SCREENS.login = () => {
  const step = S.loginStep || "email";
  const body = step === "email"
    ? form("login", `${input("email", "Ton adresse e-mail", { type: "email", value: S.loginEmail || "", placeholder: "prenom@exemple.com", inputmode: "email" })}
        <p class="small muted">Tu recevras un code à 6 chiffres. Pas de mot de passe à retenir.</p>${submit("Recevoir le code", "send")}`)
    : form("code", `<p>Code envoyé à <b>${esc(S.loginEmail)}</b>. Il est valable une heure.</p>
        ${input("code", "Code à 6 chiffres", { inputmode: "numeric", data: true, placeholder: "123456" })}
        ${submit("Se connecter", "check")}
        <button type="button" class="link-btn" data-act="loginBack">${ico("chev-l")}Changer d'adresse ou renvoyer un code</button>`);
  return {
    main: `<section class="hero"><div class="hero-top"><div class="hero-cat">${catSVG("curieux")}</div><div class="hero-txt"><p class="hero-date">Doudou Healthcare</p><h2>Connexion</h2></div></div>
      <p class="hero-sum">Connecte-toi une fois sur chaque appareil : ton PC et ton téléphone partageront le même suivi, même hors ligne.</p></section>
      <section class="card">${body}</section>`,
    aside: `<div class="explain"><h4>${ico("shield", "sm")}Tes données</h4><p class="small">Elles sont rangées sur un serveur en Europe (Francfort), visibles par toi seul. Sur chaque appareil, une copie reste disponible hors ligne.</p></div>`,
    asideTitle: "Connexion"
  };
};

FORMS.login = async (f, v) => {
  const email = (v.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return formError(f, "Indique une adresse e-mail valide.", "email");
  try { await sendCode(email); } catch (e) { return formError(f, frError(e), "email"); }
  S.loginEmail = email; S.loginStep = "code"; render(false);
  setTimeout(() => document.querySelector('[name="code"]')?.focus(), 80);
  toast("Code envoyé : regarde tes e-mails", "send");
};
FORMS.code = async (f, v) => {
  const code = (v.code || "").replace(/\D/g, "");
  if (code.length !== 6) return formError(f, "Le code contient 6 chiffres.", "code");
  let user;
  try { user = await verifyCode(S.loginEmail, code); } catch (e) { return formError(f, frError(e), "code"); }
  S.loginStep = "email";
  toast("Connecté", "check");
  await afterLogin(user);
};
