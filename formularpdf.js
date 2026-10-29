// Rollformuläret som en PDF-fil som laddas ner direkt, utan webbläsarens utskriftsdialog.
// Formuläret ritas som vanligt (formular.js) i en kopia utanför skärmen och varje sida mäts upp:
// ytor, linjer, text och gubben förs över till PDF:en med pdf-lib och samma typsnitt som på skärmen.
// Filen blir därför likadan i alla webbläsare, och formuläret har bara en layout att underhålla.
// Fälten som spelaren skriver i under spel blir ifyllbara fält i PDF:en.
// pdf-lib, fontkit och typsnitten laddas först när någon vill ha en PDF.

const BAS = new URL("./", import.meta.url);
const A4 = [595.28, 841.89]; // punkter
const MM = 96 / 25.4; // CSS-pixlar per millimeter

// Typsnitten som formulärets CSS använder, per vikt. Saknas en vikt används den närmaste.
const TYPSNITT = {
  "Source Sans 3": { 400: "SourceSans3-Regular.ttf", 600: "SourceSans3-SemiBold.ttf", 700: "SourceSans3-Bold.ttf" },
  Oswald: { 400: "Oswald-Regular.ttf", 600: "Oswald-SemiBold.ttf" },
  Cinzel: { 400: "Cinzel-Regular.ttf" },
  "Cinzel Decorative": { 700: "CinzelDecorative-Bold.ttf" },
  "EB Garamond": { 400: "EBGaramond-Regular.ttf", 600: "EBGaramond-SemiBold.ttf" },
};

let bibliotek = null;
const filer = new Map();

function laddaSkript(fil) {
  return new Promise((klar, fel) => {
    const s = document.createElement("script");
    s.src = new URL(fil, BAS).href;
    s.onload = klar;
    s.onerror = () => fel(new Error(`Kunde inte ladda ${fil}`));
    document.head.append(s);
  });
}

function laddaBibliotek() {
  bibliotek ??= Promise.all([laddaSkript("vendor/pdf-lib.min.js"), laddaSkript("vendor/fontkit.umd.min.js")])
    .then(() => ({ PDFLib: window.PDFLib, fontkit: window.fontkit }))
    .catch((e) => { bibliotek = null; throw e; });
  return bibliotek;
}

function typsnittsfil(fil) {
  if (!filer.has(fil)) {
    filer.set(fil, fetch(new URL(`typsnitt/${fil}`, BAS)).then((svar) => {
      if (!svar.ok) throw new Error(`Kunde inte ladda typsnittet ${fil}`);
      return svar.arrayBuffer();
    }).catch((e) => { filer.delete(fil); throw e; }));
  }
  return filer.get(fil);
}

function filFor(stil) {
  const familj = stil.fontFamily.split(",")[0].trim().replace(/^["']|["']$/g, "");
  const vikter = TYPSNITT[familj] ?? TYPSNITT["Source Sans 3"];
  const onskad = parseInt(stil.fontWeight, 10) || 400;
  const vikt = Object.keys(vikter).map(Number).sort((a, b) => Math.abs(a - onskad) - Math.abs(b - onskad) || b - a)[0];
  return vikter[vikt];
}

// "rgb(1, 2, 3)", "rgba(1, 2, 3, .5)" eller "rgb(1 2 3 / 50%)" → { r, g, b, a } med värden 0–1
function fargAv(css) {
  const m = css?.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const v = m[1].split(/[\s,/]+/).filter(Boolean).map((x) => (x.endsWith("%") ? parseFloat(x) / 100 : parseFloat(x)));
  return { r: v[0] / 255, g: v[1] / 255, b: v[2] / 255, a: v[3] ?? 1 };
}

// Längder i en gradient anges i mm i CSS:en men kan komma tillbaka i px
const langd = (t) => (t.endsWith("mm") ? parseFloat(t) * MM : parseFloat(t));

/**
 * Gör en PDF av rollformulärets sidor.
 * sidor: elementen från rollformularSidor. efterTypsnitt(rot) körs när sidorna har ritats med rätt typsnitt
 * (för delaRegelsidor). Returnerar PDF:en som Uint8Array.
 */
export async function rollformularPdf({ sidor, blacksnal = false, titel = "", efterTypsnitt }) {
  const rot = document.createElement("div");
  rot.className = "rf-vy rf-pdf-kalla" + (blacksnal ? " rf-blacksnal" : "");
  rot.setAttribute("aria-hidden", "true");
  // Utanför skärmen men ritad, så att allt går att mäta. Mobilsafari får inte förstora texten.
  rot.style.cssText = "position:fixed;left:-10000px;top:0;width:240mm;-webkit-text-size-adjust:100%;text-size-adjust:100%;pointer-events:none";
  const behallare = document.createElement("div");
  behallare.className = "rf-sidor";
  behallare.append(...sidor);
  rot.append(behallare);
  document.body.append(rot);
  try {
    void rot.offsetHeight;
    const [{ PDFLib, fontkit }] = await Promise.all([laddaBibliotek(), document.fonts?.ready]);
    efterTypsnitt?.(rot);
    const doc = await PDFLib.PDFDocument.create();
    doc.registerFontkit(fontkit);
    if (titel) doc.setTitle(titel, { showInWindowTitleBar: true });
    doc.setLanguage("sv-SE");
    doc.setCreator("Chronopia rollpersonsskapare");
    const ritare = new Ritare(doc, PDFLib);
    for (const sida of rot.querySelectorAll(".rf-sida")) await ritare.sida(sida);
    return await doc.save();
  } finally {
    rot.remove();
  }
}

class Ritare {
  constructor(doc, PDFLib) {
    this.doc = doc;
    this.L = PDFLib;
    this.form = doc.getForm();
    this.typsnitt = new Map();
    this.bilder = new Map();
    this.faltnamn = new Map();
  }

  // Inbäddat typsnitt för en stil. Ifyllbara fält får hela typsnittet, så att allt som skrivs i dem syns.
  // EB Garamond bäddas alltid in helt: fontkit tappar de flesta tecknen när det typsnittet delas upp.
  // Ligaturer stängs av, annars blir det ett glapp efter till exempel fi.
  font(stil, helt = false) {
    const fil = filFor(stil);
    const hela = helt || fil.startsWith("EBGaramond");
    const nyckel = fil + (hela ? ":helt" : "");
    if (!this.typsnitt.has(nyckel)) this.typsnitt.set(nyckel, typsnittsfil(fil).then((b) => this.doc.embedFont(b, { subset: !hela, features: { liga: false } })));
    return this.typsnitt.get(nyckel);
  }

  farg(f) { return this.L.rgb(f.r, f.g, f.b); }

  async sida(sida) {
    this.page = this.doc.addPage(A4);
    const r = sida.getBoundingClientRect();
    this.r0 = r;
    this.k = A4[0] / r.width;
    await this.element(sida, null, 1);
  }

  X(x) { return (x - this.r0.left) * this.k; }
  Y(y) { return A4[1] - (y - this.r0.top) * this.k; }

  // Ritar med klippning till en ruta (overflow: hidden), men bara när det behövs
  klippt(klipp, r, rita) {
    if (!klipp || (r.left >= klipp.left - .5 && r.right <= klipp.right + .5 && r.top >= klipp.top - .5 && r.bottom <= klipp.bottom + .5)) return rita();
    const { pushGraphicsState, popGraphicsState, rectangle, clip, endPath } = this.L;
    this.page.pushOperators(pushGraphicsState(), rectangle(this.X(klipp.left), this.Y(klipp.bottom), klipp.width * this.k, klipp.height * this.k), clip(), endPath());
    rita();
    this.page.pushOperators(popGraphicsState());
  }

  yta(l, t, b, h, f, opacitet = 1) {
    if (!f || f.a === 0 || b <= 0 || h <= 0) return;
    this.page.drawRectangle({ x: this.X(l), y: this.Y(t + h), width: b * this.k, height: h * this.k, color: this.farg(f), opacity: f.a * opacitet });
  }

  async element(e, klipp, opacitet) {
    const s = getComputedStyle(e);
    if (s.display === "none") return;
    const op = opacitet * Number(s.opacity);
    const r = e.getBoundingClientRect();
    const synlig = s.visibility !== "hidden";
    const ram = { t: parseFloat(s.borderTopWidth), h: parseFloat(s.borderRightWidth), b: parseFloat(s.borderBottomWidth), v: parseFloat(s.borderLeftWidth) };
    const inre = { left: r.left + ram.v, top: r.top + ram.t, right: r.right - ram.h, bottom: r.bottom - ram.b };
    inre.width = inre.right - inre.left;
    inre.height = inre.bottom - inre.top;
    const falt = e.matches("input, textarea");

    if (synlig) {
      // Fälten har ingen bakgrund i PDF:en, precis som i utskriften
      if (!falt) this.klippt(klipp, r, () => this.yta(r.left, r.top, r.width, r.height, fargAv(s.backgroundColor), op));
      await this.bakgrundsbild(s, r, inre, klipp, op);
      this.klippt(klipp, r, () => {
        this.ramar(s, r, ram, op);
        this.insetSkuggor(s, inre, op);
      });
    }
    if (falt) {
      if (synlig && e.type !== "checkbox") await this.ifyllbart(e, s, inre);
      return;
    }
    if (e instanceof SVGSVGElement) {
      if (synlig) this.klippt(klipp, r, () => this.svg(e, r, op));
      return;
    }

    const klipper = s.overflowX !== "visible" || s.overflowY !== "visible";
    const eget = klipper ? snitt(klipp, inre) : klipp;
    // text-overflow: ellipsis gäller bara när webbläsaren faktiskt kortade texten
    const kortad = klipper && s.textOverflow === "ellipsis" && e.scrollWidth > e.clientWidth + 1;
    const ellips = kortad ? inre.right : (klipper ? null : this.ellips);
    for (const barn of e.childNodes) {
      if (barn.nodeType === Node.ELEMENT_NODE) {
        const forra = this.ellips;
        this.ellips = ellips;
        await this.element(barn, eget, op);
        this.ellips = forra;
      } else if (barn.nodeType === Node.TEXT_NODE && synlig) {
        await this.text(barn, s, eget, op, ellips);
      }
    }
  }

  ramar(s, r, ram, op) {
    const sida = (namn) => (["none", "hidden"].includes(s[`border${namn}Style`]) ? null : fargAv(s[`border${namn}Color`]));
    this.yta(r.left, r.top, r.width, ram.t, sida("Top"), op);
    this.yta(r.left, r.bottom - ram.b, r.width, ram.b, sida("Bottom"), op);
    this.yta(r.left, r.top, ram.v, r.height, sida("Left"), op);
    this.yta(r.right - ram.h, r.top, ram.h, r.height, sida("Right"), op);
  }

  // Inre skuggor utan oskärpa blir raka band, som de vita linjerna i titelrutan
  insetSkuggor(s, inre, op) {
    if (!s.boxShadow || s.boxShadow === "none") return;
    for (const del of s.boxShadow.split(/,(?![^(]*\))/)) {
      if (!del.includes("inset")) continue;
      const f = fargAv(del);
      const [dx = 0, dy = 0, oskarpa = 0, spridning = 0] = (del.replace(/rgba?\([^)]*\)/, "").match(/-?[\d.]+px/g) ?? []).map(parseFloat);
      if (dx !== 0 || oskarpa !== 0) continue;
      const h = Math.abs(dy) + spridning;
      if (h <= 0) continue;
      this.yta(inre.left, dy > 0 ? inre.top : inre.bottom - h, inre.width, h, f, op);
    }
  }

  async bakgrundsbild(s, r, inre, klipp, op) {
    const bild = s.backgroundImage;
    if (!bild || bild === "none") return;
    if (bild.startsWith("url(")) {
      const url = bild.match(/^url\((["']?)(.*?)\1\)/)?.[2]; // första lagret
      const img = url && await this.rastrera(url, r, s.backgroundColor);
      if (img) this.page.drawImage(img, { x: this.X(r.left), y: this.Y(r.bottom), width: r.width * this.k, height: r.height * this.k, opacity: op });
      return;
    }
    const farger = [...bild.matchAll(/rgba?\([^)]*\)/g)].map((m) => fargAv(m[0]));
    const langder = [...bild.replace(/rgba?\([^)]*\)/g, "").matchAll(/-?[\d.]+(?:px|mm)/g)].map((m) => langd(m[0]));
    if (bild.startsWith("repeating-linear-gradient")) {
      // Snedstreck (rutan för erf på kategori B-färdigheter): färg 1 i bredden langder[1], period langder[3]
      const vinkel = parseFloat(bild.match(/([\d.]+)deg/)?.[1] ?? 180) * Math.PI / 180;
      const [bredd, period] = [langder[1], langder[3]];
      if (!(bredd > 0 && period > 0)) return;
      const g = { x: Math.sin(vinkel), y: -Math.cos(vinkel) }; // gradientens riktning (y nedåt)
      const v = { x: -g.y, y: g.x }; // strecken går vinkelrätt mot den
      const mitt = { x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 };
      const n = Math.ceil((r.width + r.height) / period);
      const L = r.width + r.height;
      this.klippt(snitt(klipp, r), { left: -1e9, right: 1e9, top: -1e9, bottom: 1e9 }, () => {
        this.yta(r.left, r.top, r.width, r.height, farger[2], op);
        for (let i = -n; i <= n; i++) {
          const c = { x: mitt.x + g.x * i * period, y: mitt.y + g.y * i * period };
          this.page.drawLine({
            start: { x: this.X(c.x - v.x * L), y: this.Y(c.y - v.y * L) }, end: { x: this.X(c.x + v.x * L), y: this.Y(c.y + v.y * L) },
            thickness: bredd * this.k, color: this.farg(farger[0]), opacity: farger[0].a * op,
          });
        }
      });
    } else if (bild.startsWith("linear-gradient")) {
      // Linjerat papper: en linje i botten av varje ruta i background-size
      const steg = langd(s.backgroundSize.split(" ")[1] ?? "");
      const tjocklek = langder[0];
      if (!(steg > 0 && tjocklek > 0)) return;
      this.klippt(snitt(klipp, inre), { left: -1e9, right: 1e9, top: -1e9, bottom: 1e9 }, () => {
        for (let y = inre.top + steg; y <= inre.bottom + .5; y += steg) this.yta(inre.left, y - tjocklek, inre.width, tjocklek, farger[0], op);
      });
    }
  }

  // Marmorn är ett SVG-filter som PDF inte kan, så den blir en bild (en gång per PDF)
  async rastrera(url, r, bakgrund) {
    const nyckel = `${url}|${Math.round(r.width)}x${Math.round(r.height)}|${bakgrund}`;
    if (!this.bilder.has(nyckel)) {
      this.bilder.set(nyckel, (async () => {
        try {
          const img = new Image();
          img.src = url;
          await img.decode();
          const skala = 1.5;
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(r.width * skala);
          canvas.height = Math.round(r.height * skala);
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = bakgrund;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          const bw = (img.naturalWidth || r.width) * skala;
          const bh = (img.naturalHeight || r.height) * skala;
          for (let y = 0; y < canvas.height; y += bh) for (let x = 0; x < canvas.width; x += bw) ctx.drawImage(img, x, y, bw, bh);
          const blob = await new Promise((klar) => canvas.toBlob(klar, "image/jpeg", .8));
          return blob ? await this.doc.embedJpg(await blob.arrayBuffer()) : null;
        } catch (fel) {
          console.warn("Marmorn kunde inte ritas", fel);
          return null; // utan marmor blir sidan enfärgad
        }
      })());
    }
    return this.bilder.get(nyckel);
  }

  svg(svg, r, op) {
    const vb = svg.viewBox.baseVal;
    if (!vb?.width) return;
    const skala = Math.min(r.width / vb.width, r.height / vb.height);
    const x0 = r.left + (r.width - vb.width * skala) / 2 - vb.x * skala;
    const y0 = r.top + (r.height - vb.height * skala) / 2 - vb.y * skala;
    for (const p of svg.querySelectorAll("path")) {
      const ps = getComputedStyle(p);
      const fyll = fargAv(ps.fill);
      const linje = ps.stroke === "none" ? null : fargAv(ps.stroke);
      const val = { x: this.X(x0), y: this.Y(y0), scale: skala * this.k, opacity: op, borderOpacity: op };
      if (fyll && fyll.a > 0) val.color = this.farg(fyll);
      if (linje && linje.a > 0) Object.assign(val, { borderColor: this.farg(linje), borderWidth: parseFloat(ps.strokeWidth) || 1 });
      if (val.color || val.borderColor) this.page.drawSvgPath(p.getAttribute("d"), val);
    }
  }

  // Texten ritas rad för rad där webbläsaren lade den: orden mäts och grupperas efter höjd
  async text(nod, s, klipp, op, ellips) {
    const data = nod.data;
    if (!data.trim()) return;
    const f = fargAv(s.color);
    if (!f || f.a === 0) return;
    const font = await this.font(s);
    const storlek = parseFloat(s.fontSize) * this.k;
    const avstand = s.letterSpacing === "normal" ? 0 : parseFloat(s.letterSpacing) * this.k || 0;
    const rader = [];
    const range = document.createRange();
    for (const m of data.matchAll(/\S+/g)) {
      range.setStart(nod, m.index);
      range.setEnd(nod, m.index + m[0].length);
      const rr = range.getClientRects()[0];
      if (!rr) continue;
      const sista = rader.at(-1);
      if (sista && Math.abs(sista.r.top - rr.top) < 1 && rr.left >= sista.r.left) Object.assign(sista, { slut: m.index + m[0].length, hoger: rr.right });
      else rader.push({ start: m.index, slut: m.index + m[0].length, r: rr, hoger: rr.right });
    }
    const hojd = font.heightAtSize(storlek);
    const over = font.heightAtSize(storlek, { descender: false });
    const bredd = (t) => font.widthOfTextAtSize(t, storlek) + avstand * t.length;
    const { pushGraphicsState, popGraphicsState, setCharacterSpacing } = this.L;
    for (const rad of rader) {
      let t = data.slice(rad.start, rad.slut).replace(/\s+/g, " ");
      if (s.textTransform === "uppercase") t = t.toLocaleUpperCase("sv");
      const x = this.X(rad.r.left);
      let tecken = avstand;
      if (ellips != null && x + bredd(t) > this.X(ellips) + .5) {
        while (t && x + bredd(t + "…") > this.X(ellips)) t = t.slice(0, -1);
        t = t.trimEnd() + "…";
      } else if (t.length > 1) {
        // Webbläsaren kernar, det gör inte pdf-lib. Raden får samma bredd som på skärmen genom en
        // liten justering av teckenavståndet, så att texten inte når in i nästa ruta.
        const justering = ((this.X(rad.hoger) - x) - bredd(t)) / (t.length - 1);
        if (Math.abs(justering) < storlek * .05) tecken += justering;
      }
      const baslinje = rad.r.top + rad.r.height * (over / hojd);
      this.klippt(klipp, rad.r, () => {
        if (tecken) this.page.pushOperators(pushGraphicsState(), setCharacterSpacing(tecken));
        this.page.drawText(t, { x, y: this.Y(baslinje), size: storlek, font, color: this.farg(f), opacity: f.a * op });
        if (tecken) this.page.pushOperators(popGraphicsState());
      });
    }
  }

  async ifyllbart(e, s, r) {
    const { TextAlignment } = this.L;
    const font = await this.font(s, true);
    const bas = (e.getAttribute("aria-label") || "Fält").replace(/\./g, "");
    const n = (this.faltnamn.get(bas) ?? 0) + 1;
    this.faltnamn.set(bas, n);
    const falt = this.form.createTextField(n > 1 ? `${bas} ${n}` : bas);
    if (e.tagName === "TEXTAREA") falt.enableMultiline();
    const f = fargAv(s.color) ?? { r: 0, g: 0, b: 0 };
    falt.addToPage(this.page, {
      x: this.X(r.left), y: this.Y(r.bottom), width: r.width * this.k, height: r.height * this.k,
      font, textColor: this.farg(f), backgroundColor: undefined, borderColor: undefined, borderWidth: 0,
    });
    falt.setAlignment(s.textAlign === "center" ? TextAlignment.Center : TextAlignment.Left);
    falt.setFontSize(parseFloat(s.fontSize) * this.k);
    if (e.value) falt.setText(e.value);
    falt.updateAppearances(font);
  }
}

function snitt(a, b) {
  if (!a) return b;
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  const right = Math.max(left, Math.min(a.right, b.right));
  const bottom = Math.max(top, Math.min(a.bottom, b.bottom));
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}
