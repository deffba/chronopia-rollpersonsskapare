// Magiförmågeslaget i en modal (s. 36).
import { yrkeAv, fardighetAv, paborjad } from "../regelmotor.js";
import { Tarning100 } from "../tarning100.js";
import { rita } from "../app.js";
import { stridskonstInfo } from "../steg/fardigheter.js";
import { valdBeskrivning } from "../steg/yrkesfardigheter.js";
import { S, rakna, raknaFor, spara, uppdatera, yrkeId, yrkesNycklar } from "../tillstand.js";
import { el, slaT } from "./dom.js";
import { fardighetsVal } from "./kontroller.js";

// Magiförmågeslaget (s. 106) behövs för magiskolor utanför magikeryrkena.
// Magiskolor visas inte om magiförmågeslaget redan har misslyckats
export function magiMojlig(f) {
  if (f.typ !== "magiskola" || yrkeAv(S.R, yrkeId()).magiker || S.rp.magiformaga?.slag == null) return true;
  return rakna().magiformaga.lyckat;
}

// Platser där rollpersonen har en magiskola som den inte får lära sig (yrkes-, extra- eller sekundär färdighet)
export function magiPlatser() {
  const arSkola = (k) => fardighetAv(S.R, k || "x")?.typ === "magiskola";
  return [
    ...(arSkola(S.rp.valfri) ? [{ typ: "valfri" }] : []),
    ...S.rp.extraYrkesfardigheter.flatMap((k, i) => (arSkola(k) ? [{ typ: "extra", i }] : [])),
    ...S.rp.sekundara.filter(arSkola).map((k) => ({ typ: "sekundar", nyckel: k })),
  ];
}

// Magiförmågeslaget görs bara i en egen modal. Den öppnas när slaget behövs och kan avgöras,
// tärningen snurrar i ungefär fyra sekunder och resultatet gäller sedan för hela rollpersonen.
export const MAGISLAG = "Magiförmågeslaget";
const MAGI_SNURR = 4000;
export let magiModal = null; // { fas: "in" | "redo" | "rullar" | "klar", vidare, tarning, el }
const reduceraRorelse = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
export const magiBehovs = (res) => res.magiformaga.behovs && S.rp.magiformaga?.slag == null && !yrkeAv(S.R, yrkeId()).magiker;
export const magiMisslyckat = (res) => res.magiformaga.behovs && S.rp.magiformaga?.slag != null && !res.magiformaga.lyckat && !yrkeAv(S.R, yrkeId()).magiker;

// I steg 4 slås magiförmågeslaget inte direkt (INT och PSY är inte bestämda än), så en vald magiskola får en upplysning
export function magiInfo(nyckel) {
  if (fardighetAv(S.R, (nyckel || "x").split(":")[0])?.typ !== "magiskola" || yrkeAv(S.R, yrkeId()).magiker || S.rp.magiformaga?.slag != null) return null;
  return el("div", { class: "varning magi-info", role: "note" },
    el("strong", {}, "Magiförmågeslag. "),
    "En magiskola kräver ett lyckat magiförmågeslag: 1T100 som måste bli högst (INT+PSY)/2 (s. 106). Slaget görs när du går vidare från steg 6, Grundegenskaper, när INT och PSY är bestämda. Misslyckas det får du välja en annan färdighet i stället.");
}

// Öppnar modalen. `vidare` är steget som visas när modalen stängs efter ett lyckat slag eller ett byte (null = stanna kvar).
export function oppnaMagiModal(vidare = null) {
  if (magiModal) return;
  const m = rakna().magiformaga;
  const redanSlaget = S.rp.magiformaga?.slag != null;
  const reducerad = reduceraRorelse();
  const canvas = el("canvas", { class: "magi-klot", "aria-hidden": "true" });
  const tarningsknapp = el("button", { type: "button", class: "magi-tarning", id: "magiformaga-sla", "aria-label": "Slå 1T100", disabled: true }, canvas);
  const ledtext = el("p", { class: "magi-ledtext" }, S.manuellaSlag ? "Skriv in slaget och tryck på tärningen" : "tryck på tärningen");
  const inmatning = S.manuellaSlag ? el("input", { type: "number", min: 1, max: 100, inputmode: "numeric", id: "magiformaga-varde", class: "magi-inmatning", "aria-label": "Slaget (1–100)", placeholder: "1–100" }) : null;
  const chans = el("p", { class: "magi-chans" }, `1T100${m.mod ? ` ${m.mod > 0 ? "+" : "−"} ${Math.abs(m.mod)}` : ""} måste bli högst ${m.chans}, (INT+PSY)/2 (s. 106).`);
  // Utvecklarläget: slå ett lyckat eller ett misslyckat slag
  const devKnappar = S.omslag ? el("div", { class: "magi-dev" },
    el("button", { type: "button", id: "magi-dev-lyckat", onclick: () => sla(1) }, "Utvecklare: lyckat"),
    el("button", { type: "button", id: "magi-dev-misslyckat", onclick: () => sla(100) }, "Utvecklare: misslyckat")) : null;
  const siffra = el("div", { class: "magi-siffra", "aria-hidden": "true" }, el("span", {}));
  const utfall = el("div", { class: "magi-utfall", "aria-live": "polite" });
  const eyebrow = el("p", { class: "magi-eyebrow", id: "magimodal-rubrik" }, "Magiförmågeslag");
  const scen = el("div", { class: "magi-scen" }, tarningsknapp, siffra);
  const under = el("div", { class: "magi-under" }, ledtext, inmatning, chans, devKnappar);
  const panel = el("div", { class: "magi-panel", role: "dialog", "aria-modal": "true", "aria-labelledby": "magimodal-rubrik" }, eyebrow, scen, under, utfall);
  const modal = el("div", { id: "magimodal", class: "magi-bakgrund" + (reducerad ? " reducerad" : "") }, panel);
  document.body.append(modal);
  document.body.classList.add("dialog-oppen");
  magiModal = { fas: "in", vidare, el: modal, tarning: null };
  const tarning = new Tarning100(canvas, { reducerad });
  magiModal.tarning = tarning;
  // Fångar fokus i modalen; den stängs bara med knappen efter slaget
  modal.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { e.preventDefault(); return; }
    if (e.key !== "Tab") return;
    const fokus = [...modal.querySelectorAll("button:not([disabled]), input:not([disabled]), select:not([disabled])")];
    if (!fokus.length) { e.preventDefault(); return; }
    const forsta = fokus[0]; const sista = fokus[fokus.length - 1];
    if (e.shiftKey && document.activeElement === forsta) { e.preventDefault(); sista.focus(); }
    else if (!e.shiftKey && document.activeElement === sista) { e.preventDefault(); forsta.focus(); }
  });

  // Efter ett misslyckat slag byts varje magiskola mot en annan färdighet i modalen
  const bytesPlatser = () => magiPlatser();
  const visaByte = (knapp) => {
    const platser = bytesPlatser();
    const val = platser.map(() => "");
    // Extra yrkesfärdigheter och sekundära färdigheter är frivilliga, så spelaren får avstå från att välja en ny.
    // Den valfria yrkesfärdigheten hör till yrket och måste ersättas.
    const avstar = platser.map(() => false);
    const kanAvsta = (p) => p.typ !== "valfri";
    const fran = knapp.getBoundingClientRect();
    magiModal.fas = "byte";
    const rubrik = el("h2", { class: "magi-byte-rubrik", id: "magimodal-byte-rubrik" }, "FÖRLIKAS MED ÖDET");
    const listor = el("div", { class: "magi-byte-val" });
    const fel = el("p", { class: "magi-byte-fel", role: "alert" });
    const gaVidare = el("button", { type: "button", class: "magi-knapp", id: "magimodal-ga-vidare", disabled: true, onclick: () => {
      const kandidat = structuredClone(S.rp);
      const bort = new Set();
      platser.forEach((p, i) => {
        if (p.typ === "valfri") kandidat.valfri = val[i];
        else if (p.typ === "extra") { if (avstar[i]) bort.add(p.i); else kandidat.extraYrkesfardigheter[p.i] = val[i]; }
        else {
          if (avstar[i]) kandidat.sekundara = kandidat.sekundara.filter((k) => k !== p.nyckel);
          else kandidat.sekundara[kandidat.sekundara.indexOf(p.nyckel)] = val[i];
          delete kandidat.fardigheter[p.nyckel];
        }
      });
      for (const i of platser.filter((p) => p.typ === "extra").map((p) => p.i)) if (bort.has(i)) delete kandidat.fardigheter[kandidat.extraYrkesfardigheter[i]];
      kandidat.extraYrkesfardigheter = kandidat.extraYrkesfardigheter.filter((_, i) => !bort.has(i));
      const problem = raknaFor(kandidat).fel;
      if (problem.length) { fel.textContent = `Det går inte: ${problem[0]}.`; return; }
      S.rp = kandidat;
      stangMagiModal(false);
    } }, "GÅ VIDARE");
    const ritaVal = () => {
      fel.textContent = "";
      // Färdigheter som rollpersonen redan har (eller väljer i en annan lista här) visas inte; delval spärras som i stegen
      const harRedan = new Set([...yrkesNycklar(), ...S.rp.extraYrkesfardigheter, ...S.rp.sekundara, ...val].filter(Boolean));
      listor.replaceChildren(...platser.map((p, i) => el("div", { class: "magi-byte-plats" + (avstar[i] ? " avstar" : "") },
        el("label", { for: `magibyte-${i}-f` }, { valfri: "Ny valfri yrkesfärdighet", extra: "Ny extra yrkesfärdighet", sekundar: "Ny sekundär färdighet" }[p.typ]),
        kanAvsta(p) ? el("label", { class: "magi-byte-avsta" },
          el("input", { type: "checkbox", id: `magibyte-${i}-avsta`, checked: avstar[i], onchange: (e) => { avstar[i] = e.target.checked; if (avstar[i]) val[i] = ""; ritaVal(); } }),
          p.typ === "extra" ? " Avstå: ingen ny extra yrkesfärdighet (BP:n blir kvar)" : " Avstå: ingen ny sekundär färdighet (EP:n blir kvar)") : null,
        avstar[i] ? null : fardighetsVal(`magibyte-${i}`, val[i], (v) => { val[i] = v; ritaVal(); },
          (f) => f.typ !== "magiskola" && (p.typ === "extra" || f.typ !== "primar") && (f.perVal || !harRedan.has(f.id) || val[i].split(":")[0] === f.id),
          p.typ === "sekundar" ? {} : { yrke: true }),
        avstar[i] ? null : valdBeskrivning(val[i]),
        !avstar[i] && val[i].startsWith("stridskonster") ? stridskonstInfo() : null)));
      gaVidare.disabled = val.some((v, i) => !avstar[i] && (!v || paborjad(v)));
    };
    ritaVal();
    modal.classList.add("byte");
    panel.replaceChildren(rubrik,
      el("p", { class: "magi-byte-text" }, "Magin förkastar dig. Glöm dina drömmar och satsa på något du kan."),
      listor, fel, el("div", { class: "magi-byte-fot" }, gaVidare));
    panel.setAttribute("aria-labelledby", "magimodal-byte-rubrik");
    // Knappen glider upp och blir rubriken
    if (!reducerad) {
      const till = rubrik.getBoundingClientRect();
      const dx = fran.left + fran.width / 2 - (till.left + till.width / 2);
      const dy = fran.top + fran.height / 2 - (till.top + till.height / 2);
      rubrik.animate([{ transform: `translate(${dx}px, ${dy}px) scale(.75)`, opacity: 0.85 }, { transform: "none", opacity: 1 }],
        { duration: 650, easing: "cubic-bezier(.2, .7, .2, 1)" });
      panel.querySelectorAll(".magi-byte-text, .magi-byte-val, .magi-byte-fot").forEach((x, i) =>
        x.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 450, delay: 450 + i * 120, fill: "backwards", easing: "ease-out" }));
    }
    listor.querySelector("select")?.focus({ preventScroll: true });
  };

  const visaResultat = () => {
    const res = rakna();
    const mf = res.magiformaga;
    magiModal.fas = "klar";
    modal.classList.add("klar");
    siffra.firstChild.textContent = mf.slag;
    modal.classList.toggle("lyckat", mf.lyckat);
    modal.classList.toggle("misslyckat", !mf.lyckat);
    const detalj = `Slaget blev ${mf.slag}${mf.mod ? ` ${mf.mod > 0 ? "+" : "−"} ${Math.abs(mf.mod)} = ${mf.slag + mf.mod}` : ""}, och det måste bli högst ${mf.chans}.`;
    const knapp = mf.lyckat
      ? el("button", { type: "button", class: "magi-knapp", id: "magimodal-fortsatt", onclick: () => stangMagiModal(true) }, "FORTSÄTT")
      : el("button", { type: "button", class: "magi-knapp", id: "magimodal-forlikas", onclick: () => (bytesPlatser().length ? visaByte(knapp) : stangMagiModal(false)) }, "FÖRLIKAS MED ÖDET");
    utfall.replaceChildren(
      el("h2", {}, mf.lyckat ? "SLAGET LYCKADES!" : "SLAGET MISSLYCKADES!"),
      el("p", { class: "magi-brodtext" }, mf.lyckat ? "Du känner magins kraft i hela ditt väsen." : "Magins vindar blåser ej åt ditt håll ..."),
      el("p", { class: "magi-detalj" }, detalj),
      knapp);
    setTimeout(() => knapp.focus({ preventScroll: true }), reducerad ? 0 : 700);
  };
  // `fast` är ett bestämt slag (utvecklarläget); annars slumpas det eller tas från fältet
  async function sla(fast) {
    if (magiModal?.fas !== "redo") return;
    let v = Number.isInteger(fast) ? fast : null;
    if (v === null && S.manuellaSlag) {
      v = Number(inmatning.value);
      if (!Number.isInteger(v) || v < 1 || v > 100) { inmatning.focus(); inmatning.classList.add("fel"); return; }
    } else if (v === null) v = slaT(1, 100);
    if (inmatning) inmatning.disabled = true;
    magiModal.fas = "rullar";
    modal.classList.add("rullar");
    tarningsknapp.disabled = true;
    // Slaget sparas direkt: det görs en gång och gäller hela rollpersonen. Steget minns för utvecklarlägets Gör om.
    S.rp.magiformaga = { slag: v, steg: S.aktivtSteg };
    uppdatera();
    await tarning.sla(v, reducerad ? 300 : MAGI_SNURR);
    if (magiModal) visaResultat();
  }
  tarningsknapp.addEventListener("click", () => sla());
  inmatning?.addEventListener("keydown", (e) => { if (e.key === "Enter") sla(); });
  inmatning?.addEventListener("input", () => inmatning.classList.remove("fel"));
  // Övergången in tar en knapp halv sekund; sedan visas tärningen
  requestAnimationFrame(() => modal.classList.add("synlig"));
  setTimeout(() => {
    if (!magiModal) return;
    modal.classList.add("tarning-synlig");
    if (redanSlaget) { tarning.visa(S.rp.magiformaga.slag); visaResultat(); return; }
    magiModal.fas = "redo";
    tarningsknapp.disabled = false;
    (inmatning ?? tarningsknapp).focus({ preventScroll: true });
  }, reducerad ? 0 : 550);
}

// Stänger modalen. Efter ett misslyckat slag tas magiskolor som är kvar bort (efter ett byte är det bara sekundära).
function stangMagiModal(lyckat) {
  if (!magiModal) return;
  const { el: modal, tarning, vidare } = magiModal;
  if (!lyckat) {
    const arSkola = (k) => fardighetAv(S.R, (k || "x").split(":")[0])?.typ === "magiskola";
    if (arSkola(S.rp.valfri)) S.rp.valfri = "";
    S.rp.extraYrkesfardigheter = S.rp.extraYrkesfardigheter.map((k) => (arSkola(k) ? "" : k));
    S.rp.sekundara = S.rp.sekundara.filter((k) => !arSkola(k));
    for (const k of Object.keys(S.rp.fardigheter)) if (arSkola(k)) delete S.rp.fardigheter[k];
    S.rp.besvarjelser = {};
    if (arSkola(S.nySekundar)) S.nySekundar = "";
    if (arSkola(S.nyExtra)) S.nyExtra = "";
  }
  if (vidare && (lyckat || modal.classList.contains("byte"))) S.aktivtSteg = vidare;
  magiModal = null;
  modal.classList.add("stanger");
  setTimeout(() => { tarning.stoppa(); modal.remove(); if (!magiModal) document.body.classList.remove("dialog-oppen"); }, reduceraRorelse() ? 0 : 350);
  uppdatera();
}

// Utvecklarläget: en röd knapp i steget där slaget gjordes tar bort slaget och slår om det
export function magiGorOm(stegId) {
  if (!S.omslag || S.rp.magiformaga?.slag == null) return null;
  const arSkola = (k) => fardighetAv(S.R, k || "x")?.typ === "magiskola";
  const dar = S.rp.magiformaga.steg ?? (yrkesNycklar().some(arSkola) || S.rp.extraYrkesfardigheter.some(arSkola) ? "egenskaper" : "fardigheter");
  if (dar !== stegId) return null;
  return el("button", { type: "button", class: "knapp magi-gor-om", id: "magi-gor-om", title: "Utvecklarläge: ta bort magiförmågeslaget och slå om",
    onclick: () => { S.rp.magiformaga = { slag: null }; S.giltig = structuredClone(S.rp); spara(); rita(); oppnaMagiModal(); } }, "Gör om magiförmågeslaget");
}
