/* Écran de connexion : e-mail + mot de passe (enregistrable par le gestionnaire de mots de passe de Chrome).
   Parcours : se connecter · créer le compte (une fois) · vérifier ses e-mails · mot de passe oublié · nouveau mot de passe. */
import { SCREENS } from "./registry.js";
import { S } from "../state.js";
import { catSVG } from "../ui/illustrations.js";
import { ico, esc } from "../utils/core.js";
import { toast, render } from "../ui/shell.js";
import { FORMS, form, input, submit, formError } from "../ui/forms.js";
import { signIn, signUp, sendReset, setNewPassword } from "../sync/supabase.js";
import { afterLogin } from "../sync/controller.js";

const MIN = 10;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* Messages d'erreur de Supabase traduits en français clair. */
export function frError(e) {
  const m = String(e?.message || e);
  if (/invalid login credentials/i.test(m)) return "E-mail ou mot de passe incorrect.";
  if (/email not confirmed/i.test(m)) return "Adresse pas encore confirmée : clique le lien reçu par e-mail, puis reconnecte-toi.";
  if (/already registered|already been registered|user already exists/i.test(m)) return "Un compte existe déjà avec cette adresse : connecte-toi.";
  if (/signups? not allowed|signup.*disabled/i.test(m)) return "La création de compte est fermée sur cette appli.";
  if (/password.*(short|least|characters)|weak/i.test(m)) return `Mot de passe trop court : au moins ${MIN} caractères.`;
  if (/rate|seconds|too many|security purposes/i.test(m)) return "Trop de demandes rapprochées : attends une minute.";
  if (/fetch|network/i.test(m)) return "Pas de réseau : la connexion demande internet (ensuite, l'appli marche aussi hors ligne).";
  return "La connexion a échoué : " + m;
}
const go = step => { S.loginStep = step; render(false); setTimeout(() => document.querySelector("#view input")?.focus(), 80); };
const link = (step, label, icon = "chev-r") => `<button type="button" class="link-btn" data-act="loginStep" data-v="${step}">${ico(icon)}${label}</button>`;
const email = () => input("email", "Adresse e-mail", { type: "email", value: S.loginEmail || "", placeholder: "prenom@exemple.com", inputmode: "email", autocomplete: "username" });

SCREENS.login = () => {
  const step = S.auth === "recovery" ? "newpass" : S.loginStep || "signin";
  const bodies = {
    signin: form("signin", `${email()}${input("password", "Mot de passe", { type: "password", autocomplete: "current-password" })}
      ${submit("Se connecter", "check")}<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">${link("signup", "Créer le compte", "plus")}${link("forgot", "Mot de passe oublié ?", "question")}</div>`),
    signup: form("signup", `<p class="small muted">Une seule fois, pour tous tes appareils. Choisis un mot de passe d'au moins ${MIN} caractères ; Chrome peut l'enregistrer.</p>
      ${email()}${input("password", "Mot de passe", { type: "password", autocomplete: "new-password" })}${input("password2", "Le même mot de passe, une seconde fois", { type: "password", autocomplete: "new-password" })}
      ${submit("Créer le compte", "plus")}${link("signin", "J'ai déjà un compte", "chev-l")}`),
    check: `<p><b>Vérifie tes e-mails</b> (${esc(S.loginEmail || "")}) : clique le lien « Confirm your mail » envoyé par Supabase. Il te ramène ici, connecté.</p>
      <p class="small muted">Rien reçu après 2 minutes ? Regarde dans les indésirables. Le lien ne sert qu'une fois.</p>${link("signin", "Revenir à la connexion", "chev-l")}`,
    forgot: form("forgot", `<p class="small muted">Tu recevras un lien pour choisir un nouveau mot de passe.</p>${email()}${submit("Recevoir le lien", "send")}${link("signin", "Revenir à la connexion", "chev-l")}`),
    sent: `<p>Lien envoyé à <b>${esc(S.loginEmail || "")}</b>. Ouvre-le sur cet appareil pour choisir un nouveau mot de passe.</p>${link("signin", "Revenir à la connexion", "chev-l")}`,
    newpass: form("newpass", `<p>Choisis ton nouveau mot de passe (au moins ${MIN} caractères).</p>${input("password", "Nouveau mot de passe", { type: "password", autocomplete: "new-password" })}${input("password2", "Une seconde fois", { type: "password", autocomplete: "new-password" })}${submit("Enregistrer", "check")}`)
  };
  const title = { signin: "Connexion", signup: "Créer le compte", check: "Presque fini", forgot: "Mot de passe oublié", sent: "Lien envoyé", newpass: "Nouveau mot de passe" }[step];
  return {
    main: `<section class="hero"><div class="hero-top"><div class="hero-cat">${catSVG("curieux")}</div><div class="hero-txt"><p class="hero-date">Doudou Healthcare</p><h2>${title}</h2></div></div>
      <p class="hero-sum">Connecte-toi une fois sur chaque appareil : ton PC et ton téléphone partageront le même suivi, même hors ligne.</p></section>
      <section class="card">${bodies[step]}</section>`,
    aside: `<div class="explain"><h4>${ico("shield", "sm")}Tes données</h4><p class="small">Elles sont rangées sur un serveur en Europe (Francfort), visibles par toi seul. Sur chaque appareil, une copie reste disponible hors ligne.</p></div>`,
    asideTitle: "Connexion"
  };
};

const checkEmail = (f, v) => { const e = (v.email || "").trim().toLowerCase(); if (!EMAIL.test(e)) { formError(f, "Indique une adresse e-mail valide.", "email"); return null; } S.loginEmail = e; return e; };
const checkPass = (f, v) => {
  if ((v.password || "").length < MIN) { formError(f, `Le mot de passe doit faire au moins ${MIN} caractères.`, "password"); return false; }
  if (v.password !== v.password2) { formError(f, "Les deux mots de passe ne sont pas identiques.", "password2"); return false; }
  return true;
};

FORMS.signin = async (f, v) => {
  const e = checkEmail(f, v); if (!e) return;
  if (!v.password) return formError(f, "Indique ton mot de passe.", "password");
  let user; try { user = await signIn(e, v.password); } catch (err) { return formError(f, frError(err), "password"); }
  toast("Connecté", "check"); await afterLogin(user);
};
FORMS.signup = async (f, v) => {
  const e = checkEmail(f, v); if (!e || !checkPass(f, v)) return;
  let res; try { res = await signUp(e, v.password); } catch (err) { return formError(f, frError(err), "email"); }
  if (res.session?.user) { toast("Compte créé", "check"); await afterLogin(res.session.user); }   // si la confirmation par e-mail est désactivée
  else go("check");
};
FORMS.forgot = async (f, v) => {
  const e = checkEmail(f, v); if (!e) return;
  try { await sendReset(e); } catch (err) { return formError(f, frError(err), "email"); }
  go("sent");
};
FORMS.newpass = async (f, v) => {
  if (!checkPass(f, v)) return;
  let user; try { user = await setNewPassword(v.password); } catch (err) { return formError(f, frError(err), "password"); }
  S.auth = "signed-out"; S.loginStep = "signin"; toast("Mot de passe changé", "check"); await afterLogin(user);
};
export const loginGo = go;
