// Små hjälpfunktioner för att skapa element och formatera tal.
export const $ = (sel, rot = document) => rot.querySelector(sel);
const LYSSNARE = Symbol("lyssnare"); // händelsefunktionerna som el() satte, så att morfa kan byta ut dem
export const el = (tagg, attr = {}, ...barn) => {
  const e = document.createElement(tagg);
  for (const [k, v] of Object.entries(attr)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith("on")) { e.addEventListener(k.slice(2), v); (e[LYSSNARE] ??= {})[k.slice(2)] = v; }
    else if (k === "class") e.className = v;
    else if (k === "html") e.innerHTML = v;
    else e.setAttribute(k, v === true ? "" : v);
  }
  for (const b of barn.flat(Infinity)) if (b !== null && b !== undefined && b !== false) e.append(b.nodeType ? b : String(b));
  return e;
};
export const slaT = (antal, sidor) => Array.from({ length: antal }, () => 1 + Math.floor(Math.random() * sidor)).reduce((a, b) => a + b, 0);
// Ett gemensamt talformat: toLocaleString skapar ett nytt format vid varje anrop, vilket märks i långa listor
const SV = new Intl.NumberFormat("sv-SE");
export const svTal = (n) => SV.format(n); // samma text som n.toLocaleString("sv-SE")
export const sm = (n) => svTal(n) + " sm";
export const kg = (n) => svTal(n);

// Ändrar barnen i rot så att de blir som nya (element, text eller strängar) men behåller de element som redan
// finns där taggen är densamma. Webbläsaren behöver då bara räkna om det som faktiskt ändrades, i stället för
// att bygga upp hela delen på nytt vid varje ändring; det som står still (hovring, fokus, skrollning) får vara kvar.
// Fungerar för delar byggda med el() utan referenser till enskilda element. ersatt(nytt) kan säga att ett
// element ska bytas ut helt, t.ex. för att en animering ska börja om.
export function morfa(rot, nya, { ersatt } = {}) {
  const barn = [nya].flat(Infinity).filter((b) => b !== null && b !== undefined && b !== false)
    .map((b) => (b.nodeType ? b : document.createTextNode(String(b))));
  let gammal = rot.firstChild;
  for (const ny of barn) {
    if (ny === gammal) { gammal = gammal.nextSibling; continue; } // samma element som redan står där
    if (gammal && gammal.nodeType === ny.nodeType && gammal.nodeName === ny.nodeName && !ersatt?.(ny)) {
      if (ny.nodeType === Node.ELEMENT_NODE) morfaElement(gammal, ny, ersatt);
      else if (gammal.nodeValue !== ny.nodeValue) gammal.nodeValue = ny.nodeValue;
      gammal = gammal.nextSibling;
    } else rot.insertBefore(ny, gammal);
  }
  while (gammal) { const nasta = gammal.nextSibling; gammal.remove(); gammal = nasta; }
}
function morfaElement(g, n, ersatt) {
  for (const { name } of [...g.attributes]) if (!n.hasAttribute(name)) g.removeAttribute(name);
  for (const { name, value } of n.attributes) if (g.getAttribute(name) !== value) g.setAttribute(name, value);
  const fore = g[LYSSNARE] ?? {};
  const efter = n[LYSSNARE] ?? {};
  for (const [typ, fn] of Object.entries(fore)) if (efter[typ] !== fn) g.removeEventListener(typ, fn);
  for (const [typ, fn] of Object.entries(efter)) if (fore[typ] !== fn) g.addEventListener(typ, fn);
  g[LYSSNARE] = n[LYSSNARE];
  morfa(g, [...n.childNodes], { ersatt });
  // Formulärfältens värden är egenskaper, inte bara attribut
  if ("value" in n && n.value !== g.value && (g.tagName === "INPUT" || g.tagName === "TEXTAREA" || g.tagName === "SELECT")) g.value = n.value;
  if (g.tagName === "INPUT" && g.checked !== n.checked) g.checked = n.checked;
  if (g.tagName === "OPTION" && g.selected !== n.selected) g.selected = n.selected;
}
