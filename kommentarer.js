// Kommentarer på sidan (bara i utvecklarläget): ett verktyg för att märka upp det som ska snyggas till,
// t.ex. inför en designgenomgång. Slå på Kommentera, klicka på något på sidan och skriv en anteckning.
// Varje anteckning sparas i webbläsaren med en CSS-väljare till elementet, elementets text, var i appen
// det var (vy och steg) och stilen som var vald. Listan kan kopieras som text eller JSON och klistras in
// till Claude. Sidans egna knappar och fält reagerar inte på klick medan Kommentera är på.
// Startas från utvecklarlage.js; laddas aldrig utanför utvecklarläget.

const LAGRING = "chronopia-kommentarer";
const MARKORER = "chronopia-kommentarer-markorer";

const lasLista = () => { try { return JSON.parse(localStorage.getItem(LAGRING) ?? "[]") || []; } catch { return []; } };
const sparaLista = (lista) => { try { localStorage.setItem(LAGRING, JSON.stringify(lista)); } catch { /* frivilligt */ } };
const lasFlagga = (nyckel, std) => { try { const v = localStorage.getItem(nyckel); return v === null ? std : v === "ja"; } catch { return std; } };
const sparaFlagga = (nyckel, v) => { try { localStorage.setItem(nyckel, v ? "ja" : "nej"); } catch { /* frivilligt */ } };

// ------------------------------------------------------------ element
const VERKTYG = "[data-kommentarsverktyg]"; // verktygets egna delar räknas inte som sidan
const TAGGNAMN = { button: "knapp", a: "länk", input: "fält", select: "lista", textarea: "textruta", label: "etikett", img: "bild",
  h1: "rubrik", h2: "rubrik", h3: "rubrik", h4: "rubrik", p: "stycke", li: "rad i lista", ul: "lista", ol: "lista", table: "tabell",
  tr: "tabellrad", td: "tabellcell", th: "tabellrubrik", section: "avsnitt", aside: "sidoruta", nav: "meny", header: "sidhuvud", main: "huvuddel",
  fieldset: "grupp", dl: "uppställning", dt: "term", dd: "värde", svg: "bild", span: "text", div: "ruta", form: "formulär", details: "utfällbar del", summary: "rubrik för utfällbar del" };

const kortText = (t, max = 80) => { const s = (t ?? "").replace(/\s+/g, " ").trim(); return s.length > max ? s.slice(0, max - 1) + "…" : s; };
const elementText = (e) => kortText(e.matches?.("input, select, textarea") ? (e.value || e.getAttribute("placeholder") || e.getAttribute("aria-label") || "")
  : e.getAttribute?.("aria-label") || e.innerText || e.textContent || e.getAttribute?.("alt") || "");

export function beskriv(e) {
  const tagg = e.tagName.toLowerCase();
  const text = elementText(e);
  return `${TAGGNAMN[tagg] ?? tagg}${text ? ` "${kortText(text, 50)}"` : ""}`;
}

// En CSS-väljare som pekar ut elementet: närmaste id uppåt, sedan unika data-attribut eller :nth-of-type.
// Sidan ritas om ofta, så väljaren byggs av sådant som brukar bli likadant vid nästa ritning.
export function selektor(e) {
  const delar = [];
  for (let x = e; x && x.nodeType === 1 && x !== document.documentElement; x = x.parentElement) {
    if (x === document.body) { delar.unshift("body"); break; }
    if (x.id && document.querySelectorAll(`#${CSS.escape(x.id)}`).length === 1) { delar.unshift(`#${CSS.escape(x.id)}`); break; }
    const tagg = x.tagName.toLowerCase();
    const syskon = x.parentElement ? [...x.parentElement.children] : [x];
    const dataAttr = [...x.attributes].find((a) => a.name.startsWith("data-") && a.value && a.value.length < 60
      && syskon.filter((s) => s.getAttribute(a.name) === a.value).length === 1);
    let del = tagg;
    if (dataAttr) del += `[${dataAttr.name}="${CSS.escape(dataAttr.value)}"]`;
    else {
      const sammaTagg = syskon.filter((s) => s.tagName === x.tagName);
      if (sammaTagg.length > 1) del += `:nth-of-type(${sammaTagg.indexOf(x) + 1})`;
    }
    delar.unshift(del);
  }
  return delar.join(" > ");
}

const hitta = (sel) => { if (!sel) return null; try { return document.querySelector(sel); } catch { return null; } };
const synligt = (e) => { if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 || r.height > 0; };

// ------------------------------------------------------------ export
const tidText = (iso) => new Date(iso).toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short" });

export function exportText(lista) {
  const rader = [`Kommentarer från Chronopia-rollpersonsskaparen (${lista.length} st, exporterade ${tidText(new Date().toISOString())})`];
  const platser = [...new Set(lista.map((k) => k.platsNamn))];
  for (const plats of platser) {
    rader.push("", `## ${plats}`);
    lista.forEach((k, i) => {
      if (k.platsNamn !== plats) return;
      rader.push(`${i + 1}. ${k.selektor ? `${k.element} — \`${k.selektor}\`` : "Hela vyn"}`);
      if (k.text && !k.element.includes(kortText(k.text, 50))) rader.push(`   Text: "${k.text}"`);
      rader.push(...k.anteckning.split("\n").map((r, j) => (j ? "   " : "   Kommentar: ") + r));
      const om = [k.stil && `stil ${k.stil}`, k.bredd && `fönster ${k.bredd} px`, k.rollperson && `rollperson ${k.rollperson}`].filter(Boolean);
      if (om.length) rader.push(`   (${om.join(", ")})`);
    });
  }
  return rader.join("\n");
}

export const exportJson = (lista) => JSON.stringify({ format: "chronopia-kommentarer", version: 1, exporterad: new Date().toISOString(), kommentarer: lista }, null, 2);

// ------------------------------------------------------------ stil
const STIL = `
.km-verktyg { position: fixed; right: 12px; bottom: 12px; z-index: 46; display: flex; gap: 4px;
  font: 600 12px/1.3 system-ui, -apple-system, "Segoe UI", sans-serif; }
.km-knapp { all: unset; box-sizing: border-box; cursor: pointer; padding: 4px 9px; border-radius: 4px; color: #fff; background: #b4462d;
  border: 1px solid #b4462d; font: 600 12px/1.3 system-ui, -apple-system, "Segoe UI", sans-serif; white-space: nowrap; }
.km-knapp:hover, .km-knapp:focus-visible { background: #95371f; outline: 2px solid #f0a48e; outline-offset: 1px; }
.km-knapp.sekundar { background: #fff; color: #8a2f1b; }
.km-knapp.sekundar:hover, .km-knapp.sekundar:focus-visible { background: #fbe9e4; }
.km-knapp[aria-pressed="true"] { background: #1f6f4a; border-color: #1f6f4a; }
.km-knapp.fara { background: #fff; color: #9c2f24; border-color: #9c2f24; }
.km-knapp.fara.saker { background: #9c2f24; color: #fff; }
body.km-pa, body.km-pa * { cursor: crosshair !important; }
body.km-pa ${VERKTYG}, body.km-pa ${VERKTYG} * { cursor: auto !important; }
body.km-pa ${VERKTYG} button, body.km-pa ${VERKTYG} .km-knapp { cursor: pointer !important; }
.km-ram { position: fixed; z-index: 47; pointer-events: none; border: 2px dashed #b4462d; background: rgba(180, 70, 45, .08); border-radius: 3px; }
.km-ram span { position: absolute; left: -2px; top: -20px; padding: 1px 6px; border-radius: 3px; background: #b4462d; color: #fff;
  font: 600 11px/1.5 system-ui, sans-serif; white-space: nowrap; max-width: 320px; overflow: hidden; text-overflow: ellipsis; }
.km-markor { all: unset; box-sizing: border-box; position: fixed; z-index: 44; min-width: 20px; height: 20px; padding: 0 5px; border-radius: 10px 10px 10px 2px;
  background: #b4462d; color: #fff; font: 700 11px/20px system-ui, sans-serif; text-align: center; cursor: pointer;
  box-shadow: 0 1px 4px rgba(0, 0, 0, .35); border: 1px solid #fff; }
.km-markor:hover, .km-markor:focus-visible { background: #1f6f4a; }
.km-blink { animation: km-blink 1.2s ease 2; outline: 3px solid #b4462d !important; outline-offset: 2px; }
@keyframes km-blink { 50% { outline-color: transparent; } }
.km-ruta { position: fixed; z-index: 70; width: min(360px, calc(100vw - 24px)); box-sizing: border-box; padding: 12px; display: grid; gap: 8px;
  background: #fffdf9; color: #22231f; border: 1px solid #b4462d; border-radius: 6px; box-shadow: 0 10px 32px rgba(0, 0, 0, .35);
  font: 13px/1.4 system-ui, -apple-system, "Segoe UI", sans-serif; }
.km-ruta h2 { margin: 0; font: 700 13px/1.3 system-ui, sans-serif; color: #8a2f1b; }
.km-ruta .km-om { margin: 0; color: #5d5d55; font-size: 12px; overflow-wrap: anywhere; }
.km-ruta textarea { width: 100%; box-sizing: border-box; min-height: 90px; resize: vertical; padding: 6px; font: 13px/1.4 system-ui, sans-serif;
  border: 1px solid #c5c0b5; border-radius: 4px; background: #fff; color: #22231f; }
.km-rad { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.km-rad .km-hoger { margin-left: auto; display: flex; gap: 6px; }
.km-panel-bakgrund { position: fixed; inset: 0; z-index: 69; display: grid; place-items: center; padding: 16px; background: rgba(0, 0, 0, .45); }
.km-panel { width: min(100%, 720px); max-height: calc(100vh - 32px); overflow: auto; box-sizing: border-box; padding: 16px; display: grid; gap: 12px;
  background: #fffdf9; color: #22231f; border: 1px solid #b4462d; border-radius: 6px; font: 13px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif; }
.km-panel h2 { margin: 0; font: 700 15px/1.3 system-ui, sans-serif; color: #8a2f1b; }
.km-panel h3 { margin: 6px 0 0; font: 700 12px/1.3 system-ui, sans-serif; text-transform: uppercase; letter-spacing: .06em; color: #5d5d55; }
.km-panel p { margin: 0; }
.km-panel ol { margin: 0; padding: 0; list-style: none; display: grid; gap: 6px; }
.km-panel li { display: grid; gap: 4px; padding: 8px; border: 1px solid #e0dbd2; border-radius: 4px; background: #fff; }
.km-panel li .km-el { font-size: 12px; color: #5d5d55; overflow-wrap: anywhere; }
.km-panel li .km-text { white-space: pre-wrap; }
.km-panel li .km-saknas { font-size: 12px; color: #9c2f24; }
.km-panel textarea { width: 100%; box-sizing: border-box; min-height: 160px; resize: vertical; padding: 6px; border: 1px solid #c5c0b5; border-radius: 4px;
  font: 12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; background: #fff; color: #22231f; }
.km-panel label { display: inline-flex; gap: 4px; align-items: center; }
.km-status { font-size: 12px; color: #1f6f4a; min-height: 1em; }
@media print { .km-verktyg, .km-markor, .km-ram, .km-ruta, .km-panel-bakgrund { display: none !important; } }
`;

// ------------------------------------------------------------ verktyget
export function startaKommentarer(api) {
  const { el } = api;
  let lista = lasLista();
  let pa = false;
  let visaMarkorer = lasFlagga(MARKORER, true);
  let ruta = null; // öppen anteckningsruta
  let panel = null; // öppen lista
  let markerat = null; // elementet under musen i kommentarsläget

  document.head.append(el("style", {}, STIL));
  const ram = el("div", { class: "km-ram", hidden: true, "data-kommentarsverktyg": "" }, el("span"));
  const markorer = el("div", { "data-kommentarsverktyg": "" });
  const paKnapp = el("button", { type: "button", class: "km-knapp", id: "km-pa", "aria-pressed": "false",
    title: "Kommentera: klicka på något på sidan för att skriva en anteckning om det (Alt+K). Sidan reagerar inte på klick så länge det är på.",
    onclick: () => satt(!pa) });
  const listKnapp = el("button", { type: "button", class: "km-knapp sekundar", id: "km-lista", title: "Alla kommentarer, med kopiering för Claude",
    onclick: () => oppnaPanel() });
  document.body.append(el("div", { class: "km-verktyg", "data-kommentarsverktyg": "" }, paKnapp, listKnapp), ram, markorer);

  // Var i appen man är just nu
  const plats = () => {
    const { vy, aktivtSteg } = api.lage();
    if (vy !== "steg") return { plats: vy, platsNamn: { start: "Startsidan", regler: "Regelresonemang", spel: "Spelmöten och förbättring", formular: "Rollformuläret" }[vy] ?? vy };
    let synliga = api.STEG;
    try { synliga = api.synligaSteg(api.rakna()); } catch { /* alla steg duger */ }
    const i = synliga.findIndex((s) => s.id === aktivtSteg);
    return { plats: `steg:${aktivtSteg}`, platsNamn: `Steg ${i === -1 ? "" : `${i}. `}${(synliga[i] ?? api.STEG.find((s) => s.id === aktivtSteg))?.namn ?? aktivtSteg}` };
  };
  const omSidan = () => {
    const rp = api.nu();
    const raser = Array.isArray(api.R.raser) ? api.R.raser : api.R.raser?.lista ?? [];
    const ras = rp?.ras && raser.find((r) => r.id === rp.ras)?.namn;
    const yrke = rp?.yrke && (Array.isArray(api.R.yrken) ? api.R.yrken : api.R.yrken?.lista ?? []).find((y) => y.id === rp.yrke)?.namn;
    return { stil: document.documentElement.dataset.stil || "standard", bredd: window.innerWidth,
      rollperson: [ras, yrke].filter(Boolean).join(" / ") || undefined };
  };

  const visaAntal = () => {
    paKnapp.textContent = pa ? "Kommentera: på" : "Kommentera";
    listKnapp.textContent = `Kommentarer (${lista.length})`;
  };
  const spara = () => { sparaLista(lista); visaAntal(); ritaMarkorer(); if (panel) ritaPanel(); };

  // ---------------------------------------------------- markörer
  let vantar = false;
  function ritaMarkorer() {
    const { plats: har } = plats();
    const nya = [];
    if (visaMarkorer) lista.forEach((k, i) => {
      if (k.plats !== har) return;
      const e = hitta(k.selektor);
      if (!synligt(e)) return;
      const r = e.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      const m = el("button", { type: "button", class: "km-markor", "data-kommentar": k.id, title: `${i + 1}. ${kortText(k.anteckning, 120)}`,
        "aria-label": `Kommentar ${i + 1}: ${kortText(k.anteckning, 120)}`, onclick: (ev) => { ev.stopPropagation(); oppnaRuta(k, e); } }, String(i + 1));
      m.style.left = `${Math.max(2, Math.min(window.innerWidth - 24, r.right - 10))}px`;
      m.style.top = `${Math.max(2, r.top - 10)}px`;
      nya.push(m);
    });
    markorer.replaceChildren(...nya);
  }
  const ritaSnart = () => { if (vantar) return; vantar = true; requestAnimationFrame(() => { vantar = false; ritaMarkorer(); }); };
  window.addEventListener("scroll", ritaSnart, { capture: true, passive: true });
  window.addEventListener("resize", ritaSnart);
  api.efterRita(ritaSnart);

  // ---------------------------------------------------- kommentarsläget
  const arVerktyg = (e) => Boolean(e?.closest?.(VERKTYG));
  function visaRam(e) {
    if (!e) { ram.hidden = true; return; }
    const r = e.getBoundingClientRect();
    Object.assign(ram.style, { left: `${r.left - 2}px`, top: `${r.top - 2}px`, width: `${r.width + 4}px`, height: `${r.height + 4}px` });
    ram.firstChild.textContent = beskriv(e);
    ram.firstChild.style.top = r.top < 22 ? `${r.height + 4}px` : "-20px";
    ram.hidden = false;
  }
  const flytta = (ev) => {
    if (ruta) return;
    const e = ev.target;
    markerat = e && e.nodeType === 1 && !arVerktyg(e) && e !== document.body && e !== document.documentElement ? e : null;
    visaRam(markerat);
  };
  // Klick och tryck på sidan fångas innan appen ser dem, så att inget ändras när man kommenterar
  const fanga = (ev) => {
    if (arVerktyg(ev.target)) return;
    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation();
    if (ev.type !== "click" || ruta) return;
    const e = ev.target.nodeType === 1 ? ev.target : ev.target.parentElement;
    if (!e || e === document.documentElement) return;
    oppnaRuta(null, e === document.body ? null : e, { x: ev.clientX, y: ev.clientY });
  };
  const HANDELSER = ["click", "mousedown", "mouseup", "pointerdown", "pointerup", "dblclick", "auxclick", "contextmenu", "submit", "touchstart"];
  function satt(nytt) {
    if (nytt === pa) return;
    pa = nytt;
    document.body.classList.toggle("km-pa", pa);
    paKnapp.setAttribute("aria-pressed", String(pa));
    for (const typ of HANDELSER) (pa ? document.addEventListener : document.removeEventListener).call(document, typ, fanga, { capture: true, passive: false });
    (pa ? document.addEventListener : document.removeEventListener).call(document, "mousemove", flytta, true);
    if (!pa) { stangRuta(); visaRam(null); markerat = null; }
    visaAntal();
  }
  document.addEventListener("keydown", (ev) => {
    if (ev.altKey && !ev.ctrlKey && !ev.metaKey && ev.code === "KeyK") { ev.preventDefault(); satt(!pa); return; }
    if (ev.key === "Escape") {
      if (ruta) { ev.stopPropagation(); stangRuta(); }
      else if (panel) { ev.stopPropagation(); stangPanel(); }
      else if (pa) { ev.stopPropagation(); satt(false); }
    }
  }, true);

  // ---------------------------------------------------- anteckningsrutan
  function stangRuta() { ruta?.remove(); ruta = null; if (!pa) visaRam(null); }
  // k: befintlig kommentar (redigera) eller null (ny). e: elementet (null = hela vyn).
  function oppnaRuta(k, e, punkt) {
    stangRuta();
    let mal = e;
    const om = el("p", { class: "km-om" });
    const visaMal = () => {
      om.textContent = `${plats().platsNamn} · ${mal ? beskriv(mal) : k?.element ?? "hela vyn"}`;
      if (mal) visaRam(mal);
    };
    const text = el("textarea", { id: "km-text", placeholder: "Vad vill du ändra? T.ex. \"för trångt\", \"rubriken låter stel\", \"lite konst här?\"" });
    text.value = k?.anteckning ?? "";
    const sparaKnapp = el("button", { type: "button", class: "km-knapp", id: "km-spara", onclick: () => {
      const anteckning = text.value.trim();
      if (!anteckning) { text.focus(); return; }
      const nyttMal = mal && (!k || mal !== hitta(k.selektor)) ? { selektor: selektor(mal), element: beskriv(mal), text: elementText(mal) } : {};
      if (k) Object.assign(k, nyttMal, { anteckning, andrad: new Date().toISOString() });
      else lista.push({ id: `k${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, skapad: new Date().toISOString(),
        ...plats(), selektor: mal ? selektor(mal) : null, element: mal ? beskriv(mal) : "Hela vyn", text: mal ? elementText(mal) : "",
        anteckning, ...omSidan() });
      stangRuta();
      spara();
    } }, "Spara");
    const storre = el("button", { type: "button", class: "km-knapp sekundar", id: "km-storre", title: "Markera det som ligger runt omkring i stället",
      onclick: () => { if (mal?.parentElement && mal.parentElement !== document.body) { mal = mal.parentElement; visaMal(); } } }, "Större del");
    const taBort = k && el("button", { type: "button", class: "km-knapp fara", id: "km-ta-bort", onclick: () => {
      lista = lista.filter((x) => x !== k); stangRuta(); spara();
    } }, "Ta bort");
    ruta = el("div", { class: "km-ruta", role: "dialog", "aria-label": "Kommentar", "data-kommentarsverktyg": "",
      onkeydown: (ev) => { if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); sparaKnapp.click(); } } },
      el("h2", {}, k ? "Ändra kommentar" : "Ny kommentar"), om, text,
      el("div", { class: "km-rad" }, mal ? storre : null, taBort,
        el("span", { class: "km-hoger" }, el("button", { type: "button", class: "km-knapp sekundar", id: "km-avbryt", onclick: stangRuta }, "Avbryt"), sparaKnapp)));
    document.body.append(ruta);
    visaMal();
    // Placera rutan vid klicket (eller elementet), inom fönstret
    const r = mal?.getBoundingClientRect();
    const x = punkt?.x ?? r?.left ?? window.innerWidth / 2 - 180;
    const y = punkt?.y ?? r?.bottom ?? 80;
    const { width: b, height: h } = ruta.getBoundingClientRect();
    ruta.style.left = `${Math.max(12, Math.min(window.innerWidth - b - 12, x + 8))}px`;
    ruta.style.top = `${y + 12 + h > window.innerHeight - 12 ? Math.max(12, y - h - 12) : y + 12}px`;
    text.focus();
  }

  // ---------------------------------------------------- listan och exporten
  let format = "text";
  function stangPanel() { panel?.remove(); panel = null; }
  function oppnaPanel() { stangRuta(); stangPanel(); panel = el("div", { class: "km-panel-bakgrund", "data-kommentarsverktyg": "",
    onclick: (ev) => { if (ev.target === panel) stangPanel(); } }); document.body.append(panel); ritaPanel(); }
  function ritaPanel() {
    const { plats: har, platsNamn } = plats();
    const status = el("p", { class: "km-status", role: "status" });
    const utdata = el("textarea", { id: "km-export", readonly: true, "aria-label": "Kommentarerna att kopiera" });
    utdata.value = format === "json" ? exportJson(lista) : exportText(lista);
    const kopiera = async () => {
      try { await navigator.clipboard.writeText(utdata.value); status.textContent = "Kopierat. Klistra in det till Claude."; }
      catch {
        utdata.focus(); utdata.select();
        let gick = false;
        try { gick = document.execCommand("copy"); } catch { /* inte tillåtet */ }
        status.textContent = gick ? "Kopierat. Klistra in det till Claude." : "Kopieringen stoppades av webbläsaren. Texten är markerad: tryck Cmd+C (eller Ctrl+C).";
      }
    };
    let saker = false;
    const rensa = el("button", { type: "button", class: "km-knapp fara", id: "km-rensa", onclick: () => {
      if (!saker) { saker = true; rensa.classList.add("saker"); rensa.textContent = "Säker? Klicka igen för att ta bort alla"; return; }
      lista = []; spara();
    } }, "Ta bort alla");
    const platser = [...new Set(lista.map((k) => k.platsNamn))];
    const panelen = el("div", { class: "km-panel", role: "dialog", "aria-modal": "true", "aria-labelledby": "km-rubrik" },
      el("div", { class: "km-rad" }, el("h2", { id: "km-rubrik" }, `Kommentarer (${lista.length})`),
        el("span", { class: "km-hoger" }, el("button", { type: "button", class: "km-knapp sekundar", id: "km-stang", onclick: stangPanel }, "Stäng"))),
      el("p", {}, "Slå på Kommentera (Alt+K) och klicka på något på sidan för att skriva en anteckning. Kommentarerna sparas i den här webbläsaren. ",
        "När du är klar: kopiera listan nedan och klistra in den till Claude."),
      el("div", { class: "km-rad" },
        el("button", { type: "button", class: "km-knapp sekundar", id: "km-allman", onclick: () => { stangPanel(); oppnaRuta(null, null); } }, `Kommentar om hela vyn (${platsNamn})`),
        el("label", {}, el("input", { type: "checkbox", id: "km-visa-markorer", checked: visaMarkorer,
          onchange: (ev) => { visaMarkorer = ev.target.checked; sparaFlagga(MARKORER, visaMarkorer); ritaMarkorer(); } }), "Visa markörer på sidan")),
      lista.length ? platser.map((p) => [el("h3", {}, p), el("ol", {}, lista.map((k, i) => {
        if (k.platsNamn !== p) return null;
        const e = k.plats === har ? hitta(k.selektor) : null;
        return el("li", { "data-kommentar": k.id },
          el("span", { class: "km-el" }, `${i + 1}. ${k.element}${k.selektor ? ` · ${k.selektor}` : ""}`),
          el("span", { class: "km-text" }, k.anteckning),
          k.plats === har && k.selektor && !synligt(e) ? el("span", { class: "km-saknas" }, "Syns inte just nu (elementet kan ha flyttats eller vara dolt).") : null,
          el("div", { class: "km-rad" },
            k.plats === har && synligt(e) ? el("button", { type: "button", class: "km-knapp sekundar", onclick: () => {
              stangPanel(); e.scrollIntoView({ block: "center" }); e.classList.add("km-blink"); setTimeout(() => e.classList.remove("km-blink"), 2600);
            } }, "Visa") : null,
            el("button", { type: "button", class: "km-knapp sekundar", "data-andra": k.id, onclick: () => { stangPanel(); oppnaRuta(k, k.plats === har && synligt(e) ? e : null); } }, "Ändra"),
            el("button", { type: "button", class: "km-knapp fara", "data-ta-bort": k.id, onclick: () => { lista = lista.filter((x) => x !== k); spara(); } }, "Ta bort")));
      }))]) : el("p", {}, "Inga kommentarer än."),
      el("h3", {}, "Att kopiera"),
      el("div", { class: "km-rad" },
        el("label", {}, el("input", { type: "radio", name: "km-format", value: "text", checked: format === "text", onchange: () => { format = "text"; ritaPanel(); } }), "Text"),
        el("label", {}, el("input", { type: "radio", name: "km-format", value: "json", checked: format === "json", onchange: () => { format = "json"; ritaPanel(); } }), "JSON"),
        el("span", { class: "km-hoger" }, el("button", { type: "button", class: "km-knapp", id: "km-kopiera", onclick: kopiera }, "Kopiera"))),
      utdata, status,
      lista.length ? el("div", { class: "km-rad" }, el("span", { class: "km-hoger" }, rensa)) : null);
    panel.replaceChildren(panelen);
  }

  visaAntal();
  ritaMarkorer();
  // För automatiska tester
  window.chronopiaKommentarer = { lista: () => structuredClone(lista), pa: () => pa, plats: () => plats().plats, satt, text: () => exportText(lista), json: () => exportJson(lista) };
}
