<?php
// Tiff TV Dashboard – Daten-API
// GET  api.php            → alle Daten (für TV und Handy)
// POST api.php            → Daten speichern (Header X-Token nötig)

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, X-Token');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Cache-Control: no-store');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

$cfgFile = __DIR__ . '/config.php';
if (!file_exists($cfgFile)) {
    http_response_code(500);
    echo json_encode(['error' => 'config.php fehlt – config.sample.php kopieren']);
    exit;
}
$cfg = require $cfgFile;
require __DIR__ . '/lib.php';
$dataFile = __DIR__ . '/data/dashboard.json';

$empty = [
    'message'   => '',
    'quote'     => '',   // eigener Spruch des Tages (ersetzt die Ayah, wenn gesetzt)
    'notes'     => [],   // Familien-Pinnwand: {id, to, from, text, until}
    'important' => [],   // {id, text, date}
    'events'    => [],   // {id, title, date, time}
    'updated'   => 0,
];

function load($file, $empty) {
    if (!file_exists($file)) return $empty;
    $d = json_decode(file_get_contents($file), true);
    return is_array($d) ? array_merge($empty, $d) : $empty;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $viewKey = $cfg['view_key'] ?? '';
    $okView = $viewKey === '' || hash_equals($viewKey, (string)($_GET['k'] ?? ''))
              || hash_equals($cfg['token'], (string)($_SERVER['HTTP_X_TOKEN'] ?? ''));
    if (!$okView) { http_response_code(403); echo json_encode(['error' => 'Kein Zugriff']); exit; }
    $d = load($dataFile, $empty);
    $d['settings'] = [
        'lat' => $cfg['lat'], 'lon' => $cfg['lon'], 'place' => $cfg['place'],
        'night_from' => $cfg['night_from'], 'night_to' => $cfg['night_to'],
        'family' => $cfg['family'] ?? [],
        'photo_seconds' => (int)($cfg['photo_seconds'] ?? 20),
        'lang' => in_array($cfg['lang'] ?? 'de', ['de', 'sq'], true) ? $cfg['lang'] : 'de',
    ];
    $m = media_load(__DIR__ . '/data');
    $d['photos'] = array_map(fn($p) => ['id' => $p['id'], 'src' => 'media.php?f=' . $p['file']], $m['photos']);
    $d['audio'] = array_map(fn($a) => ['id' => $a['id'], 'src' => 'media.php?f=' . $a['file'], 'from' => $a['from'],
        'to' => $a['to'], 'title' => $a['title'], 'duration' => $a['duration'], 'created' => $a['created']], $m['audio']);
    echo json_encode($d, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $token = $_SERVER['HTTP_X_TOKEN'] ?? '';
    if (!hash_equals($cfg['token'], $token)) {
        http_response_code(401);
        echo json_encode(['error' => 'Falsches Passwort']);
        exit;
    }
    $in = json_decode(file_get_contents('php://input'), true);
    if (!is_array($in)) {
        http_response_code(400);
        echo json_encode(['error' => 'Ungültige Daten']);
        exit;
    }

    $clean = fn($s, $max = 500) => mb_substr(trim(strip_tags((string)$s)), 0, $max);
    $out = $empty;
    $out['message'] = $clean($in['message'] ?? '', 200);
    $out['quote'] = $clean($in['quote'] ?? '', 300);
    foreach (($in['notes'] ?? []) as $n) {
        if ($clean($n['text'] ?? '') === '') continue;
        $out['notes'][] = ['id' => $clean($n['id'] ?? uniqid(), 40), 'text' => $clean($n['text'], 300),
                           'to' => $clean($n['to'] ?? '', 30), 'from' => $clean($n['from'] ?? '', 30),
                           'until' => preg_match('/^\d{4}-\d{2}-\d{2}$/', $n['until'] ?? '') ? $n['until'] : ''];
    }
    foreach (($in['important'] ?? []) as $n) {
        if ($clean($n['text'] ?? '') === '') continue;
        $out['important'][] = ['id' => $clean($n['id'] ?? uniqid(), 40), 'text' => $clean($n['text'], 200),
                               'date' => preg_match('/^\d{4}-\d{2}-\d{2}$/', $n['date'] ?? '') ? $n['date'] : ''];
    }
    foreach (($in['events'] ?? []) as $n) {
        if ($clean($n['title'] ?? '') === '' || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $n['date'] ?? '')) continue;
        $out['events'][] = ['id' => $clean($n['id'] ?? uniqid(), 40), 'title' => $clean($n['title'], 120),
                            'date' => $n['date'],
                            'time' => preg_match('/^\d{2}:\d{2}$/', $n['time'] ?? '') ? $n['time'] : ''];
    }
    $out['updated'] = time();

    if (!is_dir(dirname($dataFile))) mkdir(dirname($dataFile), 0755, true);
    file_put_contents($dataFile, json_encode($out, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), LOCK_EX);
    echo json_encode(['ok' => true, 'updated' => $out['updated']]);
    exit;
}

http_response_code(405);
