# BALANCE_V1 — Startwerte `balanceVersion: 1`

Alle Werte aus der Spec übernommen; abgeleitete Tabellen wurden mit `node -e` nachgerechnet (Rundung wie angegeben). Werte sind Hypothesen, Kalibrierung per Simulation (§0.1, §18). Implementierung ausschließlich über `src/content/balance.ts` (D-006); Änderungen in `BALANCE_CHANGELOG.md`.

## 1. Progression

### 1.1 XP bis nächstes Level `xpNext(L) = floor(85 * L^1.45)`

| L | xpNext | kumuliert bis L+1 |
|---:|---:|---:|
| 1 | 85 | 85 |
| 2 | 232 | 317 |
| 3 | 418 | 735 |
| 4 | 634 | 1 369 |
| 5 | 876 | 2 245 |
| 6 | 1 142 | 3 387 |
| 7 | 1 428 | 4 815 |
| 8 | 1 733 | 6 548 |
| 9 | 2 056 | 8 604 |
| 10 | 2 395 | 10 999 |
| 12 | 3 120 | 16 869 |
| 14 | 3 902 | 24 275 |
| 15 | 4 312 | 28 587 |
| 20 | 6 545 | 56 729 |
| 30 | 11 782 | 150 200 |
| 45 | 21 211 | 400 242 |
| 59 | 31 416 | 772 294 |
| 60 | 32 191 | 804 485 |
| 80 | 48 853 | 1 619 687 |
| 99 | 66 541 | 2 722 102 |

### 1.2 Encounter-XP und Gold je Monsterlevel

`xp = round(25 + 10*ML^1.25)`; Elite ×1.8, Boss/Riftboss ×3.5 (hier gerundet). `gold = round(8 + 3*ML^1.2)`; Elite ×2, Boss ×4; Rift zusätzlich × `riftGoldMult`.

| ML | XP N | XP E | XP B | Gold N | Gold E | Gold B |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 35 | 63 | 123 | 11 | 22 | 44 |
| 2 | 49 | 88 | 172 | 15 | 30 | 60 |
| 3 | 64 | 115 | 224 | 19 | 38 | 76 |
| 4 | 82 | 148 | 287 | 24 | 48 | 96 |
| 5 | 100 | 180 | 350 | 29 | 58 | 116 |
| 6 | 119 | 214 | 417 | 34 | 68 | 136 |
| 7 | 139 | 250 | 487 | 39 | 78 | 156 |
| 8 | 160 | 288 | 560 | 44 | 88 | 176 |
| 9 | 181 | 326 | 634 | 50 | 100 | 200 |
| 10 | 203 | 365 | 711 | 56 | 112 | 224 |
| 11 | 225 | 405 | 788 | 61 | 122 | 244 |
| 12 | 248 | 446 | 868 | 67 | 134 | 268 |
| 13 | 272 | 490 | 952 | 73 | 146 | 292 |
| 14 | 296 | 533 | 1 036 | 79 | 158 | 316 |
| 15 | 320 | 576 | 1 120 | 85 | 170 | 340 |
| 20 | 448 | 806 | 1 568 | 117 | 234 | 468 |
| 35 | 876 | 1 577 | 3 066 | 222 | 444 | 888 |
| 60 | 1 695 | 3 051 | 5 933 | 416 | 832 | 1 664 |
| 100 | 3 187 | 5 737 | 11 155 | 762 | 1 524 | 3 048 |

Normale Begegnungen gleichen Levels pro Levelaufstieg: L1 2.4; L5 8.8; L10 11.8; L15 13.5; L30 16.2; L60 19.0; L90 20.7. Vertical-Slice-Schätzung: Tor (ML≈4, 3N+B) ≈ 533 XP/Run → ~12 Runs bis L8; Krypta (ML≈11, 4N+B) ≈ 1 688 XP/Run → ~13 Runs L8→L15.

Überlevel-Faktor (`Δ = playerLevel − ML`): Δ≤8 1.0; 9 0.9; 10 0.8; 12 0.6; 15 0.3; 16 0.2; ≥17 0.1.

### 1.3 Talent-Refund `ceil(100 * max(1,L)^1.2)`

| L | Einzelpunkt | Komplett (5×) |
|---:|---:|---:|
| 1 | 100 | 500 |
| 10 | 1 585 | 7 925 |
| 15 | 2 579 | 12 895 |
| 30 | 5 924 | 29 620 |
| 60 | 13 608 | 68 040 |
| 100 | 25 119 | 125 595 |

Erste Komplettrücksetzung gratis.

## 2. Attribute und Caps

| Klasse | STR | DEX | INT | VIT | Auto/Level |
|---|---:|---:|---:|---:|---|
| Wächter | 15 | 10 | 7 | 15 | +1 STR, +1 VIT |
| Arkanist | 6 | 10 | 18 | 11 | +1 INT, +1 VIT |
| Schattenläufer | 9 | 17 | 9 | 10 | +1 DEX, +1 VIT |
| Nekromant | 7 | 10 | 17 | 11 | +1 INT, +1 VIT |
| Runenschmied | 13 | 9 | 14 | 11 | +1 STR, +1 INT |
| Inquisitor | 12 | 10 | 12 | 13 | +1 STR, +1 VIT |

Freie Punkte: +2/Level. Wächter Lv1 ohne Gear: maxHP = 100 + 14·15 = 310; maxMana = 60 + 4·7 = 88; Mana-Regen 2 + 0.015·88 = 3.32/s.

| Koeffizient | Wert |
|---|---|
| HP Basis / pro Level / pro VIT | 100 / 12 / 14 |
| Mana Basis / pro Level / pro INT | 60 / 3 / 4 |
| increased phys je STR>10 | 0.0035 |
| increased spell je INT>10 | 0.0035 |
| increased APS je DEX>10 | 0.0015 |
| Crit je DEX>10 | 0.00035 |
| HP-Regen/s | 0.005 × maxHP |
| Mana-Regen/s | 2 + 0.015 × maxMana |

| Cap | Min | Max |
|---|---:|---:|
| Crit-Chance | 0.05 | 0.55 |
| Crit-Multiplikator | — | 3.0 (Basis 1.5) |
| Resistenz (effektiv) | −0.50 | 0.75 |
| Blockchance | 0 | 0.40 |
| Blockstärke | 0.55 Standard | 0.75 |
| Ausweichen | 0 | 0.35 |
| CDR | 0 | 0.40 |
| Lebensraub | 0 | 0.08; max 15% maxHP/s |
| Attacks/s | 0.40 | 2.5 |
| Physische Reduktion (Armor) | — | 0.70 |
| Barriere | — | 0.60 × maxHP; Verfall 8 s ohne Gewinn |
| Fluch-Res-Abzug gesamt | — | −25 pp |
| Minions aktiv | — | 4 |
| Aktionsdauer | 400 ms | — |
| GCD | 350 ms | — |
| Kampfdauer | — | 90 s / Endgameboss 150 s |
| Stun | — | Boss 0.8 s / 8 s; normal 1.5 s / 8 s |
| s26 Skilllevel aus Gear | — | +2 pro Skill (MVP) |

Armor: `physicalReduction = min(0.70, armor / (armor + 450 + 25*attackerLevel))`. Armor für 25% Reduktion (Blutkoloss): `(450 + 25·L)/3`.

## 3. Waffenbasen (T1) und neutrale DPS

Neutrale DPS = `mean(min,max) × APS` (ohne Krit/Implizit/Skill/Affix).

| Waffe | H | Min–Max | Mean | APS | Krit | Neutral-DPS | Δ Median Kategorie | Implizit |
|---|---:|---|---:|---:|---:|---:|---:|---|
| Dolch | 1 | 8–13 | 10.5 | 1.55 | 8% | 16.275 | −9.58% | +5pp Krit vs blutend |
| Kurzschwert | 1 | 12–18 | 15 | 1.20 | 5% | 18.000 | 0.00% | +8% phys. Angriffsschaden global |
| Langschwert | 1 | 14–21 | 17.5 | 1.05 | 5% | 18.375 | +2.08% | +10% Blockstärke mit Schild |
| Kriegsaxt | 1 | 16–25 | 20.5 | 0.95 | 5% | 19.475 | +8.19% | +15% Blutungsdauer |
| Streitkolben | 1 | 17–27 | 22 | 0.90 | 5% | 19.800 | +10.00% | +12% Armor-Pen Waffentreffer |
| Krallen | 1 | 9–15 | 12 | 1.42 | 7% | 17.040 | −5.33% | +10% Giftauslösechance |
| Runenklinge | 1 | 11–17 | 14 | 1.15 | 6% | 16.100 | −10.56% | +8% Elementarschaden |
| Speer | 2 | 22–32 | 27 | 0.96 | 6% | 25.920 | +0.04% | +5pp Krit vs Bosse |
| Zweihandschwert | 2 | 24–36 | 30 | 0.84 | 5% | 25.200 | −2.74% | +12% Schaden bei HP>70% |
| Zweihandaxt | 2 | 28–42 | 35 | 0.74 | 5% | 25.900 | −0.04% | +18% Blutungsschaden |
| Kriegshammer | 2 | 33–49 | 41 | 0.64 | 5% | 26.240 | +1.27% | +18% Stärkeschaden gg. Barriere |
| Bogen | 2 | 19–29 | 24 | 1.08 | 7% | 25.920 | +0.04% | +12% Giftschaden |
| Armbrust | 2 | 30–43 | 36.5 | 0.70 | 6% | 25.550 | −1.39% | +15pp Krit-Multi |
| Zauberstab (C) | 1 | 6–10 | 8 | 1.15 | 5% | 9.200 | Spell-Fixture | +12% Zauberschaden |
| Magierstab (C) | 2 | 9–16 | 12.5 | 0.90 | 5% | 11.250 | Spell-Fixture | +35% Zauberschaden |
| Ritualzepter (C) | 1 | 10–15 | 12.5 | 1.00 | 5% | 12.500 | Spell-Fixture | +12% DoT-Effekt |

### 3.1 Prüfung ±15%-Regel und 2H/1H-Verhältnis (nachgerechnet)

| Kategorie | Median | Mittel | Min-Abw. | Max-Abw. | Regel ±15% |
|---|---:|---:|---:|---:|---|
| 1H martialisch inkl. Runenklinge (7) | 18.000 | 17.866 | −10.56% (Runenklinge) | +10.00% (Streitkolben) | erfüllt |
| 1H martialisch ohne Runenklinge (6) | 18.1875 | 18.161 | −10.52% (Dolch) | +8.87% (Streitkolben) | erfüllt |
| 2H martialisch inkl. Bogen/Armbrust (6) | 25.910 | 25.788 | −2.74% (Zweihandschwert) | +1.27% (Kriegshammer) | erfüllt |

| Verhältnis 2H/1H | Wert | Ziel 1.35–1.55 |
|---|---:|---|
| Median / Median (1H inkl. RK) | 1.4394 | erfüllt |
| Median / Median (1H ohne RK) | 1.4246 | erfüllt |
| Mittel / Mittel (inkl. RK) | 1.4434 | erfüllt |

Mit Basis-Krit (×1.5, `DPS·(1+crit·0.5)`): 1H −10.1% … +10.0%, 2H −3.0% … +1.0% → erfüllt. Nach Tier-Skalierung (`roundHalfUp` auf Min/Max, T1–T6): 1H max. Abweichung −11.40% (T2), 2H max. −2.94% (T2), Verhältnis 1.4288–1.4411 → in allen Tiers erfüllt. Anhang A.1 der Spec stimmt exakt. Keine Korrektur nötig (D-017).

### 3.2 Waffen-Tier-Skalierung

| Tier | ab Lv | Faktor | Beispiel Dolch | Streitkolben | Speer | Kriegshammer |
|---|---:|---:|---|---|---|---|
| T1 | 1 | 1.00 | 8–13 | 17–27 | 22–32 | 33–49 |
| T2 | 12 | 1.75 | 14–23 | 30–47 | 39–56 | 58–86 |
| T3 | 25 | 3.10 | 25–40 | 53–84 | 68–99 | 102–152 |
| T4 | 40 | 5.30 | 42–69 | 90–143 | 117–170 | 175–260 |
| T5 | 60 | 8.70 | 70–113 | 148–235 | 191–278 | 287–426 |
| T6 | 80 | 12.80 | 102–166 | 218–346 | 282–410 | 422–627 |

## 4. Nebenhände, Rüstung, Schmuck

| Nebenhand | Werte |
|---|---|
| Schild | +9% Blockchance, +15% Blockstärke (55→70%, max 75%), Armor 35 (T1, × Rüstungs-Tier) |
| Fokus | +10% Zauberschaden, +8% Mana-Regeneration |
| Totem | +10% DoT-Schaden, +10% Fluchdauer |
| Dual-Wield (≥Phase 3) | alternierend, +8% global APS, −10% Basisschaden beider Waffen |

| Rüstung T1 | Helm | Brust | Handschuhe | Stiefel | Gürtel |
|---|---:|---:|---:|---:|---:|
| Basis-Armor | 15 | 45 | 10 | 12 | 8 |

Rüstungs-Tier-Multiplikatoren: 1 / 1.8 / 3.2 / 5.5 / 9.0 / 13.5 (Level-Gates offen, D-058).

| Material | Armor-Anteil | Zusatz |
|---|---:|---|
| Platten | 100% | — |
| Leder | 55% | Ausweichen +4% Brust, +2% übrige Plätze |
| Stoff | 25% | Brust +6% maxMana; Helm +4%, Handschuhe +3%, Stiefel +3% (Mana/Barriere unklar, D-037) |

| Schmuck/Sonstiges | Implizit |
|---|---|
| Rubinring | +12% Feuerresistenz |
| Saphirring | +12% Frostresistenz |
| Topasring | +12% Blitzresistenz |
| Onyxring | +10% Schattenresistenz |
| Amulett | +8% eines wählbaren Hauptattributs |
| Gürtel | +5% maximales Leben |
| Relikt | +5% Effektstärke (eine Art) |

## 5. Monster (§13.1a)

Interpolation `V(L) = round(exp(ln(V0)(1−t) + ln(V1)t))`, `t = (L−L0)/(L1−L0)`. Elite-HP = 2.6 × Normal-HP, Elite-DPS = 1.45 × Normal-DPS. Typfaktoren HP/DPS: Brute 1.25/0.85, Assassin 0.80/1.15, Sentinel 1.10/0.90.

| Anker L | Normal-HP | Elite-HP | Boss-HP | Normal-DPS | Elite-DPS | Boss-DPS |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 120 | 312 | 800 | 4 | 5.80 | 5 |
| 15 | 650 | 1 690 | 4 800 | 13 | 18.85 | 18 |
| 35 | 4 300 | 11 180 | 38 000 | 28 | 40.60 | 50 |
| 60 | 18 000 | 46 800 | 110 000 | 48 | 69.60 | 90 |
| 75 | 50 000 | 130 000 | 240 000 | 70 | 101.50 | 125 |
| 90 | 140 000 | 364 000 | 500 000 | 105 | 152.25 | 190 |
| 100 | 220 000 | 572 000 | 750 000 | 135 | 195.75 | 235 |

Interpolierte Werte Vertical Slice (DPS ebenfalls gerundet laut Formel, siehe D-014):

| L | N-HP | E-HP | B-HP | N-DPS | E-DPS | B-DPS |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 120 | 312 | 800 | 4 | 5.80 | 5 |
| 2 | 135 | 351 | 909 | 4 | 5.80 | 5 |
| 3 | 153 | 398 | 1 033 | 5 | 7.25 | 6 |
| 4 | 172 | 447 | 1 174 | 5 | 7.25 | 7 |
| 5 | 194 | 504 | 1 335 | 6 | 8.70 | 7 |
| 6 | 219 | 569 | 1 517 | 6 | 8.70 | 8 |
| 7 | 248 | 645 | 1 724 | 7 | 10.15 | 9 |
| 8 | 279 | 725 | 1 960 | 7 | 10.15 | 9 |
| 9 | 315 | 819 | 2 227 | 8 | 11.60 | 10 |
| 10 | 356 | 926 | 2 531 | 9 | 13.05 | 11 |
| 11 | 401 | 1 043 | 2 877 | 9 | 13.05 | 12 |
| 12 | 453 | 1 178 | 3 270 | 10 | 14.50 | 14 |
| 13 | 511 | 1 329 | 3 716 | 11 | 15.95 | 15 |
| 14 | 576 | 1 498 | 4 223 | 12 | 17.40 | 16 |
| 15 | 650 | 1 690 | 4 800 | 13 | 18.85 | 18 |
| 20 | 1 042 | 2 709 | 8 052 | 16 | 23.20 | 23 |
| 25 | 1 672 | 4 347 | 13 506 | 19 | 27.55 | 30 |
| 30 | 2 681 | 6 971 | 22 654 | 23 | 33.35 | 39 |
| 40 | 5 726 | 14 888 | 47 001 | 31 | 44.95 | 56 |
| 50 | 10 152 | 26 395 | 71 903 | 39 | 56.55 | 71 |
| 59 | 16 998 | 44 195 | 105 421 | 47 | 68.15 | 88 |

### 5.1 TTK-Plausibilität (HP / Ziel-DPS, ohne Armor/Res) gegen §18

| Stufe | DPS-Korridor | Normal (Ziel) | Elite (Ziel) | Boss (Ziel) | Befund |
|---|---|---|---|---|---|
| Lv1 | 18–25 | 4.8–6.7 s (4–8) | 12.5–17.3 (10–18) | 32.0–44.4 (30–55) | ok |
| Lv15 | 90–150 | 4.3–7.2 (4–9) | 11.3–18.8 (10–20) | 32.0–53.3 (30–60) | ok |
| Lv35 | 450–850 | 5.1–9.6 (4–10) | 13.2–**24.8** (12–24) | **44.7–84.4** (35–70) | Elite/Boss oberhalb |
| Lv60 / Rift T1 | 2000–3500 | 5.1–9.0 (5–11) | 13.4–23.4 (12–28) | **31.4**–55.0 (40–85) | Boss zu schnell |
| Rift T20 | 6000–10000 | **11.0–18.3** (6–14) | **28.6–47.7** (14–33) | 67.3–**112.1** (45–100) | zu langsam |
| Rift T40 | 30000–50000 | **14.8–24.7** (7–18) | **38.5–64.2** (20–45) | **90.5–150.9** (55–130) | zu langsam; Timeout-Gate |

Rift-Basis: L60-Normal/Elite/Boss × `riftHPmult` (Annahme D-010). Siehe D-007, D-009, D-012, D-013.

## 6. Rifts (§14)

| Funktion | Formel |
|---|---|
| riftHPmult | `1.10^(t−1)` |
| riftDMGmult | `1.045^(t−1)` |
| riftGoldMult | `min(3.0, 1 + 0.035(t−1))` |
| riftMaterialMult | `min(2.5, 1 + 0.025(t−1))` |
| riftRareWeightMult | `1 + 0.004·min(t−1, 100)` |
| Rift-ML / ilvl | `min(100, 60 + floor(0.6(t−1)))` |
| riftBossHP | `110 000 × riftHPmult × bossArchetypeFactor` |

### 6.1 Referenztabelle nachgerechnet

| Tier | HP exakt | Spec HP | DMG exakt | Spec DMG | Gold | Mat | Rare | ML | Boss-HP | Boss-DPS roh | min. DPS Boss 150 s |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 1.0000 | 1.00 | 1.0000 | 1.00 | 1.000 | 1.000 | 1.000 | 60 | 110 000 | 90.0 | 734 |
| 5 | 1.4641 | — | 1.1925 | — | 1.140 | 1.100 | 1.016 | 62 | 161 051 | 107.3 | 1 074 |
| 10 | 2.3579 | 2.36 | 1.4861 | 1.49 | 1.315 | 1.225 | 1.036 | 65 | 259 374 | 133.7 | 1 730 |
| 15 | 3.7975 | — | 1.8519 | — | 1.490 | 1.350 | 1.056 | 68 | 417 725 | 166.7 | 2 785 |
| 20 | 6.1159 | 6.12 | 2.3079 | 2.31 | 1.665 | 1.475 | 1.076 | 71 | 672 750 | 207.7 | 4 485 |
| 30 | 15.8631 | 15.86 | 3.5840 | 3.58 | 2.015 | 1.725 | 1.116 | 77 | 1 744 940 | 322.6 | 11 633 |
| 40 | 41.1448 | 41.14 | 5.5659 | 5.57 | 2.365 | 1.975 | 1.156 | 83 | 4 525 926 | 500.9 | 30 173 |
| 50 | 106.7190 | 106.72 | 8.6437 | 8.64 | 2.715 | 2.225 | 1.196 | 89 | 11 739 085 | 777.9 | 78 261 |

**Ergebnis:** Spec-Referenztabelle stimmt bei 2 Nachkommastellen in allen Werten (T1/10/20/30/40/50). Keine Abweichung (D-016). T40-Gate (Anhang A.3.1) bestätigt: 4 525 926 HP; bei 35 000 DPS 129.3 s; Minimum 30 173 DPS bei 150 s, 50 289 DPS bei 90 s.

Rift-Aufbau: T1–19 3N+1E+1B; T20–39 4N+1E+1B; ab T40 4N+2E+1B. Modifier-Anzahl: T1–9 1, 10–24 2, 25–39 3, ab 40 4.

### 6.2 Rift-Modifikatoren

| Modifier | Effekt | Belohnung |
|---|---|---|
| Gläserne Horden | Monster HP −10%, DMG +20% | Menge +8% |
| Unsterbliches Fleisch | HP +20%, DMG −5% | Menge +8% |
| Verbrannte Luft | Spieler Feuerres −15pp | Essenz-Chance +10% |
| Dunkles Ritual | Spieler Schattenres −15pp | Arcane Shards +10% |
| Eiserne Garde | Monster Armor +35% | Material +10% |
| Unruhige Magie | Monster Spell DMG +20% | Rare-Anteil +8% relativ |
| Blutige Zeit | Bleed-Dauer +35% beide Seiten | +10% Chance +1 Boss-Siegel (Cap 2/Sieg, D-044) |
| Kurze Gnade | Spielerschilde −20% | Material +12% |
| Giftige Tiefen | Monster Poison-Chance +25pp | Runenfragment-Chance +10% |
| Zorn der Elite | Elite HP +20%, Boss HP +10% | Uniquechance +10% relativ (Elite/Boss) |
| Arkane Stille | Spieler Mana-Regen −20% | Shard-Chance +10% |
| Höllenpforte | +1 Normalbegegnung | Material +15% |

Reward-Multiplikator aus Mods gesamt ≤ +60%.

## 7. Loot (§7)

### 7.1 Drop-Tabellen

| Begegnung | P(0/1/2/3/4 Items) | E[Items] | Normal / Magisch / Selten / Unique |
|---|---|---:|---|
| Normal | 25/55/20/0/0 % | 0.95 | 62 / 29 / 8.5 / 0.5 % |
| Elite | 5/45/40/10/0 % | 1.55 | 47 / 36 / 16 / 1 % |
| Boss | 0/0/30/50/20 % | 2.90 | 37 / 40 / 21.5 / 1.5 % |
| Riftboss | 0/0/20/50/30 % | 3.10 | 31 / 43 / 24 / 2 % |

Run-Erwartungen (vor Filter): 4N+B 6.70; Tor 3N+B 5.75; Rift T1 7.50; Rift T20 8.45; Rift T40 10.00.

### 7.2 Magic Find

`effMF = MF/(200+MF)`; Faktoren Unique 0.80, Rare 0.55, Magic 0.20.

| Begegnung | MF | N / M / R / U % | E[Unique-Kand.] | P(≥1 Unique-Kand.) |
|---|---:|---|---:|---:|
| Normal | 0 | 62.000 / 29.000 / 8.500 / 0.500 | 0.0048 | 0.474% |
| Normal | 200 | 56.563 / 31.900 / 10.838 / 0.700 | 0.0066 | 0.664% |
| Elite | 0 | 47.000 / 36.000 / 16.000 / 1.000 | 0.0155 | 1.543% |
| Elite | 200 | 38.600 / 39.600 / 20.400 / 1.400 | 0.0217 | 2.156% |
| Boss | 0 | 37.000 / 40.000 / 21.500 / 1.500 | 0.0435 | 4.283% |
| Boss | 100 | 29.992 / 42.667 / 25.442 / 1.900 | 0.0551 | 5.403% |
| Boss | 200 | 26.487 / 44.000 / 27.412 / 2.100 | 0.0609 | 5.959% |
| Boss | 400 | 22.983 / 45.333 / 29.383 / 2.300 | 0.0667 | 6.513% |
| Riftboss | 0 | 31.000 / 43.000 / 24.000 / 2.000 | 0.0620 | 6.061% |
| Riftboss | 200 | 19.300 / 47.300 / 30.600 / 2.800 | 0.0868 | 8.409% |

`P(≥1) = 1 − Σ_n P(n)·(1−pU)^n` (totale Wahrscheinlichkeit). Boss-Werte stimmen mit Spec §7.1 / Anhang A.2 (4.283% / 5.959%). `pNormal' < 0` ist mit v1-Werten allein unerreichbar, wird aber mit `riftRareWeightMult` (≥ T50) + `Unruhige Magie` + hohem MF erreichbar (D-043).

Pinnacle: `pExclusiveUniquePerKill = 4%` zusätzlich, MF-unabhängig.

### 7.3 Affix-Tiers

| ilvl | erlaubte Tiers (renormiert) |
|---:|---|
| 1–19 | T5 100% |
| 20–39 | T5 50%, T4 50% |
| 40–59 | T5 36.14%, T4 36.14%, T3 27.71% |
| 60–79 | T5 31.58%, T4 31.58%, T3 24.21%, T2 12.63% |
| 80–100 | T5 30%, T4 30%, T3 23%, T2 12%, T1 5% |
| ≥94 Spezialquelle | T0 Gewicht 0.5 im Spezialpool, max 1/Item |

Rare-Affixanzahl Drop: 3/4/5/6 = 20/40/30/10%; ilvl<20 max 4 (Umsetzung D-041). Faktoren: T5 0.50, T4 0.73, T3 1.00, T2 1.35, T1 1.75.

### 7.4 Affix-Wertebereiche je Tier (berechnet; ints `roundHalfUp`, % auf 0.1)

Flat-Paare (p02–p05): Notation `+A–B bis +C–D` ⇒ Min-Schaden ∈ [A, C], Max-Schaden ∈ [B, D] (D-039).

| ID | Affix | Seite | Slots | Gew. | T5 | T4 | T3 | T2 | T1 |
|---|---|---|---|---:|---|---|---|---|---|
| p01 | lokale phys. % | P | M | 90 | 35–50 | 51.1–73 | 70–100 | 94.5–135 | 122.5–175 |
| p02 | lok. phys. flat Min | P | M | 85 | 4–6 | 5–9 | 7–12 | 9–16 | 12–21 |
| p02 | lok. phys. flat Max | | | | 6–10 | 9–15 | 12–20 | 16–27 | 21–35 |
| p03/p04 | Feuer/Frost flat Min | P | M | 65 | 3–6 | 4–8 | 6–11 | 8–15 | 11–19 |
| p03/p04 | Feuer/Frost flat Max | | | | 5–9 | 7–13 | 10–18 | 14–24 | 18–32 |
| p05 | Blitz flat Min | P | M | 65 | 2–4 | 3–6 | 4–8 | 5–11 | 7–14 |
| p05 | Blitz flat Max | | | | 7–12 | 10–17 | 14–23 | 19–31 | 25–40 |
| p06 | Zauberschaden % | P | C,J,R | 80 | 7.5–12 | 11–17.5 | 15–24 | 20.3–32.4 | 26.3–42 |
| p07 | Physisch % global | P | J,R,B | 75 | 7–11 | 10.2–16.1 | 14–22 | 18.9–29.7 | 24.5–38.5 |
| p08 | Elementar % | P | C,J,R | 75 | 7.5–11 | 11–16.1 | 15–22 | 20.3–29.7 | 26.3–38.5 |
| p09–p12 | Feuer/Frost/Blitz/Schatten % | P | C,J,R | 70 | 10–15 | 14.6–21.9 | 20–30 | 27–40.5 | 35–52.5 |
| p13 | max LP flach | P | A,J,B,O,R | 95 | 33–53 | 47–77 | 65–105 | 88–142 | 114–184 |
| p14 | max Mana flach | P | A,J,B,O,R | 90 | 28–45 | 40–66 | 55–90 | 74–122 | 96–158 |
| p15 | lokale Rüstung % | P | A,O | 90 | 27.5–42.5 | 40.2–62.1 | 55–85 | 74.3–114.8 | 96.3–148.8 |
| p16 | max Barriere | P | A,O,R | 65 | 25–45 | 37–66 | 50–90 | 68–122 | 88–158 |
| p17 | Giftschaden % | P | M,J,R | 65 | 10–15 | 14.6–21.9 | 20–30 | 27–40.5 | 35–52.5 |
| p18 | Blutungsschaden % | P | M,J,R | 65 | 10–15 | 14.6–21.9 | 20–30 | 27–40.5 | 35–52.5 |
| p19 | Dienerschaden % | P | C,J,R | 55 | 10–17.5 | 14.6–25.6 | 20–35 | 27–47.3 | 35–61.3 |
| p20 | HP-Regen/s flach | P | A,B,O | 80 | 3–5 | 4–7 | 5–9 | 7–12 | 9–16 |
| p21 | Fluchwirkung % | P | C,R,J | 55 | 6–10 | 8.8–14.6 | 12–20 | 16.2–27 | 21–35 |
| p22 | Schutzschild-Effekt % | P | O,R,A | 60 | 6–10 | 8.8–14.6 | 12–20 | 16.2–27 | 21–35 |
| s01–s04 | STR/DEX/INT/VIT flach | S | s. Spec | 100 | 6–10 | 9–14 | 12–19 | 16–26 | 21–33 |
| s05 | APS lokal % | S | M | 80 | 4.5–6.5 | 6.6–9.5 | 9–13 | 12.2–17.6 | 15.8–22.8 |
| s06 | APS global % | S | J,B | 70 | 3–5 | 4.4–7.3 | 6–10 | 8.1–13.5 | 10.5–17.5 |
| s07 | Cast Speed % | S | C,J | 75 | 4–6.5 | 5.8–9.5 | 8–13 | 10.8–17.6 | 14–22.8 |
| s08 | Krit lokal pp | S | M | 65 | 1–1.8 | 1.5–2.6 | 2–3.5 | 2.7–4.7 | 3.5–6.1 |
| s09 | Krit global pp | S | C,J,R | 60 | 1–1.5 | 1.5–2.2 | 2–3 | 2.7–4.1 | 3.5–5.3 |
| s10 | Krit-Multi pp | S | M,C,J | 60 | 7.5–12 | 11–17.5 | 15–24 | 20.3–32.4 | 26.3–42 |
| s11–s14 | Einzelresistenz % | S | A,J,B,O,R | 100 | 10–14 | 14.6–20.4 | 20–28 | 27–37.8 | 35–49 |
| s15 | Alle Res % | S | J,R,O | 40 | 4–6 | 5.8–8.8 | 8–12 | 10.8–16.2 | 14–21 |
| s16 | Block pp | S | O | 70 | 2–3.5 | 2.9–5.1 | 4–7 | 5.4–9.5 | 7–12.3 |
| s17 | Ausweichen pp | S | A,J | 70 | 1–2 | 1.5–2.9 | 2–4 | 2.7–5.4 | 3.5–7 |
| s18 | Mana-Regen % | S | C,J,A | 75 | 7.5–12 | 11–17.5 | 15–24 | 20.3–32.4 | 26.3–42 |
| s19 | Lebensraub % (Attack) | S | M,J | 50 | 0.5–1 | 0.7–1.5 | 1–2 | 1.4–2.7 | 1.8–3.5 |
| s20 | CDR % | S | C,J,R | 35 | 2–3.5 | 2.9–5.1 | 4–7 | 5.4–9.5 | 7–12.3 |
| s21 | Magic Find % | S | A,J,B | 55 | 6–10 | 8.8–14.6 | 12–20 | 16.2–27 | 21–35 |
| s22 | Goldfund % | S | A,J,B | 70 | 7.5–12.5 | 11–18.3 | 15–25 | 20.3–33.8 | 26.3–43.8 |
| s23 | Statusdauer % | S | M,C,J,R | 65 | 6–10 | 8.8–14.6 | 12–20 | 16.2–27 | 21–35 |
| s24 | DoT-Wirkung % | S | M,C,J,R | 65 | 5–9 | 7.3–13.1 | 10–18 | 13.5–24.3 | 17.5–31.5 |
| s25 | Heilwirkung % | S | O,R,J | 55 | 6–10 | 8.8–14.6 | 12–20 | 16.2–27 | 21–35 |
| s26 | +1 Skilllevel Gruppe | S | C,J,R | 25 | nur ilvl≥60, tierlos: +1 | | | | |

Slot-Detail s01 M,A,J,B,O; s02 M,A,J,B,O; s03 C,A,J,B,O; s04 A,J,B,O,R. Hinweis: Tier-Bereiche überlappen (z. B. p01 T4 bis 73, T3 ab 70) — zulässig (D-040).

### 7.5 Basiswahl

| Zonentyp | Waffen | Rüstung | Schmuck | Relikt |
|---|---:|---:|---:|---:|
| körperbetont | 45% | 35% | 15% | 5% |
| Magier | 25% | 35% | 35% | 5% |

## 8. Materialien (§8, pro abgeschlossener Begegnung)

| Material | Quellen |
|---|---|
| FORGE_DUST | Verwertung Normal 1, Magisch 2–3; normale Dungeonbegegnung +2 |
| ARCANE_SHARD | Verwertung Magisch 1, Rare 2–3; Boss +3 |
| ESSENCE | Elite 40% ×1; Boss 1 garantiert; Riftboss 1–2 |
| CHAOS_FRAGMENT | Boss 18%; Riftboss 35% |
| SEAL_STONE | Boss 10%; Riftboss 20% |
| VOID_ASH | Riftboss 12%; gefährlicher Endgameboss 30% |
| SOCKET_CORE | Elite 4%; Boss 12%; Riftboss 20% |
| CORRUPTION_CORE | Riftboss 5%; Pinnacle 20%; 20 VOID_ASH → 1 |
| RUNE_FRAGMENT | Elite 20%; Boss 60%; Riftboss 100%; 10 → zufällige Rune I |
| BOSS_SIGIL | 2 garantiert vom Endgameboss (nicht Dungeonboss); 36 → Boss-Unique-Tausch (= 18 Siege) |

Endgame-Spezialisierung: Menge max +50%, nie Sigil-Verdopplung. Essenz-Konvertierung 3:1.

## 9. Crafting-Kosten

| Rezept | Dust | Shard | Essence | Chaos | Seal | Void Ash | Sonst |
|---|---:|---:|---:|---:|---:|---:|---|
| Prägen | 4 | 1 | | | | | |
| Anreichern | | 2 | | | | | |
| Selten erheben | | 7 | 1 | | | | |
| Neuschmieden | | 4 | | 1 | | | |
| Ergänzen | | 3 | 1 | | | | |
| Präzise Essenz | | 4 | 3 | | | | |
| Entfernen | | 4 | | | | 1 | |
| Tier nachschmieden | | | 2 | | 1 | | |
| T1-Vollendung | | | 5 | | 3 | 2 | ilvl≥80 |
| Werte verfeinern | 5 | 1 | | | | | |
| Affix versiegeln | | 8 | | | 3 | | |
| Sockel setzen | 4 | | | | | | 1 Socket Core |
| Rune lösen | 3 | | | | | | |
| Korruptionsritual | | | | | | 5 | 1 Corruption Core, ilvl≥70 |

Korruption: 45% Enchant (+5–10%), 30% +1 Tier (Unique: +5% auf einen Roll), 20% negativ (−10% maxHP oder −15% eine Res), 5% fractured.

## 10. Runen (§9)

| Rune | I | II | III |
|---|---:|---:|---:|
| Angriff (Attack Damage) | +4% | +6% | +9% |
| Schutz (Armor) | +4% | +6% | +9% |
| Leben (HP flach) | +20 | +32 | +48 |
| Glut / Frost / Sturm / Schatten | +5% | +8% | +12% |
| Klinge (Bleed) / Seuche (Poison) | +3% | +5% | +7% |
| Fokus (Spell) | +5% | +8% | +12% |
| Puls (Mana-Regen) | +2% | +3% | +4% |
| Glück (MF) | +3% | +5% | +7% |

Kombinationen (nur 2-Sockel-2H, beide III, Reihenfolge fix): Glut→Sturm 8% Chance Blitzentladung 35% des auslösenden Schadens, max 1/s; Klinge→Seuche 10% Chance 1 Gift-Stack bei eigenem Blutungstreffer, max 1/s; Schutz→Leben +5% maxHP, −5% Schaden; Fokus→Puls +5 Mana bei Spell-Crit, max 1/s.

## 11. Statuseffekte (§10.1)

| Status | Wert | Dauer | Max Stacks | Schadensart / Mitigation |
|---|---|---:|---:|---|
| Blutung | 22% roher Auslöse-Attack-Schaden je Stack (gesamt) | 5 s | 5 | physisch, Armor beim Tick |
| Gift | 30% roher Trefferschaden je Stack | 6 s | 5 | Schatten, Schattenres |
| Brennen | 36% roher Feuer-Trefferschaden je Stack | 4 s | 3 | Feuer, Feuerres |
| Frost (Slow) | −15% actionSpeed | 4 s | 1 (Refresh) | — |
| Verwundbar | +8% increased damage taken | 4 s | 2 | — |
| Fluch | −12pp Res einer Art | 5 s | gesamt ≤ −25pp | — |
| Stun | — | Boss ≤0.8 s/8 s, normal ≤1.5 s/8 s | — | — |

Pro-Tick bei 1-s-Ticks (Vorschlag D-025): Blutung 4.4%/Tick ×5, Gift 5%/Tick ×6, Brennen 9%/Tick ×4.

## 12. Trigger-Budgets (§10)

| Budget | Wert |
|---|---:|
| Rekursionstiefe | 3 |
| Effekte je Root-Action | 8 |
| Effekte je Entity je Sekunde | 12 |
| je `effectId` je Root-Event | 1 |
| Überschreitung | Event `TRIGGER_SUPPRESSED` + Telemetrie |

## 13. Ökonomie

| Posten | Wert |
|---|---|
| Stash | 4×12 je Tab; Tab 1 frei; Tabs 2–5: 1 000 / 5 000 / 20 000 / 60 000 Gold |
| Inventar | 60 Slots |
| Materialtasche | unbegrenzt |
| Backups | 3 Snapshots |
