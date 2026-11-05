// Steg 4: yrkesfärdigheter och extra yrkesfärdigheter.
import { fardighetAv, paborjad, namnFor, kallText, yrkeAv, valbaraYrken, tackyrketsFardigheter } from "../regelmotor.js";
import { rita, visaNotis } from "../app.js";
import { S, uppdatera, yrkeId, yrkesNycklar } from "../tillstand.js";
import { el } from "../ui/dom.js";
import { falt, fardighetsInfo, fardighetsVal, info, kortBeskrivning, utanMagiInfo, valLista } from "../ui/kontroller.js";
import { magiInfo, magiMojlig } from "../ui/magimodal.js";
import { stridskonstInfo } from "./fardigheter.js";
import { yrketsVal } from "./yrke.js";

// BP för varje extra yrkesfärdighet, i samma prisordning som regelmotorn (s. 27)
function extraPriser(lista) {
  const k = S.R.yrken.extraYrkesfardigheter;
  let vanliga = 0;
  return lista.map((nyckel) => {
    if (fardighetAv(S.R, nyckel || "x")?.typ === "magiskola") return k.magiskola;
    vanliga += 1;
    return vanliga === 1 ? k.forsta : vanliga === 2 ? k.andra : k.darefter;
  });
}

// Beskrivningen av färdigheten som är vald i en rullgardin, innan den läggs till
export function valdBeskrivning(nyckel) {
  const id = (nyckel ?? "").split(":")[0];
  return id ? el("div", { class: "vald-beskrivning" }, kortBeskrivning(id, true)) : null;
}

export function stegExtra(res) {
  const lista = S.rp.extraYrkesfardigheter;
  const k = S.R.yrken.extraYrkesfardigheter;
  const priser = extraPriser(lista);
  const yrkesrader = res.fardigheter.filter((f) => f.status === "yrke");
  // Färdigvalda extra som inte syns bland yrkesfärdigheterna (t.ex. påbörjade i en äldre sparning) listas ändå, så att de går att ta bort
  const ovriga = lista.filter((n) => !yrkesrader.some((f) => f.nyckel === n));
  const taBort = (nyckel, namn) => el("button", {
    type: "button", class: "lank", "aria-label": `Ta bort ${namn}`,
    onclick: () => { const i = lista.indexOf(nyckel); if (i >= 0) lista.splice(i, 1); uppdatera(); },
  }, "ta bort");
  const rad = (nyckel, namn, grundegenskap) => {
    const i = lista.indexOf(nyckel);
    return el("tr", {},
      el("td", {}, namn, fardighetsInfo(nyckel), i >= 0 ? taBort(nyckel, namn) : null),
      el("td", {}, grundegenskap ?? ""),
      el("td", {}, i >= 0 ? "Extra" : "Yrket"),
      el("td", { class: "num" }, i >= 0 ? priser[i] : ""));
  };
  const nasta = extraPriser([...lista, S.nyExtra || "x"]).at(-1);
  const harRedan = new Set([...yrkesNycklar(), ...lista]);
  return [
    utanMagiInfo(),
    ...yrketsVal(),
    tatueringsVal(res),
    tackyrkesVal(res),
    yrkesformagaVal(),
    el("h3", {}, "Fler yrkesfärdigheter"),
    el("p", {}, `Den första extra yrkesfärdigheten kostar ${k.forsta} BP, den andra ${k.andra} BP och varje därefter ${k.darefter} BP. En magiskola kostar ${k.magiskola} BP och kräver ett lyckat magiförmågeslag (1T100 högst (INT+PSY)/2, s. 106). Slaget görs när du går vidare från steg 6, när INT och PSY är bestämda.`),
    el("h4", {}, "Dina yrkesfärdigheter"),
    el("div", { class: "tabellram" }, el("table", { class: "tabell fardighetstabell yrkestabell" },
      el("thead", {}, el("tr", {}, el("th", {}, "Färdighet"), el("th", {}, "Grundeg."), el("th", {}, "Från"), el("th", { class: "num" }, "BP", info("BP")))),
      el("tbody", {},
        yrkesrader.map((f) => rad(f.nyckel, f.namn, f.grundegenskap)),
        ovriga.map((n) => {
          const f = fardighetAv(S.R, (n || "x").split(":")[0]);
          return rad(n, !f ? n || "Tom rad" : paborjad(n) ? `${f.namn} (inte färdigvald)` : namnFor(S.R, f, n), f?.grundegenskap);
        })))),
    lista.some((n) => n.startsWith("stridskonster")) ? stridskonstInfo() : null,
    el("h4", {}, "Lägg till en extra yrkesfärdighet"),
    el("div", { class: "rad" },
      // Färdigheter som rollpersonen redan har som yrkesfärdighet visas inte; för dem med delval spärras de delval som redan finns
      fardighetsVal("ny-extra", S.nyExtra, (v) => { S.nyExtra = v; rita(); }, (f) => magiMojlig(f) && (f.perVal || !harRedan.has(f.id)), { yrke: true }),
      el("button", { type: "button", class: "knapp", disabled: paborjad(S.nyExtra), onclick: () => {
        if (res.bp.kvar < nasta) {
          visaNotis(`Det går inte: den extra yrkesfärdigheten kostar ${nasta} BP, och du har bara ${res.bp.kvar} BP kvar.`);
          return;
        }
        if (!lista.includes(S.nyExtra)) lista.push(S.nyExtra);
        S.nyExtra = "";
        uppdatera();
      } }, "Lägg till")),
    magiInfo(S.nyExtra),
    valdBeskrivning(S.nyExtra),
    S.nyExtra.startsWith("stridskonster") ? stridskonstInfo() : null,
    el("p", { class: res.bp.kvar < nasta ? "hjalp felrad" : "hjalp" },
      `Nästa extra yrkesfärdighet kostar ${nasta} BP. Du har ${res.bp.kvar} BP kvar.`,
      res.bp.kvar < nasta ? " Du har inte råd med den." : " Välj färdighet, fyll i vad den gäller och tryck Lägg till."),
  ];
}

// Bärsärkens levande tatueringar (Dvärgar i Chronopia s. 6–7, 27–28): en, två eller tre efter erfarenhetsnivån,
// valda i samråd med SL
function tatueringsVal(res) {
  const T = S.R.fardigheter.tatueringar;
  const t = res.tatueringar;
  if (!T || !t?.tak) return null;
  const valda = S.rp.tatueringar ?? [];
  const andra = (id, med) => { S.rp.tatueringar = med ? [...valda, id] : valda.filter((x) => x !== id); uppdatera(); };
  return el("div", { class: "rutor", id: "tatueringar" }, el("div", {},
    el("h3", {}, "Levande tatueringar"),
    el("p", {}, `Bärsärken får ${t.tak} levande tatuering${t.tak === 1 ? "" : "ar"} på den här erfarenhetsnivån, valda i samråd med SL. Valda: ${valda.length}. ${T.text} (${kallText(S.R, T, "")})`),
    el("div", { class: "tabellram" }, el("table", { class: "tabell varutabell" },
      el("thead", {}, el("tr", {}, el("th", {}, ""), el("th", {}, "Insikt"), el("th", {}, "Tatuering"), el("th", {}, "Mod."), el("th", {}, "Kostnad"), el("th", {}, "Antal"))),
      el("tbody", {}, T.lista.map((x) => {
        const vald = valda.includes(x.id);
        return el("tr", { "data-tatuering": x.id },
          el("td", {}, el("input", { type: "checkbox", id: `tatuering-${x.id}`, checked: vald, disabled: !vald && valda.length >= t.tak,
            "aria-label": `${x.namn}`, onchange: (e) => andra(x.id, e.target.checked) })),
          el("td", {}, String(x.nr)),
          el("td", {}, el("strong", {}, x.namn), el("div", { class: "hjalp" }, x.effekt)),
          el("td", {}, x.mod), el("td", {}, x.kostnad), el("td", {}, x.antal));
      }))))));
}

// Pierrotens täckyrke (Alver i Chronopia s. 44): ett annat yrke, två av dess yrkesfärdigheter med FV 5 och
// det yrkets startutrustning. Färdigheterna blir pierrotens yrkesfärdigheter.
// Yrken som får välja en av två yrkesförmågor (Drakgardist: krigarens eller gladiatorns, Alver i Chronopia s. 35)
function yrkesformagaVal() {
  const yrke = yrkeAv(S.R, yrkeId());
  const V = yrke?.yrkesformagaVal;
  if (!V) return null;
  const valt = V.alternativ.find((a) => a.id === S.rp.yrkesformagaVal);
  return el("div", { class: "rutor", id: "yrkesformaga-val" }, el("div", {},
    el("h3", {}, "Yrkesförmåga"),
    el("p", { class: "hjalp" }, `${yrke.namn} väljer fritt en av yrkesförmågorna nedan (${kallText(S.R, yrke, "")}).`),
    falt("Yrkesförmåga", valLista("yrkesformaga", S.rp.yrkesformagaVal ?? "", V.alternativ.map((a) => [a.id, a.namn]), (v) => { S.rp.yrkesformagaVal = v; uppdatera(); })),
    valt ? el("p", { class: "summering" }, valt.text) : null));
}

function tackyrkesVal(res) {
  const T = yrkeAv(S.R, yrkeId())?.tackyrke;
  if (!T || !res.tackyrke?.regel) return null;
  const v = S.rp.tackyrke ?? { yrke: "", fardigheter: [] };
  const satt = (ny) => { S.rp.tackyrke = ny; uppdatera(); };
  const yrken = valbaraYrken(S.R, S.rp).filter((y) => y.id !== yrkeId()).sort((a, b) => a.namn.localeCompare(b.namn, "sv"));
  const tack = v.yrke ? yrkeAv(S.R, v.yrke) : null;
  const bland = tack ? tackyrketsFardigheter(S.R, tack) : [];
  const valda = v.fardigheter ?? [];
  return el("div", { class: "rutor", id: "tackyrke" }, el("div", {},
    el("h3", {}, "Täckyrke"),
    el("p", {}, `Pierroten låtsas ha ett annat yrke. Välj täckyrket och ${T.antal} av dess yrkesfärdigheter: de blir yrkesfärdigheter med FV ${T.fv}, och täckyrkets startutrustning ingår (Alver i Chronopia s. 44).`),
    falt("Täckyrke", valLista("tackyrke-yrke", v.yrke, yrken.map((y) => [y.id, y.namn]), (id) => satt({ yrke: id, fardigheter: [] }), "Välj täckyrke …")),
    tack ? el("div", { class: "rad" }, Array.from({ length: T.antal }, (_, j) => fardighetsVal(`tackyrke-${j}`, valda[j], (n) => {
      const ny = [...valda]; ny[j] = n; satt({ ...v, fardigheter: ny.map((x) => x ?? "") });
    }, (f) => bland.includes(f.id)))) : null,
    tack?.startutrustning?.length ? el("p", { class: "hjalp" }, `Täckyrkets startutrustning: ${tack.startutrustning.join(" · ")}.`) : null));
}
