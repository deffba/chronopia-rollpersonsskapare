// Wretler och Wålnader: ett tillfälligt läge för en egen kampanj med egna husregler.
// Läget slås på med knappen Wretler och Wålnader på startsidan och sparas i rollpersonen (rp.wretler).
// Husreglerna läggs in senare och ska då kopplas in här, så att allt som hör till läget finns på ett ställe.
//
// Läget ersätts av kampanjer med användarkonton. Ta då bort det så här:
//   1. den här filen,
//   2. kortet "start-wretler" och importen i ui/startsida.js,
//   3. rutan wretlerRuta() och importen i steg/bocker.js,
//   4. fältet wretler i TOM() i tillstand.js,
//   5. stilarna under "Wretler och Wålnader" i index.html och testerna i test/e2e/startsida.cjs.
import { S, uppdatera } from "./tillstand.js";
import { el } from "./ui/dom.js";

export const WRETLER = {
  namn: "Wretler och Wålnader",
  // Husreglerna för läget. Tom tills reglerna läggs in; varje regel blir en post här som regelmotorn och stegen kan fråga efter.
  husregler: [],
};

// Om rollpersonen skapas i läget Wretler och Wålnader
export const wretlerAktiv = (rp = S.rp) => Boolean(rp?.wretler);

// Slår på eller av läget. Det går bara medan böckerna går att välja, alltså innan en ras är vald.
export function valjWretler(pa) {
  if (S.rp.ras) return false;
  S.rp.wretler = Boolean(pa);
  return true;
}

// Rutan överst i steg 0 som visar att läget är på
export function wretlerRuta() {
  if (!wretlerAktiv()) return null;
  return el("section", { class: "wretler-ruta", id: "wretler-ruta" },
    el("h3", {}, WRETLER.namn),
    el("p", { class: "hjalp" }, "Rollpersonen skapas med husreglerna för Wretler och Wålnader. ",
      WRETLER.husregler.length ? null : "Husreglerna är inte inlagda än, så tills vidare gäller böckernas regler."),
    S.rp.ras ? null : el("button", { type: "button", class: "knapp", id: "wretler-av",
      onclick: () => { valjWretler(false); uppdatera(); } }, "Skapa utan husreglerna"));
}
