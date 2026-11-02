// Steg 0: vilka böcker rollpersonen skapas med. Grundreglerna är alltid med.
// Böckerna står i regler/bocker.json. En bok som inte är inlagd än visas med "(Kommer snart!)" och går inte att välja.
// Valet sparas i rollpersonen (rp.bocker) och låses när skapandet har börjat, det vill säga när en ras är vald.
import { nivaer, valfriaRegler } from "../regelmotor.js";
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
  if (!nivaer(S.R, S.rp)?.[S.rp.niva]) S.rp.niva = 0; // utan en bok med nivåer gäller grundreglernas 125 BP
  S.rp.valfriaRegler = (S.rp.valfriaRegler ?? []).filter((id) => valfriaRegler(S.R, S.rp).some((v) => v.id === id));
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
  // Erfarenhetsnivån: BP från start och antal särskilda förmågor (V&R s. 3, RB-001)
  const lista = nivaer(S.R, S.rp);
  const nivaval = lista ? el("section", { class: "bokgrupp", id: "nivaval" },
    el("h3", {}, "Erfarenhetsnivå"),
    el("p", { class: "hjalp" }, `Hur erfaren rollpersonen är när den skapas. Nivån ger bakgrundspoäng från start och hur många gånger du slår för särskilda förmågor i steg 7 (s. ${lista[0].sida}).`),
    el("ul", { class: "boklista" }, lista.map((n, i) => el("li", { class: "bokrad" + ((S.rp.niva ?? 0) === i ? " vald" : "") },
      el("label", {},
        el("input", { type: "radio", name: "niva", "data-niva": i, checked: (S.rp.niva ?? 0) === i, disabled: last,
          onchange: () => { S.rp.niva = i; uppdatera(); } }),
        el("span", { class: "boknamn" }, n.namn),
        el("span", { class: "bok-status" }, `${n.bp} BP · ${n.formagor} särskild${n.formagor > 1 ? "a" : ""} förmåg${n.formagor > 1 ? "or" : "a"}`),
        el("span", { class: "bok-status niva-text" }, n.beskrivning)))))) : null;
  // Valfria regler från de valda böckerna (Syn och hörsel, V&R s. 3, RB-002)
  const regler = valfriaRegler(S.R, S.rp);
  const regelval = regler.length ? el("section", { class: "bokgrupp", id: "valfria-regler" },
    el("h3", {}, "Valfria regler"),
    el("p", { class: "hjalp" }, "Regler som böckerna föreslår men som spelledaren väljer om de gäller."),
    el("ul", { class: "boklista" }, regler.map((v) => {
      const pa = (S.rp.valfriaRegler ?? []).includes(v.id);
      return el("li", { class: "bokrad" + (pa ? " vald" : "") },
        el("label", {},
          el("input", { type: "checkbox", "data-regel": v.id, checked: pa, disabled: last,
            onchange: (e) => { S.rp.valfriaRegler = e.target.checked ? [...(S.rp.valfriaRegler ?? []), v.id] : S.rp.valfriaRegler.filter((x) => x !== v.id); uppdatera(); } }),
          el("span", { class: "boknamn" }, v.namn),
          el("span", { class: "bok-status" }, `${bokAv(v.kalla.bok).namn} s. ${v.sida}`),
          el("span", { class: "bok-status niva-text" }, v.beskrivning)));
    }))) : null;
  return [
    el("p", { class: "hjalp" }, "Välj vilka böcker rollpersonen ska skapas med. Spelledaren bestämmer vilka böcker som gäller i kampanjen. ",
      "Grundreglerna är alltid med. Expansionerna läggs in i appen efter hand."),
    last ? el("p", { class: "hjalp bok-last" }, "Valet är låst eftersom skapandet har börjat. Börja om med Ny rollperson i menyn för att välja andra böcker.") : null,
    el("div", { class: "bokgrupper" }, S.R.bocker.grupper.map((g) => el("section", { class: "bokgrupp" },
      el("h3", {}, g),
      el("ul", { class: "boklista" }, S.R.bocker.lista.filter((b) => b.grupp === g).map(rad)))), nivaval, regelval),
  ];
}
