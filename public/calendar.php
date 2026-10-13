<?php
// Liest die Google-Kalender (iCal-Links aus config.php) und liefert die nächsten 14 Tage als JSON.
// Cache: 10 Minuten. Wiederkehrende Termine: täglich/wöchentlich/monatlich/jährlich (einfach).

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-store');

$cfg = require __DIR__ . '/config.php';
$viewKey = $cfg['view_key'] ?? '';
if ($viewKey !== '' && !hash_equals($viewKey, (string)($_GET['k'] ?? ''))) {
    http_response_code(403); echo json_encode(['error' => 'Kein Zugriff']); exit;
}
$cacheFile = __DIR__ . '/data/calendar-cache.json';
$tz = new DateTimeZone('Europe/Zurich');

if (file_exists($cacheFile) && time() - filemtime($cacheFile) < 600) {
    readfile($cacheFile);
    exit;
}

$from = new DateTime('today', $tz);
$to = (clone $from)->modify('+14 days');
$events = [];

function parseDate($val, $params, $tz) {
    $isDate = strlen($val) === 8 || str_contains($params, 'VALUE=DATE');
    if (str_ends_with($val, 'Z')) {
        $d = new DateTime($val, new DateTimeZone('UTC'));
        $d->setTimezone($tz);
    } elseif (preg_match('/TZID=([^;:]+)/', $params, $m)) {
        try { $d = new DateTime($val, new DateTimeZone($m[1])); } catch (Exception $e) { $d = new DateTime($val, $tz); }
        $d->setTimezone($tz);
    } else {
        $d = new DateTime($val, $tz);
    }
    return [$d, $isDate];
}

foreach (($cfg['ical'] ?? []) as $cal) {
    $ctx = stream_context_create(['http' => ['timeout' => 10]]);
    $ics = @file_get_contents($cal['url'], false, $ctx);
    if (!$ics) continue;
    $ics = preg_replace("/\r?\n[ \t]/", '', $ics); // gefaltete Zeilen zusammenfügen

    preg_match_all('/BEGIN:VEVENT(.*?)END:VEVENT/s', $ics, $blocks);
    foreach ($blocks[1] as $b) {
        $f = [];
        foreach (preg_split("/\r?\n/", trim($b)) as $line) {
            if (!preg_match('/^([A-Z-]+)([^:]*):(.*)$/', $line, $m)) continue;
            $f[$m[1]] = ['p' => $m[2], 'v' => $m[3]];
        }
        if (!isset($f['DTSTART']) || isset($f['RECURRENCE-ID'])) continue;
        if (($f['STATUS']['v'] ?? '') === 'CANCELLED') continue;

        [$start, $allDay] = parseDate($f['DTSTART']['v'], $f['DTSTART']['p'], $tz);
        $title = str_replace(['\\,', '\\;', '\\n'], [',', ';', ' '], $f['SUMMARY']['v'] ?? '(ohne Titel)');

        $dates = [];
        if (isset($f['RRULE'])) {
            parse_str(str_replace(';', '&', $f['RRULE']['v']), $r);
            $step = ['DAILY' => 'day', 'WEEKLY' => 'week', 'MONTHLY' => 'month', 'YEARLY' => 'year'][$r['FREQ'] ?? ''] ?? null;
            if (!$step) continue;
            $interval = max(1, (int)($r['INTERVAL'] ?? 1));
            $until = isset($r['UNTIL']) ? parseDate($r['UNTIL'], '', $tz)[0] : null;
            $count = isset($r['COUNT']) ? (int)$r['COUNT'] : PHP_INT_MAX;
            $byDays = isset($r['BYDAY']) && $step === 'week' ? explode(',', $r['BYDAY']) : null;
            $map = ['MO' => 1, 'TU' => 2, 'WE' => 3, 'TH' => 4, 'FR' => 5, 'SA' => 6, 'SU' => 7];

            $cur = clone $start; $n = 0;
            for ($i = 0; $i < 3000 && $cur < $to && $n < $count; $i++) {
                if ($until && $cur > $until) break;
                if ($byDays) {
                    // jeden gewünschten Wochentag in dieser Woche
                    $monday = (clone $cur)->modify('monday this week');
                    foreach ($byDays as $bd) {
                        $wd = $map[substr($bd, -2)] ?? null;
                        if (!$wd) continue;
                        $d = (clone $monday)->modify('+' . ($wd - 1) . ' days')->setTime((int)$start->format('H'), (int)$start->format('i'));
                        if ($d < $start || ($until && $d > $until)) continue;
                        $n++;
                        if ($d >= $from && $d < $to) $dates[] = $d;
                    }
                } else {
                    $n++;
                    if ($cur >= $from && $cur < $to) $dates[] = clone $cur;
                }
                $cur->modify("+$interval $step");
            }
            // Ausnahmen (gelöschte Einzeltermine)
            if (preg_match_all('/EXDATE[^:]*:([0-9TZ,]+)/', $b, $ex)) {
                $skip = [];
                foreach ($ex[1] as $list) foreach (explode(',', $list) as $x) $skip[] = substr($x, 0, 8);
                $dates = array_filter($dates, fn($d) => !in_array($d->format('Ymd'), $skip));
            }
        } elseif ($start >= $from && $start < $to) {
            $dates[] = $start;
        } elseif ($allDay && isset($f['DTEND'])) {
            // mehrtägiger Ganztagestermin, der vor heute begonnen hat
            [$end] = parseDate($f['DTEND']['v'], $f['DTEND']['p'], $tz);
            if ($start < $from && $end > $from) $dates[] = clone $from;
        }

        foreach ($dates as $d) {
            $events[] = [
                'title' => $title,
                'date'  => $d->format('Y-m-d'),
                'time'  => $allDay ? '' : $d->format('H:i'),
                'cal'   => $cal['name'] ?? '',
                'color' => $cal['color'] ?? '#7aa2f7',
            ];
        }
    }
}

usort($events, fn($a, $b) => strcmp($a['date'] . ($a['time'] ?: '00:00'), $b['date'] . ($b['time'] ?: '00:00')));
$json = json_encode(['events' => $events, 'fetched' => time()], JSON_UNESCAPED_UNICODE);
if (!is_dir(dirname($cacheFile))) mkdir(dirname($cacheFile), 0755, true);
file_put_contents($cacheFile, $json);
echo $json;
