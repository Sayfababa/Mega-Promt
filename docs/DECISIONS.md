# DECISIONS — Decision Log

Format: **ID · Titel** — Fundstelle | Problem | Entscheidung / Vorschlag | Status.
Status: `entschieden` (vom Lead getroffen oder rein rechnerisch verifiziert) · `offen` (Vorschlag der Doku, Bestätigung durch Lead nötig).
Rechenwerte: `BALANCE_V1.md` (nachgerechnet mit `node -e`).

## Übersicht

| ID | Thema | Status |
|---|---|---|
| D-001 | Toolchain | entschieden |
| D-002 | PRNG + Substreams | entschieden |
| D-003 | Zeitmodell + Rundung | entschieden |
| D-004 | Lichtschlag-Schadensart | entschieden |
| D-005 | Vertical-Slice-Umfang | entschieden |
| D-006 | Balance-Konstanten zentral | entschieden |
| D-007 | Rift-T40 HP vs 150-s-Timeout | offen |
| D-008 | Timeout für Riftbosse | offen |
| D-009 | Rift-Normal/Elite-TTK T20/T40 | offen |
| D-010 | Rift-Basis für Normal/Elite | offen |
| D-011 | Rift-Monsterlevel vs L60-Basis | offen |
| D-012 | Elite-HP-Faktor vs Kampfzeiten | offen |
| D-013 | Story-Boss-TTK Lv35/Lv60 | offen |
| D-014 | Rundung DPS-Anker | offen |
| D-015 | Anker L75–L100 ungenutzt | offen |
| D-016 | Rift-Referenztabelle | entschieden |
| D-017 | Waffen-DPS ±15 % / 2H-Verhältnis | entschieden |
| D-018 | GCD-Zeitpunkt | offen |
| D-019 | Aktionsdauer-Quantisierung | offen |
| D-020 | Fehlende castTimeMs | offen |
| D-021 | Kosten-/Cooldown-Zeitpunkt | offen |
| D-022 | Lichtschlag-Modifikator-Tags | offen |
| D-023 | Bluternte-Stack-Verbrauch | offen |
| D-024 | Blutung bei vollem Stack | offen |
| D-025 | DoT-Tickraster | offen |
| D-026 | DoT-Double-Dipping | offen |
| D-027 | DoT-Snapshot vor Krit | offen |
| D-028 | Lebensraub-Cap | offen |
| D-029 | Blockstärke-Semantik | offen |
| D-030 | Torwächter + Bossnamen | offen |
| D-031 | Begriff „Siegel“ mehrfach belegt | offen |
| D-032 | Namenskollision „Tiefer Schnitt“ | offen |
| D-033 | Dual-Wield-Verschiebung | offen |
| D-034 | Totem als Nebenhand | offen |
| D-035 | Anzahl Start-Basen 20 vs 19 | offen |
| D-036 | Gürtel: Armor + Schmuck-Implizit | offen |
| D-037 | Stoff/Leder-Boni unklar | offen |
| D-038 | Affix-Slotcodes vs Whitelist | offen |
| D-039 | Flat-Paar-Notation, min > max | offen |
| D-040 | Überlappende Tier-Bereiche | offen |
| D-041 | Rare-Affixanzahl ilvl < 20 | offen |
| D-042 | failedUniqueRoll mit 6 Affixen | offen |
| D-043 | Reihenfolge MF/Rift-Rare, pNormal < 0 | offen |
| D-044 | „Blutige Zeit“ wirkungslos | offen |
| D-045 | Unique-Level vs T5/T6-Basen | offen |
| D-046 | Uniques im Vertical Slice | offen |
| D-047 | Kupferner Reißer: Basis | offen |
| D-048 | Talentpunkte vs 4 Knoten; passive Skillslots | offen |
| D-049 | Skill-Level-Erwerb, „Skillpunkt“ | offen |
| D-050 | Rift-Probe im Vertical Slice | offen |
| D-051 | Loop „1–5 Begegnungen“ vs Rifts | offen |
| D-052 | Abgrundtor vs Rift-Aufbau | offen |
| D-053 | XP-Cap 1.5× ohne Referenz | offen |
| D-054 | Essenz-Typisierung | offen |
| D-055 | Pinnacle: Fragmente, Level, Loot | offen |
| D-056 | T0-Erreichbarkeit | offen |
| D-057 | requiredLevel je Affix-Tier | offen |
| D-058 | Rüstungs-Tier-Gates | offen |
| D-059 | Fehlende Monsterdaten | offen |
| D-060 | Gleichzeitiger Tod, Kampfende | offen |
| D-061 | RNG-Verbrauch je Treffer | offen |
| D-062 | Spell-Basiskrit | offen |
| D-063 | INT doppelt skalierend | offen |
| D-064 | Fehlende Event-Typen | offen |
| D-065 | Korruptions-Pools | offen |
| D-066 | Crafting-Affix-Cap bei ilvl < 20 | offen |
| D-067 | Barriere-Dauer vs 8-s-Verfall | offen |
| D-068 | Frost/actionSpeed-Formel | offen |
| D-069 | Armor-Pen und Armor-Debuffs | offen |
| D-070 | Position „damage taken“ | offen |
| D-071 | Regenerations-Takt | offen |
| D-072 | Trigger-Budget „pro Sekunde“ | offen |
| D-073 | Seelenernte/Elementarriss Element | offen |
| D-074 | Monster-Treffergröße | offen |
| D-075 | Spezialisierungspunkte L20/L45 | offen |
| D-076 | Event-/Item-Hash | offen |
| D-077 | „Sinnvolles Waffen-Upgrade“ | offen |
| D-078 | Runenverbund Schutz→Leben | offen |
| D-079 | Rare-Garantie nach Lv10 vs ilvl-Cap | offen |
| D-080 | Elites in Story-Dungeons | offen |

---

## Vom Lead getroffene Entscheidungen

### D-001 · Toolchain
- Fundstelle: §1
- Problem: Spec erlaubt „pnpm oder npm (nur eines)“, Tailwind oder CSS-Variablen.
- Entscheidung: **npm** (nicht pnpm), Vite, React 18, TypeScript strict, Vitest, fast-check, Zod, Zustand, Dexie, Playwright.
- Status: entschieden

### D-002 · PRNG und Substreams
- Fundstelle: §1, §10, §21 („MF ändert nie Tier-Rolls bei gleicher Substream-Strategie“)
- Problem: PRNG und Substream-Strategie nicht spezifiziert.
- Entscheidung: **mulberry32**. Sub-Streams werden aus (Seed, Label) per **xmur3-String-Hash** abgeleitet (`subSeed = xmur3(`${seed}:${label}`)()`), z. B. `loot.quality`, `loot.affix`, `combat.<n>`, damit Magic Find nie Tier-Rolls verschiebt. Labels: `EVENT_ORDER.md §7`.
- Status: entschieden

### D-003 · Zeitmodell und Rundung
- Fundstelle: §3.1 („Rundung nur an dokumentierten Grenzen“), §10
- Problem: Rundungsgrenzen und Zeiteinheit offen.
- Entscheidung: Ganzzahlige Millisekunden, 100-ms-Ticks; Schadenswerte werden erst an der Mitigationsgrenze (finaler Schaden) per `roundHalfUp` auf Ganzzahl gerundet, min 1.
- Status: entschieden

### D-004 · Lichtschlag-Schadensart
- Fundstelle: §11 Tabelle (Inquisitor „Licht … Schattenresistenz als MVP-Proxy“) vs §11 Designhinweis Licht
- Problem: Tabelle nennt Licht als eigene Art mit Schatten-Proxy; Designhinweis verlangt physisch.
- Entscheidung: Zusatzschaden **physisch mit `HOLY`-Tag, Armor-Mitigation** (laut Designhinweis, „verbindlicher als Proxy“). Keine sechste Schadensart vor Contentmigration.
- Status: entschieden

### D-005 · Vertical Slice
- Fundstelle: §20 („1 Dungeon mit 4 regulären Begegnungen + Boss“), §13.1 (Tor 3+Boss, Krypta 4+Boss, Lv8–14), §22 („neuer Wächter betritt eine verfallene Krypta“), §13.1 („für MVP 1 Feind gleichzeitig“)
- Problem: Neuer Lv1-Charakter vs Krypta Lv8–14; VS-Level 1–15.
- Entscheidung: 1 Gegner gleichzeitig pro Begegnung; Klasse Wächter; Dungeons **„Das Verlassene Tor“ (Lv1–7)** und **„Verfallene Krypta“ (Lv8–14)**.
- Status: entschieden

### D-006 · Balance-Änderungsprozess
- Fundstelle: §0, §0.1, §21
- Entscheidung: Balance-Änderungen nur über zentrale Konstanten in `src/content/balance.ts`, protokolliert in `BALANCE_CHANGELOG.md` (alter Wert, neuer Wert, Grund, Simulationsbeleg, neue `balanceVersion`).
- Status: entschieden

---

## Balance-Konflikte

### D-007 · Rift-T40-Boss-HP vs 150-s-Timeout
- Fundstelle: §14.1, §10 (150 s), §18 (T40: 30–50k DPS, Boss p50 55–130 s), Anhang A.3.1
- Problem: Boss-HP T40 = 110 000 × 1.10^39 = **4 525 926**. Bei 30 000 DPS (Korridor-Untergrenze) 150.9 s > Timeout; Mindest-DPS 30 173 (ohne Armor/Res/Heilung/Phasen). Boss-p50 55 s würde 82 289 DPS verlangen (> Korridor). Bei 50 000 DPS 90.5 s. Korridor und Skalierung passen nur im Bereich ≥ ~35k DPS zusammen.
- Vorschlag: Gate unverändert in `reports/balance.html` ausweisen (Pflicht laut A.3.1). Nach Phase-4-Simulation eine der Optionen wählen: (a) `riftHPmult`-Basis 1.0935 (T40 ×32.7 → 90 s bei 40k DPS), (b) 1.09 (T40 ×28.82, 3.17 M HP), (c) Korridor T40 auf 40–60k DPS anheben. Keine Änderung vor Messung.
- Status: offen

### D-008 · Timeout für Riftbosse
- Fundstelle: §10 („normaler Einzelkampf 90 s, Endgameboss 150 s“), §14
- Problem: Unklar, ob Riftboss „Endgameboss“ ist. Mit 90 s wäre T40 erst ab 50 289 DPS schaffbar (≥ Korridor-Obergrenze), T20 ab 7 475.
- Vorschlag: Riftboss und Pinnacle-Boss = 150 s; Normal/Elite in Rifts 90 s.
- Status: offen

### D-009 · Rift-Normal/Elite-TTK T20/T40
- Fundstelle: §13.1a, §14.1, §18
- Problem: Mit L60-Basis × `riftHPmult`: T20 Normal 11.0–18.3 s (Ziel 6–14), Elite 28.6–47.7 s (14–33); T40 Normal 14.8–24.7 s (7–18), Elite 38.5–64.2 s (20–45). Systematisch zu langsam (ohne Armor/Res gerechnet).
- Vorschlag: Getrennte Multiplikatoren `riftHPmultNormal`/`riftHPmultBoss` in `balance.ts` vorsehen (Start: beide = 1.10, damit v1 unverändert); nach Simulation Normal/Elite-Basis senken. §18 erlaubt ausdrücklich, Rift-Zahlen „nicht blind absolut“ anzuwenden.
- Status: offen

### D-010 · Rift-Basis für Normal-/Elite-Gegner
- Fundstelle: §13.1a („In Endgame-Rifts gilt als Basis immer Boss-HP/DPS bei L60“)
- Problem: Satz nennt nur Boss-Werte; wörtlich angewandt hätten Normalgegner 110 000 HP.
- Vorschlag: Normal = L60-Normal-Anker (18 000 HP / 48 DPS), Elite = ×2.6 / ×1.45, Boss = L60-Boss (110 000 / 90), jeweils × Rift-Multiplikator.
- Status: offen

### D-011 · Rift-Monsterlevel vs L60-Basis
- Fundstelle: §5 (`monsterLevel = clamp(60+floor(0.6(t−1)),60,100)`), §13.1a
- Problem: Monsterlevel steigt (T40 = 83), HP/DPS sollen aber von L60 ausgehen (keine Doppelskalierung).
- Vorschlag: Rift-Monsterlevel wirkt nur auf itemLevel, XP, Gold und `attackerLevel` der Armor-Formel; HP/DPS ausschließlich L60-Basis × Rift-Multiplikator.
- Status: offen

### D-012 · Elite-HP-Faktor vs Kampfzeiten
- Fundstelle: §13.1a (Elite 2.6× HP, 1.45× DPS), §18
- Problem: Elite-TTK = 2.6 × Normal-TTK. Ziel-Verhältnisse Elite-p50/Normal-p50 (Mittelpunkte) 2.33 (Lv1), 2.31 (Lv15), 2.57 (Lv35), 2.50 (Lv60), 2.35 (T20), 2.60 (T40). Lv35: Elite 13.2–24.8 s > Ziel 12–24. Zusätzlich 1.45× DPS erhöht das Risiko doppelt; Rift-Mod „Zorn der Elite“ +20% HP.
- Vorschlag: 2.6 für v1 beibehalten, Faktor in `balance.ts` als `ELITE_HP_FACTOR`; nach Simulation ggf. 2.4 (Mittel der Zielverhältnisse 2.44).
- Status: offen

### D-013 · Story-Boss-TTK Lv35 / Lv60
- Fundstelle: §13.1a, §18
- Problem: Lv35 Boss 38 000 HP / 450–850 DPS = 44.7–84.4 s (Ziel 35–70); Lv60 110 000 / 2 000–3 500 = 31.4–55.0 s (Ziel 40–85). Anker und Korridor widersprechen sich in entgegengesetzte Richtungen.
- Vorschlag: Anker nicht vor Phase 2 ändern; Simulation Lv35/Lv60 in Phase 2, dann Boss-Anker anpassen (z. B. L35 ~32 000, L60 ~150 000).
- Status: offen

### D-014 · Rundung der DPS-Anker
- Fundstelle: §13.1a (`V(L) = round(...)` für alle Spalten)
- Problem: Ganzzahlige DPS bei kleinen Leveln erzeugen Stufen (L1/L2 = 4, L3/L4 = 5, Boss L1/L2 = 5); L8 roh 7.21 → 7.
- Vorschlag: HP per Formel runden; DPS-Werte auf 2 Nachkommastellen behalten (Monster-Treffer werden ohnehin erst am Ende gerundet, D-003).
- Status: offen

### D-015 · Anker L75–L100 ungenutzt
- Fundstelle: §2 (Kampagne 1–59), §13.1a (Rifts immer L60-Basis)
- Problem: Anker L75/90/100 haben keinen Anwendungsfall (außer evtl. „Abgrundtor 60+“).
- Vorschlag: Anker behalten (für Testpuppe/Buildlabor-Profile), im Code als „unused in v1“ markieren.
- Status: offen

### D-016 · Rift-Referenztabelle nachgerechnet
- Fundstelle: §14.1
- Ergebnis: HP T1/10/20/30/40/50 = 1.0000 / 2.3579 / 6.1159 / 15.8631 / 41.1448 / 106.7190; DMG = 1.0000 / 1.4861 / 2.3079 / 3.5840 / 5.5659 / 8.6437. Gerundet auf 2 Stellen identisch mit Spec. **Keine Abweichung.** Tabelle wird trotzdem im Report aus Code erzeugt.
- Status: entschieden

### D-017 · Waffen-DPS-Regeln
- Fundstelle: §4 Balanceregel, §22 („Startwaffen-DPS vs ±15 %“), Anhang A.1
- Ergebnis: 1H (inkl. Runenklinge) Median 18.000, Spanne −10.56 % … +10.00 %; ohne Runenklinge −10.52 % … +8.87 %; 2H inkl. Bogen/Armbrust Median 25.910, −2.74 % … +1.27 %. Verhältnis 2H/1H 1.4394 (Median) / 1.4434 (Mittel). Nach Tier-Skalierung T1–T6 (roundHalfUp) max. −11.40 % (1H) bzw. −2.94 % (2H), Verhältnis 1.4288–1.4411. Mit Basiskrit ebenfalls erfüllt. **Kein Verstoß**, keine Korrektur. Runenklinge wird in der 1H-martialischen Prüfung mitgezählt (wie A.1), zusätzlich Spell-Fixture.
- Status: entschieden

---

## Kampf-Engine

### D-018 · GCD-Zeitpunkt
- Fundstelle: §10 („Globale Cooldowns nach Action-Ende max(350 ms, …)“), Anhang A.1 (DPS = mean × APS)
- Problem: GCD nach Action-Ende addiert 350 ms zu jedem Angriff (Kurzschwert 833 → 1 183 ms, −30 % DPS) und widerspricht den neutralen DPS-Rechnungen; APS-Unterschiede werden verzerrt.
- Vorschlag: GCD zählt ab `ACTION_BEGIN`; nächste Aktion frühestens `max(actionEnd, begin + GCD)`. Wirkt damit nur bei Aktionen < GCD (Instant-Buffs mit `skillGlobalCooldownMs` > Dauer).
- Status: offen

### D-019 · Quantisierung der Aktionsdauer
- Fundstelle: §10 (100-ms-Scheduler, `1000/APS`)
- Problem: Auf 100 ms gerundete Dauern machen APS-Unterschiede unsichtbar (Dolch 645 ms und Krallen 704 ms → beide 700 ms).
- Vorschlag: Fälligkeiten in exakten ms akkumulieren (`nextBegin = dueAt`), Auflösung im ersten Tick mit `t ≥ dueAt`; Reihenfolge bei gleichem Tick nach exaktem `dueAt`. Langzeit-APS exakt, Jitter < 100 ms.
- Status: offen

### D-020 · Fehlende castTimeMs
- Fundstelle: §11 (jede Fähigkeit braucht `castTimeMs`), Skilltabelle (keine Werte)
- Problem: Keine Cast-Zeiten für Spells/Buffs; unklar ob Attack-Skills Waffen-Intervall nutzen.
- Vorschlag: Attack-Skills: `1000/APS`. Spells: 1 000 ms Basis. Buff/Barriere/Heilung: 500 ms (Minimum 400 ms greift). Als Konstanten in `balance.ts`.
- Status: offen

### D-021 · Kosten- und Cooldown-Zeitpunkt
- Fundstelle: §10
- Problem: Nicht definiert, wann Mana abgezogen und CD gestartet wird; Verhalten bei Unterbrechung (Stun).
- Vorschlag: Beides bei `ACTION_BEGIN`; Unterbrechung verwirft Aktion ohne Erstattung (Stun-Quellen erst ab Phase 3).
- Status: offen

### D-022 · Lichtschlag: Modifikator-Tags
- Fundstelle: §11 (Attack 1.10× + Spell 15 + 0.25×INT), D-004
- Problem: Welche `increased` gelten für den Spell-Anteil (Spell und/oder Physisch)? Welches Timing (APS oder Cast)?
- Vorschlag: Aktionsdauer = Attack-Intervall; Waffenanteil: Attack-/Physisch-Mods; Spell-Anteil: Tags `SPELL, HOLY`, Schadensart physisch, nur Spell-/generische `increased` (kein globales Physisch, keine Doppelanrechnung), eigener Krit-Wurf entfällt (ein Krit-Wurf je Treffer gilt für beide Pakete).
- Status: offen (Phase 5)

### D-023 · Bluternte-Stack-Verbrauch
- Fundstelle: §11 (Bluternte), §10.1 (Blutung)
- Problem: Zählzeitpunkt, Verbleib des Restschadens, ob Bluternte selbst Blutung anwendet, ob fremde Stacks zählen.
- Vorschlag: Zählt nur **eigene** aktive Stacks am Ziel bei Auflösung vor Schadensberechnung (max 5 → 1.65 + 1.40 = 3.05×); entfernt sie danach sofort, Restschaden verfällt; Bluternte hat keine `BLEED`-Anwendung. Ausgewichen → Stacks bleiben erhalten.
- Status: offen

### D-024 · Blutung bei vollem Stack
- Fundstelle: §10.1 („ältester ablaufend“)
- Problem: Verhalten des 6. Stacks unklar.
- Vorschlag: Neuer Stack ersetzt den ältesten (`STATUS_EXPIRE{reason:replaced}`). Gleiches für Gift/Brennen.
- Status: offen

### D-025 · DoT-Tickraster
- Fundstelle: §10 („DoT-Tick bei Sekunden-Grenzen“), §10.1 („22 % … verteilt auf 5 Sekunden“)
- Problem: Prozentwert gesamt oder pro Sekunde? Ticks global oder relativ zur Anwendung?
- Vorschlag: Prozentwert = **Gesamtwert** je Stack. Ticks an globalen Sekundengrenzen; Stack mit Dauer D hat genau D Ticks (erster an der nächsten Sekundengrenze nach Anwendung), Tick = Snapshot/D. Blutung 4.4 %/Tick ×5, Gift 5 % ×6, Brennen 9 % ×4.
- Status: offen

### D-026 · DoT-Double-Dipping
- Fundstelle: §10.1 (Snapshot), Anhang A.3.4
- Problem: Wenn Snapshot vom bereits erhöhten Trefferschaden genommen wird und DoT-Boni (Blutungsschaden %, DoT-Wirkung %) separat wirken, entsteht Unklarheit, ob `increased physical` zweimal greift.
- Vorschlag: Snapshot = Treffer-Basis (nach Flat, **vor** `increased`/`more`) × Anteil × `(1 + Σincreased mit DoT-relevanten Tags: Schadensart, BLEED/POISON/BURN, DOT, generisch)` × `Π more(DoT-geeignet)`. Treffer-`increased` und DoT-`increased` werden in **einer** Summe zusammengeführt, nie multiplikativ gestapelt. Beim Tick keine Angreifer-Mods mehr.
- Status: offen

### D-027 · DoT-Snapshot vor Krit
- Fundstelle: §3.2 („Krit nur direkter Schaden“), §10.1 („roher Treffer-Schaden“)
- Vorschlag: Krit erhöht den Snapshot nicht (außer Skill/Unique deklariert DoT-Crit).
- Status: offen

### D-028 · Lebensraub-Cap
- Fundstelle: §3.1 (Lebensraub [0, 0.08] „des tatsächlich zugefügten direkten Schadens“, max 15 % MaxHP/s), §6 s19 („direkter Attack-Damage“), §11 Seelenernte („zusätzlich zum Leech-Cap gerechnet“)
- Problem: (1) Gilt Leech für Spells? (2) 15 %/s: gleitend oder Sekunden-Bucket? (3) Seelenernte innerhalb oder außerhalb des Caps? „zusätzlich zum Leech-Cap gerechnet“ ist doppeldeutig. (4) Overkill zählt?
- Vorschlag: (1) s19-Leech nur ATTACK-Treffer. (2) Bucket `floor(t/1000)`, max 15 % maxHP Leech-Heilung je Bucket. (3) Seelenernte-Heilung ist eigene `HEAL`, zählt **nicht** gegen die 8 %-Rate, aber **gegen** das 15 %/s-Fenster. (4) Basis = an Barriere+HP zugefügter Schaden ohne Overkill.
- Status: offen

### D-029 · Blockstärke-Semantik
- Fundstelle: §3.3 (55 %), §4.1 (Schild +15 % → 70 %, max 75 %), §4 (Langschwert +10 % Blockstärke mit Schild)
- Problem: „+15 %“ additiv in Prozentpunkten (55 → 70) laut Klammer; Langschwert + Schild → 80 % > Cap.
- Vorschlag: Blockstärke-Boni additiv in pp, Cap 0.75 (Langschwert+Schild = 75 %). Torwächter siehe D-030.
- Status: offen

### D-030 · Torwächter-Blockeffizienz und Bossnamen
- Fundstelle: §13.2 Torwächter („blockiert 25 % der Attackhits (schwächere 55 % Blockeffizienz)“), §12 Quelle „Wächter der Tore“, §13.1 Boss „Rostwächter“ (Verlassenes Tor), Sturmbote (Donnerturm-Boss **und** Pinnacle), Leerenhüter (Schattenkammer) vs Leerenfürstin (Pinnacle), Unique-Quellen Seuchengrab/Nekropolis/Runenaltar ohne Dungeon-/Boss-Eintrag.
- Problem: „schwächere 55 %“ ist identisch mit Standard; Namen inkonsistent.
- Vorschlag: Torwächter = „Wächter der Tore“ (ein Boss, ID `boss_gatewarden`), Blockstärke 0.55 (Standard), Blockchance 0.25 nur gegen ATTACK. Rostwächter (Lv7) ist ein anderer Boss. Sturmbote: zwei IDs (`boss_stormherald_dungeon`, `pinnacle_stormherald`). Fehlende Quellen (Seuchengrab, Nekropolis, Runenaltar) als Endgame-Bosse in Phase 4 definieren.
- Status: offen

### D-031 · Begriff „Siegel“ mehrfach belegt
- Fundstelle: §7/§14.4 Boss-Siegel (BOSS_SIGIL), §8 `SEAL_STONE` („Seal“ in Kosten), §8.1 „Affix versiegeln“ + „Siegelwirkung“, §11.2 „Support-Siegel“, §9 „Siegelkombinationen“ (Runen), §11 Skills „Siegelhieb“/„Eisensiegel“, §13.2 Eiskönigin „unterbrechbar durch spezielles Siegel“ (undefiniert; keine Unterbrechungsmechanik existiert).
- Problem: Sechs Bedeutungen; UI/Tooltips/IDs verwechselbar.
- Vorschlag (interne IDs eindeutig, UI-Begriffe):
  | Bedeutung | ID | UI-Begriff |
  |---|---|---|
  | Boss-Währung | `BOSS_SIGIL` | „Boss-Siegel“ |
  | Craft-Material | `SEAL_STONE` | „Siegelstein“ |
  | Affix-Schutz | `affix.sealed` / Rezept `sealAffix` | „Affix versiegeln“ / Status „versiegelt“ |
  | Skill-Modifikator | `SupportDef` | „Support“ (statt „Support-Siegel“) |
  | Runen-Kombination | `RuneComboDef` | „Runenverbund“ |
  | Skillnamen | Siegelhieb, Eisensiegel | unverändert |
  | Eiskönigin-Konter | — | durch „Skill mit `INTERRUPT`-Tag“ ersetzen oder streichen (Phase 2) |
- Status: offen

### D-032 · Namenskollision „Tiefer Schnitt“
- Fundstelle: §11 (Schattenläufer-Skill), §11.2 (Support +1 s Bleed-Dauer)
- Vorschlag: Support umbenennen in „Klaffende Wunde“ (ID `support_lingering_wound`).
- Status: offen

### D-033 · Dual-Wield-Verschiebung
- Fundstelle: §2.1 („Dual-Wield erst in Phase 3 vollständig“), §4.1 („spätere Phase … nicht implementieren, bevor Formel getestet“), §20 Phase 3 (Dual-Wield nicht genannt), §15 Krit-Schatten (Krallen)
- Problem: Zeitpunkt widersprüchlich/unvollständig.
- Vorschlag: Nicht vor Phase 3; eigenes Ticket mit Formeltest (alternierend, +8 % APS global, −10 % Basisschaden) vor Freischaltung. Bis dahin Nebenhand nur Schild (VS) bzw. Schild/Fokus/Totem; keine Dual-Wield-Schaltfläche.
- Status: offen

### D-034 · Totem als Nebenhand
- Fundstelle: §2.1 (offhand: Schild, Fokus, zweite 1H), §4.1 (Totem), §6 (`O` = Schild/Fokus)
- Vorschlag: Totem ist Nebenhand-Typ; Affix-Klasse `O` gilt für Schild/Fokus/Totem; Phase 2.
- Status: offen

### D-035 · Anzahl Start-Basen
- Fundstelle: §2.1 („20 Start-Item-Basen (unten) plus 11 Rüstungs-/Schmuck-Basisfamilien“)
- Problem: Tabelle hat 16 Waffen + 3 Nebenhände = 19. Die 11 Familien ergeben sich als 5 Rüstungsplätze + 4 Ringe + Amulett + Relikt.
- Vorschlag: 19 als korrekt dokumentieren; keine Basis erfinden.
- Status: offen

### D-036 · Gürtel
- Fundstelle: §4.2 (Gürtel Armor 8 **und** in Schmuck-Implizit +5 % Leben), Materialboni nennen Gürtel nicht
- Vorschlag: Gürtel hat Armor 8 (Materialanteil gilt), implizit +5 % maxHP; Leder-Ausweichen +2 % gilt auch für Gürtel; Stoff-Bonus nicht.
- Status: offen

### D-037 · Stoff-/Leder-Boni
- Fundstelle: §4.2 („Stoff (25 % Armor + Mana oder Barriere: Brust +6 % maxMana; Helm +4 % …)“; Leder „+4 % Evasion“)
- Problem: Mana oder Barriere? Prozent oder Prozentpunkte?
- Vorschlag: Stoff = `increased_mana` (+6/4/3/3 %); Barriere-Variante später als eigene Basis. Leder-Ausweichen in Prozentpunkten.
- Status: offen

### D-038 · Affix-Slotcodes vs Whitelist
- Fundstelle: §6 Tabelle (s01/s02 Attribute, s10 Krit-Multi, s19 Lebensraub, s23/s24 auf `M`) vs §6 Whitelist („Waffe: nur … Grundschaden, Attack-Speed, Crit und passende DoT/Spezialfamilien“); Runenklinge in `C` und als Hybrid-Attack in A.1.
- Vorschlag: Die Tabelle (explizite Slotcodes) ist maßgeblich, Whitelist ist Leitlinie. Runenklinge: Klassen `['M','C']` mit `casterEligible: true`; jede Familie zählt nur einmal.
- Status: offen

### D-039 · Flat-Paar-Notation, min > max
- Fundstelle: §6 p02–p05 („+7–12 bis +12–20“), §6 („Min und Max separat gewürfelt mit minDamage ≤ maxDamage“)
- Problem: Notation interpretiert als Min ∈ [A, C], Max ∈ [B, D]. Bei p03/p04 (T3: Min 6–11, Max 10–18) kann Min > Max werden.
- Vorschlag: Erst Min würfeln, dann Max ∈ [max(B, Min), D].
- Status: offen

### D-040 · Überlappende Tier-Bereiche
- Fundstelle: §6 Wertekonvention
- Problem: Benachbarte Tiers überlappen (p01 T4 51.1–73, T3 70–100).
- Vorschlag: Zulässig lassen (Tier bestimmt ilvl/Crafting, nicht strikte Wertordnung); Tooltip zeigt Tier + Range.
- Status: offen

### D-041 · Rare-Affixanzahl bei ilvl < 20
- Fundstelle: §5 (3/4/5/6 = 20/40/30/10 %; „bei ilvl < 20 maximal 4“)
- Problem: Kappen (5/6 → 4: 20/80 %) oder renormieren (33.3/66.7 %)?
- Vorschlag: Renormieren auf erlaubte Anzahlen (3: 33.33 %, 4: 66.67 %) — konsistent mit Tier-Renormierung.
- Status: offen

### D-042 · failedUniqueRoll mit 6 Affixen
- Fundstelle: §7 (Rare mit 6 Affixen), §5 (ilvl < 20 max 4), Slot-Pools ggf. < 3 Familien pro Seite
- Vorschlag: Anzahl = min(6, ilvl-Cap, verfügbare Familien pro Seite); Historie vermerkt tatsächliche Anzahl.
- Status: offen

### D-043 · Reihenfolge MF / Rift-Rare / Modifier; pNormal < 0
- Fundstelle: §7 MF, §14.1 `riftRareWeightMult`, §14.2 „Unruhige Magie +8 % Rare relativ“, „Zorn der Elite +10 % Unique relativ“
- Problem: Reihenfolge undefiniert. Riftboss mit `riftRareWeightMult` 1.4 × 1.08 und hohem MF: Summe Magic+Rare+Unique bis 111 % → Normal < 0 erreichbar (Normierungszweig).
- Vorschlag: Basistabelle → Rift-Rare-Mult × Modifier-Mults (auf pRare/pUnique) → MF-Faktoren → pNormal = Rest → bei < 0 die drei höheren proportional auf 1 normieren. Test für den Normierungsfall.
- Status: offen

### D-044 · „Blutige Zeit“ wirkungslos
- Fundstelle: §14.2 („+10 % Chance auf +1 Boss-Siegel, cap 2 Boss-Siegel insgesamt pro Sieg“), §7/§14.4 (2 garantiert)
- Problem: 2 garantiert + Cap 2 ⇒ Bonus nie wirksam.
- Vorschlag: Cap auf 3 je Sieg anheben **oder** Bonus durch „+10 % Rune-Fragment-Chance“ ersetzen. Bis Entscheidung: Modifier deaktiviert (nicht im Pool).
- Status: offen

### D-045 · Unique-Mindestlevel vs T5/T6-Basen
- Fundstelle: §12 („Werte sind für T5/T6-Basen auf Endgame-Niveau“) vs Klinge des Verzichts ilvl45+, Gesplitterter Fokus ilvl50+, Arkaner Hunger ilvl55+ (T5 ab Lv60)
- Vorschlag: Diese drei Uniques auf T4-Basis (ab Lv40) mit skalierten Werten oder minItemLevel 60. Entscheidung Phase 2.
- Status: offen

### D-046 · Uniques im Vertical Slice
- Fundstelle: §12 („MVP implementiert vier der obenstehenden Uniques plus zwei niedrigstufige“; ≥4 mechanisch unterschiedliche mit Triggern), §20 (VS Lv1–15, „4 Uniques mit tatsächlichen Hooks“)
- Problem: Katalog-Uniques sind Endgame (T5/T6); die zwei niedrigstufigen (Kupferner Reißer, Ausgefranster Mantel) sind reine Stat-Items ohne Hooks.
- Vorschlag: VS = 4 Wächter-relevante Katalog-Uniques mit Hooks als **Low-Level-Varianten** (gleiche Mechanik, eigene niedrige Werte, eigener Eintrag in Low-Level-Tabelle wie §12 erlaubt): Blutdurst (2H-Schwert, Krit → Bleed), Ungebrochene Mauer (Schild, Block → Barriere, CD 2 s), Stahl der Erinnerung (Langschwert, Block → nächster Hit +X %), Scharlachkette (Amulett, Finisher ab 3 Stacks MORE) + Kupferner Reißer + Ausgefranster Mantel. Zahlen in `balance.ts`, simuliert vor Freigabe.
- Status: offen

### D-047 · Kupferner Reißer: Basis
- Fundstelle: §12 („Schwert ilvl8“)
- Vorschlag: Kurzschwert-Basis T1.
- Status: offen

### D-048 · Talentpunkte vs 4 Knoten; passive Skillslots
- Fundstelle: §2 (1 Talentpunkt je Level → 14 bis Lv15), §20 („4 passive Knoten“), §11 („2 passive Skillslots“, keine passiven Skills definiert), §11.1 (Wächter-Key-Nodes)
- Problem: 14 Punkte, aber nur 4 Knoten; passive Skillslots ohne Inhalt.
- Vorschlag: VS-Talentbaum mit Start + 4 Knoten, davon 2 kleine Knoten mit `maxRank` 5 (je +2 %) und 2 Key-Nodes (Blutgericht, Eisenherz); überschüssige Punkte bleiben gespeichert. Passive Skillslots im VS ausgeblendet (keine Fake-UI).
- Status: offen

### D-049 · Skill-Level-Erwerb und Begriff „Skillpunkt“
- Fundstelle: §2 („Ein einzelner Skillpunkt kann … rückerstattet werden“, „Talentpunkt“), §11 (Skill-Level 1–5, Lv-Anforderungen)
- Problem: Wie Skill-Level steigen ist nicht definiert; „Skillpunkt“ meint vermutlich Talentpunkt.
- Vorschlag: „Skillpunkt“ in §2 = Talentpunkt. Skill-Level steigen automatisch, wenn Charakterlevel 10/25/45/65 erreicht ist (keine separate Punktewährung); s26 addiert darauf (max +2).
- Status: offen

### D-050 · Rift-Probe im Vertical Slice
- Fundstelle: §20 („1 kleine Rift-Probe“), §14 (Rifts ab Lv60)
- Vorschlag: Rift-Probe als Debug/Balance-Modus (`npm run balance` + Debugpanel): Lv15-Anker × `riftHPmult/riftDMGmult` T1–T5 inkl. 1 Modifier; nicht als Spielerfeature freigeschaltet.
- Status: offen

### D-051 · Loop „1–5 Begegnungen“ vs Rifts
- Fundstelle: §2 Loop, §14 (T20: 6, T40: 7, + Höllenpforte 8 Begegnungen)
- Vorschlag: „1–5“ gilt für Story-Dungeons; Rifts dürfen bis 8.
- Status: offen

### D-052 · Abgrundtor vs Rift-Aufbau
- Fundstelle: §13.1 (Abgrundtor 60+, „4 + Boss“), §14 (3N + 1E + 1B)
- Vorschlag: Abgrundtor ist der UI-Einstieg in Rifts; Aufbau nach §14.
- Status: offen

### D-053 · XP-Cap „höchstens 1.5×“
- Fundstelle: §2 („Bei Gegnern > 5 Level über Charakter höchstens 1.5× XP“)
- Problem: Referenzgröße fehlt.
- Vorschlag: `xp = min(xp(monsterLevel), 1.5 × xp(playerLevel))` für `monsterLevel − playerLevel > 5`.
- Status: offen

### D-054 · Essenz-Typisierung
- Fundstelle: §8 (ESSENCE-Drops untypisiert; 6 Essenz-Typen; „bei Herstellung an Typ gebunden oder 3:1 konvertiert“; Aschental „Feueressenzen“)
- Vorschlag: Drops erzeugen typisierte Essenzen (Zonen-Gewichtung, Standard gleichverteilt); „Selten erheben“/„Ergänzen“ akzeptieren beliebigen Typ; „Präzise Essenz“ verlangt 3 des Zieltyps; Alchemie 3 beliebige → 1 gewählte.
- Status: offen

### D-055 · Pinnacle: Fragmente, Level, Loot
- Fundstelle: §14.4 („Fragment aus passenden Rifts“), §7 Tabellen (kein Pinnacle-Eintrag), Level der Pinnacle-Bosse fehlt
- Vorschlag: Riftboss droppt Fragment eines zufälligen (gleichverteilt) Pinnacle-Bosses, bzw. des Bosses, dessen Thema der Rift-Modifier trägt; Pinnacle-Level = Rift-ML des höchsten freigeschalteten Tiers, min 80; Loot-Tabelle = Riftboss + 4 % Exklusiv. Phase 4.
- Status: offen

### D-056 · T0-Erreichbarkeit
- Fundstelle: §5 (T0 ilvl ≥ 94), §7 („Nur Boss-Runen/Endgamebosse ab lvl60 können T0 erzeugen“), §14.1 („Tiers > 50 Prestige, nicht Pflicht für wichtigste Items“)
- Problem: Boss-ilvl = ML + 2 ≥ 94 ⇒ Rift-ML ≥ 92 ⇒ erst ab **Rift T55**; „Boss-Runen“ undefiniert.
- Vorschlag: T0 als Prestige-Inhalt akzeptieren (nicht „wichtigstes Item“) oder Pinnacle-ilvl fix 94. Phase 4.
- Status: offen

### D-057 · requiredLevel je Affix-Tier
- Fundstelle: §17 (`affixLevelRequirementBonus` undefiniert; T1 ≥ Lv60, T0 ≥ Lv80)
- Vorschlag: requiredLevel = max(minBaseLevel, höchste Tier-Anforderung): T5 1, T4 15, T3 30, T2 45, T1 60, T0 80.
- Status: offen

### D-058 · Rüstungs-Tier-Gates
- Fundstelle: §4.2 (Multiplikatoren 1/1.8/3.2/5.5/9.0/13.5 ohne Level), §4 (Waffen 1/12/25/40/60/80)
- Vorschlag: Gleiche Level-Gates wie Waffen.
- Status: offen

### D-059 · Fehlende Monsterdaten
- Fundstelle: §13 (Felder `armor, resist, attackSpeed, AIpriority`), §13.1a (nur Brute/Assassin/Sentinel-Faktoren, `bossArchetypeFactor` undefiniert), §10 (Initiative „DEX“ – Monster haben kein DEX), Bossmechaniken Rostwächter/Grabherr fehlen
- Vorschlag: Monster-Armor-Anker `armor = round(k × (450 + 25·L))` mit k je Profil (Standard 0.10 ≈ 9 % Reduktion, Sentinel 0.33 ≈ 25 %); Resistenzen Standard 0, Profil-/Boss-spezifisch; Caster/Swarm/Corruptor Faktoren 0.90/1.05, 0.60/0.80 (je Monster), 1.00/0.95; `bossArchetypeFactor` = 1.0 Standard; Monster-Krit 5 %, Multi 1.5; `initiative = 10 + ML` (Assassin +10). VS-Bosse: Rostwächter (Sentinel, alle 8 s schwerer Hieb = Teil des DPS-Budgets), Grabherr (Corruptor, Fluch −12 pp Schattenres + Gift). Alle Werte in `balance.ts`, Simulation in E11.
- Status: offen

### D-060 · Gleichzeitiger Tod und Kampfende
- Fundstelle: §10 („prüfe Todesfälle“, „kein endloses Unentschieden“, „Alle Tie-Breaks explizit“)
- Vorschlag: Todesprüfung nach jedem Schadensereignis; Kampf endet sofort, sobald eine Seite vollständig tot ist (Verarbeitungsreihenfolge entscheidet). Timeout-Prüfung nach Phase 6; Kill bei `t = maxMs` gilt. Start-Effekte bei t = 0 lösen keine Trigger aus.
- Status: offen

### D-061 · RNG-Verbrauch je Treffer
- Fundstelle: §10, §19 (`compareLoadouts` mit gleichen Seeds)
- Problem: Bedingter RNG-Verbrauch (nur wenn Chance > 0) desynchronisiert gepaarte Vergleiche.
- Vorschlag: Je Treffer immer `rEvade, rCrit, rBlock`; je deklariertem Status 1 Ziehung; Trigger-Chancen erst nach bestandener Budgetprüfung.
- Status: offen

### D-062 · Spell-Basiskrit
- Fundstelle: §3.3 (Critchance = Waffenbasis + …), §10 („Melee- und Spell-Crit getrennt“)
- Vorschlag: Spell-Basiskrit 5 % (= Cap-Untergrenze); Waffenbasiskrit nur für Attacks.
- Status: offen

### D-063 · INT skaliert Spells doppelt
- Fundstelle: §3.1 (`spellIncreasedFromINT`), §3.3 (`rawSpell = flat + INT × coef …`)
- Problem: INT wirkt als Flat-Koeffizient **und** als increased → quadratisch; STR wirkt nur als increased.
- Vorschlag: Beibehalten (Spec explizit), aber in Phase 3 per Spell-Fixtures prüfen (Gefahr „exponentielle Gratis-Synergie“, §0.1).
- Status: offen

### D-064 · Fehlende Event-Typen
- Fundstelle: §10 (Eventliste ohne `TRIGGER_SUPPRESSED`, das im selben Abschnitt gefordert wird; Barriere-Bruch als Trigger in §12/§13.2)
- Vorschlag: Ergänzen `TRIGGER_SUPPRESSED`, `BARRIER_GAIN`, `BARRIER_BREAK`, optional `RESOURCE`.
- Status: offen

### D-065 · Korruptions-Pools
- Fundstelle: §8.3 (Enchant-Pool „+5–10 % Spezialwerte“ undefiniert; Fallback, wenn kein Affix aufwertbar; Unique „+5 %“ relativ/absolut)
- Vorschlag: Phase 4 definieren; Fallback: kein aufwertbarer Affix → Enchant-Ergebnis; Unique +5 % relativ auf Rollwert, über Range hinaus erlaubt.
- Status: offen

### D-066 · Crafting-Affix-Cap bei ilvl < 20
- Fundstelle: §5 (ilvl < 20 max 4 gilt für Drops), §8.1 Ergänzen
- Vorschlag: Cap gilt nur für Drops; Crafting bis 3P+3S unabhängig vom ilvl (Tier-Gates gelten weiterhin).
- Status: offen

### D-067 · Barriere-Dauer vs 8-s-Verfall
- Fundstelle: §3.3 (Verfall 8 s ohne Gewinn), §11 Arkanbarriere („5 s Dauer“)
- Vorschlag: Ein Barriere-Pool; jeder Gewinn setzt `expiresAt = max(expiresAt, t + (skillDuration ?? 8000))`, mit `skillDuration ≤ 8000`. Ablauf entfernt die gesamte Restbarriere.
- Status: offen

### D-068 · Frost/actionSpeed-Formel
- Fundstelle: §10.1 (−15 % actionSpeed), §11.2 Eisgefängnis (20 %)
- Vorschlag: `duration / (1 + ΣactionSpeedMods)`; Frost −0.15 → ×1.176. Gilt für Attacks und Casts.
- Status: offen

### D-069 · Armor-Penetration und Armor-Debuffs
- Fundstelle: §4 Streitkolben (+12 % Armor-Pen), §11 Rüstungsbruch (−25 %), Kampfrausch (−12 %), Eiserne Garde (+35 %)
- Vorschlag: `A_eff = armor × (1 + ΣarmorIncreased − ΣarmorReduced) × (1 − armorPen)`, min 0.
- Status: offen

### D-070 · Position von „damage taken“
- Fundstelle: §3.2-Kette nennt Verwundbar/Blutgericht/Mantel der Asche nicht
- Vorschlag: Nach Armor/Res, vor Block (siehe `EVENT_ORDER.md §3` Schritt 8); Angreifer-Schwächung (Bannfluch −12 %) als `increased`-Malus auf Angreiferseite.
- Status: offen

### D-071 · Regenerations-Takt
- Fundstelle: §3.1 (Regen pro Sekunde)
- Vorschlag: HP/Mana-Regen an Sekundengrenzen nach DoT-Ticks und Todesprüfung; Bruchteile als Float-Akku, angezeigte Werte gerundet.
- Status: offen

### D-072 · Trigger-Budget „pro Sekunde“
- Fundstelle: §10 („12 Effekte pro Entity und Sekunde“)
- Vorschlag: Bucket `floor(t/1000)` statt gleitendem Fenster (deterministisch, einfach testbar).
- Status: offen

### D-073 · Elemente Seelenernte / Elementarriss
- Fundstelle: §11 (Seelenernte ohne Element; Elementarriss „Element des zuletzt aktiven Elementskills“ ohne Default)
- Vorschlag: Seelenernte Schatten; Elementarriss Default Feuer. Phase 3/5.
- Status: offen

### D-074 · Monster-Treffergröße
- Fundstelle: §13.1a (DPS-Anker), §13 (`attack`, `attackSpeed`)
- Vorschlag: `hitDamage = rawDps / attacksPerSecond` (vor Spieler-Mitigation); Bossskills/Telegraphs aus demselben Budget.
- Status: offen

### D-075 · Spezialisierungspunkte L20/L45
- Fundstelle: §2
- Problem: Verwendung undefiniert (Ascendancy erst Phase 5).
- Vorschlag: Punkte gutschreiben und speichern; Verwendung ab Phase 3/5; UI zeigt sie erst dann.
- Status: offen

### D-076 · Event- und Item-Hash
- Fundstelle: §10 (Eventhash), §8.1 (Item-Hash), §17 (Prüfsumme)
- Vorschlag: Synchrone reine TS-Hashfunktion `cyrb53` (53 bit, hex) über kanonisches JSON (sortierte Schlüssel); keine Krypto-Sicherheit behauptet.
- Status: offen

### D-077 · „Sinnvolles magisches Waffen-Upgrade“
- Fundstelle: §7 Frustschutz
- Vorschlag: Magische Waffe der aktuellen Handkategorie mit neutralem DPS ≥ 110 % der ausgerüsteten Waffe (Fallback: höchstes erlaubtes Basis-Tier + p01/p02).
- Status: offen

### D-078 · Runenverbund Schutz→Leben
- Fundstelle: §9 („+5 % maxHP, −5 % global verursachter Schaden“)
- Vorschlag: −5 % als `more`-Malus (stackingGroup `rune_combo`), +5 % maxHP als increased. Phase 3.
- Status: offen

### D-079 · Rare-Garantie nach Lv10
- Fundstelle: §7 („Rare mit ≥ 4 Mods“), §5 (ilvl < 20 max 4)
- Hinweis: Kein Widerspruch, aber im VS (ilvl ≤ 16) ist die Garantie genau 4 Mods.
- Vorschlag: Garantie erzeugt Rare mit exakt 4 Mods bei ilvl < 20.
- Status: offen

### D-080 · Elites in Story-Dungeons
- Fundstelle: §13.1 (Kampfanzahl „3 + 1 Boss“ / „4 + Boss“ ohne Elite), §7/§8 (Elite-Tabellen, Essenz 40 % nur von Elite/Boss)
- Problem: Ohne Elite gibt es im VS nur 1 Essenz/Run (Boss) — „Ergänzen“ kostet 1 Essenz.
- Vorschlag: Letzte reguläre Begegnung jedes Dungeons ist Elite (Tor: 2N+1E+B; Krypta: 3N+1E+B).
- Status: offen

---

## Implementierungsstand (Lead, nach Engine-Iteration 1)

Die folgenden Einträge sind jetzt **entschieden und im Code umgesetzt**. Wo die Umsetzung vom obigen Vorschlag abweicht, ist das ausdrücklich vermerkt. Code-Kommentare verweisen auf diese IDs.

| ID | Entscheidung (umgesetzt) | Ort |
|---|---|---|
| D-018 | GCD als Mindestabstand zwischen Aktions-**Beginnen**: `next = max(actionEnd, begin + max(350, gcd))`. Umschaltbar über `B.gcdFrom = 'actionEnd'` (wörtliche Lesart) für Vergleichsläufe. | `combat/simulate.ts`, `balance.ts` |
| D-019 | Aktionsdauern in exakten ms; Auflösung im ersten Tick `t ≥ end`; nächste Aktion startet zur exakten Fälligkeit. Erster Ansatz (Aufrunden auf 100 ms) kostete ~7 % DPS und wurde vom Doku-Review gefunden und behoben. | `combat/simulate.ts` |
| D-020 | Attack-Skills `1000/APS`; Buffs/Heilung/Barriere `castTimeMs = 500`; Spells (noch keine im Slice) 1 000 ms. | `content/skills/guardian.ts` |
| D-021 | Mana und Cooldown bei `ACTION_BEGIN`. | `combat/simulate.ts` |
| D-023 | Wie vorgeschlagen: nur eigene Stacks, gezählt bei Auflösung, danach entfernt. **Abweichung:** Stacks werden vor dem Ausweich-Wurf verbraucht (auch bei Ausweichen) – offen für Review. | `combat/simulate.ts` |
| D-024 | Neuer Stack ersetzt den ältesten, Event `STATUS_EXPIRE` mit `note: replaced`. | `combat/simulate.ts` |
| D-025 | **Abweichung:** DoT als Rate `dps = Snapshot / Basisdauer`; Ticks an globalen Sekundengrenzen über die verstrichene Zeit plus anteiliger Schluss-Tick beim Ablauf. Summe = `dps × tatsächliche Dauer` exakt; Daueränderungen verändern so den Gesamtschaden. | `combat/simulate.ts` |
| D-026 / D-027 | Snapshot = Anteil × physischer **Basis**-Trefferwert (nach Koeffizient, vor increased/more/Krit) × `(1 + Σ increased mit DoT-Tags)` × more. Keine Doppelanrechnung, Krit erhöht den Snapshot nicht. | `combat/simulate.ts` `applyDot` |
| D-028 | Leech nur ATTACK, Sekunden-Bucket, max 15 % maxHP/s, Basis = an Barriere+LP zugefügter Schaden ohne Overkill. | `combat/simulate.ts` |
| D-029 | Blockstärke additiv, Cap 0.75 (Test: 55+15+10+8 → 75). | `stats/mitigation.ts` |
| D-039 | „+A–B bis +C–D“: min ∈ [A,C], max ∈ [B,D], unabhängig gewürfelt, min ≤ max erzwungen. | `content/affixes/affixes.ts` |
| D-046 | Slice-Uniques: 4 Endgame-Uniques mit echten Hooks (über Fixtures testbar) + Kupferner Reißer + Ausgefranster Mantel + 2 neue Low-Level-Hook-Uniques (Rostzahn, Grabherrs Schwur). | `content/uniques/uniques.ts` |
| D-048 | Slice-Baum: 1 Wurzel, 8 kleine, 2 mittlere, 3 Schlüsselknoten (13 Punkte) – reicht bis Lv14. | `content/passives/guardian.ts` |
| D-053 | XP bei Gegnern > 5 Stufen über dem Spieler gedeckelt auf 1,5 × XP derselben Begegnung auf Spielerstufe. | `progression/levels.ts` |
| D-059 | Monsterdaten (Rüstung/Stufe, Initiative 10, Archetyp-Faktoren für Caster 0.9/1.1, Swarm 0.85/1.0, Corruptor 0.95/1.0) und Bossmechaniken Rostwächter (Rostschlag alle 6 s, 2,5×, Blutung) und Grabherr (Grabesfluch alle 8 s, 3×, Gift) festgelegt; Fähigkeiten liegen **im** DPS-Budget. | `content/monsters/monsters.ts`, `balance.ts` |
| D-060 | Gleichzeitiger Tod beider Seiten = Niederlage. | `combat/simulate.ts` |
| D-061 | Fester RNG-Verbrauch je Treffer (Krit, Ausweichen, Block, 2× Status) aus dem Stream des Angreifers; Trigger-Würfe aus eigenem Stream. | `combat/simulate.ts` |
| D-062 | Spell-Basiskrit 5 %. | `combat/simulate.ts` |
| D-077 | „Sinnvolles Waffen-Upgrade“: magische Waffe derselben Familie, neuester freigeschalteter Basis-Tier, garantiertes p01 oder p02 (gewichtet 90:85) + 1 Suffix. | `state/commands.ts` |
| D-079 | Rare-Garantie: erster Bosssieg ab Charakterstufe 10 → zusätzliches Rare mit ≥ 4 Mods. | `state/commands.ts` |
| D-081 *(neu)* | Jede Begegnung startet mit vollen LP/Mana (`B.carryHpBetweenEncounters = false`). Story-Dungeons behalten bei Niederlage die Belohnungen bereits gewonnener Begegnungen, Rifts nicht. | `balance.ts`, `run/run.ts`, `content/dungeons` |
| D-082 *(neu)* | Magische Drops: 1 oder 2 Affixe (50/50). | `balance.ts` |
| D-083 *(neu)* | Basiswahl: Gruppe nach Zonengewicht (Gruppen ohne Basis werden herausnormiert, z. B. Relikt im Slice), Familie gleichverteilt, neuester freigeschalteter Tier Gewicht 3, ältere 1. | `loot/generator.ts` |
| D-084 *(neu)* | `p16 maximale Barriere` (flach): Startbarriere zu Kampfbeginn und Erhöhung des Barriere-Maximums um denselben Wert. Offen für Designreview. | `combat/simulate.ts` |
| D-085 *(neu)* | Exklusivität pro Affix-**Familie** (`groupId = Familien-ID`), unabhängig vom Tier – „Familie + Tier = gleiche groupId“ hätte sonst zwei Tiers derselben Familie erlaubt. | `content/affixes/affixes.ts` |
| D-086 *(neu)* | „Amulett +8 % eines wählbaren Hauptattributs“: vier Amulett-Basen mit festem Attribut. | `content/bases/bases.ts` |
| D-087 *(neu)* | Skill-Freischaltung zum Onboarding: Spaltender Hieb 1, Rüstungsbruch 2, Schildwall 4, Bluternte 6, Kampfrausch 8, Letztes Bollwerk 10. Skill-Level 2–5 noch nicht erwerbbar (D-049 bleibt offen). | `content/skills/guardian.ts` |
| D-088 *(neu)* | Dungeonstufe wählbar zwischen Mindeststufe und `höchste geschaffte + 1`; jeder Dungeon ist ab seiner Mindeststufe sofort betretbar (Krypta ab 8 → „zuvor schwieriger Boss“-Erlebnis). | `state/commands.ts` |
| D-089 *(neu)* | Rift-Probe nur in Balance-Tooling/Buildlabor, UI hält Rifts bis Lv60 gesperrt (entspricht Vorschlag D-050). | `endgame/rifts.ts` |
