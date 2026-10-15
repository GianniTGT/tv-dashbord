// Tiff TV Dashboard – Anzeige auf dem Fernseher
// Bewusst einfaches JavaScript, damit es auch im älteren LG-webOS-Browser läuft.
(function () {
  'use strict';

  var API = (window.DASH_API || '');
  var KEY = encodeURIComponent(window.DASH_KEY || '');
  var state = { data: null, cal: [], settings: null, lastOk: 0 };

  // ---------- Sprachen: 'de' Deutsch, 'sq' Albanisch (Einstellung 'lang' in config.php) ----------
  var I18N = {
    de: {
      WD: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
      WD_S: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
      MON: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
      date: function (wd, d, m, y) { return wd + ', ' + d + '. ' + m + (y ? ' ' + y : ''); },
      h_family: 'Familien-Pinnwand', h_agenda: 'Termine', h_important: 'Wichtig',
      noNotes: 'Keine Nachrichten', noEvents: 'Keine Termine in den nächsten 7 Tagen', noImportant: 'Nichts Dringendes',
      forAll: 'Für alle', forX: function (n) { return 'Für ' + n; }, onlyToday: '· nur heute',
      today: 'Heute', tomorrow: 'Morgen', allDay: 'ganztags',
      overdue: function (n) { return 'seit ' + n + (n === 1 ? ' Tag' : ' Tagen') + ' fällig'; },
      dueToday: 'heute', dueTomorrow: 'morgen', dueIn: function (n) { return 'in ' + n + ' Tagen'; },
      more: function (n) { return '+ ' + n + ' weitere'; },
      isNew: 'NEU', voice: 'Sprachnachricht', family: 'Familie',
      pressOk: 'OK drücken zum Abspielen', choose: 'mit ▲▼ auswählen',
      quote: 'SPRUCH DES TAGES', ayahRef: function (s, n, v) { return 'Sure ' + s + ' · ' + n + ' · Vers ' + v; },
      connecting: 'Verbinde …', offline: function (m) { return 'Offline seit ' + m + ' Min.'; },
      noPhotos: 'Fotos über das Handy hinzufügen',
      wdesc: function (p, c) { return (p ? p + ' · ' : '') + (this.W[c] || ''); },
      PR: { Fajr: 'Fajr', Sunrise: 'Sonnenaufgang', Dhuhr: 'Dhuhr', Asr: 'Asr', Maghrib: 'Maghrib', Isha: 'Isha' },
      inT: function (h, m) { return 'in ' + (h ? h + ' h ' : '') + m + ' min'; }, nowP: 'jetzt',
      HM: ['Muharram', 'Safar', 'Rabi al-awwal', 'Rabi al-thani', 'Dschumada al-ula', 'Dschumada al-achira', 'Radschab', 'Schaban', 'Ramadan', 'Schawwal', 'Dhul-Qada', 'Dhul-Hiddscha'],
      W: { 0: 'Klar', 1: 'Überwiegend klar', 2: 'Teilweise bewölkt', 3: 'Bedeckt', 45: 'Nebel', 48: 'Nebel',
        51: 'Nieselregen', 53: 'Nieselregen', 55: 'Nieselregen', 61: 'Leichter Regen', 63: 'Regen', 65: 'Starker Regen',
        66: 'Eisregen', 67: 'Eisregen', 71: 'Leichter Schnee', 73: 'Schnee', 75: 'Starker Schnee', 77: 'Schneegriesel',
        80: 'Regenschauer', 81: 'Regenschauer', 82: 'Heftige Schauer', 85: 'Schneeschauer', 86: 'Schneeschauer',
        95: 'Gewitter', 96: 'Gewitter mit Hagel', 99: 'Gewitter mit Hagel' }
    },
    sq: {
      WD: ['E diel', 'E hënë', 'E martë', 'E mërkurë', 'E enjte', 'E premte', 'E shtunë'],
      WD_S: ['Die', 'Hën', 'Mar', 'Mër', 'Enj', 'Pre', 'Sht'],
      MON: ['janar', 'shkurt', 'mars', 'prill', 'maj', 'qershor', 'korrik', 'gusht', 'shtator', 'tetor', 'nëntor', 'dhjetor'],
      date: function (wd, d, m, y) { return wd + ', ' + d + ' ' + m + (y ? ' ' + y : ''); },
      h_family: 'Tabela e familjes', h_agenda: 'Takimet', h_important: 'E rëndësishme',
      noNotes: 'Asnjë mesazh', noEvents: 'Asnjë takim në 7 ditët e ardhshme', noImportant: 'Asgjë urgjente',
      forAll: 'Për të gjithë', forX: function (n) { return 'Për ' + n; }, onlyToday: '· vetëm sot',
      today: 'Sot', tomorrow: 'Nesër', allDay: 'gjithë ditën',
      overdue: function (n) { return 'vonuar ' + n + (n === 1 ? ' ditë' : ' ditë'); },
      dueToday: 'sot', dueTomorrow: 'nesër', dueIn: function (n) { return 'pas ' + n + ' ditësh'; },
      more: function (n) { return '+ ' + n + ' të tjera'; },
      isNew: 'E RE', voice: 'Mesazh zanor', family: 'Familja',
      pressOk: 'Shtyp OK për ta dëgjuar', choose: 'zgjidh me ▲▼',
      quote: 'THËNIA E DITËS', ayahRef: function (s, n, v) { return 'Sureja ' + s + ' · ' + n + ' · Ajeti ' + v; },
      connecting: 'Duke u lidhur …', offline: function (m) { return 'Pa lidhje prej ' + m + ' min.'; },
      noPhotos: 'Shto foto nga telefoni',
      wdesc: function (p, c) { return (p ? p + ' ' : '') + (this.WP[c] || ''); },
      WP: { 0: 'me qiell të kthjellët', 1: 'kryesisht me diell', 2: 'pjesërisht me re', 3: 'me re', 45: 'me mjegull', 48: 'me mjegull',
        51: 'me shi të imët', 53: 'me shi të imët', 55: 'me shi të imët', 61: 'me shi të lehtë', 63: 'me shi', 65: 'me shi të fortë',
        66: 'me shi të ngrirë', 67: 'me shi të ngrirë', 71: 'me borë të lehtë', 73: 'me borë', 75: 'me borë të dendur', 77: 'me kokrriza bore',
        80: 'me rrebeshe shiu', 81: 'me rrebeshe shiu', 82: 'me rrebeshe të forta', 85: 'me rrebeshe bore', 86: 'me rrebeshe bore',
        95: 'me stuhi', 96: 'me stuhi e breshër', 99: 'me stuhi e breshër' },
      PR: { Fajr: 'Sabahu', Sunrise: 'Lindja e diellit', Dhuhr: 'Dreka', Asr: 'Ikindia', Maghrib: 'Akshami', Isha: 'Jacia' },
      inT: function (h, m) { return 'pas ' + (h ? h + ' orë ' : '') + m + ' min'; }, nowP: 'tani',
      HM: ['Muharrem', 'Safer', 'Rebiul-evvel', 'Rebiul-ahir', 'Xhumadel-ula', 'Xhumadel-ahire', 'Rexheb', 'Shaban', 'Ramazan', 'Sheval', 'Dhul-kade', 'Dhul-hixhe'],
      W: { 0: 'Kthjellët', 1: 'Kryesisht kthjellët', 2: 'Pjesërisht me re', 3: 'Vranët', 45: 'Mjegull', 48: 'Mjegull',
        51: 'Shi i imët', 53: 'Shi i imët', 55: 'Shi i imët', 61: 'Shi i lehtë', 63: 'Shi', 65: 'Shi i fortë',
        66: 'Shi i ngrirë', 67: 'Shi i ngrirë', 71: 'Borë e lehtë', 73: 'Borë', 75: 'Borë e dendur', 77: 'Kokrriza bore',
        80: 'Rrebesh shiu', 81: 'Rrebesh shiu', 82: 'Rrebesh i fortë', 85: 'Rrebesh bore', 86: 'Rrebesh bore',
        95: 'Stuhi', 96: 'Stuhi me breshër', 99: 'Stuhi me breshër' }
    }
  };
  var L = I18N.de;
  function setLang(code) {
    var nl = I18N[code] || I18N.de;
    if (nl === L) return;
    L = nl;
    document.documentElement.lang = code;
    lastMinute = -1;            // Datum sofort neu schreiben
  }
  function applyStaticTexts() {
    var hs = document.querySelectorAll('.panel h2');
    var icons = ['📌', '📅', '⭐'], texts = [L.h_family, L.h_agenda, L.h_important];
    for (var i = 0; i < 3; i++) {
      if (!hs[i]) continue;
      hs[i].innerHTML = '';
      hs[i].appendChild(el('span', 'ico', icons[i]));
      hs[i].appendChild(document.createTextNode(texts[i]));
      emo(hs[i]);
    }
    $('photoEmpty').textContent = L.noPhotos;
  }

  function $(id) { return document.getElementById(id); }
  // Emojis in farbige Bilder umwandeln (Twemoji, SVG)
  function emo(node) {
    if (!window.twemoji || !node) return;
    try { window.twemoji.parse(node, { folder: 'svg', ext: '.svg' }); } catch (e) {}
  }
  var WICON = function (c) {
    if (c === 0) return '☀️'; if (c === 1) return '🌤️'; if (c === 2) return '⛅'; if (c === 3) return '☁️';
    if (c === 45 || c === 48) return '🌫️'; if (c >= 51 && c <= 67) return '🌧️'; if (c >= 71 && c <= 77) return '❄️';
    if (c >= 80 && c <= 82) return '🌦️'; if (c === 85 || c === 86) return '🌨️'; if (c >= 95) return '⛈️'; return '';
  };
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
    $('date').textContent = L.date(L.WD[now.getDay()], now.getDate(), L.MON[now.getMonth()], now.getFullYear());

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
      // Automatisches Update: neue Version auf dem Server → Seite frisch laden
      if (d.version) {
        if (state.version && d.version !== state.version && !(player && !player.paused)) {
          location.replace(location.pathname + '?v=' + d.version);
          return;
        }
        state.version = d.version;
      }
      state.settings = d.settings;
      var langChanged = (I18N[d.settings.lang] || I18N.de) !== L;
      setLang(d.settings.lang);
      applyStaticTexts();
      if (langChanged) { tick(); loadWeather(); renderPrayers(); }
      state.lastOk = Date.now();
      render();
      setPhotos(d.photos || []);
      renderAyah();
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

  function loadWeather() {
    var s = state.settings;
    if (!s) return setTimeout(loadWeather, 5000);
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + s.lat + '&longitude=' + s.lon +
      '&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=Europe%2FZurich&forecast_days=4';
    getJSON(url, function (err, w) {
      if (err || !w || !w.current_weather) return;
      var box = $('weather');
      box.innerHTML = '';
      var now = el('div', 'now');
      now.appendChild(el('span', 'wico', WICON(w.current_weather.weathercode)));
      now.appendChild(document.createTextNode(Math.round(w.current_weather.temperature) + '°'));
      box.appendChild(now);
      box.appendChild(el('div', 'desc', L.wdesc(s.place, w.current_weather.weathercode)));
      var days = el('div', 'days');
      for (var i = 1; i < w.daily.time.length; i++) {
        var d = parseYmd(w.daily.time[i]);
        var dsp = el('span');
        dsp.appendChild(el('span', 'wico', WICON(w.daily.weathercode[i])));
        dsp.appendChild(document.createTextNode(L.WD_S[d.getDay()] + ' ' + Math.round(w.daily.temperature_2m_min[i]) + '/' + Math.round(w.daily.temperature_2m_max[i]) + '°'));
        days.appendChild(dsp);
      }
      box.appendChild(days);
      emo(box);
    });
  }

  // ---------- Anzeige ----------
  function memberColor(name) {
    var fam = (state.settings && state.settings.family) || [];
    for (var i = 0; i < fam.length; i++) if (fam[i].name === name) return fam[i].color;
    return '#9aa5ce';
  }

  // ---------- Banner oben: Nachricht + "E rëndësishme" ----------
  function renderBanner(d, today) {
    var banner = $('banner'), msg = $('message'), imp = $('important');
    msg.textContent = d.message || '';
    msg.classList.toggle('hidden', !d.message);
    imp.innerHTML = '';
    var items = (d.important || []).slice().sort(function (a, b) { return (a.date || '9999').localeCompare(b.date || '9999'); });
    if (items.length) {
      var head = el('span', 'bhead');
      head.appendChild(el('span', 'ico', '⭐'));
      head.appendChild(document.createTextNode(L.h_important));
      imp.appendChild(head);
    }
    items.forEach(function (it) {
      var cls = 'chip', txt = '';
      if (it.date) {
        var diff = daysBetween(today, it.date);
        if (diff < 0) { txt = L.overdue(-diff); cls += ' over'; }
        else if (diff === 0) { txt = L.dueToday; cls += ' soon'; }
        else if (diff === 1) { txt = L.dueTomorrow; cls += ' soon'; }
        else { txt = L.dueIn(diff); if (diff <= 3) cls += ' soon'; }
      }
      var chip = el('span', cls);
      chip.appendChild(el('span', 'ct', it.text));
      if (txt) chip.appendChild(el('span', 'cw', txt));
      imp.appendChild(chip);
    });
    imp.classList.toggle('hidden', !items.length);
    banner.classList.toggle('hidden', !d.message && !items.length);
    banner.className = banner.className.replace(/ ?solo/g, '') + (!d.message || !items.length ? ' solo' : '');
    emo(banner);
    // Was nicht hineinpasst: hinten weglassen und "+N" zeigen
    var chips = imp.querySelectorAll('.chip'), hidden = 0, more = null;
    for (var i = chips.length - 1; i > 0 && banner.scrollHeight > banner.clientHeight + 2; i--) {
      imp.removeChild(chips[i]); hidden++;
      if (!more) { more = el('span', 'chip more'); imp.appendChild(more); }
      more.textContent = '+' + hidden;
    }
  }

  function render() {
    var d = state.data;
    if (!d) return;
    var today = ymd(new Date());


    // Familien-Pinnwand (abgelaufene "nur heute"-Notizen ausblenden)
    var notes = $('notes');
    notes.innerHTML = '';
    var list = (d.notes || []).filter(function (n) { return !n.until || n.until >= today; });
    if (!list.length) notes.appendChild(el('div', 'empty', L.noNotes));
    list.slice(0, 8).forEach(function (n) {
      var c = memberColor(n.to || 'Alle');
      var box = el('div', 'note');
      box.style.borderLeftColor = c;
      var to = el('div', 'to', n.to && n.to !== 'Alle' ? L.forX(n.to) : L.forAll);
      to.style.color = c;
      box.appendChild(to);
      box.appendChild(el('div', 'text', n.text));
      if (n.from) box.appendChild(el('div', 'from', '– ' + n.from));
      notes.appendChild(box);
    });

    // Termine: Google-Kalender + eigene Termine, nächste 7 Tage
    var evs = state.cal.slice();
    (d.events || []).forEach(function (e) {
      evs.push({ title: e.title, date: e.date, time: e.time, color: '#6fbf9f' });   // Handy-Termine: grün
    });
    evs = evs.filter(function (e) { var diff = daysBetween(today, e.date); return diff >= 0 && diff < 7; });
    evs.sort(function (a, b) { return (a.date + (a.time || '00:00')).localeCompare(b.date + (b.time || '00:00')); });

    // Wochenansicht: immer 7 Tage (heute + 6), auch Tage ohne Termin
    var ag = $('agenda');
    ag.innerHTML = '';
    ag.className = 'week';
    var nowD = new Date(), nowM = nowD.getHours() * 60 + nowD.getMinutes();
    for (var di = 0; di < 7; di++) {
      var dt = parseYmd(today); dt.setDate(dt.getDate() + di);
      var dKey = ymd(dt);
      var dayEvs = evs.filter(function (e) { return e.date === dKey; });
      if (di === 0) {   // heute: kommende Termine zuerst, vorbei geht nach hinten
        var isPast = function (e) { return e.time && nowM > minutes(e.time) + 30; };
        dayEvs = dayEvs.filter(function (e) { return !isPast(e); }).concat(dayEvs.filter(isPast));
      }
      var wd = dt.getDay();
      var row = el('div', 'wrow' + (di === 0 ? ' is-today' : '') + (wd === 0 || wd === 6 ? ' weekend' : ''));
      var left = el('div', 'wday');
      left.appendChild(el('div', 'wname', di === 0 ? L.today : di === 1 ? L.tomorrow : L.WD[wd]));
      left.appendChild(el('div', 'wdate', dt.getDate() + ' ' + L.MON[dt.getMonth()]));
      row.appendChild(left);
      var right = el('div', 'wevs');
      if (!dayEvs.length) right.appendChild(el('div', 'wnone', '–'));
      // mit Gebetszeiten weniger Platz → 1 Termin pro Tag, sonst 2; Rest als "+N" in derselben Zeile
      var maxPer = $('stage').className === 'with-prayers' ? 1 : 2;
      var shown = dayEvs.slice(0, maxPer);
      shown.forEach(function (e, idx) {
        var past = di === 0 && e.time && nowM > minutes(e.time) + 30;   // 30 Min. nach Beginn ausgrauen
        var line = el('div', 'ev' + (past ? ' past' : ''));
        var dot = el('span', 'dot');
        dot.style.background = e.color || '#7aa2f7';
        line.appendChild(dot);
        line.appendChild(el('span', 'time' + (e.time ? '' : ' allday'), e.time || L.allDay));
        line.appendChild(el('span', 'title', e.title));
        if (idx === shown.length - 1 && dayEvs.length > shown.length) line.appendChild(el('span', 'wmore', '+' + (dayEvs.length - shown.length)));
        right.appendChild(line);
      });
      row.appendChild(right);
      ag.appendChild(row);
    }

    renderVoice();
    emo($('notes')); emo($('agenda'));
    fit('notes', '.note');

    renderBanner(d, today);
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
      more.textContent = L.more(hidden);
    }
  }

  function mediaUrl(src) { return API + src + '&k=' + KEY; }
  function storeGet(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function storeSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  // ---------- Sprachnachrichten (Fernbedienung: ▲▼ wählen, OK abspielen/pausieren) ----------
  var player = null, playingId = null, voiceSel = 0, voiceList = [];
  var played = storeGet('played') || [];

  function renderVoice() {
    var d = state.data, box = $('voice');
    var weekAgo = Date.now() / 1000 - 7 * 86400;
    voiceList = (d.audio || []).filter(function (a) { return a.created > weekAgo; }).slice(0, 2);
    if (voiceSel >= voiceList.length) voiceSel = 0;
    box.innerHTML = '';
    voiceList.forEach(function (a, i) {
      var c = memberColor(a.to || 'Alle');
      var row = el('div', 'voice' + (i === voiceSel ? ' sel' : '') + (a.id === playingId ? ' playing' : ''));
      row.id = 'v-' + a.id;
      row.appendChild(el('div', 'play', a.id === playingId && player && !player.paused ? '❚❚' : '▶'));
      var info = el('div', 'info');
      var who = el('div', 'who', '🎙 ' + (a.from || L.family) + (a.to && a.to !== 'Alle' ? ' → ' + a.to : ''));
      who.style.color = c;
      if (played.indexOf(a.id) < 0) who.appendChild(el('span', 'new', L.isNew));
      info.appendChild(who);
      info.appendChild(el('div', 'title', a.title || L.voice));
      var mins = a.duration ? ' · ' + Math.floor(a.duration / 60) + ':' + pad(a.duration % 60) : '';
      info.appendChild(el('div', 'hint', (i === voiceSel ? L.pressOk : L.choose) + mins));
      var bar = el('div', 'bar'); bar.appendChild(el('span'));
      info.appendChild(bar);
      row.appendChild(info);
      row.onclick = function () { voiceSel = i; toggleVoice(); };
      box.appendChild(row);
    });
    emo(box);
  }

  function toggleVoice() {
    var a = voiceList[voiceSel];
    if (!a) return;
    if (player && playingId === a.id) {
      if (player.paused) player.play(); else player.pause();
    } else {
      if (player) player.pause();
      player = new Audio(mediaUrl(a.src));
      playingId = a.id;
      player.ontimeupdate = function () {
        var row = $('v-' + playingId);
        if (row && player.duration) row.querySelector('.bar span').style.width = (100 * player.currentTime / player.duration) + '%';
      };
      player.onended = function () { playingId = null; renderVoice(); };
      player.onplay = player.onpause = function () { renderVoice(); };
      player.play();
      if (played.indexOf(a.id) < 0) { played.push(a.id); played = played.slice(-50); storeSet('played', played); }
    }
    renderVoice();
  }

  document.addEventListener('keydown', function (e) {
    var k = e.keyCode;
    if (k === 38 || k === 40) {           // ▲ ▼
      if (voiceList.length) { voiceSel = (voiceSel + (k === 40 ? 1 : voiceList.length - 1)) % voiceList.length; renderVoice(); }
      e.preventDefault();
    } else if (k === 13 || k === 415 || k === 19) {   // OK, Play, Pause
      toggleVoice(); e.preventDefault();
    } else if (k === 461 || k === 413) {  // Zurück, Stop
      if (player) { player.pause(); player.currentTime = 0; playingId = null; renderVoice(); }
      e.preventDefault();
    }
  });

  // ---------- Foto-Ecke: Überblenden, zufällige Reihenfolge ----------
  var photoQueue = [], photoKnown = '', photoTimer = null, photoFront = 'photoA';

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function setPhotos(list) {
    var sig = list.map(function (p) { return p.id; }).join(',');
    $('photoEmpty').classList.toggle('hidden', list.length > 0);
    if (sig === photoKnown) return;
    var isNew = list.length && list[0].id !== (photoKnown.split(',')[0]);
    photoKnown = sig;
    state.photos = list;
    photoQueue = [];
    if (!list.length) { $('photoA').className = 'slide'; $('photoB').className = 'slide'; return; }
    if (isNew) photoQueue.push(list[0]);          // neu hochgeladenes Foto sofort zeigen
    if (!photoTimer || isNew) nextPhoto();
    if (!photoTimer) photoTimer = setInterval(nextPhoto, ((state.settings && state.settings.photo_seconds) || 20) * 1000);
  }
  // Rahmen genau auf das Seitenverhältnis des Fotos zuschneiden und mittig setzen
  function fitFrame(slide) {
    var fg = slide.querySelector('.fg'), frame = slide.querySelector('.frame');
    if (!fg.naturalWidth) return;
    var M = 8;   // Platz für den Zierrahmen
    var box = $('photo'), bw = box.clientWidth - 2 * M, bh = box.clientHeight - 2 * M;
    var r = fg.naturalWidth / fg.naturalHeight;
    var w = bw, h = bw / r;
    if (h > bh) { h = bh; w = bh * r; }
    frame.style.width = Math.round(w) + 'px';
    frame.style.height = Math.round(h) + 'px';
    frame.style.left = Math.round(M + (bw - w) / 2) + 'px';
    frame.style.top = Math.round(M + (bh - h) / 2) + 'px';
  }
  function nextPhoto() {
    var list = state.photos || [];
    if (!list.length) return;
    if (!photoQueue.length) photoQueue = shuffle(list.slice());
    var p = photoQueue.shift();
    var back = photoFront === 'photoA' ? 'photoB' : 'photoA';
    var slide = $(back), fg = slide.querySelector('.fg'), frame = slide.querySelector('.frame');
    var kb = 'kb' + (1 + Math.floor(Math.random() * 2));
    var url = mediaUrl(p.src);
    fg.onload = function () {
      fitFrame(slide);
      slide.className = 'slide show ' + kb;
      var old = $(photoFront);
      setTimeout(function () { if (old !== slide) old.className = 'slide'; }, 2600);  // erst nach dem Überblenden ausblenden
      photoFront = back;
    };
    if (fg.getAttribute('src') === url) fg.onload();   // gleiches Bild (nur 1 Foto)
    else fg.src = url;
  }

  // ---------- Ayah / Spruch des Tages ----------
  var ayahData = null, ayahDay = '';
  function loadAyah() {
    var today = ymd(new Date());
    if (ayahDay === today && ayahData) return;
    getJSON(API + 'ayah.php?k=' + KEY, function (err, a) {
      if (err || !a || !a.arabic) return;
      ayahData = a; ayahDay = today;
      renderAyah();
    });
  }
  function renderAyah() {
    var box = $('ayah'), d = state.data || {};
    var ar = $('ayahArabic'), tr = $('ayahText'), ref = $('ayahRef');
    if (d.quote) {
      ar.textContent = '';
      tr.textContent = '«' + d.quote + '»';
      ref.textContent = L.quote;
    } else if (ayahData) {
      ar.textContent = ayahData.arabic;
      tr.textContent = ayahData.translations.map(function (t) { return t.text; }).join('  ·  ');
      ref.textContent = L.ayahRef(ayahData.surah, ayahData.surah_name, ayahData.ayah);
    } else { box.classList.add('hidden'); return; }
    box.classList.remove('hidden');
    emo(tr);
    ar.classList.toggle('hidden', !ar.textContent);
    // Schrift verkleinern, bis alles hineinpasst
    var fa = 40, ft = 26;
    ar.style.fontSize = fa + 'px'; tr.style.fontSize = ft + 'px';
    while (box.scrollHeight > box.clientHeight + 1 && ft > 16) {
      fa -= 2; ft -= 1.5;
      ar.style.fontSize = fa + 'px'; tr.style.fontSize = ft + 'px';
    }
  }

  // ---------- Salah-Zeiten ----------
  var prayerData = null, prayerDay = '';
  var PR_ORDER = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  function loadPrayers() {
    var today = ymd(new Date());
    if (prayerData && prayerDay === today) return renderPrayers();
    getJSON(API + 'prayer.php?k=' + KEY, function (err, p) {
      if (err || !p || !p.today) return;
      prayerData = p; prayerDay = p.today.date;
      renderPrayers();
    });
  }
  function renderPrayers() {
    var box = $('prayers');
    if (!prayerData) return;
    var now = new Date(), nowMin = now.getHours() * 60 + now.getMinutes();
    var t = prayerData.today.times;
    // nächstes Gebet bestimmen (Sonnenaufgang zählt nicht als Gebet)
    var nextKey = null, nextMin = 0, nowKey = null;
    for (var i = 0; i < PR_ORDER.length; i++) {
      var k = PR_ORDER[i], m = minutes(t[k]);
      if (k !== 'Sunrise' && nowMin >= m && nowMin < m + 20) nowKey = k;   // 20 Min. lang "jetzt"
      if (!nextKey && k !== 'Sunrise' && m > nowMin) { nextKey = k; nextMin = m; }
    }
    var tomorrowFajr = false;
    if (!nextKey && prayerData.tomorrow) { nextKey = 'Fajr'; nextMin = minutes(prayerData.tomorrow.times.Fajr) + 1440; tomorrowFajr = true; }

    box.innerHTML = '';
    PR_ORDER.forEach(function (k) {
      var m = minutes(t[k]);
      var cls = 'prayer' + (k === 'Sunrise' ? ' sun' : '');
      var isNext = k === nextKey && !(tomorrowFajr && k === 'Fajr' && false);
      if (k === nowKey) cls += ' now';
      else if (isNext) cls += ' next';
      else if (m <= nowMin) cls += ' past';
      var tile = el('div', cls);
      tile.appendChild(el('div', 'pn', L.PR[k]));
      tile.appendChild(el('div', 'pt', tomorrowFajr && k === 'Fajr' ? prayerData.tomorrow.times.Fajr : t[k]));
      if (k === nowKey) tile.appendChild(el('div', 'cd', L.nowP));
      else if (isNext) { var diff = nextMin - nowMin; tile.appendChild(el('div', 'cd', L.inT(Math.floor(diff / 60), diff % 60))); }
      box.appendChild(tile);
    });
    box.classList.remove('hidden');
    if ($('stage').className !== 'with-prayers') {
      $('stage').className = 'with-prayers';
      render();            // Platz ist kleiner geworden → Karten neu einpassen
      fitFrame($('photoA')); fitFrame($('photoB'));
    }
    // Hijri-Datum
    var h = prayerData.today.hijri;
    if (h) $('hijri').textContent = h.day + ' ' + L.HM[h.month - 1] + ' ' + h.year;
  }

  function showStatus() {
    var s = $('status');
    if (!state.lastOk) { s.textContent = L.connecting; return; }
    var age = Math.round((Date.now() - state.lastOk) / 60000);
    s.textContent = age > 2 ? L.offline(age) : '';
  }

  // ---------- Start ----------
  tick();
  loadData();
  loadCalendar();
  setTimeout(loadWeather, 1500);
  loadAyah();
  loadPrayers();

  setInterval(tick, 1000);
  setInterval(loadData, 30 * 1000);          // Pinnwand/Notizen: alle 30 s
  setInterval(loadCalendar, 2 * 60 * 1000);  // Kalender: alle 2 min
  setInterval(loadWeather, 30 * 60 * 1000);  // Wetter: alle 30 min
  setInterval(loadAyah, 30 * 60 * 1000);
  setInterval(loadPrayers, 30 * 1000);        // Countdown / neuer Tag     // Ayah: neuer Tag → neuer Vers
  setInterval(pixelShift, 3 * 60 * 1000);    // OLED-Schutz
  setInterval(function () { if (!isNight(new Date()) && !(player && !player.paused)) location.reload(); }, 6 * 60 * 60 * 1000); // Speicher frisch halten
})();
