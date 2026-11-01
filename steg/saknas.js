// Vad som saknas i varje steg, och vilka steg som syns.
import { rasAv, yrkeAv, fardighetAv, paborjad, skolFV, namnFor } from "../regelmotor.js";
import { STEG } from "../texter.js";
import { S, rasId, yrkeId, yrkesNycklar } from "../tillstand.js";
import { MAGISLAG } from "../ui/magimodal.js";

// Val som ännu inte är gjorda, per steg. Ett steg med obligatoriska val kvar går inte att lämna framåt.
export function saknasPerSteg(res) {
  const lista = Object.fromEntries(STEG.map((st) => [st.id, []]));
  const yrke = yrkeAv(S.R, yrkeId());
  const ras = rasAv(S.R, rasId());
  const klar = (v) => !paborjad(v ?? "");
  if (!S.rp.ras) lista.ras.push("Ras");
  if (S.rp.alder == null) lista.alder.push("Ålder");
  const valfriRas = ras.primara.find((p) => p.valfri);
  if (valfriRas && !S.rp.rasval.some(klar)) lista.ras.push(`Rasens valfria ${valfriRas.valfri === "vapen" ? "vapenfärdighet" : "hantverk"}`);
  if (!S.rp.yrke) lista.yrke.push("Yrke");
  else yrke.fardigheter.forEach((post, i) => {
    const val = S.rp.yrkesval[i];
    if (typeof post === "string") {
      if (fardighetAv(S.R, post)?.perVal && !klar(val)) lista.extra.push(`${fardighetAv(S.R, post).namn}: vad den gäller`);
    } else if (post.valEn) {
      if (!val?.id || (fardighetAv(S.R, val.id).perVal && !klar(val.sub))) lista.extra.push(post.valEn.map((x) => fardighetAv(S.R, x.fardighet ?? x).namn).join(" eller "));
    } else if (post.antal !== null) {
      const gjorda = (post.maste?.length ?? 0) + [].concat(val ?? []).slice(post.maste?.length ?? 0).filter(klar).length;
      if (gjorda < post.antal) lista.extra.push(`${fardighetAv(S.R, post.fardighet).namn}: ${post.antal - gjorda} val kvar`);
    }
  });
  if (S.rp.yrke && yrke.valfri && !klar(S.rp.valfri)) lista.extra.push("Den valfria yrkesfärdigheten");
  if (S.rp.yrke && yrke.startbonus?.some((b) => b.valEttAv) && !yrkesNycklar().includes(S.rp.hantverkBonus)) lista.extra.push("Hantverket som får gratis FV");
  if (S.rp.extraYrkesfardigheter.some((k) => !klar(k))) lista.extra.push("En extra yrkesfärdighet är inte färdigvald (välj klart eller ta bort den)");
  if (!S.rp.namn.trim()) lista.kon.push("Namn");
  if (!S.rp.kon) lista.kon.push("Kön");
  if (S.rp.sarskildaFormagor.bp && S.rp.sarskildaFormagor.slag === null) lista.formagor.push("Slaget för särskilda förmågor");
  if (!S.rp.sarskildaFormagor.bp && !S.rp.sarskildaFormagor.avstar) lista.formagor.push("Lägg BP på särskilda förmågor, eller kryssa i att du inte vill det");
  if (!res.grundegenskaperSatta) lista.egenskaper.push("Grundegenskaperna");
  lista.egenskaper.push(...res.forLagaEgenskaper);
  lista.formagor.push(...res.saknas);
  // Magiförmågeslaget görs i steg 6 (eller 11 för en sekundär magiskola); misslyckas det ska skolan bytas ut
  if (res.vantar.length) {
    const arSkola = (k) => fardighetAv(S.R, k)?.typ === "magiskola";
    const iYrke = yrkesNycklar().some(arSkola);
    const iExtra = S.rp.extraYrkesfardigheter.some(arSkola);
    if (S.rp.magiformaga?.slag == null) (iYrke || iExtra ? lista.egenskaper : lista.fardigheter).push(MAGISLAG);
    // Bytet görs i en dialog i samma steg som slaget, så rollpersonen skickas inte tillbaka till steg 3
    else (iYrke || iExtra ? lista.egenskaper : lista.fardigheter).push("Magiförmågeslaget misslyckades: byt magiskolan mot en annan färdighet");
  }
  for (const f of res.fardigheter.filter((x) => x.tekniker && !x.tekniker.length)) lista.fardigheter.push(`${f.namn}: välj stilens tekniker`);
  if (S.rp.startpaket.valt && !S.rp.startpaket.vapen) lista.utrustning.push("Startpaketets vapen");
  if (S.rp.svardshand.slag === null && !(res.sarskildFormaga?.regel ?? []).some((d) => d.typ === "svardshand")) lista.svardshand.push("Slaget för svärdshand");
  if (S.rp.socialtStand.slag === null && !S.rp.socialtStand.valt) lista.stand.push("Slaget för socialt stånd");
  if (S.rp.startkapital.slag === null) lista.kapital.push("Slaget för startkapital");
  return lista;
}

export function saknas(res) {
  const perSteg = saknasPerSteg(res);
  return synligaSteg(res).flatMap((st, i) => perSteg[st.id].map((t) => `${t} (steg ${i})`));
}

// En färdighet som är vald i listan men inte tillagd med Lägg till (steg 4 och 11) spärrar vägen framåt.
// Ger felmeddelandet, eller null.
export function ejTillagd(stegId) {
  const utkast = { extra: S.nyExtra, fardigheter: S.nySekundar }[stegId];
  if (!utkast) return null;
  return `Du har valt ${namnFor(S.R, fardighetAv(S.R, utkast), utkast)} men inte tryckt Lägg till. Tryck Lägg till eller töm valet innan du går vidare.`;
}

// Första steget som har obligatoriska val kvar; senare steg går inte att öppna.
export function forstaOfardiga(res) {
  const perSteg = saknasPerSteg(res);
  const lista = synligaSteg(res);
  const i = lista.findIndex((st) => perSteg[st.id].length);
  return i === -1 ? lista.length : i;
}

// Steget Besvärjelser visas bara för rollpersoner som kan lära sig magi
export function synligaSteg(res) {
  const kanMagi = (res.yrke.magiker || res.magiformaga.lyckat) && skolFV(res.fardigheter).allman > 0;
  return kanMagi ? STEG : STEG.filter((s) => s.id !== "besvarjelser");
}

export function bpForSteg(id, res) {
  const u = res.bp.utgifter;
  const v = { ras: u.ras, extra: u.extraYrkesfardigheter, egenskaper: u.grundegenskaper, formagor: u.sarskildaFormagor,
    svardshand: u.svardshand, stand: u.socialtStand, kapital: u.startkapital }[id];
  return v ? `${v} BP` : "";
}
