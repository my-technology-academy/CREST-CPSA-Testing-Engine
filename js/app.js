/* ═══════════════════════════════════════════════════════════
   CYBER ACADEMY · CREST CPSA EXAM ENGINE
   app.js — Main application controller
═══════════════════════════════════════════════════════════ */

const App = (() => {

  /* ── CONFIG ── */
  const PASS_MARK    = 0.75;
  const TIME_LIMIT   = 7200; // 2 hours in seconds
  const STORAGE_KEY  = 'ca_cpsa_state';

  /* ── EXAM METADATA ── */
  const EXAM_META = [
    {
      title:    'Mock Exam 1',
      label:    'Exam 1 — Windows & Unix',
      subtitle: 'CREST CPSA · Mock Exam 1 of 3',
      domains:  ['Windows','Unix','Networking','Database','Web','Cryptography','Post-Exploitation','Methodology','ActiveDirectory']
    },
    {
      title:    'Mock Exam 2',
      label:    'Exam 2 — AD & Web App',
      subtitle: 'CREST CPSA · Mock Exam 2 of 3',
      domains:  ['Windows','Unix','Web','Database','Cryptography','ActiveDirectory','Post-Exploitation','Networking','Methodology','Cloud']
    },
    {
      title:    'Mock Exam 3',
      label:    'Exam 3 — Cloud & Wireless',
      subtitle: 'CREST CPSA · Mock Exam 3 of 3',
      domains:  ['Windows','Unix','Web','Database','Cloud','Networking','Wireless','Post-Exploitation','ActiveDirectory','Methodology']
    }
  ];

  /* ── STATE ── */
  let state = {
    examIdx:   0,
    qIdx:      0,
    answers:   {},    // { "examIdx-qIdx": selectedOptionIndex }
    submitted: {},    // { "examIdx-qIdx": true }
    flagged:   {},    // { "examIdx-qIdx": true }
    timers:    [TIME_LIMIT, TIME_LIMIT, TIME_LIMIT],
    started:   [false, false, false],
    finished:  [false, false, false],
    timeUsed:  [0, 0, 0]
  };

  let timerInterval = null;
  let currentExamData = null;

  /* ── HELPERS ── */
  const key = (ei, qi) => `${ei}-${qi}`;
  const qs   = id => document.getElementById(id);
  const show = id => { const el = qs(id); if (el) { el.classList.remove('active'); void el.offsetWidth; el.classList.add('active'); } };

  function getExamData(idx) {
    const sources = [window.EXAM1, window.EXAM2, window.EXAM3];
    return sources[idx] ? sources[idx].questions : [];
  }

  /* ── SAVE / LOAD STATE ── */
  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e) {}
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        // merge, preserving defaults for any missing keys
        state = Object.assign(state, saved);
      }
    } catch(e) {}
  }

  /* ── SCREEN SWITCHING ── */
  function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    qs(`screen-${name}`).classList.add('active');
    window.scrollTo(0, 0);
  }

  /* ══════════════════════════════
     START / SWITCH / HOME
  ══════════════════════════════ */
  function startExam(idx) {
    state.examIdx = idx;
    state.qIdx    = 0;
    if (!state.started[idx]) {
      state.started[idx] = true;
      state.timers[idx]  = TIME_LIMIT;
    }
    currentExamData = getExamData(idx);
    showScreen('exam');
    buildNavGrid();
    renderQuestion();
    updateTabs();
    updateInfoPanel();
    startTimer();
    saveState();
  }

  function switchExam(idx) {
    // Save current timer
    stopTimer();
    state.examIdx = idx;
    state.qIdx    = 0;
    if (!state.started[idx]) {
      state.started[idx] = true;
      state.timers[idx]  = TIME_LIMIT;
    }
    currentExamData = getExamData(idx);
    buildNavGrid();
    renderQuestion();
    updateTabs();
    updateInfoPanel();
    startTimer();
    qs('hd-exam-label').textContent = EXAM_META[idx].subtitle;
    saveState();
  }

  function goHome() {
    stopTimer();
    showScreen('landing');
  }

  /* ══════════════════════════════
     TIMER
  ══════════════════════════════ */
  function startTimer() {
    stopTimer();
    timerInterval = setInterval(() => {
      const ei = state.examIdx;
      if (state.finished[ei]) { stopTimer(); return; }
      if (state.timers[ei] <= 0) {
        stopTimer();
        state.finished[ei] = true;
        state.timeUsed[ei]  = TIME_LIMIT;
        saveState();
        showResultsScreen();
        return;
      }
      state.timers[ei]--;
      state.timeUsed[ei] = TIME_LIMIT - state.timers[ei];
      updateTimerDisplay(state.timers[ei]);
      if (state.timers[ei] % 30 === 0) saveState();
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  }

  function updateTimerDisplay(secs) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    const display = qs('timer-display');
    const dot     = qs('timer-dot');
    if (!display) return;
    display.textContent = `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    // Colour warnings
    display.className = 'timer-val';
    dot.className     = 'timer-dot';
    if (secs < 300)       { display.classList.add('danger');  dot.classList.add('danger'); }
    else if (secs < 1200) { display.classList.add('warning'); dot.classList.add('warning'); }
  }

  function fmtTime(secs) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  }

  /* ══════════════════════════════
     BUILD NAV GRID
  ══════════════════════════════ */
  const DOMAIN_GROUPS = [
    { label: 'Windows · Q1–20',      range: [0, 19] },
    { label: 'Unix & Networking · Q21–50', range: [20, 49] },
    { label: 'Web & Database · Q51–90', range: [50, 89] },
    { label: 'Crypto, AD & Methodology · Q91–120', range: [90, 119] }
  ];

  function buildNavGrid() {
    const scroll = qs('nav-scroll');
    if (!scroll) return;
    scroll.innerHTML = '';
    const ei   = state.examIdx;
    const data = currentExamData;

    DOMAIN_GROUPS.forEach(grp => {
      const div = document.createElement('div');
      div.className = 'dg';

      const lbl = document.createElement('div');
      lbl.className = 'dg-lbl';
      lbl.textContent = grp.label;
      div.appendChild(lbl);

      const grid = document.createElement('div');
      grid.className = 'qgrid';

      for (let i = grp.range[0]; i <= grp.range[1] && i < data.length; i++) {
        const k   = key(ei, i);
        const cell = document.createElement('div');
        cell.id    = `qc-${i}`;

        let cls = 'qc blank';
        if (i === state.qIdx) cls = 'qc current';
        else if (state.flagged[k])   cls = 'qc flagged';
        else if (state.submitted[k]) {
          const correct = data[i].ans === state.answers[k];
          cls = correct ? 'qc done' : 'qc wrong';
        }

        cell.className  = cls;
        cell.textContent = i + 1;
        cell.title = `Q${i+1}`;
        cell.onclick = () => jumpTo(i);

        // Tooltip
        cell.addEventListener('mouseenter', ev => {
          const status = state.submitted[k]
            ? (data[i].ans === state.answers[k] ? '✓ Correct' : '✗ Incorrect')
            : state.flagged[k] ? '⚑ Flagged'
            : state.answers[k] !== undefined ? '● Answered'
            : '— Not answered';
          showTooltip(ev, `Q${i+1}: ${status}`);
        });
        cell.addEventListener('mousemove', ev => moveTooltip(ev));
        cell.addEventListener('mouseleave', hideTooltip);

        grid.appendChild(cell);
      }

      div.appendChild(grid);
      scroll.appendChild(div);
    });

    updateNavStats();
  }

  function updateNavStats() {
    const ei   = state.examIdx;
    const data = currentExamData;
    let done = 0, flagged = 0;

    data.forEach((_, i) => {
      const k = key(ei, i);
      if (state.submitted[k]) done++;
      if (state.flagged[k])   flagged++;
    });

    const left = data.length - done;
    qs('stat-done').textContent = done;
    qs('stat-flag').textContent = flagged;
    qs('stat-left').textContent = left;
  }

  function refreshNavCell(i) {
    const ei   = state.examIdx;
    const data = currentExamData;
    const k    = key(ei, i);
    const cell = qs(`qc-${i}`);
    if (!cell) return;

    let cls = 'qc blank';
    if (i === state.qIdx) cls = 'qc current';
    else if (state.flagged[k])   cls = 'qc flagged';
    else if (state.submitted[k]) {
      const correct = data[i].ans === state.answers[k];
      cls = correct ? 'qc done' : 'qc wrong';
    } else if (state.answers[k] !== undefined) cls = 'qc blank';

    cell.className = cls;
  }

  /* ══════════════════════════════
     RENDER QUESTION
  ══════════════════════════════ */
  function renderQuestion() {
    const ei   = state.examIdx;
    const qi   = state.qIdx;
    const data = currentExamData;
    if (!data || qi >= data.length) return;

    const q  = data[qi];
    const k  = key(ei, qi);
    const submitted = !!state.submitted[k];
    const selected  = state.answers[k];

    // Meta bar
    qs('q-number').textContent = qi + 1;
    const domainEl = qs('q-domain');
    domainEl.textContent = q.domain || 'General';

    const diffEl = qs('q-difficulty');
    const diff   = (q.difficulty || 'medium').toLowerCase();
    diffEl.textContent  = diff.charAt(0).toUpperCase() + diff.slice(1);
    diffEl.className    = `tag tag-${diff}`;

    // Flag button
    const flagBtn = qs('flag-btn');
    if (state.flagged[k]) {
      flagBtn.classList.add('active');
      flagBtn.innerHTML = '⚑ &nbsp;Flagged';
    } else {
      flagBtn.classList.remove('active');
      flagBtn.innerHTML = '⚑ &nbsp;Flag for Review';
    }

    // Question text
    qs('q-text').innerHTML = q.q;

    // Code block
    const codeEl = qs('q-code');
    if (q.code) {
      codeEl.innerHTML = q.code;
      codeEl.style.display = 'block';
    } else {
      codeEl.style.display = 'none';
    }

    // Options
    const optsEl = qs('q-options');
    optsEl.innerHTML = '';
    const letters = ['A','B','C','D'];

    q.opts.forEach((opt, i) => {
      const div = document.createElement('div');
      div.className = 'option';
      if (submitted) div.classList.add('submitted');

      if (submitted) {
        if (i === q.ans) div.classList.add('correct');
        else if (i === selected) div.classList.add('incorrect');
      } else if (i === selected) {
        div.classList.add('selected');
      }

      const ltr = document.createElement('div');
      ltr.className = 'opt-letter';
      ltr.textContent = letters[i];

      const txt = document.createElement('div');
      txt.className = 'opt-text';
      txt.textContent = opt;

      div.appendChild(ltr);
      div.appendChild(txt);

      if (!submitted) {
        div.onclick = () => selectOption(i);
      }

      if (submitted && i === q.ans) {
        const chk = document.createElement('div');
        chk.className = 'opt-check';
        chk.textContent = '✓';
        div.appendChild(chk);
      }

      optsEl.appendChild(div);
    });

    // Explanation
    const expEl = qs('q-explanation');
    expEl.style.display = 'none';
    expEl.innerHTML = '';

    // Submit button state
    const submitBtn = qs('submit-btn');
    if (submitted) {
      submitBtn.textContent = qi < data.length - 1 ? 'Next Question →' : 'See Results';
      submitBtn.onclick = () => navigate(1);
    } else {
      submitBtn.innerHTML = 'Submit &amp; Next →';
      submitBtn.onclick = () => submitAndNext();
    }

    // Progress
    updateProgress();

    // Scroll to top of question
    const scrollEl = qs('q-scroll');
    if (scrollEl) scrollEl.scrollTop = 0;
  }

  /* ══════════════════════════════
     SELECT / SUBMIT
  ══════════════════════════════ */
  function selectOption(i) {
    const k = key(state.examIdx, state.qIdx);
    if (state.submitted[k]) return;

    state.answers[k] = i;
    saveState();

    // Update UI
    document.querySelectorAll('.option').forEach((el, idx) => {
      el.classList.remove('selected');
      el.querySelector('.opt-letter').style.cssText = '';
      const ck = el.querySelector('.opt-check');
      if (ck) ck.remove();
    });

    const opts = document.querySelectorAll('.option');
    opts[i].classList.add('selected');

    refreshNavCell(state.qIdx);
  }

  function submitAndNext() {
    const ei = state.examIdx;
    const qi = state.qIdx;
    const k  = key(ei, qi);
    const data = currentExamData;

    if (state.submitted[k]) { navigate(1); return; }

    // Must have an answer selected
    if (state.answers[k] === undefined) {
      // Flash the options to indicate selection needed
      const optsEl = qs('q-options');
      optsEl.style.opacity = '0.5';
      setTimeout(() => { optsEl.style.opacity = '1'; }, 300);
      return;
    }

    // Mark submitted
    state.submitted[k] = true;
    saveState();

    // Re-render options with correct/wrong highlighting
    const q        = data[qi];
    const selected = state.answers[k];
    const opts     = document.querySelectorAll('.option');

    opts.forEach((el, i) => {
      el.classList.remove('selected');
      el.classList.add('submitted');
      if (i === q.ans) {
        el.classList.add('correct');
        const ck = document.createElement('div');
        ck.className = 'opt-check';
        ck.textContent = '✓';
        el.appendChild(ck);
      } else if (i === selected) {
        el.classList.add('incorrect');
      }
    });

    // Update submit button
    const submitBtn = qs('submit-btn');
    submitBtn.textContent = qi < data.length - 1 ? 'Next Question →' : 'See Results';
    submitBtn.onclick = () => navigate(1);

    // Update nav cell + stats
    refreshNavCell(qi);
    updateNavStats();
    updateProgress();
    updateInfoPanel();

    // Auto-show explanation
    showExplanation();

    // Check if all answered
    const allDone = data.every((_, i) => !!state.submitted[key(ei, i)]);
    if (allDone) {
      state.finished[ei] = true;
      if (!state.timeUsed[ei]) state.timeUsed[ei] = TIME_LIMIT - state.timers[ei];
      stopTimer();
      saveState();
    }

    // If last question, offer results
    if (qi >= data.length - 1 && allDone) {
      setTimeout(() => showResultsScreen(), 1200);
    } else {
      // Auto advance after brief delay if correct
      if (selected === q.ans) {
        setTimeout(() => navigate(1), 1400);
      }
    }
  }

  /* ══════════════════════════════
     NAVIGATION
  ══════════════════════════════ */
  function navigate(dir) {
    const data = currentExamData;
    const newIdx = state.qIdx + dir;

    // Check if last submitted and trying to go next = show results
    const ei = state.examIdx;
    if (dir > 0 && state.qIdx >= data.length - 1 && state.submitted[key(ei, state.qIdx)]) {
      showResultsScreen();
      return;
    }

    if (newIdx < 0 || newIdx >= data.length) return;

    // Update old cell class
    const oldCellEl = qs(`qc-${state.qIdx}`);
    if (oldCellEl) refreshNavCell(state.qIdx);

    state.qIdx = newIdx;
    saveState();

    // Update new cell to current
    const newCellEl = qs(`qc-${newIdx}`);
    if (newCellEl) {
      document.querySelectorAll('.qc.current').forEach(c => {
        if (c.id !== `qc-${newIdx}`) refreshNavCell(parseInt(c.id.replace('qc-','')));
      });
      newCellEl.className = 'qc current';
    }

    renderQuestion();

    // Scroll nav to keep current cell visible
    newCellEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function jumpTo(i) {
    const oldCellEl = qs(`qc-${state.qIdx}`);
    if (oldCellEl) refreshNavCell(state.qIdx);
    state.qIdx = i;
    saveState();
    renderQuestion();
    const cell = qs(`qc-${i}`);
    if (cell) {
      document.querySelectorAll('.qc.current').forEach(c => {
        if (c.id !== `qc-${i}`) refreshNavCell(parseInt(c.id.replace('qc-','')));
      });
      cell.className = 'qc current';
    }
  }

  /* ══════════════════════════════
     FLAG
  ══════════════════════════════ */
  function toggleFlag() {
    const k = key(state.examIdx, state.qIdx);
    state.flagged[k] = !state.flagged[k];
    saveState();
    const btn = qs('flag-btn');
    if (state.flagged[k]) {
      btn.classList.add('active');
      btn.innerHTML = '⚑ &nbsp;Flagged';
    } else {
      btn.classList.remove('active');
      btn.innerHTML = '⚑ &nbsp;Flag for Review';
    }
    refreshNavCell(state.qIdx);
    updateNavStats();
  }

  /* ══════════════════════════════
     EXPLANATION
  ══════════════════════════════ */
  function toggleExplanation() {
    const expEl = qs('q-explanation');
    if (expEl.style.display === 'block') {
      expEl.style.display = 'none';
    } else {
      showExplanation();
    }
  }

  function showExplanation() {
    const ei   = state.examIdx;
    const qi   = state.qIdx;
    const q    = currentExamData[qi];
    const expEl = qs('q-explanation');
    if (!expEl || !q.exp) return;

    expEl.className = 'explanation';
    expEl.innerHTML = `<div class="exp-lbl">✓ Explanation</div><div class="exp-text">${q.exp}</div>`;
    expEl.style.display = 'block';

    // Update tip box
    const tipBox = qs('tip-box');
    if (tipBox && q.exp) {
      tipBox.innerHTML = q.exp.length > 200 ? q.exp.substring(0, 200) + '...' : q.exp;
    }
  }

  /* ══════════════════════════════
     PROGRESS & SCORE
  ══════════════════════════════ */
  function calcScore(ei) {
    const data = getExamData(ei);
    let correct = 0, wrong = 0, total = data.length;
    data.forEach((q, i) => {
      const k = key(ei, i);
      if (state.submitted[k]) {
        if (state.answers[k] === q.ans) correct++;
        else wrong++;
      }
    });
    const answered = correct + wrong;
    const pct = answered > 0 ? Math.round((correct / total) * 100) : null;
    return { correct, wrong, answered, total, pct, remaining: total - answered };
  }

  function updateProgress() {
    const ei = state.examIdx;
    const sc = calcScore(ei);
    const data = currentExamData;
    const pct  = Math.round((sc.answered / sc.total) * 100);

    qs('prog-pct').textContent   = `${pct}%`;
    qs('prog-fill').style.width  = `${pct}%`;
    qs('prog-label').textContent = `${sc.answered} / ${sc.total}`;
  }

  function updateInfoPanel() {
    const ei = state.examIdx;
    const sc = calcScore(ei);

    // Score badge in header
    const badge = qs('hd-score');
    if (sc.pct === null) {
      badge.textContent = 'Score: —';
      badge.className   = 'score-badge';
    } else if (sc.pct >= 75) {
      badge.textContent = `Score: ${sc.pct}% · Passing ✓`;
      badge.className   = 'score-badge';
    } else {
      badge.textContent = `Score: ${sc.pct}% · Below Pass`;
      badge.className   = 'score-badge failing';
    }

    // Score ring
    const ringEl = qs('score-ring');
    const pctEl  = qs('ring-pct');
    if (ringEl && pctEl) {
      if (sc.pct !== null) {
        const circumference = 220;
        const offset = circumference - (sc.pct / 100) * circumference;
        ringEl.style.strokeDashoffset = offset;
        pctEl.textContent = `${sc.pct}%`;
      } else {
        ringEl.style.strokeDashoffset = 220;
        pctEl.textContent = '—';
      }
    }

    // Stats
    qs('rs-correct').textContent = sc.correct;
    qs('rs-wrong').textContent   = sc.wrong;
    qs('rs-remain').textContent  = sc.remaining;

    // Pass strip
    const strip = qs('pass-strip');
    const msg   = qs('pass-msg');
    if (strip && msg) {
      if (sc.pct === null) {
        strip.className = 'pass-strip';
        msg.textContent = 'Complete questions to see your score';
      } else if (sc.pct >= 80) {
        strip.className = 'pass-strip';
        msg.textContent = `${sc.pct}% — Excellent! Well above pass mark`;
      } else if (sc.pct >= 75) {
        strip.className = 'pass-strip';
        msg.textContent = `${sc.pct}% — Passing! Keep it up`;
      } else if (sc.pct >= 60) {
        strip.className = 'pass-strip warn';
        msg.textContent = `${sc.pct}% — Getting closer, keep going`;
      } else {
        strip.className = 'pass-strip fail';
        msg.textContent = `${sc.pct}% — Below pass mark (75%)`;
      }
    }

    // Domain breakdown
    buildDomainBars(ei);
  }

  function buildDomainBars(ei) {
    const barsEl = qs('domain-bars');
    if (!barsEl) return;

    const data   = getExamData(ei);
    const domains = {};

    data.forEach((q, i) => {
      const d = q.domain || 'General';
      const k = key(ei, i);
      if (!domains[d]) domains[d] = { correct: 0, total: 0 };
      domains[d].total++;
      if (state.submitted[k] && state.answers[k] === q.ans) domains[d].correct++;
    });

    // Only show domains that have at least 1 submitted answer
    const activeDomains = Object.entries(domains)
      .filter(([d, v]) => {
        return data.some((q, i) => q.domain === d && !!state.submitted[key(ei, i)]);
      })
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 7);

    if (activeDomains.length === 0) {
      barsEl.innerHTML = '<div style="font-size:12px;color:var(--text3);font-family:var(--body)">Answer questions to see domain breakdown</div>';
      return;
    }

    barsEl.innerHTML = '';
    activeDomains.forEach(([domain, v]) => {
      const submitted = data.filter((q, i) => q.domain === domain && !!state.submitted[key(ei, i)]).length;
      const pct = submitted > 0 ? Math.round((v.correct / submitted) * 100) : 0;

      const div = document.createElement('div');
      div.className = 'dbar';
      div.innerHTML = `
        <div class="dbar-h">
          <span class="dbar-n">${domain}</span>
          <span class="dbar-p">${pct}%</span>
        </div>
        <div class="dbar-t"><div class="dbar-f" style="width:${pct}%"></div></div>`;
      barsEl.appendChild(div);
    });
  }

  /* ══════════════════════════════
     EXAM TABS
  ══════════════════════════════ */
  function updateTabs() {
    document.querySelectorAll('.etab').forEach((tab, i) => {
      tab.classList.remove('active', 'completed');
      if (i === state.examIdx) tab.classList.add('active');
      if (state.finished[i])  tab.classList.add('completed');
    });
    qs('hd-exam-label').textContent = EXAM_META[state.examIdx].subtitle;
    updateTimerDisplay(state.timers[state.examIdx]);
  }

  /* ══════════════════════════════
     RESULTS SCREEN
  ══════════════════════════════ */
  function showResultsScreen() {
    stopTimer();
    const ei   = state.examIdx;
    const sc   = calcScore(ei);
    const data = getExamData(ei);

    showScreen('results');

    // Percentage & grade
    const pct   = sc.pct || 0;
    const passed = pct >= 75;

    qs('results-pct').textContent   = `${pct}%`;
    qs('results-grade').textContent = passed ? 'PASS' : 'FAIL';
    qs('results-grade').style.color = passed ? 'var(--green)' : 'var(--red)';

    qs('results-title').textContent = passed ? '🎉 Congratulations — You Passed!' : '📚 Not Quite — Keep Studying';
    qs('results-sub').textContent   = passed
      ? `You scored ${pct}% on ${EXAM_META[ei].title}. You're on track for the real CREST CPSA exam.`
      : `You scored ${pct}% on ${EXAM_META[ei].title}. The pass mark is 75%. Review the weak areas below and retake.`;

    // Animate ring
    const ringEl = qs('results-ring');
    if (ringEl) {
      const circumference = 365;
      setTimeout(() => {
        ringEl.style.strokeDashoffset = circumference - (pct / 100) * circumference;
        ringEl.style.stroke = passed ? 'var(--green)' : 'var(--red)';
      }, 200);
    }

    // Stats cards
    qs('res-correct').textContent = sc.correct;
    qs('res-wrong').textContent   = sc.wrong;
    qs('res-skipped').textContent = sc.total - sc.answered;
    qs('res-time').textContent    = fmtTime(state.timeUsed[ei] || 0);

    // Domain bars
    buildResultsDomainBars(ei, data);

    // Weak questions
    buildWeakList(ei, data);
  }

  function showResults() {
    showScreen('results');
  }

  function buildResultsDomainBars(ei, data) {
    const grid = qs('results-domain-bars');
    if (!grid) return;
    grid.innerHTML = '';

    const domains = {};
    data.forEach((q, i) => {
      const d = q.domain || 'General';
      const k = key(ei, i);
      if (!domains[d]) domains[d] = { correct: 0, answered: 0, total: 0 };
      domains[d].total++;
      if (state.submitted[k]) {
        domains[d].answered++;
        if (state.answers[k] === q.ans) domains[d].correct++;
      }
    });

    Object.entries(domains)
      .sort((a,b) => b[1].total - a[1].total)
      .forEach(([domain, v]) => {
        const pct    = v.answered > 0 ? Math.round((v.correct / v.answered) * 100) : 0;
        const passed = pct >= 75;
        const div    = document.createElement('div');
        div.className = 'rdbar';
        div.innerHTML = `
          <div class="rdbar-top">
            <div class="rdbar-name">${domain}</div>
            <div class="rdbar-pct ${passed?'pass':'fail'}">${v.answered > 0 ? pct+'%' : 'N/A'}</div>
          </div>
          <div class="rdbar-track"><div class="rdbar-fill ${passed?'pass':'fail'}" style="width:0%" data-w="${pct}"></div></div>
          <div class="rdbar-sub">${v.correct}/${v.answered} answered correctly${v.answered < v.total ? ` (${v.total - v.answered} skipped)` : ''}</div>`;
        grid.appendChild(div);
      });

    // Animate bars
    setTimeout(() => {
      grid.querySelectorAll('.rdbar-fill').forEach(el => {
        el.style.width = el.dataset.w + '%';
      });
    }, 300);
  }

  function buildWeakList(ei, data) {
    const section = qs('results-weak-section');
    const list    = qs('results-weak-list');
    if (!list) return;
    list.innerHTML = '';

    const weak = [];
    data.forEach((q, i) => {
      const k = key(ei, i);
      if (state.submitted[k] && state.answers[k] !== q.ans) {
        weak.push({ q, i });
      }
    });

    if (weak.length === 0) {
      section.style.display = 'none';
      return;
    }
    section.style.display = 'block';

    weak.slice(0, 20).forEach(({ q, i }) => {
      const div = document.createElement('div');
      div.className = 'weak-item';
      div.innerHTML = `
        <div class="weak-item-q">Q${i+1}. ${q.q.length > 120 ? q.q.substring(0,120)+'…' : q.q}</div>
        <div class="weak-item-meta">
          <span class="weak-item-domain">${q.domain || 'General'}</span>
          <span class="weak-item-hint">Click to review →</span>
        </div>`;
      div.onclick = () => {
        state.qIdx = i;
        switchExam(ei);
        setTimeout(() => jumpTo(i), 100);
      };
      list.appendChild(div);
    });

    if (weak.length > 20) {
      const more = document.createElement('div');
      more.style.cssText = 'font-size:12px;color:var(--text3);text-align:center;padding:8px;font-family:var(--body)';
      more.textContent = `… and ${weak.length - 20} more incorrect answers. Use Review All Answers to see everything.`;
      list.appendChild(more);
    }
  }

  /* ══════════════════════════════
     REVIEW ALL ANSWERS
  ══════════════════════════════ */
  function reviewAnswers() {
    const ei   = state.examIdx;
    const data = getExamData(ei);
    const body = qs('review-body');
    if (!body) return;
    body.innerHTML = '';

    const letters = ['A','B','C','D'];

    data.forEach((q, i) => {
      const k        = key(ei, i);
      const submitted = !!state.submitted[k];
      const selected  = state.answers[k];
      const correct   = submitted && selected === q.ans;
      const wrong     = submitted && selected !== q.ans;

      const div = document.createElement('div');
      div.className = `review-item ${submitted ? (correct ? 'rv-correct' : 'rv-wrong') : 'rv-skip'}`;

      const statusText = !submitted ? 'SKIPPED' : correct ? 'CORRECT' : 'INCORRECT';
      const statusCls  = !submitted ? 's' : correct ? 'c' : 'w';

      let optsHtml = '';
      q.opts.forEach((opt, oi) => {
        let cls = 'rv-opt';
        if (oi === q.ans) cls += ' rv-correct-opt';
        else if (oi === selected && !correct) cls += ' rv-wrong-opt';
        optsHtml += `<div class="${cls}"><span class="rv-opt-ltr">${letters[oi]}</span>${opt}</div>`;
      });

      div.innerHTML = `
        <div class="rv-header">
          <div class="rv-q-num">Q${i+1}</div>
          <div class="rv-tags">
            <span class="tag tag-d">${q.domain || 'General'}</span>
            <span class="rv-status ${statusCls}">${statusText}</span>
          </div>
        </div>
        <div class="rv-question">${q.q}</div>
        <div class="rv-opts">${optsHtml}</div>
        ${q.exp ? `<div class="rv-exp"><strong>Explanation:</strong> ${q.exp}</div>` : ''}`;

      body.appendChild(div);
    });

    showScreen('review');
  }

  /* ══════════════════════════════
     RETAKE
  ══════════════════════════════ */
  function retakeExam() {
    const ei = state.examIdx;

    // Clear this exam's data
    const data = getExamData(ei);
    data.forEach((_, i) => {
      const k = key(ei, i);
      delete state.answers[k];
      delete state.submitted[k];
      delete state.flagged[k];
    });

    state.finished[ei] = false;
    state.started[ei]  = true;
    state.timers[ei]   = TIME_LIMIT;
    state.timeUsed[ei] = 0;
    state.qIdx         = 0;

    saveState();
    startExam(ei);
  }

  /* ══════════════════════════════
     TOOLTIP
  ══════════════════════════════ */
  function showTooltip(ev, text) {
    const t = qs('tooltip');
    if (!t) return;
    t.textContent = text;
    t.style.opacity = '1';
    moveTooltip(ev);
  }
  function moveTooltip(ev) {
    const t = qs('tooltip');
    if (!t) return;
    t.style.left = (ev.clientX + 14) + 'px';
    t.style.top  = (ev.clientY - 8)  + 'px';
  }
  function hideTooltip() {
    const t = qs('tooltip');
    if (t) t.style.opacity = '0';
  }

  /* ══════════════════════════════
     INIT
  ══════════════════════════════ */
  function init() {
    loadState();
    showScreen('landing');

    // Keyboard navigation
    document.addEventListener('keydown', ev => {
      const activeScreen = document.querySelector('.screen.active');
      if (!activeScreen || activeScreen.id !== 'screen-exam') return;
      if (['1','2','3','4'].includes(ev.key)) selectOption(parseInt(ev.key) - 1);
      if (ev.key === 'ArrowRight' || ev.key === 'Enter') submitAndNext();
      if (ev.key === 'ArrowLeft') navigate(-1);
      if (ev.key === 'f' || ev.key === 'F') toggleFlag();
      if (ev.key === 'e' || ev.key === 'E') toggleExplanation();
    });
  }

  /* ── PUBLIC API ── */
  return {
    startExam,
    switchExam,
    goHome,
    navigate,
    toggleFlag,
    toggleExplanation,
    submitAndNext,
    showResultsScreen,
    showResults,
    retakeExam,
    reviewAnswers,
    init
  };

})();

/* Boot */
document.addEventListener('DOMContentLoaded', () => App.init());
