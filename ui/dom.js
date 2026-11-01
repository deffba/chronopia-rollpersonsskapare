// Små hjälpfunktioner för att skapa element och formatera tal.
export const $ = (sel, rot = document) => rot.querySelector(sel);
export const el = (tagg, attr = {}, ...barn) => {
  const e = document.createElement(tagg);
  for (const [k, v] of Object.entries(attr)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (k === "class") e.className = v;
    else if (k === "html") e.innerHTML = v;
    else e.setAttribute(k, v === true ? "" : v);
  }
  for (const b of barn.flat(Infinity)) if (b !== null && b !== undefined && b !== false) e.append(b.nodeType ? b : String(b));
  return e;
};
export const slaT = (antal, sidor) => Array.from({ length: antal }, () => 1 + Math.floor(Math.random() * sidor)).reduce((a, b) => a + b, 0);
export const sm = (n) => n.toLocaleString("sv-SE") + " sm";
export const kg = (n) => n.toLocaleString("sv-SE");
