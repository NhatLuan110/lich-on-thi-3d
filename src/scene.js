import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SUBJECTS, SUBJ_MAP } from './data.js';

export class StudyScene3D {
  constructor(canvas, callbacks) {
    this.canvas = canvas;
    this.cb = callbacks;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#050814');
    this.scene.fog = new THREE.FogExp2('#050814', 0.015);

    this.camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.set(0, 17.5, 25.5);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.maxPolarAngle = Math.PI * 0.47;
    this.controls.minDistance = 7;
    this.controls.maxDistance = 48;
    this.controls.target.set(0, 1.2, 1.5);
    this.controls.autoRotate = false;
    this.controls.autoRotateSpeed = 0.55;

    this.camGoalPos = null;
    this.camGoalTarget = null;
    this.controls.addEventListener('start', () => {
      this.camGoalPos = null;
      this.camGoalTarget = null;
    });

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2(-99, -99);
    this.hoveredMesh = null;
    this.selectedSlotId = null;

    this.slotMeshes = new Map();
    this.examMeshes = new Map();
    this.pickables = [];
    this.bursts = [];
    this.clock = new THREE.Clock();

    this._setupLightsAndEnv();
    this._bindEvents();
    this._animate();
  }

  _setupLightsAndEnv() {
    const hemi = new THREE.HemisphereLight('#bae6fd', '#0f172a', 1.15);
    this.scene.add(hemi);

    const dir = new THREE.DirectionalLight('#ffffff', 1.6);
    dir.position.set(14, 26, 18);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    dir.shadow.camera.near = 2;
    dir.shadow.camera.far = 70;
    dir.shadow.camera.left = -20;
    dir.shadow.camera.right = 20;
    dir.shadow.camera.top = 20;
    dir.shadow.camera.bottom = -20;
    this.scene.add(dir);

    const rim = new THREE.PointLight('#38bdf8', 1.8, 45);
    rim.position.set(-14, 10, -10);
    this.scene.add(rim);

    // Subtle platform grid
    const grid = new THREE.GridHelper(48, 48, '#1e293b', '#0f172a');
    grid.position.y = -0.02;
    this.scene.add(grid);

    const floorGeo = new THREE.PlaneGeometry(46, 36);
    const floorMat = new THREE.MeshStandardMaterial({
      color: '#070c1c',
      roughness: 0.85,
      metalness: 0.15,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -0.03, 2);
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Starfield particles
    const starCount = 550;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPos[i * 3] = (Math.random() - 0.5) * 90;
      starPos[i * 3 + 1] = 2 + Math.random() * 34;
      starPos[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: '#7dd3fc', size: 0.16, transparent: true, opacity: 0.55 });
    this.stars = new THREE.Points(starGeo, starMat);
    this.scene.add(this.stars);

    // Column Headers (T2 -> CN) and Row Labels (Tuần 1..4, THI)
    const wdLabels = ['THỨ 2', 'THỨ 3', 'THỨ 4', 'THỨ 5', 'THỨ 6', 'THỨ 7', 'CHỦ NHẬT'];
    wdLabels.forEach((lbl, idx) => {
      const x = (idx - 3) * 3.2;
      const badge = this._makeTextPlane(lbl, 2.5, 0.65, '#0f172a', '#94a3b8', 28);
      badge.position.set(x, 0.02, -10.8);
      this.scene.add(badge);
    });

    const weekLabels = [
      { text: 'TUẦN 1\n16–22/11', z: -7.5 },
      { text: 'TUẦN 2\n23–29/11', z: -2.5 },
      { text: 'TUẦN 3\n30/11–06/12', z: 2.5 },
      { text: 'TUẦN 4\n07–13/12', z: 7.5 },
      { text: 'KỲ THI\n15/12–08/01', z: 13.5 },
    ];
    weekLabels.forEach((wl) => {
      const plaque = this._makeTextPlane(wl.text, 2.7, 1.15, '#0b1122', '#38bdf8', 26);
      plaque.position.set(-13.2, 0.03, wl.z);
      this.scene.add(plaque);
    });
  }

  _makeTextPlane(text, w, h, bg, fg, fontSize = 28) {
    const cvs = document.createElement('canvas');
    cvs.width = 256;
    cvs.height = Math.round(256 * (h / w));
    const ctx = cvs.getContext('2d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, cvs.width, cvs.height);
    ctx.strokeStyle = 'rgba(56,189,248,0.35)';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, cvs.width - 4, cvs.height - 4);
    ctx.fillStyle = fg;
    ctx.font = `bold ${fontSize}px Inter, Segoe UI, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lines = text.split('\n');
    const step = fontSize * 1.25;
    const startY = cvs.height / 2 - ((lines.length - 1) * step) / 2;
    lines.forEach((line, i) => ctx.fillText(line, cvs.width / 2, startY + i * step));

    const tex = new THREE.CanvasTexture(cvs);
    tex.anisotropy = 4;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.rotation.x = -Math.PI / 2;
    return mesh;
  }

  buildBoard(days, todayISO) {
    // Clear previous dynamic meshes
    this.slotMeshes.forEach((m) => this.scene.remove(m.group));
    this.examMeshes.forEach((m) => this.scene.remove(m.group));
    this.slotMeshes.clear();
    this.examMeshes.clear();
    this.pickables = [];

    const periodOffsets = { 'Sáng': -1.05, 'Chiều': 0, 'Tối': 1.05 };

    days.forEach((day, idx) => {
      const col = idx % 7;
      const row = Math.floor(idx / 7);
      const x = (col - 3) * 3.2;
      const z = -7.5 + row * 5.0;
      const isToday = day.date === todayISO;

      // Base day pad
      const padGeo = new THREE.BoxGeometry(2.55, 0.14, 3.85);
      const padMat = new THREE.MeshStandardMaterial({
        color: isToday ? '#0c2d48' : '#0f172a',
        emissive: isToday ? '#0284c7' : '#000000',
        emissiveIntensity: isToday ? 0.35 : 0,
        roughness: 0.7,
        metalness: 0.2,
      });
      const pad = new THREE.Mesh(padGeo, padMat);
      pad.position.set(x, 0.07, z);
      pad.receiveShadow = true;
      this.scene.add(pad);

      // Day date label on front edge of pad
      const [, mm, dd] = day.date.split('-');
      const lbl = this._makeTextPlane(`${day.shortWd} ${dd}/${mm}`, 1.8, 0.42, isToday ? '#0369a1' : '#090f20', '#e2e8f0', 30);
      lbl.position.set(x, 0.145, z + 1.66);
      this.scene.add(lbl);

      // Busy MWF evening bar indicator (20h-22h busy)
      if (day.mwfBusy) {
        const busyBar = new THREE.Mesh(
          new THREE.BoxGeometry(1.95, 0.08, 0.16),
          new THREE.MeshStandardMaterial({ color: '#f59e0b', emissive: '#f59e0b', emissiveIntensity: 0.65 })
        );
        busyBar.position.set(x, 0.16, z + 0.56);
        this.scene.add(busyBar);
      }

      // 3 Session Pillars inside the day pad
      day.slots.forEach((sl) => {
        const sub = SUBJ_MAP[sl.subj];
        const group = new THREE.Group();
        const pz = z + periodOffsets[sl.period];
        group.position.set(x, 0.14, pz);

        const height = Math.max(0.9, sl.mins / 45);
        const geo = new THREE.BoxGeometry(1.92, height, 0.74);
        const mat = new THREE.MeshStandardMaterial({
          color: sub.color,
          emissive: sub.color,
          emissiveIntensity: 0.18,
          roughness: 0.3,
          metalness: 0.25,
          transparent: true,
          opacity: 0.38,
        });

        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = height / 2;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { type: 'slot', slotId: sl.id, dayDate: day.date, baseHeight: height };

        const edges = new THREE.LineSegments(
          new THREE.EdgesGeometry(geo),
          new THREE.LineBasicMaterial({ color: sub.color, transparent: true, opacity: 0.85 })
        );
        edges.position.copy(mesh.position);

        group.add(mesh);
        group.add(edges);
        this.scene.add(group);

        this.pickables.push(mesh);
        this.slotMeshes.set(sl.id, { group, mesh, edges, mat, slot: sl, day });
      });
    });

    // 8 Exam Beacons at z = 13.5
    const spacing = 2.75;
    const startX = -((SUBJECTS.length - 1) * spacing) / 2;
    SUBJECTS.forEach((sub, i) => {
      const ex = startX + i * spacing;
      const ez = 13.5;
      const group = new THREE.Group();
      group.position.set(ex, 0, ez);

      const baseRing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.95, 1.05, 0.18, 24),
        new THREE.MeshStandardMaterial({ color: '#0f172a', metalness: 0.4, roughness: 0.4 })
      );
      baseRing.position.y = 0.09;
      group.add(baseRing);

      // Ghost outer cylinder showing 100% target height
      const maxH = 1.6 + sub.credits * 0.75;
      const shell = new THREE.Mesh(
        new THREE.CylinderGeometry(0.62, 0.62, maxH, 20),
        new THREE.MeshBasicMaterial({ color: sub.color, wireframe: true, transparent: true, opacity: 0.25 })
      );
      shell.position.y = 0.18 + maxH / 2;
      group.add(shell);

      // Inner filling core
      const coreGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 20);
      const coreMat = new THREE.MeshStandardMaterial({
        color: sub.color,
        emissive: sub.color,
        emissiveIntensity: 0.55,
        roughness: 0.2,
        metalness: 0.3,
      });
      const core = new THREE.Mesh(coreGeo, coreMat);
      core.position.y = 0.18;
      core.userData = { type: 'exam', code: sub.code };
      group.add(core);

      const [, mm, dd] = sub.examDate.split('-');
      const plaque = this._makeTextPlane(`${sub.short}\n${dd}/${mm} · ${sub.shift}`, 2.35, 0.9, '#0b1122', sub.color, 25);
      plaque.position.set(0, 0.05, 1.55);
      group.add(plaque);

      this.scene.add(group);
      this.pickables.push(core);
      this.examMeshes.set(sub.code, { group, core, maxH, sub });
    });
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
        const h = Math.max(0.9, sl.mins / 45);

        // Update height if user added +45m bonus or edited duration
        const scaleY = h / entry.mesh.userData.baseHeight;
        entry.mesh.scale.y = scaleY;
        entry.mesh.position.y = h / 2;
        entry.edges.scale.y = scaleY;
        entry.edges.position.y = h / 2;

        // Update subject color if edited
        entry.mat.color.set(sub.color);
        entry.mat.emissive.set(sub.color);
        entry.edges.material.color.set(sub.color);

        const dimmed = subjectFilter && sl.subj !== subjectFilter;
        const isSelected = sl.id === this.selectedSlotId;

        if (dimmed) {
          entry.mat.opacity = 0.1;
          entry.mat.emissiveIntensity = 0.02;
          entry.edges.material.opacity = 0.15;
        } else if (sl.status === 'done') {
          entry.mat.opacity = 0.95;
          entry.mat.emissiveIntensity = isSelected ? 0.95 : 0.45;
          entry.edges.material.opacity = 1.0;
        } else if (sl.status === 'doing') {
          entry.mat.opacity = 0.72;
          entry.mat.emissiveIntensity = 0.55;
          entry.edges.material.opacity = 1.0;
        } else {
          entry.mat.opacity = isSelected ? 0.65 : 0.32;
          entry.mat.emissiveIntensity = isSelected ? 0.5 : 0.12;
          entry.edges.material.opacity = isSelected ? 1.0 : 0.75;
        }
      });
    });

    // Update exam beacons height proportional to completion
    SUBJECTS.forEach((sub) => {
      const ex = this.examMeshes.get(sub.code);
      if (!ex) return;
      const tot = subjTotals[sub.code] || 1;
      const ratio = Math.max(0.06, Math.min(1, (subjDone[sub.code] || 0) / tot));
      const h = ex.maxH * ratio;
      ex.core.scale.y = h;
      ex.core.position.y = 0.18 + h / 2;
      const dimmed = subjectFilter && sub.code !== subjectFilter;
      ex.core.material.transparent = true;
      ex.core.material.opacity = dimmed ? 0.2 : 0.95;
    });
  }

  celebrateSlot(slotId) {
    const entry = this.slotMeshes.get(slotId);
    if (!entry) return;
    const origin = entry.group.position.clone();
    origin.y += entry.mesh.position.y * 2;
    const sub = SUBJ_MAP[entry.slot.subj];
    const count = 32;
    const pos = new Float32Array(count * 3);
    const vel = [];
    for (let i = 0; i < count; i++) {
      pos[i * 3] = origin.x;
      pos[i * 3 + 1] = origin.y;
      pos[i * 3 + 2] = origin.z;
      vel.push(new THREE.Vector3((Math.random() - 0.5) * 4.5, 2.5 + Math.random() * 4.0, (Math.random() - 0.5) * 4.5));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: sub ? sub.color : '#22c55e', size: 0.22, transparent: true, opacity: 1 });
    const pts = new THREE.Points(geo, mat);
    this.scene.add(pts);
    this.bursts.push({ pts, vel, life: 1.0 });
  }

  flyToPreset(preset) {
    const map = {
      overview: { pos: [0, 17.5, 25.5], target: [0, 1.2, 1.5] },
      w1: { pos: [0, 9.5, 2.5], target: [0, 1.0, -7.5] },
      w2: { pos: [0, 9.5, 7.5], target: [0, 1.0, -2.5] },
      w3: { pos: [0, 9.5, 12.5], target: [0, 1.0, 2.5] },
      w4: { pos: [0, 9.5, 17.5], target: [0, 1.0, 7.5] },
      exams: { pos: [0, 8.0, 24.5], target: [0, 1.8, 13.5] },
    };
    const p = map[preset];
    if (!p) return;
    this.camGoalPos = new THREE.Vector3(...p.pos);
    this.camGoalTarget = new THREE.Vector3(...p.target);
  }

  focusSlot(slotId) {
    this.selectedSlotId = slotId;
    const entry = this.slotMeshes.get(slotId);
    if (!entry) return;
    const p = entry.group.position;
    this.camGoalTarget = new THREE.Vector3(p.x, 1.3, p.z);
    this.camGoalPos = new THREE.Vector3(p.x + 2.8, 6.2, p.z + 7.2);
  }

  setAutoRotate(flag) {
    this.controls.autoRotate = flag;
  }

  _bindEvents() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    this.canvas.addEventListener('pointermove', (e) => {
      this.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
      this._checkHover(e.clientX, e.clientY);
    });

    let downPos = { x: 0, y: 0 };
    this.canvas.addEventListener('pointerdown', (e) => {
      downPos = { x: e.clientX, y: e.clientY };
    });
    this.canvas.addEventListener('pointerup', (e) => {
      const dist = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
      if (dist > 6) return; // ignore drag
      this.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hits = this.raycaster.intersectObjects(this.pickables, false);
      if (hits.length > 0) {
        const ud = hits[0].object.userData;
        if (ud.type === 'slot' && this.cb.onSelectSlot) this.cb.onSelectSlot(ud.slotId);
        if (ud.type === 'exam' && this.cb.onSelectExam) this.cb.onSelectExam(ud.code);
      }
    });
  }

  _checkHover(cx, cy) {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.pickables, false);
    const hit = hits.length > 0 ? hits[0].object : null;
    if (this.hoveredMesh && this.hoveredMesh !== hit) {
      this.hoveredMesh.scale.x = 1;
      this.hoveredMesh.scale.z = 1;
    }
    this.hoveredMesh = hit;
    if (hit) {
      hit.scale.x = 1.07;
      hit.scale.z = 1.07;
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
    const elapsed = this.clock.elapsedTime;

    if (this.camGoalPos && this.camGoalTarget) {
      this.camera.position.lerp(this.camGoalPos, 0.08);
      this.controls.target.lerp(this.camGoalTarget, 0.08);
      if (this.camera.position.distanceTo(this.camGoalPos) < 0.08) {
        this.camGoalPos = null;
        this.camGoalTarget = null;
      }
    }

    // Subtle pulse for 'doing' slots
    this.slotMeshes.forEach(({ mesh, slot }) => {
      if (slot.status === 'doing') {
        mesh.material.emissiveIntensity = 0.45 + Math.sin(elapsed * 4.5) * 0.25;
      }
    });

    // Update celebration bursts
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.life -= dt * 1.1;
      if (b.life <= 0) {
        this.scene.remove(b.pts);
        b.pts.geometry.dispose();
        b.pts.material.dispose();
        this.bursts.splice(i, 1);
        continue;
      }
      const attr = b.pts.geometry.getAttribute('position');
      for (let j = 0; j < b.vel.length; j++) {
        b.vel[j].y -= 9.5 * dt;
        attr.setXYZ(
          j,
          attr.getX(j) + b.vel[j].x * dt,
          attr.getY(j) + b.vel[j].y * dt,
          attr.getZ(j) + b.vel[j].z * dt
        );
      }
      attr.needsUpdate = true;
      b.pts.material.opacity = Math.max(0, b.life);
    }

    if (this.stars) this.stars.rotation.y += dt * 0.012;
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
