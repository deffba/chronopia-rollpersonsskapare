// Kör webbläsartesterna (Playwright) mot appen.
//   npm run e2e               alla tester utom den långa genomkörningen av alla ras×yrke
//   npm run e2e -- --alla     även alla 192 kombinationer av ras och yrke (tar ca 15 min)
//   npm run e2e -- kontroll   bara de tester som nämns
// Startar en egen statisk server för repot på en ledig port, så ingen annan server behövs.
// Varje testskript skriver PASS/FAIL-rader, "inga fel"/"FEL:" eller "OK ..."-rader;
// här avgörs utfallet utifrån utskriften och slutkoden.
import { createServer } from "node:http";
import { readFile, mkdtemp } from "node:fs/promises";
import { spawn, execSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HAR = path.dirname(fileURLToPath(import.meta.url));
const ROT = path.resolve(HAR, "../..");

const TYPER = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".ttf": "font/ttf", ".otf": "font/otf", ".woff2": "font/woff2", ".png": "image/png", ".svg": "image/svg+xml", ".pdf": "application/pdf" };

// Kontroller av utskriften
const passFail = (ut) => !/^FAIL/m.test(ut) && /^PASS/m.test(ut);
const ingaFel = (ut) => /inga fel/.test(ut) && !/FEL:/.test(ut);
const allaOk = (ut) => /alla ok/.test(ut);
const allaKombinationer = (ut) => { const rader = ut.split("\n").filter((r) => r.trim()); return rader.length === 192 && rader.every((r) => r.startsWith("OK ")); };

const TESTER = [
  { namn: "kontroll", ok: passFail },
  { namn: "startsida", args: ["$UT"], ok: passFail },
  { namn: "fixar", ok: passFail },
  { namn: "formagor", ok: passFail },
  { namn: "vr", ok: passFail },
  { namn: "nyheter", ok: passFail },
  { namn: "dev", ok: passFail },
  { namn: "logg", ok: passFail },
  { namn: "info", ok: passFail },
  { namn: "formular", args: ["Dimalv-arkemagiker.json"], ok: passFail },
  { namn: "pdf", args: ["Dimalv-arkemagiker.json", "$UT"], ok: passFail, kraver: "pdfinfo" },
  { namn: "magi", ok: ingaFel },
  { namn: "magislag", ok: ingaFel },
  { namn: "magislag-steg6", ok: ingaFel },
  { namn: "autofyll-magi", ok: ingaFel },
  { namn: "spel", ok: ingaFel },
  { namn: "sf", ok: allaOk },
  { namn: "alla", ok: allaKombinationer, lang: true },
];

const argv = process.argv.slice(2);
const medLanga = argv.includes("--alla");
const valda = argv.filter((a) => !a.startsWith("--"));
const okanda = valda.filter((v) => !TESTER.some((t) => t.namn === v));
if (okanda.length) { console.error(`Okänt test: ${okanda.join(", ")}. Finns: ${TESTER.map((t) => t.namn).join(", ")}`); process.exit(2); }
const attKora = TESTER.filter((t) => (valda.length ? valda.includes(t.namn) : !t.lang || medLanga));

const server = createServer(async (req, res) => {
  let fil = path.join(ROT, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!fil.startsWith(ROT)) { res.writeHead(403).end(); return; }
  if (fil.endsWith(path.sep)) fil = path.join(fil, "index.html");
  try {
    const innehall = await readFile(fil);
    res.writeHead(200, { "Content-Type": TYPER[path.extname(fil)] || "application/octet-stream" }).end(innehall);
  } catch { res.writeHead(404).end(); }
});
await new Promise((klar) => server.listen(0, "127.0.0.1", klar));
const BAS = `http://127.0.0.1:${server.address().port}`;
const UT = await mkdtemp(path.join(tmpdir(), "chronopia-e2e-"));

const finns = (prog) => { try { execSync(`command -v ${prog}`, { stdio: "ignore" }); return true; } catch { return false; } };

function kor(test) {
  return new Promise((klar) => {
    const args = (test.args || []).map((a) => (a === "$UT" ? UT : a));
    const barn = spawn(process.execPath, [`${test.namn}.cjs`, ...args], { cwd: HAR, env: { ...process.env, E2E_BAS: BAS, LANG: "C.UTF-8" } });
    let ut = "";
    barn.stdout.on("data", (d) => (ut += d)); barn.stderr.on("data", (d) => (ut += d));
    const tid = setTimeout(() => { ut += "\nTIDSGRÄNS"; barn.kill(); }, test.lang ? 40 * 60e3 : 5 * 60e3);
    barn.on("close", (kod) => { clearTimeout(tid); klar({ kod, ut }); });
  });
}

let fel = 0;
for (const test of attKora) {
  if (test.kraver && !finns(test.kraver)) { console.log(`HOPPAR ÖVER ${test.namn} (kräver ${test.kraver})`); continue; }
  const start = Date.now();
  const { kod, ut } = await kor(test);
  const ok = kod === 0 && test.ok(ut);
  const sek = Math.round((Date.now() - start) / 1000);
  const antal = (ut.match(/^PASS/gm) || []).length;
  console.log(`${ok ? "OK  " : "FEL "} ${test.namn} (${sek} s${antal ? `, ${antal} kontroller` : ""})`);
  if (!ok) { fel++; console.log(ut.split("\n").filter((r) => !r.startsWith("PASS") && !r.startsWith("OK ")).map((r) => "     " + r).join("\n")); }
}
server.close();
console.log(fel ? `\n${fel} av ${attKora.length} testskript misslyckades.` : `\nAlla ${attKora.length} testskript gick igenom.`);
process.exit(fel ? 1 : 0);
