# DARKFORGE — ULTRA-MASTER-PROMPT / GAME DESIGN SPECIFICATION v1.0
## Datengetriebenes Dark-Fantasy-Loot-RPG als HTML5-Browsergame

> **AN DIE PROGRAMMIER-KI:** Dies ist ein ausführbarer Arbeitsauftrag plus verbindliches initiales Game-Design-Regelwerk. Du sollst die beschriebenen Regeln als echte Software implementieren, nicht bloß eine hübsche Demo zeichnen. Sämtliche Zahlen sind **Balance-Startwerte** (nicht als spielgetestete Wahrheiten ausgeben). Wo Ziele und Startzahlen widersprechen, dokumentiere den Konflikt, überprüfe ihn mit Simulationen und ändere zentral verwaltete Balance-Konstanten – nicht unsichtbar den Spielablauf. Arbeite in kleinen, vollständig spielbaren und getesteten Etappen. Dokumentiere Änderungen im Balance-Changelog.

---

# 0. ROLLE, ZIEL UND NICHT VERHANDELBARE REGELN

Du bist zugleich Principal Game Systems Designer, Senior TypeScript Engineer, Economy Designer, UX Designer, QA Lead und Technical Architect. Baue **DARKFORGE**, ein eigenständiges Singleplayer-HTML5-Loot-RPG, das die Item-Jagd und Crafting-Tiefe klassischer ARPGs mit automatisiert dargestellten, strategisch vorbereiteten Kämpfen verbindet.

**Kein 3D, keine Weltbewegung, keine WASD-Steuerung, keine Echtzeit-Eingaben im Kampf.** Die Entscheidungen finden VOR und ZWISCHEN Kämpfen statt: Gebiet, Schwierigkeit, Loadout, Talente, Skill-Prioritäten, Ausrüstung, Crafting, Lootfilter, Endgame-Spezialisierung. Während des Kampfes verarbeitet eine deterministische Simulation die Entscheidungen. UI: Held links, Gegner rechts, Animationen, Schaden, Statusanzeigen, Combat-Log, Geschwindigkeitssteuerung und überspringbarer Replay.

**Kein Fake-UI:** Jeder sichtbare Button bewirkt eine validierte, persistierte State-Änderung oder ist mit klarem Grund deaktiviert. Keine erlogenen Testergebnisse, keine zufälligen Zahlen nur zur Animation, keine ungeprüften Assets, keine Kopie geschützter Namen, Bilder, Runenwörter, Gegner, Orte oder Texte von Diablo / PoE / Shakes & Fidget. Deutsche Spieloberfläche, internationalisierbare Daten. Keine Monetarisierung, Energiebegrenzung, Daily-Pflicht, FOMO oder Pay-to-Win. Offline-first, später optionaler Online-Betrieb.

## 0.1 Wissenschaftlicher Anspruch an die Balance

- Verwende die Zahlen **exakt als Ausgangsversion `balanceVersion: 1`** und schließe die Regeln intern widerspruchsfrei.
- Berechne Ergebnisse statt eine Balance zu behaupten. Führe deterministische Tests, 10.000-Simulations-Batches und Monte-Carlo-Analysen aus.
- Ziele: Mehrere konkurrenzfähige Builds, keine exponentiellen Gratis-Synergien, transparenter Item-Fortschritt, sinnvolle Investitionsentscheidungen.
- Balance der Startwerte ist eine Hypothese. Veröffentliche Simulationsergebnisse und ändere numerische Konstanten bei Zielverfehlung; halte alte Werte in `BALANCE_CHANGELOG.md` fest.

# 1. TECHNIK UND REPOSITORY

**Stack:** React + TypeScript strict + Vite; Zustand für UI/Spielstand; Tailwind oder modulare CSS-Variablen; Zod für Laufzeitvalidierung; IndexedDB über Dexie für Persistenz; Vitest, fast-check (Property Tests), Playwright für E2E; pnpm oder npm (nur eines). `npm run dev`, `npm run build`, `npm test`, `npm run test:e2e`, `npm run balance` müssen dokumentiert sein.

**Struktur:**

```
src/
  engine/
    core/          rng.ts, fixedPoint.ts, commands.ts, events.ts, validators.ts
    stats/         aggregate.ts, damage.ts, mitigation.ts
    combat/        scheduler.ts, target.ts, skills.ts, effects.ts, statuses.ts, triggers.ts
    loot/          eligibility.ts, generator.ts, tables.ts, rarity.ts
    crafting/      recipes.ts, cost.ts, transaction.ts, preview.ts
    progression/   levels.ts, talents.ts, unlocks.ts
    endgame/       rifts.ts, atlas.ts, bosses.ts
  content/
    classes/ weapons/ armour/ bases/ affixes/ uniques/ runes/
    skills/ passives/ monsters/ bosses/ dungeons/ rifts/ crafting/
  app/
    screens/ components/ hooks/ store/ i18n/
  persistence/    schema.ts, migrations.ts, exportImport.ts
  tooling/        debugPanel.ts, combatReport.ts, economyReport.ts
  tests/          unit/ property/ fixtures/ e2e/
  styles/
```

**Architekturinvarianten:** `engine` importiert **niemals** React/DOM; Spielzustand ist ausschließlich durch typisierte Commands veränderbar; Content ist schema-validiertes JSON/TS-Objekt; definitionsbasierte IDs sind stabil; `balanceVersion`, `saveSchemaVersion`, `contentVersion` getrennt; Entscheidungen und RNG-Konsum sind deterministisch; UI animiert gespeicherte Kampfereignisse. Viele Runs müssen ohne Darstellung simulierbar sein. Keine `Math.random()` in der Engine. Nutze einen explizit spezifizierten und getesteten PRNG (z. B. `mulberry32` für Singleplayer; dokumentiere die Implementierung; langfristig bei Online-Version serverseitig sichere Entscheidungen). Alle Wahrscheinlichkeiten auf `[0,1]`, alle Gewichte nichtnegativ; Überläufe und NaN werden abgefangen. Geld-/Itemtransaktionen sind atomar, idempotent und protokolliert.

**Befehle:** `CREATE_CHARACTER`, `EQUIP_ITEM`, `UNEQUIP_ITEM`, `STASH_ITEM`, `SALVAGE_ITEMS`, `SET_PASSIVE`, `SET_SKILL_PRIORITY`, `CRAFT_ITEM`, `START_RUN`, `RESOLVE_RUN`, `CLAIM_REWARDS`, `SET_LOOT_FILTER`, `RESET_BUILD`, `SAVE_PRESET`, `LOAD_PRESET`. Jede Aktion benötigt Vorbedingungen, eindeutiges Resultat und Rollback bei Fehler. UI darf state niemals direkt manipulieren.

# 2. SPIELSCHLEIFE UND SPIELPHASEN

**Loop:** Dungeon/Rift wählen → Gegner- und Belohnungsprofil sehen → Build/Kampfrichtlinien festlegen → 1–5 automatisch simulierte Begegnungen → Loot/Gold/Materialien → Vergleich/Filter/Verwertung → Crafting/Talententscheidung → nächster Run. Eine Niederlage kostet **keine Ausrüstung**, nur den fehlgeschlagenen Run; bereits gesicherte Begegnungsbelohnungen sind nur dann vergeben, wenn die Run-Regel es ausdrücklich vorsieht. Keine Warteenergie. Wiederholungen sind unbegrenzt.

**Stufengrenzen:** Charakterlevel 1–100, normales Kampagnen-Spiel 1–59, Endgame ab Lv 60. Erste 10 Stufen Onboarding; 10–39 Kernsysteme; 40–59 fortgeschrittene Synergien; 60–100 Rifts/Bosse/Spezialisierung. Experience bis zur nächsten Stufe: `xpNext(L) = floor(85 * L^1.45)` für `1 ≤ L < 100`; Level 100 ist Cap. Ein Talentpunkt auf jeder neuen Stufe; zusätzlicher Spezialisierungspunkt bei L 20 und 45. Pro Level +2 Attributspunkte frei plus klassenbedingte automatische Boni (siehe Klassen). Ein einzelner Skillpunkt kann immer gegen Gold rückerstattet werden: `100 * max(1, level)^1.2` Gold, aufgerundet; Gesamtrücksetzung 5× Kosten eines Punktes (nicht Summe aller Punktekosten), erste Rücksetzung kostenlos. Ein Talentpunkt darf nur abgezogen werden, wenn nach dessen Entfernung alle gesetzten Knoten weiterhin verbunden/zulässig sind.

**Verbindliche XP-Auszahlung:** Pro gewonnenem normalem Encounter `xp = round(25 + 10*monsterLevel^1.25)`; Elite ×1.8; Dungeonboss ×3.5; Riftboss ×3.5, ohne zusätzliche Multiplikation mit Rift-HP. Wenn der Spieler mindestens 9 Level über dem Encounter ist: XP-Faktor `max(0.1, 1-0.1*(playerLevel-monsterLevel-8))`. XP pro Begegnung genau einmal nach siegreichem Ende; Kämpfe mit mehreren Gegnern geben Encounter-XP, keine dreifache Vermehrung. Tests kalibrieren XP/h, damit Level 1–10 schnell und 60+ deutlich langsamer fortschreiten. Bei Gegnern >5 Level über Charakter höchstens 1.5× XP (kein Exploit).

## 2.1 Ausrüstungsplätze und Startkatalog

11 Slots: Hauptwaffe, Nebenhand, Helm, Brust, Handschuhe, Stiefel, Gürtel, Amulett, Ring A, Ring B, Relikt. Zweihänder sperren Nebenhand. `offhand` kann Schild, Fokus oder zweite Einhandwaffe sein; Dual-Wield erst in Phase 3 vollständig aktivieren, bis dahin keine irreführende Schaltfläche. 20 Start-Item-Basen (unten) plus 11 Rüstungs-/Schmuck-Basisfamilien.

# 3. STATISTIKEN: EXAKTE DEFINITIONEN

## 3.1 Attribute

Klassenstartwerte (Stärke/Geschick/Intelligenz/Vitalität): Wächter `15/10/7/15`, Arkanist `6/10/18/11`, Schattenläufer `9/17/9/10`, Nekromant `7/10/17/11`, Runenschmied `13/9/14/11`, Inquisitor `12/10/12/13`.

Automatischer Levelaufstieg (+1 je Stufe): Wächter `+1 STR, +1 VIT`; Arkanist `+1 INT, +1 VIT`; Schattenläufer `+1 DEX, +1 VIT`; Nekromant `+1 INT, +1 VIT`; Runenschmied `+1 STR, +1 INT`; Inquisitor `+1 STR, +1 VIT`. Zusätzlich je Level **2 freie Punkte**, nicht automatisch verteilt. Jede Klasse kann also hybriden Build bauen.

- `maxHP = floor((100 + 12*(L-1) + 14*VIT + flatHP) * (1 + sumIncreasedMaxHP)) * productMoreMaxHP`.
- `maxMana = floor((60 + 3*(L-1) + 4*INT + flatMana) * (1+increasedMana))`; klassenspezifische Ressource ersetzt Mana später, sofern Skilldaten dies angeben.
- `physicalIncreasedFromSTR = 0.0035 * max(STR-10, 0)` (additiv mit anderen *increased physical*).
- `spellIncreasedFromINT = 0.0035 * max(INT-10, 0)`.
- `attackSpeedIncreasedFromDEX = 0.0015 * max(DEX-10, 0)`.
- `critChanceFromDEX = 0.00035 * max(DEX-10, 0)` (also 100 zusätzliche DEX = +3,5 Prozentpunkte).
- `baseHPRegenPerSecond = 0.005 * maxHP`, `baseManaRegenPerSecond = 2 + 0.015*maxMana`; beide durch Boni skalierbar.
- Caps: Crit-Chance `[0.05,0.55]`, Crit-Multiplikator maximal `3.0x`, Resistenzen `[-0.50,0.75]`, Blockchance `[0,0.40]`, Ausweichchance `[0,0.35]`, Cooldown Reduction `[0,0.40]`, Lebensraub `[0,0.08]` des **tatsächlich zugefügten direkten Schadens**, regeneriert maximal 15 % MaxHP pro Sekunde; Attacks/Sekunde `[0.40,2.5]`. Direkter Schaden nicht unter 1 nach aktiver Mitigation, mit Ausnahme vollständiger Immunität aus expliziten Mechaniken.
- Über-Cap-Resistenzen bleiben als `uncappedResistance` für gegnerische Penetration erhalten, aber effektiver Normalwert ist 75 %; `effectiveRes = clamp(uncappedResistance - enemyPenetration, -0.5, 0.75)`.

## 3.2 Modifikatoren – Semantik

**Local:** `localFlatPhysical`, `localIncreasedPhysical`, `localAttackSpeed`, `localCritChance` wirken auf die Waffe selbst vor Charakterstat-Aggregation. Bei Angriffen: `weaponMin/Max = (baseMin/Max + localFlatPhysMin/Max)*(1+sumLocalIncPhysical)`; danach `weaponAPS = baseAPS*(1+sumLocalIncAttackSpeed)`; `weaponCrit = baseCrit + sumLocalCritChance`.

**Global:** `+X% increased physical/fire/attack/spell/...` werden innerhalb der jeweils anwendbaren Klasse **addiert**. `X% more damage` wird nur auf explizit dafür geeignete einzelne Effekte angewendet und **multipliziert**, niemals als normale seltene Affixe. Gegenstände mit `MORE` erhalten negative Tradeoffs und ein `stackingGroup`-Limit. Globale flache Waffenschäden werden standardmäßig nicht als Spell-Damage angewendet.

**Reihenfolge:** Basis-Skillwert → lokale Waffenwerte → additive Flat-Boni → additive `increased` nach Tags → multiplikative `more` nach Gruppen → kritischer Treffer (nur direkter Schaden, außer Skills nennen explizit DoT-Crit) → gegnerische Rüstung/Resistenz → Block/Barriere/HP → Lebensraub → Status-/Trigger-Ereignisse. Zeitabhängige Effekte sind vor ihrer Aktion aktualisiert. Rundung nur an dokumentierten Grenzen. Keine doppelten lokalen/globalen Boni.

## 3.3 Schaden und Verteidigung

`rawAttack = (mean(weaponMin, weaponMax) * skillWeaponCoefficient + skillFlatDamage + validGlobalFlat) * (1+ΣapplicableIncreased) * Π(1+moreGroup)`.

`rawSpell = (skillFlatBase + INT * skillIntCoefficient + validGlobalFlatSpell) * (1+ΣapplicableIncreased) * Π(1+moreGroup)`.

`critDamage = rawDamage * (1.5 + sumCritMultiplierBonus)` bei erfolgreichem Krit (max. 3.0). Charakter-Critchance = Waffenbasis + lokale Verbesserungen + globale Krit-Chance + Geschicklichkeitsanteil + Skillbonus, anschließend Cap.

`physicalReduction = min(0.70, armor/(armor + 450 + 25*attackerLevel))` für physischen Schaden; `elementalDamageTaken = postCritDamage * (1 - effectiveResistance)`; physischer Schaden nach Armor. Der Krit-/Armor-/Resist-Resolver ist eine zentrale Library-Funktion, kein UI-Code.

**Ausweichen:** Ein berechtigter direkter Treffer hat P = defender.evasionChance vollständig auszuweichen; globale spellartige Treffer können ebenfalls ausgewichen werden, wenn `evadable:true`. **Blocken:** Nur bei nicht ausgewichenem, `blockable:true` Treffer; blockiert standardmäßig 55 % des restlichen Schadens, nicht 100 %. Schild-Basis erhöht Blockchance. Hohe Defensive darf Bosse nicht vollkommen trivialisieren.

**Barrier:** absorbiert Schaden vor HP, besitzt eigenes Maximum (`maxBarrier ≤ 60% maxHP` ohne spezifischen Unique-Tradeoff), läuft nach 8 Sekunden ohne neuen Barrriere-Gewinn aus; nicht automatisch durch HP-Heilung wiederherstellen. Schaden über Zeit kann standardmäßig Barrieren treffen, `bypassesBarrier` nur bei expliziten Gegnerfähigkeiten.

# 4. WAFFEN, BASISWERTE UND RÜSTUNGEN

Die folgenden Werte gelten für **Tier-1-Basen am Start**. Alle Waffen skalieren mit Basisstufen: T1 ab Lv 1 ×1.00; T2 ab Lv 12 ×1.75; T3 ab Lv 25 ×3.10; T4 ab Lv 40 ×5.30; T5 ab Lv 60 ×8.70; T6 ab Lv 80 ×12.80. Nur Basisschadenszahlen werden per `roundHalfUp` skaliert; APS und Grundkrit bleiben gleich. Hochstufige Items können weiterhin niedrige Basen sein – solche Basen dienen Nischen-Crafting. Item-Level ist unabhängig vom Basis-Tier.

| Waffenfamilie | Hände | Base Min–Max | Angriffe/s | Grundkrit | Fester impliziter Bonus | Tradeoff / Identität |
|---|---:|---:|---:|---:|---|---|
| Dolch | 1 | 8–13 | 1.55 | 8% | +5 Prozentpunkte Krit gegen blutende Ziele | geringe Treffergröße |
| Kurzschwert | 1 | 12–18 | 1.20 | 5% | +8% physischer globaler Angriffsschaden | Allrounder |
| Langschwert | 1 | 14–21 | 1.05 | 5% | +10% Blockstärke bei Schildeinsatz | defensiver Hybrid |
| Kriegsaxt | 1 | 16–25 | 0.95 | 5% | +15% Blutungsdauer | DoT-Synergie |
| Streitkolben | 1 | 17–27 | 0.90 | 5% | +12% Armor Penetration für Waffentreffer | starke Einzeltreffer |
| Speer | 2 | 22–32 | 0.96 | 6% | +5 Prozentpunkte Krit-Chance gegen Bosse | Zweihand, bessere Bossspitze |
| Zweihandschwert | 2 | 24–36 | 0.84 | 5% | +12% Schaden bei HP >70% | verlässlicher Burst |
| Zweihandaxt | 2 | 28–42 | 0.74 | 5% | +18% Blutungsschaden | langsamer DoT-Burst |
| Kriegshammer | 2 | 33–49 | 0.64 | 5% | +18% Stärkeschaden gg. Barriere | sehr langsam |
| Bogen | 2 | 19–29 | 1.08 | 7% | +12% Giftschaden | schneller Fernkampf |
| Armbrust | 2 | 30–43 | 0.70 | 6% | +15 Prozentpunkte Krit-Multiplikatorbonus | langsamer Burst |
| Krallen | 1 | 9–15 | 1.42 | 7% | +10% Auslösechance für Gift | eingeschränkte Klassen |
| Zauberstab | 1 | 6–10 | 1.15 | 5% | +12% globaler Zauberschaden | kleiner Waffenangriff |
| Magierstab | 2 | 9–16 | 0.90 | 5% | +35% globaler Zauberschaden | kein Fokus |
| Ritualzepter | 1 | 10–15 | 1.00 | 5% | +12% DoT-Effektstärke | Hybrid-Zauber |
| Runenklinge | 1 | 11–17 | 1.15 | 6% | +8% Elementarschaden | Hybrid-Attack |

**Balanceregel:** Die DPS-Spannweite gleicher Tier-/Handkategorie und gleicher Schadensrolle (martialische Zweihänder einschließlich Bogen/Armbrust; martialische Einhänder) darf **bei neutralem Skill ohne implizite Boni** maximal ±15 % um ihren Median liegen; Casterwaffen über separate Spell-DPS-Fixtures balancieren; Unterschiede in Geschwindigkeit/Krit/Mechanik dürfen den neutralen Direkt-DPS nicht versehentlich verdoppeln. Zweihänder sollen im Durchschnitt 1.35–1.55× neutralen Waffenschaden einer Einhandwaffe haben, verlieren jedoch Schild/Fokus oder Dual-Wield. Wenn Tabellendaten diese Ziele verletzen, priorisiere die messbaren Balanceziele und justiere vor der Veröffentlichung mit Report. **Die Start-Tabelle wurde grob auf neutrale Attack-DPS geprüft; die tatsächlichen Skill-/Crit-/Rüstungskombinationen sind noch zu simulieren.**

### 4.1 Nebenhände

Schild: `+9% Blockchance`, `+15% Blockstärke` (also geblockter Anteil 70% statt 55%, maximal 75%), Basis-Armor +35 T1 skalierend mit Rüstungs-Tier; Fokus: `+10% Zauberschaden`, `+8% Mana-Regeneration`; Totem: `+10% DoT-Schaden`, `+10% Fluchdauer`. Dual-Wield spätere Phase: alternierende Haupt-/Nebenhandangriffe, kein doppeltes vollwertiges Attackfenster, +8% global erhöhte Angriffsgeschwindigkeit, -10% Basisschaden beider Waffen; nicht implementieren, bevor diese Formel getestet wurde.

### 4.2 Rüstung / Schmuck

Basispanzerung T1 Helm 15, Brust 45, Handschuhe 10, Stiefel 12, Gürtel 8; skaliere mit Rüstungs-Tier-Multiplikatoren `1 / 1.8 / 3.2 / 5.5 / 9.0 / 13.5`; alle Basiswerte plus lokale Armor-Affixe. Item-Basen sind `Platten` (100% Armor), `Leder` (55% Armor +4% Evasion auf Brust, +2% auf übrigen Plätzen), `Stoff` (25% Armor + Mana oder Barriere: Brust +6% maxMana; Helm +4%, Handschuhe +3%, Stiefel +3%). Schmuck hat keine Armor, aber Basis-Implizite: Rubinring +12% Feuerresistenz, Saphirring +12% Frostresistenz, Topasring +12% Blitzresistenz, Onyxring +10% Schattenresistenz, Amulett +8% eines wählbaren Hauptattributs, Gürtel +5% maximales Leben, Relikt +5% Effektstärke (nur eine Art). Werte ggf. nach Test einstellen. Ring-Slots funktional gleichwertig, keine Doppelbelegung derselben Item-Instanz.

# 5. ITEM-LEVEL, SELTENHEIT UND MOD-SLOTS

`itemLevel` liegt 1–100. Normale Gegner: `clamp(monsterLevel + uniformInt(-1,+1),1,100)`; Elite: `monsterLevel +1`; Boss: `monsterLevel +2`; Rift: `monsterLevel = clamp(60+floor(0.6*(riftTier-1)),60,100)`; über 100 skalieren Monster-HP und Mechaniken weiter, nicht Affix-Level. Basis-Tier muss über `dropZoneLevel ≥ minBaseLevel` zugelassen sein.

Qualitäten: **Normal** 0 explizite Affixe, **Magisch** max 1 Präfix + 1 Suffix, **Selten** max 3 Präfixe + 3 Suffixe, **Unique** fest definierte Sondermodifikatoren und variable Unique-Rolls statt Rare-Affixe. Rare-Drops erhalten 3/4/5/6 explizite Affixe mit 20/40/30/10%; bei `itemLevel <20` maximal 4. Ein affixloser Rare nach Crafting bleibt Rare. Nur explizite Affixe zählen gegen 3/3; implizite Boni, Runen und Corruption-Enchants sind separate Slots.

**Affix-Tiers** (`T1` ist höchstes reguläres Tier): T5 ab ilvl1, T4 ab 20, T3 ab 40, T2 ab 60, T1 ab 80. Optionales `T0` nur spezielle Endgame-Quellen ab ilvl94, maximal **ein** T0-Affix pro Item, niemals durch normale Chaos-/Essenz-Aktionen generierbar. Affix-Tier-Gewichte T5=30, T4=30, T3=23, T2=12, T1=5; aus derzeit erlaubten Tiers **neu normieren**. T0 nur bei deklarierter Quelle, Gewicht 0.5 in deren Spezialpool. Der Affix-Spawn wird zuerst nach Affixfamiliengewicht, dann nach erlaubtem Tier gewichted ausgewählt; niemals Tiers mit ungültigen Leveln ziehen und verwerfen.

Ein Gegenstand darf pro `groupId` nur **einen** Mod besitzen, unabhängig von dessen Tier, Präfix/Suffix und Crafting-Herkunft. Leere Pools führen zu verständlicher Fehlermeldung **ohne Materialverbrauch**.

# 6. VOLLSTÄNDIGER START-AFFIX-KATALOG

**Wertekonvention:** Tabelle gibt ein **T3-Referenzintervall** an. Andere Tiers erhalten Faktor `T5=0.50, T4=0.73, T3=1.00, T2=1.35, T1=1.75`; integer-Werte auf ganze Zahlen runden, Prozente auf eine Nachkommastelle, Mindestwert nicht größer als Maximalwert. Dies ist ein klarer Initialgenerator und kann für einzelne Affixe später durch explizite Tiers ersetzt werden. Gleicher Familienname + Tier = gleiche `groupId`. `P`=Präfix, `S`=Suffix. `M`=martialische Waffen, `C`=Casterwaffen, `A`=Rüstungsstücke, `J`=Ringe/Amulette, `B`=Gürtel, `O`=Schild/Fokus, `R`=Relikte, `X`=alle. Familiengewichte sind *relative Spawn-Gewichte*, nicht Drop-Wahrscheinlichkeiten. T0 benötigt Sonderdefinition, nicht automatisch T1×1.75.

| ID | Seite | Gruppe / Affix | Erlaubte Slots | T3-Intervall | Gewicht | Tags/Semantik |
|---|---|---|---|---|---:|---|
| p01 | P | lokale phys. % | M | 70–100% | 90 | LOCAL_WEAPON_DAMAGE |
| p02 | P | lokaler phys. Flatschaden | M | +7–12 bis +12–20 | 85 | LOCAL_WEAPON_FLAT |
| p03 | P | lokaler Element-Flatschaden Feuer | M | +6–10 bis +11–18 | 65 | LOCAL_FIRE_ATTACK |
| p04 | P | lokaler Element-Flatschaden Frost | M | +6–10 bis +11–18 | 65 | LOCAL_COLD_ATTACK |
| p05 | P | lokaler Element-Flatschaden Blitz | M | +4–14 bis +8–23 | 65 | LOCAL_LIGHTNING_ATTACK |
| p06 | P | Zauberschaden % | C,J,R | 15–24% | 80 | GLOBAL_SPELL |
| p07 | P | Physisch % global | J,R,B | 14–22% | 75 | GLOBAL_PHYSICAL |
| p08 | P | Elementarschaden % | C,J,R | 15–22% | 75 | GLOBAL_ELEMENTAL |
| p09 | P | Feuer % | C,J,R | 20–30% | 70 | GLOBAL_FIRE |
| p10 | P | Frost % | C,J,R | 20–30% | 70 | GLOBAL_COLD |
| p11 | P | Blitz % | C,J,R | 20–30% | 70 | GLOBAL_LIGHTNING |
| p12 | P | Schatten % | C,J,R | 20–30% | 70 | GLOBAL_SHADOW |
| p13 | P | maximale LP flach | A,J,B,O,R | 65–105 | 95 | FLAT_HP |
| p14 | P | maximale Mana flach | A,J,B,O,R | 55–90 | 90 | FLAT_MANA |
| p15 | P | lokale Rüstung % | A,O | 55–85% | 90 | LOCAL_ARMOUR |
| p16 | P | maximale Barriere | A,O,R | 50–90 | 65 | FLAT_BARRIER |
| p17 | P | Giftschaden % | M,J,R | 20–30% | 65 | GLOBAL_POISON |
| p18 | P | Blutungsschaden % | M,J,R | 20–30% | 65 | GLOBAL_BLEED |
| p19 | P | Dienerschaden % | C,J,R | 20–35% | 55 | MINION_DAMAGE |
| p20 | P | HP-Regeneration flach/sec | A,B,O | 5–9 | 80 | HP_REGEN |
| p21 | P | Fluchwirkung % | C,R,J | 12–20% | 55 | CURSE_POWER |
| p22 | P | Schutzschild-Effekt % | O,R,A | 12–20% | 60 | BARRIER_POWER |
| s01 | S | Stärke flach | M,A,J,B,O | 12–19 | 100 | ATTR_STR |
| s02 | S | Geschick flach | M,A,J,B,O | 12–19 | 100 | ATTR_DEX |
| s03 | S | Intelligenz flach | C,A,J,B,O | 12–19 | 100 | ATTR_INT |
| s04 | S | Vitalität flach | A,J,B,O,R | 12–19 | 100 | ATTR_VIT |
| s05 | S | Angriffsgeschwindigkeit % lokal | M | 9–13% | 80 | LOCAL_ATTACK_SPEED |
| s06 | S | Angriffsgeschwindigkeit % global | J,B | 6–10% | 70 | GLOBAL_ATTACK_SPEED |
| s07 | S | Zaubergeschwindigkeit % | C,J | 8–13% | 75 | CAST_SPEED |
| s08 | S | kritische Chance +Prozentpunkte lokal | M | 2–3.5 pp | 65 | LOCAL_CRIT |
| s09 | S | kritische Chance +Prozentpunkte global | C,J,R | 2–3 pp | 60 | GLOBAL_CRIT |
| s10 | S | Krit-Multiplikatorbonus | M,C,J | 15–24 pp | 60 | CRIT_MULT |
| s11 | S | Feuerresistenz | A,J,B,O,R | 20–28% | 100 | RES_FIRE |
| s12 | S | Frostresistenz | A,J,B,O,R | 20–28% | 100 | RES_COLD |
| s13 | S | Blitzresistenz | A,J,B,O,R | 20–28% | 100 | RES_LIGHTNING |
| s14 | S | Schattenresistenz | A,J,B,O,R | 20–28% | 100 | RES_SHADOW |
| s15 | S | Alle Resistenzen | J,R,O | 8–12% | 40 | RES_ALL |
| s16 | S | Blockchance +pp | O | 4–7 pp | 70 | BLOCK_CHANCE |
| s17 | S | Ausweichchance +pp | A,J | 2–4 pp | 70 | EVASION |
| s18 | S | Mana-Regeneration % | C,J,A | 15–24% | 75 | MANA_REGEN |
| s19 | S | Lebensraub % direkter Attack-Damage | M,J | 1–2% | 50 | LIFE_LEECH |
| s20 | S | Cooldown Reduction % | C,J,R | 4–7% | 35 | CDR |
| s21 | S | Magic Find % | A,J,B | 12–20% | 55 | MAGIC_FIND |
| s22 | S | Goldfund % | A,J,B | 15–25% | 70 | GOLD_FIND |
| s23 | S | Statuseffekt-Dauer % | M,C,J,R | 12–20% | 65 | STATUS_DURATION |
| s24 | S | DoT-Wirkung % | M,C,J,R | 10–18% | 65 | DOT_EFFECT |
| s25 | S | Heilwirkung % | O,R,J | 12–20% | 55 | HEAL_POWER |
| s26 | S | Skilllevel +1 auf definierte Skillgruppe | C,J,R | +1 | 25 | SKILL_LEVEL (nur ilvl>=60, Tiers irrelevant) |

**Explizite Slotregeln:** `M` ist Dolch/Schwert/Axt/Keule/Speer/Bogen/Klaue/Armbrust; `C` ist Zauberstab/Magierstab/Zepter/Runenklinge nur sofern `casterEligible:true`; `A` Helm/Brust/Handschuhe/Stiefel; Ringe/Amulette `J`. Im Falle überlappender Kategorien zählt jede Affixfamilie nur einmal. `p02` hat zwei gekoppelte Zahlenpaare, beim Roll werden Min und Max separat gewürfelt mit `minDamage<=maxDamage`. `s26` ist als Spezialfamilie für jeweils konkret deklarierte Skillgruppen verfügbar, nicht universell für alle Skills; max +2 Gesamtlevel pro Skill aus Ausrüstung für MVP. Lokale % vs globale % strikt beachten.

**Affix-Whitelist pro Itemtyp:** Waffe: nur physischer/elementarer Waffen-Grundschaden, Attack-Speed, Crit und passende DoT/Spezialfamilien; Zauberstäbe/Stäbe: Zauber-/Elementar-/Mana-/Cast-/Critfamilien; Brust/Helm: Leben, Rüstung, Resistenzen, Attribute und Utility; Handschuhe: zusätzlich attack-/castbezogene globale Boni nur über separate definierte Familien, niemals lokaler Waffenbonus; Stiefel: Defense/Resistenzen/Utility, keine lokale Waffenstat; Ring/Amulett: globale Offense und Defense; Schild/Fokus: Block/Barrier bzw Spell/Mana; Relikt: Utility/Status/Hybrid. Keine generische Option „jeder Mod auf jedes Item“.

# 7. LOOT-ENGINE UND WAHRSCHEINLICHKEITEN

Alle Wahrscheinlichkeiten sind **Kandidaten pro tatsächlich generiertem Item**, nicht pro Kill. Für einen Run wird zuerst eine diskrete Item-Anzahl gezogen; danach jedes Item einzeln. Drop-Schema pro Begegnung:

| Begegnung | Item-Anzahl `0/1/2/3/4` | Rarität Normal / Magisch / Selten / Unique |
|---|---|---|
| Normale Begegnung | 25/55/20/0/0 % | 62/29/8.5/0.5 % |
| Elite | 5/45/40/10/0 % | 47/36/16/1 % |
| Boss | 0/0/30/50/20 % | 37/40/21.5/1.5 % |
| Riftboss | 0/0/20/50/30 % | 31/43/24/2 % |

Für normale Begegnungen ist ein einzelner Gegner nicht gleich einer Begegnung. Jede Begegnung kann 1–3 Monster enthalten. Eine Loot-Instanz wird ausschließlich nach **finalem Sieg über die Begegnung** erstellt. Ein Run mit 4 Normalbegegnungen + 1 Boss liefert im Durchschnitt 4×0.95 + 2.9 = **6.7 Item-Drops** vor Lootfilter (bitte anhand der Tabelle im Test präzise rechnen: Boss 2×0.3+3×0.5+4×0.2=2.9; Normal 0×.25+1×.55+2×.20=.95).

**Magic Find (MF):** `effMF = max(0, MF)/(200+max(0,MF))`; Rarität multiplizieren, nicht die Anzahl oder Tier-Rolls: `pUnique' = pUnique * (1 + 0.80*effMF)`, `pRare' = pRare * (1 + 0.55*effMF)`, `pMagic' = pMagic * (1 + 0.20*effMF)`. `pNormal' = 1 - pUnique' - pRare' - pMagic'`. Sollte Normal unter 0 fallen, die drei höheren Raritäten proportional auf 1 normieren. Ein `MF=200` erhöht bspw. Uniquechance um 40% relativ, **nicht um 40 Prozentpunkte**. MF beeinflusst nicht Item-Level, Tier, Rollhöhe, Runen oder spezialisierte Bossmaterialien. Boss-exklusive Uniques sind nur auf benannten Drop-Pools gültig.

**Basiswahl:** pro Content-Zone `baseWeights` statt uniform; 45% martialische Waffen, 35% Rüstung, 15% Schmuck, 5% Relikte für normale körperbetonte Gebiete; Magiergebiete: 25/35/35/5; alle Pools sind Contentdaten. Aus jedem Pool nur freigeschaltete Basis-Tiers. `uniqueEligibility` erfolgt **nach** Basiswahl: Wenn eine Unique-Qualität gewürfelt wird, aber für die Basis kein zulässiges Unique existiert, entsteht ein seltenes Item mit 6 Affixen und einem speziellen `failedUniqueRoll`-Historieneintrag; weder heimlich neu würfeln noch das Unique aus anderen Basen ziehen. Sicherstellen, dass Unique-Chancen daher nicht fälschlich als tatsächlicher Unique-Erfolg ausgegeben werden. Bei Boss-Exklusives separate Boss-Zusatztabelle mit tatsächlichen Chancen offenlegen.

**Schutz gegen Frust:** Bei erstem abgeschlossenen Dungeon garantiert ein sinnvolles magisches Waffen-Upgrade; erster Boss nach Charakterlevel 10 garantiert ein Rare mit ≥4 Mods. Kein garantierter perfekter Top-Tier-Drop. Jeder benannte Endgame-Boss vergibt beim Sieg **2 Boss-Siegel**; **36 Siegel** lassen sich gegen eine **zufällige** unentdeckte Boss-Unique-Version aus seinem eigenen Pool tauschen; nach vollständiger Sammlung darf ein gewünschtes Unique gewählt werden, jedoch ohne perfekte Rolls. Nur Boss-Runen/Endgamebosse ab lvl60 können T0 erzeugen. Die Siegel sind bossgebunden und nicht tauschbar.


## 7.1 Ausgerechnete Wahrscheinlichkeitsbeispiele

Bei 0 MF und Boss-Itemrolls `pUnique=0.015` sind im Mittel `2.9×0.015=0.0435` *Unique-Kandidaten pro Boss* zu erwarten. Die echte Unique-Rate ist kleiner, wenn Itembasis/Level keinen Unique-Eintrag hat. Bei 200 MF wird `effMF=0.5` und somit `pUnique=0.015×(1+0.8×0.5)=0.021` (=2,1% pro Boss-Item, nicht pro Boss). Bei zulässigen Pools liegt der Erwartungswert bei 2.9×2.1%=0.0609 Kandidaten/Boss. Der pro-Boss-Wahrscheinlichkeitswert `P(≥1 Unique)` wird wegen variabler Item-Anzahl exakt nach Gesetz der totalen Wahrscheinlichkeit berechnet, **nicht** pauschal als Erwartungswert ausgegeben.

**Mod-Roll-Beispiel:** Offener Prefix-Slot mit drei zulässigen Gruppen Gewicht 90 (localPhysical), 85 (localFlatPhysical), 65 (localFire): `P(localPhysical)=90/(90+85+65)=37.5%`. ilvl82 mit T5/T4/T3/T2/T1-Tiergewichten 30/30/23/12/5: `P(T1 | gewählte Gruppe)=5%`. Vorausgesetzt alle drei Familien haben alle Tiers verfügbar und keine Sperren, `P(localPhysical AND T1)=0.375×0.05=1.875%`. Nach belegter localPhysical-Gruppe sinkt deren Roll-Chance auf exakt 0%; der Pool wird über verbleibende Gewichte renormiert. Die Crafting-Vorschau muss **diese Zahlen** aus den echten Contentdaten berechnen.

# 8. CRAFTING: VERBINDLICHE REZEPTE UND TRANSAKTIONSREGELN

**Materialien:**

- `FORGE_DUST`: häufig aus Verwertung normal/magisch (1 bzw. 2–3); normale Dungeonbegegnung +2.
- `ARCANE_SHARD`: Magic-Verwertung 1; Rare-Verwertung 2–3; Boss +3.
- `ESSENCE`: Elite 40% für 1; Boss garantiert 1; Riftboss 1–2.
- `CHAOS_FRAGMENT`: Boss 18% für 1; Riftboss 35% für 1.
- `SEAL_STONE`: Boss 10%; Riftboss 20%.
- `VOID_ASH`: Riftboss 12%; gefährlicher Endgameboss 30%.
- `SOCKET_CORE`: Elite 4%; Boss 12%; Riftboss 20%.
- `CORRUPTION_CORE`: Riftboss 5%; Pinnacle-Boss 20%; aus 20 VOID_ASH craftbar.
- `RUNE_FRAGMENT`: Elite 20%; Boss 60%; Riftboss 100%; 10 Fragmente ergeben zufällige Runenstufe I.
- `BOSS_SIGIL`: 2 garantiert vom gewählten Endgameboss, nicht vom normalen Dungeonboss.

Alle Chancen sind pro abgeschlossener Begegnung, nicht pro Item. Endgame-Spezialisierungen dürfen die Quantität moderat erhöhen (max +50%), niemals die garantierten Sigil-Mengen duplizieren. Direkte Verwertungsressourcen werden nur **einmal** vergeben.

## 8.1 Rezepte (Initialkosten)

| Aktion | Zulässig | Kosten | Exakter Effekt | Risiko |
|---|---|---|---|---|
| Prägen | Normal, ilvl≥1 | 4 Dust, 1 Shard | Magisch; generiert 1 zufälliges gültiges explizites Affix | keines |
| Anreichern | Magisch, genau 1 Affix | 2 Shard | fügt 1 Mod der **fehlenden Seite** hinzu | keiner |
| Selten erheben | Magisch mit 1–2 Mods | 7 Shard, 1 Essence | wird Rare; erhält 1 zusätzliches zulässiges Affix; mindestens 2, maximal 3 | RNG neuer Mod |
| Neuschmieden | Rare, 3–6 Mods | 1 Chaos, 4 Shard | ersetzt **alle entsperrten** Mods durch gleich viele neue; Siegelwirkung siehe unten | hoher RNG |
| Ergänzen | Rare, freier Slot | 1 Essence, 3 Shard | fügt 1 zulässigen Mod hinzu; Präfix/Suffix proportional zu offenen Slots | RNG |
| Präzise Essenz | Rare, freier Slot | 3 Essence, 4 Shard | fügt 1 garantierte Affix-Familie passend zu Essence-Tag ein; Tier weighted | planbar |
| Entfernen | Rare, ≥2 entsperrte Mods | 1 Void Ash, 4 Shard | entfernt 1 gleichwahrscheinlich gewählten **entsperrten** Mod | RNG |
| Tier nachschmieden | Rare, ein T3–T5 Mod | 2 Essence, 1 Seal | ausgewählter Mod steigt **genau um 1 Tier** (T5→T4→T3→T2); T1 nur Endgame-Rezept | deterministisch |
| T1-Vollendung | Rare, ausgewählter T2-Mod, ilvl≥80 | 5 Essence, 3 Seal, 2 Void Ash | T2→T1, Werte innerhalb T1 neu gewürfelt | deterministisch, teuer |
| Werte verfeinern | Rare/Unique | 5 Dust, 1 Shard | alle numerischen Rolls des **gewählten** Affixes innerhalb seines jetzigen Tier-/Unique-Bereichs neu | RNG, Tier unverändert |
| Affix versiegeln | Rare, genau 1 Mod wählbar | 3 Seal, 8 Shard | markiert 1 Mod für **eine** Neuschmieden-Operation als geschützt; verbraucht danach Schutz | deterministisch |
| Sockel setzen | Rare/Unique, Slot-cap frei | 1 Socket Core, 4 Dust | +1 Sockel; Unique-Cap max1; martialische Zweihänder cap2, sonst cap1 | keiner |
| Rune einsetzen | Item mit freiem Sockel | gewählte Rune | verleiht runendefinierte Werte, belegt Sockel | Rune bleibt entfernbar |
| Rune lösen | gesockeltes Item | 3 Dust | löst 1 Rune unbeschädigt und lagert sie ein | keiner |
| Korruptionsritual | Rare/Unique, ilvl≥70, nicht korrupt | 1 Corruption Core, 5 Void Ash | gewichtete Endresultate, siehe 8.3 | irreversibel |

**Essenz-Typen:** `Essenz der Kraft` erzwingt passendes STR- oder physisches Offense-Affix; `Essenz des Lebens` HP/VIT; `Essenz des Funkens` Blitz; `Essenz der Asche` Feuer; `Essenz des Giftes` Poison; `Essenz der Abschirmung` Armor/Barrier. Vor dem Verbrauch die **genau erlaubten** Zielgruppen und Wahrscheinlichkeit gemäß Affixgewichten anzeigen; wenn keine Gruppe verfügbar, Crafting verbieten und nichts abbuchen. Essenzen werden bei Herstellung an den gewünschten Typ gebunden oder 3:1 im Alchemie-Menü in einen wählbaren Typ konvertiert.

**Versiegelungsregel:** Darf für Neuschmieden nur maximal **einen** konkreten Affix schützen; nicht zusammen mit gezieltem Nachschmieden oder Unique-Rerolls stapelbar. Ein aktives Siegel verbraucht sich beim nächsten Neuschmieden auch bei schlechtem Ergebnis. Neu gewürfelte Mods müssen alle Gruppen-Exklusivitäten inklusive versiegeltem Mod beachten. Bei keiner gültigen Kombination Crafting vorher deaktivieren.

**Kostenregel:** Kosten vor Action auf `player.balance` prüfen; anschließend validierten Folgezustand **in einem** persistierten Commit schreiben. Craft-Historie hält `previousItemHash`, Aktion, eingesetzte Materialien, seed, neuen Hash und Ergebnis. Save/load in Zwischenzuständen darf kein mehrfaches Gratis-Crafting erzeugen.

## 8.2 Beispiel eines vollständig festgelegten Crafting-Pfades

Ausgang: Rare-Zweihandaxt ilvl82 mit 2 Präfixen (`local_phys T3`, `flat_phys T4`) und 2 Suffixen (`attack_speed T2`, `strength T3`). Spieler hat noch je 1 freien Präfix- und Suffix-Slot. Er nutzt `Präzise Essenz: Leben` auf Zweihandaxt → **nicht zulässig** (kein HP-Pool auf dieser Waffe). Stattdessen `Präzise Essenz: Kraft` → sucht zulässige PHYSICAL-/STR-Gruppe, `local_phys` schon belegt; vorhandene Gruppen überspringen, freien Präfix/Suffix respektieren; bei Poolauswahl wird z. B. `physical bleed synergy` hinzugefügt. Danach `Tier nachschmieden` auf `flat_phys T4` → T3, kostet 2 Essence +1 Seal, und wird über ilvl≥40 erlaubt. Dann `T1-Vollendung` auf `attack_speed T2` → T1, nur wenn ilvl≥80; Wertebereich neu rollen. Der Spieler sieht nach jedem Schritt die aktualisierten Waffenwerte und Kampfsimulation. **Niemals** darf ein fehlender Craft-Pool zu freiem Ressourcenverlust führen.

## 8.3 Korruption: starke Entscheidung mit Risiko

1. prüfe `ilvl≥70`, nicht korrupt, Rare oder Unique;
2. bezahle Kosten atomar;
3. ziehe **einmal** Ergebnis: `45%` zusätzliche Korruptions-Verzauberung (aus separat gewichteten +5–10% Spezialwerten, max 1), `30%` +1 zufälliger vorhandener Affix-Tier (nur T5→T4 bis T2→T1, wenn ilvl erlaubt; bei Unique stattdessen +5% auf einen Unique-Roll), `20%` negative Korruption (-10% maximaler HP oder -15% eine Resistenz, als zusätzliche separate Zeile), `5%` `fractured` Item (nicht zerstört: Item bleibt nutzbar, aber nie wieder craftbar). In allen Fällen `corrupted=true`; weitere reguläre Affix-Crafts nicht erlaubt; Rune lösen bleibt erlaubt. Keine verdeckte Löschchance. Zeige das Risiko und die exakten Outcomes **vorher**.

# 9. RUNENSYSTEM

Runen sind **eigener Ausrüstungsslot-Effekt** und beeinflussen nicht die 3/3-Affixe. Runenstufen I/II/III entstehen via 3 gleiche zu 1 höhere Rune, maximal III. Socket-Boni: Angriffsrune I `+4% Attack Damage`, II `+6%`, III `+9%`; Schutzrune `+4/6/9% Armor`; Lebensrune `+20/32/48 HP`; Glutrune `+5/8/12% Fire Damage`; Frost `+5/8/12% Cold`; Sturm `+5/8/12% Lightning`; Schatten `+5/8/12% Shadow`; Klingenrune `+3/5/7% Bleed Damage`; Seuchenrune `+3/5/7% Poison Damage`; Fokus `+5/8/12% Spell Damage`; Puls `+2/3/4% Mana Regen`; Glück `+3/5/7% Magic Find`.

**Siegelkombinationen für 2-Sockel-Zweihänder** (nur Tier III, genau diese Reihenfolge): `Glut→Sturm` bewirkt bei Feuer-Skilltreffern 8% Chance auf eine Blitzentladung von 35% des **auslösenden Schadens**, max 1/sec; `Klinge→Seuche`: eigener Blutungstreffer hat 10% Chance, 1 Gift-Stack zu erzeugen, max 1/sec; `Schutz→Leben`: +5% maxHP, dafür -5% global verursachter Schaden; `Fokus→Puls`: bei erfolgreichem Spell-Crit +5 Mana, max 1/sec. Kombinationen ersetzen nicht die einzelnen Runenboni, sondern **ergänzen** sie; Event-Tag-Limits vermeiden Endlosschleifen. Nie bestehende fremde Runenwörter kopieren.

# 10. KAMPF-ENGINE — ZEITMODELL UND REIHENFOLGE

Der Kampf ist **vollautomatisch**; UI zeigt für Nutzer lesbare „Runden“, intern nutzt die Engine einen **deterministischen diskreten Scheduler** in 100-ms-Schritten. Das ist eine bewusste Abweichung von strikten abwechselnden Runden, damit Angriffsgeschwindigkeit, Cooldowns, DoTs und Zaubertempo sinnvoll skalieren. Die UI gruppiert 10 Ticks = 1 sichtbare Kampfsekunde / Runde. **Keine aktive Eingabe im Kampf.**

- `baseActionIntervalMs = 1000 / attacksPerSecond` für Attack-Skills; Casts `castTimeMs / (1+castSpeed)`; min 400ms.
- Globale Cooldowns nach Action-Ende `max(350ms, skillGlobalCooldownMs)`; innerhalb des GCD keine andere Aktion. Unabhängige Skill-Cooldowns laufen weiter.
- Kampfstart: beide Seiten bei t=0 verfügbar; deterministische Tie-Break-Regel: Initiativwert (`DEX`), bei Gleichheit Spieler, danach stabile Entity-ID; kein Bonus-Erstschlag ohne Cost.
- Beim Tick: abgelaufene Status- und Cooldown-Timer; DoT-Tick bei Sekunden-Grenzen; prüfe Todesfälle; geplante Action-Enden; benötigte Reaktionen; wähle nächste Skill-Aktion; erstelle Eventlog. **Alle Tie-Breaks explizit**.
- Melee- und Spell-Crit getrennt erlaubt; Attack Speed wirkt nur auf ATTACK, Cast Speed nur auf SPELL. Skill `actionTime` wird bei Start eingefroren, spätere Speed-Buffs wirken auf nächste Aktion.
- Minions haben eigene Actions, aber maximal 4 aktive pro Charakter; jeder Minion ist eine eigene Entity, bekommt keine eigenen Summon-Trigger (rekursive Spawns verhindern).
- Max. normaler Einzelkampf `90s`, Endgameboss `150s` → bei Timeout Niederlage, kein endloses Unentschieden. Ein Run kann aus mehreren Kämpfen bestehen, pro Kampf neue RNG-Subseed.
- Spielerautomatik APL: `emergency_heal (HP<35%)`, `defensive_barrier (barrier<15% HP)`, `short_buff_if_missing`, `execute_if_target<25%`, `best_legal_damage_skill`, `default_attack`. Der Spieler kann Priorität auf Ebene eines Skills und einfache Bedingungen verändern, niemals beliebige unsichere Skripte ausführen. Bei nicht genügend Mana: nächster gültiger Skill; falls keiner verfügbar `basicAttack` (0 Mana). Optional `wait` max 0.5s für gezieltes Ressourcenmanagement, niemals Hard-Lock.
- Strikte Trigger-Queue: maximale rekursive Tiefe 3; höchstens 8 ausgelöste Effekte pro ursprünglicher Action und 12 Effekte pro Entity und Sekunde, höchstens einmal pro `effectId` und Root-Event. Bei Budgetüberschreitung Event `TRIGGER_SUPPRESSED` und Telemetrie. Trigger-Schaden darf nicht erneut denselben Trigger auslösen, sofern nicht explizit als `allowTriggeredSources=true` markiert.
- Ereignisse: `COMBAT_START`, `TICK`, `ACTION_BEGIN`, `ACTION_RESOLVE`, `DAMAGE`, `HEAL`, `BLOCK`, `EVADE`, `CRIT`, `APPLY_STATUS`, `STATUS_TICK`, `STATUS_EXPIRE`, `TRIGGER`, `DEATH`, `PHASE_CHANGE`, `VICTORY`, `DEFEAT`, `TIMEOUT`. Replays = seed+configVersion+Action-Protokoll+Eventhash. Fast-forward und normaler Replay müssen bitidentisches Ergebnis liefern.

## 10.1 Statuseffekte

- Blutung: ein Attack-Event mit `BLEED` erzeugt Stack; pro Stack `22% des rohen triggering attack damage` als Phys-DoT **verteilt auf 5 Sekunden**, höchstens 5 Stacks; bereits angewendete Armor-Reduktion gilt nicht doppelt, stattdessen DoT-Angriff wird bei Tick gegen Armor berechnet; unterschiedliche Stacks unabhängig, ältester ablaufend.
- Gift: `30% des rohen Treffer-Schadens` als Schatten-DoT über 6 Sekunden, maximal 5 Stacks, durch Schattenresistenz reduziert; Giftfähigkeit braucht `POISON_APPLY`.
- Brennen: `36% des rohen Feuer-Trefferschadens` als Feuer-DoT über 4 Sekunden, maximal 3 Stacks.
- Frost: `-15% actionSpeed` für 4 Sekunden, maximal eine Anwendung gleichzeitig; erneuter Effekt erneuert Dauer, addiert nicht Prozentwerte.
- Verwundbar: `+8% increased damage taken` (additiv mit anderen `increased damage taken`), 4 Sekunden, maximal 2 Stacks.
- Fluch: `-12 Prozentpunkte Resistenz einer deklarierten Art`, 5 Sekunden, nicht mehr als -25 pp über Flüche insgesamt.
- Barriere und Regeneration: wie unter Stats; keine DoT-Triggerloops.
- Kontrollverlust (Stun) bei Bossen maximal 0.8 Sekunden pro 8 Sekunden; normale Monster max1.5 Sekunden pro 8 Sekunden. Keine endlose Stun-Lock-Kette.

**DoT-Snapshot:** Bei Anwendung wird der eigentliche DOT-Rohwert inklusive Angreifer-Offensivboni gespeichert, **ohne** gegnerische Verteidigung. Ziel-Verteidigung und aktuelle Statusanfälligkeit beim jeweiligen Tick anwenden. Reapplikationen erneuern nicht automatisch alle Stacks. Ein Skill darf einen DoT entweder **direkt** anwenden (festes DoT-Budget) oder proportional zum Treffer, aber nicht beides ohne explizite Budgetierung.

# 11. SKILLS: STARTKATALOG MIT KONKRETEN ZAHLEN

Schadenskoeffizienten `x` sind Multiplikatoren des rohen Waffenwerts, additive Basiszauber verwenden `flat + coeff*INT`. Jede aktive Fähigkeit hat mindestens `id/tags/castTimeMs/cooldownMs/resourceCost/priorityRules/description/upgradeRules`. Standardeinstellungen: 4 aktive Slots, 2 passive Skillslots, 1 Standardangriff. Ein Skill hat 5 Level; pro Skilllevel: +7% erhöhte Basiswirkung (additiv auf dessen Basis), Kosten +2%, Cooldown unverändert; Stufen 2/3/4/5 erfordern Charakterlevel 10/25/45/65. **Keine zusätzlichen Skalierungen erfinden.** Passive Talentpunkte separat.

| Klasse | Skill | Typ, Schaden, Effekt | Mana | CD |
|---|---|---|---:|---:|
| Wächter | Spaltender Hieb | Attack 1.35× Waffe, Blutung 35% Chance | 12 | 2.0s |
| Wächter | Schildwall | 28% maxHP Barriere (max 60%), block +8pp für 4s | 20 | 12s |
| Wächter | Bluternte | Attack 1.65× Waffe + pro aktivem Bleed-Stack +0.28×; verbraucht alle eigenen Bleed-Stacks | 25 | 8s |
| Wächter | Rüstungsbruch | Attack 0.9× Waffe, Zielarmor -25% für 5s | 14 | 7s |
| Wächter | Kampfrausch | +18% Attack Speed 6s, -12% Armor währenddessen | 24 | 15s |
| Wächter | Letztes Bollwerk | heilt 18% maxHP, nur HP<40% | 35 | 20s |
| Arkanist | Glutlanze | Spell 28+0.7×INT Feuer, 40% Brennen | 13 | 1.5s |
| Arkanist | Frostsplitter | Spell 23+0.6×INT Frost, Slow garantiert | 12 | 1.5s |
| Arkanist | Kettenfunke | Spell 21+0.65×INT Blitz, 2 Folgeblitze auf andere Ziele je 50% voriger Wirkung | 19 | 4s |
| Arkanist | Arkanbarriere | 26% maxHP Barrier, 5s Dauer | 20 | 11s |
| Arkanist | Überladung | +20% Spell Damage, +20% Mana-Kosten 6s | 25 | 16s |
| Arkanist | Elementarriss | Spell 64+1.1×INT Elementtyp des zuletzt aktiven Elementskills | 35 | 10s |
| Schattenläufer | Schnellstich | Attack 0.75× Waffe, zwei Treffer, jeder kann getrennt kriten | 14 | 2s |
| Schattenläufer | Giftnadel | Attack 0.85× Waffe, garantierter Poison-Stack | 15 | 3s |
| Schattenläufer | Schattenschritt | +20pp Ausweichen für 3s, maximaler Dodge-Cap gilt | 20 | 12s |
| Schattenläufer | Tiefer Schnitt | Attack 1.5× Waffe; 1 Bleed-Stack sicher | 20 | 6s |
| Schattenläufer | Hinrichtung | Attack 1.9× Waffe, +35% mehr Skill-Schaden bei Ziel-HP <25% | 27 | 10s |
| Schattenläufer | Rauchmantel | Zielkritchance -12pp für 5s, +10% Schattenresistenz | 20 | 14s |
| Nekromant | Knochenlanze | Spell 25+0.75×INT Schatten | 13 | 1.6s |
| Nekromant | Skelettwache | beschwört 1 Minion, max3, 50% Spieler-Weapon-DPS und 25% maxHP | 25 | 8s |
| Nekromant | Seuchenfluch | Spell 15+0.4×INT Schatten, Poison garantiert, Gegner -8pp Schattenresistenz | 20 | 7s |
| Nekromant | Seelenernte | Spell 50+0.95×INT, heilt 8% des verursachten direkten Schadens (zusätzlich zum Leech-Cap gerechnet) | 22 | 9s |
| Nekromant | Grabesschild | Opfer 10% aktuelles HP, erzeugt 25% maxHP Barrier | 12 | 12s |
| Nekromant | Todesruf | +20% Minionschaden 7s | 20 | 18s |
| Runenschmied | Siegelhieb | Attack 1.15× Waffe, +15% Elementarschaden falls Rune vorhanden | 12 | 2s |
| Runenschmied | Funkenkreis | Spell 25+0.6×INT Blitz | 14 | 3s |
| Runenschmied | Eisensiegel | +18% Armor für 7s | 18 | 14s |
| Runenschmied | Runenfokus | Runeffekte +20% für 6s, keine rekursiven Trigger | 25 | 18s |
| Runenschmied | Zerschmettern | Attack 1.60× Waffe, +25% vs Barriere | 22 | 8s |
| Runenschmied | Uraltes Zeichen | absorbiert nächsten direkten Treffer bis max 15% maxHP | 24 | 13s |
| Inquisitor | Lichtschlag | Attack 1.10× Waffe + Spell 15+0.25×INT Licht (Licht ist eigene Schadensart mit Schattenresistenz als MVP-Proxy nur, wenn Tooltip erklärt) | 15 | 2s |
| Inquisitor | Schutzgebet | heilt 15% maxHP, nur HP<70% | 20 | 12s |
| Inquisitor | Bannfluch | schwächt Feindschaden -12% für 6s | 20 | 14s |
| Inquisitor | Vergeltung | Konterstatus 6s, blockierter Treffer löst 0.35× Waffenhit aus, max 1/s | 20 | 15s |
| Inquisitor | Sonnenurteil | Spell 55+0.85×INT, +20% gegen verfluchte Ziele | 28 | 9s |
| Inquisitor | Heiliges Bollwerk | 20% maxHP Barrier + 8% maxHP Heilung | 32 | 18s |

**Designhinweis Licht:** Der MVP sollte nur vier Magieelemente (Feuer/Frost/Blitz/Schatten) und physisch besitzen. Wenn Licht später eine sechste Schadensart wird, dann mit eigener Resistance und Contentmigration; bis dahin `Lichtschlag` als `shadowDamage` ist thematisch unsauber. Für Phase 1–3: Lichtschlag verursacht **physischen** Zusatzschaden auf Zauberbasis, mit `HOLY` Tag, aber physischer Armor-Mitigation. Das ist verbindlicher als ein unklarer Proxy.

**Basischer Angriff** ist 1.0× Waffe, 0 Mana, keine CD, bei Casterwaffe alternativ `Arkanfunke` Spell `12+0.3 INT` manafrei. Ressourcen-/CD-System und Speed sollten Basisskills nicht völlig irrelevant werden lassen.

## 11.1 Passive Key-Nodes (initial)

Wächter: `Blutgericht` +20% Chance auf Bleed bei CRIT, +10% directDamageTaken; `Eisenherz` +10pp Block, -12% Attack Speed; `Wüterich` +18% phys Attack-Damage bei HP<50%, -10% maxHP. Arkanist: `Kettenmeister` +1 Sprung für Kettenfunke, jeder Sprung -15% damage; `Glasritual` +22% Spelldamage, -16% maxHP; `Frostanker` +12% Barrier, -10% Fire damage. Schatten: `Toxischer Schwur` Poison maxStacks +2, -10% direct hit damage; `Präzision` +6pp Crit, -8% HP; `Wolkenläufer` +8pp Evasion, -10% Armor. Weitere Klassen jeweils zwei Nodes bei ihrer Implementierungsphase entwerfen und **numerisch dokumentieren**, nicht Platzhalter.

Talentbaum-MVP: pro Klasse 18 kleine Knoten (+2% relevante Stats, +3% Defense, +4% Resistenz oder +1.5pp Spezialwert), 6 mittlere Knoten (+6–10%), 3 Key-Nodes; Connections als `edges`; verbrauchte Punkte nur wenn vom Startpunkt erreichbar. Max Punkte via Level; bei 1 Klasse mindestens 27 echte Nodes. Später globaler Tree mit ~200 Knoten und 12 Ascendancy-Pfaden, ohne Klassenidentität zu zerstören. Talente können Build-Richtung ändern, nicht nur gleiche Pluswerte stapeln.


## 11.2 Skill-Modifikatoren — erste 18 konkretisierte Support-Siegel

Skill-Modifikatoren werden **nicht** als zusätzliche Skillslots interpretiert: Jeder ausgerüstete Skill bekommt ab Lv20 genau 1 Support-Siegelplatz, ab Lv50 maximal 2; jedes Siegel ist nur einmal pro Skill erlaubt. Supports dürfen Effekte addieren oder ersetzen, brauchen Ressourcen-/Schadensbudget; keine pauschalen +50%-More-Buffs.

| Support | Eligible Tags | Exakter Effekt | Kosten / Nachteil |
|---|---|---|---|
| Verstärkt | ATTACK | +15% increased Attack-Damage für diesen Skill | +10% Mana-Kosten |
| Schneller Hieb | ATTACK | -12% Action-Zeit des Skills | -10% Skill-Rohschaden |
| Schwere Wunde | BLEED | +20% Bleed-Damage | -10% Treffer-Schaden |
| Tiefer Schnitt | BLEED | +1s Bleed-Dauer | +15% Mana-Kosten |
| Widerhall | SPELL | 12% Chance auf 35%-Folgespell, CD 1s | -8% normaler Spell-Hit |
| Arkanes Sparen | SPELL | Mana-Kosten -20% | -10% Schadenswirkung |
| Eisgefängnis | COLD | Slow verstärkt von 15% auf 20% | -10% Frosthit |
| Glutherz | FIRE | Burn-Chance +15 Prozentpunkte | -8% direkter Treffer |
| Stromleitung | LIGHTNING | Kettenblitz +1 Ziel (nur falls weitere Ziele) | jeder Sprung -12% Schaden |
| Schattenzehrung | SHADOW | +10% Damage vs Verfluchte | +10% Mana-Kosten |
| Doppelgift | POISON | bei Apply 10% Chance zweiten Stack, CD 1s | -10% direkte Hits |
| Festung | BARRIER | +15% Barrier-Wirkung | +20% Cooldown |
| Kurze Heilung | HEAL | Cooldown -15% | Heilwirkung -15% |
| Rasender Finisher | EXECUTE | +15% Damage gegen Ziel HP<25% | +25% Mana-Kosten |
| Minion-Haut | SUMMON | +20% Diener-HP | -10% Dienerschaden |
| Minion-Klingen | SUMMON | +15% Dienerschaden | -15% Diener-HP |
| Vergeltungsmarke | COUNTER | +20% Counter-Schaden | Counter-CD +1s |
| Runenresonanz | RUNE | +10% Runeffekte im Skill (nicht global) | Skill-CD +15% |

**Tagregeln:** Modifikatoren, die passende Mechanik nicht im Skill finden, dürfen nicht ausgerüstet werden. Zwei Supports desselben `supportGroup` sind verboten. `echo` kann keinen weiteren Echo auslösen, `doublePoison` respektiert Stacks und Triggerbudget. Eine Skill-Änderung soll Tooltips und Combat-Fixtures tatsächlich verändern. Designer können später 100+ unterschiedliche Supports ergänzen, aber erst nach Abnahme dieses Katalogs.

# 12. EINZIGARTIGE GEGENSTÄNDE — START-KATALOG MIT ECHTEN EFFEKTEN

Alle Uniques definieren `baseId`, `minItemLevel`, `dropSource`, `uniqueRolls`, `effects`, `tags`, `tradeoff`, `internalCooldown`. Werte sind für **T5/T6-Basen** auf Endgame-Niveau, in früheren Spielstufen andere niedrige Uniques in eigener Tabelle verwenden. Keine Unique-Fähigkeit darf durch Beschreibung simuliert werden. Jeder Effekt ist ein deklarativer Event-Handler. Für normale Uniques: nur passende Basis und Zone ilvl. Boss-Uniques: ausschließlich deklarierte Boss-Quelle oder Boss-Siegel-Tausch.

| ID / Unique | Slot | Positive Wirkung | Nachteil / Bedingung | Quelle |
|---|---|---|---|---|
| Blutdurst | Zweihandschwert | Krits applizieren Bleed; Bleeds +30% Schaden | Bleeddauer -25% | Blutkoloss |
| Sturmkern | Amulett | Spell-Crit 18% Chance auf 40%-Blitzentladung, CD 1s | -12% Frostresistenz | Sturmbote |
| Aschenherz | Ring | Brennen +45% Schaden | -10% direkte Spellhits | Aschenkönig |
| Schleier der Leere | Helm | Barrier +30%; Barrier-Break löst 80% Spell-Basis Schatten aus, CD 5s | MaxHP -14% | Leerenfürstin |
| Eid der Seuche | Ring | Poison-Max-Stacks +2, DoT +12% | direkte Crit-Damage -25pp | Seuchengrab |
| Ungebrochene Mauer | Schild | +13pp Block; bei Block 3% maxHP Barrier, CD 2s | -10% Attack Speed | Wächter der Tore |
| Klinge des Verzichts | Dolch | +9pp Crit vs poisoned, +20% Poison-Dauer | direkte Treffer -12% | Welt-Drop ilvl45+ |
| Runenherz | Relikt | Runenboni +20% (nur Basiswerte) | -10% globale maximale Mana | Runenaltar |
| Frostgesang | Magierstab | Frosttreffer lösen 12% Chance auf weiteren Frostsplitter aus, CD 1s | Fire Damage -25% | Eiskönigin |
| Arkaner Hunger | Gürtel | Bei Spell-Kill +10% maxMana, max 3 Stacks / 8s | Mana-Regeneration -20% | Welt-Drop ilvl55+ |
| Scharlachkette | Amulett | Finisher nach 3+ Bleed-Stacks +20% MORE für diese Action | Bleed-Basisdauer -1s | Blutkoloss |
| Dornenpakt | Brust | 9% eingegangener blockbarer Direktschaden wird als phys. Gegenhit reflektiert, cap pro Sekunde 5% Spieler-maxHP | -8% maxHP | Wächter der Tore |
| Seelenlaterne | Relikt | Minion bei Tod: 30% Chance eine 4s-Seele zu erzeugen (max1) | -10% eigener Spell Damage | Nekropolis |
| Gesplitterter Fokus | Fokus | +15% Cast Speed und +12% Spell Damage | -15% Barrier | Welt-Drop ilvl50+ |
| Vergifteter Mond | Krallen | Jede 3. Attack innerhalb 5s erzeugt Poison | -12% Crit-Chance relativ | Seuchengrab |
| Stahl der Erinnerung | Langschwert | Bei Block nächster Attackhit +25% Damage, CD2s | -10% Crit Mult | Wächter der Tore |
| Mantel der Asche | Brust | Fire Damage Taken -12% nach normaler Resistenz (max Effekt) | Frostresistenz -15pp | Aschenkönig |
| Sturmfessel | Ring | Blitzhits gegen gefrorene Ziele +30% increased Damage | Frostskills kosten +20% Mana | Sturmbote |
| Ewigkeitsflamme | Zauberstab | 15% Chance beim Burn-Tick 25%-Feuerimpuls, CD1s | +15% Skill-Mana-Kosten | Aschenkönig |
| Nagel der Dämmerung | Armbrust | Executions bei Target <25% HP +25% MORE Schaden | -15% Attack Speed | Welt-Drop ilvl70+ |

**MVP** implementiert vier der obenstehenden Uniques plus zwei niedrigstufige: `Kupferner Reißer` (Schwert ilvl8: +10% phys +1pp Crit) und `Ausgefranster Mantel` (Brust ilvl6: +25 HP, -5% Frostresistenz). Für MVP müssen mindestens **vier mechanisch unterschiedliche** Uniques echte Trigger oder Tradeoffs haben, nicht nur Stats.

**Kontrolle:** Jede Unique-Power-Budget-Abweichung durch 1) Snapshot-DPS, 2) DPS über 90s, 3) Survivability und 4) Begegnungsspezialisierung messen. Kein Unique darf *alle* Builds in jedem Kontext objektiv dominieren.

# 13. DUNGEONS, GEGNER UND BOSS-REGELN

## 13.1 Stufengebiete

| Gebiet | Empfohlene Level | Kampfanzahl | Boss | Besondere Ausbeute |
|---|---|---:|---|---|
| Das Verlassene Tor | 1–7 | 3 + 1 Boss | Rostwächter | frühe Waffen |
| Verfallene Krypta | 8–14 | 4 + Boss | Grabherr | Schatten-Affixe |
| Aschental | 15–21 | 4 + Boss | Flammenbestie | Feueressenzen |
| Eisenminen | 22–28 | 4 + Boss | Stahlwurm | Armor und Erz |
| Pestgewölbe | 29–35 | 4 + Boss | Seuchenbrüter | Gift |
| Frostkatakomben | 36–42 | 4 + Boss | Eiskönigin | Frost und Barriere |
| Donnerturm | 43–49 | 4 + Boss | Sturmbote (normal) | Blitz |
| Schattenkammer | 50–55 | 4 + Boss | Leerenhüter | Schatten |
| Verbotene Schmiede | 56–59 | 4 + Boss | Runenwächter | Runenfragmente |
| Abgrundtor | 60+ | 4 + Boss | wechselnder Rift-Gegner | Endgame-Währung |

**Gegnerprofile**: `Brute` hoher HP/niedrige Speed, `Assassin` niedrig HP/hoher Crit, `Caster` Elementschaden/Barriere, `Sentinel` Armor/Block, `Swarm` mehrfach kleine HP, `Corruptor` DoT/Fluch. Ein Dungeon fügt 1–3 Encounter-Monster zusammen; für MVP 1 Feind gleichzeitig; später Multi-Target-Regeln, Ziele nach Priorität. Gegner besitzen `monsterLevel, hp, armor, resist, attack, attackSpeed, skills, AIpriority, lootProfile, tags, icon`. Gegner dürfen für höhere Stufen nicht nur uniform geschraubt werden – Spezialisierung und Elementprofile variieren.


## 13.1a Numerische Monster-HP- und DPS-Anker

Erzeuge Monster-HP per **logarithmischer Interpolation** zwischen diesen Ankern (für Level außerhalb der Anker am jeweiligen Ende kontrolliert extrapolieren, maximal L100 im Storymodus). Das ist verbindlicher als „Monster werden stärker“ und wird durch 10.000 Seeds kalibriert:

| Gegnerlevel | Normal-HP | Elite-HP-Faktor | Boss-HP | Normaler roher DPS | Boss roher DPS |
|---:|---:|---:|---:|---:|---:|
| 1 | 120 | 2.6× | 800 | 4 | 5 |
| 15 | 650 | 2.6× | 4.800 | 13 | 18 |
| 35 | 4.300 | 2.6× | 38.000 | 28 | 50 |
| 60 | 18.000 | 2.6× | 110.000 | 48 | 90 |
| 75 | 50.000 | 2.6× | 240.000 | 70 | 125 |
| 90 | 140.000 | 2.6× | 500.000 | 105 | 190 |
| 100 | 220.000 | 2.6× | 750.000 | 135 | 235 |

Interpolation: Für Anker `(L0,V0),(L1,V1)` mit `t=(L-L0)/(L1-L0)`: `V(L) = round(exp(ln(V0)*(1-t)+ln(V1)*t))`. Elite-DPS `1.45×` des Normal-DPS; die Boss-DPS in der Tabelle sind **roh vor Defenses**, Bossskills müssen in diese mittlere Angriffsstärke einkalkuliert sein und dürfen nicht heimlich Schaden verdoppeln. In Endgame-Rifts gilt **als Basis immer Boss-HP/DPS bei L60**, dann der Rift-Multiplikator. Nie zusätzlich L75-Storyboss-HP und Rift-Tier20-Multiplikator kombinieren (Doppelskalierung). Gegnertypen bekommen Faktoren für HP/DPS, z. B. Brute `1.25×/0.85×`, Assassin `0.80×/1.15×`, Sentinel `1.10×/0.90×` plus korrespondierende Resistenzen. Teste Siegquoten und passe die Anker sichtbar an. Boss-Telegraph-Schaden ist im Boss-DPS-Budget enthalten, nicht obendrauf.

## 13.2 Konkrete Bossmechaniken

- **Aschenkönig:** Feuerresistenz 35%; startet alle 6s `Aschesturm` (spürbarer Feuerhit); bei HP<50% Burn-Anwendungsrate +25%; Frostbuild kontert.
- **Blutkoloss:** 25% Phys Reduction durch Armor; alle 8s Bleed-Finisher gegen Spieler bei ≥2 Bleed-Stacks; Block und Bleed-Entfernung helfen.
- **Leerenfürstin:** startet mit Barrier 25% HP; alle 10s erneuert 10% maxHP Barrier; bei Barrierbruch 1s `vulnerable`; kontrollierter Burst hilft.
- **Sturmbote:** alle 7s Kettenblitz auf 1–3 Ziele, +10pp Crit in Phase 2; Blitzresistenz und Barrier wichtig.
- **Eiskönigin:** wirkt alle 6s starken Frostslow; nach 3 Frosttreffern `Frostspitze` hohen Hit, unterbrechbar durch spezielles Siegel.
- **Torwächter:** blockiert 25% der Attackhits (schwächere 55% Blockeffizienz); nach 3 Blocks kontert; Spell-/DoT-Build kontert.
- **Seuchenbrüter:** Poison-Stacks, ab 4 Stacks spezielle Explosion; Schattenresistenz und Regen helfen.
- **Runenwächter:** wechselt alle 15s zwischen Anti-Attack (30% phys. Resistenz) und Anti-Spell (30% elemental Resistenzen), Signal vorher anzeigen; Hybridbuild kann reagieren.

**Bosstelegraph:** Bei automatischem Kampf gibt es keine Reflex-Dodge-Mechanik! Warnung darf nur zur **Vorbereitung** oder automatisierten defensiven Skillpriorität dienen. Phasen und Mechaniken müssen vor dem Start in einer Bossbeschreibung nachvollziehbar sein; kein unsichtbares „Du musst ausweichen“, das unmöglich ist.

# 14. ENDGAME: RIFTS, ATLAS, PINNACLE-BOSSE

Ab Level 60: **Rift-Tier 1** freischalten. Durch erfolgreichen Tier-Rift wird `highestClearedTier = max(highest, tier)` erhöht. Zugang `≤highestCleared+1`, keine Schlüssel für Standard-Rifts, keine täglichen Limits. Rift besteht aus 3 Normalbegegnungen, 1 Elite, 1 Boss; ab Tier20 4 Normalbegegnungen; ab Tier40 2 Elite (statt 1). ItemLevel `min(100,60+floor(.6*(tier-1)))`.

## 14.1 Skalierungsfunktionen (Initialwerte)

`riftHPmult(tier) = 1.10^(tier-1)`;
`riftDMGmult(tier) = 1.045^(tier-1)`;
`riftGoldMult(tier) = min(3.0, 1 + 0.035*(tier-1))`;
`riftMaterialMult(tier) = min(2.5, 1 + 0.025*(tier-1))`;
`riftRareWeightMult(tier) = 1 + 0.004*min(tier-1,100)` (nur auf Rare-Anteil, Normal passend abziehen; Uniquechance **nicht** ohne definierte Quelle erhöhen);
`riftBossHP = baseBossHPAtLv60 * riftHPmult(tier) * bossArchetypeFactor`.

**Referenztabelle:** Tier1 HP 1.00× / Schaden 1.00×; Tier10 HP 2.36× / Schaden 1.49×; Tier20 HP 6.12× / Schaden 2.31×; Tier30 HP 15.86× / Schaden 3.58×; Tier40 HP 41.14× / Schaden 5.57×; Tier50 HP 106.72× / Schaden 8.64×. Zahlen per tatsächlichem Code erneut berechnen und bei Abweichung Tabelle automatisch korrigieren. Exponentielle HP-Skalierung macht T50 zum harten Test; Tiers jenseits der 50 sind **Prestige**, nicht notwendige Pflicht für die wichtigsten Items. Ein Spieler mit gutem Endgamebuild soll Tier15–25 zuverlässig schaffen; Tier40+ erfordert optimierte Buildentscheidungen.

## 14.2 Rift-Modifikatoren

Pro Run zieht die Engine aus einem gewichteten zulässigen Pool: Tier1–9: 1 Modifier; 10–24: 2; 25–39: 3; ab40: 4. Mögliche Regeln:

- `Gläserne Horden`: Monster HP -10%, Damage +20%, Belohnungsmenge +8%.
- `Unsterbliches Fleisch`: Monster HP +20%, Damage -5%, Belohnungsmenge +8%.
- `Verbrannte Luft`: Spieler Feuerresistenz -15pp, +10% Essenz-Chance.
- `Dunkles Ritual`: Spieler Schattenresistenz -15pp, +10% Arcane Shards.
- `Eiserne Garde`: Monster Armor +35%, +10% Materialmenge.
- `Unruhige Magie`: Monster Spell Damage +20%, +8% Rare-Anteil relativ.
- `Blutige Zeit`: Bleed-Dauer +35% für beide Seiten, +10% Boss-Siegel nur als **nicht-garantierter** Chance auf +1, cap 2 Boss-Siegel insgesamt pro Sieg.
- `Kurze Gnade`: Spielerschilde -20% Effekt, +12% Materialmenge.
- `Giftige Tiefen`: Monster Poison Chance +25pp, +10% Runenfragment-Chance.
- `Zorn der Elite`: Elite +20% HP, Boss +10% HP, +10% Uniquechance **relativ** bei Elite/Boss.
- `Arkane Stille`: Spieler Mana Regen -20%, +10% Shard-Chance.
- `Höllenpforte`: +1 Normalbegegnung, Materialmenge +15%, zeitaufwändiger.

`compatibilityGroups` verhindern widersprüchliche Modifier. Multiplier für Rewards sind auf +60% durch Mods begrenzt, Abzüge werden vor Multiplikation gecappt. Modifier werden im Run vor Start angezeigt, ohne Überraschungs-Statänderung. Für jede Riftkonfiguration Spezialisierung und Schwierigkeits-Signalwert ausgeben.

## 14.3 Endgame-Bäume („Konstellationen“)

Ab Rift-Tier5: Endgame-Punkt pro erstmalig abgeschlossenem Meilenstein-Tier `5/10/15/20/.../50`, danach alle 10 Tiers; maximal 20 Punkte. 3 Spezialisierungsäste mit je 8 Knoten: **Jäger** (Elite + Chance, spezialisierte Bosse), **Schmied** (Essenzen, Runen, Veredelungsmaterial), **Kartograf** (mehr Begegnungen, Affixquellen, Modifikatoren). Beispiele: Jäger I `+10% relative Elite-Boss-Unique-Chance`; Schmied I `+12% relative Essence-Chance`; Kartograf I `+1% zusätzliche Rift-Basisitems pro Run` [als Chance pro Run, nicht Multiplikator]. Ziel: Keine Spezialisierung dominiert **gleichzeitig** Kampf, Materialien und Uniques. Kostenlose Resetpunkte bis Rift 10, danach Gold-Reset, keine Echtgeldkosten.

## 14.4 Pinnacle-Bosse und Fragmentsystem

Vier Endgame-Hauptbosse: Aschenkönig, Sturmbote, Leerenfürstin, Blutkoloss. Zugang: je 4 `Pinnacle-Fragment` aus passenden Rifts (Riftboss ab Tier10: 1 Fragment garantiert; spezialisierter Zweig höchstens 20% Chance auf ein zusätzliches Fragment), Zugang wird **erst bei Antritt** verbraucht. Bosse haben Quest-Variante (erster Kill, sichere garantierte Belohnung) und wiederholbare Boss-Farmvariante (spezielle Unique-Pools, garantierte 2 Boss-Siegel). `pExclusiveUniquePerKill = 4%` für benannten Boss, **zusätzlich** zu allgemeinen normalen Loot-Rolls; Magic Find modifiziert nur allgemeine Lootqualität, nicht die 4%-Chance. Bei einem exklusiven Unique-Drop wird innerhalb des definierten Pools gewichtet. Ein Boss kann 2–4 exklusive Uniques haben. Auf Boss-Siegel beschränktes System sorgt für garantierte langsamere Alternative. Sichere ein brauchbares Fortschrittsmaterial je Sieg.

# 15. GEPLANTE BUILD-ARCHETYPEN UND KONTER

Jede Klasse muss mindestens zwei Builds besitzen, die gegenüber einem globalen Referenz-Build in der Gesamt-Rift-Performance **innerhalb einer akzeptablen Bandbreite** liegen, dabei unterschiedliche Stärken zeigen. Testmatrix:

| Build | Primäre Stat/Waffe | Mechanik | Besonders gut gegen | Schwäche |
|---|---|---|---|---|
| Blutungs-Wächter | STR, Zweihandaxt | 5 Bleed-Stacks + Finisher | hohe HP / längere Bosse | kurzer Burst-Gegner |
| Block-Wächter | VIT, Schild/Schwert | Blocks → Barrier / Counter | phys. Boss | durchgehender DoT |
| Blitz-Arkanist | INT, Zauberstab/Fokus | Spell-Crit + Kettenblitz | Horden | hohe Blitzresistenz |
| Frost-Arkanist | INT/VIT, Stab | Slow + Barriere | schnelle Gegner | Frostresistenz |
| Gift-Schatten | DEX, Dolch | 5–7 Poison-Stacks | robuste Bosse | Giftresistenz / kurze Kämpfe |
| Krit-Schatten | DEX, Krallen | Multi-Hit + Finisher | Elite-Burst | Konter/Reflexionsgegner |
| Diener-Nekromant | INT/VIT, Zepter | 2–3 Minions + Curse | große Gegnergruppen | Flächenschaden |
| Fluch-Nekromant | INT, Stab | Schatten/Poison-Verstärkung | resistente Elites | hoher Burst gegen Spieler |
| Runen-Hybrid | STR/INT, Runenklinge | Trigger-Synergie | wechselnde Resistenz | Ressourcenbedarf |
| Runen-Tank | VIT/STR, Schild | Armor + Rune Protection | phys. Boss | lange Bosskämpfe |
| Vergeltungs-Inquisitor | VIT/STR, Schild | Block-Counter | viele direkte Angriffe | reine DoTs |
| Licht-Inquisitor | INT/STR, Zepter | Spell + physische Treffer | gemischte Resistenzen | reine Power-Speed-Checks |

Setze für jeden Build automatisierte Loadout-Fixtures (Early/Mid/End) mit gezielten Ausrüstungswerten, Talentpfad, 4 aktiven Skills, APL und 1–2 Uniques um. Simuliere Bossmatrix und Rift-Modifikatoren, um echte Vor-/Nachteile zu bestätigen. Die Build-Effizienz darf nicht nur über DPS verglichen werden; `clearTime`, `survivalProbability`, `resourceSustain` und Material pro Zeiteinheit zählen mit.

# 16. BENUTZEROBERFLÄCHE ALS VOLLSTÄNDIGE GAME-APP

**Hauptbereiche:** Charakter (Avatar, Papierfigur, Level/XP, Stat-Details, alle Equip-Slots), Inventar (Items nach Rarity, Such- und Vergleichstooltips), Talentbaum (Graph/Verbindungen, freie Punkte, Reset), Skills (4 aktive Slots, Prioritäten, Detailformeln), Dungeons (Zonen, Info, Boss, Drop-Vorschau), Kampf (2D Portraits, Bars, Effekte, Timeline, Log, x1/x2/x4/Skip), Rifts (Tier/Mods/Profil), Schmiede (Item links, Rezepte rechts, probabilistische Ergebnisvorschau, Materialsaldo), Stash (Tabs, Filter, Locks), Kodex (Uniques entdeckt/fehlend, ihre Quellen, Rollranges), Konstellationen (Endgame-Spezialisierungen), Buildlabor (Simulation), Einstellungen (Grafik, Animationen, Tooltips, Save Export).

**Tooltipstruktur:** Name/Rarity/Base/ilvl/ReqLvl; DPS oder Spell-Stats; implizite Modifikatoren; Präfixe/Suffixe mit `Tier`, `Wert`, `möglicher Wertebereich`, `Gruppe`; lokale vs globale Einwirkung; Unique-Triggers; Sockel/Runen; Korruptionsstatus; Erhalten-von-Quelle; Vergleich zum Slot; bei Tooltip-Auswertung echte Stat-Deltas und bei Spezialeffekt ein Warntext „geschätzter Kampfeffekt nur durch Simulation“.

**Farben:** Normal hellgrau, Magisch blau, Selten goldgelb, Unique bernstein, korrupt violetter Zusatzindikator; nicht nur Farbe verwenden (Textlabel/Icon). UI Dark Fantasy, Goldakzent, lesbare Schrift; Desktop-first, Tablet/Mobile funktional. Animationen/Audio optional und abschaltbar; keine Gameplay-Logik im DOM. Dialoge für irreversible Crafting-Aktionen.

**Lootfilter:** reine Sichtbarkeits-/Sortierlogik, keine Veränderung der Itemwahrscheinlichkeiten. Auto-Salvage nur nach expliziter bestätigter Regel; Unique/Locked/Favorit standardmäßig niemals automatisch verwerten. `Claim Rewards` ist einmalig, kann beliebig oft UI-mäßig aufgerufen werden, erzeugt aber nicht erneut Items.

# 17. ÖKONOMIE, STASH UND WEITERE SAFETIES

Gold pro normale Begegnung: `round(8 + 3*monsterLevel^1.2)`; Elite ×2; Boss ×4; Rift `riftGoldMult`. Goldbedarf durch Stash-Erweiterung (1. Tab frei, weitere Tabs 1k/5k/20k/60k Gold), Respec, Reforge-Service, Tooltips/Sehen der Affix-Pools (kostenlos) und kleine Quality-of-life. Crafting braucht hauptsächlich Materialien, nicht massive Gold-Tax. Basis-Stash 4×12 Itemslots; später Tabs/Seiten bis 2000; speichere Items normalisiert nach ID, nicht dupliziert. Inventar 60 Einzelslots, Materialien in eigener unbegrenzter Materialtasche, ohne Gewichtssystem. Bei vollem Inventar Run-Rewards als **persistiertes Pending-Rewards-Panel**, nie verwerfen, duplizieren oder unbemerkt zerstören.

**Ausrüstungsanforderung:** `requiredLevel = minBaseLevel + max(0, affixLevelRequirementBonus)`; für T1-Affix mindestens Level 60, T0 mindestens Level 80; bei korrupten/Unique gesonderte Mindeststufe. Keine Item-Instanz gleichzeitig an 2 Slots oder Stash + Inventar. Gelocktes Item kann nicht verwertet/überschrieben werden.

**Save:** IndexedDB mit transaktionalen Commits, Autosave nach Commands, manuelles Export/Import JSON validiert, Versionsmigration, Backup-Rotation (letzte 3 funktionierende Snapshots), Reparatur bei Teildatenkorruption; keine unbegrenzten Eventlogs im Primär-Snapshot. Prüfsumme zur Erkennung versehentlicher Korruption, keine falsche Versprechung von Manipulationssicherheit im Offline-Singleplayer.

# 18. BALANCING: KONKRETE ZIELKORRIDORE UND SIMULATION

Zahlen sind **Zielwerte für Testcharaktere**, nicht Ergebnisbehauptungen. Lege dafür synthetische „Referenz-Builds“ an; sie enthalten plausible, aber nicht perfekte Drops und dokumentierte Statbudgets. Analysiere jeweils mindestens 10.000 RNG-Seeds je Build/Gegnerpaar.

| Progress | Stufe / Richtwert DPS | Normale Begegnung Siegzeit p50 | Elite p50 | Boss p50 | Normaler Dungeon-Sieg |
|---|---|---:|---:|---:|---:|
| Start | Lv1 / ca. 18–25 DPS | 4–8s | 10–18s | 30–55s | ≥90% mit Starterloadout |
| Früh | Lv15 / ca. 90–150 DPS | 4–9s | 10–20s | 30–60s | ≥80% bei passendem Level |
| Mitte | Lv35 / ca. 450–850 DPS | 4–10s | 12–24s | 35–70s | ≥70% mit vernünftigen Items |
| Endgame-Einstieg | Lv60 / ca. 2000–3500 DPS | 5–11s | 12–28s | 40–85s | ≥70% mit passendem Loadout |
| Rift T20 | Lv75 / ca. 6000–10000 DPS | 6–14s | 14–33s | 45–100s | 55–80% bei gutem Build |
| Rift T40 | Lv90 / ca. 30000–50000 DPS | 7–18s | 20–45s | 55–130s | 40–70% für stark optimierte Builds |

Der **gegnerische Schaden** wird für jede Referenz-Buildstufe iterativ so kalibriert, dass die Ziel-Siegquoten ohne versteckte Verteidigungsboni erreicht werden. Monster HP wird gegen Ziel-DPS/TTK kalibriert; somit sind oben gegebene multiplikative Rift-Zahlen nicht blind absolut anzuwenden. Schreibe ein Skript, das in Datenreports erkennbare Zielverletzungen ausgibt. **Wenn sich T40 mit T1.10^39 HP und 35k DPS nicht in 130s schaffen lässt, ist die Tabelle zu revidieren, nicht die Simulation zu fälschen.** Beim Change-Review belege Änderungen mit Graph und Kennzahlen.

## 18.1 Build-Parität und Spezialität

- Vergleiche bei gleicher Itembudget-Klasse (Anzahl T1/T2-Affixe, Uniques, Runegrade); keine idealisierten Perfekt-Builds mit schlecht ausgerüsteten Gegnern.
- Median „breite“ Rift-Clear-Zeit konkurrenzfähiger Builds innerhalb von ±20–25% um Median **in gemischtem Testportfolio**; bossfokussierte Builds dürfen bei ihren Bossen bis +30% effizienter sein, sollen gegen Gegenprofile spürbare Schwächen besitzen.
- Ein einzelnes nicht-Set-Unique sollte bei gleichem Itembudget im neutralen Profil nicht >20% stärker machen als eine sehr gute Rare-Alternative; stärkere Effekte nur mit deutlichem Nachteil und enger Nische.
- Keine unendlichen Resource-Loops, Lifesteal-Loops, Trigger-Loops; pro-Second-Caps, root-event budget und Statuscaps müssen greifen.
- Mana-Sustain eines korrekten Level-Loadouts: `oom`-Zeitanteil bei Standard-Automatik <20% normal, ≤35% bei bewusst manaintensiven Burstbuilds; kein automatischer permanenter Stun- oder Barriere-Lock.

## 18.2 Loot-KPI

- Basis-Drop-Mittel aus Tabellen exakt berechnen und in Tests verifizieren.
- Bei Boss mit 2.9 Items ×1.5% Kandidaten-Uniquechance ist Erwartungswert von Unique-Kandidaten `0.0435` pro Bosskill; **tatsächliche** Wahrscheinlichkeit hängt von `uniqueEligibility` ab. Statistik muss „Unique-Roll“ und „gültiger Unique-Drop“ getrennt ausweisen.
- 10.000 Bosskills ergeben erwartbar ca. 435 Unique-Kandidaten vor Basis-/Pool-Gating, mit binomial/Poisson-ähnlicher Streuung; 95%-Intervall aus Simulation nicht per hartem Integer-Gleichheitsvergleich testen.
- T1-Affixe bei ilvl80 erscheinen in einem offenen gültigen T1-Pool mit normalisiertem Gewicht 5/100 = 5%; reale Gesamtwahrscheinlichkeit hängt von Affixfamilie, Slot- und Seitenauswahl ab.
- Garantierte Boss-Siegel: 18 Siege pro zufälligem noch unbekannten Boss-Unique-Tausch bei 2 pro Sieg. Damit gibt es eine konkrete alternative Fortschrittsroute unabhängig vom RNG.
- Ressourcenüberschüsse/Defizite in Stunden Farmzeit mit synthetischen Spielstrategien prüfen; zum Beispiel „ein gutes T2-Upgrade alle 30–90 Minuten Spielzeit“ ist eine **Designhypothese** zur Validierung, kein Versprechen.

## 18.3 Metriken und Berichte

`npm run balance` erstellt `reports/balance.html`, `reports/builds.csv`, `reports/drop-distribution.csv`, `reports/crafting-costs.csv`, `reports/progression.json` mit: winrate, p10/p50/p90 TTK, DPS, Schadensanteil pro Skill, DoT/Direct, HP nach Kampf, Mana-Uptime, Triggercount, Rare/Unique-Drops, Affixverteilung pro Itemtyp und Tier, durchschnittliche Kosten je Craftingziel, erwartete Ressourcen pro 100 Runs, Anzahl fataler Zustandsverletzungen. Vergleich gegen gespeicherte Gold-Regression-Seeds. Bericht muss Abweichungen farblich und textlich erklären; Reports dürfen nur auf tatsächlichen Simulationsergebnissen beruhen.

# 19. MONTE-CARLO-CRAFTING-PLANER UND BUILD-LABOR

Optional in MVP als Debug-Tool, ab Phase 3 Spieler-UI:

- `craftOdds(item, recipe)` berechnet exakte zulässige Modfamilien und Gewichte, Tierwahrscheinlichkeit, min/max Ergebnis und Materialkosten.
- `estimateCraftPath(goal, resources, budget)` vergleicht Pfade (Essenz zuerst vs Rare-Ergänzung vs Neuprägen), benötigt explizite Stoppregeln und kann Monte Carlo verwenden; nicht als garantierte „bestmögliche“ Lösung ausgeben, wenn Algorithmus heuristisch ist.
- `simulateBuild(loadout, encounter, nSeeds=10000)` liefert erwartete Siegquote, TTK-Perzentile, Ursachen der Niederlage und DPS nach Fähigkeit.
- `compareLoadouts` führt A und B mit denselben Seeds auf gleicher Gegnergruppe aus (paired comparisons). Vergleichbar ist nicht „Power Score“, sondern gemessene Performance mit Fehlerbalken.
- In Spieler-UI optional „Testpuppe“ (ohne Loot) mit 10/30/60-Sekunden und Ziel-Profilen; unterschiedliche DOT-Builds benötigen lange Messfenster.

# 20. VOLLE CONTENT-ROADMAP, ABER VERTICAL SLICE ZUERST

**Vertical Slice Phase 1:** React/TypeScript-App startet; 1 Klasse Wächter; Lv1–15; 4 aktive Skills (`Spaltender Hieb`, `Schildwall`, `Bluternte`, `Rüstungsbruch`) + 4 passive Knoten; 2 unterschiedliche sinnvolle Buildvarianten (2H Bleed vs 1H Schild); 6 Equip-Slots (Hauptwaffe, Nebenhand, Brust, Helm, Ring, Amulett); ≥8 Item-Basen; ≥15 kompatible Affix-Familien; 4 Uniques mit tatsächlichen Hooks; 1 Dungeon mit 4 regulären Begegnungen und 1 Boss; 1 kleine Rift-Probe; Prägen, Anreichern und Ergänzen; Inventar, Stash, Vergleich, Stats, echte Kampfdarstellung, Persistenz, Basisloot; Test-Fixtures und Reports.

**Phase 2:** Vollständige 11 Slots, Waffen-/Rüstungskatalog, bis lvl60, 50+ Affixfamilien, weitere 10 Uniques, Lootfilter, ausgefeilter Craftingbaum, XP-Progression/Balance.

**Phase 3:** Arkanist/Schatten, Skillmodifikatoren, 3x Talentbäume, 12 Builds, Runensockel, perfektionierte Craftingvorhersagen, Buildlabor, 6+ Dungeons.

**Phase 4:** Endgame Rift1–50, 4 Pinnaclebosse, Boss-Farming, Fragmente, Siegel, Konstellationen, vollständiges Endgame-Crafting, 20+ Uniques.

**Phase 5:** Nekromant, Runenschmied, Inquisitor, 12 Spezialisierungen, 60+ Skills, 100+ Skillmods, 200+ passive Nodes, 150+ Uniques, 20 Dungeons, 15 Bosse, QoL, Accessibility, umfangreiche Balancezyklen, optionale Account-Integration. Diese langfristigen Ziele nur sukzessive implementieren; niemals mit Copy-Paste-Platzhaltern auffüllen.

# 21. ABNAHMETESTS — OHNE AUSNAHME

**Engine:** gleicher Seed und Zustand → Byte-für-Byte gleicher Resultat-Hash; UI-Skip = vollständiger Replay; nach Item-EQUIP ändert sich Kampfergebnis entsprechend; `localPhysical` auf Waffe skaliert nicht Zauber; globales Feuer wirkt nur bei Fire-Tags; Waffe mit 2H verhindert Schild; Resistenzen blockieren Maxwert, Penetration korrekt; Dodge/Block unabhängig unter priorisierter Reihenfolge; Statuscaps und Triggerbudget halten; keine Negative HP/Mana; keine infinite loops; `maxCombatTime` enforced.

**Loot:** 100.000 generierte Items entsprechen erwarteter Rarity-Verteilung innerhalb Konfidenzintervall; niemals 4 Präfixe oder unzulässige Affixe; T1 nur ilvl80+; jeder Affix hat gültige Gruppe, Weight und Tier; Null-Unique-Pool → korrekter Rare-Fallback, telemetry; Magic Find ändert NIE Tier-Rolls bei gleicher RNG-Substream-Strategie, nur Qualitätsverteilung; Gold/Materialien unabhängig von Favoriten/Filter.

**Crafting:** fehlendes Material → keine Änderung; fehlender Modpool → keine Änderung; versiegeltes Affix bleibt in exakt einer nächsten Neuschmiede erhalten; corrupt item kann nicht neu schmieden; Unique kann keine normalen Rare-Affixe erhalten; Ring/Amulett-Affix nicht auf falschen Slot; einmalige Currency-Abbuchung selbst nach Browserreload; Runen lösen ohne Duplikat; T2→T1 nur ilvl80+, Kosten korrekt, kein Item >6 explizite Mods; vollständige Recipe-Preview deterministisch im Erwartungsraum.

**Progression/UI:** Create → Dungeon → Sieg → Loot → Ausrüsten → Craft → schwieriger Kampf → Reload ist in Playwright ausführbar; alle Navigationsknöpfe bedienen reale Screens; keine Fake-Daten oder Hardcoded-Siege; aktiver Charakter wird nach Reload identisch rekonstruiert; Import kann ungültige Saves sinnvoll ablehnen; Pending-Loot geht bei vollem Inventar nie verloren; Locked/Unique wird nicht automatisch gesalvaged; Accessibility/Tastaturbedienung grundlegend geprüft.

**Balance:** mind. 10.000 Seeds/Fixture; Berichte existieren; designierte Winrate-/TTK-Ziele als **Warnungen**, nicht „grüner Test“ durch geschönte Werte. Wenn Balanceziele bei Initialzahlen nicht erreichbar sind, dokumentiere realen Konflikt und vorgeschlagenen Wert; neue Balance-Version anlegen. Tests können technische Korrektheit von subjektivem Spaß unterscheiden.

# 22. VORGEHENSWEISE UND AUSGABEFORM

**Schritt 1:** Spezifikation prüfen. Erstelle `docs/GDD.md`, `docs/BALANCE_V1.md`, `docs/EVENT_ORDER.md`, `docs/DATA_SCHEMA.md` und `docs/IMPLEMENTATION_PLAN.md`. Markiere offensichtliche Kontradiktionen (z. B. Startwaffen-DPS vs ±15%, Werte nach Skalierung, Rift40-DPS/HP, inkompatible Skill-Elemente) transparent; entscheide in separatem Decision Log über notwendige Korrekturen.

**Schritt 2:** Setze Projekt real auf, definiere schemas/types/prng/stats/commands/tests; arbeite sofort auf spielbaren Zustand zu. Keine wochenlange Theoriearbeit ohne lauffähiges Produkt.

**Schritt 3:** Combat Engine, Item-Generation, Inventar, Crafting, Charakter, Dungeon, Persistenz implementieren und mittels Playwright End-to-End durchspielen. 4 Unique-Hooks, Test-Run und Erklärung von Stats.

**Schritt 4:** Führe Balancing-Simulationen aus, generiere echte Reports, kalibriere Zahlen unter Erhaltung der vorgesehenen Build-Identität. Passe niemals Ergebnisse direkt in Reports an.

**Schritt 5:** Gestalte hochwertige, klare Dark-Fantasy-UI um echte Systeme. Erst dann restlichen Content in der priorisierten Roadmap hinzufügen.

Nach jeder Iteration kurz und ehrlich liefern: (a) implementierte Funktionen, (b) geänderte Dateien, (c) tatsächliche Build-/Testbefehle und Resultate, (d) noch offene Bugs und Balanceabweichungen, (e) nächsten konkreten Arbeitsschritt. Keine vagen „fertig“-Behauptungen. Arbeite ohne zusätzliche Rückfrage mit den hier festgelegten Defaults; nur wenn ein **echter** unvermeidbarer Widerspruch unauflösbar ist, triff eine dokumentierte Entscheidung.

## LETZTER VERBINDLICHER AUFTRAG

**Implementiere zuerst den echten Vertical Slice, nicht nur ein Konzept und nicht nur ein Mockup.** Der erste spielbare Meilenstein ist erreicht, wenn ein neuer Wächter eine verfallene Krypta betritt, automatische Kämpfe gewinnt oder verliert, ein Item mit nachvollziehbar gewürfelten Affixen erhält, es ausrüstet, spürbare Kampfwertänderungen erlebt, es craftet, einen zuvor schwierigen Boss durch Build-Anpassung besiegt und seinen Fortschritt nach Reload wiederfindet. Dieses Erlebnis muss mit validierten Spielzuständen und reproduzierbarer Engine funktionieren.

---

# ANHANG A — MATHEMATISCHER ERSTCHECK (NICHT SPIELTEST)

Diese Kontrollen wurden bei Erstellung der Spezifikation anhand der angegebenen Tabellen mit einer unabhängigen Python-Rechnung durchgeführt. Sie beweisen **keine Gesamtbalance** und ersetzen weder die TypeScript-Engine noch die Kampfsimulation.

## A.1 Neutrale Waffen-DPS (ohne Crit/Implizit/Skill/Affix)

- Einhand-Melee: Dolch `10.5×1.55=16.275`, Kurzschwert `15×1.20=18.00`, Langschwert `17.5×1.05=18.375`, Kriegsaxt `20.5×0.95=19.475`, Streitkolben `22×0.90=19.80`, Krallen `12×1.42=17.04`, Runenklinge `14×1.15=16.10`. Streuung von 16.10–19.80; schneller Dolch und Slow-Mace haben deshalb unterschiedliche Spitzenwerte, aber ähnliche Größenordnung.
- Martialische Zweihänder: Speer `27×0.96=25.92`, Zweihandschwert `30×0.84=25.20`, Zweihandaxt `35×0.74=25.90`, Kriegshammer `41×0.64=26.24`, Bogen `24×1.08=25.92`, Armbrust `36.5×0.70=25.55`. Verhältnis zum Einhand-Median ≈1.4×, jedoch ohne Schild-/Fokus-Boni. **Casterwaffen werden nicht mit ihrer physischen Autoattack-DPS bewertet**, sondern über Spell-Fixtures.

## A.2 Geprüfte Unique-Kandidaten bei Bossloot

Unabhängige Monte-Carlo-Stichprobe mit `random.Random(20261122)`, `100.000 Bosskills` je MF-Konfiguration; für jeden Boss werden 2/3/4 Itemrollen gemäß 30/50/20% gezogen; der Quality-Roll pro Item ist unabhängig.

| MF | Items in Simulation | Unique-Kandidaten | Pro Boss ≥1 Unique-Kandidat | Theoretischer Wert |
|---:|---:|---:|---:|---:|
| 0 | 289.979 | 4.369 | 4.305 % | 4.283 % |
| 200 | 289.983 | 6.094 | 5.962 % | 5.959 % |

Die Spalte „Unique-Kandidaten“ ist **nicht** die tatsächlich ausgegebene Menge an gültigen Uniques, da Base-/Level-/Source-Gating zu Rare-Fallbacks führen kann. Für reale Spielerbelohnungen ist unbedingt eine eigene Verfügbarkeits-Simulation über die vollständigen Content-Pools durchzuführen.

## A.3 Explizite technische Widerspruchs-Gates

Wenn später eines der folgenden Probleme gemessen wird, darf die Programmier-KI nicht stillschweigend raten:

1. **Rift-T40-HP vs. 150s Timeout:** Bei Basisboss-HP `110.000` und T40-Multiplier `~41.14` besitzt der Boss `~4.525.000 HP`. Ohne Heilung/Phasen wären bei `35.000 effektiven DPS` rechnerisch `~129.3s` notwendig. Builds mit effektiv weniger als `~30.200 DPS` sind bei 150s Hard-Timeout rechnerisch ausgeschlossen. Dieses Gate muss im Balance-Report auftauchen. Damage-Budget/Resistenzphasen können weitere DPS erfordern.
2. **MF-Gating:** Die tatsächliche Unique-Rate kann massiv niedriger sein, wenn viele Item-Basen keinen gültigen Unique-Kandidaten besitzen. Nach Erstellung des Content-Pools den realen Erfolg separat messen und gegebenenfalls das **offen deklarierte** Dropmodell ändern, statt nur den Kandidatenwert zu erhöhen.
3. **Spell-Waffen-Gerechtigkeit:** Stab `+35% Spell` vs. Zauberstab `+12%` + Fokus `+10%` = zusammen additiv +22% globale Spell Damage. Unter ansonsten gleichen Bedingungen hat ein Stab ein +13-Prozentpunkte-Offensivbudget statt Offhand-Defensive. Zusätzliche Affixplätze des Fokus sind zu berücksichtigen; Vergleich nur anhand vollständiger Loadout-Fixtures.
4. **Status-Double-Dipping:** Die DoT-Definition muss bei Rohwertsnapshot und Tickmitigation eindeutige `sourceTags` verwenden, damit Phys/Fire increased Damage nicht zweimal auf denselben Schadensanteil angewandt wird. Falls der Parser beides ermöglicht, zuerst Enginefehler beheben, nicht `dotMultiplier` verstecken.
5. **Rundensystem:** Visuelle Runden à 1s sind Präsentationsgruppen, intern 100ms-Scheduler. Wenn die UI genau alternierende Schläge verlangt, wird daraus ein anderes Kampfsystem. Für DARKFORGE ist der Scheduler verbindlich.
6. **Endgame-Bosszugang:** Ab Rift 10 wird **1 Fragment garantiert je Riftboss** vergeben. Vier Fragmente erlauben einen Pinnacle-Bossversuch. Das gewährleistet planbare Jagd ohne 16-Rift-Glückssperre.

## A.4 Mindestdefinition von „balanced“

`Balanced` bedeutet in diesem Projekt **nicht**: Jeder Build ist exakt gleich stark, jede Waffe hat identische DPS, jedes Unique ist gleich häufig, jede Craftingaktion ist garantiert nützlich oder alle Bosse sind mit jedem Build gleich leicht. Es bedeutet: Regeln sind konsistent und reproduzierbar; relevante Wahlmöglichkeiten haben reale Opportunitätskosten; unterschiedliche Builds bestehen je nach Encounter; Progression und Ressourcenverbrauch sind nachvollziehbar; Daten können mit Simulationen kalibriert werden; keine unbeabsichtigten dominierenden Strategien, Betrugsduplikate oder unendlichen Triggerketten existieren. Erreiche diese Qualität iterativ, mit reproduzierbaren Reports und echten Spieltests.

**ENDE DES VERBINDLICHEN ULTRA-MASTER-PROMPTS.**
