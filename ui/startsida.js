// Startsidan med de stora valen, och sidan Regelresonemang (husreglerna och regelbesluten).
import { S } from "../tillstand.js";
import { $, el } from "./dom.js";

// ------------------------------------------------------------ startsidan
// Varje val: id, rubrik, kort förklaring och vad knappen gör. Utan gor visas valet som "Kommer snart!".
export function startsida({ skapa, laddaNerTomt, regler }) {
  const igang = Boolean(S.rp.ras);
  const val = [
    { id: "start-skapa", namn: igang ? "Fortsätt skapa rollperson" : "Skapa rollperson",
      text: igang ? `Fortsätt med ${S.rp.namn.trim() || "rollpersonen"} där du slutade.` : "Välj böcker och bygg en ny rollperson steg för steg.", gor: skapa, primar: true },
    { id: "start-redigera", namn: "Redigera rollperson", text: "Ändra en befintlig rollperson friare än i stegen." },
    { id: "start-forbattra", namn: "Förbättra rollperson", text: "För in erfarenhet och låt rollpersonen växa efter spelmötena." },
    { id: "start-kampanj", namn: "Kampanj", text: "Spelledaren väljer böcker och husregler, bjuder in spelarna och ser deras rollformulär." },
    { id: "start-formular", namn: "Ladda ned rollformulär", text: "Ett tomt rollformulär som PDF, att skriva ut eller fylla i på datorn.", gor: laddaNerTomt },
    { id: "start-regler", namn: "Regelresonemang", text: "Husreglerna och hur oklara regler i böckerna har tolkats, och varför.", gor: regler },
  ];
  return el("div", { class: "startsida" },
    el("p", { class: "start-ingress" }, "Skapa rollpersoner till Chronopia (Drakar och Demoner) enligt reglerna i böckerna."),
    el("div", { class: "startval" }, val.map((v) => el("button", {
      type: "button", id: v.id, class: "startknapp" + (v.primar ? " primar" : "") + (v.gor ? "" : " kommer-snart"),
      disabled: !v.gor, onclick: v.gor ? (e) => v.gor(e) : null },
    el("span", { class: "startknapp-namn" }, v.namn, v.gor ? null : el("em", { class: "kommer" }, " (kommer snart!)")),
    el("span", { class: "startknapp-text" }, v.text)))));
}

// ------------------------------------------------------------ regelresonemang
let regelbeslut = null; // regler/regelbeslut.md laddas först när sidan öppnas

export function regelresonemang({ tillbaka, rita }) {
  if (regelbeslut === null) {
    regelbeslut = fetch("regler/regelbeslut.md").then((r) => (r.ok ? r.text() : Promise.reject(new Error()))).then(
      (t) => { regelbeslut = t; if (S.vy === "regler") rita(); },
      () => { regelbeslut = false; if (S.vy === "regler") rita(); });
  }
  const sidor = (s) => `s. ${s.join(", ")}`;
  return el("div", { class: "regelresonemang" },
    el("nav", { class: "rr-meny", "aria-label": "Innehåll" },
      el("button", { type: "button", class: "knapp", onclick: tillbaka }, "← Startsidan"),
      el("a", { href: "#husregler", onclick: hoppa }, "Husregler i grundreglerna"),
      el("a", { href: "#regelbeslut", onclick: hoppa }, "Regelbeslut")),
    el("p", { class: "hjalp" }, "Här står hur appen tolkar regler som är oklara, motsägelsefulla eller saknas i böckerna, så att du kan se varför ett värde blir som det blir. ",
      "Sidnumren gäller de tryckta böckerna."),
    el("section", { id: "husregler", class: "rr-del" },
      el("h2", {}, "Husregler i grundreglerna"),
      el("p", { class: "hjalp" }, "Tolkningar som gjordes när grundreglerna lades in. Sidnumren gäller grundboken."),
      el("ol", { class: "rr-husregler" }, S.R.husregler.map((h) => el("li", { id: `hr-${h.id}` },
        el("span", {}, h.beslut), el("small", { class: "rr-sidor" }, sidor(h.sida)))))),
    el("section", { id: "regelbeslut", class: "rr-del" },
      typeof regelbeslut === "string" ? el("div", { class: "rr-md", html: markdown(regelbeslut) })
        : regelbeslut === false ? el("p", { class: "fellista" }, "Regelbesluten kunde inte läsas in. Försök igen senare.")
          : el("p", {}, "Läser in regelbesluten …")));
}

function hoppa(e) {
  e.preventDefault();
  $(e.currentTarget.getAttribute("href"))?.scrollIntoView({ behavior: "smooth", block: "start" });
}

// En liten markdown-tolk för regelbeslut.md: rubriker, linjer, citat, (nästlade) punktlistor, stycken, fetstil, kursiv och kod.
const skydda = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const radvis = (t) => skydda(t)
  .replace(/`([^`]+)`/g, "<code>$1</code>")
  .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
  .replace(/(^|[^*\w])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
const ankare = (t) => t.toLowerCase().match(/^rb-\d+/)?.[0];

export function markdown(text) {
  const ut = [];
  const listor = []; // indrag för öppna listor
  let stycke = [];
  const avslutaStycke = () => { if (stycke.length) ut.push(`<p>${radvis(stycke.join(" "))}</p>`); stycke = []; };
  const stangListor = (till = -1) => { while (listor.length && listor.at(-1) > till) { ut.push("</li></ul>"); listor.pop(); } };
  for (const rad of text.split("\n")) {
    const punkt = rad.match(/^(\s*)[-*] (.*)$/);
    if (punkt) {
      avslutaStycke();
      const indrag = punkt[1].length;
      if (!listor.length || indrag > listor.at(-1)) { ut.push("<ul><li>"); listor.push(indrag); } else {
        stangListor(indrag);
        if (listor.length && listor.at(-1) === indrag) ut.push("</li><li>");
        else { ut.push("<ul><li>"); listor.push(indrag); }
      }
      ut.push(radvis(punkt[2]));
      continue;
    }
    if (!rad.trim()) { avslutaStycke(); stangListor(); continue; }
    const rubrik = rad.match(/^(#{1,4}) (.*)$/);
    if (rubrik) {
      avslutaStycke(); stangListor();
      const niva = Math.min(4, rubrik[1].length + 1); // # blir h2 på sidan
      const id = ankare(rubrik[2]);
      ut.push(`<h${niva}${id ? ` id="${id}"` : ""}>${radvis(rubrik[2])}</h${niva}>`);
      continue;
    }
    if (/^-{3,}$/.test(rad.trim())) { avslutaStycke(); stangListor(); ut.push("<hr>"); continue; }
    const citat = rad.match(/^> ?(.*)$/);
    if (citat) { avslutaStycke(); stangListor(); ut.push(`<blockquote>${radvis(citat[1])}</blockquote>`); continue; }
    if (listor.length) { ut.push(" " + radvis(rad.trim())); continue; } // fortsättning på en punkt
    stycke.push(rad.trim());
  }
  avslutaStycke();
  stangListor();
  return ut.join("");
}
