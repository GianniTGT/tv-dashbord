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
