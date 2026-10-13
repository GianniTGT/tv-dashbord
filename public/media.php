<?php
// Tiff TV Dashboard – Fotos und Sprachnachrichten
// GET  media.php?f=photos/<datei>&k=<view_key>   → Datei ausliefern (TV)  (Handy: &t=<token>)
// POST media.php action=photo  file=<Bild>                      → Foto hochladen
// POST media.php action=audio  file=<Audio> from= to= title=    → Sprachnachricht hochladen
// POST media.php action=delete type=photos|audio id=<id>         → löschen
// POST braucht Header X-Token.

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, X-Token');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

$cfg = require __DIR__ . '/config.php';
require __DIR__ . '/lib.php';

$base = __DIR__ . '/data';
$maxPhotos = (int)($cfg['max_photos'] ?? 300);
$maxAudio  = (int)($cfg['max_audio'] ?? 20);

function fail($code, $msg) {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

// ---------- Datei ausliefern ----------
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $viewKey = $cfg['view_key'] ?? '';
    $ok = ($viewKey === '' || hash_equals($viewKey, (string)($_GET['k'] ?? '')))
          || hash_equals($cfg['token'], (string)($_GET['t'] ?? ''));
    if (!$ok) fail(403, 'Kein Zugriff');

    $f = (string)($_GET['f'] ?? '');
    if (!preg_match('#^(photos|audio)/[a-z0-9]+\.(jpg|webm|ogg|m4a|mp4|mp3|aac)$#', $f)) fail(400, 'Ungültig');
    $path = "$base/$f";
    if (!is_file($path)) fail(404, 'Nicht gefunden');

    $types = ['jpg' => 'image/jpeg', 'webm' => 'audio/webm', 'ogg' => 'audio/ogg', 'm4a' => 'audio/mp4',
              'mp4' => 'audio/mp4', 'mp3' => 'audio/mpeg', 'aac' => 'audio/aac'];
    $ext = pathinfo($path, PATHINFO_EXTENSION);
    $size = filesize($path);
    header('Content-Type: ' . $types[$ext]);
    header('Cache-Control: private, max-age=31536000, immutable');
    header('Accept-Ranges: bytes');

    // Range-Unterstützung (nötig fürs Abspielen auf iPhone/Safari)
    $start = 0; $end = $size - 1;
    if (isset($_SERVER['HTTP_RANGE']) && preg_match('/bytes=(\d*)-(\d*)/', $_SERVER['HTTP_RANGE'], $m)) {
        if ($m[1] !== '') $start = (int)$m[1];
        if ($m[2] !== '') $end = min((int)$m[2], $size - 1);
        if ($m[1] === '' && $m[2] !== '') { $start = $size - (int)$m[2]; $end = $size - 1; }
        if ($start > $end || $start >= $size) { http_response_code(416); header("Content-Range: bytes */$size"); exit; }
        http_response_code(206);
        header("Content-Range: bytes $start-$end/$size");
    }
    header('Content-Length: ' . ($end - $start + 1));
    $fp = fopen($path, 'rb');
    fseek($fp, $start);
    $left = $end - $start + 1;
    while ($left > 0 && !feof($fp)) { $chunk = fread($fp, min(65536, $left)); echo $chunk; $left -= strlen($chunk); }
    fclose($fp);
    exit;
}

// ---------- Hochladen / Löschen ----------
header('Content-Type: application/json; charset=utf-8');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail(405, 'Methode nicht erlaubt');
if (!hash_equals($cfg['token'], (string)($_SERVER['HTTP_X_TOKEN'] ?? ''))) fail(401, 'Falsches Passwort');

$action = $_POST['action'] ?? '';
$clean = fn($s, $max) => mb_substr(trim(strip_tags((string)$s)), 0, $max);
$newId = fn() => base_convert((string)time(), 10, 36) . bin2hex(random_bytes(4));

if ($action === 'photo') {
    if (!function_exists('imagecreatefromstring')) fail(500, 'PHP-Erweiterung GD fehlt auf dem Server');
    $file = $_FILES['file'] ?? null;
    if (!$file || $file['error'] !== UPLOAD_ERR_OK) fail(400, 'Kein Foto empfangen');
    if ($file['size'] > 25 * 1024 * 1024) fail(400, 'Foto zu gross (max. 25 MB)');
    $img = @imagecreatefromstring(file_get_contents($file['tmp_name']));
    if (!$img) fail(400, 'Bildformat nicht unterstützt (JPG/PNG/WebP)');

    // Neu codieren: entfernt GPS/EXIF-Daten, max. 1600 px (TV-Ecke braucht nicht mehr)
    $w = imagesx($img); $h = imagesy($img); $max = 1600;
    if ($w > $max || $h > $max) {
        $s = min($max / $w, $max / $h);
        $nw = (int)round($w * $s); $nh = (int)round($h * $s);
        $dst = imagecreatetruecolor($nw, $nh);
        imagecopyresampled($dst, $img, 0, 0, 0, 0, $nw, $nh, $w, $h);
        imagedestroy($img); $img = $dst; $w = $nw; $h = $nh;
    }
    $id = $newId();
    @mkdir("$base/photos", 0755, true);
    imagejpeg($img, "$base/photos/$id.jpg", 85);
    imagedestroy($img);

    $removed = [];
    media_update($base, function (&$m) use ($id, $w, $h, $maxPhotos, $clean, &$removed) {
        array_unshift($m['photos'], ['id' => $id, 'file' => "photos/$id.jpg", 'w' => $w, 'h' => $h,
                                     'from' => $clean($_POST['from'] ?? '', 30), 'created' => time()]);
        while (count($m['photos']) > $maxPhotos) $removed[] = array_pop($m['photos'])['file'];
    });
    foreach ($removed as $r) @unlink("$base/$r");
    echo json_encode(['ok' => true, 'id' => $id]);
    exit;
}

if ($action === 'audio') {
    $file = $_FILES['file'] ?? null;
    if (!$file || $file['error'] !== UPLOAD_ERR_OK) fail(400, 'Keine Aufnahme empfangen');
    if ($file['size'] > 20 * 1024 * 1024) fail(400, 'Aufnahme zu gross (max. 20 MB)');
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
    $map = ['audio/webm' => 'webm', 'video/webm' => 'webm', 'audio/ogg' => 'ogg', 'application/ogg' => 'ogg',
            'audio/mp4' => 'm4a', 'audio/x-m4a' => 'm4a', 'video/mp4' => 'mp4', 'audio/mpeg' => 'mp3',
            'audio/aac' => 'aac', 'audio/x-hx-aac-adts' => 'aac'];
    if (!isset($map[$mime])) fail(400, "Audioformat nicht unterstützt ($mime)");
    $id = $newId();
    $fileRel = "audio/$id." . $map[$mime];
    @mkdir("$base/audio", 0755, true);
    if (!move_uploaded_file($file['tmp_name'], "$base/$fileRel")) fail(500, 'Speichern fehlgeschlagen');

    $removed = [];
    media_update($base, function (&$m) use ($id, $fileRel, $maxAudio, $clean, &$removed) {
        array_unshift($m['audio'], [
            'id' => $id, 'file' => $fileRel,
            'from' => $clean($_POST['from'] ?? '', 30), 'to' => $clean($_POST['to'] ?? 'Alle', 30),
            'title' => $clean($_POST['title'] ?? '', 120),
            'duration' => max(0, min(3600, (int)($_POST['duration'] ?? 0))),
            'created' => time(),
        ]);
        while (count($m['audio']) > $maxAudio) $removed[] = array_pop($m['audio'])['file'];
    });
    foreach ($removed as $r) @unlink("$base/$r");
    echo json_encode(['ok' => true, 'id' => $id]);
    exit;
}

if ($action === 'delete') {
    $type = $_POST['type'] ?? '';
    $id = (string)($_POST['id'] ?? '');
    if (!in_array($type, ['photos', 'audio'], true)) fail(400, 'Ungültiger Typ');
    $gone = null;
    media_update($base, function (&$m) use ($type, $id, &$gone) {
        $m[$type] = array_values(array_filter($m[$type], function ($x) use ($id, &$gone) {
            if ($x['id'] === $id) { $gone = $x['file']; return false; }
            return true;
        }));
    });
    if ($gone) @unlink("$base/$gone");
    echo json_encode(['ok' => true]);
    exit;
}

fail(400, 'Unbekannte Aktion');
