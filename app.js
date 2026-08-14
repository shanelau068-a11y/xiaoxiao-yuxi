const STORE_KEY = "xiaoxiao-yuxi-v3";

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveState(state) {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

function getState() {
  const s = loadState();
  if (!s.lessons) s.lessons = {};
  return s;
}

function lessonProgress(id) {
  return getState().lessons[id] || {};
}

function isLessonDone(id) {
  const p = lessonProgress(id);
  return !!(p.words && p.read && p.quiz);
}

function lessonStatus(id) {
  const p = lessonProgress(id);
  const n = ["words", "read", "quiz"].filter((k) => p[k]).length;
  if (n === 3) return "done";
  if (n > 0 || p.opened) return "doing";
  return "todo";
}

function markOpened(id) {
  const s = getState();
  s.lessons[id] = s.lessons[id] || {};
  s.lessons[id].opened = true;
  s.lastLesson = id;
  saveState(s);
}

function markStep(id, step) {
  const s = getState();
  s.lessons[id] = s.lessons[id] || {};
  s.lessons[id][step] = true;
  s.lessons[id].opened = true;
  s.lastLesson = id;
  s.lastStep = step;
  saveState(s);
}

function allLessons() {
  return YUXI.units.flatMap((u) => u.lessons);
}

function findLesson(id) {
  return allLessons().find((l) => l.id === id);
}

function findUnit(unitId) {
  return YUXI.units.find((u) => u.id === unitId);
}

function nextIncomplete() {
  return allLessons().find((l) => !isLessonDone(l.id)) || allLessons()[0];
}

function doneCount() {
  return allLessons().filter((l) => isLessonDone(l.id)).length;
}

function unitDoneCount(unit) {
  return unit.lessons.filter((l) => isLessonDone(l.id)).length;
}

function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "zh-CN";
  u.rate = 0.88;
  window.speechSynthesis.speak(u);
}

function stopSpeak() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
}

function parseRoute() {
  const raw = (location.hash || "#/").replace(/^#/, "") || "/";
  const parts = raw.split("/").filter(Boolean);
  if (parts[0] === "unit" && parts[1]) return { page: "unit", unitId: parts[1] };
  if (parts[0] === "lesson" && parts[1]) {
    return { page: "lesson", id: parts[1], step: parts[2] || "hub" };
  }
  return { page: "home" };
}

function go(hash) {
  stopSpeak();
  location.hash = hash;
}

function el(html) {
  return html;
}

function topbar({ back, title, eyebrow, reset }) {
  const left = back
    ? `<button class="back-btn" data-go="${back}" aria-label="返回">‹</button>`
    : `<div class="brand-mark">✦</div>`;
  const resetBtn = reset
    ? `<button class="icon-button" id="resetProgress" aria-label="重置进度">↺</button>`
    : `<span style="width:44px"></span>`;
  return `<header class="topbar">${left}<div class="grow"><p class="eyebrow">${eyebrow}</p><h1 class="page-title">${title}</h1></div>${resetBtn}</header>`;
}

function bindNav(root) {
  root.querySelectorAll("[data-go]").forEach((b) => {
    b.onclick = () => go(b.dataset.go);
  });
  const reset = root.querySelector("#resetProgress");
  if (reset) {
    reset.onclick = () => {
      if (confirm("把进度轻轻清掉，再从头玩一次？")) {
        localStorage.removeItem(STORE_KEY);
        sessionStorage.clear();
        go("#/");
        render();
      }
    };
  }
}

function renderHome() {
  const total = allLessons().length;
  const done = doneCount();
  const last = getState().lastLesson;
  const lastLesson = last && findLesson(last);
  const today = nextIncomplete();
  const allDone = done === total;
  const units = YUXI.units
    .map(
      (u) => `<button class="unit-card" data-go="#/unit/${u.id}">
      <span class="num">${u.n}</span>
      <span><strong>${u.title}</strong><small>${u.goal}</small></span>
      <span class="meta">${unitDoneCount(u)}/${u.lessons.length}</span>
    </button>`
    )
    .join("");
  return `${topbar({ eyebrow: "2025 秋 · 统编版二年级上册", title: "小小预习家", reset: true })}
    <section class="hero-card">
      <div><span class="unit-tag">暑假预习小站</span>
      <h2>你好，小朋友</h2>
      <p>每次 10 到 15 分钟。认一认，读一读，练一练，就很好。</p></div>
      <div class="sun">☀</div>
    </section>
    <div class="home-actions">
      <button class="primary" data-go="#/lesson/${today.id}">${allDone ? "再读一课" : "今日学习"}</button>
      <button class="secondary" ${lastLesson ? `data-go="#/lesson/${lastLesson.id}${getState().lastStep && getState().lastStep !== "hub" ? "/" + getState().lastStep : ""}"` : "disabled"}>${lastLesson ? "继续上次" : "还没开始"}</button>
    </div>
    <section class="panel">
      <div class="section-heading"><div><p class="eyebrow">学习足迹</p><h2>慢慢来就很棒</h2></div><strong>${done} / ${total}</strong></div>
      <div class="progress-track"><div style="width:${(done / total) * 100}%"></div></div>
      <p class="muted">完成一课的「认、读、练」，这里就会亮一格。进度只存在这台手机里。</p>
    </section>
    <section class="panel">
      <div class="section-heading"><div><p class="eyebrow">课程地图</p><h2>先选一个单元</h2></div><span class="counter">8 单元</span></div>
      <div class="unit-grid">${units}</div>
    </section>
    <footer>课文正文用作预习朗读。请以纸质课本为准 · 无插图、无 PDF</footer>`;
}

function renderUnit(unitId) {
  const unit = findUnit(unitId);
  if (!unit) return renderHome();
  const items = unit.lessons
    .map((l) => {
      const st = lessonStatus(l.id);
      const label = st === "done" ? "学完啦" : st === "doing" ? "进行中" : l.kindLabel;
      return `${l.group ? `<p class="group-label">${l.group}</p>` : ""}
        <button class="lesson-link" data-go="#/lesson/${l.id}">
          <span class="dot ${st}"></span>
          <span><strong>${l.title}</strong><small>${label}</small></span>
          <span class="arrow">›</span>
        </button>`;
    })
    .join("");
  return `${topbar({ back: "#/", eyebrow: unit.name, title: unit.title, reset: true })}
    <section class="hero-card">
      <div><span class="unit-tag">${unit.name}</span>
      <h2>${unit.short}</h2>
      <p>${unit.goal}</p></div>
      <div class="sun">${unit.emoji}</div>
    </section>
    <section class="panel">
      <div class="section-heading"><div><p class="eyebrow">本单元</p><h2>选一课开始</h2></div>
      <strong>${unitDoneCount(unit)} / ${unit.lessons.length}</strong></div>
      <div class="lesson-list">${items}</div>
    </section>`;
}

function tabbar(lesson, step) {
  const tabs = [
    ["hub", "🎯", "学什么"],
    ["words", "字", "我会认"],
    ["read", "读", "我会读"],
    ["quiz", "练", "我来练"],
  ];
  return `<nav class="tabbar">${tabs
    .map(
      ([id, icon, name]) =>
        `<button class="${step === id ? "active" : ""}" data-go="#/lesson/${lesson.id}/${id}"><span>${icon}</span>${name}</button>`
    )
    .join("")}</nav>`;
}

function renderHub(lesson) {
  const p = lessonProgress(lesson.id);
  const steps = [
    ["hub", "🎯", "peach", "今天学什么", "看一看预习目标", p.opened],
    ["words", "字", "blue", "我会认", `${lesson.words.length} 个字词卡片`, p.words],
    ["read", "读", "green", "我会读", lesson.kind === "poem" ? "朗读古诗，听听诗意" : "朗读课文", p.read],
    ["quiz", "练", "purple", "我来练", "3 道小问题", p.quiz],
  ];
  return `<section class="panel">
      <p class="muted">${lesson.lead}</p>
      <div class="step-grid" style="margin-top:14px">
        ${steps
          .map(
            ([id, icon, color, name, desc, done]) =>
              `<button class="step-card" data-go="#/lesson/${lesson.id}/${id}">
                <span class="step-icon ${color}">${icon}</span>
                <span><strong>${name}</strong><small>${desc}</small></span>
                ${done ? '<span class="check">✓</span>' : '<span class="arrow">›</span>'}
              </button>`
          )
          .join("")}
      </div>
    </section>`;
}

function renderGoal(lesson) {
  const goals = lesson.goals.map((g) => `<li>${g}</li>`).join("");
  return `<section class="panel">
      <div class="study-title"><h3>今天学什么</h3><span class="counter">预习目标</span></div>
      <ul class="goal-list">${goals}</ul>
      ${lesson.note ? `<p class="note">${lesson.note}</p>` : ""}
      <div class="actions"><button class="primary" data-go="#/lesson/${lesson.id}/words">去认字 →</button></div>
    </section>`;
}

function renderWords(lesson) {
  const i = Number(sessionStorage.getItem("word-i-" + lesson.id) || 0);
  const idx = ((i % lesson.words.length) + lesson.words.length) % lesson.words.length;
  const w = lesson.words[idx];
  const p = lessonProgress(lesson.id);
  return `<section class="panel">
      <div class="study-title"><h3>我会认</h3><span class="counter">${idx + 1} / ${lesson.words.length}</span></div>
      <div class="flashcard">
        <div class="character">${w.w}</div>
        <div class="pinyin">${w.p}</div>
        <div class="definition">${w.d}</div>
      </div>
      <div class="actions">
        <button class="secondary" id="prevWord">← 上一个</button>
        <button class="ghost" id="speakWord">朗读</button>
        <button class="secondary" id="nextWord">下一个 →</button>
      </div>
      <div class="actions">
        <button class="primary" id="wordsDone">${p.words ? "✓ 这课字词我认过了" : "认完啦，我会了"}</button>
      </div>
    </section>`;
}

function bindWords(root, lesson) {
  const key = "word-i-" + lesson.id;
  const n = lesson.words.length;
  const cur = () => Number(sessionStorage.getItem(key) || 0);
  root.querySelector("#prevWord").onclick = () => {
    sessionStorage.setItem(key, String((cur() + n - 1) % n));
    render();
  };
  root.querySelector("#nextWord").onclick = () => {
    sessionStorage.setItem(key, String((cur() + 1) % n));
    render();
  };
  root.querySelector("#speakWord").onclick = () => {
    const w = lesson.words[cur() % n];
    speak(w.w + "。" + w.d);
  };
  root.querySelector("#wordsDone").onclick = () => {
    markStep(lesson.id, "words");
    go(`#/lesson/${lesson.id}/read`);
  };
}

function renderRead(lesson) {
  const p = lessonProgress(lesson.id);
  let body = "";
  if (lesson.kind === "poem") {
    body = `<div class="poem-text"><span class="poem-meta">${lesson.author}</span><span class="poem-meta">${lesson.poemTitle}</span>${lesson.lines.map((x) => x.l).join("<br>")}</div>
      <div style="margin-top:12px">${lesson.lines.map((x) => `<div class="meaning-row"><b>${x.l}</b><br>${x.m}</div>`).join("")}</div>`;
  } else if (lesson.kind === "garden" || lesson.kind === "club") {
    body = lesson.activities
      .map((a) => `<div class="activity-card"><h4>${a.title}</h4><p>${a.body}</p></div>`)
      .join("");
  } else {
    body = `<div class="passage">${lesson.paragraphs.map((t) => `<p>${t}</p>`).join("")}</div>`;
  }
  return `<section class="panel">
      <div class="study-title"><h3>我会读</h3><span class="counter">${lesson.kind === "poem" ? "古诗朗读" : "课文朗读"}</span></div>
      ${body}
      <div class="actions">
        <button class="secondary" id="speakText">大声读给我听</button>
        <button class="ghost" id="stopText">停一停</button>
      </div>
      <div class="actions">
        <button class="primary" id="readDone">${p.read ? "✓ 我读过了" : "我读完啦"}</button>
      </div>
    </section>`;
}

function speakSource(lesson) {
  if (lesson.kind === "poem") return lesson.lines.map((x) => x.l).join("，");
  if (lesson.kind === "garden" || lesson.kind === "club")
    return lesson.activities.map((a) => a.title + "。" + a.body).join("。");
  return lesson.paragraphs.join("");
}

function bindRead(root, lesson) {
  const payload = speakSource(lesson);
  root.querySelector("#speakText").onclick = () => speak(payload);
  root.querySelector("#stopText").onclick = () => stopSpeak();
  root.querySelector("#readDone").onclick = () => {
    markStep(lesson.id, "read");
    go(`#/lesson/${lesson.id}/quiz`);
  };
}

function renderQuiz(lesson) {
  const qi = Number(sessionStorage.getItem("quiz-i-" + lesson.id) || 0);
  if (qi >= lesson.quiz.length) {
    return `<section class="panel celebrate">
      <div class="big">🌟</div>
      <h3>这课练完啦</h3>
      <p class="muted">你很认真。想再读一遍，或者换下一课都可以。</p>
      <div class="actions">
        <button class="secondary" data-go="#/unit/${lesson.unitId}">回单元</button>
        <button class="primary" id="nextLesson">下一课</button>
      </div>
    </section>`;
  }
  const q = lesson.quiz[qi];
  return `<section class="panel">
      <div class="study-title"><h3>我来练</h3><span class="counter">第 ${qi + 1} / ${lesson.quiz.length} 题</span></div>
      <div class="quiz-question">${q.q}</div>
      <div class="quiz-options">${q.options.map((o) => `<button data-answer="${encodeURIComponent(o)}">${o}</button>`).join("")}</div>
      <p class="feedback" id="quizFb" hidden></p>
    </section>`;
}

function bindQuiz(root, lesson) {
  const key = "quiz-i-" + lesson.id;
  const qi = Number(sessionStorage.getItem(key) || 0);
  if (qi >= lesson.quiz.length) {
    const btn = root.querySelector("#nextLesson");
    if (btn) {
      btn.onclick = () => {
        const list = allLessons();
        const i = list.findIndex((x) => x.id === lesson.id);
        const next = list[i + 1] || list[0];
        go(`#/lesson/${next.id}`);
      };
    }
    return;
  }
  const q = lesson.quiz[qi];
  const fb = root.querySelector("#quizFb");
  root.querySelectorAll(".quiz-options button").forEach((btn) => {
    btn.onclick = () => {
      const ans = decodeURIComponent(btn.dataset.answer);
      if (ans === q.a) {
        btn.classList.add("correct");
        fb.hidden = false;
        fb.style.color = "#4eae7c";
        fb.textContent = q.ok || "真棒，就是这样！";
        setTimeout(() => {
          const n = qi + 1;
          sessionStorage.setItem(key, String(n));
          if (n >= lesson.quiz.length) markStep(lesson.id, "quiz");
          render();
        }, 700);
      } else {
        btn.classList.add("tryagain");
        fb.hidden = false;
        fb.style.color = "#d96d3b";
        fb.textContent = q.hint || "再想一想，你可以的。";
      }
    };
  });
}

function renderLesson(id, step) {
  const lesson = findLesson(id);
  if (!lesson) return renderHome();
  markOpened(id);
  const unit = findUnit(lesson.unitId);
  const eyebrow = `${unit.name} · ${lesson.kindLabel}`;
  let main = "";
  if (step === "words") main = renderWords(lesson);
  else if (step === "read") main = renderRead(lesson);
  else if (step === "quiz") main = renderQuiz(lesson);
  else main = renderHub(lesson) + renderGoal(lesson);
  return `${topbar({ back: `#/unit/${lesson.unitId}`, eyebrow, title: lesson.title, reset: true })}
    ${main}${tabbar(lesson, step === "hub" ? "hub" : step)}`;
}

function render() {
  const route = parseRoute();
  const app = document.querySelector("#app");
  stopSpeak();
  let html = "";
  if (route.page === "unit") html = renderUnit(route.unitId);
  else if (route.page === "lesson") html = renderLesson(route.id, route.step);
  else html = renderHome();
  app.className = "app-shell" + (route.page === "lesson" ? " has-tabs" : "");
  app.innerHTML = html;
  bindNav(app);
  if (route.page === "lesson") {
    const lesson = findLesson(route.id);
    if (lesson && route.step === "words") bindWords(app, lesson);
    if (lesson && route.step === "read") bindRead(app, lesson);
    if (lesson && route.step === "quiz") bindQuiz(app, lesson);
  }
}

window.addEventListener("hashchange", render);
function boot() {
  render();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
