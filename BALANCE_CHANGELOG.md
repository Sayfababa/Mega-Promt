# BALANCE_CHANGELOG

Alle Balance-Änderungen werden hier mit altem Wert, neuem Wert und Beleg (Report/Kennzahl) festgehalten.
Werte stehen ausschließlich in `src/content/balance.ts`.

## balanceVersion 1 — Startwerte der Spezifikation (unverändert)

Keine Zahl wurde gegenüber der Spezifikation verändert. Die folgenden Befunde stammen aus `npm run balance`
(10 000 Seeds je Fixture/Begegnung, 100 Progressions-Bots, Bericht `reports/balance.html`) und sind
**Vorschläge für balanceVersion 2**, die eine Designentscheidung brauchen. Nichts davon ist umgesetzt.

### B-001 · Mana-Haushalt des Wächters (OOM-Ziel < 20 % verfehlt)
- Messung: OOM-Anteil in Bosskämpfen 18–51 % (Blutungs-Build) und 61–76 % (Block-Build) ab Lv7. Normale Begegnungen 0 %, weil sie kürzer sind als der Startpool reicht.
- Ursache: Spaltender Hieb allein kostet 12 Mana / 2 s = 6 Mana/s. Die Regeneration `2 + 1,5 % × maxMana` liegt bei Lv8–15 bei ≈ 3,5–4,5 Mana/s, und der Wächter skaliert kein INT.
- Vorschlag (eine von beiden): `manaRegenBase 2 → 4` oder Kosten Spaltender Hieb `12 → 8`. Danach mit Report gegenprüfen.

### B-002 · Build-Parität Lv15: Block-1H deutlich schwächer als Blutungs-2H
- Messung, Krypta Stufe 14 mit magischen Items:
  - Blutung: 104 DPS gegen den Boss, Boss-p50 37,7 s. Liegt im Ziel 90–150 DPS / 30–60 s.
  - Block: 54 DPS, Boss-p50 74,6 s. Liegt außerhalb des Ziels.
- Verletzt die Paritätsregel ±20–25 % aus §18.1 (Clear-Zeit Faktor ≈ 2). Beide Builds gewinnen trotzdem 100 %.
- Ursache:
  - Die Zweihandwaffe hat ≈ 1,4× Waffen-DPS.
  - Dazu kommen Blutungs-DoT und Kampfrausch.
  - Der Block-Build verliert zusätzlich Angriffstempo durch Eisenherz (−12 %) und gibt Aktionen für Schildwall und Letztes Bollwerk aus.
  - Seine Mehr-Überlebensfähigkeit wird im Slice kaum gebraucht.
- Vorschlag: Bosse mit Schadensspitzen (z. B. Rostschlag ×2,5 → ×3,5 im gleichen DPS-Budget), damit Block einen messbaren Vorteil bekommt, statt den Schaden des Block-Builds anzuheben. Alternativ Eisenherz −12 % → −6 % Angriffstempo.

### B-003 · Start Lv1: Zweihand-Fixture über dem Startkorridor
- Messung: 2H-Startausrüstung (Zweihandaxt) 32,7 DPS, Boss in 27,1 s. Ziel: 18–25 DPS, Boss 30–55 s.
- Mit der echten Startausrüstung (Kurzschwert) liegt der Block-Build im Ziel: 21,4 DPS, Boss 40,9 s.
- Bewertung: Das ist eine Folge des 2H/1H-Verhältnisses 1,44, das die Spec so festlegt. Kein Handlungsbedarf, solange die Startausrüstung eine Einhandwaffe bleibt.

### B-004 · Endgame-Einstieg (Rift-Probe T1, Lv60) nicht schaffbar
- Messung: Referenz-Rares (eine Stufe unter Max-Tier, Mittelwerte) erreichen 1 360 DPS (2H) bzw. 700 DPS (1H). Ziel: 2 000–3 500 DPS.
- Folgen:
  - Riftboss: 0 % Siege. Der 2H-Build stirbt nach ≈ 84–90 s, weil 137 500 Boss-LP (Brute ×1,25) gegen ≈ 57 erlittene DPS stehen.
  - Elite: TTK 45–84 s, Ziel 12–28 s.
- Ursache:
  - Ohne Skill-Level (D-049 offen), Runen, Support-Siegel und Talentbaum > 13 Knoten fehlen dem Wächter auf Lv60 alle Skalierungen der Phasen 2–3.
  - Die Lv60-Anker sind für vollständige Builds gedacht.
- Vorschlag: Neu bewerten, sobald Phase 2/3 die Skalierungsquellen liefert. Bis dahin bleibt die Rift-Probe ein Debug-Werkzeug (D-089).

### B-005 · Echte Unique-Rate weit unter der Kandidatenrate (Gate A.3.2 ausgelöst)
- Messung: 10 000 Bosskills, MF 0.

  | Boss | Unique-Kandidaten pro Kill | Gültige Uniques pro Kill | Rare-Fallback |
  |---|---|---|---|
  | Rostwächter | 4,26 % | 0,55 % | 87 % |
  | Grabherr | 4,06 % | 0,24 % | 94 % |

- Ursache: Im Slice gibt es nur 5 dropbare Uniques auf 5 von ≈ 30 Basen. Die meisten Unique-Würfe landen deshalb auf einer Basis ohne Unique.
- Vorschlag laut Spec („offen deklariertes Dropmodell ändern“): Bei einem Unique-Wurf zuerst aus dem Unique-Pool der Zone ziehen und die Basis daraus ableiten. Alternativ Basis-Pool und Unique-Pool gemeinsam ausbauen (Phase 2: +10 Uniques). Diese Entscheidung ist offen.

### B-006 · Rift-T40-Timeout-Gate (Anhang A.3.1) — gemessen, bestätigt
- T40: Boss-LP 4 525 925, Mindest-DPS 30 173 bei 150 s und 50 288 bei 90 s.
- Der Zielkorridor für T40 liegt bei 30–50k DPS, ein Boss-p50 von 55 s ist damit unerreichbar.
- Entscheidung erst in Phase 4.

### Bestätigte Zielwerte (keine Abweichung)
- Lv1-Start (Einhand): Normal 5–7 s, Boss 41 s, 100 % Siege.
- Lv15-Blutung: Normal 4,8–7,0 s, Boss 37,7 s, 104–108 DPS, 100 % Siege.
- Loot-Tabellen:
  - Simulierte Items pro Begegnung 0,947 / 1,547 / 2,899 gegen theoretisch 0,95 / 1,55 / 2,90.
  - Unique-Kandidaten MF 0 → 200 steigen um den Faktor 1,4 (relativ), wie in der Spec vorgesehen.
- Progression (Bots, 3 s UI-Zeit pro Begegnung):
  - Lv10 nach median 12 Runs / 13 min.
  - Lv15 nach 21 Runs / 28 min.
  - Die ersten 10 Stufen gehen also schnell. Die Langzeitkurve ab 60 ist noch nicht messbar.
- Crafting:
  - Ziel „Waffe mit lok. phys. %“: im Mittel 11,6 Basen + 46 Staub + 11,6 Splitter (nur Prägen), oder 2,9 Basen + 31 Splitter + 4,4 Essenzen (Pfad bis Selten).
