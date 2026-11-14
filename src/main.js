import './style.css';
import { STORAGE_KEY, SUBJECTS, SUBJ_MAP, INITIAL_DAYS, EXAM_CHECKLIST_INIT } from './data.js';
import { StudyScene3D } from './scene.js';

function deepClone(x) { return JSON.parse(JSON.stringify(x)); }

function loadState() {
  const fallback = {
    days: deepClone(INITIAL_DAYS).map((d) => ({
      ...d,
      slots: d.slots.map((s) => ({ ...s, status: 'todo', note: '' })),
    })),
    examChecklist: deepClone(EXAM_CHECKLIST_INIT),
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.days)) return fallback;
    if (!Array.isArray(parsed.examChecklist)) parsed.examChecklist = deepClone(EXAM_CHECKLIST_INIT);
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
  selectedSlotId: null,
  editingSlotId: null,
  resetArmed: false,
  layoutMode: 'split', // 'split' | 'hide-3d' | 'full-3d'
};

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
    el.textContent = msg || `Đã lưu ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    el.textContent = 'Không lưu được localStorage — hãy dùng Xuất JSON';
  }
}

const slotIndex = new Map();
function rebuildIndex() {
  slotIndex.clear();
  state.days.forEach((day) => day.slots.forEach((sl) => slotIndex.set(sl.id, { day, sl })));
}
rebuildIndex();

const stageContainer = document.getElementById('stage-pane');
const canvas = document.getElementById('scene-canvas');
const tooltipEl = document.getElementById('tooltip-3d');

const scene3d = new StudyScene3D(stageContainer, canvas, {
  onSelectSlot(slotId) {
    const found = slotIndex.get(slotId);
    if (!found) return;
    ui.selectedSlotId = slotId;
    ui.activeTab = `week${found.day.week}`;
    if (ui.layoutMode === 'full-3d') setLayoutMode('split');
    scene3d.focusSlot(slotId);
    scene3d.syncState(state.days, ui.subjectFilter);
    renderSchedulePanel();
    setTimeout(() => {
      const row = document.getElementById(`slot-${slotId}`);
      if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
  },
  onSelectExam(code) {
    ui.subjectFilter = ui.subjectFilter === code ? null : code;
    renderAll();
  },
  onHover(userData, cx, cy) {
    if (!userData) {
      tooltipEl.classList.add('hidden');
      return;
    }
    if (userData.type === 'slot') {
      const found = slotIndex.get(userData.slotId);
      if (!found) return;
      const { day, sl } = found;
      const sub = SUBJ_MAP[sl.subj];
      const st = sl.status === 'done' ? 'Hoàn thành' : (sl.status === 'doing' ? 'Đang học' : 'Chưa học');
      tooltipEl.innerHTML = `
        <div style="font-weight:700; color:${sub.color}">${sub.short} (${sub.credits}TC)</div>
        <div style="color:#a1a1aa; font-size:11px; margin:2px 0 4px">${day.wd} (${fmtDateVN(day.date)}) · ${sl.period} ${sl.time}</div>
        <div>${escapeHtml(sl.task)}</div>
        <div style="margin-top:4px; font-size:11px; color:#d4d4d8">Trạng thái: <b>${st}</b></div>
      `;
    } else if (userData.type === 'exam') {
      const sub = SUBJ_MAP[userData.code];
      const diff = daysUntil(sub.examDate);
      tooltipEl.innerHTML = `
        <div style="font-weight:700; color:${sub.color}">${sub.name}</div>
        <div style="font-size:11px; color:#a1a1aa">${sub.credits}TC · ${sub.format}</div>
        <div style="margin-top:3px">Thi: <b>${sub.examDate.split('-').reverse().join('/')}</b> · ${sub.shift} · P.${sub.room}</div>
        <div style="color:#fbbf24; font-size:11px">${diff >= 0 ? `Còn ${diff} ngày` : 'Đã qua'}</div>
      `;
    }
    tooltipEl.classList.remove('hidden');
    tooltipEl.style.left = `${Math.min(window.innerWidth - 275, cx + 14)}px`;
    tooltipEl.style.top = `${Math.min(window.innerHeight - 130, cy + 14)}px`;
  },
});

scene3d.buildBoard(state.days, getTodayISO());

function setLayoutMode(mode) {
  ui.layoutMode = mode;
  const ws = document.getElementById('workspace');
  ws.classList.toggle('hide-3d', mode === 'hide-3d');
  ws.classList.toggle('full-3d', mode === 'full-3d');
  document.getElementById('btn-toggle-3d').textContent = mode === 'hide-3d' ? 'Hiện 3D' : 'Ẩn 3D';
  document.getElementById('btn-expand-3d').textContent = mode === 'full-3d' ? 'Thu gọn 3D' : 'Phóng to 3D';
  setTimeout(() => scene3d._resize(), 30);
}

function renderAll() {
  rebuildIndex();
  renderTopMetrics();
  renderSubjectStrip();
  renderSchedulePanel();
  scene3d.syncState(state.days, ui.subjectFilter);
}

function renderTopMetrics() {
  let totS = 0, doneS = 0, totM = 0, doneM = 0;
  state.days.forEach((d) => d.slots.forEach((s) => {
    totS++;
    totM += s.mins;
    if (s.status === 'done') { doneS++; doneM += s.mins; }
  }));
  const pctS = totS ? Math.round((doneS / totS) * 100) : 0;
  const pctM = totM ? Math.round((doneM / totM) * 100) : 0;

  document.getElementById('m-sessions').textContent = `${doneS}/${totS} buổi (${pctS}%)`;
  document.getElementById('m-sessions-bar').style.width = `${pctS}%`;
  document.getElementById('m-hours').textContent = `${fmtHours(doneM)} / ${fmtHours(totM)} (${pctM}%)`;
  document.getElementById('m-hours-bar').style.width = `${pctM}%`;

  const upcoming = SUBJECTS.find((s) => daysUntil(s.examDate) >= 0) || SUBJECTS[SUBJECTS.length - 1];
  const dLeft = daysUntil(upcoming.examDate);
  document.getElementById('m-exam').textContent = `${upcoming.short} · ${fmtDateVN(upcoming.examDate)} (${dLeft > 0 ? `còn ${dLeft}n` : 'hôm nay'})`;
}

function renderSubjectStrip() {
  const stats = {};
  SUBJECTS.forEach((s) => { stats[s.code] = { tot: 0, done: 0 }; });
  state.days.forEach((d) => d.slots.forEach((sl) => {
    if (!stats[sl.subj]) return;
    stats[sl.subj].tot += sl.mins;
    if (sl.status === 'done') stats[sl.subj].done += sl.mins;
  }));

  const grid = document.getElementById('subjects-strip');
  grid.innerHTML = '';
  SUBJECTS.forEach((s) => {
    const st = stats[s.code];
    const pct = st.tot ? Math.round((st.done / st.tot) * 100) : 0;
    const active = ui.subjectFilter === s.code;
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `subj-pill ${active ? 'active' : ''}`;
    card.style.setProperty('--subj-color', s.color);
    card.innerHTML = `
      <div class="subj-pill-top">
        <span class="subj-title"><span class="dot" style="background:${s.color}"></span><span class="name">${s.short}</span></span>
        <span class="tabular" style="font-size:11.5px; font-weight:700; color:${s.color}">${pct}%</span>
      </div>
      <div class="subj-sub">
        <span>${fmtDateVN(s.examDate)} · ${s.credits}TC</span>
        <span class="tabular">${fmtHours(st.done)}/${fmtHours(st.tot)}</span>
      </div>
      <div class="subj-track"><div class="subj-fill" style="width:${pct}%; background:${s.color}"></div></div>
    `;
    card.addEventListener('click', () => {
      ui.subjectFilter = ui.subjectFilter === s.code ? null : s.code;
      renderAll();
    });
    grid.appendChild(card);
  });
}

function renderSchedulePanel() {
  const tabsEl = document.getElementById('week-tabs');
  const tabs = [
    { key: 'week1', label: 'Tuần 1' },
    { key: 'week2', label: 'Tuần 2' },
    { key: 'week3', label: 'Tuần 3' },
    { key: 'week4', label: 'Tuần 4' },
    { key: 'all', label: 'Tất cả' },
    { key: 'exams', label: 'Lịch thi' },
  ];
  tabsEl.innerHTML = '';
  tabs.forEach((t) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `tab-btn ${ui.activeTab === t.key ? 'active' : ''}`;
    b.textContent = t.label;
    b.addEventListener('click', () => {
      ui.activeTab = t.key;
      if (t.key.startsWith('week')) scene3d.focusWeek(Number(t.key.slice(4)));
      else if (t.key === 'exams') scene3d.setMode('towers', true);
      else scene3d.focusWeek(null);
      sync3DModeButtons();
      renderSchedulePanel();
    });
    tabsEl.appendChild(b);
  });

  const list = document.getElementById('schedule-scroll');
  list.innerHTML = '';

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
            <div class="slot-top-row">
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
        renderSchedulePanel();
      });
      list.appendChild(card);
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
    const doneM = day.slots.filter((s) => s.status === 'done').reduce((a, b) => a + b.mins, 0);
    const isToday = day.date === todayISO;

    const card = document.createElement('div');
    card.id = `day-${day.date}`;
    card.className = `day-card ${isToday ? 'is-today' : ''}`;
    card.innerHTML = `
      <div class="day-header">
        <div class="day-title">
          <span>${day.wd}, ${fmtDateVN(day.date)}</span>
          ${isToday ? '<span class="pill pill-today">Hôm nay</span>' : ''}
          ${day.mwfBusy ? '<span class="pill pill-warn">Bận 20–22h</span>' : ''}
        </div>
        <span class="tabular" style="font-size:12px; color:#a1a1aa">${fmtHours(doneM)} / ${fmtHours(totalM)}</span>
      </div>
    `;

    matched.forEach((sl) => {
      const sub = SUBJ_MAP[sl.subj];
      const row = document.createElement('div');
      row.id = `slot-${sl.id}`;
      row.className = `slot-item ${sl.status === 'done' ? 'done' : ''} ${ui.selectedSlotId === sl.id ? 'selected' : ''}`;
      row.innerHTML = `
        <div class="slot-left">
          <input type="checkbox" class="slot-check" ${sl.status === 'done' ? 'checked' : ''} />
          <div class="slot-content">
            <div class="slot-top-row">
              <span class="slot-time tabular">${sl.period} · ${sl.time} (${fmtHours(sl.mins)})</span>
              <span class="slot-tag"><span class="dot" style="background:${sub.color}"></span>${sub.short}</span>
              ${sl.status === 'doing' ? '<span class="pill pill-warn">Đang học</span>' : ''}
            </div>
            <div class="slot-task">${escapeHtml(sl.task)}</div>
            ${sl.note ? `<div class="slot-note">${escapeHtml(sl.note)}</div>` : ''}
          </div>
        </div>
        <div class="slot-controls">
          ${!day.mwfBusy && sl.period === 'Tối' ? `<button type="button" class="btn btn-sm btn-bonus">${sl.mins > 135 ? '-45p' : '+45p'}</button>` : ''}
          <button type="button" class="btn btn-sm btn-edit">Sửa</button>
        </div>
      `;

      row.querySelector('.slot-check').addEventListener('change', (e) => {
        sl.status = e.target.checked ? 'done' : 'todo';
        if (sl.status === 'done') scene3d.celebrateSlot(sl.id);
        saveState();
        renderAll();
      });

      row.querySelector('.slot-task').addEventListener('click', () => {
        ui.selectedSlotId = sl.id;
        scene3d.focusSlot(sl.id);
        scene3d.syncState(state.days, ui.subjectFilter);
        renderSchedulePanel();
      });

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

    list.appendChild(card);
  });

  if (count === 0) {
    list.innerHTML = `<div style="text-align:center; padding:32px; color:#71717a">Không có buổi học nào khớp bộ lọc.</div>`;
  }
}

function sync3DModeButtons() {
  document.getElementById('mode-matrix').classList.toggle('active', scene3d.mode === 'matrix');
  document.getElementById('mode-towers').classList.toggle('active', scene3d.mode === 'towers');
}

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
  const prev = found.sl.status;
  found.sl.subj = document.getElementById('modal-subj').value;
  found.sl.task = document.getElementById('modal-task').value.trim() || found.sl.task;
  const mins = parseInt(document.getElementById('modal-mins').value, 10);
  if (!Number.isNaN(mins) && mins >= 15 && mins <= 300) found.sl.mins = mins;
  found.sl.status = document.getElementById('modal-status').value;
  found.sl.note = document.getElementById('modal-note').value.trim();
  if (prev !== 'done' && found.sl.status === 'done') scene3d.celebrateSlot(found.sl.id);
  saveState();
  closeModal();
  renderAll();
});

// Events
document.getElementById('filter-status').addEventListener('change', (e) => { ui.statusFilter = e.target.value; renderSchedulePanel(); });
document.getElementById('filter-search').addEventListener('input', (e) => { ui.search = e.target.value; renderSchedulePanel(); });

document.getElementById('mode-matrix').addEventListener('click', () => { scene3d.setMode('matrix', true); sync3DModeButtons(); });
document.getElementById('mode-towers').addEventListener('click', () => { scene3d.setMode('towers', true); sync3DModeButtons(); });
document.getElementById('btn-reset-cam').addEventListener('click', () => {
  if (scene3d.mode === 'matrix') scene3d.focusWeek(null);
  else scene3d.setMode('towers', true);
});

document.getElementById('btn-toggle-3d').addEventListener('click', () => {
  setLayoutMode(ui.layoutMode === 'hide-3d' ? 'split' : 'hide-3d');
});

document.getElementById('btn-expand-3d').addEventListener('click', () => {
  setLayoutMode(ui.layoutMode === 'full-3d' ? 'split' : 'full-3d');
});

document.getElementById('btn-today').addEventListener('click', () => {
  const today = getTodayISO();
  const match = state.days.find((d) => d.date === today) || state.days[0];
  ui.activeTab = `week${match.week}`;
  ui.subjectFilter = null;
  ui.statusFilter = 'all';
  ui.search = '';
  document.getElementById('filter-status').value = 'all';
  document.getElementById('filter-search').value = '';
  scene3d.focusWeek(match.week);
  sync3DModeButtons();
  renderAll();
  setTimeout(() => {
    const el = document.getElementById(`day-${match.date}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 50);
});

document.getElementById('btn-export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lich-on-thi-3d-${getTodayISO()}.json`;
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
        saveState('Đã nhập JSON');
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
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  state = loadState();
  saveState('Đã đặt lại mặc định');
  renderAll();
});

// Focus Timer
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
      else { clearInterval(timerInt); timerInt = null; timerBtn.textContent = 'Xong!'; }
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
