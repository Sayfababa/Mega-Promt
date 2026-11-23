# public/assets — Bilder für DARKFORGE

Vollständige Liste aller Bilder mit Beschreibung, Größe und Priorität: **`docs/ASSETS.md`**.

## Namenskonvention

- Jede Content-Definition hat ein Feld `icon` (Dungeons zusätzlich `background`), z. B. `monsters/boss_gravelord`.
- Datei = `public/assets/<icon>.webp` → die App lädt `/assets/<icon>.webp`.
- PNG ist als Alternative erlaubt (gleicher Name, Endung `.png`).
- Kleinbuchstaben, `snake_case`, keine Leerzeichen; Unterordner exakt wie im `icon`-Pfad.

## Ordnerstruktur

```
public/assets/
  classes/          Klassen-Portraits 512×512, Ganzkörper <id>_full 512×1024
  skills/           Skill-Icons 128×128
  passives/         Talentknoten-Icons 128×128
  status/           Statuseffekt-Icons 128×128
  materials/        Material-Icons 128×128 (<ID klein>, z. B. forge_dust)
  monsters/         Monster 512×512, Bosse 768×768 (Blick nach links)
  dungeons/         Karten-Thumbnails 480×270
  backgrounds/      Kampf-Hintergründe 1920×1080
  items/
    weapons/        <familyId>.webp
    armour/         <kind>_<material>.webp, belt.webp
    offhand/        shield, focus, totem
    jewellery/      ring_*, amulet_*
  uniques/          Unique-Icons 128×128 (eigenes Motiv)
  ui/               frames/, slots/, buttons/, talent/, fx/, Logo, Favicon, Gold, XP-Leiste
```

## Fehlende Bilder

Fehlt eine Datei, zeigt die App automatisch einen **Fallback-Platzhalter** (Initialen + Kategoriefarbe) an. Das Spiel bleibt ohne jedes Bild voll spielbar; Bilder können jederzeit einzeln ergänzt werden.

## Bilder einfügen — Ablauf

1. Datei unter dem Pfad aus `docs/ASSETS.md` ablegen, z. B. `public/assets/monsters/boss_gravelord.webp`.
2. `npm run assets:check` ausführen (läuft auch automatisch vor `npm run dev` und `npm run build`).
   - prüft Größe (exakt oder ganzzahliges Vielfaches, z. B. 256×256 statt 128×128), Seitenverhältnis und Transparenz,
   - meldet fehlende und unbekannte Dateien,
   - schreibt `available.json` — die App lädt **nur** dort gelistete Bilder (keine 404-Anfragen),
   - Detailbericht: `reports/assets.md` (alle fehlenden Bilder als Tabelle).
3. Seite neu laden. Bei laufendem `npm run dev` nach neuen Dateien `npm run assets:check` erneut ausführen.

`npm run assets:check -- --strict` bricht mit Fehlercode ab, solange P1-Bilder fehlen oder fehlerhaft sind (für CI).

UI-Texturen (Panel, Buttons, XP-Leiste, Talent- und Seltenheitsrahmen, Logo, Favicon) werden nur aktiviert, wenn die Datei vorhanden ist; vorher bleibt das CSS-Design.
