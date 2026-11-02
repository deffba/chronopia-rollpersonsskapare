// Rollformuläret bredvid stegen, som visar rollpersonen medan den skapas.
import { GRUNDEGENSKAPER, yrkesformagaText, bNivaText } from "../regelmotor.js";
import { spelPotter } from "../spelmote.js";
import { spelCtx } from "../app.js";
import { saknas } from "../steg/saknas.js";
import { S, uppdatera } from "../tillstand.js";
import { el, kg, sm } from "./dom.js";
import { info } from "./kontroller.js";

// ------------------------------------------------------------ rollformuläret
export function rollformular(res) {
  const g = res.grundegenskaper;
  const h = res.harledda;
  // Före steg 6 finns inga grundegenskaper, och inget som räknas fram ur dem: rutorna visar "–"
  const visa = (v) => (res.grundegenskaperSatta && v != null ? v : "–");
  const bpProcent = Math.max(0, Math.min(100, (res.bp.kvar / res.bp.start) * 100));
  const epProcent = Math.max(0, Math.min(100, (res.ep.kvar / res.ep.start) * 100));
  return el("div", { class: "formular" },
    el("div", { class: "formular-huvud" },
      el("h2", {}, el("input", { id: "formular-namn", class: "namnfalt", type: "text", value: S.rp.namn, placeholder: "Namnlös rollperson", "aria-label": "Rollpersonens namn",
        onchange: (e) => { S.rp.namn = e.target.value; uppdatera(); } })),
      el("p", {}, [S.rp.ras ? res.ras.namn : null, S.rp.yrke ? res.yrke.namn : null, S.rp.alder == null ? null : `${S.rp.alder} år`, S.rp.kon].filter(Boolean).join(" · "))),
    S.vy === "spel" ? el("dl", { class: "nyckelvarden" },
      el("div", {}, el("dt", {}, "Osparade EP", info("EP")), el("dd", {}, spelPotter(spelCtx(res)).ep)),
      el("div", {}, el("dt", {}, "Hjältepoäng"), el("dd", {}, (S.rp.spel.hjaltepoang ?? 0) + (res.hjaltepoang?.kvar ?? 0)))) : el("div", { class: "potter" },
      el("div", { class: "pott" + (res.bp.kvar < 0 ? " over" : "") }, el("span", { class: "etikett" }, "BP kvar", info("BP")),
        el("span", { class: "pott-tal" }, res.bp.kvar), el("span", { class: "matare" }, el("span", { style: `width:${bpProcent}%` })),
        el("span", { class: "hjalp" }, `av ${res.bp.start}`)),
      el("div", { class: "pott" + (res.ep.kvar < 0 ? " over" : "") }, el("span", { class: "etikett" }, "EP kvar", info("EP")),
        el("span", { class: "pott-tal" }, res.ep.kvar), el("span", { class: "matare" }, el("span", { style: `width:${epProcent}%` })),
        el("span", { class: "hjalp" }, `av ${res.ep.start}`))),
    S.vy === "spel" ? null : saknas(res).length ? el("div", { class: "saknaslista", role: "status" }, el("strong", {}, "Kvar att välja"), el("ul", {}, saknas(res).map((f) => el("li", {}, f))))
      : el("p", { class: "klar" }, "Rollpersonen är klar."),
    // Förkortning och värde centrerade; infoikonen längst ned i rutan
    el("dl", { class: "egenskaper" }, [...GRUNDEGENSKAPER, "STO"].map((k) => el("div", {}, el("dt", {}, k), el("dd", {}, visa(g[k])), el("dd", { class: "egenskap-info" }, info(k))))),
    el("dl", { class: "nyckelvarden" },
      el("div", {}, el("dt", {}, "Kroppspoäng", info("KP")), el("dd", {}, visa(h.totalKP))),
      el("div", {}, el("dt", {}, "Skadebonus", info("SB")), el("dd", {}, visa(h.skadebonus))),
      el("div", {}, el("dt", {}, "Förflyttning", info("Förflyttning")), el("dd", {}, visa(h.forflyttning))),
      el("div", {}, el("dt", {}, "Svärdshand"), el("dd", {}, res.slag.svardshand)),
      el("div", {}, el("dt", {}, "Socialt stånd"), el("dd", {}, res.slag.socialtStand)),
      el("div", {}, el("dt", {}, "Startkapital"), el("dd", {}, sm(res.slag.startkapital))),
      el("div", {}, el("dt", {}, "Längd"), el("dd", {}, visa(h.langd))),
      el("div", {}, el("dt", {}, "Vikt"), el("dd", {}, visa(h.vikt)))),
    el("h3", {}, "Kroppsdelar"),
    el("ul", { class: "kroppsdelar" }, [0, 1].map(() => el("li", { class: "kolumnrubrik" }, el("span", {}, "Kroppsdel"), el("span", { class: "num" }, "KP"))),
      h.kroppsdelar.map((d) => el("li", {}, el("span", {}, d.namn), el("span", { class: "num" }, visa(d.kp))))),
    [...(res.sarskildaFormagorna ?? [res.sarskildFormaga]), ...res.extraFormagor].filter(Boolean).map((f, i, alla) => [i === 0 ? el("h3", {}, alla.length > 1 ? "Särskilda förmågor" : "Särskild förmåga") : null, el("p", {}, el("strong", {}, f.namn), " ", f.effekt)]),
    res.hjaltepoang?.totalt ? el("p", {}, el("strong", {}, "Hjältepoäng: "), `${res.hjaltepoang.kvar} av ${res.hjaltepoang.totalt} kvar`) : null,
    S.rp.yrke ? el("p", {}, el("strong", {}, "Yrkesförmåga: "), yrkesformagaText(res.yrke)) : null,
    res.stridshandlingar ? el("p", {}, el("strong", {}, "Handlingar per stridsrunda: "),
      `${res.stridshandlingar.antal} (detaljerad strid${res.stridshandlingar.borda ? `, ${res.stridshandlingar.borda} av bördan` : ""})`) : null,
    res.sinnen?.sinnen.some((x) => x.niva) ? el("p", {}, el("strong", {}, "Syn och hörsel: "),
      res.sinnen.sinnen.filter((x) => x.niva).map((x) => `${x.namn} ${x.niva.toLowerCase()} (${x.mod > 0 ? "+" : x.mod < 0 ? "−" : "±"}${Math.abs(x.mod)})`).join(", ")) : null,
    res.startutrustning?.length ? el("p", {}, el("strong", {}, "Startutrustning: "), res.startutrustning.join(", ")) : null,
    el("h3", {}, "Färdigheter", info("B-nivå")),
    el("ul", { class: "fardighetsrader" }, kolumnrubrik("Färdighet", "FV"), res.fardigheter.filter((f) => f.fv > 0).map((f) =>
      el("li", { class: f.status }, el("span", {}, f.kategoriB ? medNiva(f.namn, bNivaText(S.R, f.fv, f.bNivaLagre)) : f.namn,
        f.sinne ? el("span", { class: "hjalp" }, ` (${f.sinne > 0 ? "+" : "−"}${Math.abs(f.sinne)} syn/hörsel)`) : null), el("span", { class: "num" }, f.fv)))),
    res.besvarjelser.length ? [el("h3", {}, "Besvärjelser"), el("ul", { class: "fardighetsrader" }, kolumnrubrik("Besvärjelse", "FV"), res.besvarjelser.map((b) =>
      el("li", {}, el("span", {}, b.namn), el("span", { class: "num" }, b.fv))))] : null,
    res.utrustning.saker.length ? [el("h3", {}, "Utrustning"), el("ul", { class: "fardighetsrader" }, kolumnrubrik("Sak", "Vikt"), res.utrustning.saker.map((x) =>
      el("li", {}, el("span", {}, sakNamn(x)), el("span", { class: "num" }, x.vikt ? `${kg(x.vikt)} kg` : "–")))),
    el("p", {}, `Pengar kvar: ${sm(res.utrustning.kvar)}. Bördan är ${kg(res.utrustning.borda)} av ${res.utrustning.barformaga} kg (kläder räknas inte, buren rustning till hälften).`)] : null,
  );
}

// Saker som säljs i förpackningar, som "Pilar (10 st)", visas med det totala antalet: två förpackningar blir "Pilar (x20)"
export function sakNamn(x) {
  const m = x.namn.match(/^(.*) \((?:(.*), )?(\d[\d ]*) st\)$/);
  if (m) return `${m[1]} (${m[2] ? `${m[2]}, ` : ""}x${Number(m[3].replace(/ /g, "")) * x.antal})`;
  return x.antal > 1 ? medNiva(x.namn, `x${x.antal}`) : x.namn; // "Trätunna (100 liter, x2)"
}

// B-nivån skrivs i parentes efter namnet, eller i namnets egen parentes: "Kulturkännedom (Dvärgar, B3)"
const medNiva = (namn, niva) => (namn.endsWith(")") ? `${namn.slice(0, -1)}, ${niva})` : `${namn} (${niva})`);
const kolumnrubrik = (namn, varde) => el("li", { class: "kolumnrubrik" }, el("span", {}, namn), el("span", { class: "num" }, varde));
