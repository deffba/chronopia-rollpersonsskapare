// En hundrasidig tärning (zocchihedron) ritad på en canvas: ett klot med 100 numrerade gropar.
// Klotet vrids med en rotationsmatris; ett slag snurrar det och saktar in tills det slagna talet är vänt rakt fram.

const SIDOR = 100;

// Talen sprids jämnt över klotet (Fibonaccispiral)
const PUNKTER = Array.from({ length: SIDOR }, (_, i) => {
  const y = 1 - (2 * (i + 0.5)) / SIDOR;
  const r = Math.sqrt(1 - y * y);
  const v = i * Math.PI * (3 - Math.sqrt(5));
  return [Math.cos(v) * r, y, Math.sin(v) * r];
});
// Talen ligger i en blandad ordning, som på en riktig tärning, och inte i spiralens ordning
const TAL = (() => {
  const t = Array.from({ length: SIDOR }, (_, i) => i + 1);
  let s = 7;
  for (let i = t.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [t[i], t[j]] = [t[j], t[i]];
  }
  return t;
})();

const ENHET = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const mul = (a, b) => a.map((rad) => [0, 1, 2].map((j) => rad[0] * b[0][j] + rad[1] * b[1][j] + rad[2] * b[2][j]));
const avb = (m, p) => m.map((rad) => rad[0] * p[0] + rad[1] * p[1] + rad[2] * p[2]);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const kryss = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(...a) || 1; return a.map((x) => x / l); };
// Rotation med vinkeln v kring enhetsaxeln k (Rodrigues)
function rot(k, v) {
  const [x, y, z] = k; const c = Math.cos(v); const s = Math.sin(v); const t = 1 - c;
  return [[t * x * x + c, t * x * y - s * z, t * x * z + s * y], [t * x * y + s * z, t * y * y + c, t * y * z - s * x], [t * x * z - s * y, t * y * z + s * x, t * z * z + c]];
}

const FRAM = [0, 0, 1]; // mot betraktaren (y nedåt på skärmen)

export class Tarning100 {
  constructor(canvas, { reducerad = false } = {}) {
    this.canvas = canvas;
    this.reducerad = reducerad;
    this.m = mul(rot(norm([1, 0.4, 0]), 0.6), rot([0, 1, 0], 0.9));
    this.slag = null;
    this.senast = null;
    this.ram = null;
    this.storlek();
    this.rita();
    if (!reducerad) this.tomgang();
  }

  storlek() {
    const d = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.canvas.clientWidth || 240;
    this.canvas.width = Math.round(w * d);
    this.canvas.height = Math.round(w * d);
    this.skala = d;
  }

  // Långsam, olycksbådande drift innan slaget
  tomgang() {
    const axel = norm([0.35, 1, 0.15]);
    const steg = (tid) => {
      if (this.slag) return;
      const dt = this.senast === null ? 0 : Math.min(50, tid - this.senast);
      this.senast = tid;
      this.m = mul(rot(axel, dt * 0.00035), this.m);
      this.rita();
      this.ram = requestAnimationFrame(steg);
    };
    this.ram = requestAnimationFrame(steg);
  }

  // Snurrar i `tid` ms och landar med `tal` vänt rakt fram. Promisen löses när tärningen ligger still.
  sla(tal, tid) {
    cancelAnimationFrame(this.ram);
    this.slag = tal;
    const start = this.m;
    const u = avb(start, PUNKTER[TAL.indexOf(tal)]);
    // Axeln väljs så att den lutar som en kastad tärning men ligger lika långt från talets läge och från "fram",
    // så att en ren rotation kring den för talet rakt fram
    const onskad = norm([0.3 + Math.random() * 0.3, 1, 0.2 * (Math.random() - 0.5)]);
    const skillnad = u.map((x, i) => x - FRAM[i]);
    let axel = onskad;
    let vinkel = 0;
    if (Math.hypot(...skillnad) > 1e-6) {
      const n = norm(skillnad);
      axel = norm(onskad.map((x, i) => x - dot(onskad, n) * n[i]));
      const up = norm(u.map((x, i) => x - dot(u, axel) * axel[i]));
      const fp = norm(FRAM.map((x, i) => x - dot(FRAM, axel) * axel[i]));
      vinkel = Math.atan2(dot(axel, kryss(up, fp)), dot(up, fp));
      if (vinkel < 0) vinkel += 2 * Math.PI;
    }
    const varv = this.reducerad ? 0 : Math.max(2, Math.round(tid / 650));
    const total = vinkel + varv * 2 * Math.PI;
    return new Promise((klar) => {
      const t0 = performance.now();
      const steg = (nu) => {
        const t = Math.min(1, (nu - t0) / tid);
        const e = 1 - Math.pow(1 - t, 3.2); // snabbt kast som saktar in
        this.m = mul(rot(axel, total * e), start);
        this.rita();
        if (t < 1) this.ram = requestAnimationFrame(steg);
        else klar();
      };
      this.ram = requestAnimationFrame(steg);
    });
  }

  // Visa ett redan slaget tal direkt
  visa(tal) {
    cancelAnimationFrame(this.ram);
    this.slag = tal;
    const u = PUNKTER[TAL.indexOf(tal)];
    const k = kryss(u, FRAM);
    const s = Math.hypot(...k);
    this.m = s < 1e-6 ? ENHET : rot(norm(k), Math.atan2(s, dot(u, FRAM)));
    this.rita();
  }

  stoppa() { cancelAnimationFrame(this.ram); }

  rita() {
    const c = this.canvas.getContext("2d");
    const W = this.canvas.width;
    const R = W * 0.46;
    const cx = W / 2; const cy = W / 2;
    c.clearRect(0, 0, W, W);
    // Skugga och sken bakom klotet
    const sken = c.createRadialGradient(cx, cy, R * 0.8, cx, cy, R * 1.08);
    sken.addColorStop(0, "rgba(150, 30, 40, 0.35)");
    sken.addColorStop(1, "rgba(150, 30, 40, 0)");
    c.fillStyle = sken; c.beginPath(); c.arc(cx, cy, R * 1.08, 0, Math.PI * 2); c.fill();
    // Klotet: blank obsidian med ljus snett uppifrån
    const kropp = c.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.05, cx, cy, R);
    kropp.addColorStop(0, "#5a4a5e");
    kropp.addColorStop(0.35, "#2a1f2d");
    kropp.addColorStop(1, "#0a070b");
    c.fillStyle = kropp; c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.fill();

    const font = `600 ${Math.round(R * 0.15)}px Cinzel, "EB Garamond", Georgia, serif`;
    c.font = font; c.textAlign = "center"; c.textBaseline = "middle";
    const synliga = [];
    for (let i = 0; i < SIDOR; i++) {
      const [x, y, z] = avb(this.m, PUNKTER[i]);
      if (z > 0.02) synliga.push([x, y, z, TAL[i]]);
    }
    synliga.sort((a, b) => a[2] - b[2]);
    for (const [x, y, z, tal] of synliga) {
      const px = cx + x * R; const py = cy + y * R;
      const v = Math.atan2(y, x);
      c.save();
      c.translate(px, py);
      // Gropen och talet förkortas i riktning mot klotets kant
      c.rotate(v); c.scale(Math.max(z, 0.05), 1); c.rotate(-v);
      c.globalAlpha = Math.min(1, z * 1.6);
      c.fillStyle = "rgba(0, 0, 0, 0.45)";
      c.beginPath(); c.arc(0, 0, R * 0.155, 0, Math.PI * 2); c.fill();
      c.strokeStyle = "rgba(255, 235, 210, 0.08)"; c.lineWidth = R * 0.012;
      c.beginPath(); c.arc(0, R * 0.006, R * 0.155, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
      const varm = this.slag === tal ? "#f4d58a" : "#e3d4b4";
      c.fillStyle = varm;
      c.fillText(String(tal), 0, R * 0.01);
      c.restore();
    }
    // Glans
    const glans = c.createRadialGradient(cx - R * 0.42, cy - R * 0.5, 0, cx - R * 0.42, cy - R * 0.5, R * 0.55);
    glans.addColorStop(0, "rgba(255, 255, 255, 0.22)");
    glans.addColorStop(1, "rgba(255, 255, 255, 0)");
    c.fillStyle = glans; c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.fill();
    // Mörk kant
    const kant = c.createRadialGradient(cx, cy, R * 0.75, cx, cy, R);
    kant.addColorStop(0, "rgba(0, 0, 0, 0)");
    kant.addColorStop(1, "rgba(0, 0, 0, 0.55)");
    c.fillStyle = kant; c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.fill();
  }
}
