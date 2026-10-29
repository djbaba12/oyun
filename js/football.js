/* ==========================================================================
   FOOTBALL — Süper Lig merkezi
   • Gömülü puan durumu + fikstür (internet gerekmez)
   • Sonuçları elle girebilme (localStorage) → tablo otomatik hesaplanır
   ========================================================================== */
(function () {
  "use strict";
  const E = window.Engine;
  const { el, store, Sound, Haptic } = E;

  /* ------------------------------- Takımlar ------------------------------- */
  const TEAMS = {
    GAL: { name: "Galatasaray", short: "GS", c1: "#a90432", c2: "#fbbf24" },
    FEN: { name: "Fenerbahçe", short: "FB", c1: "#1a3d7c", c2: "#facc15" },
    BES: { name: "Beşiktaş", short: "BJK", c1: "#111111", c2: "#e5e7eb" },
    TRA: { name: "Trabzonspor", short: "TS", c1: "#7c1d1d", c2: "#22d3ee" },
    BAS: { name: "Başakşehir", short: "IBFK", c1: "#1e3a8a", c2: "#f97316" },
    ANT: { name: "Antalyaspor", short: "ANT", c1: "#b91c1c", c2: "#fef3c7" },
    KON: { name: "Konyaspor", short: "KON", c1: "#166534", c2: "#f0fdf4" },
    SAM: { name: "Samsunspor", short: "SAM", c1: "#b91c1c", c2: "#f8fafc" },
    RIZ: { name: "Rizespor", short: "RIZ", c1: "#166534", c2: "#fde047" },
    KAS: { name: "Kasımpaşa", short: "KSM", c1: "#1d4ed8", c2: "#f8fafc" },
    ALA: { name: "Alanyaspor", short: "ALA", c1: "#ea580c", c2: "#052e16" },
    GAZ: { name: "Gaziantep FK", short: "GFK", c1: "#b91c1c", c2: "#111827" },
    KAY: { name: "Kayserispor", short: "KAY", c1: "#facc15", c2: "#991b1b" },
    SIV: { name: "Sivasspor", short: "SIV", c1: "#b91c1c", c2: "#fef2f2" },
    GOZ: { name: "Göztepe", short: "GOZ", c1: "#facc15", c2: "#b91c1c" },
    EYU: { name: "Eyüpspor", short: "EYU", c1: "#7c3aed", c2: "#f8fafc" },
    BOD: { name: "Bodrum FK", short: "BOD", c1: "#0e7490", c2: "#f8fafc" },
    HAT: { name: "Hatayspor", short: "HAT", c1: "#7f1d1d", c2: "#f8fafc" }
  };
  const TEAM_KEYS = Object.keys(TEAMS);

  /* --------------------------- Gömülü fikstür --------------------------- */
  const DEFAULT_FIXTURES = [
    { w: 1, date: "2025-08-15", time: "20:30", home: "GAL", away: "HAT" },
    { w: 1, date: "2025-08-15", time: "21:30", home: "FEN", away: "KON" },
    { w: 1, date: "2025-08-16", time: "19:00", home: "BES", away: "RIZ" },
    { w: 1, date: "2025-08-16", time: "21:30", home: "TRA", away: "KAY" },
    { w: 1, date: "2025-08-17", time: "17:00", home: "BAS", away: "BOD" },
    { w: 1, date: "2025-08-17", time: "19:15", home: "SAM", away: "SIV" },
    { w: 1, date: "2025-08-17", time: "21:30", home: "ANT", away: "GAZ" },
    { w: 1, date: "2025-08-18", time: "19:00", home: "KAS", away: "ALA" },
    { w: 1, date: "2025-08-18", time: "21:30", home: "EYU", away: "GOZ" },
    { w: 2, date: "2025-08-22", time: "21:00", home: "KON", away: "GAL" },
    { w: 2, date: "2025-08-23", time: "19:15", home: "HAT", away: "BES" },
    { w: 2, date: "2025-08-23", time: "21:30", home: "RIZ", away: "FEN" },
    { w: 2, date: "2025-08-24", time: "19:00", home: "KAY", away: "BAS" },
    { w: 2, date: "2025-08-24", time: "21:30", home: "BOD", away: "SAM" },
    { w: 2, date: "2025-08-25", time: "20:00", home: "SIV", away: "KAS" },
    { w: 2, date: "2025-08-25", time: "22:00", home: "GAZ", away: "EYU" },
    { w: 2, date: "2025-08-26", time: "20:00", home: "ALA", away: "TRA" },
    { w: 2, date: "2025-08-26", time: "22:00", home: "GOZ", away: "ANT" }
  ];

  function fixtures() {
    return store.get("sl_fixtures", null) || DEFAULT_FIXTURES.slice();
  }
  function saveFixtures(list) {
    store.set("sl_fixtures", list);
  }
  function team(key) {
    return TEAMS[key] || { name: key, short: String(key).slice(0, 3).toUpperCase(), c1: "#334155", c2: "#f8fafc" };
  }

  /** Fikstürden puan tablosu hesaplar */
  function computeTable(list) {
    const rows = {};
    TEAM_KEYS.forEach((k) => {
      rows[k] = { k, o: 0, g: 0, b: 0, m: 0, a: 0, y: 0, p: 0 };
    });
    list.forEach((f) => {
      if (f.hs == null || f.as == null) return;
      const h = rows[f.home], a = rows[f.away];
      if (!h || !a) return;
      h.o++; a.o++;
      h.a += f.hs; h.y += f.as;
      a.a += f.as; a.y += f.hs;
      if (f.hs > f.as) { h.g++; a.m++; h.p += 3; }
      else if (f.hs < f.as) { a.g++; h.m++; a.p += 3; }
      else { h.b++; a.b++; h.p++; a.p++; }
    });
    return Object.values(rows)
      .map((r) => Object.assign({}, r, { av: r.a - r.y }))
      .sort((x, y) => y.p - x.p || y.av - x.av || y.a - x.a || team(x.k).name.localeCompare(team(y.k).name, "tr"));
  }

  const TR_MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
  const TR_DAYS = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

  function fmtDate(str) {
    const d = new Date(str + "T12:00:00");
    if (isNaN(d.getTime())) return str;
    return d.getDate() + " " + TR_MONTHS[d.getMonth()] + " " + TR_DAYS[d.getDay()];
  }

  function daysFromNow(str) {
    const d = new Date(str + "T12:00:00");
    const now = new Date();
    now.setHours(12, 0, 0, 0);
    return Math.round((d - now) / 86400000);
  }

  /* ------------------------------- Görünüm ------------------------------- */
  function render() {
    if (window.App && window.App.state.current) window.App.backToHome(true);
    window.App.state.view = "football";
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === "football"));

    const home = document.getElementById("home");
    home.innerHTML = "";

    const section = el("section", { class: "section page" });
    section.appendChild(el("div", { class: "section-head" }, [
      el("h2", { text: "⚽ Süper Lig" }),
      el("span", { class: "muted", text: "Puan durumu ve fikstür" })
    ]));

    let tab = "table";
    const seg = el("div", { class: "seg" });
    const body = el("div", { class: "sl-body" });

    const tabs = [
      { id: "table", label: "📊 Puan Durumu" },
      { id: "fixtures", label: "📅 Fikstür" },
      { id: "manage", label: "✏️ Sonuç Girişi" }
    ];

    function draw() {
      seg.querySelectorAll(".seg-btn").forEach((b) => b.classList.toggle("active", b.dataset.t === tab));
      body.innerHTML = "";
      if (tab === "table") body.appendChild(renderTable());
      else if (tab === "fixtures") body.appendChild(renderFixtures());
      else body.appendChild(renderManage());
    }

    tabs.forEach((t) => {
      const b = el("button", { class: "seg-btn" + (t.id === tab ? " active" : ""), text: t.label, "data-t": t.id });
      b.addEventListener("click", () => { tab = t.id; Sound.play("tap"); Haptic.tap(4); draw(); });
      seg.appendChild(b);
    });

    section.appendChild(seg);
    section.appendChild(body);
    home.appendChild(section);
    draw();
    window.scrollTo({ top: 0 });
  }

  /* ----------------------------- Puan tablosu ----------------------------- */
  function renderTable() {
    const list = fixtures();
    const table = computeTable(list);
    const wrap = el("div", { class: "sl-wrap" });

    const played = list.filter((f) => f.hs != null).length;
    const maxWeek = list.reduce((m, f) => Math.max(m, f.w || 1), 1);
    wrap.appendChild(el("div", { class: "sl-summary" }, [
      summaryCard("Oynanan", played + "/" + list.length),
      summaryCard("Takım", String(TEAM_KEYS.length)),
      summaryCard("Hafta", String(maxWeek)),
      summaryCard("Lider", table[0] ? team(table[0].k).short : "-")
    ]));

    const t = el("table", { class: "sl-table" });
    const head = el("tr");
    ["#", "Takım", "O", "G", "B", "M", "AV", "P"].forEach((label, i) => {
      head.appendChild(el("th", { text: label, class: i === 7 ? "sl-p" : "" }));
    });
    t.appendChild(el("thead", null, head));

    const tbody = el("tbody");
    table.forEach((r, i) => {
      const tm = team(r.k);
      const cls = "sl-row" + (i < 4 ? " sl-ucl" : i === 4 ? " sl-uel" : i >= table.length - 4 ? " sl-drop" : "");
      const tr = el("tr", { class: cls });
      tr.appendChild(el("td", { class: "sl-pos", text: String(i + 1) }));
      tr.appendChild(el("td", { class: "sl-team" }, [
        el("span", { class: "sl-badge", style: { background: tm.c1, color: tm.c2, borderColor: tm.c2 }, text: tm.short }),
        el("span", { text: tm.name })
      ]));
      [r.o, r.g, r.b, r.m, (r.av > 0 ? "+" : "") + r.av].forEach((v) => {
        tr.appendChild(el("td", { text: String(v) }));
      });
      tr.appendChild(el("td", { class: "sl-p", text: String(r.p) }));
      tbody.appendChild(tr);
    });
    t.appendChild(tbody);
    wrap.appendChild(el("div", { class: "sl-scroll" }, t));

    wrap.appendChild(el("div", { class: "sl-legend" }, [
      el("span", { class: "lg lg-ucl", text: "UCL" }), el("span", { text: "Şampiyonlar Ligi" }),
      el("span", { class: "lg lg-uel", text: "UEL" }), el("span", { text: "Avrupa Ligi" }),
      el("span", { class: "lg lg-drop", text: "▼" }), el("span", { text: "Düşme hattı" })
    ]));

    if (played === 0) {
      wrap.appendChild(el("div", { class: "sl-note" }, el("p", {
        text: "Henüz sonuç girilmedi. \"Sonuç Girişi\" sekmesinden maç sonuçlarını gir — puan durumu otomatik hesaplanır."
      })));
    }
    return wrap;
  }

  function summaryCard(label, value) {
    return el("div", { class: "sl-card" }, [
      el("span", { text: label }),
      el("b", { text: value })
    ]);
  }

  /* -------------------------------- Fikstür ------------------------------- */
  function renderFixtures() {
    const list = fixtures().slice().sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    const wrap = el("div", { class: "sl-fixtures" });

    const upcoming = list.filter((f) => f.hs == null && daysFromNow(f.date) >= -1);
    if (upcoming.length) {
      wrap.appendChild(el("h3", { class: "sl-h3", text: "🔜 Yaklaşan Maçlar" }));
      upcoming.slice(0, 5).forEach((f) => wrap.appendChild(fixtureRow(f, true)));
    }

    const byDate = {};
    list.forEach((f) => { (byDate[f.date] = byDate[f.date] || []).push(f); });

    wrap.appendChild(el("h3", { class: "sl-h3", text: "📅 Tüm Fikstür" }));
    Object.keys(byDate).sort().forEach((d) => {
      wrap.appendChild(el("div", { class: "sl-date", text: fmtDate(d) }));
      byDate[d].forEach((f) => wrap.appendChild(fixtureRow(f, false)));
    });
    return wrap;
  }

  function fixtureRow(f, showCountdown) {
    const hr = f.hs != null;
    const row = el("div", { class: "sl-match" + (hr ? " done" : "") });
    const th = team(f.home), ta = team(f.away);

    row.appendChild(el("div", { class: "sl-side" }, [
      el("span", { class: "sl-badge", style: { background: th.c1, color: th.c2, borderColor: th.c2 }, text: th.short }),
      el("span", { class: "sl-mteam", text: th.name })
    ]));

    const mid = el("div", { class: "sl-mid" });
    if (hr) {
      mid.appendChild(el("div", { class: "sl-score", text: f.hs + " - " + f.as }));
      mid.appendChild(el("div", { class: "sl-time", text: "Hafta " + f.w }));
    } else {
      mid.appendChild(el("div", { class: "sl-vs", text: "VS" }));
      mid.appendChild(el("div", { class: "sl-time", text: f.time + " · H" + f.w }));
      if (showCountdown) {
        const dd = daysFromNow(f.date);
        const label = dd === 0 ? "BUGÜN" : dd === 1 ? "YARIN" : dd > 1 ? dd + " gün" : "geçti";
        mid.appendChild(el("div", { class: "sl-countdown" + (dd === 0 ? " today" : ""), text: label }));
      }
    }
    row.appendChild(mid);

    row.appendChild(el("div", { class: "sl-side right" }, [
      el("span", { class: "sl-badge", style: { background: ta.c1, color: ta.c2, borderColor: ta.c2 }, text: ta.short }),
      el("span", { class: "sl-mteam", text: ta.name })
    ]));

    if (!showCountdown) row.appendChild(el("div", { class: "sl-date-mini", text: f.date.slice(5).replace("-", ".") }));
    return row;
  }

  /* ----------------------------- Sonuç girişi ---------------------------- */
  function renderManage() {
    const list = fixtures();
    const wrap = el("div", { class: "sl-manage" });

    wrap.appendChild(el("p", { class: "sl-note-p", text: "Maç sonuçlarını gir veya düzelt. Puan tablosu anında güncellenir. Veriler bu cihazda saklanır." }));

    const filterRow = el("div", { class: "sl-filter" });
    const weeks = [];
    list.forEach((f) => { if (weeks.indexOf(f.w) < 0) weeks.push(f.w); });
    weeks.sort((a, b) => a - b);
    let activeWeek = weeks[0];

    const listEl = el("div", { class: "sl-editlist" });

    function drawWeek() {
      listEl.innerHTML = "";
      list.forEach((f, idx) => {
        if (f.w !== activeWeek) return;
        const inputHome = el("input", {
          type: "number", min: "0", max: "20", placeholder: "-",
          value: f.hs != null ? String(f.hs) : "", "aria-label": "Ev sahibi skoru"
        });
        const inputAway = el("input", {
          type: "number", min: "0", max: "20", placeholder: "-",
          value: f.as != null ? String(f.as) : "", "aria-label": "Deplasman skoru"
        });
        const save = () => {
          const hv = inputHome.value === "" ? null : Number(inputHome.value);
          const av = inputAway.value === "" ? null : Number(inputAway.value);
          const arr = fixtures();
          arr[idx].hs = hv;
          arr[idx].as = av;
          saveFixtures(arr);
          Sound.play("tap");
          toastMini("Kaydedildi ✓");
        };
        inputHome.addEventListener("change", save);
        inputAway.addEventListener("change", save);

        const th = team(f.home), ta = team(f.away);
        listEl.appendChild(el("div", { class: "sl-edit" }, [
          el("span", { class: "sl-badge", style: { background: th.c1, color: th.c2 }, text: th.short }),
          inputHome,
          el("span", { class: "sl-x", text: "-" }),
          inputAway,
          el("span", { class: "sl-badge", style: { background: ta.c1, color: ta.c2 }, text: ta.short })
        ]));
      });
    }

    weeks.forEach((w) => {
      const b = el("button", { class: "chip" + (w === activeWeek ? " active" : ""), text: "Hafta " + w, "data-w": w });
      b.addEventListener("click", () => {
        activeWeek = w;
        filterRow.querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c === b));
        drawWeek();
      });
      filterRow.appendChild(b);
    });

    wrap.appendChild(filterRow);
    wrap.appendChild(listEl);
    drawWeek();

    const resetBtn = el("button", { class: "btn sm sec", text: "🧹 Sonuçları Temizle" });
    resetBtn.addEventListener("click", () => {
      saveFixtures(fixtures().map((f) => Object.assign({}, f, { hs: null, as: null })));
      toastMini("Sonuçlar temizlendi");
      render();
    });
    const defaultBtn = el("button", { class: "btn sm sec", text: "↩️ Varsayılan Fikstür" });
    defaultBtn.addEventListener("click", () => {
      saveFixtures(DEFAULT_FIXTURES.slice());
      toastMini("Varsayılan fikstür yüklendi");
      render();
    });
    wrap.appendChild(el("div", { class: "sl-tools" }, [resetBtn, defaultBtn]));

    const addCard = el("div", { class: "sl-addcard" });
    addCard.appendChild(el("h4", { text: "➕ Maç Ekle" }));
    const selHome = teamSelect("Ev sahibi");
    const selAway = teamSelect("Deplasman");
    const dateIn = el("input", { type: "date", "aria-label": "Tarih", value: new Date().toISOString().slice(0, 10) });
    const timeIn = el("input", { type: "time", "aria-label": "Saat", value: "20:00" });
    const weekIn = el("input", { type: "number", min: "1", max: "38", value: "3", "aria-label": "Hafta" });
    const addBtn = el("button", { class: "btn sm", text: "Maçı Ekle" });
    addBtn.addEventListener("click", () => {
      if (!selHome.value || !selAway.value || selHome.value === selAway.value) {
        toastMini("Farklı iki takım seç");
        return;
      }
      const arr = fixtures();
      arr.push({
        w: Number(weekIn.value) || 1,
        date: dateIn.value || new Date().toISOString().slice(0, 10),
        time: timeIn.value || "20:00",
        home: selHome.value,
        away: selAway.value,
        hs: null, as: null
      });
      saveFixtures(arr);
      Sound.play("win");
      toastMini("Maç eklendi ✓");
      render();
    });
    addCard.appendChild(el("div", { class: "sl-addrow" }, [selHome, el("span", { text: "vs" }), selAway]));
    addCard.appendChild(el("div", { class: "sl-addrow" }, [dateIn, timeIn, weekIn]));
    addCard.appendChild(addBtn);
    wrap.appendChild(addCard);

    return wrap;
  }

  function teamSelect(label) {
    const sel = el("select", { "aria-label": label });
    TEAM_KEYS.slice().sort((a, b) => team(a).name.localeCompare(team(b).name, "tr")).forEach((k) => {
      sel.appendChild(el("option", { value: k, text: team(k).name }));
    });
    return sel;
  }

  function toastMini(msg) {
    if (window.App && window.App.toast) window.App.toast(msg, "good");
  }

  /* ------------------------------- Dışa aç ------------------------------- */
  window.Football = { render, TEAMS, team, fixtures, saveFixtures, computeTable, DEFAULT_FIXTURES };

  if (window.GAMES) {
    window.GAMES.push({
      id: "football", title: "Süper Lig", emoji: "⚽", cat: "classic", new: true,
      desc: "Puan durumu, fikstür ve maç sonuçları.",
      hint: "Takım seç · sonuç gir",
      mount(host, root) {
        root.appendChild(el("div", { class: "center", style: { padding: "20px 10px", width: "100%" } }, [
          el("p", { text: "Puan durumu, fikstür ve maç sonuçlarını tek yerde takip et." }),
          el("div", { class: "mt" }, el("button", {
            class: "btn", type: "button", text: "⚽ Süper Lig Merkezini Aç",
            on: { click: () => { if (window.Football) window.Football.render(); } }
          }))
        ]));
        return { stop() {} };
      }
    });
  }
})();
