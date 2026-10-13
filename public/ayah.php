<?php
// Ayah des Tages – aus einer Liste ausgewählter, aufbauender Verse (jeden Tag ein anderer).
// Quelle: api.alquran.cloud (Arabisch ohne Uthmani-Sonderzeichen, damit der TV-Browser es sauber darstellt), pro Tag einmal geholt und gespeichert.

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-store');

$cfg = require __DIR__ . '/config.php';
$viewKey = $cfg['view_key'] ?? '';
if ($viewKey !== '' && !hash_equals($viewKey, (string)($_GET['k'] ?? ''))) {
    http_response_code(403); echo json_encode(['error' => 'Kein Zugriff']); exit;
}

// Ausgewählte Verse (Sure:Vers) – Geduld, Vertrauen, Dankbarkeit, Familie, Hoffnung, Bittgebete
$verses = [
    '94:5', '94:6', '2:152', '2:153', '2:186', '2:201', '2:286', '3:8', '3:134', '3:139', '3:173',
    '7:23', '7:56', '7:199', '8:46', '9:51', '10:62', '11:88', '11:115', '12:86', '12:87', '13:28',
    '14:7', '14:40', '14:41', '16:18', '16:97', '16:128', '17:24', '18:10', '20:46', '20:114',
    '21:87', '23:118', '25:63', '25:74', '26:80', '28:24', '29:69', '30:21', '33:41', '39:53',
    '40:60', '41:34', '42:43', '47:7', '49:10', '50:16', '52:48', '53:39', '55:13', '57:4',
    '64:11', '65:3', '67:2', '71:10', '87:17', '89:27', '93:3', '93:5', '2:45', '3:200',
];

$tz = new DateTimeZone('Europe/Zurich');
$today = new DateTime('today', $tz);
$day = (int)floor(($today->getTimestamp() - (new DateTime('2024-01-01', $tz))->getTimestamp()) / 86400);
$ref = $verses[$day % count($verses)];

$dir = __DIR__ . '/data/ayah';
@mkdir($dir, 0755, true);
$tr = $cfg['ayah_translations'] ?? ['de.bubenheim'];
// Cache pro Tag UND Übersetzung – eine neue Sprache gilt sofort, nicht erst morgen
$cache = $dir . '/' . $today->format('Y-m-d') . '_' . preg_replace('/[^a-z.,]/', '', implode(',', $tr)) . '.json';
if (is_file($cache)) { readfile($cache); exit; }
$editions = implode(',', array_merge(['quran-simple'], $tr));
$url = "https://api.alquran.cloud/v1/ayah/$ref/editions/$editions";
$raw = @file_get_contents($url, false, stream_context_create(['http' => ['timeout' => 10]]));
$j = $raw ? json_decode($raw, true) : null;

if (!$j || ($j['code'] ?? 0) !== 200 || empty($j['data'])) {
    // Offline: letzten gespeicherten Vers verwenden
    $files = glob("$dir/*.json");
    rsort($files);
    if ($files) { readfile($files[0]); exit; }
    http_response_code(503); echo json_encode(['error' => 'Ayah nicht erreichbar']); exit;
}

$first = $j['data'][0];
$out = [
    'ref'          => $ref,
    'surah'        => $first['surah']['number'],
    'surah_name'   => $first['surah']['englishName'],
    'surah_arabic' => $first['surah']['name'],
    'ayah'         => $first['numberInSurah'],
    'arabic'       => $first['text'],
    'translations' => [],
];
foreach (array_slice($j['data'], 1) as $t) {
    $out['translations'][] = ['lang' => $t['edition']['language'], 'text' => $t['text']];
}
$json = json_encode($out, JSON_UNESCAPED_UNICODE);
file_put_contents($cache, $json);
// alte Tage aufräumen (nur die letzten 7 behalten)
$files = glob("$dir/*.json"); sort($files);
foreach (array_slice($files, 0, max(0, count($files) - 7)) as $old) @unlink($old);
echo $json;
