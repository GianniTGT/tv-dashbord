# Familien-TV-Dashboard (LG OLED, webOS)

Ein dunkles Dashboard für den Fernseher: Uhr, Wetter, **Familien-Pinnwand mit Sprachnachrichten**, Termine (Google-Kalender + eigene), "Wichtig", eine **Foto-Ecke** und unten die **Ayah des Tages** (oder ein eigener Spruch).

**So kommen die Daten auf den TV:** Alles geht übers Handy. Auf `admin.html` schreibt man Nachrichten, nimmt Sprachnachrichten auf und lädt Fotos hoch. Das wird auf deinem Server gespeichert, und der TV holt es sich alle 30 Sekunden ab.

```
public/
  index.html, tv.css, tv.js   → Anzeige auf dem TV
  admin.html                  → Handy-Seite zum Schreiben (Familie)
  api.php                     → Daten speichern / lesen (JSON-Datei in data/)
  calendar.php                → Google-Kalender (iCal) lesen, 10 Min. Cache
  media.php                   → Fotos & Sprachnachrichten hochladen / ausliefern (geschützt)
  ayah.php                    → Ayah des Tages (api.alquran.cloud, 1× pro Tag geholt)
  lib.php                     → Hilfsfunktionen
  config.sample.php           → Vorlage für config.php
webos/                        → LG-App-Daten (appinfo.json, Icons)
.github/workflows/webos.yml   → baut die LG-App (.ipk) automatisch
```

## OLED-Schutz (eingebaut)

- Reines Schwarz als Hintergrund: Diese Pixel sind beim OLED ausgeschaltet und verbrauchen keinen Strom.
- Gedämpfte Schrift (grau statt reinweiss), keine hellen Flächen.
- **Pixel-Shift:** Alle 3 Minuten verschiebt sich das ganze Bild leicht um ein paar Pixel.
- **Nachtmodus** (Standard 23:00–06:00): Der Bildschirm ist fast schwarz, nur eine kleine, dunkle Uhr wandert herum.
- Alle 6 Stunden lädt die Seite neu, damit der alte TV-Browser nicht langsam wird.

## Fotos, Sprachnachrichten, Ayah

- **Fotos:** Auf dem Handy unter "Fotos für die TV-Ecke" mehrere Fotos auswählen. Sie werden auf dem Handy verkleinert, auf dem Server neu gespeichert (GPS- und Standortdaten werden entfernt) und wechseln auf dem TV alle 60 Sekunden mit Überblendung. Ein neues Foto wird sofort angezeigt. Maximal 300 Fotos, die ältesten fallen weg (einstellbar).
- **Sprachnachrichten:** Auf dem Handy die rote Taste antippen, sprechen, nochmals antippen, anhören und senden. Alternativ eine Audiodatei auswählen. Auf dem TV erscheint sie oben in der Pinnwand mit "NEU".
  **Fernbedienung:** ▲▼ zum Auswählen, **OK** zum Abspielen oder Pausieren, **Zurück** zum Stoppen. Mit der Magic Remote einfach darauf zeigen und klicken.
  Die Aufnahme braucht **HTTPS** (Mikrofon-Freigabe im Handy-Browser).
- **Ayah des Tages:** Jeden Tag ein anderer Vers aus einer Auswahl von 62 aufbauenden Versen (Geduld, Vertrauen, Dankbarkeit, Familie, Bittgebete). Angezeigt werden Arabisch und Deutsch (Bubenheim/Elyas). Albanisch lässt sich in `config.php` mit `'ayah_translations' => ['de.bubenheim', 'sq.ahmeti']` dazuschalten.
  Wer auf dem Handy einen **eigenen Spruch** setzt, ersetzt damit die Ayah, bis er wieder gelöscht wird.

## Salah-Zeiten

Die 6 Zeiten (Sabahu, Lindja e diellit, Dreka, Ikindia, Akshami, Jacia) kommen täglich von api.aladhan.com für die Koordinaten in `config.php`. Das nächste Gebet ist golden markiert mit Countdown, 20 Minuten nach Beginn steht "tani". Unter dem Datum steht das Hijri-Datum.

Einstellungen: `prayer_method` (13 = Diyanet, 3 = Muslim World League …), `prayer_school` (0 Standard, 1 Hanafi), `prayer_tune` (Minuten-Korrektur pro Gebet, damit es zur eigenen Moschee passt).

## Sprache

In `config.php`: `'lang' => 'sq'` für Shqip (Albanisch) oder `'de'` für Deutsch. Für die Ayah passend `'ayah_translations' => ['sq.ahmeti']` (Albanisch), `['de.bubenheim']` (Deutsch) oder beide.

## 1. Server einrichten (Plesk / Hosttech)

1. Eine Subdomain anlegen, z. B. `tv.deine-domain.ch` (PHP 8, **mit SSL**).
2. Den Inhalt von `public/` dorthin hochladen.
3. Die Datei `config.sample.php` nach `config.php` kopieren und darin eintragen:
   - `token`: Passwort für die Familie (Handy-Seite)
   - `view_key`: zweiter Schlüssel für den TV (z. B. 20 zufällige Zeichen)
   - `ical`: Google-Kalender → Einstellungen → Kalender wählen → **"Privatadresse im iCal-Format"** kopieren. Mehrere Kalender sind möglich, jeder bekommt eine eigene Farbe.
   - `family`: Namen und Farben anpassen
4. In `config.js` bei `DASH_KEY` denselben Wert wie `view_key` eintragen.
5. In Plesk unter PHP-Einstellungen `upload_max_filesize` und `post_max_size` auf **25M** setzen (für Fotos und Audio). Die PHP-Erweiterung **GD** muss aktiv sein (bei Hosttech Standard).
6. Den Ordner `data/` für PHP beschreibbar machen. Er ist per `.htaccess` gesperrt. Falls Plesk nur nginx verwendet: In den Plesk-Einstellungen den Zugriff auf `/data/` sperren.

Testen im PC-Browser: `https://tv.deine-domain.ch/` (TV-Ansicht) und `https://tv.deine-domain.ch/admin.html` (Handy-Seite).

## 2. Auf den Fernseher bringen

### Variante A – Browser (sofort, empfohlen zum Start)
1. Auf dem LG den **Webbrowser** öffnen und `https://tv.deine-domain.ch/` aufrufen.
2. Als Lesezeichen bzw. auf dem Startbildschirm speichern und auf Vollbild stellen.

### Variante B – Eigene LG-App (.ipk)
1. **GitHub:** Unter Settings → Secrets and variables → Actions die Variable `DASH_API_URL` anlegen (z. B. `https://tv.deine-domain.ch/`, mit `/` am Ende) und das Secret `DASH_KEY` (= `view_key`).
2. Nach jedem Push baut GitHub Actions die `.ipk`. Sie liegt unter Actions → letzter Lauf → Artifact `lg-webos-app`.
3. **TV:** Im LG Content Store die App **"Developer Mode"** installieren, mit dem LG-Entwicklerkonto anmelden (kostenlos auf webostv.developer.lge.com), Dev Mode einschalten und den TV neu starten.
4. **PC (gleiches WLAN):**
   ```
   npm install -g @webos-tools/cli
   ares-setup-device        # TV hinzufügen (IP + Passphrase aus der Dev-Mode-App)
   ares-novacom --device tv --getkey
   ares-install --device tv ch.tiff.familydashboard_1.0.X_all.ipk
   ares-launch  --device tv ch.tiff.familydashboard
   ```
5. ⚠️ Die Dev-Mode-Sitzung läuft nach rund 50 Stunden ab. In der Dev-Mode-App auf **"Extend"** klicken, sonst wird die App deaktiviert.

Ein Update von Notizen und Kalender braucht **keine** neue App, nur Änderungen am Design oder am Code.

## 3. Fernseher-Einstellungen (wichtig für Dauerbetrieb)

- Allgemein → Eco-Modus / Energiesparen: **Automatisch ausschalten = Aus**
- Bildschirmschoner: Kann sich nach einiger Zeit ohne Fernbedienung einschalten. Wenn das stört, die App lieber über Variante B nutzen oder ab und zu eine Taste drücken.
- OLED-Pflege: **Pixel-Refresher** bzw. **Pixelverschiebung** eingeschaltet lassen
- Bildmodus: **Eco** oder OLED-Helligkeit ca. 30–50 %. Das spart am meisten Strom.

## 4. Familie: Handy einrichten

1. Auf jedem Handy `https://tv.deine-domain.ch/admin.html` öffnen und das Familien-Passwort eingeben.
2. Unten bei **"Ich bin"** den eigenen Namen wählen. Dann steht automatisch "– Papa" unter der Nachricht.
3. Über Teilen → **"Zum Home-Bildschirm"** hinzufügen. Dann funktioniert es wie eine App.

Nachrichten mit **"Nur heute anzeigen"** verschwinden um Mitternacht automatisch vom TV.

## Grenzen der aktuellen Version

- Wiederkehrende Kalender-Termine: täglich, wöchentlich (auch mehrere Wochentage), monatlich und jährlich werden unterstützt. Komplexe Regeln (z. B. "jeder 2. Dienstag im Monat") werden nicht angezeigt.
- Alle Familienmitglieder teilen ein Passwort.
