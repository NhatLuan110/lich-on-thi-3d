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
  activeTab: 'week1', // week1..week4 | all | exams
  subjectFilter: null,
  statusFilter: 'all',
  search: '',
  selectedSlotId: null,
  editingSlotId: null,
  resetArmed: false,
  autoRotate: false,
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
    el.textContent = msg || `Đã lưu ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
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

// Initialize Three.js 3D Scene
const canvas = document.getElementById('scene-canvas');
const tooltipEl = document.getElementById('tooltip-3d');

const scene3d = new StudyScene3D(canvas, {
  onSelectSlot(slotId) {
    const found = slotIndex.get(slotId);
    if (!found) return;
    ui.selectedSlotId = slotId;
    ui.activeTab = `week${found.day.week}`;
    scene3d.focusSlot(slotId);
    scene3d.syncState(state.days, ui.subjectFilter);
    renderRightPanel();
    const rightPanel = document.getElementById('panel-right');
    rightPanel.classList.remove('collapsed');
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
      const stText = sl.status === 'done' ? 'Hoàn thành' : (sl.status === 'doing' ? 'Đang làm dở' : 'Chưa học');
      tooltipEl.innerHTML = `
        <div style="font-weight:700; color:${sub.color}">${sub.short} (${sub.credits}TC)</div>
        <div style="color:#94a3b8; font-size:11px; margin-bottom:4px">${day.wd} (${fmtDateVN(day.date)}) · ${sl.period} ${sl.time} (${fmtHours(sl.mins)})</div>
        <div>${escapeHtml(sl.task)}</div>
        <div style="margin-top:4px; font-size:11px; color:#cbd5e1">Trạng thái: <b>${stText}</b> · <i>Click để chọn/sửa</i></div>
      `;
    } else if (userData.type === 'exam') {
      const sub = SUBJ_MAP[userData.code];
      const diff = daysUntil(sub.examDate);
      tooltipEl.innerHTML = `
        <div style="font-weight:700; color:${sub.color}">${sub.name}</div>
        <div style="font-size:11px; color:#94a3b8">${sub.credits} tín chỉ · ${sub.format}</div>
        <div style="margin-top:3px">Thi: <b>${sub.examDate.split('-').reverse().join('/')}</b> · ${sub.shift} · P.${sub.room}</div>
        <div style="color:#fbbf24; font-size:11px">${diff >= 0 ? `Còn ${diff} ngày` : 'Đã qua'} · Click để lọc môn</div>
      `;
    }
    tooltipEl.classList.remove('hidden');
    tooltipEl.style.left = `${Math.min(window.innerWidth - 295, cx + 14)}px`;
    tooltipEl.style.top = `${Math.min(window.innerHeight - 130, cy + 14)}px`;
  },
});

scene3d.buildBoard(state.days, getTodayISO());

function renderAll() {
  rebuildIndex();
  renderTopStats();
  renderLeftPanel();
  renderRightPanel();
  scene3d.syncState(state.days, ui.subjectFilter);
}

function renderTopStats() {
  let totS = 0, doneS = 0, totM = 0, doneM = 0;
  state.days.forEach((d) => d.slots.forEach((s) => {
    totS++;
    totM += s.mins;
    if (s.status === 'done') { doneS++; doneM += s.mins; }
  }));
  const pctS = totS ? Math.round((doneS / totS) * 100) : 0;
  const pctM = totM ? Math.round((doneM / totM) * 100) : 0;

  document.getElementById('stat-sessions').textContent = `${doneS}/${totS} buổi`;
  document.getElementById('stat-sessions-pct').textContent = `${pctS}%`;
  document.getElementById('bar-sessions').style.width = `${pctS}%`;

  document.getElementById('stat-hours').textContent = `${fmtHours(doneM)} / ${fmtHours(totM)}`;
  document.getElementById('stat-hours-pct').textContent = `${pctM}%`;
  document.getElementById('bar-hours').style.width = `${pctM}%`;

  const upcoming = SUBJECTS.find((s) => daysUntil(s.examDate) >= 0) || SUBJECTS[SUBJECTS.length - 1];
  const dLeft = daysUntil(upcoming.examDate);
  document.getElementById('stat-next-exam').textContent = `${upcoming.short} (${upcoming.examDate.split('-').reverse().join('/')})`;
  document.getElementById('stat-next-days').textContent = dLeft === 0 ? 'Hôm nay' : (dLeft > 0 ? `Còn ${dLeft} ngày` : 'Đã thi');
}

function renderLeftPanel() {
  const stats = {};
  SUBJECTS.forEach((s) => { stats[s.code] = { tot: 0, done: 0, cnt: 0, doneCnt: 0 }; });
  state.days.forEach((d) => d.slots.forEach((sl) => {
    if (!stats[sl.subj]) return;
    stats[sl.subj].tot += sl.mins;
    stats[sl.subj].cnt++;
    if (sl.status === 'done') { stats[sl.subj].done += sl.mins; stats[sl.subj].doneCnt++; }
  }));

  document.getElementById('btn-clear-subj').classList.toggle('hidden', !ui.subjectFilter);

  const list = document.getElementById('subject-list');
  list.innerHTML = '';
  SUBJECTS.forEach((s) => {
    const st = stats[s.code];
    const pct = st.tot ? Math.round((st.done / st.tot) * 100) : 0;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `subj-card ${ui.subjectFilter === s.code ? 'active' : ''}`;
    btn.innerHTML = `
      <div class="subj-top">
        <span class="subj-name"><span class="dot" style="background:${s.color}"></span>${s.short} <span style="color:#94a3b8;font-weight:400">(${s.credits}TC)</span></span>
        <span class="tabular" style="font-weight:700; color:${s.color}">${pct}%</span>
      </div>
      <div class="subj-meta">
        <span>Thi ${fmtDateVN(s.examDate)} · ${s.shift} · ${s.format}</span>
        <span class="tabular">${fmtHours(st.done)}/${fmtHours(st.tot)}</span>
      </div>
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%; background:${s.color}"></div></div>
      ${s.alert ? `<div style="margin-top:5px; font-size:10.5px; color:#fbbf24">★ ${s.alert}</div>` : ''}
    `;
    btn.addEventListener('click', () => {
      ui.subjectFilter = ui.subjectFilter === s.code ? null : s.code;
      renderAll();
    });
    list.appendChild(btn);
  });
}

function renderRightPanel() {
  const tabsEl = document.getElementById('week-tabs');
  const tabs = [
    { key: 'week1', label: 'T1 (16–22/11)' },
    { key: 'week2', label: 'T2 (23–29/11)' },
    { key: 'week3', label: 'T3 (30/11–06/12)' },
    { key: 'week4', label: 'T4 (07–13/12)' },
    { key: 'all', label: 'Cả 4 tuần' },
    { key: 'exams', label: 'Lịch thi' },
  ];
  tabsEl.innerHTML = '';
  tabs.forEach((t) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `btn ${ui.activeTab === t.key ? 'active' : ''}`;
    b.style.padding = '4px 8px';
    b.style.fontSize = '11.5px';
    b.textContent = t.label;
    b.addEventListener('click', () => {
      ui.activeTab = t.key;
      if (t.key.startsWith('week')) scene3d.flyToPreset(`w${t.key.slice(4)}`);
      else if (t.key === 'exams') scene3d.flyToPreset('exams');
      else scene3d.flyToPreset('overview');
      renderRightPanel();
    });
    tabsEl.appendChild(b);
  });

  const container = document.getElementById('schedule-list');
  container.innerHTML = '';

  if (ui.activeTab === 'exams') {
    state.examChecklist.forEach((item) => {
      const sub = SUBJ_MAP[item.code];
      const row = document.createElement('label');
      row.className = `day-card slot-row ${item.done ? 'done' : ''}`;
      row.style.cursor = 'pointer';
      row.innerHTML = `
        <input type="checkbox" class="slot-check" ${item.done ? 'checked' : ''} />
        <div class="slot-body">
          <div class="slot-meta">
            <span class="slot-subj"><span class="dot" style="background:${sub.color}"></span>${sub.name}</span>
            <span>${sub.credits}TC · ${sub.format}</span>
          </div>
          <div class="slot-task">${escapeHtml(item.label)}</div>
        </div>
      `;
      row.querySelector('input').addEventListener('change', (e) => {
        item.done = e.target.checked;
        saveState();
        renderRightPanel();
      });
      container.appendChild(row);
    });
    return;
  }

  const todayISO = getTodayISO();
  const q = ui.search.trim().toLowerCase();
  const weekNum = ui.activeTab.startsWith('week') ? Number(ui.activeTab.slice(4)) : null;

  let renderedDays = 0;
  state.days.forEach((day) => {
    if (weekNum && day.week !== weekNum) return;
    const matchedSlots = day.slots.filter((sl) => {
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
    if (!matchedSlots.length) return;
    renderedDays++;

    const totalM = day.slots.reduce((a, b) => a + b.mins, 0);
    const doneM = day.slots.filter((s) => s.status === 'done').reduce((a, b) => a + b.mins, 0);
    const isToday = day.date === todayISO;

    const card = document.createElement('div');
    card.className = `day-card ${isToday ? 'is-today' : ''}`;
    card.id = `day-${day.date}`;
    card.innerHTML = `
      <div class="day-head">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          <strong>${day.wd} (${fmtDateVN(day.date)})</strong>
          ${isToday ? '<span class="badge badge-today">Hôm nay</span>' : ''}
          ${day.mwfBusy ? '<span class="badge badge-warn">Bận 20–22h</span>' : '<span class="badge">Đệm +45p</span>'}
        </div>
        <span class="tabular" style="color:#94a3b8">${fmtHours(doneM)} / ${fmtHours(totalM)}</span>
      </div>
    `;

    matchedSlots.forEach((sl) => {
      const sub = SUBJ_MAP[sl.subj];
      const row = document.createElement('div');
      row.id = `slot-${sl.id}`;
      row.className = `slot-row ${sl.status === 'done' ? 'done' : ''} ${ui.selectedSlotId === sl.id ? 'selected' : ''}`;
      row.innerHTML = `
        <input type="checkbox" class="slot-check" ${sl.status === 'done' ? 'checked' : ''} />
        <div class="slot-body">
          <div class="slot-meta">
            <span class="tabular">${sl.period} ${sl.time} (${fmtHours(sl.mins)})</span>
            <span class="slot-subj"><span class="dot" style="background:${sub.color}"></span>${sub.short}</span>
            ${sl.status === 'doing' ? '<span class="badge badge-warn">Đang học</span>' : ''}
          </div>
          <div class="slot-task">${escapeHtml(sl.task)}</div>
          ${sl.note ? `<div class="slot-note">Ghi chú: ${escapeHtml(sl.note)}</div>` : ''}
          <div class="slot-actions">
            <button type="button" class="mini-btn btn-focus">Soi 3D</button>
            ${!day.mwfBusy && sl.period === 'Tối' ? `<button type="button" class="mini-btn btn-bonus">${sl.mins > 135 ? 'Bỏ +45p' : '+45p (tới 23h)'}</button>` : ''}
            <button type="button" class="mini-btn btn-edit">Sửa / Ghi chú</button>
          </div>
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
        renderRightPanel();
      });

      row.querySelector('.btn-focus').addEventListener('click', () => {
        ui.selectedSlotId = sl.id;
        scene3d.focusSlot(sl.id);
        scene3d.syncState(state.days, ui.subjectFilter);
        renderRightPanel();
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

    container.appendChild(card);
  });

  if (renderedDays === 0) {
    container.innerHTML = `<div style="text-align:center; padding:24px; color:#94a3b8">Không có buổi học nào khớp bộ lọc.</div>`;
  }
}

// Modal editing
function openModal(day, sl) {
  ui.editingSlotId = sl.id;
  document.getElementById('modal-meta').textContent = `${day.wd} (${fmtDateVN(day.date)}) · ${sl.period} ${sl.time}`;
  const sel = document.getElementById('modal-subj');
  sel.innerHTML = SUBJECTS.map((s) => `<option value="${s.code}">${s.short} — ${s.name} (${s.credits}TC)</option>`).join('');
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
  const prevStatus = found.sl.status;
  found.sl.subj = document.getElementById('modal-subj').value;
  found.sl.task = document.getElementById('modal-task').value.trim() || found.sl.task;
  const mins = parseInt(document.getElementById('modal-mins').value, 10);
  if (!Number.isNaN(mins) && mins >= 15 && mins <= 300) found.sl.mins = mins;
  found.sl.status = document.getElementById('modal-status').value;
  found.sl.note = document.getElementById('modal-note').value.trim();
  if (prevStatus !== 'done' && found.sl.status === 'done') scene3d.celebrateSlot(found.sl.id);
  saveState();
  closeModal();
  renderAll();
});

// UI controls
document.getElementById('btn-clear-subj').addEventListener('click', () => {
  ui.subjectFilter = null;
  renderAll();
});

document.getElementById('filter-status').addEventListener('change', (e) => {
  ui.statusFilter = e.target.value;
  renderRightPanel();
});

document.getElementById('filter-search').addEventListener('input', (e) => {
  ui.search = e.target.value;
  renderRightPanel();
});

document.getElementById('toggle-left').addEventListener('click', (e) => {
  const el = document.getElementById('panel-left');
  el.classList.toggle('collapsed');
  e.target.classList.toggle('active', !el.classList.contains('collapsed'));
});

document.getElementById('toggle-right').addEventListener('click', (e) => {
  const el = document.getElementById('panel-right');
  el.classList.toggle('collapsed');
  e.target.classList.toggle('active', !el.classList.contains('collapsed'));
});

document.querySelectorAll('[data-cam]').forEach((btn) => {
  btn.addEventListener('click', () => scene3d.flyToPreset(btn.dataset.cam));
});

document.getElementById('btn-autorotate').addEventListener('click', (e) => {
  ui.autoRotate = !ui.autoRotate;
  scene3d.setAutoRotate(ui.autoRotate);
  e.target.classList.toggle('active', ui.autoRotate);
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
  scene3d.flyToPreset(`w${match.week}`);
  document.getElementById('panel-right').classList.remove('collapsed');
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
  a.download = `tien-do-on-thi-3d-${getTodayISO()}.json`;
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
        saveState('Đã nhập tiến độ từ JSON');
        renderAll();
      }
    } catch {
      document.getElementById('save-status').textContent = 'File JSON lỗi';
    }
  };
  r.readAsText(file);
  e.target.value = '';
});

document.getElementById('btn-reset').addEventListener('click', (e) => {
  if (!ui.resetArmed) {
    ui.resetArmed = true;
    e.target.textContent = 'Xác nhận xóa?';
    setTimeout(() => { ui.resetArmed = false; e.target.textContent = 'Đặt lại'; }, 3500);
    return;
  }
  ui.resetArmed = false;
  e.target.textContent = 'Đặt lại';
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  state = loadState();
  saveState('Đã khôi phục mặc định');
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
  clearInterval(timerInt); timerInt = null; timerBtn.textContent = 'Học';
  timerSec = parseInt(e.target.value, 10) * 60;
  drawTimer();
});

timerBtn.addEventListener('click', () => {
  if (timerInt) {
    clearInterval(timerInt); timerInt = null; timerBtn.textContent = 'Tiếp';
  } else {
    timerBtn.textContent = 'Tạm dừng';
    timerInt = setInterval(() => {
      if (timerSec > 0) { timerSec--; drawTimer(); }
      else { clearInterval(timerInt); timerInt = null; timerBtn.textContent = 'Xong!'; }
    }, 1000);
  }
});

document.getElementById('timer-reset').addEventListener('click', () => {
  clearInterval(timerInt); timerInt = null; timerBtn.textContent = 'Học';
  timerSec = parseInt(document.getElementById('timer-preset').value, 10) * 60;
  drawTimer();
});

// Initial tab auto-select
const todayObj = state.days.find((d) => d.date === getTodayISO());
if (todayObj) ui.activeTab = `week${todayObj.week}`;

// Keep side panels aligned below top HUD at any viewport width
const hudEl = document.querySelector('.hud-top');
if (hudEl && typeof ResizeObserver !== 'undefined') {
  const syncHudTop = () => {
    document.documentElement.style.setProperty('--hud-h', `${hudEl.offsetHeight + 22}px`);
  };
  new ResizeObserver(syncHudTop).observe(hudEl);
  syncHudTop();
}

renderAll();
