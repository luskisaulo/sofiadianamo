// ═══════════════════════════════════════════════════════════════════
// A JORNADA DE SOFIA — 3D  (Three.js r163, ES module)
// Versão revisada: bugfixes + física de inimigos + controles touch +
// pausa + cutscenes com diálogo + fases expandidas
// ═══════════════════════════════════════════════════════════════════
import * as THREE from 'https://unpkg.com/three@0.163.0/build/three.module.js';

// ── DOM refs ─────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const lbar    = $('lbar'), lstat = $('lstat');
const loadScr = $('loading');
const menuOv  = $('menu-overlay');
const endOv   = $('end-overlay');

// ── Loading bar ───────────────────────────────────────────────────
const loadMsgs = ['Inicializando motor 3D…','Carregando texturas do Brasil…','Posicionando a Sofia…','Procurando o Lucas Saulo…','Pronto!'];
let lp = 0;
const lti = setInterval(() => {
  lp = Math.min(lp + Math.random()*20 + 5, 100);
  if (lbar)  lbar.style.width  = lp + '%';
  if (lstat) lstat.textContent = loadMsgs[Math.min(Math.floor(lp/22), loadMsgs.length-1)];
  if (lp >= 100) { clearInterval(lti); setTimeout(()=> loadScr?.classList.add('hide'), 700); }
}, 230);

// ── HUD helpers ───────────────────────────────────────────────────
function setHearts(n) { for (let i = 0; i < 3; i++) $('h'+i)?.classList.toggle('off', i >= n); }
function setPower(v) { const p = Math.min(v, 100); const f = $('pbar-fill'); if (f) f.style.width = p + '%'; const v2 = $('pbar-val'); if (v2) v2.textContent = Math.floor(p); }
function setGems(cur, tot) { const e = $('hud-gems'); if(e) e.textContent = cur + ' / ' + tot; }
function setPhase(name)    { const e = $('hud-phase');  if(e) e.textContent = name || '— — —'; }
function setScore(n)       { const e = $('hud-score');  if(e) e.textContent = n + ' pts'; }
function hudDamage() { const v = $('vignette'); if(!v) return; v.classList.remove('damage'); void v.offsetWidth; v.classList.add('damage'); }
function showCombo(txt) { const e = $('combo'); if(!e) return; e.textContent = txt; e.classList.add('show'); setTimeout(() => e.classList.remove('show'), 900); }
function showBossBar(name, pct) { const w = $('boss-wrap'); if(w) w.classList.toggle('show', pct > 0); const l = $('boss-lbl');  if(l) l.textContent = name; const f = $('boss-fill'); if(f) f.style.width = pct + '%'; }
function showPhaseBanner(num, title) { const el = $('phase-banner'); if(!el) return; const ey = $('pb-eyebrow'); if(ey) ey.textContent = num ? 'FASE '+num : ''; const tt = $('pb-title');   if(tt) tt.textContent = title; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2800); }
function setSkill(k, ready) { $('sp-'+k)?.classList.toggle('ready', ready); $('sk-'+k)?.classList.toggle('active', ready); }
function showEndScreen(title, sub, score, titleColor) { const ov = $('end-overlay'); if(!ov) return; const et = $('end-title'); if(et){ et.textContent = title; et.style.color = titleColor||'#fff'; et.style.textShadow = `0 0 24px ${titleColor||'#fff'}`; } const es = $('end-sub');   if(es) es.textContent = sub; const sc = $('end-score'); if(sc) sc.textContent = 'Pontuação: ' + score; ov.classList.add('show'); }
function hideEndScreen() { $('end-overlay')?.classList.remove('show'); }

// ── Dialogue box (cutscenes) ───────────────────────────────────────
function showDialogue(speaker, text) {
  let box = $('dialogue-box');
  if (!box) {
    box = document.createElement('div');
    box.id = 'dialogue-box';
    box.style.cssText = `
      position:fixed; left:50%; bottom:8%; transform:translateX(-50%);
      max-width:680px; width:88%; background:rgba(10,12,24,0.82);
      border:1px solid rgba(255,255,255,0.15); border-radius:14px;
      padding:16px 22px; color:#fff; font-family:inherit; font-size:1.05rem;
      backdrop-filter: blur(6px); z-index:50; opacity:0; transition:opacity .4s;
      pointer-events:none; text-align:left;`;
    document.body.appendChild(box);
  }
  box.innerHTML = `<div style="font-weight:700; color:#ff64b4; margin-bottom:4px; letter-spacing:.05em;">${speaker}</div><div>${text}</div>`;
  box.style.opacity = '1';
}
function hideDialogue() { const b = $('dialogue-box'); if (b) b.style.opacity = '0'; }

// ── Pause overlay ────────────────────────────────────────────────
let paused = false;
function buildPauseOverlay() {
  if ($('pause-overlay')) return;
  const ov = document.createElement('div');
  ov.id = 'pause-overlay';
  ov.style.cssText = `
    position:fixed; inset:0; display:none; align-items:center; justify-content:center;
    background:rgba(4,6,14,0.72); z-index:80; color:#fff; font-family:inherit;
    flex-direction:column; gap:10px; text-align:center;`;
  ov.innerHTML = `
    <div style="font-size:2.2rem; font-weight:800; letter-spacing:.08em; text-shadow:0 0 18px #00f5ff;">PAUSADO</div>
    <div style="opacity:.8; font-size:.95rem;">Pressione <b>P</b> ou <b>ESC</b> para continuar</div>
    <div style="opacity:.6; font-size:.85rem; margin-top:8px; max-width:340px; line-height:1.5;">
      WASD / Setas: mover · Espaço: pular<br>X: Pulso de energia · Z: Escudo · Shift: correr
    </div>`;
  document.body.appendChild(ov);
}
function setPaused(v) {
  paused = v;
  const ov = $('pause-overlay'); if (ov) ov.style.display = v ? 'flex' : 'none';
  if (v) clock.getDelta(); // evita "salto" de dt ao retomar
}

// ── Input ─────────────────────────────────────────────────────────
const K = {}, KP = {}, KR = {};
window.addEventListener('keydown', e => {
  if (!K[e.code]) KP[e.code] = true;
  K[e.code] = true;
  if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
  if ((e.code === 'KeyP' || e.code === 'Escape') && menuState === 'playing' && !$('end-overlay')?.classList.contains('show')) {
    setPaused(!paused);
  }
});
window.addEventListener('keyup', e => { K[e.code] = false; KR[e.code] = true; });
function clearKeys() { for (const k in KP) delete KP[k]; for (const k in KR) delete KR[k]; }
const keyDown  = c => !!K[c];
const pressed = c => !!KP[c];

// ── Touch controls (mobile) ────────────────────────────────────────
function buildTouchControls() {
  if ($('touch-controls')) return;
  if (!('ontouchstart' in window)) return;
  const wrap = document.createElement('div');
  wrap.id = 'touch-controls';
  wrap.style.cssText = `position:fixed; inset:0; z-index:40; pointer-events:none; font-family:inherit;`;
  wrap.innerHTML = `
    <div id="tc-stick" style="position:absolute; left:24px; bottom:28px; width:128px; height:128px; border-radius:50%; background:rgba(255,255,255,0.08); border:2px solid rgba(255,255,255,0.25); pointer-events:auto; touch-action:none;">
      <div id="tc-knob" style="position:absolute; left:34px; top:34px; width:60px; height:60px; border-radius:50%; background:rgba(0,245,255,0.35); border:1px solid rgba(0,245,255,0.6);"></div>
    </div>
    <div style="position:absolute; right:20px; bottom:24px; display:flex; gap:14px; align-items:flex-end; pointer-events:auto;">
      <button id="tc-z" class="tc-btn" style="width:62px;height:62px;">Z</button>
      <button id="tc-x" class="tc-btn" style="width:62px;height:62px;">X</button>
      <button id="tc-jump" class="tc-btn" style="width:78px;height:78px; font-size:1.3rem;">⤒</button>
    </div>
    <button id="tc-pause" class="tc-btn" style="position:absolute; right:16px; top:16px; width:46px; height:46px; pointer-events:auto;">⏸</button>
  `;
  document.body.appendChild(wrap);
  const style = document.createElement('style');
  style.textContent = `.tc-btn{ border-radius:50%; background:rgba(255,255,255,0.10); border:2px solid rgba(255,255,255,0.25); color:#fff; font-weight:800; touch-action:none; }`;
  document.head.appendChild(style);

  const stick = $('tc-stick'), knob = $('tc-knob');
  let stickActive = false, stickId = null, center = {x:0,y:0};
  function setKnob(dx,dy){ const max=34; const len=Math.min(Math.hypot(dx,dy),max); const ang=Math.atan2(dy,dx); knob.style.left = (34+Math.cos(ang)*len)+'px'; knob.style.top = (34+Math.sin(ang)*len)+'px'; }
  stick.addEventListener('touchstart', e => { const t=e.changedTouches[0]; stickActive=true; stickId=t.identifier; const r=stick.getBoundingClientRect(); center={x:r.left+r.width/2,y:r.top+r.height/2}; }, {passive:true});
  stick.addEventListener('touchmove', e => {
    for (const t of e.changedTouches) {
      if (t.identifier !== stickId) continue;
      const dx=t.clientX-center.x, dy=t.clientY-center.y;
      setKnob(dx,dy);
      const len=Math.hypot(dx,dy)||1, nx=dx/len, ny=dy/len, mag=Math.min(len/34,1);
      touchMove.x = nx*mag; touchMove.z = ny*mag;
    }
  }, {passive:true});
  function stickEnd(e){ for (const t of e.changedTouches){ if(t.identifier===stickId){ stickActive=false; stickId=null; touchMove.x=0; touchMove.z=0; knob.style.left='34px'; knob.style.top='34px'; } } }
  stick.addEventListener('touchend', stickEnd, {passive:true});
  stick.addEventListener('touchcancel', stickEnd, {passive:true});

  const bind = (id, code) => {
    const el = $(id);
    el.addEventListener('touchstart', e => { e.preventDefault(); if(!K[code]) KP[code]=true; K[code]=true; }, {passive:false});
    el.addEventListener('touchend',   e => { e.preventDefault(); K[code]=false; KR[code]=true; }, {passive:false});
  };
  bind('tc-jump','Space'); bind('tc-z','KeyZ'); bind('tc-x','KeyX');
  $('tc-pause').addEventListener('touchstart', e => { e.preventDefault(); if (menuState==='playing' && !$('end-overlay')?.classList.contains('show')) setPaused(!paused); }, {passive:false});
}
const touchMove = { x:0, z:0 };

// ── Renderer ──────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
renderer.toneMapping       = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });

// ── Camera ────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(65, window.innerWidth/window.innerHeight, 0.1, 800);
camera.position.set(0, 8, 14);

// ── Camera orbit state (declarado ANTES de qualquer uso — corrige TDZ) ──
let camYaw = 0, isDragging = false, lastMX = 0;
window.addEventListener('mousedown', e => { isDragging = true; lastMX = e.clientX; });
window.addEventListener('mouseup',   () => { isDragging = false; });
window.addEventListener('mousemove', e => { if (!isDragging) return; camYaw += (e.clientX - lastMX) * 0.005; lastMX = e.clientX; });
window.addEventListener('touchmove',  e => { if (e.target.closest('#touch-controls')) return; if (e.touches.length===1){ camYaw += (e.touches[0].clientX - lastMX) * 0.006; } lastMX = e.touches[0]?.clientX ?? lastMX; }, {passive:true});
window.addEventListener('touchstart', e => { if (e.target.closest('#touch-controls')) return; lastMX = e.touches[0]?.clientX ?? lastMX; }, {passive:true});

// ── Global state ─────────────────────────────────────────────────
const G = {
  vidas:3, vidasMax:3, poder:0, combo:0, pontos:0, gems:0, totalGems:0, faseNome:'', shieldOn:false,
  reset(){ this.vidas=3; this.poder=0; this.combo=0; this.pontos=0; this.gems=0; this.shieldOn=false; }
};

let activeScene = null;
let pendingScene = null;
function goTo(name) { pendingScene = name; }
const clock = new THREE.Clock();

// ═══════════════════════════════════════════════════════════════════
// 🎨 GERENCIADOR DE ARTES E TEXTURAS (com fallback de erro)
// ═══════════════════════════════════════════════════════════════════
const textureLoader = new THREE.TextureLoader();

// Carrega textura com fallback: se a imagem falhar, gera uma textura
// procedural simples (cor sólida + grade) para o jogo nunca ficar "preto".
function loadTex(path, fallbackColor = '#88406030') {
  const tex = textureLoader.load(
    path,
    undefined,
    undefined,
    () => {
      console.warn(`[A Jornada de Sofia] Não foi possível carregar "${path}" — usando textura procedural de fallback.`);
      const c = document.createElement('canvas'); c.width = 64; c.height = 64;
      const ctx = c.getContext('2d');
      ctx.fillStyle = fallbackColor; ctx.fillRect(0,0,64,64);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2;
      ctx.strokeRect(1,1,62,62);
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(64,64); ctx.moveTo(64,0); ctx.lineTo(0,64); ctx.stroke();
      tex.image = c; tex.needsUpdate = true;
    }
  );
  return tex;
}

const ARTES = {
  // 🧍 PERSONAGENS
  sofia: loadTex('assets/sofia1.png', '#ff64b4'),
  lucas: loadTex('assets/lucas_saulo.png', '#64b4ff'),

  // 👾 VILÕES
  vilaoPelotas: loadTex('assets/vilao_pelotas.png', '#7755aa'),
  vilaoRio: loadTex('assets/vilao_rio.png', '#3399cc'),
  vilaoTefe: loadTex('assets/vilao_tefe.png', '#449944'),
  bossGuardiao: loadTex('assets/boss_guardiao.png', '#aa0044'),

  // 🌆 FUNDOS DE TELA
  fundoPelotas: loadTex('assets/fundo_pelotas.png', '#161830'),
  fundoRio: loadTex('assets/fundo_rio.jpg', '#102038'),
  fundoTefe: loadTex('assets/fundo_tefe.jpg', '#102014'),
  fundoBoss: loadTex('assets/fundo_boss.jpg', '#1a0414'),

  // 🧱 TEXTURAS DO CHÃO
  chaoAsfalto: loadTex('assets/chao_asfalto.jpg', '#444a55'),
  chaoAreia: loadTex('assets/chao_areia.jpg', '#cdb285'),
  chaoGrama: loadTex('assets/chao_grama.jpg', '#3f7d3a'),
  chaoPedraEscura: loadTex('assets/chao_pedra.jpg', '#3a3a40'),

  plataformaPedra: loadTex('assets/plataforma_base.png', '#5a5f78')
};

// Configuração para cores vivas e originais
for (const k of Object.keys(ARTES)) {
  if (ARTES[k]) ARTES[k].colorSpace = THREE.SRGBColorSpace;
}

// Configuração do Spritesheet da Sofia (8x3)
ARTES.sofia.generateMipmaps = false;
ARTES.sofia.magFilter = THREE.NearestFilter;
ARTES.sofia.minFilter = THREE.NearestFilter;
ARTES.sofia.wrapS = THREE.ClampToEdgeWrapping;
ARTES.sofia.wrapT = THREE.ClampToEdgeWrapping;

const COLS = 8;
const ROWS = 3;
const PAD = 0.004;
ARTES.sofia.repeat.set((1 / COLS) - (PAD * 2), (1 / ROWS) - (PAD * 2));
ARTES.sofia.offset.set(PAD, (2 / ROWS) + PAD);

// Repetição para os chãos
[ARTES.chaoAsfalto, ARTES.chaoAreia, ARTES.chaoGrama, ARTES.chaoPedraEscura, ARTES.plataformaPedra].forEach(tex => {
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
});

// ── Particle system (FIX: usa anel circular de slots, evita "popping") ──
const MAX_P = 800;
const pGeo  = new THREE.BufferGeometry();
const pPos  = new Float32Array(MAX_P * 3);
const pCol  = new Float32Array(MAX_P * 3);
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
pGeo.setAttribute('color',    new THREE.BufferAttribute(pCol, 3));
const pMat  = new THREE.PointsMaterial({ size:0.22, vertexColors:true, transparent:true, depthWrite:false });
const pMesh = new THREE.Points(pGeo, pMat);

// Array de slots fixos (tamanho MAX_P) — cada slot é null ou uma partícula.
const pSlots = new Array(MAX_P).fill(null);
let pCursor = 0;
function burst3(x, y, z, n, r, g, b) {
  for (let i = 0; i < n; i++) {
    const ang  = Math.random() * Math.PI * 2;
    const elev = (Math.random() - 0.5) * Math.PI;
    const spd  = 2 + Math.random() * 6;
    pSlots[pCursor] = {
      x, y, z,
      vx: Math.cos(elev)*Math.cos(ang)*spd,
      vy: Math.sin(elev)*spd + 2,
      vz: Math.cos(elev)*Math.sin(ang)*spd,
      life: 0.5 + Math.random()*0.7, maxLife: 1.2,
      r, g, b
    };
    pCursor = (pCursor + 1) % MAX_P;
  }
}
function updateParticles(dt) {
  for (let i = 0; i < MAX_P; i++) {
    const p = pSlots[i];
    if (!p) { pPos[i*3]=0; pPos[i*3+1]=-999; pPos[i*3+2]=0; pCol[i*3]=0; pCol[i*3+1]=0; pCol[i*3+2]=0; continue; }
    p.x += p.vx*dt; p.y += p.vy*dt; p.z += p.vz*dt; p.vy -= 9*dt; p.life -= dt;
    if (p.life <= 0) { pSlots[i] = null; pPos[i*3+1] = -999; continue; }
    pPos[i*3]=p.x; pPos[i*3+1]=p.y; pPos[i*3+2]=p.z;
    const a = Math.max(0, p.life/p.maxLife);
    pCol[i*3]=p.r*a; pCol[i*3+1]=p.g*a; pCol[i*3+2]=p.b*a;
  }
  pGeo.attributes.position.needsUpdate = true;
  pGeo.attributes.color.needsUpdate    = true;
}

// ═══════════════════════════════════════════════════════════════════
// GEOMETRY HELPERS
// ═══════════════════════════════════════════════════════════════════
function makePlatform(scene, x,y,z, w,h,d, color, emissive, textureMap) {
  const g = new THREE.BoxGeometry(w, h, d);
  const m = new THREE.MeshStandardMaterial({ color: color||0xffffff, roughness: 0.8, metalness: 0.1 });
  if (textureMap) m.map = textureMap;
  else { m.color.set(color||0x2a3060); m.emissive.set(emissive||0x101830); m.emissiveIntensity = 0.3; }

  const mesh = new THREE.Mesh(g, m);
  mesh.position.set(x, y, z);
  mesh.receiveShadow = true; mesh.castShadow = true;
  scene.add(mesh);

  const eg = new THREE.BoxGeometry(w, 0.08, d);
  const em = new THREE.MeshStandardMaterial({ color:0x6080ff, emissive:0x3050cc, emissiveIntensity:1.2, roughness:0.2 });
  const es = new THREE.Mesh(eg, em);
  es.position.set(x, y+h/2+0.04, z);
  scene.add(es);
  return mesh;
}

function makeGem(scene, x,y,z) {
  const g = new THREE.OctahedronGeometry(0.35, 0);
  const m = new THREE.MeshStandardMaterial({ color:0xff3fa4, emissive:0xff0070, emissiveIntensity:0.8, roughness:0.1, metalness:0.6 });
  const mesh = new THREE.Mesh(g, m);
  mesh.position.set(x, y, z); mesh.castShadow = true;
  const pl = new THREE.PointLight(0xff3fa4, 0.8, 3); pl.position.copy(mesh.position);
  scene.add(pl); scene.add(mesh);
  return { mesh, light:pl, baseY:y, alive:true, t: Math.random()*Math.PI*2 };
}

function makePowerup(scene, x,y,z) {
  const g = new THREE.TorusGeometry(0.3, 0.1, 8, 16);
  const m = new THREE.MeshStandardMaterial({ color:0xffd700, emissive:0xffaa00, emissiveIntensity:1, roughness:0.1 });
  const mesh = new THREE.Mesh(g, m); mesh.position.set(x,y,z);
  const pl = new THREE.PointLight(0xffd700, 0.9, 3.5); pl.position.copy(mesh.position);
  scene.add(pl); scene.add(mesh);
  return { mesh, light:pl, baseY:y, alive:true, t:Math.random()*Math.PI*2 };
}

function makeHazardTile(scene, x,y,z, type) {
  const g = new THREE.BoxGeometry(2,0.3,2);
  const col  = type==='lava' ? 0xdd3300 : 0x0040cc;
  const emis = type==='lava' ? 0xff2200 : 0x002288;
  const m = new THREE.MeshStandardMaterial({ color:col, emissive:emis, emissiveIntensity:0.9, roughness:0.5, transparent:true, opacity:0.85 });
  const mesh = new THREE.Mesh(g, m); mesh.position.set(x,y,z);
  const pl = new THREE.PointLight(col, 0.7, 5); pl.position.set(x,y+1,z);
  scene.add(pl); scene.add(mesh);
  return { mesh, type };
}

// Pequenas plataformas decorativas / animadas (flutuam suavemente)
function makeFloatingDeco(scene, x,y,z, scale, tex) {
  const m = new THREE.SpriteMaterial({ map: tex, color: 0xffffff, transparent:true, opacity:0.85 });
  const mesh = new THREE.Sprite(m);
  mesh.scale.set(scale, scale, 1);
  mesh.position.set(x,y,z);
  scene.add(mesh);
  return { mesh, baseY:y, t: Math.random()*Math.PI*2 };
}

// ═══════════════════════════════════════════════════════════════════
// PLAYER (SOFIA)
// ═══════════════════════════════════════════════════════════════════
function makePlayer(scene) {
  const group = new THREE.Group();

  const spriteMat = new THREE.SpriteMaterial({
    map: ARTES.sofia,
    color: 0xffffff,
    transparent: true,
    alphaTest: 0.5
  });
  const body = new THREE.Sprite(spriteMat);
  body.scale.set(1.5, 1.8, 1);
  body.position.y = 0.9;
  group.add(body);

  const shieldG = new THREE.TorusGeometry(0.8, 0.04, 8, 32);
  const shieldM = new THREE.MeshStandardMaterial({ color:0x00f5ff, emissive:0x00c8ff, emissiveIntensity:1.2, transparent:true, opacity:0, depthWrite:false });
  const shieldMesh = new THREE.Mesh(shieldG, shieldM);
  shieldMesh.rotation.x = Math.PI/2;
  shieldMesh.position.y = 0.8;
  shieldMesh.visible = false;
  group.add(shieldMesh);

  const glow = new THREE.PointLight(0xff3fa4, 1.0, 4);
  glow.position.y = 0.8;
  group.add(glow);

  scene.add(group);

  const shadow = (() => {
    const sg = new THREE.CircleGeometry(0.5, 16);
    const sm = new THREE.MeshBasicMaterial({ color:0x000000, transparent:true, opacity:0.35, depthWrite:false });
    const s  = new THREE.Mesh(sg, sm); s.rotation.x = -Math.PI/2; scene.add(s); return s;
  })();

  return {
    group, body, spriteMat, shieldMesh, shieldM, glow, shadow,
    vel: new THREE.Vector3(), onGround: false, facingAngle: 0,
    invTimer: 0, shieldTimer:0, shieldCD:0, pulsoCD:0, blinkOn: true, blinkTimer:0,
    frameTimer: 0, currentFrame: 0,

    get pos() { return group.position; },
    get shielded() { return this.shieldTimer > 0; },
    get inv() { return this.invTimer > 0; },

    takeDamage() {
      if (this.inv || this.shielded) return;
      G.vidas--; G.combo = 0; G.shieldOn = false; this.invTimer = 1.5; hudDamage();
      burst3(this.pos.x, this.pos.y, this.pos.z, 12, 1,0.3,0.3);
      if (G.vidas <= 0) goTo('_gameover');
    },

    usePulso(enemies, boss) {
      if (this.pulsoCD > 0 || G.poder < 30) return;
      G.poder -= 30; this.pulsoCD = 4;
      burst3(this.pos.x, this.pos.y, this.pos.z, 24, 1,0.8,0); showCombo('PULSO!');
      const range = 7;
      enemies.forEach(e => {
        if (!e.alive) return;
        const d = e.mesh.position.distanceTo(this.pos);
        if (d < range) {
          e.hp -= 2; const dir = e.mesh.position.clone().sub(this.pos).normalize(); e.mesh.position.addScaledVector(dir, 3);
          if (e.hp <= 0) killEnemy(e);
        }
      });
      if (boss && boss.alive) {
        const d = boss.mesh.position.distanceTo(this.pos);
        if (d < range + 2) { boss.hp -= 2; boss.flashTimer = 0.1; checkBoss(boss); }
      }
    },

    useShield() {
      if (this.shieldCD > 0 || this.shieldTimer > 0 || G.poder < 20) return;
      G.poder -= 20; this.shieldTimer = 3.5; burst3(this.pos.x, this.pos.y, this.pos.z, 10, 0,0.8,1);
    },

    update(dt, platforms, hazards, gems, powerups, enemies, boss) {
      if (this.invTimer  > 0) { this.invTimer  -= dt; if(this.invTimer  < 0) this.invTimer  = 0; }
      if (this.shieldTimer > 0) { this.shieldTimer -= dt; if (this.shieldTimer < 0) { this.shieldTimer = 0; this.shieldCD = 5; } }
      if (this.shieldCD > 0) { this.shieldCD -= dt; if(this.shieldCD < 0) this.shieldCD = 0; }
      if (this.pulsoCD  > 0) { this.pulsoCD  -= dt; if(this.pulsoCD  < 0) this.pulsoCD  = 0; }

      if (this.inv) { this.blinkTimer += dt; if (this.blinkTimer > 0.08) { this.blinkTimer = 0; this.blinkOn = !this.blinkOn; } this.group.visible = this.blinkOn; }
      else { this.group.visible = true; }

      const run = keyDown('ShiftLeft')||keyDown('ShiftRight'); const speed = run ? 9 : 5.5;
      let moveX = 0, moveZ = 0;
      if (keyDown('KeyA')||keyDown('ArrowLeft'))  moveX -= 1;
      if (keyDown('KeyD')||keyDown('ArrowRight')) moveX += 1;
      if (keyDown('KeyW')||keyDown('ArrowUp'))    moveZ -= 1;
      if (keyDown('KeyS')||keyDown('ArrowDown'))  moveZ += 1;

      // Entrada touch (analógico virtual)
      if (Math.abs(touchMove.x) > 0.05 || Math.abs(touchMove.z) > 0.05) { moveX = touchMove.x; moveZ = touchMove.z; }

      const camFwd = new THREE.Vector3(); camera.getWorldDirection(camFwd); camFwd.y = 0; camFwd.normalize();
      const camRight = new THREE.Vector3().crossVectors(camFwd, new THREE.Vector3(0,1,0));
      const move = camFwd.clone().multiplyScalar(-moveZ).add(camRight.clone().multiplyScalar(moveX));
      if (move.length() > 0.01) {
        move.normalize(); this.vel.x = move.x * speed * Math.min(move.length()*2,1); this.vel.z = move.z * speed * Math.min(Math.hypot(moveX,moveZ)*1,1) * (speed/speed);
        // (mantém magnitude proporcional ao analógico para suavidade no touch)
        const mag = Math.min(Math.hypot(moveX,moveZ),1);
        this.vel.x = move.x * speed * mag; this.vel.z = move.z * speed * mag;
      } else { this.vel.x *= 0.82; this.vel.z *= 0.82; }

      if (pressed('Space') && this.onGround) { this.vel.y = 11; this.onGround = false; burst3(this.pos.x, this.pos.y, this.pos.z, 6, 0.7,0.7,1); }
      if (pressed('KeyX')) this.usePulso(enemies, boss);
      if (pressed('KeyZ')) this.useShield();

      if (!this.onGround) this.vel.y -= 22 * dt; else if (this.vel.y < 0) this.vel.y = 0;
      this.pos.x += this.vel.x * dt; this.pos.y += this.vel.y * dt; this.pos.z += this.vel.z * dt;

      this.onGround = false; const FEET = 0.1;
      platforms.forEach(plat => {
        const pp = plat.position; const ph = plat.geometry.parameters.height; const pw = plat.geometry.parameters.width; const pd = plat.geometry.parameters.depth; const top = pp.y + ph/2;
        if (this.pos.x > pp.x - pw/2 - 0.3 && this.pos.x < pp.x + pw/2 + 0.3 && this.pos.z > pp.z - pd/2 - 0.3 && this.pos.z < pp.z + pd/2 + 0.3) {
          if (this.pos.y - FEET < top + 0.25 && this.pos.y - FEET > top - 0.6 && this.vel.y <= 0) { this.pos.y = top + FEET; this.vel.y = 0; this.onGround = true; }
          if (this.pos.y + FEET > pp.y - ph/2 && this.pos.y + FEET < pp.y - ph/2 + 0.5 && this.vel.y > 0) { this.vel.y = 0; }
        }
      });

      hazards.forEach(h => { const hp = h.mesh.position; if ( Math.abs(this.pos.x - hp.x) < 1.2 && Math.abs(this.pos.z - hp.z) < 1.2 && Math.abs(this.pos.y - hp.y) < 1.0 ) { this.takeDamage(); } });
      gems.forEach(g => {
        if (!g.alive) return;
        if (this.pos.distanceTo(g.mesh.position) < 1.0) {
          g.alive = false; g.mesh.visible = false; g.light.visible = false; G.gems++; G.poder = Math.min(G.poder+8,100);
          burst3(g.mesh.position.x, g.mesh.position.y, g.mesh.position.z, 10, 1,0.2,0.65);
          if (G.gems >= G.totalGems) setTimeout(()=>goTo(activeScene._next||'_gameover'), 600);
        }
      });
      powerups.forEach(p => {
        if (!p.alive) return;
        if (this.pos.distanceTo(p.mesh.position) < 1.1) {
          p.alive = false; p.mesh.visible = false; p.light.visible = false; G.poder = Math.min(G.poder+35,100); showCombo('PODER +35!');
          burst3(p.mesh.position.x, p.mesh.position.y, p.mesh.position.z, 14, 1,0.85,0);
        }
      });

      if (this.pos.y < -15) { this.takeDamage(); if (G.vidas > 0) { this.pos.set(activeScene._spawnX||0, 3, activeScene._spawnZ||0); this.vel.set(0,0,0); } }

      const moving = Math.abs(this.vel.x) > 0.3 || Math.abs(this.vel.z) > 0.3;
      this.body.position.y = moving ? 0.9 + Math.sin(Date.now()*0.015)*0.1 : 0.9;

      if (moving && this.onGround) {
        this.frameTimer += dt;
        if (this.frameTimer > 0.08) {
          this.frameTimer = 0;
          this.currentFrame = (this.currentFrame + 1) % COLS;
        }
        this.spriteMat.map.offset.y = (1 / ROWS) + PAD; // Corrida
      } else if (!this.onGround) {
        this.currentFrame = 2; // Pulo
        this.spriteMat.map.offset.y = (0 / ROWS) + PAD;
      } else {
        this.frameTimer += dt;
        if (this.frameTimer > 0.15) {
          this.frameTimer = 0;
          this.currentFrame = (this.currentFrame + 1) % 4;
        }
        this.spriteMat.map.offset.y = (2 / ROWS) + PAD; // Parada
      }

      if (moveX < -0.1) {
        this.body.scale.x = -1.5;
      } else if (moveX > 0.1) {
        this.body.scale.x = 1.5;
      }

      this.spriteMat.map.offset.x = (this.currentFrame / COLS) + PAD;

      this.shieldM.opacity = this.shielded ? 0.55 + 0.15*Math.sin(Date.now()*0.008) : Math.max(0, this.shieldM.opacity - dt*3);
      this.shieldMesh.rotation.z += dt*2; this.shieldMesh.rotation.y += dt*1.3;
      this.shieldMesh.visible = this.shieldM.opacity > 0.01;

      if (this.shielded) { this.glow.color.set(0x00f5ff); } else { this.glow.color.set(0xff3fa4); }

      this.shadow.position.set(this.pos.x, this.pos.y - FEET + 0.02, this.pos.z);

      setHearts(G.vidas); setPower(G.poder); setGems(G.gems, G.totalGems); setScore(G.pontos);
      setSkill('x', G.poder >= 30 && this.pulsoCD <= 0); setSkill('z', G.poder >= 20 && this.shieldCD <= 0 && !this.shielded);

      const idealOffset = new THREE.Vector3(0, 6, 11);
      idealOffset.applyAxisAngle(new THREE.Vector3(0,1,0), camYaw);
      const idealPos = this.pos.clone().add(idealOffset);
      camera.position.lerp(idealPos, dt*4);
      const lookAt = this.pos.clone().add(new THREE.Vector3(0,1,0));
      camera.lookAt(lookAt);
    }
  };
}

// ═══════════════════════════════════════════════════════════════════
// VILÕES — agora com gravidade e colisão simples com plataformas
// ═══════════════════════════════════════════════════════════════════
function makeEnemy(scene, x,y,z, tipo, textureArte, opts = {}) {
  const cfgs = {
    basico: { hp:2, vel:3.0, pts:50, range:5 },
    voador: { hp:1, vel:4.0, pts:80, range:7 },
    tanque: { hp:6, vel:1.5, pts:200, range:4 },
  };
  const cfg = cfgs[tipo]||cfgs.basico;

  const m = new THREE.SpriteMaterial({ map: textureArte, color: 0xffffff, transparent: true, alphaTest: 0.5 });
  const mesh = new THREE.Sprite(m);
  mesh.scale.set(1.5, 1.5, 1);
  mesh.position.set(x,y+0.5,z);
  scene.add(mesh);

  const pl = new THREE.PointLight(0xff0000, 0.5, 4);
  mesh.add(pl);

  return { mesh, m, hp:cfg.hp, hpMax:cfg.hp, vel:cfg.vel, pts:cfg.pts,
           tipo, spawnX:x, spawnY:y, spawnZ:z, dir:1, t:0, alive:true,
           flashTimer:0, range: opts.range ?? cfg.range, vy:0, onGround:false };
}

function killEnemy(e) {
  if (!e.alive) return;
  e.alive = false; e.mesh.visible = false; G.pontos += e.pts; G.combo++; G.poder = Math.min(G.poder+12,100);
  if (G.combo >= 3) showCombo('×'+G.combo+' COMBO!');
  burst3(e.mesh.position.x, e.mesh.position.y, e.mesh.position.z, 16, 0.8,0.2,0.2);
}

function updateEnemies(dt, enemies, player, platforms) {
  enemies.forEach(e => {
    if (!e.alive) return;
    if (e.flashTimer > 0) { e.flashTimer -= dt; e.m.color.setHex(e.flashTimer > 0 ? 0xff0000 : 0xffffff); }
    e.t += dt;

    if (e.tipo === 'voador') {
      // Inimigos voadores ignoram gravidade — oscilam em torno do spawn
      e.mesh.position.x = e.spawnX + Math.sin(e.t * e.vel * 0.5) * e.range;
      e.mesh.position.y = e.spawnY + 0.5 + Math.sin(e.t * 1.8) * 0.8;
    } else {
      // Inimigos terrestres: patrulha + gravidade + colisão com plataformas
      e.mesh.position.x += e.dir * e.vel * dt;
      if (Math.abs(e.mesh.position.x - e.spawnX) > e.range) {
        e.dir *= -1;
        e.mesh.scale.x = e.mesh.scale.x < 0 ? Math.abs(e.mesh.scale.x) : -Math.abs(e.mesh.scale.x);
      }
      if (!e.onGround) e.vy -= 22 * dt; else if (e.vy < 0) e.vy = 0;
      e.mesh.position.y += e.vy * dt;

      e.onGround = false;
      const FEET = 0.55;
      if (platforms) platforms.forEach(plat => {
        const pp = plat.position; const ph = plat.geometry.parameters.height;
        const pw = plat.geometry.parameters.width; const pd = plat.geometry.parameters.depth;
        const top = pp.y + ph/2;
        if (e.mesh.position.x > pp.x - pw/2 && e.mesh.position.x < pp.x + pw/2 &&
            e.mesh.position.z > pp.z - pd/2 && e.mesh.position.z < pp.z + pd/2) {
          if (e.mesh.position.y - FEET < top + 0.25 && e.mesh.position.y - FEET > top - 0.6 && e.vy <= 0) {
            e.mesh.position.y = top + FEET; e.vy = 0; e.onGround = true;
          }
        }
      });
      // Evita queda infinita caso saia da plataforma
      if (e.mesh.position.y < e.spawnY - 6) { e.mesh.position.set(e.spawnX, e.spawnY + 0.5, e.spawnZ); e.vy = 0; }
    }

    if (player.pos.distanceTo(e.mesh.position) < 1.1) player.takeDamage();
  });
}

// ═══════════════════════════════════════════════════════════════════
// BOSS (GUARDIÃO DAS SOMBRAS)
// ═══════════════════════════════════════════════════════════════════
let bossRef = null;
function makeBoss(scene, x,y,z) {
  const g = new THREE.Group();

  const bodyM = new THREE.SpriteMaterial({ map: ARTES.bossGuardiao, color: 0xffffff, transparent:true, alphaTest: 0.5 });
  const body  = new THREE.Sprite(bodyM);
  body.scale.set(4, 4, 1);
  body.position.y = 1.5;
  g.add(body);

  const pl = new THREE.PointLight(0xff0040, 2, 8); pl.position.y = 1.5; g.add(pl);
  g.position.set(x,y,z); scene.add(g);

  bossRef = { mesh:g, bodyM, pl, hp:14, hpMax:14, alive:true, spawnX:x, spawnY:y, spawnZ:z, dir:1, fase:1, atTimer:0, t:0, flashTimer:0 };
  showBossBar('GUARDIÃO DAS SOMBRAS', 100);
  return bossRef;
}

let bossBullets = [];
function shootBossBullet(scene, boss, player) {
  const dir = player.pos.clone().sub(boss.mesh.position).normalize();
  const bg = new THREE.SphereGeometry(0.3, 8, 8); const bm = new THREE.MeshStandardMaterial({ color:0xff8800, emissive:0xff4400, emissiveIntensity:1.2 });
  const mesh = new THREE.Mesh(bg, bm); mesh.position.copy(boss.mesh.position); mesh.position.y += 1.5;
  scene.add(mesh); bossBullets.push({ mesh, vel:dir.clone().multiplyScalar(8), alive:true, t:0 });
}

function checkBoss(boss) {
  if (!boss || !boss.alive) return;
  if (boss.hp <= 0) {
    boss.alive = false; boss.mesh.visible = false; G.pontos += 1000; G.poder = Math.min(G.poder+40,100);
    burst3(boss.mesh.position.x, boss.mesh.position.y, boss.mesh.position.z, 40, 1,0.3,0.6);
    showBossBar('GUARDIÃO DAS SOMBRAS', 0); showCombo('BOSS DERROTADO!');
    setTimeout(()=>goTo('_vitoria'), 1800);
  } else {
    showBossBar('GUARDIÃO DAS SOMBRAS', boss.hp/boss.hpMax*100);
    if (boss.hp < boss.hpMax*0.4 && boss.fase===1) {
      boss.fase = 2; boss.bodyM.color.set(0xffaaaa); boss.pl.color.set(0xff4400); boss.pl.intensity = 3; showCombo('FÚRIA DO CHEFE!');
    }
  }
}

// FIX: usa boss.spawnY como referência para a oscilação vertical,
// em vez de acumular sin() sobre a própria posição (evitava drift).
function updateBoss(dt, boss, player, scene) {
  if (!boss || !boss.alive) return;
  boss.t += dt;
  if (boss.flashTimer > 0) { boss.flashTimer -= dt; boss.bodyM.color.setHex(boss.flashTimer>0 ? 0xff0000 : (boss.fase===2 ? 0xffaaaa : 0xffffff)); }

  const spd = boss.fase===2 ? 4.5 : 2.5;
  boss.mesh.position.x += boss.dir * spd * dt;
  if (Math.abs(boss.mesh.position.x - boss.spawnX) > 7) boss.dir *= -1;
  boss.mesh.position.y = boss.spawnY + Math.sin(boss.t*1.5) * 0.4;

  boss.atTimer += dt; const cd = boss.fase===2 ? 1.0 : 2.0;
  if (boss.atTimer >= cd) { boss.atTimer = 0; shootBossBullet(scene, boss, player); if (boss.fase===2) setTimeout(()=>{ if(boss.alive) shootBossBullet(scene, boss, player); }, 300); }

  if (player.pos.distanceTo(boss.mesh.position) < 2.0) {
    if (!player.onGround && player.vel.y < 0) { boss.hp -= 1; boss.flashTimer = 0.1; checkBoss(boss); player.vel.y = 8; } else { player.takeDamage(); }
  }

  for (let i=bossBullets.length-1;i>=0;i--) {
    const b = bossBullets[i]; if (!b.alive) { bossBullets.splice(i,1); continue; }
    b.t += dt; b.mesh.position.addScaledVector(b.vel, dt); b.mesh.rotation.x += dt*4;
    if (b.t > 3) { b.alive=false; b.mesh.parent?.remove(b.mesh); b.mesh.geometry?.dispose(); b.mesh.material?.dispose(); bossBullets.splice(i,1); continue; }
    if (player.pos.distanceTo(b.mesh.position) < 1.0) { player.takeDamage(); b.alive=false; b.mesh.parent?.remove(b.mesh); b.mesh.geometry?.dispose(); b.mesh.material?.dispose(); bossBullets.splice(i,1); }
  }
}

// ═══════════════════════════════════════════════════════════════════
// LEVEL BUILDER
// ═══════════════════════════════════════════════════════════════════
function clearScene(scene) {
  const toRemove = []; scene.traverse(obj => { if (obj !== scene) toRemove.push(obj); });
  toRemove.forEach(obj => { if(obj.parent) obj.parent.remove(obj); obj.geometry?.dispose(); if(Array.isArray(obj.material)) obj.material.forEach(m=>m.dispose()); else obj.material?.dispose(); });
  bossBullets = []; bossRef = null;
}

function makeSkybox(scene, col1, col2, bgTexture) {
  if (bgTexture) {
    scene.background = bgTexture;
    scene.fog = null; // remove neblina para não cortar o fundo
  } else {
    scene.background = new THREE.Color(col1);
    scene.fog = new THREE.FogExp2(col2, 0.025);
  }
}

function addAmbientLights(scene, ambColor, dirColor) {
  scene.add(new THREE.AmbientLight(ambColor||0x445577, 1.0));
  const sun = new THREE.DirectionalLight(dirColor||0xbbccff, 1.5);
  sun.position.set(15,30,15); sun.castShadow = true;
  sun.shadow.mapSize.set(2048,2048);
  sun.shadow.camera.near=0.1; sun.shadow.camera.far=120;
  sun.shadow.camera.left=-40; sun.shadow.camera.right=40; sun.shadow.camera.top=40;   sun.shadow.camera.bottom=-40;
  scene.add(sun);
}

function addFloor(scene, y, size) {
  const g = new THREE.PlaneGeometry(size||200, size||200);
  const m = new THREE.ShadowMaterial({ opacity: 0.4 });
  const mesh = new THREE.Mesh(g, m);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, y||0, 0);
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

const scenes3d = {};
let playerObj = null;
let levelPlatforms = [], levelHazards = [], levelGems = [], levelPowerups = [], levelEnemies = [], levelDecos = [];
let threeScene = null;

function initLevel(cfg) {
  if (threeScene) clearScene(threeScene);
  threeScene = new THREE.Scene(); threeScene.add(pMesh);
  levelPlatforms=[]; levelHazards=[]; levelGems=[]; levelPowerups=[]; levelEnemies=[]; levelDecos=[];
  G.gems=0; G.totalGems=cfg.gems||0; G.faseNome=cfg.nome||'';
  setPhase(cfg.nome||''); setGems(0, G.totalGems); showBossBar('',0);

  makeSkybox(threeScene, cfg.skyColor, cfg.fogColor, cfg.bgImage);
  addAmbientLights(threeScene, cfg.ambLight, cfg.sunLight);

  if (cfg.hasFloor !== false) addFloor(threeScene, cfg.floorY, cfg.floorSize);

  cfg.build(threeScene, levelPlatforms, levelHazards, levelGems, levelPowerups, levelEnemies, levelDecos);

  playerObj = makePlayer(threeScene);
  playerObj.pos.set(cfg.spawnX||0, cfg.spawnY||3, cfg.spawnZ||0);
  playerObj.vel.set(0,0,0); camYaw = 0;

  if (cfg.ambParticles) { for (let i=0; i<cfg.ambParticles; i++) { burst3(Math.random()*60-30, Math.random()*8, Math.random()*20-10, 1, cfg.ambR||0.3,cfg.ambG||0.5,cfg.ambB||1); } }
  showPhaseBanner(cfg.phaseNum, cfg.nome);
}

function updateDecos(dt, decos) {
  decos.forEach(d => { d.t += dt; d.mesh.position.y = d.baseY + Math.sin(d.t*0.8)*0.4; });
}

// ── FASE 1: PELOTAS — "O Começo de Tudo" ──────────────────────────
scenes3d['fase1'] = {
  _next:'_cutscene1', _spawnX:-18, _spawnY:3, _spawnZ:0,
  init() {
    initLevel({
      nome:'Pelotas', phaseNum:1, gems:5, skyColor:0x060814, fogColor:0x050712, ambLight:0x223366, sunLight:0x6677cc,
      bgImage: ARTES.fundoPelotas, floorY:-0.6, floorSize:160, spawnX:-18, spawnY:3, spawnZ:0, ambParticles:30, ambR:0.3, ambG:0.4, ambB:1.0,
      build(scene, plats, haz, gems, pups, ens, decos) {
        const f = makePlatform(scene,-20,0,0, 12,0.6,8, null, null, ARTES.chaoAsfalto); plats.push(f);
        const ps = [
          [-8,1.8,0,5,0.5,5], [-2,3.2,0,4,0.5,4], [4,4.8,0,4,0.5,4],
          [10,6.2,0,5,0.5,5], [16,7.5,0,5,0.5,5], [22,5.0,0,4,0.5,4],
          [28,3.5,0,5,0.5,5], [34,5.2,0,4,0.5,4], [40,4.0,0,6,0.5,6],
        ];
        ps.forEach(p => { plats.push(makePlatform(scene,...p, null, null, ARTES.plataformaPedra)); });

        // Gemas espalhadas — recompensam exploração vertical
        const gpos = [[-8,3.8,0],[4,6.8,0],[16,9.0,0],[28,5.0,0],[40,6.0,0]];
        gpos.forEach(p => gems.push(makeGem(scene,...p)));
        pups.push(makePowerup(scene, 10, 8.2, 0));
        pups.push(makePowerup(scene, 34, 7.2, 0));

        // Inimigos: 2 básicos de patrulha + 1 voador no alto
        ens.push(makeEnemy(scene, -4, 2.5, 0, 'basico', ARTES.vilaoPelotas));
        ens.push(makeEnemy(scene,  6, 4.0, 0, 'basico', ARTES.vilaoPelotas));
        ens.push(makeEnemy(scene, 18, 8.0, 0, 'voador', ARTES.vilaoPelotas));
        ens.push(makeEnemy(scene, 30, 3.5, 0, 'basico', ARTES.vilaoPelotas));
        ens.push(makeEnemy(scene, 38, 4.0, 0, 'tanque', ARTES.vilaoPelotas, {range:3}));
      }
    });
  },
  update(dt) {
    playerObj.update(dt, levelPlatforms, levelHazards, levelGems, levelPowerups, levelEnemies, null);
    updateEnemies(dt, levelEnemies, playerObj, levelPlatforms);
    updateDecos(dt, levelDecos);
    updateParticles(dt);
  },
  draw() { renderer.render(threeScene, camera); }
};

// ── CUTSCENE 1 — Pelotas → Rio: a notícia da viagem ────────────────
let cs1T=0; scenes3d['_cutscene1'] = {
  _next:'fase2',
  init() {
    cs1T=0;
    if (threeScene) clearScene(threeScene);
    threeScene = new THREE.Scene(); threeScene.add(pMesh);
    threeScene.background = new THREE.Color(0x060810);
    threeScene.add(new THREE.AmbientLight(0x223355,1));
    for (let i=0;i<20;i++) burst3(Math.random()*10-5,Math.random()*4,Math.random()*4-2, 1, 1,0.4,0.7);
    G.gems=0; G.totalGems=0; setPhase(''); setGems(0,0); showBossBar('',0);
    showDialogue('Sofia', 'Pelotas foi onde tudo começou… mas o Lucas Saulo está no Rio de Janeiro agora. Hora de seguir a jornada!');
  },
  update(dt) {
    cs1T+=dt;
    if (cs1T > 1.8 && cs1T < 1.9) showDialogue('Voz distante', 'Cada cidade guarda uma lembrança de quem você ama…');
    if (cs1T>3.5) { hideDialogue(); goTo('fase2'); }
    updateParticles(dt);
  },
  draw() { renderer.render(threeScene,camera); }
};

// ── FASE 2: RIO DE JANEIRO — "Entre Pedras e Mar" ─────────────────
scenes3d['fase2'] = {
  _next:'_cutscene2', _spawnX:-20, _spawnY:3, _spawnZ:0,
  init() {
    initLevel({
      nome:'Rio de Janeiro', phaseNum:2, gems:6, skyColor:0x060f20, fogColor:0x040c18, ambLight:0x1133aa, sunLight:0x4466ee,
      bgImage: ARTES.fundoRio, floorY:-0.6, floorSize:180, spawnX:-20, spawnY:3, spawnZ:0,
      build(scene, plats, haz, gems, pups, ens, decos) {
        const base = makePlatform(scene,-20,0,0, 10,0.5,8, null, null, ARTES.chaoAreia); plats.push(base);
        const ps2 = [
          [-12,2,0,5,0.5,5], [-6,3.5,0,4,0.5,4], [0,5,0,4,0.5,4],
          [6,6.5,0,4,0.5,4], [12,5,0,3,0.5,5],  [18,4,0,5,0.5,5],
          [24,6,0,4,0.5,4],  [30,5,0,5,0.5,5], [36,7,0,4,0.5,4], [42,5.5,0,6,0.5,6],
        ];
        ps2.forEach(p => plats.push(makePlatform(scene,...p, null, null, ARTES.plataformaPedra)));

        // Águas perigosas — travessias exigem timing
        [[-8,0,0],[2,0,0],[14,0,0],[22,0,0],[33,0,0]].forEach(([x,y,z]) => {
          haz.push(makeHazardTile(scene, x, y, z, 'water'));
          haz.push(makeHazardTile(scene, x+2, y, z, 'water'));
        });

        [[-12,4,0],[0,7,0],[12,7,0],[24,8,0],[30,7,0],[42,7.5,0]].forEach(p => gems.push(makeGem(scene,...p)));
        pups.push(makePowerup(scene,6,8.5,0));
        pups.push(makePowerup(scene,18,6,0));
        pups.push(makePowerup(scene,36,9,0));

        // Inimigos variados: voadores de gaivota, tanque-pedra, básicos de praia
        ens.push(makeEnemy(scene,-10,2.5,0,'basico', ARTES.vilaoRio));
        ens.push(makeEnemy(scene, 2,5.5,0,'voador', ARTES.vilaoRio));
        ens.push(makeEnemy(scene,12,6.5,0,'voador', ARTES.vilaoRio));
        ens.push(makeEnemy(scene,22,5.0,0,'tanque', ARTES.vilaoRio, {range:3}));
        ens.push(makeEnemy(scene,30,6.0,0,'basico', ARTES.vilaoRio));
        ens.push(makeEnemy(scene,38,7.5,0,'voador', ARTES.vilaoRio));
      }
    });
  },
  update(dt) {
    playerObj.update(dt, levelPlatforms, levelHazards, levelGems, levelPowerups, levelEnemies, null);
    updateEnemies(dt, levelEnemies, playerObj, levelPlatforms);
    updateDecos(dt, levelDecos);
    updateParticles(dt);
  },
  draw() { renderer.render(threeScene,camera); }
};

// ── CUTSCENE 2 — Rio → Tefé: rumo à Amazônia ──────────────────────
let cs2T=0; scenes3d['_cutscene2'] = {
  _next:'fase3',
  init() {
    cs2T=0;
    if (threeScene) clearScene(threeScene);
    threeScene = new THREE.Scene(); threeScene.add(pMesh);
    threeScene.background = new THREE.Color(0x040c06);
    threeScene.add(new THREE.AmbientLight(0x114422,1));
    for (let i=0;i<20;i++) burst3(Math.random()*10-5,Math.random()*4,Math.random()*4-2,1,0.3,1,0.5);
    G.gems=0; G.totalGems=0; setPhase(''); setGems(0,0); showBossBar('',0);
    showDialogue('Sofia', 'O Rio ficou para trás. Agora sigo até Tefé, no coração da Amazônia — quanto mais perto, mais forte fica esse sentimento.');
  },
  update(dt) {
    cs2T+=dt;
    if (cs2T > 1.8 && cs2T < 1.9) showDialogue('Voz da floresta', 'A distância encurta quando o motivo é grande o suficiente…');
    if (cs2T>3.5) { hideDialogue(); goTo('fase3'); }
    updateParticles(dt);
  },
  draw() { renderer.render(threeScene,camera); }
};

// ── FASE 3: TEFÉ — "Amazônia Profunda" ────────────────────────────
scenes3d['fase3'] = {
  _next:'_cutscene3', _spawnX:-22, _spawnY:3, _spawnZ:0,
  init() {
    initLevel({
      nome:'Tefé — Amazônia', phaseNum:3, gems:6, skyColor:0x040c08, fogColor:0x020804, ambLight:0x113322, sunLight:0x224422,
      bgImage: ARTES.fundoTefe, floorY:-0.6, floorSize:200, spawnX:-22, spawnY:3, spawnZ:0, ambParticles:40, ambR:0.2, ambG:0.9, ambB:0.3,
      build(scene, plats, haz, gems, pups, ens, decos) {
        const base = makePlatform(scene,-22,0,0, 10,0.5,8, null, null, ARTES.chaoGrama); plats.push(base);
        const ps3 = [
          [-14,2,0,5,0.5,5], [-8,3.5,0,4,0.5,4],  [-2,5,0,3,0.5,5],
          [5,6.5,0,4,0.5,4], [12,5,0,4,0.5,4],     [18,7,0,4,0.5,4],
          [24,5.5,0,3,0.5,5],[30,4,0,5,0.5,5],      [36,6,0,4,0.5,4],
          [42,7.5,0,4,0.5,4],[48,5,0,6,0.5,6],
        ];
        ps3.forEach(p => plats.push(makePlatform(scene,...p, null, null, ARTES.plataformaPedra)));

        // Lava + água alternadas — desafio combinado
        [[-10,0,0],[3,0,0],[16,0,0],[27,0,0],[39,0,0]].forEach(([x,y,z]) => {
          haz.push(makeHazardTile(scene,x,y,z,'lava'));
          haz.push(makeHazardTile(scene,x+2,y,z,'water'));
        });

        [[-14,4,0],[-2,7,0],[12,7,0],[24,7.5,0],[36,8,0],[48,7.5,0]].forEach(p => gems.push(makeGem(scene,...p)));
        pups.push(makePowerup(scene,5,8.5,0));
        pups.push(makePowerup(scene,42,9.5,0));

        // Mais inimigos — fase mais difícil, prepara para o boss
        ens.push(makeEnemy(scene,-12,2.5,0,'voador', ARTES.vilaoTefe));
        ens.push(makeEnemy(scene,  0,5.5,0,'tanque', ARTES.vilaoTefe, {range:3}));
        ens.push(makeEnemy(scene, 10,6.0,0,'voador', ARTES.vilaoTefe));
        ens.push(makeEnemy(scene, 20,7.5,0,'voador', ARTES.vilaoTefe));
        ens.push(makeEnemy(scene, 30,4.5,0,'tanque', ARTES.vilaoTefe, {range:3}));
        ens.push(makeEnemy(scene, 36,6.5,0,'basico', ARTES.vilaoTefe));
        ens.push(makeEnemy(scene, 46,5.5,0,'basico', ARTES.vilaoTefe));
      }
    });
  },
  update(dt) {
    playerObj.update(dt, levelPlatforms, levelHazards, levelGems, levelPowerups, levelEnemies, null);
    updateEnemies(dt, levelEnemies, playerObj, levelPlatforms);
    updateDecos(dt, levelDecos);
    updateParticles(dt);
  },
  draw() { renderer.render(threeScene,camera); }
};

// ── CUTSCENE 3 — Tefé → Confronto Final ───────────────────────────
let cs3T=0; scenes3d['_cutscene3'] = {
  _next:'boss',
  init() {
    cs3T=0;
    if (threeScene) clearScene(threeScene);
    threeScene = new THREE.Scene(); threeScene.add(pMesh);
    threeScene.background = new THREE.Color(0x0e0310);
    threeScene.add(new THREE.AmbientLight(0x330022,1));
    for (let i=0;i<24;i++) burst3(Math.random()*10-5,Math.random()*4,Math.random()*4-2,1,1,0.2,0.4);
    G.gems=0; G.totalGems=0; setPhase(''); setGems(0,0); showBossBar('',0);
    showDialogue('Sofia', 'Algo bloqueia o caminho até o Lucas Saulo… o Guardião das Sombras não vai me impedir de chegar até ele!');
  },
  update(dt) {
    cs3T+=dt;
    if (cs3T > 1.8 && cs3T < 1.9) showDialogue('Guardião das Sombras', 'Ninguém atravessa a distância sem provar sua força…');
    if (cs3T>3.5) { hideDialogue(); goTo('boss'); }
    updateParticles(dt);
  },
  draw() { renderer.render(threeScene,camera); }
};

// ── BOSS FASE — "Confronto Final" ──────────────────────────────────
scenes3d['boss'] = {
  _next:'_vitoria', _spawnX:-10, _spawnY:3, _spawnZ:0,
  init() {
    initLevel({
      nome:'Confronto Final', phaseNum:'', gems:0, skyColor:0x0e0310, fogColor:0x080110, ambLight:0x330022, sunLight:0xaa0044,
      bgImage: ARTES.fundoBoss, floorY:0, floorSize:60, spawnX:-10, spawnY:3, spawnZ:0,
      build(scene, plats, haz, gems, pups, ens, decos) {
        [[-8,2,0,6,0.5,6],[-2,4,0,4,0.5,4],[4,2,0,6,0.5,6], [-6,5,-3,3,0.5,3],[6,5,-3,3,0.5,3]]
          .forEach(p => plats.push(makePlatform(scene,...p,null,null,ARTES.plataformaPedra)));
        const boss = makeBoss(scene, 2, 3.5, 0);
        // Reforços surgem após 5s — referencia o array correto (levelEnemies via `ens`)
        setTimeout(()=>{
          if (bossRef && bossRef.alive) {
            ens.push(makeEnemy(scene,-8,3.0,0,'voador', ARTES.bossGuardiao));
            ens.push(makeEnemy(scene,10,3.0,0,'voador', ARTES.bossGuardiao));
            showCombo('REFORÇOS!');
          }
        }, 5000);
      }
    });
    showPhaseBanner('','CONFRONTO FINAL');
  },
  update(dt) {
    playerObj.update(dt, levelPlatforms, levelHazards, levelGems, levelPowerups, levelEnemies, bossRef);
    updateEnemies(dt, levelEnemies, playerObj, levelPlatforms);
    updateBoss(dt, bossRef, playerObj, threeScene);
    updateDecos(dt, levelDecos);
    updateParticles(dt);
  },
  draw() { renderer.render(threeScene,camera); }
};

// ── GAME OVER & VITÓRIA (pseudo-scenes) ──────────────────────────
scenes3d['_gameover'] = {
  init() { hideDialogue(); showEndScreen('FIM DA JORNADA','A distância não venceu desta vez. Tente outra vez!',G.pontos,'#ff3c3c'); },
  update() { if (pressed('Space')||pressed('Enter')) { hideEndScreen(); G.reset(); goTo('fase1'); } },
  draw() { if(threeScene) renderer.render(threeScene,camera); }
};

scenes3d['_vitoria'] = {
  init() {
    hideDialogue();
    showEndScreen('FELIZ DIA DOS NAMORADOS!','Onde quer que seja, desde que seja com você.',G.pontos,'#ff64b4');

    threeScene.background = new THREE.Color(0xffaacc);
    threeScene.fog = new THREE.FogExp2(0xff88aa, 0.015);

    const lucasMat = new THREE.SpriteMaterial({ map: ARTES.lucas, color: 0xffffff, transparent:true, alphaTest: 0.5 });
    const lucasSprite = new THREE.Sprite(lucasMat);
    lucasSprite.scale.set(1.5, 1.8, 1);
    lucasSprite.position.set(2, 4, 0);
    threeScene.add(lucasSprite);

    const heartGeo = new THREE.TorusGeometry(2, 0.2, 16, 100);
    const heartMat = new THREE.MeshStandardMaterial({color:0xff0066, emissive:0xff0033});
    const heart = new THREE.Mesh(heartGeo, heartMat);
    heart.position.set(0, 6, -3);
    threeScene.add(heart);

    for (let i=0;i<6;i++) setTimeout(()=>{ burst3(Math.random()*20-10,8,Math.random()*10-5, 20, Math.random(),Math.random(),Math.random()); },i*300);

    setTimeout(()=> showDialogue('Lucas Saulo', 'Você atravessou o Brasil inteiro por mim… feliz Dia dos Namorados, Sofia. ❤️'), 1500);
  },
  update(dt) { updateParticles(dt); if (pressed('Space')||pressed('Enter')) { hideEndScreen(); hideDialogue(); G.reset(); goTo('fase1'); } },
  draw() { if(threeScene) renderer.render(threeScene,camera); }
};

// ═══════════════════════════════════════════════════════════════════
// MAIN LOOP
// ═══════════════════════════════════════════════════════════════════
let menuState = 'menu'; let currentSceneKey = null;
function startScene(key) { currentSceneKey = key; activeScene = scenes3d[key]; if (activeScene) activeScene.init?.(); }
menuOv?.addEventListener('click', startGame);
window.addEventListener('keydown', e => { if (menuState==='menu' && e.code==='Space') startGame(); });
function startGame() {
  menuState = 'playing'; menuOv?.classList.add('hide'); setPaused(false);
  G.reset(); startScene('fase1');
}

buildPauseOverlay();
buildTouchControls();

threeScene = new THREE.Scene(); threeScene.background = new THREE.Color(0x07090f); threeScene.add(new THREE.AmbientLight(0x112244,0.5)); threeScene.add(pMesh);
renderer.render(threeScene, camera);

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (paused) { clearKeys(); return; }
  if (pendingScene) { const key = pendingScene; pendingScene = null; startScene(key); }
  if (activeScene) { activeScene.update?.(dt); activeScene.draw?.(); } else { renderer.render(threeScene, camera); }
  clearKeys();
}
requestAnimationFrame(loop);
