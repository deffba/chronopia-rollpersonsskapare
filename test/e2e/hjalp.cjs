// Gemensamt för webbläsartesterna.
// Appen öppnar på startsidan. tillRas tar testet till steg 1 (Ras): Skapa rollperson och sedan förbi steg 0 (Böcker).
// Står sidan redan i stegen (t.ex. efter Ny rollperson) går den bara vidare från Böcker.
async function tillRas(p) {
  await p.waitForSelector('#start-skapa:visible, .raskort, .bokgrupper');
  if (await p.locator('#start-skapa:visible').count()) await p.click('#start-skapa');
  await p.waitForSelector('.raskort, .bokgrupper');
  if (await p.locator('.bokgrupper').count()) await p.click('#nasta-steg');
  await p.waitForSelector('.raskort');
}
module.exports = { tillRas };
