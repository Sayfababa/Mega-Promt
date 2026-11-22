import { expect, test, type Page } from '@playwright/test';

const SLOTS = ['mainhand', 'offhand', 'helm', 'chest', 'gloves', 'boots', 'belt', 'amulet', 'ringA', 'ringB', 'relic'] as const;

async function createCharacter(page: Page, name: string, seed = 4242): Promise<void> {
  await page.goto(`/?seed=${seed}`);
  await expect(page.getByTestId('screen-create')).toBeVisible();
  // locked classes are visible but disabled with a reason
  await expect(page.getByTestId('class-arcanist')).toBeDisabled();
  await expect(page.getByTestId('class-arcanist')).toContainText('Phase 3');
  await expect(page.getByTestId('class-necromancer')).toContainText('Phase 5');
  await page.getByTestId('create-name').fill(name);
  await page.getByTestId('create-submit').click();
  await expect(page.getByTestId('top-name')).toHaveText(name);
}

async function readEquipment(page: Page): Promise<Record<string, string>> {
  await page.getByTestId('nav-character').click();
  const out: Record<string, string> = {};
  for (const s of SLOTS) out[s] = (await page.getByTestId(`slot-${s}-name`).innerText()).trim();
  return out;
}

async function waitSaved(page: Page): Promise<void> {
  await expect(page.getByTestId('save-status')).toHaveText('Gespeichert');
}

test('Meilenstein: Erstellen → Dungeon → Sieg → Loot → Ausrüsten → Schmiede → Reload', async ({ page }) => {
  await createCharacter(page, 'Thorgar');
  await expect(page.getByTestId('top-level')).toHaveText('1');

  // ---- dungeon: Das Verlassene Tor, Stufe 1
  await page.getByTestId('nav-dungeons').click();
  await page.getByTestId('dungeon-forsaken_gate').click();
  await expect(page.getByTestId('monster-level')).toHaveValue('1');
  await expect(page.getByTestId('drop-profile')).toBeVisible();
  await page.getByTestId('start-run').click();

  // ---- combat: replay of stored events, verified, skip
  await expect(page.getByTestId('screen-combat')).toBeVisible();
  await expect(page.getByTestId('verified-badge')).toContainText('verifiziert');
  await page.getByTestId('skip').click();
  await expect(page.getByTestId('run-result')).toHaveText('SIEG');
  await expect(page.getByTestId('combat-log')).toContainText('SIEG');
  const xp = Number(await page.getByTestId('reward-xp').innerText());
  expect(xp).toBeGreaterThan(0);

  // ---- claim rewards (idempotent: afterwards disabled with reason)
  await page.getByTestId('claim-rewards').click();
  await expect(page.getByTestId('claim-rewards')).toBeDisabled();
  await expect(page.getByTestId('claim-rewards-reason')).toContainText('bereits abgeholt');
  const level = Number(await page.getByTestId('top-level').innerText());
  expect(level).toBeGreaterThanOrEqual(1);

  // ---- inventory: equip a dropped item (first-clear guarantee is a magic weapon)
  await page.getByTestId('nav-inventory').click();
  const before = await readEquipment(page);
  await page.getByTestId('nav-inventory').click();
  const cells = page.locator('[data-testid="grid-inventory"] button.cell');
  const count = await cells.count();
  expect(count).toBeGreaterThan(0);
  let equipped = false;
  for (const rarity of ['magic', 'rare', 'unique', 'normal']) {
    const cand = page.locator(`[data-testid="grid-inventory"] button.cell[data-rarity="${rarity}"]`);
    for (let i = 0; i < (await cand.count()) && !equipped; i++) {
      await cand.nth(i).click();
      await expect(page.getByTestId('detail-tooltip')).toBeVisible();
      await expect(page.getByTestId('comparison')).toBeVisible();
      const btn = page.locator('[data-testid^="equip-"]:enabled').first();
      if ((await btn.count()) > 0) {
        await btn.click();
        equipped = true;
      }
    }
    if (equipped) break;
  }
  expect(equipped).toBe(true);
  const afterEquip = await readEquipment(page);
  expect(afterEquip).not.toEqual(before);

  // ---- forge: imprint a normal item if possible, otherwise the disabled reason must be shown
  await page.getByTestId('nav-forge').click();
  const normalPick = page.locator('[data-testid^="forge-item-"]', { hasText: 'Normal' }).filter({ hasText: 'Inventar' }).first();
  if ((await normalPick.count()) > 0) await normalPick.click();
  const runBtn = page.getByTestId('recipe-imprint-run');
  if (await runBtn.isEnabled()) {
    await expect(page.getByTestId('craft-preview')).toBeVisible();
    await runBtn.click();
    await expect(page.getByTestId('toast-success').filter({ hasText: 'Prägen' })).toBeVisible();
    await expect(page.getByTestId('forge-selected')).toContainText('Magisch');
  } else {
    await expect(page.getByTestId('recipe-imprint-reason')).not.toBeEmpty();
  }

  // ---- reload: identical character
  await waitSaved(page);
  const equipBefore = await readEquipment(page);
  const nameBefore = await page.getByTestId('char-name').innerText();
  const levelBefore = await page.getByTestId('char-level').innerText();
  const xpBefore = await page.getByTestId('char-xp').innerText();
  const goldBefore = await page.getByTestId('top-gold').innerText();
  await page.reload();
  await expect(page.getByTestId('top-name')).toHaveText(nameBefore);
  const equipAfter = await readEquipment(page);
  expect(equipAfter).toEqual(equipBefore);
  await expect(page.getByTestId('char-level')).toHaveText(levelBefore);
  await expect(page.getByTestId('char-xp')).toHaveText(xpBefore);
  await expect(page.getByTestId('top-gold')).toHaveText(goldBefore);
  // the claimed run is still shown claimed after reload (no duplicate rewards)
  await page.getByTestId('nav-combat').click();
  await expect(page.getByTestId('claim-rewards')).toBeDisabled();
});

test('jeder Navigationsknopf öffnet einen echten Screen; gesperrte zeigen den Grund', async ({ page }) => {
  await createCharacter(page, 'Navigator', 77);
  const screens = ['character', 'inventory', 'talents', 'skills', 'dungeons', 'combat', 'forge', 'codex', 'settings'];
  for (const id of screens) {
    await page.getByTestId(`nav-${id}`).click();
    await expect(page.getByTestId(`nav-${id}`)).toHaveAttribute('aria-current', 'page');
    const main = page.getByTestId(`screen-${id}`);
    await expect(main).toBeVisible();
    await expect(main.locator('h1').first()).toBeVisible();
  }
  for (const [id, reason] of [['rifts', 'Stufe 60'], ['constellations', 'Stufe 60'], ['buildlab', 'Phase 3']] as const) {
    await expect(page.getByTestId(`nav-${id}`)).toBeDisabled();
    await expect(page.getByTestId(`nav-${id}-reason`)).toContainText(reason);
  }
});

test('Tastatur: Charakter per Enter erstellen, Navigation per Tab erreichbar', async ({ page }) => {
  await page.goto('/?seed=99');
  await page.getByTestId('create-name').focus();
  await page.keyboard.type('Tastenheld');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('top-name')).toHaveText('Tastenheld');
  await page.getByTestId('nav-skills').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('screen-skills')).toBeVisible();
});

test('Import lehnt beschädigte Speicherdatei mit verständlicher Meldung ab', async ({ page }) => {
  await createCharacter(page, 'Importeur', 5);
  await page.getByTestId('nav-settings').click();
  await page.getByTestId('import-file').setInputFiles({ name: 'kaputt.json', mimeType: 'application/json', buffer: Buffer.from('{"format":"darkforge-save","checksum":"00000000","state":{}}') });
  await expect(page.getByTestId('import-error')).toContainText('Prüfsumme');
  await expect(page.getByTestId('top-name')).toHaveText('Importeur');
});
