import './style.css';
import { STORAGE_KEY, SUBJECTS, SUBJ_MAP, INITIAL_DAYS, EXAM_CHECKLIST_INIT } from './data.js';

function deepClone(x) { return JSON.parse(JSON.stringify(x)); }

function loadState() {
  const fallback = {
    days: deepClone(INITIAL_DAYS).map((d) => ({
      ...d,
      slots: d.slots.map((s) => ({ ...s, status: 'todo', note: '', loggedSecs: 0 })),
    })),
    examChecklist: deepClone(EXAM_CHECKLIST_INIT),
    activeTimer: null, // { slotId, running, startedAtMs }
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('studyverse_3d_ptit_2026_v1');
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.days)) return fallback;
    parsed.days.forEach((d) => d.slots.forEach((s) => {
      if (typeof s.loggedSecs !== 'number') s.loggedSecs = 0;
    }));
    if (!Array.isArray(parsed.examChecklist)) parsed.examChecklist = deepClone(EXAM_CHECKLIST_INIT);
    if (!parsed.activeTimer) parsed.activeTimer = null;
    return parsed;
  } catch {
    return fallback;
  }
}

let state = loadState();
let ui = {
  activeTab: 'week1',
  subjectFilter: null,
  statusFilter: 'all',
  search: '',
  editingSlotId: null,
  resetArmed: false,
};

const slotIndex = new Map();
function rebuildIndex() {
  slotIndex.clear();
  state.days.forEach((day) => day.slots.forEach((sl) => slotIndex.set(sl.id, { day, sl })));
}
rebuildIndex();

function getTodayISO() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

function daysUntil(iso) {
  const n = new Date();
  const today = new Date(n.getFullYear(), n.getMonth(), n.getDate());
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round((new Date(y, m - 1, d) - today) / 86400000);
}

function fmtHours(mins) {
  return `${Math.floor(mins / 60)}h${String(mins % 60).padStart(2, '0')}`;
}

function fmtClock(totalSecs) {
  const s = Math.max(0, Math.floor(totalSecs));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function fmtDateVN(iso) {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function saveState(msg) {
  const el = document.getElementById('save-status');
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (el) el.textContent = msg || `Đã lưu lúc ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    if (el) el.textContent = 'Không lưu được localStorage — hãy dùng Xuất JSON';
  }
}

function playGentleChime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + idx * 0.18;
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.exponentialRampToValueAtTime(0.14, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.46);
    });
  } catch {}
}

// Live Session Stopwatch Engine
function getLiveSecs(sl) {
  if (!sl) return 0;
  if (state.activeTimer && state.activeTimer.slotId === sl.id && state.activeTimer.running) {
    return Math.max(0, Math.floor((Date.now() - state.activeTimer.startedAtMs) / 1000));
  }
  return sl.loggedSecs || 0;
}

function getEffectiveMins(sl) {
  if (sl.status === 'done') return sl.mins;
  const loggedMins = Math.floor(getLiveSecs(sl) / 60);
  return Math.min(sl.mins, loggedMins);
}

let sessionTickInt = null;
let lastChimedId = null;

function commitRunningElapsed() {
  if (!state.activeTimer || !state.activeTimer.running) return;
  const found = slotIndex.get(state.activeTimer.slotId);
  if (found) {
    found.sl.loggedSecs = getLiveSecs(found.sl);
  }
}

function startOrToggleSlotTimer(slotId) {
  const target = slotIndex.get(slotId);
  if (!target) return;

  // Clicking currently active session toggles pause/resume
  if (state.activeTimer && state.activeTimer.slotId === slotId) {
    if (state.activeTimer.running) {
      target.sl.loggedSecs = getLiveSecs(target.sl);
      state.activeTimer.running = false;
      saveState('Đã tạm dừng bấm giờ');
    } else {
      if (target.sl.status === 'todo') target.sl.status = 'doing';
      state.activeTimer.startedAtMs = Date.now() - (target.sl.loggedSecs || 0) * 1000;
      state.activeTimer.running = true;
      saveState('Đang tiếp tục bấm giờ');
    }
    syncSessionLoop();
    renderAll();
    return;
  }

  // Freeze previous running session if switching
  commitRunningElapsed();

  if (target.sl.status === 'todo') target.sl.status = 'doing';
  state.activeTimer = {
    slotId: target.sl.id,
    running: true,
    startedAtMs: Date.now() - (target.sl.loggedSecs || 0) * 1000,
  };
  saveState(`Đang tính giờ: ${SUBJ_MAP[target.sl.subj].short}`);
  syncSessionLoop();
  renderAll();
}

function pauseActiveTimer() {
  if (!state.activeTimer || !state.activeTimer.running) return;
  commitRunningElapsed();
  state.activeTimer.running = false;
  saveState('Đã tạm dừng bấm giờ');
  syncSessionLoop();
  renderAll();
}

function completeActiveSession() {
  if (!state.activeTimer) return;
  const found = slotIndex.get(state.activeTimer.slotId);
  if (found) {
    found.sl.loggedSecs = getLiveSecs(found.sl);
    found.sl.status = 'done';
  }
  state.activeTimer.running = false;
  saveState('Đã hoàn thành buổi học!');
  syncSessionLoop();
  renderAll();
}

function resetActiveSessionTimer() {
  if (!state.activeTimer) return;
  const found = slotIndex.get(state.activeTimer.slotId);
  if (found) found.sl.loggedSecs = 0;
  state.activeTimer.running = false;
  state.activeTimer.startedAtMs = Date.now();
  lastChimedId = null;
  saveState('Đã đặt lại giờ của buổi học');
  syncSessionLoop();
  renderAll();
}

function closeFocusBanner() {
  commitRunningElapsed();
  state.activeTimer = null;
  saveState();
  syncSessionLoop();
  renderAll();
}

function syncSessionLoop() {
  if (sessionTickInt) {
    clearInterval(sessionTickInt);
    sessionTickInt = null;
  }
  if (state.activeTimer && state.activeTimer.running) {
    let tickCount = 0;
    sessionTickInt = setInterval(() => {
      tickCount++;
      updateLiveClockDisplays();
      if (tickCount % 15 === 0) {
        commitRunningElapsed();
        saveState();
        renderTopMetrics();
      }
    }, 1000);
  }
  updateLiveClockDisplays();
}

function updateLiveClockDisplays() {
  const banner = document.getElementById('focus-banner');
  if (!state.activeTimer) {
    banner.classList.add('hidden');
    document.title = 'StudyFlow — Lịch Ôn Thi (16/11 – 13/12/2026)';
    return;
  }

  const found = slotIndex.get(state.activeTimer.slotId);
  if (!found) {
    banner.classList.add('hidden');
    return;
  }

  const { day, sl } = found;
  const sub = SUBJ_MAP[sl.subj];
  const secs = getLiveSecs(sl);
  const targetSecs = sl.mins * 60;
  const rem = targetSecs - secs;
  const pct = Math.min(100, Math.round((secs / targetSecs) * 100));

  banner.classList.remove('hidden');
  document.getElementById('focus-title').textContent = `${sub.name} · ${day.wd} (${fmtDateVN(day.date)}) — ${sl.period} ${sl.time}`;
  document.getElementById('focus-sub').textContent = sl.task;
  document.getElementById('focus-elapsed').textContent = fmtClock(secs);
  document.getElementById('focus-remaining').textContent = rem >= 0 ? `Còn ${fmtClock(rem)}` : `Vượt +${fmtClock(-rem)}`;
  document.getElementById('focus-bar-fill').style.width = `${pct}%`;

  const dot = document.getElementById('focus-dot');
  const stLabel = document.getElementById('focus-state-label');
  const toggleBtn = document.getElementById('focus-toggle');
  if (state.activeTimer.running) {
    dot.className = 'focus-dot running';
    stLabel.textContent = 'Đang tính giờ';
    toggleBtn.textContent = 'Tạm dừng';
    document.title = `⏱ ${fmtClock(secs)} · ${sub.short} — StudyFlow`;
    if (rem <= 0 && lastChimedId !== sl.id) {
      lastChimedId = sl.id;
      playGentleChime();
    }
  } else {
    dot.className = 'focus-dot paused';
    stLabel.textContent = 'Đang tạm dừng';
    toggleBtn.textContent = 'Tiếp tục';
    document.title = `⏸ ${fmtClock(secs)} · ${sub.short} — StudyFlow`;
  }

  // Update inline slot readout without re-rendering full DOM
  const inlineText = document.getElementById(`slot-live-text-${sl.id}`);
  const inlineFill = document.getElementById(`slot-live-fill-${sl.id}`);
  if (inlineText) {
    inlineText.textContent = `${fmtClock(secs)} / ${fmtHours(sl.mins)} (${pct}%)`;
  }
  if (inlineFill) {
    inlineFill.style.width = `${pct}%`;
  }
}

window.addEventListener('beforeunload', () => {
  if (state.activeTimer && state.activeTimer.running) {
    commitRunningElapsed();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  }
});

function renderAll() {
  rebuildIndex();
  renderTopMetrics();
  renderSidebar();
  renderSchedule();
  updateLiveClockDisplays();
}

function renderTopMetrics() {
  let totS = 0, doneS = 0, totM = 0, doneM = 0;
  state.days.forEach((d) => d.slots.forEach((s) => {
    totS++;
    totM += s.mins;
    if (s.status === 'done') doneS++;
    doneM += getEffectiveMins(s);
  }));
  const pctS = totS ? Math.round((doneS / totS) * 100) : 0;
  const pctM = totM ? Math.round((doneM / totM) * 100) : 0;

  document.getElementById('m-sessions').textContent = `${doneS}/${totS} (${pctS}%)`;
  document.getElementById('m-sessions-bar').style.width = `${pctS}%`;
  document.getElementById('m-hours').textContent = `${fmtHours(doneM)} / ${fmtHours(totM)}`;
  document.getElementById('m-hours-bar').style.width = `${pctM}%`;

  const heroPct = document.getElementById('hero-pct');
  const heroSub = document.getElementById('hero-sub');
  if (heroPct) heroPct.textContent = `${pctM}%`;
  if (heroSub) heroSub.textContent = `${fmtHours(doneM)} / ${fmtHours(totM)}`;

  const upcoming = SUBJECTS.find((s) => daysUntil(s.examDate) >= 0) || SUBJECTS[SUBJECTS.length - 1];
  const dLeft = daysUntil(upcoming.examDate);
  document.getElementById('m-exam').textContent = `${upcoming.short} · ${fmtDateVN(upcoming.examDate)} (${dLeft > 0 ? `còn ${dLeft}n` : 'hôm nay'})`;
}

function renderSidebar() {
  const stats = {};
  SUBJECTS.forEach((s) => { stats[s.code] = { tot: 0, done: 0 }; });
  state.days.forEach((d) => d.slots.forEach((sl) => {
    if (!stats[sl.subj]) return;
    stats[sl.subj].tot += sl.mins;
    stats[sl.subj].done += getEffectiveMins(sl);
  }));

  document.getElementById('btn-clear-subj').classList.toggle('hidden', !ui.subjectFilter);

  const list = document.getElementById('subjects-list');
  list.innerHTML = '';
  SUBJECTS.forEach((s) => {
    const st = stats[s.code];
    const pct = st.tot ? Math.round((st.done / st.tot) * 100) : 0;
    const active = ui.subjectFilter === s.code;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `subj-item ${active ? 'active' : ''}`;
    btn.style.setProperty('--subj-color', s.color);
    btn.innerHTML = `
      <div class="subj-row-1">
        <span class="subj-name"><span class="dot" style="background:${s.color}"></span>${s.short} <span style="color:#71717a;font-weight:400">(${s.credits}TC)</span></span>
        <span class="tabular" style="font-size:12px; font-weight:700; color:${s.color}">${pct}%</span>
      </div>
      <div class="subj-row-2">
        <span>Thi ${fmtDateVN(s.examDate)} · ${s.shift} · ${s.format}</span>
        <span class="tabular">${fmtHours(st.done)}/${fmtHours(st.tot)}</span>
      </div>
      <div class="track"><div class="fill" style="width:${pct}%; background:${s.color}"></div></div>
      ${s.alert ? `<div style="margin-top:4px; font-size:11px; color:#fbbf24">★ ${s.alert}</div>` : ''}
    `;
    btn.addEventListener('click', () => {
      ui.subjectFilter = ui.subjectFilter === s.code ? null : s.code;
      renderAll();
    });
    list.appendChild(btn);
  });

  const wp = document.getElementById('weeks-progress');
  wp.innerHTML = '';
  const ranges = ['16–22/11', '23–29/11', '30/11–06/12', '07–13/12'];
  [1, 2, 3, 4].forEach((w) => {
    let mins = 0, doneM = 0, cnt = 0, doneC = 0;
    state.days.filter((d) => d.week === w).forEach((d) => d.slots.forEach((s) => {
      mins += s.mins; cnt++;
      if (s.status === 'done') doneC++;
      doneM += getEffectiveMins(s);
    }));
    const pct = mins ? Math.round((doneM / mins) * 100) : 0;
    const row = document.createElement('div');
    row.className = 'week-row';
    row.innerHTML = `
      <div class="week-row-top">
        <b>Tuần ${w} (${ranges[w - 1]})</b>
        <span class="tabular">${doneC}/${cnt} buổi · ${fmtHours(doneM)}/${fmtHours(mins)}</span>
      </div>
      <div class="track"><div class="fill" style="width:${pct}%; background:linear-gradient(90deg,#60a5fa,#34d399)"></div></div>
    `;
    wp.appendChild(row);
  });
}

function renderSchedule() {
  const tabsEl = document.getElementById('week-tabs');
  const tabs = [
    { key: 'week1', label: 'Tuần 1 (16–22/11)' },
    { key: 'week2', label: 'Tuần 2 (23–29/11)' },
    { key: 'week3', label: 'Tuần 3 (30/11–06/12)' },
    { key: 'week4', label: 'Tuần 4 (07–13/12)' },
    { key: 'all', label: 'Cả 4 tuần' },
    { key: 'exams', label: 'Giai đoạn thi (14/12–08/01)' },
  ];
  tabsEl.innerHTML = '';
  tabs.forEach((t) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `tab-btn ${ui.activeTab === t.key ? 'active' : ''}`;
    b.textContent = t.label;
    b.addEventListener('click', () => {
      ui.activeTab = t.key;
      renderSchedule();
    });
    tabsEl.appendChild(b);
  });

  const grid = document.getElementById('schedule-grid');
  grid.innerHTML = '';

  if (ui.activeTab === 'exams') {
    state.examChecklist.forEach((item) => {
      const sub = SUBJ_MAP[item.code];
      const card = document.createElement('label');
      card.className = `day-card slot-item ${item.done ? 'done' : ''}`;
      card.style.cursor = 'pointer';
      card.innerHTML = `
        <div class="slot-left">
          <input type="checkbox" class="slot-check" ${item.done ? 'checked' : ''} />
          <div class="slot-content">
            <div class="slot-top">
              <span class="slot-tag"><span class="dot" style="background:${sub.color}"></span>${sub.name}</span>
              <span class="slot-time">${sub.credits}TC · ${sub.format}</span>
            </div>
            <div class="slot-task">${escapeHtml(item.label)}</div>
          </div>
        </div>
      `;
      card.querySelector('input').addEventListener('change', (e) => {
        item.done = e.target.checked;
        saveState();
        renderSchedule();
      });
      grid.appendChild(card);
    });
    return;
  }

  const todayISO = getTodayISO();
  const q = ui.search.trim().toLowerCase();
  const weekNum = ui.activeTab.startsWith('week') ? Number(ui.activeTab.slice(4)) : null;

  let count = 0;
  state.days.forEach((day) => {
    if (weekNum && day.week !== weekNum) return;
    const matched = day.slots.filter((sl) => {
      if (ui.subjectFilter && sl.subj !== ui.subjectFilter) return false;
      if (ui.statusFilter === 'done' && sl.status !== 'done') return false;
      if (ui.statusFilter === 'pending' && sl.status === 'done') return false;
      if (q) {
        const sub = SUBJ_MAP[sl.subj];
        const hay = `${sl.task} ${sl.note || ''} ${sub.name} ${sub.short} ${sub.code}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    if (!matched.length) return;
    count++;

    const totalM = day.slots.reduce((a, b) => a + b.mins, 0);
    const doneM = day.slots.reduce((a, b) => a + getEffectiveMins(b), 0);
    const isToday = day.date === todayISO;

    const card = document.createElement('div');
    card.id = `day-${day.date}`;
    card.className = `day-card ${isToday ? 'is-today' : ''}`;
    card.innerHTML = `
      <div class="day-head">
        <div class="day-title">
          <span>${day.wd}, ${fmtDateVN(day.date)}</span>
          ${isToday ? '<span class="pill pill-today">Hôm nay</span>' : ''}
          ${day.mwfBusy ? '<span class="pill pill-warn">Bận 20:00–22:00</span>' : ''}
        </div>
        <span class="tabular muted-text">${fmtHours(doneM)} / ${fmtHours(totalM)}</span>
      </div>
    `;

    matched.forEach((sl) => {
      const sub = SUBJ_MAP[sl.subj];
      const isActive = state.activeTimer && state.activeTimer.slotId === sl.id;
      const isRunning = isActive && state.activeTimer.running;
      const secs = getLiveSecs(sl);
      const pct = Math.min(100, Math.round((secs / (sl.mins * 60)) * 100));

      const row = document.createElement('div');
      row.id = `slot-${sl.id}`;
      row.className = `slot-item ${sl.status === 'done' ? 'done' : ''} ${isActive ? 'is-timing' : ''}`;
      row.innerHTML = `
        <div class="slot-left">
          <input type="checkbox" class="slot-check" ${sl.status === 'done' ? 'checked' : ''} />
          <div class="slot-content clickable" title="Click để bắt đầu / tạm dừng tính giờ buổi này">
            <div class="slot-top">
              <span class="slot-time tabular">${sl.period} · ${sl.time} (${fmtHours(sl.mins)})</span>
              <span class="slot-tag"><span class="dot" style="background:${sub.color}"></span>${sub.short}</span>
              ${sl.status === 'doing' && !isRunning ? '<span class="pill pill-warn">Đang học</span>' : ''}
              ${isRunning ? '<span class="pill pill-today">● Đang tính giờ</span>' : ''}
            </div>
            <div class="slot-task">${escapeHtml(sl.task)}</div>
            ${(secs > 0 || isActive) ? `
              <div class="slot-timer-progress">
                <div class="slot-timer-track"><div id="slot-live-fill-${sl.id}" class="slot-timer-fill" style="width:${pct}%"></div></div>
                <span id="slot-live-text-${sl.id}" class="tabular">${fmtClock(secs)} / ${fmtHours(sl.mins)} (${pct}%)</span>
              </div>
            ` : ''}
            ${sl.note ? `<div class="slot-note">Ghi chú: ${escapeHtml(sl.note)}</div>` : ''}
          </div>
        </div>
        <div class="slot-actions">
          <button type="button" class="btn btn-sm btn-play ${isActive ? 'btn-play-active' : ''}" title="Bấm giờ buổi này">${isRunning ? '⏸ Dừng' : (secs > 0 ? '▶ Tiếp' : '▶ Bấm giờ')}</button>
          ${!day.mwfBusy && sl.period === 'Tối' ? `<button type="button" class="btn btn-sm btn-bonus" title="Dùng thêm 45p đệm 22:15–23:00">${sl.mins > 135 ? '-45p' : '+45p'}</button>` : ''}
          <button type="button" class="btn btn-sm btn-edit">Sửa</button>
        </div>
      `;

      row.querySelector('.slot-check').addEventListener('change', (e) => {
        if (e.target.checked) {
          if (state.activeTimer && state.activeTimer.slotId === sl.id) {
            sl.loggedSecs = getLiveSecs(sl);
            state.activeTimer.running = false;
          }
          sl.status = 'done';
        } else {
          sl.status = (sl.loggedSecs || 0) > 0 ? 'doing' : 'todo';
        }
        saveState();
        syncSessionLoop();
        renderAll();
      });

      row.querySelector('.slot-content').addEventListener('click', () => startOrToggleSlotTimer(sl.id));
      row.querySelector('.btn-play').addEventListener('click', () => startOrToggleSlotTimer(sl.id));

      const bonusBtn = row.querySelector('.btn-bonus');
      if (bonusBtn) {
        bonusBtn.addEventListener('click', () => {
          if (sl.mins <= 135) { sl.mins = 180; sl.time = '20:00–23:00'; }
          else { sl.mins = 135; sl.time = '20:00–22:15'; }
          saveState();
          renderAll();
        });
      }

      row.querySelector('.btn-edit').addEventListener('click', () => openModal(day, sl));
      card.appendChild(row);
    });

    grid.appendChild(card);
  });

  if (count === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:#71717a">Không có buổi học nào khớp với bộ lọc hiện tại.</div>`;
  }
}

// Focus Banner Controls
document.getElementById('focus-toggle').addEventListener('click', () => {
  if (!state.activeTimer) return;
  startOrToggleSlotTimer(state.activeTimer.slotId);
});
document.getElementById('focus-complete').addEventListener('click', completeActiveSession);
document.getElementById('focus-reset').addEventListener('click', resetActiveSessionTimer);
document.getElementById('focus-close').addEventListener('click', closeFocusBanner);

// Modal
function openModal(day, sl) {
  ui.editingSlotId = sl.id;
  document.getElementById('modal-meta').textContent = `${day.wd} (${fmtDateVN(day.date)}) · ${sl.period} ${sl.time}`;
  const sel = document.getElementById('modal-subj');
  sel.innerHTML = SUBJECTS.map((s) => `<option value="${s.code}">${s.short} — ${s.name}</option>`).join('');
  sel.value = sl.subj;
  document.getElementById('modal-task').value = sl.task;
  document.getElementById('modal-mins').value = sl.mins;
  document.getElementById('modal-status').value = sl.status;
  document.getElementById('modal-note').value = sl.note || '';
  document.getElementById('edit-modal').classList.remove('hidden');
}

function closeModal() {
  ui.editingSlotId = null;
  document.getElementById('edit-modal').classList.add('hidden');
}

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-save').addEventListener('click', () => {
  const found = slotIndex.get(ui.editingSlotId);
  if (!found) return closeModal();
  found.sl.subj = document.getElementById('modal-subj').value;
  found.sl.task = document.getElementById('modal-task').value.trim() || found.sl.task;
  const mins = parseInt(document.getElementById('modal-mins').value, 10);
  if (!Number.isNaN(mins) && mins >= 15 && mins <= 300) found.sl.mins = mins;
  found.sl.status = document.getElementById('modal-status').value;
  found.sl.note = document.getElementById('modal-note').value.trim();
  saveState();
  closeModal();
  renderAll();
});

// Filters & Buttons
document.getElementById('btn-clear-subj').addEventListener('click', () => { ui.subjectFilter = null; renderAll(); });
document.getElementById('filter-status').addEventListener('change', (e) => { ui.statusFilter = e.target.value; renderSchedule(); });
document.getElementById('filter-search').addEventListener('input', (e) => { ui.search = e.target.value; renderSchedule(); });

document.getElementById('btn-today').addEventListener('click', () => {
  const today = getTodayISO();
  const match = state.days.find((d) => d.date === today) || state.days[0];
  ui.activeTab = `week${match.week}`;
  ui.subjectFilter = null;
  ui.statusFilter = 'all';
  ui.search = '';
  document.getElementById('filter-status').value = 'all';
  document.getElementById('filter-search').value = '';
  renderAll();
  setTimeout(() => {
    const el = document.getElementById(`day-${match.date}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 50);
});

document.getElementById('btn-export').addEventListener('click', () => {
  commitRunningElapsed();
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lich-on-thi-${getTodayISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('input-import').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const parsed = JSON.parse(r.result);
      if (parsed && Array.isArray(parsed.days)) {
        state = parsed;
        rebuildIndex();
        saveState('Đã nhập tiến độ từ JSON');
        syncSessionLoop();
        renderAll();
      }
    } catch {
      document.getElementById('save-status').textContent = 'File JSON không hợp lệ';
    }
  };
  r.readAsText(file);
  e.target.value = '';
});

document.getElementById('btn-reset').addEventListener('click', (e) => {
  if (!ui.resetArmed) {
    ui.resetArmed = true;
    e.target.textContent = 'Chắc chắn?';
    setTimeout(() => { ui.resetArmed = false; e.target.textContent = 'Đặt lại'; }, 3000);
    return;
  }
  ui.resetArmed = false;
  e.target.textContent = 'Đặt lại';
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('studyverse_3d_ptit_2026_v1');
  } catch {}
  state = loadState();
  rebuildIndex();
  saveState('Đã đặt lại mặc định');
  syncSessionLoop();
  renderAll();
});

// Topbar Standalone Pomodoro Timer
let timerSec = 50 * 60;
let timerInt = null;
const timerDisp = document.getElementById('timer-display');
const timerBtn = document.getElementById('timer-toggle');

function drawTimer() {
  timerDisp.textContent = `${String(Math.floor(timerSec / 60)).padStart(2, '0')}:${String(timerSec % 60).padStart(2, '0')}`;
}

document.getElementById('timer-preset').addEventListener('change', (e) => {
  clearInterval(timerInt); timerInt = null; timerBtn.textContent = 'Bắt đầu';
  timerSec = parseInt(e.target.value, 10) * 60;
  drawTimer();
});

timerBtn.addEventListener('click', () => {
  if (timerInt) {
    clearInterval(timerInt); timerInt = null; timerBtn.textContent = 'Tiếp tục';
  } else {
    timerBtn.textContent = 'Tạm dừng';
    timerInt = setInterval(() => {
      if (timerSec > 0) { timerSec--; drawTimer(); }
      else { clearInterval(timerInt); timerInt = null; timerBtn.textContent = 'Xong!'; playGentleChime(); }
    }, 1000);
  }
});

document.getElementById('timer-reset').addEventListener('click', () => {
  clearInterval(timerInt); timerInt = null; timerBtn.textContent = 'Bắt đầu';
  timerSec = parseInt(document.getElementById('timer-preset').value, 10) * 60;
  drawTimer();
});

const todayObj = state.days.find((d) => d.date === getTodayISO());
if (todayObj) ui.activeTab = `week${todayObj.week}`;

renderAll();
syncSessionLoop();
