// Steg 1: ras.
import { GRUNDEGENSKAPER, rasAv, yrkeAv, fardighetAv, valbaraRaser } from "../regelmotor.js";
import { nollstallSpel } from "../spelmote.js";
import { RAS_SEKUNDAR_INFO, RASFORMAGOR } from "../texter.js";
import { S, harLogg, uppdatera } from "../tillstand.js";
import { el } from "../ui/dom.js";
import { delvalKontroll, falt, fardighetsInfo, infoKnapp } from "../ui/kontroller.js";

// ------------------------------------------------------------ stegen
export function stegRas() {
  const valt = S.rp.ras ? rasAv(S.R, S.rp.ras) : null;
  const kort = valbaraRaser(S.R).map((r) => el("button", {
    type: "button", class: "valkort raskort" + (r.id === S.rp.ras ? " valt" : ""), "aria-pressed": r.id === S.rp.ras ? "true" : "false",
    onclick: () => {
      // Ett tryck på den valda rasen avmarkerar den
      S.rp.ras = r.id === S.rp.ras ? "" : r.id; S.rp.rasval = []; S.rp.stoSteg = 0;
      uppdatera();
    },
  },
  el("span", { class: "valkort-namn" }, r.namn)));
  const huvud = el("div", { class: "valkort-rutnat liten" }, kort);
  if (!valt) return [huvud, el("p", { class: "hjalp" }, "Välj rollpersonens ras genom att klicka på ett av korten."), fortsattSparad()];
  const extra = [];
  if (valt.primara.some((p) => p.valfri === "vapen")) {
    extra.push(falt("Valfri vapenfärdighet som primär (s. 71)",
      delvalKontroll("rasval-vapen", "vapen", S.rp.rasval[0]?.split(":")[1], (v) => { S.rp.rasval = v ? [`vapen:${v}`] : []; uppdatera(); })));
  }
  if (valt.primara.some((p) => p.valfri === "hantverk")) {
    extra.push(falt("Valfritt hantverk som primär (s. 59)",
      delvalKontroll("rasval-hantverk", "hantverk", S.rp.rasval[0]?.split(":")[1], (v) => { S.rp.rasval = v ? [`hantverk:${v}`] : []; uppdatera(); })));
  }
  const sprak = (lista) => lista.map((x) => S.R.fardigheter.sprak.find((s) => s.id === (x.sprak ?? x))?.namn ?? x).join(", ") || "inget skriftspråk";
  return [
    huvud,
    el("div", { class: "valinfo" },
      el("h3", { class: "valrubrik" }, valt.namn),
      valt.beskrivning ? el("p", { class: "vallore" }, valt.beskrivning, " (s. 14–16)") : null,
      el("dl", { class: "valdata" },
        el("div", {}, el("dt", {}, "BP"), el("dd", {}, valt.bp)),
        el("div", {}, el("dt", {}, "Grundegenskaper"), el("dd", {}, GRUNDEGENSKAPER.filter((g) => valt.mod[g]).map((g) => `${g} ${valt.mod[g] > 0 ? "+" : "−"}${Math.abs(valt.mod[g])}`).join(" · ") || "Inga modifikationer")),
        el("div", {}, el("dt", {}, "STO"), el("dd", {}, `${valt.sto.min}–${valt.sto.max} (normalt ${valt.sto.normal})`)))),
    el("div", { class: "rutor" },
      el("div", {}, el("h4", {}, "Särskilt för ", valt.namn.toLowerCase()),
        el("ul", { class: "punkter" },
          valt.formagor.map((t) => el("li", {}, t, RASFORMAGOR[t] ? infoKnapp(RASFORMAGOR[t], `Om ${t.toLowerCase()}`) : null)),
          valt.primara.length ? el("li", {}, "Extra primära färdigheter: ", valt.primara.map((p, i) => [i ? ", " : "",
            typeof p === "string" ? [p.split(":")[1] ?? fardighetAv(S.R, p).namn, fardighetsInfo(p.split(":")[0])]
              : [p.valfri === "vapen" ? "valfri vapenfärdighet" : "valfritt hantverk", fardighetsInfo(p.valfri)]])) : null,
          valt.sekundara.length ? el("li", {}, "Sekundära för rasen: ", valt.sekundara.map((p) => fardighetAv(S.R, p).namn).join(", "),
            infoKnapp(RAS_SEKUNDAR_INFO, "Vad betyder sekundära för rasen?")) : null,
          valt.startbonus.map((b) => el("li", {}, `+${b.bc} på BC i ${fardighetAv(S.R, b.fardighet).namn}`, fardighetsInfo(b.fardighet))),
          Object.entries(valt.slagbonus).map(([k, v]) => el("li", {}, `+${v} på slaget för ${k === "socialtStand" ? "socialt stånd" : "startkapital"}`,
            infoKnapp(k === "socialtStand" ? "Läggs på slaget för socialt stånd i steg 9. Ett högre stånd ger bättre läs- och skrivkunnighet i modersmålet och ett högre tak för startkapitalet (s. 33)." : "Läggs på slaget för startkapital i steg 10 och ger mer pengar att köpa utrustning för (s. 33).", "Om bonusen"))),
          el("li", {}, "Talar: ", sprak(valt.talaModersmal)),
          el("li", {}, "Läser och skriver: ", sprak(valt.lasaSkrivaModersmal)))),
      extra.length ? el("div", { class: "rasval-extra" }, extra) : null),
  ];
}

// Erbjuder rollpersonen från förra besöket tills spelaren har börjat på en ny
function fortsattSparad() {
  const s = S.sparadVidStart;
  if (!s) return null;
  const beskr = [rasAv(S.R, s.rp.ras)?.namn, yrkeAv(S.R, s.rp.yrke)?.namn, s.rp.alder == null ? null : `${s.rp.alder} år`].filter(Boolean).join(", ");
  return el("div", { class: "rutor" }, el("div", {},
    el("p", {}, el("strong", {}, "Du har en sparad rollperson från förra gången: "), `${s.rp.namn || "Namnlös"} (${beskr}).`),
    el("div", { class: "rad" },
      el("button", { type: "button", class: "knapp", id: "fortsatt-sparad", onclick: () => {
        S.rp = structuredClone(s.rp); S.aktivtSteg = s.aktivtSteg; S.langst = s.langst; S.sparadVidStart = null; nollstallSpel(); if (harLogg()) S.vy = "spel"; uppdatera();
      } }, "Fortsätt med den"),
      el("span", { class: "hjalp" }, "Väljer du en ras börjar du på en ny rollperson, och den sparade försvinner."))));
}
