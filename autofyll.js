// Automatisk ifyllning i utvecklarläget. När den är på fylls stegets obligatoriska val i så fort steget visas:
// listor och textfält som är tomma, särskilda förmågans val, startpaketets vapen och alla tärningsslag.
// Ras och yrke väljer spelaren själv, och knapparna Föreslå värden och Fördela EP används aldrig.
// Bara tomma val fylls i, så det som spelaren själv har valt ändras inte. Byts yrket fylls det nya yrkets val i.
import { GRUNDEGENSKAPER, rasAv, yrkeAv, fardighetAv, paborjad, passarBland, kanAnvandaVapen, varukatalog } from "./regelmotor.js";

const LAGRING = "chronopia-dev-autofyll";
const slaT = (antal, sidor) => Array.from({ length: antal }, () => 1 + Math.floor(Math.random() * sidor)).reduce((a, b) => a + b, 0);
const klar = (v) => typeof v === "string" && !paborjad(v);
const MAGI = ["kanna-magi", "magisk-kanalisering", "magistudier", "animism", "elementarmagi", "mentalism"];
const NAMN = { Man: ["Brokk", "Aldric", "Toran", "Varik", "Hjalmar", "Cedric"], Kvinna: ["Ysolde", "Maren", "Liria", "Tova", "Sigrun", "Elva"] };
const valj = (lista) => lista[Math.floor(Math.random() * lista.length)];

// Fyller i det som saknas i steget. Ger true om något ändrades.
export function fyllSteg(api, autoDelval, steg, { slag = true } = {}) {
  const { R } = api;
  const rp = api.nu();
  const res = api.rakna();
  const kvar = api.saknasPerSteg(res)[steg] ?? [];
  if (!kvar.length) return false;
  const fore = JSON.stringify(rp);
  const anvanda = new Set([...api.yrkesNycklar(), ...rp.rasval, ...rp.extraYrkesfardigheter, rp.valfri, ...rp.sekundara].filter(Boolean));
  const ta = (fid, val) => { anvanda.add(`${fid}:${val}`); return val; };
  const delval = (fid) => ta(fid, autoDelval(api, rp, fid, anvanda));

  if (steg === "ras" && rp.ras) {
    const valfriRas = rasAv(R, rp.ras).primara.find((p) => p.valfri)?.valfri;
    if (valfriRas && !rp.rasval.some(klar)) rp.rasval = [`${valfriRas}:${delval(valfriRas)}`];
  }

  if (steg === "extra") {
    const yrke = yrkeAv(R, rp.yrke);
    yrke.fardigheter.forEach((post, i) => {
      const val = rp.yrkesval[i];
      if (typeof post === "string") {
        if (fardighetAv(R, post)?.perVal && !klar(val)) rp.yrkesval[i] = delval(post);
      } else if (post.valEn) {
        const id = val?.id ?? (typeof post.valEn[0] === "string" ? post.valEn[0] : post.valEn[0].fardighet);
        const perVal = fardighetAv(R, id)?.perVal;
        if (!val?.id) rp.yrkesval[i] = perVal ? { id, sub: delval(id) } : { id };
        else if (perVal && !klar(val.sub)) rp.yrkesval[i] = { ...val, sub: delval(id) };
      } else if (post.antal) {
        const lista = [].concat(val ?? []);
        (post.maste ?? []).forEach((m, j) => { lista[j] = m; anvanda.add(`${post.fardighet}:${m}`); });
        for (let j = 0; j < post.antal; j++) if (!klar(lista[j])) lista[j] = delval(post.fardighet);
        rp.yrkesval[i] = lista;
      }
    });
    if (yrke.valfri && !klar(rp.valfri)) {
      const har = new Set(api.yrkesNycklar().map((n) => n.split(":")[0]));
      const kan = (f) => f.typ === "sekundar" && !f.perVal && !har.has(f.id) && !MAGI.includes(f.id);
      rp.valfri = R.fardigheter.lista.find(kan)?.id ?? "";
    }
    if (yrke.startbonus?.some((b) => b.valEttAv) && !api.yrkesNycklar().includes(rp.hantverkBonus)) {
      rp.hantverkBonus = api.yrkesNycklar().find((n) => n.startsWith("hantverk:")) ?? "";
    }
  }

  if (steg === "kon") {
    if (!rp.kon) rp.kon = valj(["Man", "Kvinna"]);
    if (!rp.namn.trim()) rp.namn = valj(NAMN[rp.kon] ?? NAMN.Man);
    if (!rp.spelare.trim()) rp.spelare = "Test";
  }

  if (steg === "egenskaper" && rp.grundvarden) {
    // Ett slutvärde under 3 efter ras och ålder höjs bara precis så mycket som behövs
    for (const g of GRUNDEGENSKAPER) {
      const slut = res.grundegenskaper[g];
      if (slut < 3) rp.grundvarden = { ...rp.grundvarden, [g]: Math.min(18, rp.grundvarden[g] + 3 - slut) };
    }
  }

  // Magiförmågeslaget görs i steg 6 eller 11, beroende på var magiskolan kom ifrån
  if (slag && kvar.includes("Magiförmågeslaget") && rp.magiformaga?.slag == null) rp.magiformaga = { slag: slaT(1, 100) };

  if (steg === "formagor") fyllFormaga(api, autoDelval, anvanda, slag);

  // Slagen i steg 8–10 görs med de BP som är lagda (inga från början). Ett upplåst slag slås inte om automatiskt.
  if (slag) {
    if (steg === "svardshand" && rp.svardshand.slag === null) rp.svardshand = { ...rp.svardshand, slag: slaT(2, 6) };
    if (steg === "stand" && rp.socialtStand.slag === null && !rp.socialtStand.valt) rp.socialtStand = { ...rp.socialtStand, slag: slaT(2, 6) };
    if (steg === "kapital" && rp.startkapital.slag === null) rp.startkapital = { ...rp.startkapital, slag: slaT(2, 6) };
  }

  if (steg === "fardigheter") {
    // Stridskonster: stilens första teknik
    for (const f of res.fardigheter.filter((x) => x.tekniker && !x.tekniker.length)) {
      rp.stridskonstTekniker = { ...rp.stridskonstTekniker, [f.nyckel]: [R.fardigheter.stridskonstTekniker[0][0]] };
      rp.stridskonstFardig = { ...rp.stridskonstFardig, [f.nyckel]: true };
    }
  }

  if (steg === "utrustning" && rp.startpaket.valt && !rp.startpaket.vapen) {
    // Startpaketets vapen: helst ett som rollpersonen har FV i
    const varden = res.grundegenskaper;
    const kanna = new Set(res.fardigheter.filter((f) => f.nyckel.startsWith("vapen:") && f.fv > 0).map((f) => f.nyckel.split(":")[1]));
    const vapen = varukatalog(R).filter((x) => ["Närstridsvapen", "Avståndsvapen", "Kastvapen"].includes(x.kategori)
      && x.pris <= R.utrustning.startpaket.vapenMaxPris && kanAnvandaVapen(R, x.namn, varden))
      .sort((a, b) => Number(kanna.has(b.namn)) - Number(kanna.has(a.namn)));
    if (vapen.length) rp.startpaket = { ...rp.startpaket, vapen: vapen[0].namn };
  }

  return JSON.stringify(rp) !== fore;
}

// Särskilda förmågor: slaget görs när BP är lagda, och sedan förmågans val
function fyllFormaga(api, autoDelval, anvanda, slag) {
  const { R } = api;
  const rp = api.nu();
  const s = rp.sarskildaFormagor;
  if (slag && s.bp && (s.slag === null || s.slag === undefined)) {
    rp.sarskildaFormagor = { ...s, slag: slaT(2, 20), val: [] };
    rp.sarskildaFormagor.formaga = api.rakna().sarskildFormaga?.namn;
  }
  const sf = api.rakna().sarskildFormaga;
  (sf?.regel ?? []).forEach((del, i) => {
    const val = rp.sarskildaFormagor.val ?? [];
    const satt = (v) => { const ny = [...(rp.sarskildaFormagor.val ?? [])]; ny[i] = v; rp.sarskildaFormagor = { ...rp.sarskildaFormagor, val: ny }; };
    const gar = () => !api.rakna().fel.length;
    if (del.typ === "fv" && del.valj) {
      const valda = [].concat(val[i] ?? []);
      for (let j = 0; j < del.valj; j++) {
        if (valda[j]) continue;
        for (const nyckel of kandidater(api, autoDelval, del.bland, anvanda)) {
          if (valda.includes(nyckel) || !passarBland(R, api.motorIndata(), nyckel, del.bland)) continue;
          valda[j] = nyckel;
          satt([...valda]);
          if (gar()) { anvanda.add(nyckel); break; }
          valda[j] = undefined;
          satt([...valda]);
        }
      }
    }
    if (del.typ === "egenskapVal" && !(val[i]?.lage && val[i].egenskaper?.length)) {
      const forsok = [{ lage: "tre", egenskaper: ["STY", "FYS", "SMI"] }, { lage: "tre", egenskaper: ["INT", "PSY", "KAR"] },
        ...GRUNDEGENSKAPER.map((g) => ({ lage: "en", egenskaper: [g] }))];
      for (const v of forsok) { satt(v); if (gar()) break; }
    }
  });
}

// Färdigheter som en förmåga kan gälla, med ett påhittat delval där färdigheten lärs per stad, språk osv.
function* kandidater(api, autoDelval, bland, anvanda) {
  const { R } = api;
  const rp = api.nu();
  if (bland === "sprak") { const sprak = autoDelval(api, rp, "tala", anvanda); if (sprak) yield `tala:${sprak}`; return; }
  for (const f of R.fardigheter.lista) {
    if (MAGI.includes(f.id) || f.typ === "magiskola" || f.typ === "sprak") continue;
    if (!f.perVal) { yield f.id; continue; }
    const sub = autoDelval(api, rp, f.id, anvanda);
    if (sub) yield `${f.id}:${sub}`;
  }
}

// Kör ifyllningen efter varje ritning när den är på
export function startaAutofyll(api, autoDelval) {
  let pa = false;
  try { pa = localStorage.getItem(LAGRING) === "ja"; } catch { /* frivilligt */ }
  let vantar = false;
  let senastForsok = null; // samma steg och samma saknade val prövas inte igen, så att ett val som inte går inte loopar
  // Efter Lås upp slås slaget inte om automatiskt förrän steget lämnas, så att BP kan ändras först
  let upplast = null;
  document.addEventListener("click", (e) => { if (e.target.closest?.(".omslag")) upplast = api.lage().aktivtSteg; }, true);
  const kor = () => {
    vantar = false;
    if (!pa) return;
    const l = api.lage();
    if (l.vy !== "steg" || l.rullar || l.magiByte || l.provar || document.querySelector("#magidialog")) return;
    const kvar = api.saknasPerSteg(api.rakna())[l.aktivtSteg] ?? [];
    const signatur = `${l.aktivtSteg}|${JSON.stringify(kvar)}|${JSON.stringify(api.nu())}`;
    if (upplast !== l.aktivtSteg) upplast = null;
    if (!kvar.length || signatur === senastForsok) return;
    senastForsok = signatur;
    let andrat = false;
    try { andrat = fyllSteg(api, autoDelval, l.aktivtSteg, { slag: !upplast }); } catch (e) { console.error("Den automatiska ifyllningen misslyckades", e); }
    if (andrat) api.uppdatera();
  };
  api.efterRita(() => { if (pa && !vantar) { vantar = true; setTimeout(kor, 0); } });
  return {
    pa: () => pa,
    satt(varde) {
      pa = varde;
      senastForsok = null;
      try { localStorage.setItem(LAGRING, pa ? "ja" : "nej"); } catch { /* frivilligt */ }
      if (pa) { api.visaNotis("Autofyll är på: obligatoriska val och slag görs när du kommer till ett steg. Ras, yrke och fördelningen av BP och EP gör du själv."); setTimeout(kor, 0); }
    },
  };
}
