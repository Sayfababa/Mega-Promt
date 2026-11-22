# DARKFORGE — Game Design Document (kompakt)

Quelle: `spec/DARKFORGE_ULTRA_MASTER_PROMPT_DE.md` (Spec v1.0). Alle Zahlen sind Startwerte `balanceVersion: 1` (Details: `BALANCE_V1.md`). Abweichungen/Unklarheiten: `DECISIONS.md`. Abschnittsverweise in `§`.

## 1. Produkt

| Merkmal | Festlegung | § |
|---|---|---|
| Genre | Singleplayer Dark-Fantasy-Loot-RPG, HTML5, offline-first | 0 |
| Kampf | vollautomatisch, deterministische Simulation; keine Eingabe im Kampf | 0, 10 |
| Darstellung | Held links, Gegner rechts, Bars, Status, Log, Timeline, x1/x2/x4/Skip | 0, 16 |
| Entscheidungen | vor/zwischen Kämpfen: Gebiet, Schwierigkeit, Loadout, Talente, Skill-Prioritäten, Ausrüstung, Crafting, Lootfilter, Endgame-Spezialisierung | 0 |
| Verboten | 3D, WASD, Echtzeit-Input, Monetarisierung, Energie, Daily-Pflicht, FOMO, P2W, `Math.random()` in Engine, Fake-UI, kopierte fremde IP | 0, 1 |
| Sprache | deutsche UI, i18n-fähige Daten | 0 |
| Stack | siehe D-001 (npm, Vite, React 18, TS strict, Zustand, Zod, Dexie, Vitest, fast-check, Playwright) | 1 |

## 2. Spielschleife (§2)

1. Dungeon/Rift wählen → Gegner- und Belohnungsprofil sehen
2. Build/Kampfrichtlinien (APL-Prioritäten) festlegen
3. 1–5 automatisch simulierte Begegnungen (Rifts mehr, siehe D-051)
4. Loot/Gold/Materialien (Loot erst nach finalem Sieg einer Begegnung)
5. Vergleich / Filter / Verwertung
6. Crafting / Talententscheidung → nächster Run

| Regel | Wert |
|---|---|
| Niederlage | verliert nur den Run; keine Ausrüstung; gesicherte Begegnungsbelohnungen nur falls Run-Regel es vorsieht |
| Wiederholungen | unbegrenzt, keine Warteenergie |
| Volles Inventar | persistiertes Pending-Rewards-Panel, nie verwerfen |
| `CLAIM_REWARDS` | idempotent, erzeugt nie doppelt Items |

## 3. Progression (§2)

| Bereich | Wert |
|---|---|
| Level | 1–100; Kampagne 1–59; Endgame ab 60 |
| Phasen | 1–10 Onboarding; 10–39 Kernsysteme; 40–59 Synergien; 60–100 Rifts/Bosse/Spezialisierung |
| XP bis nächstes Level | `xpNext(L) = floor(85 * L^1.45)`, 1 ≤ L < 100 |
| Encounter-XP | `round(25 + 10*monsterLevel^1.25)`; Elite ×1.8; Dungeonboss ×3.5; Riftboss ×3.5 (ohne Rift-HP-Multiplikator) |
| Überlevel-Malus | wenn `playerLevel - monsterLevel ≥ 9`: `max(0.1, 1 - 0.1*(playerLevel - monsterLevel - 8))` |
| Unterlevel-Cap | Gegner > 5 Level über Spieler: max 1.5× XP (Referenz unklar, D-053) |
| XP-Vergabe | genau einmal pro siegreicher Begegnung, nicht pro Monster |
| Talentpunkte | +1 je neuer Stufe; +1 Spezialisierungspunkt bei L20 und L45 |
| Attribute | +2 freie Punkte/Level + klassenbedingte Auto-Boni |
| Talent-Refund einzeln | `ceil(100 * max(1, level)^1.2)` Gold |
| Komplett-Reset | 5× Einzelkosten; erster Reset gratis |
| Refund-Bedingung | nach Entfernen müssen alle Knoten verbunden/zulässig bleiben |

## 4. Klassen (§3.1, §11)

| Klasse | STR/DEX/INT/VIT Start | Auto +1/Level | Phase |
|---|---|---|---|
| Wächter | 15/10/7/15 | STR, VIT | 1 (Vertical Slice) |
| Arkanist | 6/10/18/11 | INT, VIT | 3 |
| Schattenläufer | 9/17/9/10 | DEX, VIT | 3 |
| Nekromant | 7/10/17/11 | INT, VIT | 5 |
| Runenschmied | 13/9/14/11 | STR, INT | 5 |
| Inquisitor | 12/10/12/13 | STR, VIT | 5 |

Skill-System (§11): 4 aktive Slots, 2 passive Skillslots, 1 Standardangriff. Skill-Level 1–5, je Level +7% Basiswirkung (additiv), +2% Kosten, CD unverändert; Level 2/3/4/5 benötigen Charakterlevel 10/25/45/65. Basisangriff 1.0× Waffe, 0 Mana, kein CD; mit Casterwaffe alternativ `Arkanfunke` Spell `12 + 0.3*INT`.

Wächter-Skills (Vertical Slice fett):

| Skill | Effekt | Mana | CD |
|---|---|---:|---:|
| **Spaltender Hieb** | Attack 1.35× Waffe, 35% Blutungschance | 12 | 2.0s |
| **Schildwall** | Barriere 28% maxHP (max 60%), +8pp Block 4s | 20 | 12s |
| **Bluternte** | Attack 1.65× + 0.28× je aktivem eigenem Bleed-Stack; verbraucht alle eigenen Stacks | 25 | 8s |
| **Rüstungsbruch** | Attack 0.9×, Zielarmor −25% 5s | 14 | 7s |
| Kampfrausch | +18% APS 6s, −12% Armor | 24 | 15s |
| Letztes Bollwerk | Heilung 18% maxHP, nur HP<40% | 35 | 20s |

Wächter-Key-Nodes (§11.1): `Blutgericht` +20% Bleed-Chance bei Crit, +10% directDamageTaken; `Eisenherz` +10pp Block, −12% APS; `Wüterich` +18% phys Attack-Damage bei HP<50%, −10% maxHP.

Talentbaum-MVP je Klasse: 18 kleine Knoten (+2% Stat / +3% Defense / +4% Res / +1.5pp Spezial), 6 mittlere (+6–10%), 3 Key-Nodes; `edges`; nur vom Start erreichbar. Support-Siegel (Skill-Modifikatoren, §11.2): ab Lv20 1 Platz pro Skill, ab Lv50 2; 18 Supports katalogisiert (Phase 3).

## 5. Ausrüstung (§2.1, §4)

11 Slots: Hauptwaffe, Nebenhand, Helm, Brust, Handschuhe, Stiefel, Gürtel, Amulett, Ring A, Ring B, Relikt. Zweihänder sperren Nebenhand. Nebenhand: Schild / Fokus / (Totem) / zweite 1H-Waffe (Dual-Wield erst ≥ Phase 3, D-033). Vertical Slice: 6 Slots (Hauptwaffe, Nebenhand, Brust, Helm, Ring, Amulett).

Basis-Tiers Waffen: T1 Lv1 ×1.00, T2 Lv12 ×1.75, T3 Lv25 ×3.10, T4 Lv40 ×5.30, T5 Lv60 ×8.70, T6 Lv80 ×12.80 (nur Schadenszahlen, `roundHalfUp`; APS/Krit fix). Rüstungs-Tier-Multiplikatoren 1/1.8/3.2/5.5/9.0/13.5. Item-Level unabhängig vom Basis-Tier. Werte: `BALANCE_V1.md`.

## 6. Stats-Formeln (§3, exakt)

```
maxHP   = floor((100 + 12*(L-1) + 14*VIT + flatHP) * (1 + sumIncreasedMaxHP)) * productMoreMaxHP
maxMana = floor((60 + 3*(L-1) + 4*INT + flatMana) * (1 + increasedMana))
physicalIncreasedFromSTR    = 0.0035  * max(STR-10, 0)   // additiv zu increased physical
spellIncreasedFromINT       = 0.0035  * max(INT-10, 0)
attackSpeedIncreasedFromDEX = 0.0015  * max(DEX-10, 0)
critChanceFromDEX           = 0.00035 * max(DEX-10, 0)
baseHPRegenPerSecond   = 0.005 * maxHP
baseManaRegenPerSecond = 2 + 0.015 * maxMana
effectiveRes = clamp(uncappedResistance - enemyPenetration, -0.50, 0.75)
```

Lokale Waffenwerte (vor Aggregation):
```
weaponMin/Max = (baseMin/Max + localFlatPhysMin/Max) * (1 + sumLocalIncPhysical)
weaponAPS     = baseAPS * (1 + sumLocalIncAttackSpeed)
weaponCrit    = baseCrit + sumLocalCritChance
```

Schaden:
```
rawAttack  = (mean(weaponMin, weaponMax) * skillWeaponCoefficient + skillFlatDamage + validGlobalFlat)
             * (1 + ΣapplicableIncreased) * Π(1 + moreGroup)
rawSpell   = (skillFlatBase + INT * skillIntCoefficient + validGlobalFlatSpell)
             * (1 + ΣapplicableIncreased) * Π(1 + moreGroup)
critDamage = rawDamage * (1.5 + sumCritMultiplierBonus)        // max 3.0
critChance = Waffenbasis + lokal + global + DEX-Anteil + Skillbonus → Cap
physicalReduction    = min(0.70, armor / (armor + 450 + 25*attackerLevel))
elementalDamageTaken = postCritDamage * (1 - effectiveResistance)
```

Modifikator-Semantik: `increased` additiv innerhalb anwendbarer Tag-Klasse; `more` multiplikativ, nur explizite Einzeleffekte, nie normale Rare-Affixe, immer mit Tradeoff + `stackingGroup`. Globale Flat-Waffenschäden wirken nicht auf Spells. Lokal ≠ global, keine Doppelanrechnung.

Caps: Crit [0.05, 0.55]; Crit-Multi ≤ 3.0; Res [−0.50, 0.75]; Block [0, 0.40]; Ausweichen [0, 0.35]; CDR [0, 0.40]; Lebensraub [0, 0.08] des tatsächlich zugefügten Direktschadens, max 15% maxHP/s; APS [0.40, 2.5]; Direktschaden ≥ 1 nach Mitigation (außer explizite Immunität); Barriere ≤ 60% maxHP, verfällt 8s nach letztem Gewinn.

Verteidigung: Ausweichen (P = evasionChance, für `evadable`-Treffer) → Block nur bei nicht ausgewichen + `blockable:true`, blockt 55% des Restschadens (Schild: +15% Blockstärke → 70%, max 75%) → Barriere → HP.

## 7. Itemisierung (§5–§7)

| Thema | Regel |
|---|---|
| itemLevel | 1–100. Normal `clamp(ML + uniformInt(-1,+1), 1, 100)`; Elite ML+1; Boss ML+2; Rift-ML `clamp(60 + floor(0.6*(tier-1)), 60, 100)` |
| Basis-Gating | `dropZoneLevel ≥ minBaseLevel` |
| Raritäten | Normal 0; Magisch ≤1P+1S; Selten ≤3P+3S; Unique feste Mods + Unique-Rolls |
| Rare-Affixanzahl Drop | 3/4/5/6 mit 20/40/30/10%; ilvl<20 max 4 |
| Affix-Tiers | T5 ilvl1, T4 20, T3 40, T2 60, T1 80; Gewichte 30/30/23/12/5, auf erlaubte Tiers renormiert; T0 nur Spezialquelle ilvl≥94, max 1, Gewicht 0.5 |
| Auswahl | erst Familie nach Gewicht, dann Tier nach Gewicht; nie ungültig ziehen und verwerfen |
| Exklusivität | max 1 Mod pro `groupId` |
| Leere Pools | Fehlermeldung, kein Materialverbrauch |
| Affix-Werte | T3-Referenz × Faktor T5 0.50 / T4 0.73 / T3 1.00 / T2 1.35 / T1 1.75; ints ganzzahlig, % auf 0.1 |
| Katalog | 22 Präfixe (p01–p22), 26 Suffixe (s01–s26) |
| Slot-Codes | M martialisch, C Caster (`casterEligible`), A Helm/Brust/Handschuhe/Stiefel, J Ring/Amulett, B Gürtel, O Schild/Fokus, R Relikt, X alle |

Loot (§7): Item-Anzahl pro Begegnung diskret gezogen, dann je Item Rarität. Magic Find: `effMF = max(0,MF)/(200+max(0,MF))`; `pUnique' = pUnique*(1+0.80*effMF)`, `pRare' = pRare*(1+0.55*effMF)`, `pMagic' = pMagic*(1+0.20*effMF)`, `pNormal' = 1 − Rest` (bei <0 die drei höheren proportional auf 1 normieren). MF wirkt nie auf Anzahl, ilvl, Tier, Rollhöhe, Runen, Bossmaterial. Basiswahl nach Zonen-`baseWeights` (körperbetont 45/35/15/5, Magier 25/35/35/5 Waffen/Rüstung/Schmuck/Relikt). Unique-Eligibility nach Basiswahl; ohne zulässiges Unique → Rare mit 6 Affixen + `failedUniqueRoll`-Historie.

Frustschutz: erster abgeschlossener Dungeon → garantiert sinnvolles magisches Waffen-Upgrade; erster Boss nach Charakterlevel 10 → garantiert Rare ≥4 Mods. Endgame: 2 Boss-Siegel pro Sieg über benannten Endgame-Boss; 36 → zufälliges unentdecktes Boss-Unique des Bosses; bossgebunden.

## 8. Crafting (§8)

Materialien: FORGE_DUST, ARCANE_SHARD, ESSENCE (6 Typen), CHAOS_FRAGMENT, SEAL_STONE, VOID_ASH, SOCKET_CORE, CORRUPTION_CORE, RUNE_FRAGMENT, BOSS_SIGIL (Quellen: `BALANCE_V1.md`).

| Rezept | Zulässig | Kosten | Effekt | VS |
|---|---|---|---|---|
| Prägen | Normal | 4 Dust, 1 Shard | → Magisch + 1 Affix | ja |
| Anreichern | Magisch, genau 1 Affix | 2 Shard | +1 Mod der fehlenden Seite | ja |
| Selten erheben | Magisch 1–2 Mods | 7 Shard, 1 Essence | → Rare, +1 Affix (2–3 total) | nein |
| Neuschmieden | Rare 3–6 Mods | 1 Chaos, 4 Shard | alle entsperrten Mods neu (gleiche Anzahl) | nein |
| Ergänzen | Rare, freier Slot | 1 Essence, 3 Shard | +1 Mod, Seite proportional zu offenen Slots | ja |
| Präzise Essenz | Rare, freier Slot | 3 Essence, 4 Shard | +1 Mod garantierter Familie des Essenz-Tags | nein |
| Entfernen | Rare ≥2 entsperrte | 1 Void Ash, 4 Shard | entfernt 1 entsperrten Mod (gleichverteilt) | nein |
| Tier nachschmieden | Rare, Mod T3–T5 | 2 Essence, 1 Seal | genau +1 Tier (bis T2), ilvl-Gate | nein |
| T1-Vollendung | Rare, T2-Mod, ilvl≥80 | 5 Essence, 3 Seal, 2 Void Ash | T2→T1, Werte neu | nein |
| Werte verfeinern | Rare/Unique | 5 Dust, 1 Shard | Rolls eines Affixes im Tier neu | nein |
| Affix versiegeln | Rare | 3 Seal, 8 Shard | 1 Mod für 1 Neuschmieden geschützt | nein |
| Sockel setzen | Rare/Unique | 1 Socket Core, 4 Dust | +1 Sockel (Unique max 1; mart. 2H max 2; sonst 1) | nein |
| Rune einsetzen / lösen | Sockel frei / belegt | Rune / 3 Dust | Runenbonus / Rune zurück ins Lager | nein |
| Korruptionsritual | Rare/Unique ilvl≥70, nicht korrupt | 1 Corruption Core, 5 Void Ash | 45% Enchant / 30% +1 Tier / 20% negativ / 5% fractured | nein |

Transaktionsregeln: Kosten vorher prüfen, Folgezustand in **einem** persistierten Commit; Craft-Historie (`previousItemHash`, Aktion, Materialien, Seed, neuer Hash, Ergebnis); kein Gratis-Craft durch Reload; Vorschau berechnet exakte Wahrscheinlichkeiten aus Contentdaten.

Runen (§9): eigener Sockel-Effekt, nicht in 3/3; I/II/III (3:1 upgraden); 12 Runentypen; 4 Runen-Kombinationen für 2-Sockel-Zweihänder (nur Tier III, Reihenfolge fix, ergänzen Einzelboni).

## 9. Kampf (§10, Details `EVENT_ORDER.md`)

| Thema | Regel |
|---|---|
| Zeitmodell | 100-ms-Ticks, 10 Ticks = 1 sichtbare Runde/Sekunde |
| Aktionsdauer | Attack `1000/APS` ms; Cast `castTimeMs/(1+castSpeed)`; min 400 ms; bei Start eingefroren |
| GCD | `max(350ms, skillGlobalCooldownMs)` (Zeitpunkt: D-018) |
| Start | beide Seiten t=0; Tie-Break DEX → Spieler → Entity-ID |
| Max-Dauer | normal 90 s, Endgameboss 150 s → Timeout = Niederlage |
| APL | `emergency_heal(HP<35%)` → `defensive_barrier(barrier<15% HP)` → `short_buff_if_missing` → `execute_if_target<25%` → `best_legal_damage_skill` → `default_attack`; optional `wait` ≤ 0.5 s |
| Trigger-Budget | Tiefe 3; ≤8 Effekte/Root-Action; ≤12/Entity/s; ≤1×/`effectId`/Root-Event |
| Minions | ≤4 aktiv/Charakter, eigene Entities, keine Summon-Trigger |
| Status | Blutung, Gift, Brennen, Frost, Verwundbar, Fluch, Stun-Limits (Werte `BALANCE_V1.md`) |
| DoT-Snapshot | Rohwert inkl. Angreifer-Boni bei Anwendung; Zielverteidigung beim Tick |
| Replay | seed + configVersion + Action-Protokoll + Eventhash; Fast-forward ≡ normal (bitidentisch) |

## 10. Gegner und Dungeons (§13)

Profile: Brute (HP 1.25× / DPS 0.85×), Assassin (0.80× / 1.15×), Sentinel (1.10× / 0.90×), Caster, Swarm, Corruptor (Faktoren offen, D-059). Monster-HP/DPS per log-Interpolation zwischen Ankern; Elite HP 2.6×, DPS 1.45×.

| Gebiet | Level | Kämpfe | Boss | Ausbeute |
|---|---|---|---|---|
| Das Verlassene Tor | 1–7 | 3 + Boss | Rostwächter | frühe Waffen |
| Verfallene Krypta | 8–14 | 4 + Boss | Grabherr | Schatten-Affixe |
| Aschental | 15–21 | 4 + Boss | Flammenbestie | Feueressenzen |
| Eisenminen | 22–28 | 4 + Boss | Stahlwurm | Armor, Erz |
| Pestgewölbe | 29–35 | 4 + Boss | Seuchenbrüter | Gift |
| Frostkatakomben | 36–42 | 4 + Boss | Eiskönigin | Frost, Barriere |
| Donnerturm | 43–49 | 4 + Boss | Sturmbote (normal) | Blitz |
| Schattenkammer | 50–55 | 4 + Boss | Leerenhüter | Schatten |
| Verbotene Schmiede | 56–59 | 4 + Boss | Runenwächter | Runenfragmente |
| Abgrundtor | 60+ | 4 + Boss | wechselnd | Endgame-Währung |

Bossmechaniken (§13.2): Aschenkönig, Blutkoloss, Leerenfürstin, Sturmbote, Eiskönigin, Torwächter, Seuchenbrüter, Runenwächter. Telegraphs nur für Vorbereitung/automatische Defensivpriorität, kein Reflex-Dodge.

## 11. Endgame (§14)

| System | Regel |
|---|---|
| Rifts | ab Lv60; Zugang ≤ highestCleared+1; keine Schlüssel/Limits |
| Aufbau | 3 Normal + 1 Elite + 1 Boss; ab T20 4 Normal; ab T40 2 Elite |
| Skalierung | HP `1.10^(t-1)`, DMG `1.045^(t-1)`, Gold `min(3, 1+0.035(t-1))`, Material `min(2.5, 1+0.025(t-1))`, Rare-Gewicht `1+0.004*min(t-1,100)`; Basis = L60-Werte |
| Modifier | T1–9: 1; 10–24: 2; 25–39: 3; ab 40: 4; 12 Modifier; Reward-Bonus ≤ +60% |
| Konstellationen | ab Rift T5; Punkte bei T5/10/…/50, danach alle 10; max 20; Äste Jäger/Schmied/Kartograf × 8 Knoten |
| Pinnacle | Aschenkönig, Sturmbote, Leerenfürstin, Blutkoloss; 4 Fragmente (Riftboss ab T10: 1 garantiert); 4% exklusives Unique/Kill (MF-unabhängig); 2 Boss-Siegel/Sieg |

## 12. Ökonomie (§17)

Gold normal `round(8 + 3*ML^1.2)`; Elite ×2; Boss ×4; Rift × `riftGoldMult`. Stash 4×12, Tab 1 frei, weitere 1k/5k/20k/60k Gold. Inventar 60 Slots, Materialtasche unbegrenzt. `requiredLevel = minBaseLevel + max(0, affixLevelRequirementBonus)`; T1-Affix ≥ Lv60, T0 ≥ Lv80. Save: IndexedDB transaktional, Autosave nach Commands, Export/Import validiert, Migration, 3 Backups, Prüfsumme.

## 13. Builds (§15)

12 Ziel-Builds (2 je Klasse), Vertical Slice: **Blutungs-Wächter** (STR, 2H-Axt, 5 Bleed-Stacks + Bluternte) vs **Block-Wächter** (VIT, Schild + 1H, Block → Barriere). Vergleich über clearTime, survivalProbability, resourceSustain, Material/Zeit — nicht nur DPS.

## 14. Phasen-Roadmap (§20)

| Phase | Inhalt |
|---|---|
| 1 Vertical Slice | Wächter Lv1–15; 4 aktive Skills + 4 passive Knoten; 2 Builds; 6 Slots; ≥8 Basen; ≥15 Affixfamilien; 4 Uniques mit Hooks; Dungeons Tor + Krypta (D-005); Rift-Probe; Prägen/Anreichern/Ergänzen; Inventar, Stash, Vergleich, Stats, Kampfdarstellung, Persistenz, Basisloot; Fixtures + Reports |
| 2 | 11 Slots, voller Waffen-/Rüstungskatalog, bis Lv60, 50+ Affixfamilien, +10 Uniques, Lootfilter, Crafting-Baum, XP-Balance |
| 3 | Arkanist, Schattenläufer, Skill-Modifikatoren, 3 Talentbäume, 12 Builds, Runensockel, Crafting-Vorhersage, Buildlabor, 6+ Dungeons, (Dual-Wield gated, D-033) |
| 4 | Rift 1–50, 4 Pinnacle-Bosse, Boss-Farming, Fragmente, Siegel, Konstellationen, Endgame-Crafting, 20+ Uniques |
| 5 | Nekromant, Runenschmied, Inquisitor, 12 Spezialisierungen, 60+ Skills, 100+ Skillmods, 200+ Nodes, 150+ Uniques, 20 Dungeons, 15 Bosse, QoL, Accessibility |

Erster spielbarer Meilenstein (§22): Neuer Wächter → Dungeon → Auto-Kämpfe → Item mit nachvollziehbaren Affixen → ausrüsten → spürbare Wertänderung → craften → zuvor schwierigen Boss durch Build-Anpassung besiegen → Fortschritt nach Reload vorhanden.
