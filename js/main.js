/* main.js — tab navigation, gallery, 3D hero */

// ── Palette ───────────────────────────────────────────────────
// La paleta se fija con la clase de <body> en index.html (palette-a/b/c).

// ── Tab navigation ────────────────────────────────────────────
function switchTab(name, scroll) {
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-selected', 'false');
  });

  const pane = document.getElementById('tab-' + name);
  const btn  = document.querySelector(`.tab-btn[data-tab="${name}"]`);

  if (pane) pane.classList.add('active');
  if (btn)  { btn.classList.add('active'); btn.setAttribute('aria-selected', 'true'); }

  if (scroll !== false) {
    const tabBar = document.getElementById('mainTabs');
    if (tabBar) {
      const y = tabBar.getBoundingClientRect().top + window.scrollY - 2;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }

  history.replaceState(null, '', '#' + name);
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// "goto" buttons on the home tab
document.querySelectorAll('.goto-btn[data-goto]').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.goto));
});

// Scroll-hint in hero → open tab bar
document.querySelector('.hero-scroll-hint')?.addEventListener('click', () => {
  document.getElementById('mainTabs')?.scrollIntoView({ behavior: 'smooth' });
});

// Hash-based deep-linking on load
(function initFromHash() {
  const hash = window.location.hash.replace('#', '');
  const validTabs = ['home', 'publications', 'projects', 'gallery', 'talks', 'internships', 'contact'];
  if (hash && validTabs.includes(hash)) {
    switchTab(hash, false);
  }
})();

// ── Hero canvas — animated Möbius circles ─────────────────────
(function initHeroCanvas() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, circles;

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
    buildCircles();
  }

  function buildCircles() {
    circles = [];
    const count = Math.floor((W * H) / 18000);
    for (let i = 0; i < count; i++) {
      circles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 20 + Math.random() * 80,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  let t = 0;
  function draw() {
    ctx.clearRect(0, 0, W, H);
    t += 0.003;

    const style = getComputedStyle(document.body);
    const c1 = style.getPropertyValue('--accent-1').trim() || '#6b3fa0';
    const c2 = style.getPropertyValue('--accent-2').trim() || '#a78bda';

    circles.forEach((c, i) => {
      c.x += c.vx;
      c.y += c.vy;
      if (c.x < -c.r) c.x = W + c.r;
      if (c.x > W + c.r) c.x = -c.r;
      if (c.y < -c.r) c.y = H + c.r;
      if (c.y > H + c.r) c.y = -c.r;

      const pulse = 0.9 + 0.1 * Math.sin(t * 1.2 + c.phase);
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r * pulse, 0, Math.PI * 2);
      ctx.strokeStyle = i % 2 === 0 ? c1 : c2;
      ctx.globalAlpha = 0.17 + 0.06 * Math.sin(t + c.phase);
      ctx.lineWidth = 0.8;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r * 0.5 * pulse, 0, Math.PI * 2);
      ctx.globalAlpha = 0.09;
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize();
  draw();
})();

// Three.js se carga como módulo (después de este script): esperar a 'three-ready'
function onThreeReady(cb) {
  if (window.THREE) cb();
  else window.addEventListener('three-ready', cb, { once: true });
}

// ── Hero: floating chakana ────────────────────────────────────
onThreeReady(function initChakana() {
  const canvas = document.getElementById('heroChakana');
  if (!canvas) return;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0); // fondo 100 % transparente

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.z = 4;

  function getColor(name) {
    return parseInt(getComputedStyle(document.body).getPropertyValue(name).trim().replace('#', ''), 16);
  }

  const shape = new THREE.Shape();
  const s = 1.0, t = 0.38;
  shape.moveTo(-t, s + t);
  shape.lineTo( t, s + t);
  shape.lineTo( t, s);
  shape.lineTo( s, s);
  shape.lineTo( s, t);
  shape.lineTo( s + t, t);
  shape.lineTo( s + t,-t);
  shape.lineTo( s,-t);
  shape.lineTo( s,-s);
  shape.lineTo( t,-s);
  shape.lineTo( t,-(s + t));
  shape.lineTo(-t,-(s + t));
  shape.lineTo(-t,-s);
  shape.lineTo(-s,-s);
  shape.lineTo(-s,-t);
  shape.lineTo(-(s + t),-t);
  shape.lineTo(-(s + t), t);
  shape.lineTo(-s, t);
  shape.lineTo(-s, s);
  shape.lineTo(-t, s);
  shape.lineTo(-t, s + t);

  const hole = new THREE.Path();
  const h = 0.22;
  hole.moveTo(-h,-h); hole.lineTo(h,-h); hole.lineTo(h,h); hole.lineTo(-h,h); hole.lineTo(-h,-h);
  shape.holes.push(hole);

  const extrudeSettings = { depth: 0.28, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2 };
  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geo.center();

  const mat = new THREE.MeshPhongMaterial({
    color: getColor('--accent-2'),
    emissive: new THREE.Color().setHex(getColor('--accent-1')).multiplyScalar(0.2),
    shininess: 80,
    side: THREE.DoubleSide,
  });
  const chakana = new THREE.Mesh(geo, mat);
  scene.add(chakana);

  const edges  = new THREE.EdgesGeometry(geo, 20);
  const lineMat = new THREE.LineBasicMaterial({ color: getColor('--accent-1'), transparent: true, opacity: 0.6 });
  chakana.add(new THREE.LineSegments(edges, lineMat));

  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(3, 5, 4);
  scene.add(dir);

  function resize() {
    const sz = canvas.clientWidth;
    renderer.setSize(sz, sz, false);
  }

  // Tilt fijo hacia el espectador — el CSS anima el float, Three.js no mueve nada
  chakana.rotation.x =  0.30;
  chakana.rotation.y = -0.28;
  chakana.rotation.z =  0.00;

  function animate() {
    requestAnimationFrame(animate);
    // Solo color — sin posición ni rotación dinámica
    mat.color.setHex(getColor('--accent-2'));
    lineMat.color.setHex(getColor('--accent-1'));
    renderer.render(scene, camera);
  }

  window.addEventListener('resize', resize);
  resize();
  animate();
});

// ── Gallery loader ────────────────────────────────────────────
async function loadGallery() {
  const grid = document.getElementById('galleryGrid');
  if (!grid) return;

  let meshes;
  try {
    const res = await fetch('gallery-config.json');
    meshes = await res.json();
  } catch (e) {
    // Abierto con doble clic (file://): el navegador bloquea fetch → hace falta un servidor local
    grid.innerHTML = location.protocol === 'file:'
      ? '<p class="gallery-loading">The 3D gallery needs a web server. Run <code>python3 -m http.server</code> in the site folder and open http://localhost:8000</p>'
      : '<p class="gallery-loading">Could not load gallery config.</p>';
    return;
  }

  grid.innerHTML = '';
  galleryEntries = meshes;

  meshes.forEach((mesh, i) => {
    const card = document.createElement('article');
    card.className = 'gallery-card';
    const tags = (mesh.tags || []).map(t => `<span class="gallery-tag">${t}</span>`).join('');
    const models = galleryModels(mesh);
    const isPlaceholder = mesh.placeholder === true || models.length === 0;
    const countLabel = models.length > 1 ? ` (${models.length} models)` : '';

    card.innerHTML = `
      <div class="gallery-thumb" id="thumb-${mesh.id}">
        ${mesh.thumb
          ? `<img src="${mesh.thumb}" alt="${mesh.title}" loading="lazy">`
          : `<div class="gallery-thumb-placeholder">${isPlaceholder ? 'Coming Soon' : 'Preview'}</div>`}
      </div>
      <div class="gallery-info">
        <h3>${mesh.title}</h3>
        <p>${mesh.description}</p>
        <div class="gallery-tags">${tags}</div>
        <button class="btn-view3d"
                data-index="${i}"
                ${isPlaceholder ? 'disabled' : ''}>
          ${isPlaceholder ? 'Coming Soon' : 'View in 3D' + countLabel}
        </button>
      </div>`;
    grid.appendChild(card);
  });

  grid.querySelectorAll('.btn-view3d:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => openViewer(galleryEntries[+btn.dataset.index]));
  });
}

// Cada entrada puede tener "models": [{file, title}] (varios, con flechas) o un solo "file"
let galleryEntries = [];
function galleryModels(entry) {
  if (Array.isArray(entry.models)) return entry.models;
  return entry.file ? [{ file: entry.file }] : [];
}

loadGallery();

// ── Viewer open/close ─────────────────────────────────────────
let viewerModels = [], viewerIndex = 0, viewerEntryTitle = '';

function openViewer(entry) {
  viewerModels = galleryModels(entry);
  viewerIndex = 0;
  viewerEntryTitle = entry.title;
  const modal = document.getElementById('viewerModal');
  modal.removeAttribute('hidden');
  document.body.style.overflow = 'hidden';
  const several = viewerModels.length > 1;
  document.getElementById('btnPrevModel').hidden = !several;
  document.getElementById('btnNextModel').hidden = !several;
  showViewerModel();
}

// Muestra el modelo viewerIndex: título, pie "i / n · nombre" y carga
function showViewerModel() {
  const model = viewerModels[viewerIndex];
  document.getElementById('viewerTitle').textContent = viewerEntryTitle;
  const caption = document.getElementById('viewerCaption');
  const parts = [];
  if (viewerModels.length > 1) parts.push(`${viewerIndex + 1} / ${viewerModels.length}`);
  if (model.title) parts.push(model.title);
  caption.textContent = parts.join(' · ');
  caption.hidden = parts.length === 0;
  onThreeReady(() => window.initViewer && window.initViewer(model.file, model));
}

function stepViewerModel(delta) {
  if (viewerModels.length < 2) return;
  viewerIndex = (viewerIndex + delta + viewerModels.length) % viewerModels.length;
  showViewerModel();
}

function closeViewer() {
  document.getElementById('viewerModal').setAttribute('hidden', '');
  document.body.style.overflow = '';
  if (window.disposeViewer) window.disposeViewer();
}

document.getElementById('btnClose')?.addEventListener('click', closeViewer);
document.getElementById('viewerBackdrop')?.addEventListener('click', closeViewer);
document.addEventListener('keydown', e => {
  if (document.getElementById('viewerModal').hasAttribute('hidden')) return;
  if (e.key === 'Escape') closeViewer();
  if (e.key === 'ArrowLeft')  stepViewerModel(-1);
  if (e.key === 'ArrowRight') stepViewerModel(+1);
});
document.getElementById('btnPrevModel')?.addEventListener('click', () => stepViewerModel(-1));
document.getElementById('btnNextModel')?.addEventListener('click', () => stepViewerModel(+1));
document.getElementById('btnWireframe')?.addEventListener('click', () => { if (window.toggleWireframe) window.toggleWireframe(); });
document.getElementById('btnReset')?.addEventListener('click', () => { if (window.resetCamera) window.resetCamera(); });
