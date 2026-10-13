<?php
// Salah-Zeiten (Gebetszeiten) für heute und morgen – Quelle: api.aladhan.com, 1× pro Tag geholt.
// Einstellungen in config.php: prayer_method, prayer_tune, lat/lon.

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-store');

$cfg = require __DIR__ . '/config.php';
$viewKey = $cfg['view_key'] ?? '';
if ($viewKey !== '' && !hash_equals($viewKey, (string)($_GET['k'] ?? ''))) {
    http_response_code(403); echo json_encode(['error' => 'Kein Zugriff']); exit;
}

$tz = new DateTimeZone('Europe/Zurich');
$method = (int)($cfg['prayer_method'] ?? 13);
// Minuten-Korrektur pro Gebet, Reihenfolge laut Aladhan: Imsak,Fajr,Sunrise,Dhuhr,Asr,Maghrib,Sunset,Isha,Midnight
$t = $cfg['prayer_tune'] ?? [];
$tune = implode(',', [0, (int)($t['Fajr'] ?? 0), (int)($t['Sunrise'] ?? 0), (int)($t['Dhuhr'] ?? 0),
                         (int)($t['Asr'] ?? 0), (int)($t['Maghrib'] ?? 0), 0, (int)($t['Isha'] ?? 0), 0]);
$school = (int)($cfg['prayer_school'] ?? 0);   // 0 = Shafi (Standard), 1 = Hanafi (spätere Ikindia)

$dir = __DIR__ . '/data/prayer';
@mkdir($dir, 0755, true);

function get_url($url) {
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 15, CURLOPT_FOLLOWLOCATION => true]);
        $b = curl_exec($ch); $code = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
        if ($b !== false && $code === 200) return $b;
    }
    return @file_get_contents($url, false, stream_context_create(['http' => ['timeout' => 15]]));
}

function day_times(DateTime $d, $cfg, $method, $tune, $school, $dir) {
    $key = $d->format('Y-m-d') . "_m{$method}_s{$school}_" . md5($tune . $cfg['lat'] . $cfg['lon']);
    $file = "$dir/$key.json";
    if (is_file($file)) return json_decode(file_get_contents($file), true);
    $url = 'https://api.aladhan.com/v1/timings/' . $d->format('d-m-Y')
         . '?latitude=' . urlencode($cfg['lat']) . '&longitude=' . urlencode($cfg['lon'])
         . "&method=$method&school=$school&tune=$tune&timezonestring=Europe/Zurich";
    $j = json_decode((string)get_url($url), true);
    if (!$j || ($j['code'] ?? 0) !== 200) return null;
    $tm = $j['data']['timings'];
    $out = ['date' => $d->format('Y-m-d'), 'times' => []];
    foreach (['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as $p) $out['times'][$p] = substr($tm[$p], 0, 5);
    $h = $j['data']['date']['hijri'];
    $out['hijri'] = ['day' => (int)$h['day'], 'month' => (int)$h['month']['number'], 'year' => (int)$h['year']];
    file_put_contents($file, json_encode($out));
    // alte Dateien aufräumen (älter als 3 Tage)
    foreach (glob("$dir/*.json") as $f) if (filemtime($f) < time() - 3 * 86400) @unlink($f);
    return $out;
}

$today = new DateTime('today', $tz);
$tomorrow = (clone $today)->modify('+1 day');
$a = day_times($today, $cfg, $method, $tune, $school, $dir);
$b = day_times($tomorrow, $cfg, $method, $tune, $school, $dir);

if (!$a) { http_response_code(503); echo json_encode(['error' => 'Gebetszeiten nicht erreichbar']); exit; }
echo json_encode(['today' => $a, 'tomorrow' => $b, 'method' => $method], JSON_UNESCAPED_UNICODE);
