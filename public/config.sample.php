<?php
// Kopieren nach config.php und anpassen. config.php NICHT ins Repo committen.
return [
    // Sprache der TV-Anzeige: 'de' = Deutsch, 'sq' = Shqip (Albanisch)
    'lang' => 'de',

    // Geheimes Passwort für die Handy-Bearbeitungsseite (admin.html)
    'token' => 'HIER-EIN-LANGES-PASSWORT',

    // Schutz gegen Passwort-Durchprobieren (2 s Pause, Sperre nach 10 Fehlversuchen/Std.): true = an, false = aus
    'brute_protect' => true,

    // Lese-Schlüssel für den TV (steht in config.js als DASH_KEY). Ohne ihn sieht niemand die Pinnwand.
    'view_key' => 'HIER-EIN-ZWEITER-SCHLUESSEL',

    // Google Kalender: Einstellungen → Kalender → "Privatadresse im iCal-Format"
    // Mehrere Kalender möglich (Familie, Arbeit, Schule ...)
    'ical' => [
        // ['name' => 'Familie', 'color' => '#7aa2f7', 'url' => 'https://calendar.google.com/calendar/ical/.../basic.ics'],
    ],

    // Familienmitglieder für die Pinnwand ("für wen" / "von wem")
    'family' => [
        ['name' => 'Alle',  'color' => '#9aa5ce'],
        ['name' => 'Papa',  'color' => '#7aa2f7'],
        ['name' => 'Mama',  'color' => '#bb9af7'],
        ['name' => 'Sara',  'color' => '#7dcfff'],
        ['name' => 'Erina', 'color' => '#e0af68'],
        ['name' => 'Isa',   'color' => '#9ece6a'],
    ],

    // Alte Namen automatisch umbenennen (auch bei schon gespeicherten Nachrichten)
    'aliases' => [
        // 'Papa' => 'Babi',
        // 'Mama' => 'Mami',
    ],

    // Wetter (Open-Meteo, kein Schlüssel nötig) – Standard: Bern
    'lat' => 46.948,
    'lon' => 7.447,
    'place' => 'Bern',

    // Fotos: Wechsel alle X Sekunden, maximal so viele Fotos speichern (älteste fallen weg)
    'photo_seconds' => 20,
    'max_photos' => 300,
    // Sprachnachrichten: maximal so viele behalten
    'max_audio' => 20,

    // Ayah des Tages: Übersetzung (de.bubenheim = Deutsch, sq.ahmeti = Albanisch, en.sahih = Englisch)
    // Mehrere möglich, z. B. ['de.bubenheim', 'sq.ahmeti']
    'ayah_translations' => ['de.bubenheim'],

    // Nachtmodus (OLED-Schutz): Bildschirm fast schwarz in diesem Zeitraum
    'night_from' => '23:00',
    'night_to'   => '06:00',
];
