// Widunder och Wretler: ett tillfälligt läge för en egen kampanj med egna husregler.
// Läget slås på med den stora knappen Widunder och Wretler i steg 0 och sparas i rollpersonen (rp.wretler).
// Husreglerna läggs in senare och ska då kopplas in här, så att allt som hör till läget finns på ett ställe.
//
// Läget ersätts av kampanjer med användarkonton. Ta då bort det så här:
//   1. den här filen,
//   2. knappen wretlerKnapp() och importen i steg/bocker.js,
//   3. fältet wretler i TOM() i tillstand.js,
//   4. bilden bilder/wretler-adam.webp,
//   5. stilarna under "Widunder och Wretler" i index.html och testerna i test/e2e/startsida.cjs.
import { S, uppdatera } from "./tillstand.js";
import { el } from "./ui/dom.js";

export const WRETLER = {
  namn: "Widunder och Wretler",
  // Husreglerna för läget. Tom tills reglerna läggs in; varje regel blir en post här som regelmotorn och stegen kan fråga efter.
  husregler: [],
};

// Om rollpersonen skapas i läget Widunder och Wretler
export const wretlerAktiv = (rp = S.rp) => Boolean(rp?.wretler);

// Slår på eller av läget. Det går bara medan böckerna går att välja, alltså innan en ras är vald.
export function valjWretler(pa) {
  if (S.rp.ras) return false;
  S.rp.wretler = Boolean(pa);
  return true;
}

// Den stora knappen överst i steg 0 som slår på eller av läget. Den låses med böckerna när en ras är vald.
export function wretlerKnapp() {
  const pa = wretlerAktiv();
  const last = Boolean(S.rp.ras);
  return el("button", { type: "button", id: "wretler-knapp", class: "wretler-knapp" + (pa ? " vald" : ""), "aria-pressed": String(pa), disabled: last,
    onclick: () => { if (valjWretler(!pa)) uppdatera(); } },
    el("img", { src: "bilder/wretler-adam.webp", alt: "", width: 227, height: 280, class: "wretler-bild" }),
    el("span", { class: "wretler-text" },
      el("span", { class: "startknapp-namn" }, WRETLER.namn),
      el("span", { class: "startknapp-text" }, "Väl mött! Skapa en rollperson enligt den gode Adams anvisningar och anmaningar."),
      el("span", { class: "wretler-status" }, pa ? (last ? "Husreglerna gäller för rollpersonen." : "Valt. Tryck igen för att skapa utan husreglerna.")
        : last ? "Rollpersonen skapas utan husreglerna." : "")));
}
