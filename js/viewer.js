/* viewer.js — Three.js viewer for the gallery modal (GLB/GLTF con materiales de Blender, u OBJ) */

(function () {
  let renderer, scene, camera, controls, mesh, animId;
  let wireframeOn = false;
  let loadToken = 0; // evita que un modelo lento aparezca después de cambiar a otro

  const canvas = document.getElementById('viewerCanvas');

  function getCSSVar(name) {
    return getComputedStyle(document.body).getPropertyValue(name).trim();
  }

  function hexToInt(hex) {
    return parseInt(hex.replace('#', ''), 16);
  }

  function setLoading(on) {
    const el = document.getElementById('viewerLoading');
    if (el) el.hidden = !on;
  }

  // opts.frameIgnore: nombres de objetos o materiales que no cuentan al encuadrar la cámara
  // (p. ej. un suelo muy grande); siguen visibles
  window.initViewer = function (objFile, opts) {
    opts = opts || {};
    disposeViewer();
    wireframeOn = false;
    const token = ++loadToken;
    setLoading(true);

    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    const panel = canvas.parentElement;
    const w = panel.offsetWidth;
    const h = Math.round(w * 9 / 16);
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const bgColor = hexToInt(getCSSVar('--bg-deep')) || 0x0d0b14;
    renderer.setClearColor(bgColor);

    // Scene — entorno de luz suave para que los materiales PBR de Blender (GLB) se vean bien
    scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new THREE.RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Camera
    camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 1000);
    camera.position.set(0, 0, 3);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(5, 8, 5);
    scene.add(dir);
    const fill = new THREE.DirectionalLight(0xffffff, 0.3);
    fill.position.set(-5, -3, -5);
    scene.add(fill);

    // Orbit controls
    controls = new THREE.OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 0.1;
    controls.maxDistance = 100;

    // Cargar malla: GLB/GLTF conserva colores y materiales de Blender; OBJ usa el color de la paleta
    const accent1 = hexToInt(getCSSVar('--accent-1')) || 0x6b3fa0;
    const accent2 = hexToInt(getCSSVar('--accent-2')) || 0xa78bda;
    const isGLTF = /\.(glb|gltf)$/i.test(objFile);
    const loader = isGLTF ? new THREE.GLTFLoader() : new THREE.OBJLoader();
    if (isGLTF) loader.setMeshoptDecoder(THREE.MeshoptDecoder); // GLB comprimidos con meshopt

    loader.load(
      objFile,
      function (result) {
        if (token !== loadToken || !scene) return; // ya se cambió de modelo
        setLoading(false);
        const obj = isGLTF ? result.scene : result;

        // Center and scale (sin los objetos de opts.frameIgnore)
        const ignore = (opts.frameIgnore || []).map(n => n.replace(/\s/g, '_'));
        const isIgnored = m => {
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          return ignore.includes(m.name.replace(/\s/g, '_')) ||
                 mats.some(mt => mt && ignore.includes((mt.name || '').replace(/\s/g, '_')));
        };
        obj.updateMatrixWorld(true);
        const box = new THREE.Box3();
        obj.traverse(child => { if (child.isMesh && !isIgnored(child)) box.expandByObject(child); });
        if (box.isEmpty()) box.setFromObject(obj);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2.0 / maxDim;
        obj.scale.setScalar(scale);

        const center = new THREE.Vector3();
        box.getCenter(center);
        obj.position.sub(center.multiplyScalar(scale));

        obj.traverse(child => {
          if (child.isMesh) {
            if (!isGLTF) {
              child.material = new THREE.MeshPhongMaterial({
                color: accent1,
                emissive: new THREE.Color(accent2).multiplyScalar(0.1),
                shininess: 60,
                side: THREE.DoubleSide,
              });
            } else {
              // Superficies abiertas: mostrar ambas caras
              (Array.isArray(child.material) ? child.material : [child.material])
                .forEach(m => { m.side = THREE.DoubleSide; });
            }
            child.userData.originalMaterial = child.material;
          }
        });

        scene.add(obj);
        mesh = obj;

        // Fit camera
        camera.position.set(0, 0, 2.5);
        controls.update();
      },
      undefined,
      function (err) {
        console.warn('Mesh load error:', err);
        if (token !== loadToken) return;
        const el = document.getElementById('viewerLoading');
        if (el) { el.textContent = 'Could not load this mesh.'; el.hidden = false; }
      }
    );

    // Animate
    function animate() {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();
  };

  window.disposeViewer = function () {
    setLoading(false);
    const el = document.getElementById('viewerLoading');
    if (el) el.textContent = 'Loading mesh…';
    if (animId) cancelAnimationFrame(animId);
    if (renderer) {
      renderer.dispose();
      renderer = null;
    }
    if (scene) {
      scene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        }
      });
    }
    scene = camera = controls = mesh = null;
    wireframeOn = false;
  };

  window.toggleWireframe = function () {
    if (!mesh) return;
    wireframeOn = !wireframeOn;
    const accent1 = hexToInt(getCSSVar('--accent-1')) || 0x6b3fa0;
    const accent2 = hexToInt(getCSSVar('--accent-2')) || 0xa78bda;

    mesh.traverse(child => {
      if (child.isMesh) {
        if (wireframeOn) {
          child.material = new THREE.MeshBasicMaterial({
            color: accent2,
            wireframe: true,
          });
        } else {
          child.material = child.userData.originalMaterial || new THREE.MeshPhongMaterial({
            color: accent1,
            shininess: 60,
            side: THREE.DoubleSide,
          });
        }
      }
    });

    const btn = document.getElementById('btnWireframe');
    if (btn) btn.style.borderColor = wireframeOn ? getCSSVar('--accent-2') : '';
  };

  window.resetCamera = function () {
    if (!camera || !controls) return;
    camera.position.set(0, 0, 2.5);
    controls.reset();
  };

  // Resize viewer when window resizes
  window.addEventListener('resize', () => {
    if (!renderer || !camera) return;
    const panel = canvas.parentElement;
    const w = panel.offsetWidth;
    const h = Math.round(w * 9 / 16);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });
})();
