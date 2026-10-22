(() => {
  const $ = s => document.querySelector(s);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = Math.min(innerWidth, innerHeight) < 600;
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------- scroll progress + text (works with or without WebGL) ---------- */
  const items = [...document.querySelectorAll('.t,.u')].map(el => ({ el, i: +el.dataset.in, o: +el.dataset.out }));
  const bar = $('#progress i');
  let target = 0, p = 0, mx = 0, my = 0, smx = 0, smy = 0;

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.create({ trigger: '#spacer', start: 'top top', end: 'bottom bottom', onUpdate: s => target = s.progress });

  function updateUI(p) {
    bar.style.transform = `scaleY(${p})`;
    for (const { el, i, o } of items) {
      const a = i <= 0 ? 1 : ss(i, i + .04, p);
      const b = o > 1 ? 1 : 1 - ss(o - .04, o, p);
      const op = a * b;
      el.style.opacity = op;
      el.style.visibility = op < .01 ? 'hidden' : 'visible';
      el.style.transform = `translateY(${(1 - a) * 28 - (1 - b) * 20}px)`;
      if (el.classList.contains('cta-wrap')) el.querySelector('.cta').style.pointerEvents = op > .6 ? 'auto' : 'none';
    }
  }
  $('#cta').addEventListener('click', e => { e.preventDefault(); scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });
  const hideLoader = () => gsap.to('#loader', { opacity: 0, duration: 1, onComplete: () => $('#loader').remove() });

  /* ---------- WebGL check ---------- */
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: $('#stage'), antialias: !small, powerPreference: 'high-performance' }); } catch (e) {}
  if (!renderer || !renderer.getContext()) {
    document.body.classList.add('no-webgl');
    gsap.ticker.add(() => { p = lerp(p, target, .12); updateUI(p); });
    hideLoader();
    return;
  }

  /* ---------- scene ---------- */
  const CYAN = 0x2ee9ff, VIOLET = 0x8b5cff, DEEP = 0x040818;
  renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 2));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x02030a);
  scene.fog = new THREE.FogExp2(DEEP, 0);
  const camera = new THREE.PerspectiveCamera(50, 1, .1, 120);
  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.fov = camera.aspect < 1 ? 64 : 50;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize); resize();

  scene.add(new THREE.AmbientLight(0x334466, .7));
  const orb = new THREE.Group(); scene.add(orb);
  const coreLight = new THREE.PointLight(CYAN, 2, 22); orb.add(coreLight);
  const violetLight = new THREE.PointLight(VIOLET, 1.4, 25); violetLight.position.set(3, 2, 3); orb.add(violetLight);

  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.25, 'rgba(46,233,255,.6)');
    r.addColorStop(.6, 'rgba(139,92,255,.18)'); r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();

  // outer shell + lattice
  const seg = small ? 32 : 48;
  const shellMat = new THREE.MeshPhongMaterial({ color: 0x0a1a3a, emissive: 0x0b2a55, specular: 0x66f0ff, shininess: 120, transparent: true, opacity: .28, side: THREE.DoubleSide, depthWrite: false });
  const shell = new THREE.Mesh(new THREE.SphereGeometry(1.15, seg, seg), shellMat); orb.add(shell);
  const latticeMat = new THREE.MeshBasicMaterial({ color: VIOLET, wireframe: true, transparent: true, opacity: .14 });
  const lattice = new THREE.Mesh(new THREE.IcosahedronGeometry(1.18, 2), latticeMat); orb.add(lattice);

  // energy core + glow
  const coreMat = new THREE.MeshBasicMaterial({ color: CYAN, transparent: true });
  const core = new THREE.Mesh(new THREE.SphereGeometry(.45, 32, 32), coreMat); orb.add(core);
  const glowMat = new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
  const glow = new THREE.Sprite(glowMat); glow.scale.set(4.2, 4.2, 1); orb.add(glow);

  // rings
  const ringMat = [CYAN, VIOLET, CYAN].map(c => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .7 }));
  const rings = [1.55, 1.85, 2.15].map((r, k) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, .012, 8, 128), ringMat[k]);
    m.rotation.set(k * 1.0 + .6, k * .7, k * .4); orb.add(m); return m;
  });

  // components (orb opens into floating pieces)
  const compFace = new THREE.MeshPhongMaterial({ color: 0x0d2a55, emissive: 0x0a4a6a, flatShading: true, shininess: 90, transparent: true });
  const compEdge = new THREE.LineBasicMaterial({ color: CYAN, transparent: true });
  const geos = [new THREE.OctahedronGeometry(.3), new THREE.TetrahedronGeometry(.34), new THREE.BoxGeometry(.3, .3, .3)];
  const comps = [];
  const NC = 14;
  for (let k = 0; k < NC; k++) {
    const y = 1 - (k + .5) / NC * 2, rr = Math.sqrt(1 - y * y), th = k * 2.39996;
    const dir = new THREE.Vector3(Math.cos(th) * rr, y, Math.sin(th) * rr);
    const g = geos[k % 3], m = new THREE.Mesh(g, compFace);
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(g), compEdge));
    orb.add(m); comps.push({ m, dir, s: .5 + Math.random() });
  }

  // neural network
  const NN = small ? 48 : 80;
  const base = [], phase = [];
  for (let k = 0; k < NN; k++) {
    const v = new THREE.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize().multiplyScalar(1 + Math.random() * 2.2);
    base.push(v); phase.push(Math.random() * 6.28);
  }
  const pairs = [];
  for (let a = 0; a < NN; a++) {
    base.map((v, b) => [b, v.distanceTo(base[a])]).filter(x => x[0] !== a).sort((x, y) => x[1] - y[1]).slice(0, 2)
      .forEach(x => pairs.push(a, x[0]));
  }
  const net = new THREE.Group(); scene.add(net);
  const nodePos = new Float32Array(NN * 3), linePos = new Float32Array(pairs.length * 3);
  const nodeGeo = new THREE.BufferGeometry(); nodeGeo.setAttribute('position', new THREE.BufferAttribute(nodePos, 3));
  const lineGeo = new THREE.BufferGeometry(); lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
  const nodeMat = new THREE.PointsMaterial({ size: .11, map: glowTex, color: CYAN, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const lineMat = new THREE.LineBasicMaterial({ color: VIOLET, transparent: true, blending: THREE.AdditiveBlending });
  net.add(new THREE.Points(nodeGeo, nodeMat), new THREE.LineSegments(lineGeo, lineMat));

  // star field / depth particles
  const NS = small ? 450 : 1100;
  const sp = new Float32Array(NS * 3), sc = new Float32Array(NS * 3), col = [new THREE.Color(CYAN), new THREE.Color(VIOLET), new THREE.Color(0xffffff)];
  for (let k = 0; k < NS; k++) {
    sp.set([(Math.random() - .5) * 28, (Math.random() - .5) * 20, 10 - Math.random() * 58], k * 3);
    const c = col[(Math.random() * 3) | 0]; sc.set([c.r, c.g, c.b], k * 3);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3)); starGeo.setAttribute('color', new THREE.BufferAttribute(sc, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ size: .06, vertexColors: true, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(stars);

  // abstract universe objects (built when the browser is idle)
  const uni = [], uniMats = [new THREE.MeshBasicMaterial({ color: CYAN, wireframe: true, transparent: true }), new THREE.MeshBasicMaterial({ color: VIOLET, wireframe: true, transparent: true })];
  (window.requestIdleCallback || (f => setTimeout(f, 300)))(() => {
    const G = [new THREE.IcosahedronGeometry(1, 1), new THREE.TorusGeometry(1, .06, 8, 40), new THREE.OctahedronGeometry(1)];
    for (let k = 0; k < (small ? 16 : 28); k++) {
      const m = new THREE.Mesh(G[k % 3], uniMats[k % 2]), a = Math.random() * 6.28, r = 2.8 + Math.random() * 6;
      m.position.set(Math.cos(a) * r, Math.sin(a) * r * .7, -4 - Math.random() * 30);
      m.scale.setScalar(.5 + Math.random() * 1.6); m.userData.s = (Math.random() - .5) * .6;
      scene.add(m); uni.push(m);
    }
  });

  /* ---------- interaction ---------- */
  if (!reduce) addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    mx = (e.clientX / innerWidth - .5) * 2; my = (e.clientY / innerHeight - .5) * 2;
  });

  /* ---------- timeline (all driven by p, 0..1; fully reversible) ---------- */
  const white = new THREE.Color(0xffffff), cyanC = new THREE.Color(CYAN);
  function camZ(p) {
    if (p < .2) return lerp(7, 4.6, ss(0, .2, p));
    if (p < .4) return lerp(4.6, 5.6, ss(.2, .4, p));
    if (p < .6) return lerp(5.6, 4, ss(.4, .6, p));
    if (p < .8) return lerp(4, -29, ss(.6, .8, p));
    return lerp(-29, -25, ss(.8, 1, p));
  }
  const tmp = new THREE.Vector3();
  let first = true;

  gsap.ticker.add((time, dtms) => {
    const d = Math.min(dtms / 1000, .05);
    p = reduce ? target : lerp(p, target, 1 - Math.exp(-d * 5));
    smx = lerp(smx, mx, 1 - Math.exp(-d * 3)); smy = lerp(smy, my, 1 - Math.exp(-d * 3));
    updateUI(p);

    const e = p < .6 ? ss(.2, .4, p) : 1 - ss(.8, .95, p);               // explode amount
    const vis = p < .45 ? 1 - ss(.4, .5, p) : ss(.78, .88, p);           // orb visibility
    const bright = .6 + ss(0, .2, p) * .9 + ss(.85, 1, p) * .9;          // core energy
    const spin = (reduce ? .1 : 1) * (.25 + ss(0, .2, p) * 1.6 + ss(.85, 1, p));
    const netVis = ss(.38, .5, p) * (1 - ss(.62, .72, p));
    const uniVis = ss(.55, .68, p);

    // orb
    orb.visible = vis > .01;
    orb.position.z = p < .6 ? 0 : -34;
    orb.scale.setScalar(camera.aspect < 1 ? .72 : 1);
    orb.position.y = Math.sin(time * .8) * .08;
    orb.rotation.set(smy * .3, time * .12 + smx * .5, 0);
    shellMat.opacity = .28 * vis * (1 - .6 * e); latticeMat.opacity = .14 * vis;
    const pulse = 1 + Math.sin(time * 2.2) * .04 * bright;
    core.scale.setScalar((.85 + bright * .3) * pulse * (1 - .3 * e));
    coreMat.opacity = vis; coreMat.color.copy(cyanC).lerp(white, clamp((bright - .6) / 1.4, 0, 1) * .75);
    glowMat.opacity = vis * clamp(.4 + bright * .35, 0, 1); glow.scale.setScalar(3.4 + bright * 1.4);
    coreLight.intensity = (1 + bright * 3) * vis;
    rings.forEach((r, k) => { r.rotation.y += d * spin * (k % 2 ? -1 : 1) * (1 + k * .4); r.rotation.x += d * spin * .5; ringMat[k].opacity = .7 * vis; });
    compFace.opacity = .92 * vis; compEdge.opacity = vis;
    comps.forEach(c => {
      c.m.position.copy(c.dir).multiplyScalar(1.12 + e * 1.9 + Math.sin(time + c.s * 6) * .08 * e);
      c.m.scale.setScalar(clamp(e * 3, 0, 1) * c.s + .001);
      c.m.rotation.x += d * (.3 + e) * c.s; c.m.rotation.y += d * (.4 + e);
    });

    // neural network
    net.visible = netVis > .01;
    if (net.visible) {
      net.scale.setScalar(lerp(.35, 1, ss(.38, .55, p)));
      net.rotation.y = time * .1 + p * 3;
      for (let k = 0; k < NN; k++) {
        const b = base[k], ph = phase[k];
        nodePos[k * 3] = b.x + Math.sin(time * .7 + ph) * .15;
        nodePos[k * 3 + 1] = b.y + Math.cos(time * .6 + ph) * .15;
        nodePos[k * 3 + 2] = b.z + Math.sin(time * .5 + ph) * .15;
      }
      for (let k = 0; k < pairs.length; k++) {
        const n = pairs[k] * 3; linePos[k * 3] = nodePos[n]; linePos[k * 3 + 1] = nodePos[n + 1]; linePos[k * 3 + 2] = nodePos[n + 2];
      }
      nodeGeo.attributes.position.needsUpdate = true; lineGeo.attributes.position.needsUpdate = true;
      nodeMat.opacity = netVis; lineMat.opacity = netVis * .55;
    }

    // universe
    uniMats[0].opacity = uniMats[1].opacity = .5 * uniVis;
    uni.forEach(m => { m.visible = uniVis > .01; m.rotation.x += d * m.userData.s; m.rotation.y += d * m.userData.s * 1.3; });
    scene.fog.density = .028 * ss(.58, .75, p);
    stars.rotation.z = p * .4;

    // camera
    const z = camZ(p);
    camera.position.set(smx * .5, .25 - smy * .3, z);
    const lookZ = p < .6 ? 0 : lerp(z - 6, -34, ss(.78, .9, p));
    camera.lookAt(0, 0, lookZ);

    renderer.render(scene, camera);
    if (first) { first = false; hideLoader(); }
  });
})();
