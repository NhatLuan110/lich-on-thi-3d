import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SUBJECTS, SUBJ_MAP } from './data.js';

function makeRoundedBarGeo(w, h, d, radius = 0.08) {
  const hw = w / 2 - radius;
  const hd = d / 2 - radius;
  const shape = new THREE.Shape();
  shape.moveTo(-hw, -d / 2);
  shape.lineTo(hw, -d / 2);
  shape.quadraticCurveTo(w / 2, -d / 2, w / 2, -hd);
  shape.lineTo(w / 2, hd);
  shape.quadraticCurveTo(w / 2, d / 2, hw, d / 2);
  shape.lineTo(-hw, d / 2);
  shape.quadraticCurveTo(-w / 2, d / 2, -w / 2, hd);
  shape.lineTo(-w / 2, -hd);
  shape.quadraticCurveTo(-w / 2, -d / 2, -hw, -d / 2);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.1, h - 0.06),
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 2,
  });
  // Rotate so extrusion goes up (+Y)
  geo.rotateX(-Math.PI / 2);
  return geo;
}

export class StudyScene3D {
  constructor(container, canvas, callbacks) {
    this.container = container;
    this.canvas = canvas;
    this.cb = callbacks;
    this.mode = 'matrix'; // 'matrix' | 'towers'

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0b0c10');

    const w = container.clientWidth || 600;
    const h = container.clientHeight || 500;
    this.camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 150);
    this.camera.position.set(13, 15.5, 19.5);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(w, h, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.maxPolarAngle = Math.PI * 0.46;
    this.controls.minDistance = 7;
    this.controls.maxDistance = 40;
    this.controls.target.set(0, 0.8, 0);

    this.camGoalPos = null;
    this.camGoalTarget = null;
    this.controls.addEventListener('start', () => {
      this.camGoalPos = null;
      this.camGoalTarget = null;
    });

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2(-99, -99);
    this.hovered = null;
    this.selectedSlotId = null;

    this.matrixGroup = new THREE.Group();
    this.towersGroup = new THREE.Group();
    this.scene.add(this.matrixGroup);
    this.scene.add(this.towersGroup);

    this.slotMeshes = new Map();
    this.towerMeshes = new Map();
    this.pickables = [];
    this.bursts = [];
    this.clock = new THREE.Clock();

    this._setupStudioLights();
    this._bindEvents();
    this._animate();
  }

  _setupStudioLights() {
    const hemi = new THREE.HemisphereLight('#e2e8f0', '#09090b', 0.9);
    this.scene.add(hemi);

    const key = new THREE.DirectionalLight('#ffffff', 1.45);
    key.position.set(12, 22, 14);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 2;
    key.shadow.camera.far = 55;
    key.shadow.camera.left = -18;
    key.shadow.camera.right = 18;
    key.shadow.camera.top = 18;
    key.shadow.camera.bottom = -18;
    key.shadow.bias = -0.0005;
    this.scene.add(key);

    const fill = new THREE.DirectionalLight('#93c5fd', 0.45);
    fill.position.set(-14, 10, -10);
    this.scene.add(fill);

    // Clean matte stage floor (no loud grid lines)
    const stage = new THREE.Mesh(
      new THREE.CylinderGeometry(20, 20, 0.3, 64),
      new THREE.MeshStandardMaterial({ color: '#101218', roughness: 0.92, metalness: 0.06 })
    );
    stage.position.y = -0.18;
    stage.receiveShadow = true;
    this.scene.add(stage);

    const rim = new THREE.Mesh(
      new THREE.RingGeometry(19.95, 20.02, 64),
      new THREE.MeshBasicMaterial({ color: '#27272a', side: THREE.DoubleSide })
    );
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = -0.02;
    this.scene.add(rim);
  }

  _makeLabel(text, w, h, fg = '#a1a1aa', fontSize = 26) {
    const cvs = document.createElement('canvas');
    cvs.width = 256;
    cvs.height = Math.round(256 * (h / w));
    const ctx = cvs.getContext('2d');
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    ctx.fillStyle = fg;
    ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lines = text.split('\n');
    const step = fontSize * 1.25;
    const startY = cvs.height / 2 - ((lines.length - 1) * step) / 2;
    lines.forEach((l, i) => ctx.fillText(l, cvs.width / 2, startY + i * step));

    const tex = new THREE.CanvasTexture(cvs);
    tex.anisotropy = 4;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.rotation.x = -Math.PI / 2;
    return mesh;
  }

  buildBoard(days, todayISO) {
    this.matrixGroup.clear();
    this.towersGroup.clear();
    this.slotMeshes.clear();
    this.towerMeshes.clear();
    this.pickables = [];

    // 1) BUILD MATRIX GROUP (4 weeks x 7 days, clean minimal rounded tiles)
    const dx = 2.65;
    const dz = 3.75;

    const wdNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    wdNames.forEach((wd, col) => {
      const lbl = this._makeLabel(wd, 1.4, 0.5, '#71717a', 34);
      lbl.position.set((col - 3) * dx, 0.01, -7.8);
      this.matrixGroup.add(lbl);
    });

    ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4'].forEach((wLabel, row) => {
      const lbl = this._makeLabel(wLabel, 2.0, 0.6, '#71717a', 30);
      lbl.position.set(-10.6, 0.01, (row - 1.5) * dz);
      this.matrixGroup.add(lbl);
    });

    const periodX = { 'Sáng': -0.66, 'Chiều': 0, 'Tối': 0.66 };
    const slotGeoCache = new Map();
    const getGeo = (h) => {
      const key = Math.round(h * 20);
      if (!slotGeoCache.has(key)) slotGeoCache.set(key, makeRoundedBarGeo(0.54, h, 2.15, 0.08));
      return slotGeoCache.get(key);
    };

    const padGeo = makeRoundedBarGeo(2.3, 0.12, 2.95, 0.14);

    days.forEach((day, idx) => {
      const col = idx % 7;
      const row = Math.floor(idx / 7);
      const x = (col - 3) * dx;
      const z = (row - 1.5) * dz;
      const isToday = day.date === todayISO;

      const pad = new THREE.Mesh(
        padGeo,
        new THREE.MeshStandardMaterial({
          color: isToday ? '#172554' : '#18181f',
          roughness: 0.78,
          metalness: 0.1,
        })
      );
      pad.position.set(x, 0, z);
      pad.receiveShadow = true;
      pad.castShadow = true;
      this.matrixGroup.add(pad);

      const [, mm, dd] = day.date.split('-');
      const dLbl = this._makeLabel(`${dd}/${mm}`, 1.3, 0.36, isToday ? '#93c5fd' : '#71717a', 28);
      dLbl.position.set(x, 0.13, z + 1.27);
      this.matrixGroup.add(dLbl);

      if (day.mwfBusy) {
        const dot = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.08, 0.05, 16),
          new THREE.MeshStandardMaterial({ color: '#f59e0b', emissive: '#f59e0b', emissiveIntensity: 0.5 })
        );
        dot.position.set(x + 0.85, 0.13, z + 1.25);
        this.matrixGroup.add(dot);
      }

      day.slots.forEach((sl) => {
        const sub = SUBJ_MAP[sl.subj];
        const barH = Math.max(0.35, (sl.mins / 145) * 1.45);

        const mat = new THREE.MeshStandardMaterial({
          color: '#272730',
          emissive: '#000000',
          emissiveIntensity: 0,
          roughness: 0.35,
          metalness: 0.15,
        });
        const bar = new THREE.Mesh(getGeo(barH), mat);
        bar.position.set(x + periodX[sl.period], 0.12, z - 0.12);
        bar.castShadow = true;
        bar.receiveShadow = true;
        bar.userData = { type: 'slot', slotId: sl.id, baseH: barH };

        // Crisp colored cap strip on top of every bar so you immediately recognize the subject without harsh glow
        const cap = new THREE.Mesh(
          makeRoundedBarGeo(0.46, 0.09, 2.02, 0.06),
          new THREE.MeshStandardMaterial({
            color: sub.color,
            emissive: sub.color,
            emissiveIntensity: 0.25,
            roughness: 0.3,
          })
        );
        cap.position.y = barH;
        bar.add(cap);

        this.matrixGroup.add(bar);
        this.pickables.push(bar);
        this.slotMeshes.set(sl.id, { bar, cap, mat, slot: sl, day });
      });
    });

    // 2) BUILD SUBJECT TOWERS GROUP (8 sleek frosted capsules)
    const tSpacing = 2.4;
    const tStart = -((SUBJECTS.length - 1) * tSpacing) / 2;

    SUBJECTS.forEach((sub, i) => {
      const tx = tStart + i * tSpacing;
      const g = new THREE.Group();
      g.position.set(tx, 0, 0);

      const maxH = 2.4 + sub.credits * 0.85;

      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.88, 0.94, 0.18, 32),
        new THREE.MeshStandardMaterial({ color: '#18181f', roughness: 0.7, metalness: 0.15 })
      );
      base.position.y = 0.09;
      base.receiveShadow = true;
      g.add(base);

      const glassShell = new THREE.Mesh(
        new THREE.CylinderGeometry(0.68, 0.68, maxH, 32),
        new THREE.MeshPhysicalMaterial({
          color: '#ffffff',
          transparent: true,
          opacity: 0.11,
          roughness: 0.15,
          metalness: 0,
        })
      );
      glassShell.position.y = 0.18 + maxH / 2;
      g.add(glassShell);

      const coreMat = new THREE.MeshStandardMaterial({
        color: sub.color,
        emissive: sub.color,
        emissiveIntensity: 0.32,
        roughness: 0.25,
        metalness: 0.2,
      });
      const core = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 1, 32), coreMat);
      core.position.y = 0.18;
      core.castShadow = true;
      core.userData = { type: 'exam', code: sub.code };
      g.add(core);

      const [, mm, dd] = sub.examDate.split('-');
      const lbl = this._makeLabel(`${sub.short}\n${dd}/${mm}`, 2.1, 0.85, sub.color, 27);
      lbl.position.set(0, 0.02, 1.55);
      g.add(lbl);

      this.towersGroup.add(g);
      this.pickables.push(core);
      this.towerMeshes.set(sub.code, { core, coreMat, maxH, sub });
    });

    this.setMode(this.mode, false);
  }

  setMode(mode, animateCamera = true) {
    this.mode = mode;
    this.matrixGroup.visible = mode === 'matrix';
    this.towersGroup.visible = mode === 'towers';
    if (animateCamera) {
      if (mode === 'matrix') {
        this.camGoalPos = new THREE.Vector3(11.5, 14.5, 18.0);
        this.camGoalTarget = new THREE.Vector3(0, 0.6, 0);
      } else {
        this.camGoalPos = new THREE.Vector3(0, 6.2, 16.5);
        this.camGoalTarget = new THREE.Vector3(0, 2.2, 0);
      }
    }
  }

  syncState(days, subjectFilter) {
    const subjTotals = {};
    const subjDone = {};
    SUBJECTS.forEach((s) => { subjTotals[s.code] = 0; subjDone[s.code] = 0; });

    days.forEach((day) => {
      day.slots.forEach((sl) => {
        subjTotals[sl.subj] = (subjTotals[sl.subj] || 0) + sl.mins;
        if (sl.status === 'done') subjDone[sl.subj] = (subjDone[sl.subj] || 0) + sl.mins;

        const entry = this.slotMeshes.get(sl.id);
        if (!entry) return;
        const sub = SUBJ_MAP[sl.subj];
        const dimmed = subjectFilter && sl.subj !== subjectFilter;
        const selected = sl.id === this.selectedSlotId;

        entry.cap.material.color.set(sub.color);
        entry.cap.material.emissive.set(sub.color);

        // Scale height smoothly based on mins
        const targetH = Math.max(0.35, (sl.mins / 145) * 1.45);
        entry.bar.scale.y = targetH / entry.bar.userData.baseH;

        if (dimmed) {
          entry.mat.color.set('#141419');
          entry.mat.emissive.set('#000000');
          entry.mat.emissiveIntensity = 0;
          entry.cap.material.emissiveIntensity = 0.04;
          entry.cap.material.opacity = 0.25;
          entry.cap.material.transparent = true;
        } else if (sl.status === 'done') {
          entry.mat.color.set(sub.color);
          entry.mat.emissive.set(sub.color);
          entry.mat.emissiveIntensity = selected ? 0.45 : 0.22;
          entry.cap.material.emissiveIntensity = 0.55;
          entry.cap.material.opacity = 1;
        } else if (sl.status === 'doing') {
          entry.mat.color.set('#312e4a');
          entry.mat.emissive.set(sub.color);
          entry.mat.emissiveIntensity = 0.18;
          entry.cap.material.emissiveIntensity = 0.65;
          entry.cap.material.opacity = 1;
        } else {
          entry.mat.color.set(selected ? '#2e3446' : '#22232c');
          entry.mat.emissive.set('#000000');
          entry.mat.emissiveIntensity = 0;
          entry.cap.material.emissiveIntensity = selected ? 0.55 : 0.22;
          entry.cap.material.opacity = 1;
        }
      });
    });

    SUBJECTS.forEach((sub) => {
      const t = this.towerMeshes.get(sub.code);
      if (!t) return;
      const tot = subjTotals[sub.code] || 1;
      const pct = Math.max(0.06, Math.min(1, (subjDone[sub.code] || 0) / tot));
      const h = t.maxH * pct;
      t.core.scale.y = h;
      t.core.position.y = 0.18 + h / 2;
      const dimmed = subjectFilter && sub.code !== subjectFilter;
      t.coreMat.transparent = true;
      t.coreMat.opacity = dimmed ? 0.22 : 0.92;
    });
  }

  celebrateSlot(slotId) {
    const entry = this.slotMeshes.get(slotId);
    if (!entry || this.mode !== 'matrix') return;
    const sub = SUBJ_MAP[entry.slot.subj];
    const origin = entry.bar.position.clone();
    origin.y += entry.bar.userData.baseH * entry.bar.scale.y + 0.15;

    const count = 24;
    const pos = new Float32Array(count * 3);
    const vel = [];
    for (let i = 0; i < count; i++) {
      pos[i * 3] = origin.x;
      pos[i * 3 + 1] = origin.y;
      pos[i * 3 + 2] = origin.z;
      vel.push(new THREE.Vector3((Math.random() - 0.5) * 3.2, 2.0 + Math.random() * 2.8, (Math.random() - 0.5) * 3.2));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: sub.color, size: 0.16, transparent: true, opacity: 1 });
    const pts = new THREE.Points(geo, mat);
    this.scene.add(pts);
    this.bursts.push({ pts, vel, life: 0.9 });
  }

  focusWeek(weekNum) {
    if (this.mode !== 'matrix') this.setMode('matrix', false);
    if (!weekNum) {
      this.camGoalPos = new THREE.Vector3(11.5, 14.5, 18.0);
      this.camGoalTarget = new THREE.Vector3(0, 0.6, 0);
      return;
    }
    const z = (weekNum - 2.5) * 3.75;
    this.camGoalTarget = new THREE.Vector3(0, 0.5, z);
    this.camGoalPos = new THREE.Vector3(5.5, 8.2, z + 9.2);
  }

  focusSlot(slotId) {
    this.selectedSlotId = slotId;
    if (this.mode !== 'matrix') return;
    const entry = this.slotMeshes.get(slotId);
    if (!entry) return;
    const p = entry.bar.position;
    this.camGoalTarget = new THREE.Vector3(p.x, 0.8, p.z);
    this.camGoalPos = new THREE.Vector3(p.x + 3.2, 5.2, p.z + 6.0);
  }

  _bindEvents() {
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(() => this._resize()).observe(this.container);
    }
    window.addEventListener('resize', () => this._resize());

    this.canvas.addEventListener('pointermove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this._checkHover(e.clientX, e.clientY);
    });

    this.canvas.addEventListener('pointerleave', () => {
      if (this.hovered) {
        this.hovered.scale.x = 1;
        this.hovered.scale.z = 1;
        this.hovered = null;
      }
      if (this.cb.onHover) this.cb.onHover(null, 0, 0);
    });

    let down = { x: 0, y: 0 };
    this.canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
    this.canvas.addEventListener('pointerup', (e) => {
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
      const rect = this.canvas.getBoundingClientRect();
      this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const visible = this.pickables.filter((o) => {
        let cur = o;
        while (cur) { if (!cur.visible) return false; cur = cur.parent; }
        return true;
      });
      const hits = this.raycaster.intersectObjects(visible, false);
      if (hits.length > 0) {
        const ud = hits[0].object.userData;
        if (ud.type === 'slot' && this.cb.onSelectSlot) this.cb.onSelectSlot(ud.slotId);
        if (ud.type === 'exam' && this.cb.onSelectExam) this.cb.onSelectExam(ud.code);
      }
    });
  }

  _resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  _checkHover(cx, cy) {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const visible = this.pickables.filter((o) => {
      let cur = o;
      while (cur) { if (!cur.visible) return false; cur = cur.parent; }
      return true;
    });
    const hits = this.raycaster.intersectObjects(visible, false);
    const hit = hits.length > 0 ? hits[0].object : null;

    if (this.hovered && this.hovered !== hit) {
      this.hovered.scale.x = 1;
      this.hovered.scale.z = 1;
    }
    this.hovered = hit;
    if (hit) {
      hit.scale.x = 1.08;
      hit.scale.z = 1.08;
      this.canvas.style.cursor = 'pointer';
      if (this.cb.onHover) this.cb.onHover(hit.userData, cx, cy);
    } else {
      this.canvas.style.cursor = 'grab';
      if (this.cb.onHover) this.cb.onHover(null, cx, cy);
    }
  }

  _animate() {
    requestAnimationFrame(() => this._animate());
    const dt = Math.min(this.clock.getDelta(), 0.05);

    if (this.camGoalPos && this.camGoalTarget) {
      this.camera.position.lerp(this.camGoalPos, 0.09);
      this.controls.target.lerp(this.camGoalTarget, 0.09);
      if (this.camera.position.distanceTo(this.camGoalPos) < 0.08) {
        this.camGoalPos = null;
        this.camGoalTarget = null;
      }
    }

    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.life -= dt * 1.25;
      if (b.life <= 0) {
        this.scene.remove(b.pts);
        b.pts.geometry.dispose();
        b.pts.material.dispose();
        this.bursts.splice(i, 1);
        continue;
      }
      const attr = b.pts.geometry.getAttribute('position');
      for (let j = 0; j < b.vel.length; j++) {
        b.vel[j].y -= 8.0 * dt;
        attr.setXYZ(j, attr.getX(j) + b.vel[j].x * dt, attr.getY(j) + b.vel[j].y * dt, attr.getZ(j) + b.vel[j].z * dt);
      }
      attr.needsUpdate = true;
      b.pts.material.opacity = Math.max(0, b.life);
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
