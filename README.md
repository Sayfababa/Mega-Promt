# DARKFORGE

Datengetriebenes Dark-Fantasy-Loot-RPG als HTML5-Browsergame (Singleplayer, offline-first).
Verbindliche Spezifikation: [`spec/DARKFORGE_ULTRA_MASTER_PROMPT_DE.md`](spec/DARKFORGE_ULTRA_MASTER_PROMPT_DE.md).

## Befehle (npm)

| Befehl | Zweck |
|---|---|
| `npm install` | Abhängigkeiten installieren |
| `npm run dev` | Entwicklungsserver (Vite) |
| `npm run build` | Typprüfung + Produktions-Build nach `dist/` |
| `npm test` | Unit-, Property- und Regressionstests (Vitest, fast-check) |
| `npm run test:e2e` | Playwright-End-to-End (Meilenstein-Durchlauf) |
| `npm run balance` | Balance-Simulation → `reports/` (`DF_SEEDS`, `DF_BOTS` steuern den Umfang) |
| `npx tsx src/tooling/updateGold.ts` | Gold-Regression-Hashes neu schreiben (nur nach bewusster, protokollierter Änderung) |

## Architektur

```
src/engine/   reine, deterministische Spiellogik – importiert niemals React/DOM
  core/        rng.ts (mulberry32 + Sub-Streams), fixedPoint.ts, hash.ts
  stats/       aggregate.ts (lokal → global), mitigation.ts (zentrale Formeln)
  combat/      simulate.ts (100-ms-Scheduler, Status, Trigger-Budgets, APL), monsterScaling.ts, combatants.ts
  loot/        generator.ts (Drops, MF, Unique-Eligibility), affixRoll.ts (Pools, Tiers, Werte, Odds)
  crafting/    recipes.ts (Validierung ohne Nebenwirkung, exakte Vorschau)
  progression/ levels.ts   ·  endgame/ rifts.ts  ·  run/ run.ts
  state/       gameState.ts, commands.ts (einziger Weg, den Zustand zu ändern)
src/content/  Balance-Konstanten (balance.ts), Affixe, Basen, Uniques, Klassen, Skills, Passivbaum, Monster, Dungeons
src/app/      React-UI (animiert nur gespeicherte/replayte Engine-Events)
src/persistence/ Dexie-Speicher, Zod-Schema, Export/Import mit Prüfsumme
src/tooling/  Balance-Runner, Referenz-Builds, Gold-Hashes
docs/         GDD, BALANCE_V1, EVENT_ORDER, DATA_SCHEMA, IMPLEMENTATION_PLAN, DECISIONS, ASSETS
reports/      erzeugte Balance-Berichte
```

Invarianten: kein `Math.random()` in der Engine; jede Zustandsänderung ist ein typisierter Command
(atomar, Rollback bei Fehler); gleiche Seeds → bitidentische Event-Hashes (auch im Fast-Forward);
Balance-Änderungen nur über `src/content/balance.ts` mit Eintrag in `BALANCE_CHANGELOG.md`.

## Bilder / Assets

Die vollständige Liste der benötigten Bilder mit Pfaden, Größen, Stilleitfaden und Prompt-Vorlagen
steht in [`docs/ASSETS.md`](docs/ASSETS.md). Bilder kommen nach `public/assets/<icon>.webp`;
fehlende Bilder werden durch Platzhalter ersetzt.
