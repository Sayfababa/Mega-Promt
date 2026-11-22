# DARKFORGE — Asset-Liste (Bilder)

Stand: abgeleitet aus den Content-Daten in `src/content/**` und `src/engine/**` (contentVersion des Vertical Slice).
Diese Liste ist die verbindliche Vorlage für alle Bilder, die später von Hand eingefügt werden.
Fehlt ein Bild, zeigt die App einen Fallback-Platzhalter an — das Spiel bleibt vollständig spielbar.

**Konvention:** Jede Content-Definition hat ein Feld `icon` (z. B. `monsters/boss_gravelord`), Dungeons zusätzlich `background`.
Dateipfad = `public/assets/<icon>.webp` (PNG als Alternative erlaubt, gleicher Name, Endung `.png`). Die App lädt `/assets/<icon>.webp`.
Pfade in den Tabellen sind relativ zu `public/assets/` und ohne Endung angegeben.

**Prioritäten**

| Stufe | Bedeutung |
|---|---|
| **P1** | Im Vertical Slice sichtbar (Wächter, Das Verlassene Tor, Verfallene Krypta, Slice-Basen, erreichbare Materialien). |
| **P2** | Existiert in den Daten, ist im Slice aber nicht spielbar/erreichbar (gesperrte Klassen, Endgame-Uniques, Rift-Probe, Nicht-Slice-Basen). |
| **P3** | Zukunft (in der Spezifikation genannt, noch nicht in den Daten). Pfade sind **Vorschläge**. |

Mit *(Vorschlag)* markierte Pfade stehen noch nicht als `icon` in den Daten; sie sind so gewählt, dass der Lead sie 1:1 übernehmen kann.

---

## 1. Stil-Leitfaden

### 1.1 Grundton
- **Dark Fantasy**, ernst, verwittert, handwerklich. Eine Welt aus Rost, Asche, Knochen und kaltem Stein; Magie wirkt gefährlich und teuer, nicht verspielt.
- **Handgemalter Painterly-Look**: sichtbare, aber kontrollierte Pinselstruktur, keine Fotorealistik, kein Cel-Shading, kein Pixel-Art, kein glatter 3D-Render-Look.
- **Starke Silhouetten**: Jedes Motiv muss als reine Schwarzfläche bei 32 px eindeutig erkennbar sein (Silhouetten-Test).
- **Eigenständigkeit (Pflicht, spec §0)**: Keine Anlehnung an Designs, Namen, Symbole, Rahmen oder Farbschemata von Diablo, Path of Exile oder Shakes & Fidget. Keine bekannten Runen-/Glyphen-Alphabete abmalen, keine ikonischen Waffen/Helme anderer Spiele nachbilden.

### 1.2 Palette
| Rolle | Farbe | Richtwert |
|---|---|---|
| Grund/Schatten | Schwarz, Tiefanthrazit | `#0d0c0b` – `#1c1a18` |
| Metall/Erde | Rostbraun | `#5a2e1a` – `#8a4a2a` |
| Licht/Knochen | Knochenweiß | `#d9cfb8` – `#efe6d2` |
| Verfall/Gift | Ölgrün | `#3f4a2a` – `#5e6b3a` |
| Akzent | Gold (sparsam, max. ~10 % der Fläche) | `#c9a14a` – `#e0bb5c` |

Elementare Akzente nur, wo das Motiv es verlangt: Feuer = Glutorange `#d0662a`, Frost = Graublau `#7d9bb0`, Blitz = fahles Gelbweiß `#e8e2a6`, Schatten = Violettschwarz `#3a2a4a`, Blut = Dunkelkarmin `#7a1418`.

### 1.3 Seltenheitsfarben (spec §16)
| Seltenheit | Farbe | Richtwert |
|---|---|---|
| Normal | hellgrau | `#b8b4ac` |
| Magisch | blau | `#4f7fd9` |
| Selten | goldgelb | `#e3c04a` |
| Unique | bernstein | `#d9822b` |
| Korrupt | violett (Zusatzindikator, nicht Ersatz) | `#8a4fc9` |

Seltenheit steckt **nur im Rahmen** (siehe §3.13), **nie im Item-Icon selbst** — ein Item-Icon wird für alle Seltenheiten wiederverwendet. Uniques haben eigene Motive. Die UI ergänzt Farbe immer durch Textlabel (spec §16).

### 1.4 Technische Regeln
- **Lichtrichtung einheitlich: oben links** (Schlaglicht ca. 45°), Schatten fällt nach unten rechts. Gilt für Icons, Portraits und Hintergründe.
- **Icons**: Motiv zentriert, **8 px Rand** auf 128×128 (nutzbare Fläche 112×112), leicht diagonal (Klingen von unten links nach oben rechts), transparenter Hintergrund, keine Bodenschatten außerhalb des Motivs, keine Vignette.
- **Kein Text, keine Zahlen, keine Buchstaben, keine Wasserzeichen im Bild.** Die Wortmarke (Logo) ist die einzige Ausnahme.
- **Portraits**: Monster blicken **nach links** (zum Helden), Klassenfiguren blicken **nach rechts** (zum Gegner). Füße/Unterkante dürfen angeschnitten sein, Kopf nie.
- **Hintergründe**: Bildmitte dunkel und ruhig (UI-Lesbarkeit für Balken, Zahlen, Log), Details und Lichtquellen an den Rändern; Bodenlinie bei ca. 75 % Bildhöhe, damit Figuren links/rechts „stehen“.
- **Format**: WebP (verlustbehaftet Qualität 85–90 für Hintergründe, verlustfrei oder Q 95 mit Alpha für Icons/Portraits). PNG-24/32 als Alternative. sRGB, keine eingebetteten Profile nötig.
- **Dateinamen**: Kleinbuchstaben, `snake_case`, exakt wie in der Tabelle.

### 1.5 Konsistenzhinweise
1. Zuerst einen **Referenzsatz** anlegen: 1 Waffe (`items/weapons/shortsword`), 1 Rüstung (`items/armour/chest_plate`), 1 Monster (`monsters/gate_ravager`), 1 Hintergrund (`backgrounds/forsaken_gate`). Alle weiteren Bilder mit diesen als Stil-Referenz erzeugen.
2. Gleiche Prompt-Vorlage, gleicher Negativ-Prompt, gleiches Modell/Seed-Schema je Kategorie; nur das Motiv austauschen.
3. Items gleicher Familie (z. B. alle Helme) mit gleichem Blickwinkel (Dreiviertel von vorn links) und gleicher Größe im Rahmen.
4. Material-Lesbarkeit: Platte = kaltes, gehämmertes Eisen mit Rost; Leder = dunkel gegerbt, Nähte; Stoff = grobes Leinen/Wolle, Flicken. Gilt für Helm, Brust, Handschuhe, Stiefel gleichermaßen.
5. Monster einer Zone teilen Farbstimmung: Tor = Rost/Asche/Glut, Krypta = Ölgrün/Knochen/Schattenviolett, Abgrund = Violettschwarz mit kaltem Rand-Licht.
6. Goldakzent sparsam: nur an Wertvollem (Uniques, Gold, Bossdetails, UI-Kanten).
7. Fertige Icons bei 32 px gegen den Panel-Hintergrund prüfen; ggf. Kontur (1–2 px dunkler Außenrand) nachziehen.
8. Tier-Stufen einer Basis (Rost-, Eisen-, Stahl-, Meister-, Abgrund-, Ur-) teilen **ein** Icon; die App kann Tiers per Rahmen/Label unterscheiden.

### 1.6 Prompt-Vorlage für Bild-KIs

**Deutsch (Icon):**
```
Handgemaltes Dark-Fantasy-Spielicon, painterly, [MOTIV], zentriert, starke klare Silhouette,
Lichtquelle oben links, gedeckte Palette aus Schwarz, Rostbraun, Knochenweiß und Ölgrün mit
sparsamen Goldakzenten, verwitterte Oberflächen, transparenter Hintergrund, 8 Pixel Rand,
quadratisch 128x128, kein Text, keine Buchstaben, keine Zahlen, kein Rahmen
```

**Englisch (Icon):**
```
Hand-painted dark fantasy game icon, painterly style, [SUBJECT], centered, strong clear silhouette,
light from top left, muted palette of black, rust brown, bone white and oil green with sparse gold
accents, weathered surfaces, transparent background, 8 pixel padding, square 128x128,
no text, no letters, no numbers, no frame
```

**Deutsch (Portrait/Monster):**
```
Handgemaltes Dark-Fantasy-Charakterportrait, painterly, [MOTIV], Dreiviertelansicht mit Blick nach
[links|rechts], Hüftbild, dramatisches Licht von oben links, gedeckte Palette Schwarz/Rostbraun/
Knochenweiß/Ölgrün, Goldakzent, freigestellt auf transparentem Hintergrund, kein Text
```

**Englisch (Portrait/Monster):**
```
Hand-painted dark fantasy character portrait, painterly, [SUBJECT], three-quarter view facing
[left|right], waist-up, dramatic light from top left, muted palette black/rust brown/bone white/
oil green, gold accent, isolated on transparent background, no text
```

**Deutsch (Hintergrund):**
```
Handgemalte Dark-Fantasy-Kampfszene als Hintergrund, painterly, [ORT], Breitbild 16:9, Bildmitte
dunkel und ruhig für UI, Details und Lichtquellen an den Rändern, Bodenlinie im unteren Viertel,
Licht von oben links, gedeckte Palette, atmosphärischer Dunst, keine Figuren, kein Text
```

**Englisch (Hintergrund):**
```
Hand-painted dark fantasy battle backdrop, painterly, [LOCATION], widescreen 16:9, dark calm
center for UI readability, detail and light sources at the edges, ground line in the lower
quarter, light from top left, muted palette, atmospheric haze, no characters, no text
```

**Negativ-Prompt (beide Sprachen gleich verwenden):**
```
text, letters, watermark, signature, logo, UI, frame, border, photo, photorealistic, 3d render,
cel shading, pixel art, anime, chibi, cartoon, neon, oversaturated, busy background,
Diablo, Path of Exile, Shakes and Fidget
```

---

## 2. Größen-Übersicht

| Kategorie | Datei-Größe | Anzeige | Transparenz |
|---|---|---|---|
| Item-, Skill-, Status-, Material-, Passiv-Icons | 128×128 | 64 / 32 px | ja |
| Unique-Icons (eigenes Motiv) | 128×128 | 64 / 32 px | ja |
| Monster-Portraits (normal/elite) | 512×512 | Kampfansicht rechts, Blick nach links | ja |
| Boss-Portraits | 768×768 | Kampfansicht rechts, Blick nach links | ja |
| Klassen-Portrait | 512×512 | Charakterauswahl, Kampf links | ja |
| Klassen-Ganzkörper (Papierfigur) | 512×1024 | Charakterbildschirm, Blick nach rechts | ja |
| Dungeon-Hintergrund | 1920×1080 | Kampfszene | nein |
| Dungeon-Karten-Thumbnail | 480×270 | Dungeonauswahl | nein |
| UI-Assets | siehe §3.13 | — | meist ja |

---

## 3. Asset-Tabellen

### 3.1 Klassen — `src/content/classes/classes.ts`

Portrait = `icon` aus den Daten. Ganzkörperfigur = *(Vorschlag)* `classes/<id>_full`.

| Pfad | Was es zeigt | Format/Größe | Transp. | Prio |
|---|---|---|---|---|
| `classes/guardian` | Wächter: vernarbter Krieger mit eingedelltem Kesselhelm, Kettenkragen und rostroter Schärpe, Kurzschwert über der Schulter, Blick nach rechts. | WebP 512×512 | ja | P1 |
| `classes/guardian_full` *(Vorschlag)* | Wächter in voller Figur: Plattenbrust über Gambeson, Rundschild mit gehämmertem Eisenbuckel am linken Arm, Kurzschwert gesenkt, breiter Stand, Blick nach rechts. | WebP 512×1024 | ja | P1 |
| `classes/arcanist` | Arkanist: hagere Gestalt in aschgrauer Robe, schwebende Splitter aus kaltem Licht kreisen um eine erhobene, tintenfleckige Hand. | WebP 512×512 | ja | P2 |
| `classes/shadowrunner` | Schattenläufer: vermummte Gestalt mit Halbmaske aus geschwärztem Leder, zwei kurze Klingen rückwärts gehalten, Ölgrün-Schimmer an den Schneiden. | WebP 512×512 | ja | P2 |
| `classes/necromancer` | Nekromant: Gestalt mit Kapuze aus vernähten Leichentüchern, ein Ritualzepter aus Wirbelknochen, fahl-grüner Atemhauch. | WebP 512×512 | ja | P2 |
| `classes/runesmith` | Runenschmied: breitschultrige Schmiedin mit Lederschürze und rußigen Unterarmen, glühende Gravurlinien auf einer Klinge, Zange am Gürtel. | WebP 512×512 | ja | P2 |
| `classes/inquisitor` | Inquisitor: hochgeschlossener Mantel mit Messingschließen, Kettenzepter mit Laternenkopf, strenges Gesicht im Seitenlicht. | WebP 512×512 | ja | P2 |
| `classes/arcanist_full` *(Vorschlag)* | Arkanist in voller Figur, Robe bis zum Boden, Zauberstab in der rechten Hand, Blick nach rechts. | WebP 512×1024 | ja | P3 |
| `classes/shadowrunner_full` *(Vorschlag)* | Schattenläufer in geduckter Sprunghaltung, Dolche gezogen, Blick nach rechts. | WebP 512×1024 | ja | P3 |
| `classes/necromancer_full` *(Vorschlag)* | Nekromant stehend, Zepter erhoben, Knochenamulette am Gürtel, Blick nach rechts. | WebP 512×1024 | ja | P3 |
| `classes/runesmith_full` *(Vorschlag)* | Runenschmiedin mit Runenklinge und kleinem Amboss-Anhänger, Blick nach rechts. | WebP 512×1024 | ja | P3 |
| `classes/inquisitor_full` *(Vorschlag)* | Inquisitor im langen Mantel, Laternenzepter vorgestreckt, Blick nach rechts. | WebP 512×1024 | ja | P3 |

### 3.2 Skills — `src/content/skills/guardian.ts`

| Pfad | Was es zeigt | Format/Größe | Transp. | Prio |
|---|---|---|---|---|
| `skills/basic_attack` | Schlichte Schwertklinge, die eine helle Bogenspur von links oben nach rechts unten zieht. | WebP 128×128 | ja | P1 |
| `skills/g_cleave` | Breite Klinge mitten im Schwung, an der Schneide reißt ein Fächer aus dunkelroten Tropfen ab. | WebP 128×128 | ja | P1 |
| `skills/g_shieldwall` | Frontaler Rundschild, hinter dem eine durchscheinende Wand aus knochenweißem Licht aufsteigt. | WebP 128×128 | ja | P1 |
| `skills/g_bloodharvest` | Gekrümmte Sichelklinge, die drei Blutstropfen wie an einem Faden zu sich heranzieht. | WebP 128×128 | ja | P1 |
| `skills/g_armorbreak` | Gepanzerte Faust, unter der eine rostige Brustplatte sternförmig zerspringt. | WebP 128×128 | ja | P1 |
| `skills/g_battlefury` | Zwei gekreuzte Klingen vor einer pulsierenden Glutaura, Funken schlagen nach oben. | WebP 128×128 | ja | P1 |
| `skills/g_lastbulwark` | Gesprungener Schild, durch dessen Riss warmes goldenes Licht wie ein Herzschlag dringt. | WebP 128×128 | ja | P1 |

### 3.3 Passive Knoten (Talentbaum) — `src/content/passives/guardian.ts`

Die Knoten haben noch kein `icon`-Feld; *(Vorschlag)* `passives/<id>`. Das Motiv sitzt **innerhalb** des Talentknoten-Rahmens (§3.13), daher mittig mit eher 16 px Rand.

| Pfad | Was es zeigt | Format/Größe | Transp. | Prio |
|---|---|---|---|---|
| `passives/g_root` *(Vorschlag)* | Erhobene Hand über einem Schwertgriff, Schwurgeste (Eid des Wächters). | WebP 128×128 | ja | P1 |
| `passives/g_s_hp` *(Vorschlag)* | Vernarbter Unterarm mit straff gewickelter Bandage (Zähigkeit). | WebP 128×128 | ja | P1 |
| `passives/g_s_regen` *(Vorschlag)* | Aufsteigender kalter Atemhauch vor einem Helmvisier (Atemtechnik). | WebP 128×128 | ja | P1 |
| `passives/g_s_phys` *(Vorschlag)* | Angespannter Schwertarm im Profil, Faust um den Griff (Schwertarm). | WebP 128×128 | ja | P1 |
| `passives/g_s_bleed` *(Vorschlag)* | Klingenstück mit grob gezahnter, rostiger Schneide (Gezahnte Klinge). | WebP 128×128 | ja | P1 |
| `passives/g_m_bleed` *(Vorschlag)* | Bronzene Aderlass-Schale, in die ein feiner roter Faden rinnt (Aderlass). | WebP 128×128 | ja | P1 |
| `passives/g_s_speed` *(Vorschlag)* | Drei parallele, sich überlappende Schnittspuren in Luftschlieren (Rasche Hiebe). | WebP 128×128 | ja | P1 |
| `passives/g_k_bloodcourt` *(Vorschlag)* | Richterwaage aus Eisen, eine Schale mit Blut gefüllt, die andere leer und nach oben gekippt (Blutgericht). | WebP 128×128 | ja | P1 |
| `passives/g_k_berserker` *(Vorschlag)* | Gesprungene Helmmaske mit glühenden Augenschlitzen und zerbissenen Riemen (Wüterich). | WebP 128×128 | ja | P1 |
| `passives/g_s_armor` *(Vorschlag)* | Haut, die an den Rändern in genietete Eisenschuppen übergeht (Eisenhaut). | WebP 128×128 | ja | P1 |
| `passives/g_s_block` *(Vorschlag)* | Unterarm in Lederriemen hinter einem Schildrand, von der Seite gesehen (Schildarm). | WebP 128×128 | ja | P1 |
| `passives/g_m_shield` *(Vorschlag)* | Schild mit drei eingeschlagenen Pfeilspitzen, unbeschädigt dahinter (Schildmeister). | WebP 128×128 | ja | P1 |
| `passives/g_s_res` *(Vorschlag)* | Gestiefelter Fuß fest auf Stein, umweht von Asche, Frostkristallen und Funken (Standhaftigkeit). | WebP 128×128 | ja | P1 |
| `passives/g_k_ironheart` *(Vorschlag)* | Anatomisches Herz aus geschmiedetem Eisen mit Nieten und einem schweren Schloss (Eisenherz). | WebP 128×128 | ja | P1 |

### 3.4 Statuseffekte — `src/engine/combat/simulate.ts`

*(Vorschlag)* `status/<id>`. Klein und plakativ, da Anzeige meist 32 px; kräftiger dunkler Außenrand.

| Pfad | Was es zeigt | Format/Größe | Transp. | Prio |
|---|---|---|---|---|
| `status/bleed` *(Vorschlag)* | Einzelner schwerer Blutstropfen mit kleinem Riss darüber. | WebP 128×128 | ja | P1 |
| `status/poison` *(Vorschlag)* | Ölgrüne Blase, die aus einer zersetzten Wunde aufsteigt und platzt. | WebP 128×128 | ja | P1 |
| `status/burn` *(Vorschlag)* | Verkohltes Holzstück mit züngelnder Glutflamme. | WebP 128×128 | ja | P2 |
| `status/chill` *(Vorschlag)* | Raureif-Kristall, der sich spiralförmig um eine Sanduhr legt. | WebP 128×128 | ja | P2 |
| `status/vulnerable` *(Vorschlag)* | Brustplatte mit einem offenen, hell umrandeten Loch in der Mitte. | WebP 128×128 | ja | P2 |
| `status/curse` *(Vorschlag)* | Violettschwarzes, halb geöffnetes Auge in einem Kreis aus Rauch. | WebP 128×128 | ja | P2 |
| `status/shieldwall` *(Vorschlag)* | Drei hochkant überlappende Schilde als geschlossene Wand. | WebP 128×128 | ja | P1 |
| `status/battlefury` *(Vorschlag)* | Gebleckte Zähne über einer aufflackernden Glutlinie. | WebP 128×128 | ja | P1 |
| `status/armorbreak` *(Vorschlag)* | Gesprungener Schulterpanzer, ein Stück bricht nach unten ab. | WebP 128×128 | ja | P1 |

### 3.5 Materialien — `src/engine/types.ts` (`MATERIAL_IDS`)

*(Vorschlag)* `materials/<ID klein>`. P1 = fällt im Slice (Verwertung, normale Begegnung oder Dungeonboss, siehe `src/content/balance.ts`), P2 = nur Rift-/Endgame-Quelle.

| Pfad | Was es zeigt | Format/Größe | Transp. | Prio |
|---|---|---|---|---|
| `materials/forge_dust` *(Vorschlag)* | Kleines Häufchen grauschwarzer Feilspäne mit einzelnen glimmenden Körnern. | WebP 128×128 | ja | P1 |
| `materials/arcane_shard` *(Vorschlag)* | Spitzer, trüb-bläulicher Kristallsplitter mit innerem Lichtfaden. | WebP 128×128 | ja | P1 |
| `materials/essence` *(Vorschlag)* | Bauchiges Glasfläschchen mit Wachssiegel, darin träge wirbelnder bernsteinfarbener Nebel. | WebP 128×128 | ja | P1 |
| `materials/chaos_fragment` *(Vorschlag)* | Unregelmäßiger Steinbrocken, dessen Bruchkanten sich in verschiedene Richtungen zu verschieben scheinen. | WebP 128×128 | ja | P1 |
| `materials/seal_stone` *(Vorschlag)* | Flacher Flussstein mit eingedrücktem Wachssiegel und umwickelter Schnur. | WebP 128×128 | ja | P1 |
| `materials/void_ash` *(Vorschlag)* | Handvoll violettschwarzer Asche, die nach oben statt nach unten rieselt. | WebP 128×128 | ja | P2 |
| `materials/socket_core` *(Vorschlag)* | Ringförmiger Eisenkern mit leerer, glatt polierter Fassung in der Mitte. | WebP 128×128 | ja | P1 |
| `materials/corruption_core` *(Vorschlag)* | Pulsierender Klumpen aus dunklem Glas, von violetten Adern durchzogen und mit Rost verkrustet. | WebP 128×128 | ja | P2 |
| `materials/rune_fragment` *(Vorschlag)* | Abgebrochene Ecke einer Steintafel mit einer halb sichtbaren, frei erfundenen eingeritzten Linie (keine echte Schrift). | WebP 128×128 | ja | P1 |
| `materials/boss_sigil` *(Vorschlag)* | Schweres Bronzemedaillon mit einem stilisierten gehörnten Schädel und goldener Kante. | WebP 128×128 | ja | P2 |

### 3.6 Monster — `src/content/monsters/monsters.ts`

Alle Portraits freigestellt, Blick **nach links**, Dreiviertelansicht. Bosse 768×768.
P3-Bosse sind in der Spezifikation (§12, §13.1, §13.2) genannt; `boss_bloodcolossus` und `boss_gatewarden` sind bereits als `dropSource` in `uniques.ts` referenziert.

| Pfad | Was es zeigt | Format/Größe | Transp. | Prio |
|---|---|---|---|---|
| `monsters/gate_ravager` | Massiger Plünderer mit Fellumhang und einem Torbalken als Keule, Gesicht hinter einer Maske aus Kettengliedern. | WebP 512×512 | ja | P1 |
| `monsters/rust_crow` | Übergroße Krähe mit rostrot gefleckten Federn und einem Schnabel wie eine gebogene Eisenklinge. | WebP 512×512 | ja | P1 |
| `monsters/ash_hound` | Magerer Hund aus aschgrauem Fell, unter dem Glutrisse durchscheinen, Rauch aus dem Maul. | WebP 512×512 | ja | P1 |
| `monsters/boss_rustwarden` | Hohes Torkonstrukt aus vernieteten Eisenplatten und Torangeln, ein Arm als schwerer Riegelhammer, Rostschuppen rieseln herab. | WebP 768×768 | ja | P1 |
| `monsters/crypt_shambler` | Aufgedunsener Leichnam in Grabtüchern, von Ölgrün-Schimmel überzogen, schleppt eine Grabkette. | WebP 512×512 | ja | P1 |
| `monsters/bone_archer` | Hageres Skelett mit einem aus Rippenknochen gebundenen Bogen, Pfeil eingelegt, Kapuzenfetzen. | WebP 512×512 | ja | P1 |
| `monsters/crypt_hexer` | Untoter Zauberer mit eingenähtem Mund, aus den Fingerspitzen steigt violettschwarzer Rauch. | WebP 512×512 | ja | P1 |
| `monsters/ossuary_guard` | Skelettkrieger hinter einem Turmschild, das aus zusammengenagelten Grabplatten besteht. | WebP 512×512 | ja | P1 |
| `monsters/boss_gravelord` | Hochgewachsener Untoter auf einem Thron aus Sargdeckeln, Krone aus Grabnägeln, eine Hand hält eine qualmende Giftlaterne. | WebP 768×768 | ja | P1 |
| `monsters/abyss_spawn` | Formloser Klumpen aus violettschwarzem Fleisch mit zu vielen Mündern, kaltes Randlicht. | WebP 512×512 | ja | P2 |
| `monsters/abyss_knight` | Gefallener Ritter, dessen Rüstung von innen hohl ist und aus dessen Visier Dunkelheit tropft (Elite). | WebP 512×512 | ja | P2 |
| `monsters/rift_maw` | Riesiger kieferartiger Riss in der Luft mit Ringen aus Steinzähnen, Trümmer werden hineingezogen. | WebP 768×768 | ja | P2 |
| `monsters/boss_bloodcolossus` *(Vorschlag)* | Riesenhafte Gestalt aus geronnenem Blut und Kettenresten, auf der Brust ein Pfahl als Rückgrat. | WebP 768×768 | ja | P3 |
| `monsters/boss_gatewarden` *(Vorschlag)* | Gepanzerter Hüne, dessen Schild ein komplettes Burgtor mit Fallgitter ist. | WebP 768×768 | ja | P3 |
| `monsters/boss_flamebeast` *(Vorschlag)* | Vierbeinige Bestie aus erstarrter Lava, Mähne aus Flammen, Glutaugen (Aschental). | WebP 768×768 | ja | P3 |
| `monsters/boss_steelwyrm` *(Vorschlag)* | Langer Wurm mit Segmenten aus Grubenstahl und Bohrkopf-Maul (Eisenminen). | WebP 768×768 | ja | P3 |
| `monsters/boss_plaguebrood` *(Vorschlag)* | Aufgeblähte Brutmutter mit Eiersäcken voller grünlicher Flüssigkeit (Pestgewölbe). | WebP 768×768 | ja | P3 |
| `monsters/boss_icequeen` *(Vorschlag)* | Hohe Frau mit Krone aus Eiszapfen, Schleier aus Raureif, Finger wie Eisnadeln (Frostkatakomben). | WebP 768×768 | ja | P3 |
| `monsters/boss_stormherald` *(Vorschlag)* | Geflügelter Bote mit Kupferhorn, aus dem Blitze züngeln (Donnerturm). | WebP 768×768 | ja | P3 |
| `monsters/boss_voidkeeper` *(Vorschlag)* | Gesichtsloser Wächter mit Schlüsselbund aus Schatten vor einer schwebenden Tür (Schattenkammer). | WebP 768×768 | ja | P3 |
| `monsters/boss_runewarden` *(Vorschlag)* | Steinkoloss, dessen Körpergravuren abwechselnd rot und blau glühen (Verbotene Schmiede). | WebP 768×768 | ja | P3 |
| `monsters/boss_ashking` *(Vorschlag)* | König aus verkohltem Holz mit Aschenmantel, der wie ein Sturm um ihn weht (Aschenkönig, §13.2). | WebP 768×768 | ja | P3 |
| `monsters/boss_voidmatriarch` *(Vorschlag)* | Fürstin in einer Hülle aus schillernder Barriere, Haar aus Rauchfäden (Leerenfürstin, §13.2). | WebP 768×768 | ja | P3 |

### 3.7 Dungeons — `src/content/dungeons/dungeons.ts`

Thumbnail = `icon` (`dungeons/<id>`), Hintergrund = `background` (`backgrounds/<id>`). Hintergründe ohne Figuren, Mitte dunkel. Die Rift-Probe hat noch keinen Dungeon-Eintrag; P3-Gebiete aus spec §13.1.

| Pfad | Was es zeigt | Format/Größe | Transp. | Prio |
|---|---|---|---|---|
| `dungeons/forsaken_gate` | Kartenausschnitt: zerfallenes Festungstor auf einem Hügel, ein Torflügel hängt schief, Aschewind. | WebP 480×270 | nein | P1 |
| `backgrounds/forsaken_gate` | Torhof hinter einem halb eingestürzten Festungstor, links verrostete Fallgitter, rechts glimmendes Wachfeuer, Mitte offener dunkler Pflasterhof unter Aschehimmel. | WebP 1920×1080 | nein | P1 |
| `dungeons/decayed_crypt` | Kartenausschnitt: moosbewachsener Kryptaeingang mit eingesunkenem Treppenabgang und einer einzelnen Laterne. | WebP 480×270 | nein | P1 |
| `backgrounds/decayed_crypt` | Feuchtes Gewölbe mit Grabnischen voller Knochen an beiden Seiten, ölgrüne Pfützen, Kerzenstummel am Rand, Mitte tiefer dunkler Gang. | WebP 1920×1080 | nein | P1 |
| `dungeons/rift_probe` *(Vorschlag)* | Kartenausschnitt: senkrechter violetter Riss über einer verwüsteten Ebene. | WebP 480×270 | nein | P2 |
| `backgrounds/rift_probe` *(Vorschlag)* | Schwebende Felsbrocken um einen kalten violetten Riss, Boden aus zerbrochenem Glas, Mitte schwarzer Leerraum. | WebP 1920×1080 | nein | P2 |
| `dungeons/ash_vale` *(Vorschlag)* | Tal aus grauer Asche mit glühenden Spalten (Aschental). | WebP 480×270 | nein | P3 |
| `backgrounds/ash_vale` *(Vorschlag)* | Aschenebene mit verkohlten Baumstümpfen links, Lavarinnsal rechts, Mitte dunstige Senke. | WebP 1920×1080 | nein | P3 |
| `dungeons/iron_mines` *(Vorschlag)* | Stolleneingang mit Grubenwagen und rostigen Stützbalken (Eisenminen). | WebP 480×270 | nein | P3 |
| `backgrounds/iron_mines` *(Vorschlag)* | Stollen mit Erzadern und Grubenlampen an den Seiten, Mitte schwarzer Schacht. | WebP 1920×1080 | nein | P3 |
| `dungeons/plague_vaults` *(Vorschlag)* | Gewölbetür mit grünlichem Dampf, der unter der Schwelle hervorquillt (Pestgewölbe). | WebP 480×270 | nein | P3 |
| `backgrounds/plague_vaults` *(Vorschlag)* | Gewölbe mit Fässern und verschimmelten Säcken, giftgrüner Bodennebel, Mitte dunkel. | WebP 1920×1080 | nein | P3 |
| `dungeons/frost_catacombs` *(Vorschlag)* | Vereister Katakombeneingang mit Eiszapfen-Gittern (Frostkatakomben). | WebP 480×270 | nein | P3 |
| `backgrounds/frost_catacombs` *(Vorschlag)* | Gefrorene Grabkammer mit Raureif auf Sarkophagen an den Rändern, Mitte kaltblaue Dunkelheit. | WebP 1920×1080 | nein | P3 |
| `dungeons/thunder_spire` *(Vorschlag)* | Schiefer Steinturm unter Gewitterwolken, Blitz am Kupferdach (Donnerturm). | WebP 480×270 | nein | P3 |
| `backgrounds/thunder_spire` *(Vorschlag)* | Turmplattform mit Kupferstangen links und rechts, Sturmwolken oben, Mitte dunkler Steinboden. | WebP 1920×1080 | nein | P3 |
| `dungeons/shadow_chamber` *(Vorschlag)* | Kammer, deren Wände im Dunkel zu verschwimmen scheinen (Schattenkammer). | WebP 480×270 | nein | P3 |
| `backgrounds/shadow_chamber` *(Vorschlag)* | Säulenhalle, deren Säulen nach oben in Schatten zerfasern, violettes Randlicht, Mitte fast schwarz. | WebP 1920×1080 | nein | P3 |
| `dungeons/forbidden_forge` *(Vorschlag)* | Verlassene Schmiede mit erloschener Esse und Ketten (Verbotene Schmiede). | WebP 480×270 | nein | P3 |
| `backgrounds/forbidden_forge` *(Vorschlag)* | Schmiedehalle mit gewaltigem Amboss links, glimmender Esse rechts, Mitte dunkler Rußboden. | WebP 1920×1080 | nein | P3 |
| `dungeons/abyss_gate` *(Vorschlag)* | Gigantisches Steinportal, in dessen Öffnung Sterne verkehrt herum leuchten (Abgrundtor). | WebP 480×270 | nein | P3 |
| `backgrounds/abyss_gate` *(Vorschlag)* | Plattform vor einem Portal aus Felsbögen, Abgrund ringsum, Mitte schwarzes Nichts mit kaltem Schimmer. | WebP 1920×1080 | nein | P3 |

### 3.8 Waffen — `src/content/bases/bases.ts` (`items/weapons/${familyId}`)

Ein Icon pro Familie, gilt für alle 6 Tiers. P1 = in `SLICE_BASE_FAMILIES`.

| Pfad | Was es zeigt | Format/Größe | Transp. | Prio |
|---|---|---|---|---|
| `items/weapons/dagger` | Schmaler Dolch mit leicht gebogener Klinge, Griff mit Lederriemen umwickelt, kleine Parierstange aus Eisen. | WebP 128×128 | ja | P1 |
| `items/weapons/shortsword` | Kurzes breites Schwert mit Fehlschärfe, gerade Parierstange, runder Eisenknauf. | WebP 128×128 | ja | P1 |
| `items/weapons/longsword` | Schlankes Langschwert mit Hohlkehle, nach unten gebogener Parierstange, Griff für eineinhalb Hände. | WebP 128×128 | ja | P1 |
| `items/weapons/waraxe` | Einhandaxt mit bartförmigem Blatt, Holzstiel mit Eisenbändern. | WebP 128×128 | ja | P1 |
| `items/weapons/mace` | Streitkolben mit sechs flachen Schlagblättern und Lederschlaufe am Griff. | WebP 128×128 | ja | P1 |
| `items/weapons/spear` | Langer Eschenspeer mit blattförmiger Spitze und Querknebel unter der Klinge. | WebP 128×128 | ja | P1 |
| `items/weapons/greatsword` | Zweihandschwert mit langem Ricasso, lederbezogenem Griff und schwerem Scheibenknauf. | WebP 128×128 | ja | P1 |
| `items/weapons/greataxe` | Zweihandaxt mit halbmondförmigem Doppelblatt und langem gewickeltem Stiel. | WebP 128×128 | ja | P1 |
| `items/weapons/warhammer` | Schwerer Kriegshammer mit quadratischem Kopf auf einer Seite und Dorn auf der anderen, Metallschaft. | WebP 128×128 | ja | P1 |
| `items/weapons/bow` | Geschwungener Kompositbogen aus Horn und Holz mit Sehne, keine Pfeile. | WebP 128×128 | ja | P2 |
| `items/weapons/crossbow` | Schwere Armbrust mit Stahlbogen und Kurbelmechanik am Schaft. | WebP 128×128 | ja | P2 |
| `items/weapons/claws` | Paar aus Lederhandschuh mit drei langen, leicht gebogenen Eisenkrallen. | WebP 128×128 | ja | P2 |
| `items/weapons/wand` | Kurzer knorriger Zauberstab, an der Spitze ein eingeklemmter trüber Kristall. | WebP 128×128 | ja | P2 |
| `items/weapons/staff` | Hoher Magierstab aus Schwarzholz, oben zu einem offenen Käfig verwachsen, darin ein Lichtfunke. | WebP 128×128 | ja | P2 |
| `items/weapons/sceptre` | Ritualzepter mit Kopf aus verflochtenen Knochenstreben und Bronzebeschlägen. | WebP 128×128 | ja | P2 |
| `items/weapons/runeblade` | Einhandklinge, in deren Fläche erfundene geometrische Linien schwach orange glimmen (keine echte Schrift). | WebP 128×128 | ja | P2 |

### 3.9 Rüstungen — `items/armour/${kind}_${material}` und `items/armour/belt`

P1 = Helm und Brust (in `SLICE_BASE_FAMILIES`); Handschuhe, Stiefel, Gürtel sind als Basen vorhanden, droppen im Slice aber nicht.

| Pfad | Was es zeigt | Format/Größe | Transp. | Prio |
|---|---|---|---|---|
| `items/armour/helm_plate` | Geschlossener Eisenhelm mit schmalem Sehschlitz und vernieteter Mittelleiste, Rostflecken. | WebP 128×128 | ja | P1 |
| `items/armour/helm_leather` | Gefütterte Lederkappe mit Nackenschutz und Wangenklappen, sichtbare Nähte. | WebP 128×128 | ja | P1 |
| `items/armour/helm_cloth` | Tiefe Leinenkapuze mit ausgefranstem Saum und eingenähtem Stirnband. | WebP 128×128 | ja | P1 |
| `items/armour/chest_plate` | Gehämmerte Brustplatte mit Schulterstücken und Lederriemen an der Seite. | WebP 128×128 | ja | P1 |
| `items/armour/chest_leather` | Gesteppter Lederwams mit überlappenden Schulterschuppen und Schnürung vorn. | WebP 128×128 | ja | P1 |
| `items/armour/chest_cloth` | Lange Wollrobe mit Gürtelschärpe und geflickten Ärmeln. | WebP 128×128 | ja | P1 |
| `items/armour/gloves_plate` | Gegliederte Eisenhandschuhe mit Fingerplatten und Stulpe. | WebP 128×128 | ja | P2 |
| `items/armour/gloves_leather` | Grobe Lederhandschuhe mit verstärkten Knöcheln. | WebP 128×128 | ja | P2 |
| `items/armour/gloves_cloth` | Gewickelte Stoffbandagen um Hand und Unterarm, Finger frei. | WebP 128×128 | ja | P2 |
| `items/armour/boots_plate` | Schwere Eisenstiefel mit Kniekachel und gerippter Spitze. | WebP 128×128 | ja | P2 |
| `items/armour/boots_leather` | Hohe Lederstiefel mit Schnallen am Schaft. | WebP 128×128 | ja | P2 |
| `items/armour/boots_cloth` | Weiche Filzschuhe mit umwickelten Waden. | WebP 128×128 | ja | P2 |
| `items/armour/belt` | Breiter Ledergürtel mit eckiger Eisenschnalle und zwei kleinen Taschen. | WebP 128×128 | ja | P2 |

### 3.10 Nebenhand — `items/offhand/shield|focus|totem`

| Pfad | Was es zeigt | Format/Größe | Transp. | Prio |
|---|---|---|---|---|
| `items/offhand/shield` | Runder Holzschild mit Eisenrand und gehämmertem Buckel, Kerben von Hieben. | WebP 128×128 | ja | P1 |
| `items/offhand/focus` | Handgroße Kugel aus milchigem Glas in einer Fassung aus verdrillten Eisenstäben. | WebP 128×128 | ja | P2 |
| `items/offhand/totem` | Kleine geschnitzte Holzfigur mit Federn, Zähnen und einem Lederband umwickelt. | WebP 128×128 | ja | P2 |

### 3.11 Schmuck — `items/jewellery/${id}`

| Pfad | Was es zeigt | Format/Größe | Transp. | Prio |
|---|---|---|---|---|
| `items/jewellery/ring_ruby` | Grober Eisenring mit tiefrotem, ungeschliffenem Stein in Krallenfassung. | WebP 128×128 | ja | P1 |
| `items/jewellery/ring_sapphire` | Silbrig angelaufener Ring mit kaltblauem, flachem Stein. | WebP 128×128 | ja | P1 |
| `items/jewellery/ring_topaz` | Messingring mit fahlgelbem, facettiertem Stein. | WebP 128×128 | ja | P1 |
| `items/jewellery/ring_onyx` | Schwarzer Ring aus Horn mit mattem, schwarzem Ovalstein. | WebP 128×128 | ja | P1 |
| `items/jewellery/amulet_str` | Amulett an Lederband: Eisenscheibe mit eingeschlagener geballter Faust. | WebP 128×128 | ja | P1 |
| `items/jewellery/amulet_dex` | Amulett an feiner Kette: geschnitzter Knochenanhänger in Form einer Feder. | WebP 128×128 | ja | P1 |
| `items/jewellery/amulet_int` | Amulett an Kette: Bronzeplakette mit einem offenen Auge aus Glas. | WebP 128×128 | ja | P1 |
| `items/jewellery/amulet_vit` | Amulett an Schnur: getrockneter Eichenzweig, in Kupferdraht eingefasst. | WebP 128×128 | ja | P1 |

### 3.12 Uniques — `src/content/uniques/uniques.ts`

Eigenständige Motive, deutlich vom Basis-Icon unterscheidbar; einzige Item-Kategorie, die Gold-/Bernsteinakzente im Motiv tragen darf. P1 = im Slice erhältlich (`dropSource: 'world'` oder `boss_gravelord`).

| Pfad | Was es zeigt | Format/Größe | Transp. | Prio |
|---|---|---|---|---|
| `uniques/u_copperripper` | Kurzschwert aus grünspanigem Kupfer mit hakenförmig zurückgebogener Spitze und gezacktem Rücken (Kupferner Reißer). | WebP 128×128 | ja | P1 |
| `uniques/u_frayedmantle` | Zerschlissener Ledermantel, dessen ausgefranster Saum wie Wurzeln nach unten wächst, ein Rest Raureif am Kragen (Ausgefranster Mantel). | WebP 128×128 | ja | P1 |
| `uniques/u_rusttooth` | Zweihandaxt, deren Blatt aus einem einzigen riesigen, rostbraunen Raubtierzahn besteht (Rostzahn). | WebP 128×128 | ja | P1 |
| `uniques/u_gravelordoath` | Schild aus einem Sargdeckel mit eingeschlagenen Grabnägeln und einem Kerzenwachsfleck in Schwurform (Grabherrs Schwur). | WebP 128×128 | ja | P1 |
| `uniques/u_bloodthirst` | Zweihandschwert mit hohler, gläserner Blutrinne, in der dunkles Rot steigt und fällt (Blutdurst). | WebP 128×128 | ja | P2 |
| `uniques/u_unbrokenwall` | Turmschild aus übereinander geschichteten Steinquadern, mit Mörtel verfugt, keine Kerbe (Ungebrochene Mauer). | WebP 128×128 | ja | P2 |
| `uniques/u_scarletchain` | Kette aus kleinen scharlachroten Gliedern, die sich zu einem Tropfen schließt, Mittelstück bernsteinfarben (Scharlachkette). | WebP 128×128 | ja | P2 |
| `uniques/u_thornpact` | Plattenbrust, aus deren Fugen nach außen gerichtete schwarze Dornenranken wachsen (Dornenpakt). | WebP 128×128 | ja | P2 |

### 3.13 UI-Assets *(alle Pfade Vorschlag)*

| Pfad | Was es zeigt | Format/Größe | Transp. | Prio |
|---|---|---|---|---|
| `ui/frames/rarity_normal` | Schlichter, dünner Rahmen aus hellgrauem angelaufenem Eisen, Innenfläche transparent. | WebP 128×128 | ja | P1 |
| `ui/frames/rarity_magic` | Rahmen aus dunklem Eisen mit blauer Emaille-Kante und kleinen Nieten an den Ecken. | WebP 128×128 | ja | P1 |
| `ui/frames/rarity_rare` | Rahmen mit goldgelber, leicht geprägter Kante und angedeuteten Eckbeschlägen. | WebP 128×128 | ja | P1 |
| `ui/frames/rarity_unique` | Doppelter Rahmen in Bernstein mit warmem Innenglühen und geschmiedeten Eckklammern. | WebP 128×128 | ja | P1 |
| `ui/frames/rarity_corrupt` | Overlay: violette Risse, die über den Rahmen hinauslaufen, in einer Ecke ein kleiner violetter Splitter (wird über den Seltenheitsrahmen gelegt). | WebP 128×128 | ja | P2 |
| `ui/slots/mainhand` | Silhouette (knochenweiß, flach) eines Schwertes diagonal. | WebP 128×128 | ja | P1 |
| `ui/slots/offhand` | Silhouette eines Rundschildes. | WebP 128×128 | ja | P1 |
| `ui/slots/helm` | Silhouette eines Helms in Frontansicht. | WebP 128×128 | ja | P1 |
| `ui/slots/chest` | Silhouette eines Brustpanzers. | WebP 128×128 | ja | P1 |
| `ui/slots/gloves` | Silhouette eines Handschuhs, Finger leicht gespreizt. | WebP 128×128 | ja | P1 |
| `ui/slots/boots` | Silhouette eines Stiefels im Profil. | WebP 128×128 | ja | P1 |
| `ui/slots/belt` | Silhouette eines Gürtels mit Schnalle. | WebP 128×128 | ja | P1 |
| `ui/slots/amulet` | Silhouette eines Anhängers an Kette. | WebP 128×128 | ja | P1 |
| `ui/slots/ring` | Silhouette eines Rings (für ringA und ringB). | WebP 128×128 | ja | P1 |
| `ui/slots/relic` | Silhouette eines kleinen Reliquienkästchens mit Spitzdach. | WebP 128×128 | ja | P1 |
| `ui/panel_texture` | Kachelbare Textur aus dunklem, leicht genarbtem Leder auf Holz, sehr kontrastarm. | WebP 512×512, nahtlos kachelbar | nein | P1 |
| `ui/buttons/button_normal` | Querrechteck aus dunklem Eisen mit feiner Goldkante (9-Slice, Ränder 24 px). | WebP 384×96 | ja | P1 |
| `ui/buttons/button_hover` | Wie normal, Goldkante heller, schwaches warmes Innenglühen. | WebP 384×96 | ja | P1 |
| `ui/buttons/button_pressed` | Wie normal, nach innen gedrückt, Kante dunkler, Schatten oben. | WebP 384×96 | ja | P1 |
| `ui/buttons/button_disabled` | Wie normal, entsättigt, Kante grau, matte Oberfläche. | WebP 384×96 | ja | P1 |
| `ui/logo_darkforge` | Wortmarke „DARKFORGE“ in eigener, kantiger Schmiedeschrift, Buchstaben wie aus glühendem Eisen gehämmert, Goldkante (einzige Datei mit Text). | WebP 1200×300 | ja | P1 |
| `ui/favicon` | Stilisierter Amboss mit einem Funken darüber, auf 16 px lesbar, ohne Text. | PNG 512×512 (zusätzlich 32×32 und 16×16 exportieren) | ja | P1 |
| `ui/fx/hit_spark` | Optional: Sprite-Sheet 4 Frames eines hellen Treffer-Funkens (Zahlen rendert die App selbst). | WebP 1024×256 (4×256) | ja | P2 |
| `ui/fx/crit_burst` | Optional: Sprite-Sheet 6 Frames einer gold-roten Sternexplosion hinter Krit-Zahlen. | WebP 1536×256 (6×256) | ja | P2 |
| `ui/talent/root_active` | Runder Wurzelknoten-Rahmen, doppelter Eisenring mit Goldfüllung und Glühen. | WebP 128×128 | ja | P1 |
| `ui/talent/root_inactive` | Wurzelknoten-Rahmen, Eisen ohne Glühen, Gold matt. | WebP 128×128 | ja | P1 |
| `ui/talent/small_active` | Kleiner runder Rahmen, Eisenring mit goldener Innenkante. | WebP 96×96 | ja | P1 |
| `ui/talent/small_inactive` | Kleiner runder Rahmen, dunkles Eisen, entsättigt. | WebP 96×96 | ja | P1 |
| `ui/talent/medium_active` | Achteckiger Rahmen mit Nieten und goldener Kante. | WebP 128×128 | ja | P1 |
| `ui/talent/medium_inactive` | Achteckiger Rahmen, dunkles Eisen, entsättigt. | WebP 128×128 | ja | P1 |
| `ui/talent/key_active` | Großer Rahmen in Form eines Schmiedewappens mit Zacken, goldene Kante, Glutglühen. | WebP 160×160 | ja | P1 |
| `ui/talent/key_inactive` | Schmiedewappen-Rahmen, dunkles Eisen, kalt, entsättigt. | WebP 160×160 | ja | P1 |
| `ui/currency_gold` | Kleiner Stapel abgegriffener, unregelmäßig geprägter Goldmünzen ohne erkennbare Schrift. | WebP 128×128 | ja | P1 |
| `ui/xp_bar_frame` | Lange schmale Rahmenleiste aus Eisen mit Nieten, Innenfläche transparent (9-Slice, Ränder 16 px). | WebP 1024×48 | ja | P1 |
| `ui/xp_bar_fill` | Horizontal kachelbare Füllung: flüssiges Gold mit leichter Glutstruktur. | WebP 256×32, horizontal kachelbar | nein | P1 |

---

## 4. Zusammenfassung

| Kategorie | P1 | P2 | P3 | Summe |
|---|---:|---:|---:|---:|
| Klassen (Portrait + Ganzkörper) | 2 | 5 | 5 | 12 |
| Skills | 7 | 0 | 0 | 7 |
| Passive Knoten | 14 | 0 | 0 | 14 |
| Statuseffekte | 5 | 4 | 0 | 9 |
| Materialien | 7 | 3 | 0 | 10 |
| Monster (inkl. Bosse) | 9 | 3 | 11 | 23 |
| Dungeons (Thumbnails + Hintergründe) | 4 | 2 | 16 | 22 |
| Waffen | 9 | 7 | 0 | 16 |
| Rüstungen (inkl. Gürtel) | 6 | 7 | 0 | 13 |
| Nebenhand | 1 | 2 | 0 | 3 |
| Schmuck | 8 | 0 | 0 | 8 |
| Uniques | 4 | 4 | 0 | 8 |
| UI-Assets | 32 | 3 | 0 | 35 |
| **Gesamt** | **108** | **40** | **32** | **180** |

**Empfohlene Reihenfolge:** Referenzsatz (§1.5) → restliche P1-Icons → P1-Monster/Bosse → P1-Hintergründe/Thumbnails → UI-Assets → P2 → P3.

**Pflege:** Kommen neue Content-Definitionen mit `icon` hinzu, diese Liste ergänzen. Schnellprüfung aller in den Daten referenzierten Pfade:
```
grep -rhoE "icon: ['\`][^'\`]+|background: '[^']+" src/content
```
