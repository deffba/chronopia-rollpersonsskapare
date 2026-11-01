// Steg 0: vilka böcker rollpersonen skapas med. Grundreglerna är alltid med.
// Böckerna står i regler/bocker.json. En bok som inte är inlagd än visas med "(Kommer snart!)" och går inte att välja.
// Valet sparas i rollpersonen (rp.bocker) och låses när skapandet har börjat, det vill säga när en ras är vald.
import { S, uppdatera } from "../tillstand.js";
import { el } from "../ui/dom.js";

export const bokAv = (id) => S.R.bocker.lista.find((b) => b.id === id);
export const lastaBocker = () => Boolean(S.rp.ras);

// Slår på eller av en bok. Böcker som boken kräver följer med; stängs en bok av försvinner krav som ingen annan vald bok behöver.
export function valjBok(id, pa) {
  const valda = new Set(S.rp.bocker);
  if (pa) {
    const lagg = (b) => { valda.add(b); for (const k of bokAv(b)?.kraver ?? []) lagg(k); };
    lagg(id);
  } else {
    valda.delete(id);
    const behovs = new Set([...valda].flatMap((b) => bokAv(b)?.kraver ?? []));
    for (const k of bokAv(id)?.kraver ?? []) if (!behovs.has(k) && !S.rp.bockerManuellt?.includes(k)) valda.delete(k);
  }
  S.rp.bocker = S.R.bocker.lista.filter((b) => b.alltid || valda.has(b.id)).map((b) => b.id);
  uppdatera();
}

export function stegBocker() {
  const last = lastaBocker();
  const valda = new Set(S.rp.bocker);
  const kravsAv = (id) => S.R.bocker.lista.filter((b) => valda.has(b.id) && b.kraver.includes(id)).map((b) => b.namn);
  const rad = (bok) => {
    const kommer = bok.status !== "inlagd";
    const kravd = kravsAv(bok.id);
    const vald = bok.alltid || valda.has(bok.id);
    const lastRad = bok.alltid || kommer || last || kravd.length > 0;
    return el("li", { class: "bokrad" + (kommer ? " kommer-snart" : "") + (vald ? " vald" : "") },
      el("label", {},
        el("input", { type: "checkbox", "data-bok": bok.id, checked: vald, disabled: lastRad,
          onchange: (e) => valjBok(bok.id, e.target.checked) }),
        el("span", { class: "boknamn" }, bok.namn),
        kommer ? el("em", { class: "bok-status" }, "(Kommer snart!)") : null,
        bok.alltid ? el("span", { class: "bok-status" }, "Alltid med") : null,
        !bok.alltid && kravd.length ? el("span", { class: "bok-status" }, `Låst – krävs av ${kravd.join(", ")}`) : null));
  };
  return [
    el("p", { class: "hjalp" }, "Välj vilka böcker rollpersonen ska skapas med. Spelledaren bestämmer vilka böcker som gäller i kampanjen. ",
      "Grundreglerna är alltid med. Expansionerna läggs in i appen efter hand."),
    last ? el("p", { class: "hjalp bok-last" }, "Valet är låst eftersom skapandet har börjat. Börja om med Ny rollperson i menyn för att välja andra böcker.") : null,
    el("div", { class: "bokgrupper" }, S.R.bocker.grupper.map((g) => el("section", { class: "bokgrupp" },
      el("h3", {}, g),
      el("ul", { class: "boklista" }, S.R.bocker.lista.filter((b) => b.grupp === g).map(rad))))),
  ];
}
