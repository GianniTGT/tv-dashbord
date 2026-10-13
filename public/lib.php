<?php
// Gemeinsame Hilfsfunktionen

function media_load($base) {
    $f = "$base/media.json";
    $m = is_file($f) ? json_decode(file_get_contents($f), true) : null;
    if (!is_array($m)) $m = [];
    return array_merge(['photos' => [], 'audio' => []], $m);
}

// Liest media.json, lässt $fn ändern und schreibt zurück – mit Sperre gegen gleichzeitige Uploads
function media_update($base, callable $fn) {
    @mkdir($base, 0755, true);
    $fp = fopen("$base/media.json", 'c+');
    flock($fp, LOCK_EX);
    $raw = stream_get_contents($fp);
    $m = json_decode($raw ?: '{}', true);
    if (!is_array($m)) $m = [];
    $m = array_merge(['photos' => [], 'audio' => []], $m);
    $fn($m);
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($m, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
    return $m;
}

// Schutz gegen Passwort-Durchprobieren: max. 10 Fehlversuche pro Stunde und IP, 2 s Pause pro Fehlversuch
function brute_file() { return __DIR__ . '/data/login-fails.json'; }
function brute_blocked() {
    $f = brute_file();
    $d = is_file($f) ? (json_decode(file_get_contents($f), true) ?: []) : [];
    $ip = $_SERVER['REMOTE_ADDR'] ?? '?';
    $list = array_filter($d[$ip] ?? [], fn($t) => $t > time() - 3600);
    return count($list) >= 10;
}
function brute_fail() {
    $f = brute_file();
    @mkdir(dirname($f), 0755, true);
    $d = is_file($f) ? (json_decode(file_get_contents($f), true) ?: []) : [];
    $ip = $_SERVER['REMOTE_ADDR'] ?? '?';
    $d[$ip] = array_values(array_filter($d[$ip] ?? [], fn($t) => $t > time() - 3600));
    $d[$ip][] = time();
    foreach ($d as $k => $v) if (!$v || max($v) < time() - 3600) unset($d[$k]);   // aufräumen
    file_put_contents($f, json_encode($d), LOCK_EX);
    sleep(2);
}
// Prüft das Passwort aus dem Header X-Token; true wenn korrekt
function token_ok($cfg) {
    $protect = $cfg['brute_protect'] ?? true;
    if (!$protect) return hash_equals((string)$cfg['token'], (string)($_SERVER['HTTP_X_TOKEN'] ?? ''));
    if (brute_blocked()) { http_response_code(429); header('Content-Type: application/json'); echo json_encode(['error' => 'Zu viele Fehlversuche – in einer Stunde wieder versuchen']); exit; }
    $ok = hash_equals((string)$cfg['token'], (string)($_SERVER['HTTP_X_TOKEN'] ?? ''));
    if (!$ok && ($_SERVER['HTTP_X_TOKEN'] ?? '') !== '') brute_fail();
    return $ok;
}
