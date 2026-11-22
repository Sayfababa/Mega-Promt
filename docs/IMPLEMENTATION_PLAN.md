# IMPLEMENTATION_PLAN — Etappen

Grundlage: Spec §20 (Roadmap), §21 (Abnahmetests), §22 (Vorgehen). Jede Etappe endet spielbar/testbar, mit grünen `npm test`-Läufen und ehrlichem Statusbericht (§22: implementiert, geänderte Dateien, Befehle + Resultate, offene Bugs/Balanceabweichungen, nächster Schritt). Balance-Werte nur in `src/content/balance.ts` (D-006).

Befehle (D-001): `npm run dev`, `npm run build`, `npm test`, `npm run test:e2e`, `npm run balance`.

## Phase 1 — Vertical Slice

Umfang (§20 + D-005): Wächter Lv1–15; Skills Spaltender Hieb, Schildwall, Bluternte, Rüstungsbruch; 4 passive Knoten; Builds 2H-Blutung vs 1H-Schild; Slots Hauptwaffe, Nebenhand, Brust, Helm, Ring, Amulett; ≥8 Basen; ≥15 Affixfamilien; 4 Uniques mit Hooks (+2 niedrigstufige, D-046); Dungeons „Das Verlassene Tor“ (Lv1–7, 3+Boss Rostwächter) und „Verfallene Krypta“ (Lv8–14, 4+Boss Grabherr); 1 Gegner gleichzeitig; Rift-Probe (D-050); Prägen, Anreichern, Ergänzen; Inventar, Stash, Vergleich, Stats, Kampfdarstellung, Persistenz, Basisloot; Fixtures + Reports.

### E0 — Spezifikation (dieses Dokumentpaket)
- Lieferung: `docs/GDD.md`, `BALANCE_V1.md`, `EVENT_ORDER.md`, `DATA_SCHEMA.md`, `IMPLEMENTATION_PLAN.md`, `DECISIONS.md`.
- Abnahme: Alle Spec-Widersprüche im Decision Log mit ID/Status; Rift- und Waffen-DPS-Tabellen nachgerechnet.

### E1 — Projektgerüst und Kern
- Vite + React 18 + TS strict, ESLint-Regel: `src/engine/**` darf nicht `react`/DOM importieren; Verbot `Math.random` in Engine (Lint + Test).
- `engine/core/rng.ts` (mulberry32 + xmur3-Substreams, D-002), `hash.ts` (D-076), `events.ts`, `commands.ts` (Command-Bus mit Vorbedingung/Resultat/Rollback), `validators.ts` (Zod-Schemas aus `DATA_SCHEMA.md`).
- `content/balance.ts` mit allen Konstanten aus `BALANCE_V1.md`; `BALANCE_CHANGELOG.md` angelegt.
- Abnahme:
  - [ ] `npm run build`, `npm test` grün in CI-ähnlichem Lauf.
  - [ ] RNG: Referenzsequenz für festen Seed (Golden-Test), Substreams unabhängig (MF-Änderung verschiebt `loot.affix` nicht).
  - [ ] Property-Test: alle Wahrscheinlichkeiten ∈ [0,1], Gewichte ≥ 0, keine NaN (fast-check).
  - [ ] Architektur-Test: kein React/DOM-Import in `engine`.

### E2 — Stats und Schadensresolver
- `stats/aggregate.ts` (Attribute, lokale → globale Mods, Caps), `damage.ts`, `mitigation.ts` exakt nach `GDD.md §6` und `EVENT_ORDER.md §3`.
- Abnahme (§21 Engine):
  - [ ] `localPhysical` auf Waffe skaliert keinen Zauber.
  - [ ] Globales Feuer wirkt nur bei FIRE-Tags.
  - [ ] Resistenz-Cap 75%, Über-Cap bleibt für Penetration; `effectiveRes` korrekt.
  - [ ] Armor-Formel, Cap 0.70; Block 55%/Schild 70%/Cap 75%; Krit-Caps.
  - [ ] Schaden ≥ 1 nach Mitigation; keine negativen HP/Mana.
  - [ ] Golden-Tests mit Handrechnung (Wächter Lv1 + Kurzschwert vs Monster L1).

### E3 — Kampf-Engine
- `combat/scheduler.ts` (100-ms-Ticks, Phasen 1–7), `target.ts`, `skills.ts` (4 Wächter-Skills + Basisangriff), `statuses.ts` (Blutung, Verwundbar, Rüstungsbruch-Debuff, Barriere), `triggers.ts` (Queue + Budgets), APL.
- Abnahme (§21 Engine):
  - [ ] Gleicher Seed + Zustand → byte-identischer Ergebnis-Hash (100 Seeds).
  - [ ] Fast-forward ≡ schrittweiser Replay (UI-Skip = vollständiger Replay).
  - [ ] Statuscaps (5 Bleed-Stacks) und Triggerbudget halten (Property-Test mit künstlichem Endlos-Trigger → `TRIGGER_SUPPRESSED`).
  - [ ] Keine Endlosschleifen; `maxCombatTime` 90 s/150 s erzwungen.
  - [ ] Dodge/Block unabhängig in priorisierter Reihenfolge (Statistiktest).
  - [ ] Bluternte verbraucht Stacks laut D-023.

### E4 — Items und Loot
- `loot/eligibility.ts`, `generator.ts`, `tables.ts`, `rarity.ts`; Content: ≥8 Basen (z. B. Kurzschwert, Langschwert, Kriegsaxt, Zweihandaxt, Zweihandschwert, Schild, Platten-/Lederbrust, Platten-/Stoffhelm, Rubin-/Saphirring, Amulett), ≥15 Affixfamilien für die 6 Slots (p01, p02, p03, p07, p13, p15, p18, s01, s02, s04, s05, s08, s10, s11–s14, s16, s19).
- Abnahme (§21 Loot):
  - [ ] 100 000 Items: Raritätsverteilung im 99%-Konfidenzintervall.
  - [ ] Nie 4 Präfixe, nie unzulässige Affixe, max 1 Mod/`groupId`.
  - [ ] T1 nur ilvl ≥ 80; Tiergewichte renormiert.
  - [ ] Jeder Affix hat gültige Gruppe, Gewicht, Tier.
  - [ ] Null-Unique-Pool → Rare-Fallback + `failedUniqueRoll` + Telemetrie.
  - [ ] MF ändert nie Tier-Rolls bei gleichem Seed (nur Qualität).
  - [ ] E[Items] 0.95/1.55/2.9/3.1 und P(≥1 Unique) Boss 4.283% exakt aus Tabellen.

### E5 — Charakter, Inventar, Stash, Progression
- Commands `CREATE_CHARACTER`, `EQUIP_ITEM`, `UNEQUIP_ITEM`, `STASH_ITEM`, `SALVAGE_ITEMS`, `SET_PASSIVE`, `SET_SKILL_PRIORITY`, `RESET_BUILD`; XP/Level/Attribute; 4 Talentknoten (D-048).
- Abnahme:
  - [ ] 2H verhindert Schild; Ringinstanz nie doppelt; Item nie an zwei Orten.
  - [ ] Nach EQUIP ändert sich das Kampfergebnis entsprechend (Fixture).
  - [ ] Locked/Unique wird nicht automatisch verwertet.
  - [ ] XP genau einmal je Begegnung; Überlevel-Malus; Refund-Kosten.

### E6 — Dungeons, Runs, Belohnungen
- `START_RUN`, `RESOLVE_RUN`, `CLAIM_REWARDS`; Tor + Krypta inkl. Bosse Rostwächter/Grabherr (Mechaniken D-059); Elites (D-080); Gold, Materialien; Frustschutz (Magie-Waffen-Upgrade, Rare ≥4 nach Lv10); Pending-Rewards.
- Abnahme:
  - [ ] Loot nur nach finalem Sieg; Niederlage kostet keine Ausrüstung.
  - [ ] `CLAIM_REWARDS` idempotent; volles Inventar → Pending-Panel, nichts verloren.
  - [ ] Gold/Materialien unabhängig von Favoriten/Filter.

### E7 — Crafting (Prägen, Anreichern, Ergänzen)
- `crafting/recipes.ts`, `cost.ts`, `transaction.ts`, `preview.ts` (`craftOdds`).
- Abnahme (§21 Crafting):
  - [ ] Fehlendes Material → keine Änderung; fehlender Modpool → keine Änderung, keine Abbuchung.
  - [ ] Einmalige Abbuchung auch nach Reload (Nonce/Transaktion).
  - [ ] Ring/Amulett-Affix nicht auf falschem Slot; kein Item > 6 explizite Mods.
  - [ ] Preview-Wahrscheinlichkeiten = Monte-Carlo-Häufigkeiten (Toleranz) und Beispiel §7.1 (37.5% / 5% / 1.875%) reproduziert.
  - [ ] Unique kann keine Rare-Affixe erhalten.

### E8 — Uniques mit Hooks
- 4 Uniques mit echten Event-Handlern (Vorschlag D-046) + Kupferner Reißer + Ausgefranster Mantel.
- Abnahme:
  - [ ] Jeder Hook in eigener Combat-Fixture messbar (Trigger-Count > 0, Tradeoff wirkt).
  - [ ] Interne Cooldowns und Budgets greifen.

### E9 — Persistenz
- Dexie-Schema, transaktionale Commits, Autosave nach Commands, Export/Import (Zod), Migrationen, 3 Backups, Checksumme, Reparatur.
- Abnahme:
  - [ ] Aktiver Charakter nach Reload identisch (Deep-Equal + Hash).
  - [ ] Ungültiger Import wird sinnvoll abgelehnt.
  - [ ] Abbruch zwischen Abbuchung und Commit erzeugt weder Verlust noch Gratis-Craft.

### E10 — UI
- Screens: Charakter, Inventar (Vergleichstooltip), Skills/APL, Talente (4 Knoten), Dungeons, Kampf (Portraits, Bars, Status, Log, Timeline, x1/x2/x4/Skip), Schmiede (Vorschau, Materialsaldo), Stash, Einstellungen (Export/Import). Raritätsfarben + Textlabel.
- Abnahme:
  - [ ] Jeder Button bewirkt validierten Command oder ist mit Grund deaktiviert (kein Dual-Wield-Button, D-033).
  - [ ] Kampfanzeige animiert ausschließlich gespeicherte Events.
  - [ ] Tastaturbedienung grundlegend; Tooltips mit Tier/Wert/Range/Gruppe/lokal-global.

### E11 — Balance-Tooling und Rift-Probe
- `npm run balance` → `reports/balance.html`, `builds.csv`, `drop-distribution.csv`, `crafting-costs.csv`, `progression.json`; Fixtures Blutungs-Wächter/Block-Wächter Early (Lv1, Lv7, Lv15); 10 000 Seeds je Fixture/Gegner; Rift-Probe (D-050); Gate-Report (T40-Timeout, D-007).
- Abnahme (§21 Balance):
  - [ ] ≥ 10 000 Seeds je Fixture; Reports aus echten Läufen.
  - [ ] Zielkorridore §18 Lv1/Lv15 als Warnungen ausgewiesen (nicht geschönt).
  - [ ] Zielverletzungen → Eintrag `BALANCE_CHANGELOG.md` + neue `balanceVersion`.

### E12 — End-to-End-Meilenstein
- Playwright: Create → Dungeon → Sieg → Loot → Ausrüsten → Craft → schwieriger Kampf → Reload.
- Abnahme (§21 Progression/UI, §22 Meilenstein):
  - [ ] Neuer Wächter betritt Tor/Krypta, gewinnt/verliert automatisch.
  - [ ] Erhält Item mit nachvollziehbar gewürfelten Affixen, rüstet aus, Kampfwerte ändern sich sichtbar.
  - [ ] Craftet, besiegt zuvor gescheiterten Boss durch Build-Anpassung (Seed-Fixture).
  - [ ] Fortschritt nach Reload identisch; keine Fake-Daten/Hardcoded-Siege.

## Phase 2
- 11 Slots, voller Waffen-/Rüstungskatalog (16 Waffen, Schild/Fokus/Totem, Rüstungsmaterialien, Ringe/Amulett/Gürtel/Relikt), Lv bis 60, Dungeons Aschental–Verbotene Schmiede, 50+ Affixfamilien, +10 Uniques, Lootfilter, Selten erheben / Neuschmieden / Präzise Essenz / Entfernen / Tier nachschmieden / Werte verfeinern / Versiegeln, XP-Balance.
- Abnahme: §21 Loot/Crafting vollständig für alle Rezepte; Waffen-DPS-Regel (±15%, 1.35–1.55) als automatischer Test über alle Tiers; Progressionsreport L1–60.

## Phase 3
- Arkanist, Schattenläufer; Skill-Modifikatoren (18 Supports); 3 Talentbäume à ≥27 Knoten; 12 Builds; Runensockel + Kombinationen; Crafting-Vorhersage + `estimateCraftPath`; Buildlabor (`simulateBuild`, `compareLoadouts` gepaart); 6+ Dungeons; Dual-Wield nur nach getesteter Formel (D-033).
- Abnahme: Build-Parität §18.1 (±20–25% Clear-Zeit-Median); Mana-oom-Anteil < 20% (≤ 35% Burst); Spell-Fixtures für Casterwaffen.

## Phase 4
- Rift 1–50 inkl. Modifikatoren, Konstellationen, 4 Pinnacle-Bosse, Fragmente, Boss-Siegel-Tausch, T1-Vollendung, Korruption, Sockel, 20+ Uniques.
- Abnahme: T40-Gate-Report (D-007) mit realen Simulationen; Boss-Siegel 18 Siege/Tausch; Exklusiv-Unique 4% MF-unabhängig; Reward-Cap +60%.

## Phase 5
- Nekromant, Runenschmied, Inquisitor (Lichtschlag gemäß D-004), 12 Spezialisierungen, 60+ Skills, 100+ Supports, 200+ Knoten, 150+ Uniques, 20 Dungeons, 15 Bosse, QoL, Accessibility, Balancezyklen.
- Abnahme: keine Platzhalter; jede Erweiterung mit Fixtures und Report.
