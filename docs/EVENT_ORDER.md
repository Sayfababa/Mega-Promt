# EVENT_ORDER — Scheduler und Schadensauflösung

Quelle: Spec §3.2, §3.3, §10, §10.1, Anhang A.3. Verbindliche Spec-Regeln sind mit **[Spec]** markiert; Präzisierungen, die die Spec offen lässt, mit **[D-xxx]** (Status siehe `DECISIONS.md`). Ziel: jede Simulation ist bei gleichem Seed + Zustand + `configVersion` bitidentisch, Fast-forward ≡ normaler Replay.

## 0. Grundlagen

| Thema | Regel | Quelle |
|---|---|---|
| Zeit | ganzzahlige Millisekunden; Tick = 100 ms; `t ∈ {0, 100, 200, …}` | [Spec §10], D-003 |
| Sichtbare Runde | 10 Ticks = 1 s; nur Präsentation | [Spec §10, A.3.5] |
| Zahlen | Fließkomma (IEEE-754 double) bis zur Mitigationsgrenze; finaler Schaden/Heilung `roundHalfUp`, Schaden min 1 | D-003, [Spec §3.1] |
| RNG | `mulberry32`; Kampf-Substream `combat.<n>` je Kampf n (xmur3-Hash aus Seed+Label) | D-002, [Spec §10 „pro Kampf neue RNG-Subseed“] |
| Max-Dauer | 90 000 ms; Endgameboss (inkl. Riftboss, D-008) 150 000 ms | [Spec §10] |
| Entity-Ordnung | `initiativeOrder`: DEX absteigend → Spieler vor Monster → stabile Entity-ID aufsteigend | [Spec §10] |

Entity-IDs: Spieler `p0`, Minions `p0.m<k>` (Spawn-Reihenfolge), Monster `e<slot>` (Encounter-Slot 0…2). Monster-Initiative: Feld `initiative` (D-059).

## 1. Kampfstart (t = 0)

1. `COMBAT_START` {seed, configVersion, entities, initiativeOrder}
2. Passive/Aura-Effekte, Start-Barrieren (z. B. Leerenfürstin 25% HP) anwenden — ohne Trigger-Auslösung **[D-060]**
3. Phase 6 (Aktionswahl) für alle Entities in `initiativeOrder`. Beide Seiten sind bei t = 0 verfügbar; kein Bonus-Erstschlag **[Spec]**

## 2. Tick-Phasen (jeder Tick t, in genau dieser Reihenfolge)

Spec-Reihenfolge **[Spec §10]**: Timer → DoT (Sekundengrenze) → Todesfälle → Action-Enden → Reaktionen → nächste Aktion → Eventlog.

| # | Phase | Inhalt | Ordnung innerhalb der Phase |
|---:|---|---|---|
| 1 | Timer | Status-Dauer ablaufen (`STATUS_EXPIRE`), Cooldowns frei, GCD-Ende, Barriere-Verfall (8 s ohne Gewinn), Buff-Ende. Ablauf bei `expiresAt ≤ t` | Entities in `initiativeOrder`; je Entity Status nach `appliedSeq` aufsteigend |
| 2 | DoT/Regen (nur `t % 1000 == 0`, t > 0) | a) DoT-Ticks (`STATUS_TICK` + `DAMAGE`), b) Todesprüfung, c) HP-/Mana-Regeneration **[D-071]** | DoTs nach **Quell**-Entity in `initiativeOrder`, dann `appliedSeq`. Nach jedem DoT-Schaden sofort Todesprüfung (§4) |
| 3 | Todesfälle | `DEATH` für HP ≤ 0; Kampfende-Prüfung | `initiativeOrder` |
| 4 | Action-Enden | alle Actions mit `resolveAt ≤ t`: `ACTION_RESOLVE` → Schadenspipeline (§3) → Trigger-Queue (§5) | `resolveAt` (exakte ms) aufsteigend → `initiativeOrder` |
| 5 | Reaktionen | Reaktions-Queue FIFO: Konter (Vergeltung, Torwächter), Reflexion (Dornenpakt), Block-Effekte | Einfüge-Reihenfolge; zählen zum Budget ihres Root-Events |
| 6 | Aktionswahl | für jede lebende, nicht handelnde Entity ohne GCD/Stun: APL auswerten → `ACTION_BEGIN` | `initiativeOrder` |
| 7 | Abschluss | Timeout-Prüfung (`t ≥ maxMs` → `TIMEOUT`, dann `DEFEAT`); Events des Ticks an Log anhängen; optional `TICK`-Event (nur Debug, nicht im Snapshot) | — |

**Kampfende:** Sobald nach einer Todesprüfung alle Gegner tot sind → `VICTORY`; ist der Spieler tot → `DEFEAT`. Der Kampf endet **sofort** an dieser Stelle; nachfolgende Phasen/Ereignisse desselben Ticks werden nicht mehr verarbeitet **[D-060]**. Damit entscheidet die Verarbeitungsreihenfolge über gleichzeitige Tode (deterministisch, keine Unentschieden). Tote Entities: laufende Action wird verworfen, keine Reaktionen, ihre DoTs ticken weiter bis Kampfende **[D-060]**.

**Timeout:** wird nach Phase 6 geprüft; ein Kill exakt bei `t = maxMs` zählt noch als Sieg.

### 2.1 Aktionszeitmodell

| Größe | Formel | Quelle |
|---|---|---|
| Attack-Dauer | `1000 / APS_eff` ms; `APS_eff = clamp(weaponAPS × (1 + ΣincAPS_global) , 0.40, 2.5)` | [Spec §10, §3.2] |
| Cast-Dauer | `castTimeMs / (1 + castSpeed)` | [Spec §10] |
| Speed-Malus (Frost) | Dauer `/ (1 + ΣactionSpeedMods)`, Frost = −0.15 → ÷0.85 | **[D-068]** |
| Minimum | 400 ms | [Spec] |
| Einfrieren | Dauer bei `ACTION_BEGIN` fix; spätere Buffs wirken ab nächster Aktion | [Spec] |
| Quantisierung | `dueAt = beginAt_exact + round(duration)` in exakten ms; Auflösung im ersten Tick mit `t ≥ dueAt`; nächste Aktion beginnt bei `beginAt_exact = dueAt` (nicht beim Tick) → Langzeit-APS exakt, Jitter < 100 ms | **[D-019]** |
| GCD | `max(350, skillGlobalCooldownMs)`; zählt ab `ACTION_BEGIN`; nächste Aktion frühestens `max(dueAt, beginAt + GCD)` | **[D-018]** (Spec: „nach Action-Ende“) |
| Kosten/Cooldown | Mana-Abzug und Skill-CD-Start bei `ACTION_BEGIN` | **[D-021]** |
| Ressourcenmangel | nächster gültiger Skill, sonst `basicAttack` (0 Mana); optional `wait` ≤ 500 ms | [Spec] |

### 2.2 APL-Auswertung (Phase 6)

Reihenfolge **[Spec §10]**, erste erfüllte Regel gewinnt; jede Regel prüft: Skill ausgerüstet, CD frei, Mana ≥ Kosten, Bedingung wahr, legal.

1. `emergency_heal` — HP < 35%
2. `defensive_barrier` — Barriere < 15% maxHP
3. `short_buff_if_missing` — Buff nicht aktiv
4. `execute_if_target<25%` — Ziel-HP < 25%
5. `best_legal_damage_skill` — höchster erwarteter Schaden/Aktionszeit laut deterministischer Schätzung (ohne RNG); Tie-Break: Spieler-Priorität, dann Skill-ID
6. `default_attack`

Spieler darf Reihenfolge und einfache Bedingungen ändern, keine Skripte.

### 2.3 Zielwahl

MVP: 1 Gegner gleichzeitig (D-005). Mehrere Ziele (später): lebendes Ziel mit höchster `targetPriority`, dann niedrigster Slot.

## 3. Schadensauflösung je Treffer (Phase 4/5)

Spec-Kette **[Spec §3.2]**: Basis-Skillwert → lokale Waffenwerte → Flat → increased → more → Krit → Armor/Res → Block/Barriere/HP → Lebensraub → Status/Trigger. Ausweichen ist der Kette vorgeschaltet **[Spec §3.3, §21 „Dodge/Block unabhängig unter priorisierter Reihenfolge“]**.

| Schritt | Aktion | Event |
|---:|---|---|
| 0 | Ziel lebt? sonst Aktion verpufft (kein RNG-Verbrauch) | `ACTION_RESOLVE{fizzled}` |
| 1 | **RNG-Ziehungen fix:** `rEvade`, `rCrit`, `rBlock` (immer alle drei, auch bei Chance 0) **[D-061]** | — |
| 2 | Ausweichen: `evadable && rEvade < evasionChance` → Ende; keine On-Hit-Effekte, nur On-Evade-Trigger | `EVADE` |
| 3 | Rohschaden je Komponente (phys, fire, cold, lightning, shadow). Attack: `(mean(wMin,wMax)·coef + skillFlat + globalFlat)`; Spell: `(flatBase + INT·coefInt + globalFlatSpell)`. Lokale Waffenwerte sind bereits in `wMin/wMax` | — |
| 4 | `× (1 + ΣapplicableIncreased)` — Summe aller `increased` mit passendem Tag (inkl. STR/INT-Anteil, Skill-Level +7%/Lvl) | — |
| 5 | `× Π(1 + moreGroup)` — je `stackingGroup` ein Faktor | — |
| 6 | Krit (nur direkter Schaden): `rCrit < critChance` → `× min(3.0, 1.5 + ΣcritMultiBonus)` | `CRIT` |
| 7 | Mitigation je Komponente: physisch `× (1 − min(0.70, A/(A + 450 + 25·attackerLevel)))` mit `A = armor × (1 + ΣarmorMods) × (1 − armorPen)` **[D-069]**; elementar `× (1 − clamp(uncappedRes − pen − curses, −0.5, 0.75))` | — |
| 8 | Verteidiger-Modifikatoren: `× (1 + ΣincreasedDamageTaken)` (Verwundbar, Blutgericht), dann Sonder-Reduktionen „nach Resistenz“ (Mantel der Asche) **[D-070]** | — |
| 9 | Block: `blockable && rBlock < blockChance` → `× (1 − blockStrength)` (Standard 0.55, max 0.75) | `BLOCK` |
| 10 | Summe der Komponenten → `roundHalfUp`, min 1 (außer explizite Immunität) = **finaler Schaden** | — |
| 11 | Absorption: Einmal-Absorber (Uraltes Zeichen) → Barriere → HP | `DAMAGE{final, toAbsorb, toBarrier, toHP, overkill}` (+ `BARRIER_BREAK` wenn Barriere → 0) |
| 12 | Lebensraub: `leech = rate × (toBarrier + toHP)` (ohne Overkill), Rate ≤ 0.08, Fenster-Cap 15% maxHP je Sekunde (`floor(t/1000)`-Bucket) **[D-028]**; `roundHalfUp` | `HEAL{source:leech}` |
| 13 | Todesprüfung Ziel; HP-Schwellen → `PHASE_CHANGE` | `DEATH`, `PHASE_CHANGE` |
| 14 | Status-Anwendung (nur wenn Ziel lebt): Chancen-Rolls in Reihenfolge der Skill-Statusliste, je Status 1 RNG-Ziehung; DoT-Snapshot (§6) | `APPLY_STATUS` |
| 15 | Trigger einreihen (on-hit, on-crit, on-block, on-kill, on-barrier-break) → §5 | `TRIGGER` |

Mehrfachtreffer (z. B. Schnellstich 2 Treffer): Schritte 0–15 vollständig je Treffer, nacheinander, im selben `ACTION_RESOLVE`.
Hybrid (Lichtschlag): zwei Komponentenpakete im selben Treffer; Spell-Anteil physisch + `HOLY`, Armor-Mitigation (D-004); Modifikator-Tags D-022.
Heilung: Basis × `(1 + ΣhealPower)` → `roundHalfUp`; Überheilung verfällt; Heilung stellt keine Barriere her **[Spec §3.3]**.
Barriere-Gewinn: `min(maxBarrier, current + gain)`, `maxBarrier ≤ 0.60 × maxHP`; setzt Verfall auf `max(expiresAt, t + (skillDuration ?? 8000))` → `BARRIER_GAIN` **[D-067]**.

## 4. Todesprüfung

- Ausgeführt nach jedem `DAMAGE` (direkt, DoT, Trigger, Reaktion).
- HP ≤ 0 → HP = 0, `DEATH{entity, killer, sourceEvent}`; keine negativen HP/Mana **[Spec §21]**.
- Danach Kampfende-Prüfung (§2). Minions sterben mit ihrem Beschwörer nicht automatisch (offen, Phase 5).

## 5. Trigger-Queue und Budgets **[Spec §10]**

| Regel | Wert |
|---|---|
| Struktur | FIFO-Queue je Root-Event (Breitensuche); jeder Eintrag kennt `rootEventId`, `depth`, `effectId`, `sourceIsTriggered` |
| Rekursionstiefe | max 3 (Root-Action = Tiefe 0) |
| Effekte je Root-Action | max 8 |
| Effekte je Entity je Sekunde | max 12 (Bucket `floor(t/1000)`) **[D-072]** |
| Je `effectId` je Root-Event | max 1 |
| Selbst-Retrigger | Trigger-Schaden löst denselben Trigger nicht erneut aus, außer `allowTriggeredSources = true` |
| Interne Cooldowns | z. B. „max 1/s“, „CD 1s“ → `icdUntil` je (Entity, effectId) |
| Überschreitung | Eintrag verworfen, `TRIGGER_SUPPRESSED{reason, effectId, rootEventId}` + Telemetrie-Zähler |
| Prüfreihenfolge | ICD → effectId/Root → Tiefe → Root-Budget → Entity-Sekunden-Budget |
| Chance-Trigger | RNG-Ziehung erst **nach** bestandener Budgetprüfung (unterdrückte Trigger verbrauchen keinen RNG) **[D-061]** |
| Echo / Doppelgift | `echo` kann kein Echo auslösen; `doublePoison` respektiert Stack-Cap und Budget **[Spec §11.2]** |
| Minions | keine Summon-Trigger durch Minions |

Trigger-Treffer durchlaufen die Schadenspipeline §3 (eigene RNG-Ziehungen), mit `isTriggered = true`.

## 6. Statuseffekte (§10.1)

| Status | Anwendung | Tick | Stacks / Refresh |
|---|---|---|---|
| Blutung | Attack-Event mit `BLEED`-Chance; Snapshot = 22% des rohen auslösenden Attack-Schadens (vor Krit, D-027) | gesamt über 5 s; physisch, Armor beim Tick | max 5, unabhängig; bei vollem Stack ersetzt der neue den ältesten **[D-024]** |
| Gift | `POISON_APPLY`; 30% roher Trefferschaden | über 6 s; Schatten, Schattenres | max 5 (+ Boni z. B. Toxischer Schwur +2) |
| Brennen | 36% roher Feuer-Trefferschaden | über 4 s; Feuer, Feuerres | max 3 |
| Frost | −15% actionSpeed | 4 s | max 1; Refresh der Dauer, keine Addition |
| Verwundbar | +8% increased damage taken | 4 s | max 2 |
| Fluch | −12pp Res einer Art | 5 s | Summe aller Flüche ≥ −25pp |
| Stun | Aktionssperre | — | Boss ≤ 0.8 s je 8 s, normal ≤ 1.5 s je 8 s (gleitendes Fenster) |

DoT-Regeln:
- **Snapshot** bei Anwendung: Rohwert inkl. Angreifer-Offensivboni, ohne Zielverteidigung **[Spec]**; keine erneute Anwendung von `increased` beim Tick (A.3.4, D-026).
- **Tick-Raster** (D-025): DoTs ticken an globalen Sekundengrenzen (`t % 1000 == 0`). Ein Stack mit Dauer D s hat genau D Ticks, erster Tick an der ersten Sekundengrenze nach Anwendung; Tickwert = Snapshot / D.
- **Tick-Pipeline**: Snapshot/D → Zielmitigation (Armor mit `attackerLevel` der Quelle bzw. Res inkl. Flüche) → `increasedDamageTaken` → `roundHalfUp`, min 1 → Barriere (DoT trifft Barriere, außer `bypassesBarrier`) → HP. Kein Krit (außer explizit DoT-Crit), kein Ausweichen, kein Block, kein Lebensraub, keine On-Hit-Trigger.
- Reapplikation erneuert nicht automatisch andere Stacks.
- Skill wendet DoT entweder direkt (festes Budget) oder proportional an, nicht beides ohne Budget.
- Bluternte: zählt eigene aktive Bleed-Stacks am Ziel **vor** Schritt 3, entfernt sie (`STATUS_EXPIRE{reason:consumed}`), Restschaden der Stacks verfällt; Bluternte selbst wendet keine Blutung an **[D-023]**.

## 7. RNG-Verbrauch (Determinismus)

| Kontext | Substream-Label | Reihenfolge |
|---|---|---|
| Kampf n eines Runs | `combat.<n>` | je Treffer: rEvade, rCrit, rBlock; dann Status-Rolls in Listenreihenfolge; Trigger-Chance nach Budgetprüfung |
| Item-Anzahl je Begegnung | `loot.count` | 1 Ziehung je Begegnung |
| Basiswahl | `loot.base` | Kategorie, dann Basis |
| Qualität/Rarität | `loot.quality` | 1 Ziehung je Item (MF verändert nur Schwellen) |
| Affixe | `loot.affix` | je Affix: Seite, Familie, Tier, Werte |
| itemLevel | `loot.ilvl` | 1 Ziehung je Item |
| Materialien | `loot.mat` | feste Materialreihenfolge |
| Crafting | `craft.<itemId>.<craftSeq>` | gemäß Rezept |

Substream-Ableitung (D-002): `subSeed = xmur3(`${seed}:${label}`)()` → `mulberry32(subSeed)`. Folge: Magic Find verschiebt nie Tier-/Affix-Rolls **[Spec §21]**.

## 8. Event-Typen

Spec-Liste **[Spec §10]**:

| Event | Payload (Mindestfelder) |
|---|---|
| `COMBAT_START` | seed, configVersion, entities, initiativeOrder |
| `TICK` | t (nur Debug/optional) |
| `ACTION_BEGIN` | actor, skillId, targetId, beginAt, dueAt, manaCost |
| `ACTION_RESOLVE` | actor, skillId, fizzled |
| `DAMAGE` | source, target, skillId/statusId, components, final, toAbsorb, toBarrier, toHP, overkill, isCrit, isDot, isTriggered, tags |
| `HEAL` | source, target, amount, kind (leech/skill/regen) |
| `BLOCK` | defender, attacker, blockedAmount |
| `EVADE` | defender, attacker |
| `CRIT` | attacker, target, multiplier |
| `APPLY_STATUS` | source, target, statusId, stacks, snapshot, expiresAt |
| `STATUS_TICK` | statusId, target, stackSeq |
| `STATUS_EXPIRE` | statusId, target, reason (timeout/consumed/replaced) |
| `TRIGGER` | effectId, rootEventId, depth |
| `DEATH` | entity, killer |
| `PHASE_CHANGE` | entity, phase |
| `VICTORY` / `DEFEAT` / `TIMEOUT` | t |

Ergänzungen (D-064): `TRIGGER_SUPPRESSED` (in Spec §10 genannt, fehlt in Liste), `BARRIER_GAIN`, `BARRIER_BREAK`, `RESOURCE` (Mana-Änderung, optional).

Jedes Event: `seq` (fortlaufend), `t` (ms). Replay-Identität: `seed + configVersion + actionLog + eventHash` (Hash über kanonisches JSON der Events, D-076).
