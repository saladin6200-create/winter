/* 뜨거운 겨울 방학! — 로그인 · 온라인 답안 제출 · 채점 결과 */
(function () {
  "use strict";
  var URL_ = (window.WINTER_GAS_URL || "").trim();
  var CIRC = "①②③④⑤";
  var page = document.body.getAttribute("data-page") || "";
  var root = document.body.getAttribute("data-root") || "";

  /* ---------- 저장소 (실패해도 동작) ---------- */
  function sget(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function sset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function sdel(k) { try { localStorage.removeItem(k); } catch (e) {} }

  var AKEY = "winter_auth", KKEY = "winter_key";
  function auth() { var a = sget(AKEY); if (a && a.exp > Date.now() + 60000) return a; if (a) sdel(AKEY); return null; }

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function api(body) {
    if (!URL_) return Promise.reject(new Error("온라인 제출이 아직 준비되지 않았습니다."));
    return fetch(URL_, { method: "POST", body: JSON.stringify(body) })
      .then(function (r) { if (!r.ok) throw new Error("서버 응답 오류 (" + r.status + ")"); return r.json(); })
      .catch(function (e) { if (e instanceof TypeError) throw new Error("서버에 연결하지 못했습니다. 인터넷 연결을 확인하세요."); throw e; })
      .then(function (res) { if (res && res.auth === false) { sdel(AKEY); sdel(KKEY); renderBar(); } return res; });
  }

  /* ---------- 계정 표시줄 ---------- */
  var bar;
  function renderBar() {
    if (!bar) { bar = el("div", "w-acct"); document.body.insertBefore(bar, document.body.firstChild); }
    bar.innerHTML = "";
    var a = auth();
    if (!URL_) { bar.style.display = "none"; return; }
    if (a) {
      bar.appendChild(el("span", "who", a.name + " (" + a.sid + ")"));
      var my = el("a", "lnk", "내 기록"); my.href = root + "my/"; bar.appendChild(my);
      var out = el("button", "lnk", "로그아웃");
      out.onclick = function () { sdel(AKEY); sdel(KKEY); location.reload(); };
      bar.appendChild(out);
    } else {
      var b = el("button", "lnk strong", "로그인 / 가입 신청");
      b.onclick = function () { openLogin(function () { location.reload(); }); };
      bar.appendChild(b);
    }
  }

  /* ---------- 모달 ---------- */
  function modal(build) {
    var back = el("div", "w-back"), box = el("div", "w-modal");
    back.appendChild(box); document.body.appendChild(back);
    function close() { back.remove(); document.removeEventListener("keydown", esc); }
    function esc(e) { if (e.key === "Escape") close(); }
    document.addEventListener("keydown", esc);
    back.addEventListener("click", function (e) { if (e.target === back) close(); });
    var x = el("button", "w-x", "×"); x.setAttribute("aria-label", "닫기"); x.onclick = close; box.appendChild(x);
    build(box, close);
    return close;
  }

  function field(box, label, type, name, ac) {
    var w = el("label", "w-field"); w.appendChild(el("span", null, label));
    var i = el("input"); i.type = type; i.name = name; if (ac) i.autocomplete = ac;
    if (name === "sid") { i.inputMode = "numeric"; i.placeholder = "예: 30601"; }
    w.appendChild(i); box.appendChild(w); return i;
  }

  function openLogin(after, mode) {
    modal(function (box, close) {
      var tabs = el("div", "w-tabs"), t1 = el("button", "on", "로그인"), t2 = el("button", null, "가입 신청");
      tabs.appendChild(t1); tabs.appendChild(t2); box.appendChild(tabs);
      var form = el("form", "w-form"); box.appendChild(form);
      var msg = el("p", "w-msg");
      function draw(reg) {
        t1.className = reg ? "" : "on"; t2.className = reg ? "on" : "";
        form.innerHTML = "";
        var sid = field(form, "학번", "text", "sid", "username"), nm = field(form, "이름", "text", "name", "name");
        var pw = field(form, "비밀번호", "password", "pw", reg ? "new-password" : "current-password");
        var pw2 = reg ? field(form, "비밀번호 확인", "password", "pw2", "new-password") : null;
        if (reg) form.appendChild(el("p", "w-note", "가입 신청 후 선생님이 승인하면 로그인할 수 있습니다. 비밀번호는 4자 이상으로 정하세요."));
        var go = el("button", "w-btn", reg ? "가입 신청하기" : "로그인"); go.type = "submit"; form.appendChild(go);
        msg.textContent = ""; msg.className = "w-msg"; form.appendChild(msg);
        form.onsubmit = function (e) {
          e.preventDefault();
          msg.className = "w-msg";
          if (!sid.value.trim() || !nm.value.trim() || !pw.value) { msg.textContent = "학번, 이름, 비밀번호를 모두 입력하세요."; msg.className = "w-msg err"; return; }
          if (reg && pw.value !== pw2.value) { msg.textContent = "비밀번호 확인이 일치하지 않습니다."; msg.className = "w-msg err"; return; }
          go.disabled = true; msg.textContent = "처리 중…";
          api({ action: reg ? "register" : "login", sid: sid.value, name: nm.value, pw: pw.value }).then(function (r) {
            go.disabled = false;
            if (!r.ok) { msg.textContent = r.msg; msg.className = "w-msg err"; return; }
            if (reg) { msg.textContent = r.msg; msg.className = "w-msg ok"; form.reset(); return; }
            sset(AKEY, { token: r.token, sid: r.sid, name: r.name, exp: r.exp });
            close(); renderBar(); if (after) after();
          }).catch(function (err) { go.disabled = false; msg.textContent = err.message; msg.className = "w-msg err"; });
        };
        setTimeout(function () { sid.focus(); }, 30);
      }
      t1.onclick = function () { draw(false); }; t2.onclick = function () { draw(true); };
      draw(mode === "register");
    });
  }

  function confirmBox(title, lines, okText, onOk) {
    modal(function (box, close) {
      box.appendChild(el("h3", null, title));
      lines.forEach(function (l) { box.appendChild(el("p", null, l)); });
      var row = el("div", "w-row"), no = el("button", "w-btn ghost", "다시 확인"), ok = el("button", "w-btn", okText);
      no.onclick = close; ok.onclick = function () { close(); onOk(); };
      row.appendChild(no); row.appendChild(ok); box.appendChild(row);
    });
  }

  /* ---------- 모의고사 페이지 ---------- */
  function examPage() {
    var n = Number(document.body.getAttribute("data-exam"));
    var qs = Array.prototype.slice.call(document.querySelectorAll(".qs > .q"));
    if (qs.length !== 25) return;
    var a = auth();
    var skey = function () { var x = auth(); return "winter_ans_" + (x ? x.sid : "guest") + "_" + n; };
    var ans = sget(skey()) || sget("winter_ans_guest_" + n) || [];
    while (ans.length < 25) ans.push(0);
    var locked = false;
    var omrs = qs.map(function (q, i) {
      var box = el("div", "w-omr");
      box.appendChild(el("span", "lab", (i + 1) + "번 답"));
      for (var k = 1; k <= 5; k++) (function (k) {
        var b = el("button", "bub", CIRC[k - 1]); b.type = "button"; b.setAttribute("aria-label", (i + 1) + "번 " + k + "번 선택");
        b.onclick = function () {
          if (locked) return;
          ans[i] = ans[i] === k ? 0 : k; sset(skey(), ans); paint(i); count();
        };
        box.appendChild(b);
      })(k);
      q.appendChild(box); return box;
    });
    function paint(i) {
      var bs = omrs[i].querySelectorAll(".bub");
      for (var k = 0; k < 5; k++) bs[k].classList.toggle("on", ans[i] === k + 1);
    }
    for (var i = 0; i < 25; i++) paint(i);

    var dock = el("div", "w-dock"), info = el("span", "info"), sub = el("button", "w-btn", "답안 제출");
    dock.appendChild(info); dock.appendChild(sub); document.body.appendChild(dock);
    document.body.classList.add("w-has-dock");
    function count() {
      if (locked) return;
      var c = ans.filter(function (x) { return x; }).length;
      info.textContent = URL_ ? "응답한 문항 " + c + " / 25" : "응답한 문항 " + c + " / 25 · 온라인 제출은 준비 중입니다";
    }
    count();
    if (!URL_) sub.style.display = "none";

    sub.onclick = function () {
      if (!auth()) { openLogin(function () { checkStatus(true); }); return; }
      var empty = []; ans.forEach(function (x, i) { if (!x) empty.push(i + 1); });
      var lines = empty.length ? ["답을 고르지 않은 문항: " + empty.join(", ") + "번", "고르지 않은 문항은 틀린 것으로 처리됩니다."] : ["25문항 모두 답을 골랐습니다."];
      lines.push("제출한 뒤에는 답을 바꿀 수 없습니다.");
      confirmBox("답안을 제출할까요?", lines, "제출하기", doSubmit);
    };
    function doSubmit() {
      sub.disabled = true; info.textContent = "채점 중…";
      api({ action: "submit", token: auth() && auth().token, exam: n, answers: ans }).then(function (r) {
        sub.disabled = false;
        if (r.auth === false) { count(); openLogin(function () { checkStatus(true); }); return; }
        if (!r.ok) { count(); alertMsg(r.msg); return; }
        showResult(r);
      }).catch(function (e) { sub.disabled = false; count(); alertMsg(e.message); });
    }
    function alertMsg(m) { modal(function (box) { box.appendChild(el("h3", null, "알림")); box.appendChild(el("p", null, m)); }); }

    function checkStatus(fromLogin) {
      if (!URL_ || !auth()) return;
      api({ action: "status", token: auth().token, exam: n }).then(function (r) {
        if (r.ok && r.submitted) showResult(r);
        else if (fromLogin && r.ok) sub.click();
      }).catch(function () {});
    }

    function showResult(r) {
      locked = true;
      ans = r.answers.slice();
      for (var i = 0; i < 25; i++) paint(i);
      document.body.classList.add("w-done");
      sub.style.display = "none";
      info.textContent = "제출 완료 · " + fmt(r.score) + "점 / 50점";
      var old = document.querySelector(".w-result"); if (old) old.remove();
      var card = el("div", "w-result");
      var top = el("div", "sc");
      top.appendChild(el("span", "big", fmt(r.score)));
      top.appendChild(el("span", "of", "점 / 50점"));
      top.appendChild(el("span", "cnt", "맞은 문항 " + r.correct + " / 25"));
      card.appendChild(top);
      if (r.already) card.appendChild(el("p", "note", "이미 제출한 답안의 채점 결과입니다. 답안은 한 번만 제출할 수 있습니다."));
      var grid = el("div", "ox");
      r.ox.forEach(function (o, i) {
        var c = el("a", o === "O" ? "o" : "x"); c.href = "#q" + (i + 1);
        c.appendChild(el("b", null, String(i + 1))); c.appendChild(el("span", null, o === "O" ? "O" : "X"));
        grid.appendChild(c);
      });
      card.appendChild(grid);
      var sol = el("button", "w-solbtn", "정답 및 해설 보기");
      sol.onclick = function () { loadSolution(sol); };
      card.appendChild(sol);
      var head = document.querySelector(".head"); head.parentNode.insertBefore(card, head.nextSibling);
      qs.forEach(function (q, i) {
        q.id = "q" + (i + 1);
        q.classList.remove("w-qo", "w-qx"); q.classList.add(r.ox[i] === "O" ? "w-qo" : "w-qx");
        var mk = q.querySelector(".w-mark") || el("span", "w-mark"); mk.textContent = r.ox[i] === "O" ? "O" : "X"; q.insertBefore(mk, q.firstChild);
      });
      card.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function loadSolution(btn) {
      btn.disabled = true; btn.textContent = "불러오는 중…";
      api({ action: "solution", token: auth() && auth().token, exam: n }).then(function (r) {
        if (!r.ok) { btn.disabled = false; btn.textContent = "정답 및 해설 보기"; alertMsg(r.msg); return; }
        btn.textContent = "정답과 해설이 각 문항 아래에 표시되었습니다";
        qs.forEach(function (q, i) {
          var bs = omrs[i].querySelectorAll(".bub");
          bs[r.ans[i] - 1].classList.add("key");
          var old = q.querySelector(".w-sol"); if (old) old.remove();
          var box = el("div", "w-sol");
          box.appendChild(el("p", "k", "정답 " + CIRC[r.ans[i] - 1] + (ans[i] ? " · 내 답 " + CIRC[ans[i] - 1] : " · 내 답 없음")));
          var ul = el("ul"); r.sol[i].forEach(function (s) { ul.appendChild(el("li", null, s)); }); box.appendChild(ul);
          q.appendChild(box);
        });
      }).catch(function (e) { btn.disabled = false; btn.textContent = "정답 및 해설 보기"; alertMsg(e.message); });
    }
    checkStatus(false);
  }
  function fmt(x) { return (Math.round(x * 10) / 10).toString(); }

  /* ---------- 내 기록 페이지 ---------- */
  function myPage() {
    var box = document.getElementById("my");
    if (!URL_) { box.appendChild(el("p", "w-empty", "온라인 기록 기능은 아직 준비 중입니다.")); return; }
    if (!auth()) {
      box.appendChild(el("p", "w-empty", "로그인하면 내 모의고사 기록을 볼 수 있습니다."));
      var b = el("button", "w-btn", "로그인"); b.onclick = function () { openLogin(function () { location.reload(); }); }; box.appendChild(b);
      return;
    }
    box.appendChild(el("p", "w-empty", "불러오는 중…"));
    api({ action: "mine", token: auth().token }).then(function (r) {
      box.innerHTML = "";
      if (!r.ok) { box.appendChild(el("p", "w-empty", r.msg)); return; }
      box.appendChild(el("h2", null, r.name + " 학생의 모의고사 기록"));
      if (!r.exams.length) { box.appendChild(el("p", "w-empty", "아직 제출한 모의고사가 없습니다.")); return; }
      box.appendChild(el("h3", null, "회차별 점수"));
      box.appendChild(chart(r.exams));
      var t = el("table", "w-tbl"), h = el("tr"), v = el("tr");
      h.appendChild(el("th", null, "회차")); v.appendChild(el("th", null, "점수"));
      for (var i = 1; i <= 10; i++) {
        var e = r.exams.filter(function (x) { return x.exam === i; })[0];
        h.appendChild(el("th", null, i + "회")); v.appendChild(el("td", null, e ? fmt(e.score) : "–"));
      }
      t.appendChild(h); t.appendChild(v);
      var wrap = el("div", "w-scroll"); wrap.appendChild(t); box.appendChild(wrap);
      box.appendChild(el("h3", null, "차시(단원)별 정답률"));
      var ul = el("div", "w-units");
      r.units.forEach(function (u) {
        var row = el("div", "u"), pct = u.total ? Math.round(u.correct / u.total * 100) : null;
        row.appendChild(el("span", "nm", u.name));
        var barw = el("span", "bar"), fill = el("span", "fill"); fill.style.width = (pct || 0) + "%";
        if (pct !== null) fill.className = "fill " + (pct >= 80 ? "hi" : pct >= 60 ? "mid" : "lo");
        barw.appendChild(fill); row.appendChild(barw);
        row.appendChild(el("span", "pc", pct === null ? "–" : pct + "% (" + u.correct + "/" + u.total + ")"));
        ul.appendChild(row);
      });
      box.appendChild(ul);
    }).catch(function (e) { box.innerHTML = ""; box.appendChild(el("p", "w-empty", e.message)); });
  }

  function chart(exams) {
    var W = 460, H = 260, L = 40, R = 18, T = 26, B = 34, NS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(NS, "svg"); svg.setAttribute("viewBox", "0 0 " + W + " " + H); svg.setAttribute("class", "w-chart");
    function mk(t, at, txt) { var e = document.createElementNS(NS, t); for (var k in at) e.setAttribute(k, at[k]); if (txt != null) e.textContent = txt; svg.appendChild(e); return e; }
    var x = function (i) { return L + (W - L - R) * (i - 1) / 9; }, y = function (s) { return T + (H - T - B) * (1 - s / 50); };
    [0, 10, 20, 30, 40, 50].forEach(function (s) { mk("line", { x1: L, x2: W - R, y1: y(s), y2: y(s), stroke: "#E2E6EC" }); mk("text", { x: L - 8, y: y(s) + 4, "text-anchor": "end", "font-size": 14, fill: "#4A5568" }, s); });
    for (var i = 1; i <= 10; i++) mk("text", { x: x(i), y: H - 10, "text-anchor": "middle", "font-size": 13, fill: "#4A5568" }, i + "회");
    var pts = exams.map(function (e) { return x(e.exam) + "," + y(e.score); }).join(" ");
    if (exams.length > 1) mk("polyline", { points: pts, fill: "none", stroke: "#2457B8", "stroke-width": 2.5 });
    exams.forEach(function (e) {
      mk("circle", { cx: x(e.exam), cy: y(e.score), r: 6, fill: "#2457B8" });
      mk("text", { x: x(e.exam), y: y(e.score) + (e.score > 42 ? 22 : -10), "text-anchor": "middle", "font-size": 15, "font-weight": 700, fill: "#1B2A41" }, fmt(e.score));
    });
    return svg;
  }

  /* ---------- 잠금 해제 (교재·모의고사) ---------- */
  function b64(s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  function gateMsg(title, text, buttons) {
    var g = document.getElementById("w-gate"); g.innerHTML = "";
    var c = el("div", "w-gate-card");
    c.appendChild(el("p", "lock", "🔒"));
    c.appendChild(el("h2", null, title));
    if (text) c.appendChild(el("p", null, text));
    (buttons || []).forEach(function (b) { var x = el("button", "w-btn" + (b.ghost ? " ghost" : ""), b.t); x.onclick = b.f; c.appendChild(x); });
    var home = el("a", "home", "← 처음으로"); home.href = root; c.appendChild(home);
    g.appendChild(c);
  }
  function getKey(retry) {
    var k = sget(KKEY);
    if (k && !retry) return Promise.resolve(k);
    return api({ action: "key", token: auth().token }).then(function (r) {
      if (!r.ok) throw new Error(r.auth === false ? "AUTH" : (r.msg || "열쇠를 받지 못했습니다."));
      sset(KKEY, r.key); return r.key;
    });
  }
  function decryptTo(key, url) {
    return fetch(url).then(function (r) { if (!r.ok) throw new Error("파일을 불러오지 못했습니다 (" + r.status + ")"); return r.arrayBuffer(); })
      .then(function (buf) { var u = new Uint8Array(buf); return crypto.subtle.decrypt({ name: "AES-GCM", iv: u.slice(0, 12) }, key, u.slice(12)); });
  }
  var MIME = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", svg: "image/svg+xml", gif: "image/gif" };
  function unlock() {
    if (!URL_) { gateMsg("준비 중입니다", "이 자료는 로그인한 학생만 볼 수 있습니다."); return Promise.reject(); }
    if (!auth()) {
      gateMsg("로그인이 필요합니다", "이 자료는 선생님이 승인한 학생만 볼 수 있습니다. 가입 신청 후 승인을 받으면 열람할 수 있습니다.", [
        { t: "로그인", f: function () { openLogin(function () { location.reload(); }); } },
        { t: "가입 신청", ghost: true, f: function () { openLogin(function () { location.reload(); }, "register"); } }]);
      return Promise.reject();
    }
    var attempt = function (retry) {
      return getKey(retry).then(function (k) { return crypto.subtle.importKey("raw", b64(k), "AES-GCM", false, ["decrypt"]); })
        .then(function (key) { return decryptTo(key, "content.bin").then(function (buf) { return { key: key, html: new TextDecoder().decode(buf) }; }); })
        .catch(function (e) { if (!retry && e && e.name === "OperationError") { sdel(KKEY); return attempt(true); } throw e; });
    };
    return attempt(false).then(function (o) {
      var g = document.getElementById("w-gate");
      if (page === "textbook") { var box = el("div", "w-raw"); box.innerHTML = o.html; g.parentNode.insertBefore(box, g); g.remove(); textbookLayout(box); }
      else { g.insertAdjacentHTML("beforebegin", o.html); g.remove(); }
      Array.prototype.forEach.call(document.querySelectorAll("[data-esrc]"), function (img) {
        var src = img.getAttribute("data-esrc"), ext = src.split(".").pop().toLowerCase();
        decryptTo(o.key, src + ".bin").then(function (buf) {
          img.src = URL.createObjectURL(new Blob([buf], { type: MIME[ext] || "application/octet-stream" }));
        }).catch(function () { img.alt = "그림을 불러오지 못했습니다"; });
      });
      Array.prototype.forEach.call(document.querySelectorAll('a[href$=".pdf"]'), function (a) {
        var f = a.getAttribute("href");
        a.addEventListener("click", function (e) { e.preventDefault(); pdf(o.key, f, a); });
      });
      if (/[?&]pdf=1/.test(location.search)) { var a0 = document.querySelector('a[href$=".pdf"]'); if (a0) a0.click(); }
    }).catch(function (e) {
      if (!e) return;
      if (e.message === "AUTH") { gateMsg("다시 로그인하세요", "로그인이 만료되었거나 승인이 취소되었습니다.", [{ t: "로그인", f: function () { openLogin(function () { location.reload(); }); } }]); return Promise.reject(); }
      gateMsg("자료를 열지 못했습니다", e.message || String(e), [{ t: "다시 시도", f: function () { sdel(KKEY); location.reload(); } }]);
      return Promise.reject();
    });
  }
  var pdfUrl = null, PDFNAME = "통합과학_겨울방학_교재.pdf";
  function saveBlob(u) { var d = document.createElement("a"); d.href = u; d.download = PDFNAME; document.body.appendChild(d); d.click(); d.remove(); }
  function pdf(key, f, a) {
    if (pdfUrl) { saveBlob(pdfUrl); return; }
    if (a.getAttribute("data-busy")) return;
    a.setAttribute("data-busy", "1");
    var old = a.textContent; a.textContent = "PDF 준비 중… (약 12MB)";
    decryptTo(key, f + ".bin").then(function (buf) {
      pdfUrl = URL.createObjectURL(new Blob([buf], { type: "application/pdf" }));
      a.removeAttribute("data-busy");
      a.textContent = "PDF 저장하기 ✓";
      a.title = "저장이 시작되지 않으면 한 번 더 누르세요";
      saveBlob(pdfUrl);
      var tip = document.querySelector(".tb-pdftip"); if (tip) tip.style.display = "block";
    }).catch(function () { a.removeAttribute("data-busy"); a.textContent = old; alert("PDF를 불러오지 못했습니다. 인터넷 연결을 확인하고 다시 눌러 주세요."); });
  }

  /* ---------- 교재: 차시별 보기 ---------- */
  function textbookLayout(box) {
    document.body.classList.add("w-tb");
    var kids = Array.prototype.slice.call(box.childNodes);
    var top = box.querySelector(".topbar"), h1 = box.querySelector("h1");
    var secs = [], cur = null;
    kids.forEach(function (n) {
      if (n === top || n === h1) return;
      if (n.nodeType === 1 && n.tagName === "H2") { cur = { title: n.textContent, nodes: [] }; secs.push(cur); }
      if (cur) cur.nodes.push(n);
    });
    var wrap = el("div", "tb-wrap"), nav = el("aside", "tb-nav"), main = el("main", "tb-main");
    var head = el("div", "tb-head");
    head.appendChild(el("p", "tb-k", "학생용 교재"));
    head.appendChild(el("p", "tb-t", h1 ? h1.textContent.replace(/\s*\(학생용\)\s*$/, "") : "교재"));
    nav.appendChild(head);
    var tools = el("div", "tb-tools");
    var home = el("a", "tb-btn ghost", "← 처음으로"); home.href = root; tools.appendChild(home);
    var pdfA = el("a", "tb-btn", "전체 PDF 내려받기"); pdfA.href = "textbook.pdf"; tools.appendChild(pdfA);
    nav.appendChild(tools);
    nav.appendChild(el("p", "tb-pdftip", "저장이 시작되지 않으면 버튼을 한 번 더 누르세요."));
    var list = el("div", "tb-list"), btns = [], panes = [];
    secs.forEach(function (s, i) {
      var m = s.title.match(/^(\d+)차시\.\s*(.*)$/);
      var b = el("button", "tb-item");
      b.appendChild(el("span", "n", m ? m[1] + "차시" : "안내"));
      b.appendChild(el("span", "t", m ? m[2] : s.title));
      b.onclick = function () { show(i, true); };
      list.appendChild(b); btns.push(b);
      var pane = el("section", "tb-pane"); s.nodes.forEach(function (n) { pane.appendChild(n); });
      var pn = el("div", "tb-pn");
      if (i > 0) { var pv = el("button", "tb-btn ghost", "← " + (secs[i - 1].title.match(/^\d+차시/) || ["교재 안내"])[0]); pv.onclick = function () { show(i - 1, true); }; pn.appendChild(pv); }
      if (i < secs.length - 1) { var nx = el("button", "tb-btn", (secs[i + 1].title.match(/^\d+차시/) || [""])[0] + " →"); nx.onclick = function () { show(i + 1, true); }; pn.appendChild(nx); }
      pane.appendChild(pn);
      main.appendChild(pane); panes.push(pane);
    });
    nav.appendChild(list);
    wrap.appendChild(nav); wrap.appendChild(main);
    box.parentNode.insertBefore(wrap, box); box.remove();
    function show(i, scroll) {
      panes.forEach(function (p, k) { p.style.display = k === i ? "" : "none"; });
      btns.forEach(function (b, k) { b.classList.toggle("on", k === i); });
      try { history.replaceState(null, "", "#" + (i === 0 ? "intro" : "l" + i)); } catch (e) {}
      if (scroll) window.scrollTo(0, 0);
      if (window.innerWidth <= 860) list.scrollLeft = Math.max(0, btns[i].offsetLeft - list.offsetLeft - 12);
    }
    var mh = location.hash.match(/^#l(\d+)$/), start = mh ? Math.min(+mh[1], secs.length - 1) : 0;
    show(start, false);
  }

  /* ---------- 시작 ---------- */
  renderBar();
  if (document.body.getAttribute("data-lock")) {
    unlock().then(function () { if (page === "exam") examPage(); }, function () {});
  } else {
    if (page === "exam") examPage();
    if (page === "my") myPage();
  }
})();
