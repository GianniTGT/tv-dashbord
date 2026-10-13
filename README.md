# Familien-TV-Dashboard (LG OLED, webOS)

Ein dunkles Dashboard für den Fernseher: Uhr, Wetter, **Familien-Pinnwand**, Termine (Google-Kalender + eigene) und "Wichtig".
Die Familie schreibt vom Handy aus Nachrichten darauf (`admin.html`). Der TV holt sich alle 30 Sekunden den neuen Stand.

```
public/
  index.html, tv.css, tv.js   → Anzeige auf dem TV
  admin.html                  → Handy-Seite zum Schreiben (Familie)
  api.php                     → Daten speichern / lesen (JSON-Datei in data/)
  calendar.php                → Google-Kalender (iCal) lesen, 10 Min. Cache
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

## 1. Server einrichten (Plesk / Hosttech)

1. Eine Subdomain anlegen, z. B. `tv.deine-domain.ch` (PHP 8, **mit SSL**).
2. Den Inhalt von `public/` dorthin hochladen.
3. Die Datei `config.sample.php` nach `config.php` kopieren und darin eintragen:
   - `token`: Passwort für die Familie (Handy-Seite)
   - `view_key`: zweiter Schlüssel für den TV (z. B. 20 zufällige Zeichen)
   - `ical`: Google-Kalender → Einstellungen → Kalender wählen → **"Privatadresse im iCal-Format"** kopieren. Mehrere Kalender sind möglich, jeder bekommt eine eigene Farbe.
   - `family`: Namen und Farben anpassen
4. In `config.js` bei `DASH_KEY` denselben Wert wie `view_key` eintragen.
5. Den Ordner `data/` für PHP beschreibbar machen. Er ist per `.htaccess` gesperrt. Falls Plesk nur nginx verwendet: In den Plesk-Einstellungen den Zugriff auf `/data/` sperren.

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
