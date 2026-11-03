// Steg 3: yrke.
import { yrkeAv, fardighetAv, paborjad, valbaraYrken, yrkeVillkor, yrkesformagaText, kallText, namnFor, paketNamn, paketNycklar, svardsskolaFor } from "../regelmotor.js";
import { visaNotis } from "../app.js";
import { S, uppdatera, yrkeId, yrkesNycklar } from "../tillstand.js";
import { el } from "../ui/dom.js";
import { delvalKontroll, fardighetsInfo, fardighetsVal, hjalpFor, kortBeskrivning, valLista } from "../ui/kontroller.js";
import { magiInfo, magiMojlig } from "../ui/magimodal.js";
import { stridskonstInfo } from "./fardigheter.js";

// Det som är särskilt med en yrkesfärdighetspost (V&R): gratis FV, tak vid start
const extraFor = (post) => [post.startFV ? `FV ${post.startFV} gratis, som primär${post.antal > 1 ? "a" : ""}` : null,
  post.takStart ? `högst FV ${post.takStart} vid start, inget magiförmågeslag` : null].filter(Boolean).join(", ") || null;
const storBokstav = (t) => t.charAt(0).toUpperCase() + t.slice(1);
// Teknikerna i en svärdsskolas färdiga stridskonst (V&R s. 32–33), t.ex. Kejsarens hand
const skolTekniker = (post) => (post.maste ?? []).map((m) => svardsskolaFor(S.R, `${post.fardighet}:${m}`))
  .filter(Boolean).map((s) => `${s.namn}: ${s.tekniker.join(", ")}`).join("; ") || null;

// Steg 3: yrket väljs med kort som rasen i steg 1. Yrkesfärdigheterna visas bara; valen inom dem görs i steg 4.
export function stegYrke() {
  const yrke = yrkeAv(S.R, yrkeId());
  // Yrken som rasen inte får välja (t.ex. Hedersvakt, bara dvärgar) visas inte. Yrken som bara vissa raser
  // får välja, och som den valda rasen får, har en röd ram.
  const kort = valbaraYrken(S.R, S.rp).filter((y) => !S.rp.ras || !yrkeVillkor(S.R, S.rp, y)).sort((a, b) => a.namn.localeCompare(b.namn, "sv")).map((y) => {
    const villkor = yrkeVillkor(S.R, S.rp, y);
    const rasyrke = Boolean(S.rp.ras && y.villkor?.ras?.includes(S.rp.ras));
    return el("button", {
      type: "button", class: "valkort yrkeskort" + (y.id === S.rp.yrke ? " valt" : "") + (villkor ? " ej-valbar" : "") + (rasyrke ? " rasyrke" : ""), "aria-pressed": y.id === S.rp.yrke ? "true" : "false", "data-yrke": y.id,
      "aria-disabled": villkor ? "true" : null, title: villkor ?? (rasyrke ? yrkeVillkor(S.R, { ras: "-" }, y) : null),
      onclick: () => {
        if (villkor) { visaNotis(`${y.namn}: ${villkor.charAt(0).toLowerCase()}${villkor.slice(1)}.`); return; }
        // Ett tryck på det valda yrket avmarkerar det, som för rasen i steg 1
        S.rp.yrke = y.id === S.rp.yrke ? "" : y.id; S.rp.yrkesval = {}; S.rp.valfri = ""; S.rp.hantverkBonus = "";
        // Yrken med vapen i startutrustningen får inget vapen i startpaketet
        if (y.startvapen && S.rp.startpaket?.vapen) S.rp.startpaket = { ...S.rp.startpaket, vapen: "" };
        uppdatera();
      },
    }, el("span", { class: "valkort-namn" }, y.namn.replace(/^(.{5,})(magiker)$/, "$1\u00ad$2")), // Elementar-magiker avstavas om namnet inte får plats
    villkor ? el("span", { class: "valkort-villkor" }, villkor) : null);
  });
  if (!S.rp.yrke) return [el("div", { class: "valkort-rutnat liten fyra" }, kort), el("p", { class: "hjalp" }, "Välj rollpersonens yrke genom att klicka på ett av korten.")];
  const namn = (x) => fardighetAv(S.R, x)?.namn ?? x;
  const punkt = (text, id, val, extra) => el("li", {}, text, id ? fardighetsInfo(id) : null, val ? el("span", { class: "sida" }, ` (${val})`) : null, extra ? el("span", { class: "hjalp" }, ` – ${extra}`) : null);
  const punkter = yrke.fardigheter.map((post, i) => {
    const val = S.rp.yrkesval[i];
    if (typeof post === "string") return punkt(namn(post), post, typeof val === "string" && !paborjad(val) ? val : null);
    if (post.valPaket) {
      const nycklar = paketNycklar(S.R, post, val);
      return punkt(post.valPaket.map((p) => paketNamn(S.R, p)).join(" eller "), null,
        nycklar.length ? nycklar.map((k) => namnFor(S.R, fardighetAv(S.R, k), k)).join(", ") : null, extraFor(post));
    }
    if (post.valEn) {
      const text = post.valEn.map((x) => (typeof x === "string" ? namn(x) : `${namn(x.fardighet)} (${x.antal})`)).join(" eller ");
      return punkt(text, null, val?.id ? [namn(val.id), val.sub].filter(Boolean).join(": ") : null, extraFor(post));
    }
    if (post.antal === null) return punkt(`${namn(post.fardighet)} (alla)`, post.fardighet);
    const valda = [].concat(val ?? []);
    post.maste?.forEach((m, j) => { valda[j] = m; });
    const fasta = post.maste && post.antal === post.maste.length;
    const tekniker = skolTekniker(post);
    return punkt(fasta ? `${namn(post.fardighet)}: ${post.maste.join(", ")}` : `${namn(post.fardighet)} (${post.antal})`, post.fardighet,
      fasta ? null : valda.filter((v) => v && !paborjad(v)).join(", ") || null, [extraFor(post), tekniker ? `tekniker ${tekniker}` : null].filter(Boolean).join("; ") || null);
  });
  // Gratis FV i en färdighet som inte är yrkesfärdighet (Hypnotisera för sabransk ökenriddare)
  for (const b of yrke.startFV ?? []) {
    if (yrke.fardigheter.some((p) => (p.maste ?? []).some((m) => `${p.fardighet}:${m}` === b.fardighet))) continue;
    punkter.push(punkt(namnFor(S.R, fardighetAv(S.R, b.fardighet), b.fardighet), b.fardighet.split(":")[0], null, `FV ${b.fv} gratis, som primär`));
  }
  if (yrke.valfri) punkter.push(punkt("En valfri färdighet", null, S.rp.valfri && !paborjad(S.rp.valfri) ? namn(S.rp.valfri.split(":")[0]) + (S.rp.valfri.split(":")[1] ? `: ${S.rp.valfri.split(":")[1]}` : "") : null));
  if (yrke.automatiska.length) punkter.push(punkt("Känna magi och Kunskap om magi, automatiskt med samma FV som magiskolan (s. 62, 64)", null));
  const bonus = yrke.startbonus?.find((b) => b.valEttAv);
  return [
    el("div", { class: "valkort-rutnat liten fyra" }, kort),
    el("div", { class: "valinfo" },
      el("h3", { class: "valrubrik" }, yrke.namn),
      yrke.stamning ? el("p", { class: "vallore" }, yrke.stamning) : null,
      yrke.beskrivning ? el("p", { class: "yrkestext" }, yrke.beskrivning, el("span", { class: "sida" }, ` (${kallText(S.R, yrke, `s. ${yrke.sida}`)})`)) : null,
      el("dl", { class: "valdata bred" },
        el("div", {}, el("dt", {}, "Yrkesförmåga"), el("dd", {}, yrkesformagaText(yrke))),
        yrke.villkor ? el("div", {}, el("dt", {}, "Vem"), el("dd", {}, yrkeVillkor(S.R, { ras: "-" }, yrke))) : null,
        yrke.startutrustning?.length ? el("div", {}, el("dt", {}, "Startutrustning"), el("dd", {}, yrke.startutrustning.join(" · "), el("span", { class: "hjalp" }, " (gratis)"))) : null)),
    el("div", { class: "rutor" },
      el("div", {}, el("h4", {}, "Yrkesfärdigheter"),
        el("ul", { class: "punkter" }, punkter),
        el("p", { class: "hjalp" }, "Siffran inom parentes är hur många du väljer. ",
          bonus ? `Ett av hantverken får FV ${bonus.bc} gratis. ` : "",
          "Vilka vapen, språk, hantverk och andra delval det blir väljer du i steg 4, där du också kan köpa fler yrkesfärdigheter."))),
  ];
}

// Valen inom yrkets färdigheter (vapen, språk, hantverk, alternativ och den valfria färdigheten). Visas i steg 4.
export function yrketsVal() {
  const yrke = yrkeAv(S.R, yrkeId());
  const rader = yrke.fardigheter.map((post, i) => {
    const id = `yrke-${i}`;
    const satt = (v) => { S.rp.yrkesval[i] = v; uppdatera(); };
    if (typeof post === "string") {
      const f = fardighetAv(S.R, post) ?? { namn: post };
      return el("li", {}, el("span", { class: "fnamn" }, f.namn), kortBeskrivning(post),
        f.perVal ? delvalKontroll(id, post, S.rp.yrkesval[i], satt, { yrke: true }) : null, f.perVal ? hjalpFor(post) : null,
        post === "stridskonster" ? stridskonstInfo() : null);
    }
    if (post.valPaket) {
      // Först paketet, sedan vad det innehåller (Krigarmunk, V&R s. 6–7, RB-016)
      const val = S.rp.yrkesval[i] ?? {};
      const paket = post.valPaket[val.paket];
      const valda = [].concat(val.val ?? []);
      const sattVal = (j, v) => { const ny = [...valda]; ny[j] = v; satt({ ...val, val: ny }); };
      const innehall = !paket ? null
        : paket.fasta ? el("p", { class: "hjalp" }, `Yrkesfärdigheter: ${paket.fasta.map((x) => fardighetAv(S.R, x).namn).join(" och ")}.`)
        : paket.valfria ? el("div", { class: "rad paketval" }, Array.from({ length: paket.valfria }, (_, j) =>
          fardighetsVal(`${id}-v${j}`, valda[j], (v) => sattVal(j, v), (f) => f.typ !== "primar" && magiMojlig(f), { yrke: true })))
        : el("div", { class: "rad paketval" }, Array.from({ length: paket.antal }, (_, j) =>
          delvalKontroll(`${id}-${j}`, paket.fardighet, valda[j], (v) => sattVal(j, v), { yrke: true })));
      return el("li", {}, el("span", { class: "fnamn" }, post.valPaket.map((p) => paketNamn(S.R, p)).join(" eller ")),
        valLista(id, val.paket === undefined ? "" : String(val.paket), post.valPaket.map((p, k) => [String(k), paketNamn(S.R, p)]),
          (v) => satt(v === "" ? {} : { paket: Number(v), val: [] })),
        innehall,
        paket?.fardighet ? hjalpFor(paket.fardighet) : null,
        el("p", { class: "hjalp" }, `Välj ett av alternativen och sedan vilka färdigheter det blir (${kallText(S.R, yrke, `s. ${yrke.sida}`)}).`));
    }
    if (post.valEn) {
      const val = S.rp.yrkesval[i] ?? {};
      const alt = post.valEn.map((x) => (typeof x === "string" ? x : x.fardighet));
      const f = val.id ? fardighetAv(S.R, val.id) : null;
      return el("li", {}, el("span", { class: "fnamn" }, alt.map((a) => fardighetAv(S.R, a).namn).join(" eller ")),
        val.id ? kortBeskrivning(val.id) : alt.map((a) => kortBeskrivning(a, true)),
        el("div", { class: "rad" },
          valLista(id, val.id, alt.map((a) => [a, fardighetAv(S.R, a).namn]), (v) => satt({ id: v })),
          f?.perVal ? delvalKontroll(`${id}-d`, val.id, val.sub, (v) => satt({ ...val, sub: v }), { yrke: true }) : null),
        f?.perVal ? hjalpFor(val.id) : null,
        extraFor(post) ? el("p", { class: "hjalp" }, `${storBokstav(extraFor(post))} (${kallText(S.R, yrke, `s. ${yrke.sida}`)}).`) : null);
    }
    const f = fardighetAv(S.R, post.fardighet);
    if (post.antal === null) {
      return el("li", {}, el("span", { class: "fnamn" }, `${f.namn} (obegränsat)`), kortBeskrivning(post.fardighet),
        el("p", { class: "hjalp" }, "Alla lärdomsfärdigheter räknas som yrkesfärdigheter för en lärd man. Lägg till dem i steg 11, Färdigheter."));
    }
    const varden = [].concat(S.rp.yrkesval[i] ?? []);
    // Ett förbestämt val (t.ex. Kunskap om religion för munk och paladin) ligger först och går inte att ändra
    post.maste?.forEach((m, j) => { varden[j] = m; });
    return el("li", {}, el("span", { class: "fnamn" }, `${f.namn} (${post.antal})`), kortBeskrivning(post.fardighet),
      el("div", { class: "rad" }, Array.from({ length: post.antal }, (_, j) => (j < (post.maste?.length ?? 0)
        ? el("span", { class: "fast" }, varden[j])
        : delvalKontroll(`${id}-${j}`, post.fardighet, varden[j], (v) => {
          const ny = [...varden]; ny[j] = v; satt(ny);
        }, { yrke: true })))),
      post.maste ? el("p", { class: "hjalp" }, `${post.maste.join(" och ")} ingår alltid för det här yrket (${kallText(S.R, yrke, "s. 24–25")}).`) : null,
      skolTekniker(post) ? el("p", { class: "hjalp skoltekniker" }, `Tekniker i ${skolTekniker(post)}.`) : null,
      extraFor(post) ? el("p", { class: "hjalp" }, `${storBokstav(extraFor(post))} (${kallText(S.R, yrke, `s. ${yrke.sida}`)}).`) : null,
      // Instruktionen behövs bara när något av valen går att skriva in själv
      post.antal > (post.maste?.length ?? 0) ? hjalpFor(post.fardighet) : null);
  });
  const hantverk = yrkesNycklar().filter((k) => k.startsWith("hantverk:"));
  const bonus = yrke.startbonus?.find((b) => b.valEttAv);
  if (bonus) {
    rader.push(el("li", {}, el("span", { class: "fnamn" }, `FV ${bonus.bc} gratis i ett hantverk`),
      valLista("hantverksbonus", S.rp.hantverkBonus, hantverk.map((k) => [k, k.split(":")[1]]), (v) => { S.rp.hantverkBonus = v; uppdatera(); }, hantverk.length ? "Välj hantverk …" : "Välj hantverk ovan först"),
      el("p", { class: "hjalp" }, `Hantverkaren får FV ${bonus.bc} i ett av sina tre hantverk utan att betala EP (s. 21).`)));
  }
  const yrkesrader = rader;
  return [
    el("h3", {}, `Yrkesfärdigheter för ${yrke.namn.toLowerCase()}`),
    el("ul", { class: "yrkeslista" }, yrkesrader,
      yrke.valfri ? el("li", {}, el("span", { class: "fnamn" }, "En valfri färdighet"),
        S.rp.valfri ? kortBeskrivning(S.rp.valfri.split(":")[0]) : null,
        fardighetsVal("valfri", S.rp.valfri, (v) => { S.rp.valfri = v; uppdatera(); }, (f) => f.typ !== "primar" && magiMojlig(f), { yrke: true }),
        magiInfo(S.rp.valfri),
        S.rp.valfri?.startsWith("stridskonster") ? stridskonstInfo() : null,
        S.rp.valfri ? null : el("p", { class: "hjalp" }, "Vilken sekundär färdighet som helst, som blir en yrkesfärdighet. Primära färdigheter har rollpersonen redan. En magiskola kräver ett lyckat magiförmågeslag. Det slås när du går vidare från steg 6, när INT och PSY är bestämda.")) : null),
    yrke.automatiska.length ? el("p", { class: "hjalp" }, "Får automatiskt Känna magi och Kunskap om magi med samma FV som i sin magiskola (s. 62, 64).") : null,
  ];
}
