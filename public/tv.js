// Tiff TV Dashboard – Anzeige auf dem Fernseher
// Bewusst einfaches JavaScript, damit es auch im älteren LG-webOS-Browser läuft.
(function () {
  'use strict';

  var API = (window.DASH_API || '');
  var KEY = encodeURIComponent(window.DASH_KEY || '');
  var state = { data: null, cal: [], settings: null, lastOk: 0 };

  var WD = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  var WD_S = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  var MON = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

  function $(id) { return document.getElementById(id); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseYmd(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function daysBetween(a, b) { return Math.round((parseYmd(b) - parseYmd(a)) / 86400000); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function getJSON(url, cb) {
    var x = new XMLHttpRequest();
    x.open('GET', url + (url.indexOf('?') < 0 ? '?' : '&') + '_=' + Date.now());
    x.timeout = 15000;
    x.onload = function () {
      if (x.status === 200) { try { cb(null, JSON.parse(x.responseText)); } catch (e) { cb(e); } }
      else cb(new Error('HTTP ' + x.status));
    };
    x.onerror = x.ontimeout = function () { cb(new Error('Netzwerk')); };
    x.send();
  }

  // ---------- Uhr & Nachtmodus ----------
  function minutes(hhmm) { var p = (hhmm || '0:0').split(':'); return (+p[0]) * 60 + (+p[1]); }
  function isNight(now) {
    var s = state.settings;
    if (!s) return false;
    var m = now.getHours() * 60 + now.getMinutes();
    var a = minutes(s.night_from), b = minutes(s.night_to);
    return a > b ? (m >= a || m < b) : (m >= a && m < b);
  }

  var lastMinute = -1;
  function tick() {
    var now = new Date();
    if (now.getMinutes() === lastMinute) return;
    lastMinute = now.getMinutes();
    var t = pad(now.getHours()) + ':' + pad(now.getMinutes());
    $('clock').textContent = t;
    $('nightclock').textContent = t;
    $('date').textContent = WD[now.getDay()] + ', ' + now.getDate() + '. ' + MON[now.getMonth()] + ' ' + now.getFullYear();

    var night = isNight(now);
    $('night').classList.toggle('hidden', !night);
    $('stage').style.opacity = night ? '0' : '1';
    if (night) moveNightClock();

    // Mitternacht: alles neu zeichnen (heute/morgen verschiebt sich)
    if (now.getHours() === 0 && now.getMinutes() === 0) render();
  }

  function moveNightClock() {
    var c = $('nightclock');
    c.style.left = (100 + Math.random() * 1500) + 'px';
    c.style.top = (100 + Math.random() * 800) + 'px';
  }

  // ---------- Einbrenn-Schutz: ganze Fläche alle 3 Minuten leicht verschieben ----------
  function pixelShift() {
    var x = Math.round(Math.random() * 40 - 20);
    var y = Math.round(Math.random() * 24 - 12);
    $('stage').style.transform = 'translate(' + x + 'px,' + y + 'px)';
  }

  // ---------- Daten laden ----------
  function loadData() {
    getJSON(API + 'api.php?k=' + KEY, function (err, d) {
      if (err) return showStatus();
      state.data = d;
      state.settings = d.settings;
      state.lastOk = Date.now();
      render();
      showStatus();
    });
  }

  function loadCalendar() {
    getJSON(API + 'calendar.php?k=' + KEY, function (err, d) {
      if (err || !d) return;
      state.cal = d.events || [];
      render();
    });
  }

  var WCODE = {
    0: 'Klar', 1: 'Überwiegend klar', 2: 'Teilweise bewölkt', 3: 'Bedeckt', 45: 'Nebel', 48: 'Nebel',
    51: 'Nieselregen', 53: 'Nieselregen', 55: 'Nieselregen', 61: 'Leichter Regen', 63: 'Regen', 65: 'Starker Regen',
    66: 'Eisregen', 67: 'Eisregen', 71: 'Leichter Schnee', 73: 'Schnee', 75: 'Starker Schnee', 77: 'Schneegriesel',
    80: 'Regenschauer', 81: 'Regenschauer', 82: 'Heftige Schauer', 85: 'Schneeschauer', 86: 'Schneeschauer',
    95: 'Gewitter', 96: 'Gewitter mit Hagel', 99: 'Gewitter mit Hagel'
  };
  function loadWeather() {
    var s = state.settings;
    if (!s) return setTimeout(loadWeather, 5000);
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + s.lat + '&longitude=' + s.lon +
      '&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=Europe%2FZurich&forecast_days=4';
    getJSON(url, function (err, w) {
      if (err || !w || !w.current_weather) return;
      var box = $('weather');
      box.innerHTML = '';
      box.appendChild(el('div', 'now', Math.round(w.current_weather.temperature) + '°'));
      box.appendChild(el('div', 'desc', (s.place ? s.place + ' · ' : '') + (WCODE[w.current_weather.weathercode] || '')));
      var days = el('div', 'days');
      for (var i = 1; i < w.daily.time.length; i++) {
        var d = parseYmd(w.daily.time[i]);
        days.appendChild(el('span', null, WD_S[d.getDay()] + ' ' + Math.round(w.daily.temperature_2m_min[i]) + '/' + Math.round(w.daily.temperature_2m_max[i]) + '°'));
      }
      box.appendChild(days);
    });
  }

  // ---------- Anzeige ----------
  function memberColor(name) {
    var fam = (state.settings && state.settings.family) || [];
    for (var i = 0; i < fam.length; i++) if (fam[i].name === name) return fam[i].color;
    return '#9aa5ce';
  }

  function render() {
    var d = state.data;
    if (!d) return;
    var today = ymd(new Date());

    // Banner
    var msg = $('message');
    msg.textContent = d.message || '';
    msg.classList.toggle('hidden', !d.message);

    // Familien-Pinnwand (abgelaufene "nur heute"-Notizen ausblenden)
    var notes = $('notes');
    notes.innerHTML = '';
    var list = (d.notes || []).filter(function (n) { return !n.until || n.until >= today; });
    if (!list.length) notes.appendChild(el('div', 'empty', 'Keine Nachrichten'));
    list.slice(0, 8).forEach(function (n) {
      var c = memberColor(n.to || 'Alle');
      var box = el('div', 'note');
      box.style.borderLeftColor = c;
      var to = el('div', 'to', n.to && n.to !== 'Alle' ? 'Für ' + n.to : 'Für alle');
      to.style.color = c;
      if (n.until === today) to.appendChild(el('span', 'today', '· nur heute'));
      box.appendChild(to);
      box.appendChild(el('div', 'text', n.text));
      if (n.from) box.appendChild(el('div', 'from', '– ' + n.from));
      notes.appendChild(box);
    });

    // Termine: Google-Kalender + eigene Termine, nächste 7 Tage
    var evs = state.cal.slice();
    (d.events || []).forEach(function (e) {
      evs.push({ title: e.title, date: e.date, time: e.time, color: '#e0af68' });
    });
    evs = evs.filter(function (e) { var diff = daysBetween(today, e.date); return diff >= 0 && diff < 7; });
    evs.sort(function (a, b) { return (a.date + (a.time || '00:00')).localeCompare(b.date + (b.time || '00:00')); });

    var ag = $('agenda');
    ag.innerHTML = '';
    if (!evs.length) ag.appendChild(el('div', 'empty', 'Keine Termine in den nächsten 7 Tagen'));
    var lines = 0, curDay = null, dayBox = null;
    for (var i = 0; i < evs.length && lines < 13; i++) {
      var e = evs[i];
      if (e.date !== curDay) {
        curDay = e.date;
        var diff = daysBetween(today, e.date), dt = parseYmd(e.date);
        var label = diff === 0 ? 'Heute' : diff === 1 ? 'Morgen' : WD[dt.getDay()] + ', ' + dt.getDate() + '. ' + MON[dt.getMonth()];
        dayBox = el('div', 'day' + (diff === 0 ? ' is-today' : ''));
        dayBox.appendChild(el('div', 'label', label));
        ag.appendChild(dayBox);
        lines++;
      }
      var row = el('div', 'ev');
      var dot = el('span', 'dot');
      dot.style.background = e.color || '#7aa2f7';
      row.appendChild(dot);
      row.appendChild(el('span', 'time' + (e.time ? '' : ' allday'), e.time || 'ganztags'));
      row.appendChild(el('span', 'title', e.title));
      dayBox.appendChild(row);
      lines++;
    }

    fit('notes', '.note');
    fit('agenda', '.ev');

    // Wichtig
    var imp = $('important');
    imp.innerHTML = '';
    var items = (d.important || []).slice().sort(function (a, b) { return (a.date || '9999').localeCompare(b.date || '9999'); });
    if (!items.length) imp.appendChild(el('div', 'empty', 'Nichts Dringendes'));
    items.slice(0, 7).forEach(function (it) {
      var box = el('div', 'imp');
      box.appendChild(el('div', 'text', it.text));
      if (it.date) {
        var diff = daysBetween(today, it.date), txt, cls = 'when';
        if (diff < 0) { txt = 'seit ' + (-diff) + (diff === -1 ? ' Tag' : ' Tagen') + ' fällig'; cls += ' over'; }
        else if (diff === 0) { txt = 'heute'; cls += ' soon'; }
        else if (diff === 1) { txt = 'morgen'; cls += ' soon'; }
        else { txt = 'in ' + diff + ' Tagen'; if (diff <= 3) cls += ' soon'; }
        box.appendChild(el('div', cls, txt));
      }
      imp.appendChild(box);
    });
    fit('important', '.imp');
  }

  // Was nicht auf den Bildschirm passt, von unten entfernen und "+N weitere" anzeigen
  function fit(id, itemSel) {
    var box = $(id), panel = box.parentNode;
    var more = null, hidden = 0;
    while (panel.scrollHeight > panel.clientHeight + 2) {
      var items = box.querySelectorAll(itemSel);
      if (items.length <= 1) break;
      var last = items[items.length - 1], parent = last.parentNode;
      parent.removeChild(last);
      if (parent !== box && !parent.querySelector(itemSel)) box.removeChild(parent); // leerer Tag
      hidden++;
      if (!more) { more = el('div', 'more'); box.appendChild(more); }
      more.textContent = '+ ' + hidden + ' weitere';
    }
  }

  function showStatus() {
    var s = $('status');
    if (!state.lastOk) { s.textContent = 'Verbinde …'; return; }
    var age = Math.round((Date.now() - state.lastOk) / 60000);
    s.textContent = age > 2 ? 'Offline seit ' + age + ' Min.' : '';
  }

  // ---------- Start ----------
  tick();
  loadData();
  loadCalendar();
  setTimeout(loadWeather, 1500);

  setInterval(tick, 1000);
  setInterval(loadData, 30 * 1000);          // Pinnwand/Notizen: alle 30 s
  setInterval(loadCalendar, 5 * 60 * 1000);  // Kalender: alle 5 min
  setInterval(loadWeather, 30 * 60 * 1000);  // Wetter: alle 30 min
  setInterval(pixelShift, 3 * 60 * 1000);    // OLED-Schutz
  setInterval(function () { if (!isNight(new Date())) location.reload(); }, 6 * 60 * 60 * 1000); // Speicher frisch halten
})();
