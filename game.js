// ═══════════════════════════════════════════════════════════════════
// A JORNADA DE SOFIA — game.js
// Tudo dentro de window.onload para garantir que o DOM e o Kaboom
// já estejam 100% prontos antes de qualquer chamada.
// ═══════════════════════════════════════════════════════════════════
window.addEventListener("load", function () {

// ── LOADING BAR ──────────────────────────────────────────────────
const loadBar = document.getElementById("load-bar");
const loadMsg = document.getElementById("load-status");
const loadScr = document.getElementById("loading-screen");
const msgs = [
  "Inicializando motor…",
  "Gerando partículas…",
  "Carregando memórias…",
  "Calibrando superpoderes…",
  "Quase lá…", "Pronto!"
];
let lp = 0;
const loadInt = setInterval(() => {
  lp = Math.min(lp + Math.random() * 18 + 4, 100);
  if (loadBar) loadBar.style.width = lp + "%";
  if (loadMsg) loadMsg.textContent = msgs[Math.min(Math.floor(lp / 18), msgs.length - 1)];
  if (lp >= 100) {
    clearInterval(loadInt);
    setTimeout(() => { if (loadScr) loadScr.classList.add("hidden"); }, 600);
  }
}, 220);

// ── HUD HELPERS ──────────────────────────────────────────────────
function hudUpdate(lives, mem, total, phase, power) {
  ["h1","h2","h3"].forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("empty", i >= lives);
  });
  const m = document.getElementById("hud-mem");
  if (m) m.textContent = mem + " / " + total;
  const p = document.getElementById("hud-phase");
  if (p) p.textContent = phase || "— — —";
  const pb = document.getElementById("power-bar");
  if (pb) pb.style.width = Math.min(power, 100) + "%";
}
function hudDamage() {
  const v = document.getElementById("vignette");
  if (!v) return;
  v.classList.add("damaged");
  setTimeout(() => v.classList.remove("damaged"), 420);
}
function showCombo(label) {
  const el = document.getElementById("combo-popup");
  if (!el) return;
  el.textContent = label;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 900);
}
function showFlash() {
  const f = document.getElementById("flash");
  if (!f) return;
  f.classList.add("active");
  setTimeout(() => f.classList.remove("active"), 90);
}
function showBossBar(name, pct) {
  const c = document.getElementById("boss-bar-container");
  const n = document.getElementById("boss-name-label");
  const b = document.getElementById("boss-bar-fill");
  if (c) c.classList.toggle("visible", pct > 0);
  if (n) n.textContent = name;
  if (b) b.style.width = pct + "%";
}
function showPhaseBanner(num, title) {
  const el = document.getElementById("phase-banner");
  const pn = document.getElementById("pb-num");
  const pt = document.getElementById("pb-title");
  if (!el) return;
  if (pn) pn.textContent = "FASE " + num;
  if (pt) pt.textContent = title;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2800);
}
function setSkillReady(key, ready) {
  const pill = document.getElementById("skill-" + key);
  const k    = document.getElementById("key-" + key);
  if (pill) pill.classList.toggle("ready", ready);
  if (k)    k.classList.toggle("active",  ready);
}

// ── KABOOM INIT ──────────────────────────────────────────────────
const k = kaboom({
  root:       document.getElementById("game-container"),
  width:      1280,
  height:     720,
  letterbox:  true,
  background: [7, 9, 15],
  global:     true,
});

// ── ESTADO GLOBAL ────────────────────────────────────────────────
const ESTADO = {
  vidas: 3, vidasMax: 3,
  lembrancas: 0, faseAtual: "fase1",
  pontos: 0, combo: 0, poder: 0, escudo: false,
  reset() {
    this.vidas = this.vidasMax; this.lembrancas = 0;
    this.pontos = 0; this.combo = 0; this.poder = 0; this.escudo = false;
  }
};

// ── PALETA ───────────────────────────────────────────────────────
const C = {
  PLAT:    [40, 45, 70],
  PLAT2:   [30, 60, 90],
  AGUA:    [0, 80, 200],
  LAVA:    [200, 50, 10],
  MEM:     [255, 60, 170],
  ENEMY:   [200, 40, 40],
  ENEMY2:  [80, 0, 180],
  BULLET:  [255, 100, 20],
  PODER:   [255, 200, 0],
  BOSS:    [160, 0, 60],
};

setGravity(2200);

// ── TILES ────────────────────────────────────────────────────────
const TILES = {
  tileWidth: 64, tileHeight: 64,
  tiles: {
    "=": () => [rect(64,20,{radius:5}), color(...C.PLAT),  area(), body({isStatic:true}), outline(2,rgb(80,90,130)), "plataforma"],
    "_": () => [rect(64,12,{radius:4}), pos(0,26), color(...C.PLAT2), area(), body({isStatic:true}), outline(1,rgb(60,120,180)), "plataforma"],
    "W": () => [rect(64,40), pos(0,24), color(...C.AGUA),  opacity(0.7), area(), "agua"],
    "L": () => [rect(64,40), pos(0,24), color(...C.LAVA),  opacity(0.9), area(), "lava"],
    "O": () => [circle(12), color(...C.MEM),   area({shape:new Circle(vec2(0),14)}), anchor("center"), "lembranca", {t:0}],
    "*": () => [circle(10), color(...C.PODER), area({shape:new Circle(vec2(0),12)}), anchor("center"), "powerup",   {t:0}],
    "#": () => [rect(64,64), color(25,28,48), area(), body({isStatic:true}), outline(1,rgb(50,55,90))],
  }
};

// ── PARTÍCULAS ───────────────────────────────────────────────────
function burst(x, y, n, r, g, b, radius) {
  for (let i = 0; i < n; i++) {
    add([
      circle(rand(2, radius || 6)),
      pos(x, y),
      color(r, g, b),
      move(rand(0,360), rand(60,260)),
      lifespan(rand(0.3,0.9), {fade:true}),
      anchor("center"),
      z(50),
    ]);
  }
}

// ── FUNDO ────────────────────────────────────────────────────────
function criarFundo(r, g, b, stars) {
  add([rect(4000,height()), pos(-200,0), color(r,g,b), z(-10), fixed()]);
  if (!stars) return;
  for (let i = 0; i < 120; i++) {
    add([
      circle(rand(0.5, 2.5)),
      pos(rand(-200,4000), rand(0,height())),
      color(255,255,255),
      opacity(rand(0.15,0.7)),
      z(-5),
      { t: rand(0,6.28), update() { this.opacity = 0.15+0.55*Math.abs(Math.sin(time()*rand(0.5,1.5)+this.t)); } }
    ]);
  }
}

// ── COLETÁVEIS (animação) ─────────────────────────────────────────
function animColetaveis() {
  onUpdate("lembranca", (o) => {
    if (!o.exists()) return;
    o.t = (o.t||0) + dt();
    o.pos.y += Math.sin(o.t*3)*0.8;
    o.color = rgb(255, 50+30*Math.sin(o.t*4), 150+50*Math.cos(o.t*3));
  });
  onUpdate("powerup", (o) => {
    if (!o.exists()) return;
    o.t = (o.t||0) + dt();
    o.pos.y += Math.sin(o.t*4)*0.6;
    o.color = rgb(255, 180+70*Math.sin(o.t*6), 0);
  });
}

// ── FLASH DE HIT ─────────────────────────────────────────────────
function flashObj(obj) {
  if (!obj || !obj.exists()) return;
  const orig = obj.color;
  obj.color = rgb(255,255,255);
  wait(0.07, () => { if (obj.exists()) obj.color = orig; });
}

// ════════════════════════════════════════════════════════════════
// CRIAÇÃO DA SOFIA
// ════════════════════════════════════════════════════════════════
function criarSofia(x, y) {
  const player = add([
    rect(28, 52, {radius:4}),
    pos(x, y),
    anchor("bot"),
    color(255, 80, 170),
    area({shape: new Rect(vec2(0,-26), 28, 52)}),
    body({jumpForce: 800}),
    outline(2, rgb(255,150,220)),
    z(30),
    "jogador",
    {
      invulneravel: false,
      escudoAtivo:  false,
      pulsoCD:      false,
      escudoCD:     false,
      _escudoHandle: null,

      sofrerDano() {
        if (this.invulneravel || this.escudoAtivo) return;
        ESTADO.vidas--;
        ESTADO.combo = 0;
        this.invulneravel = true;
        hudDamage(); shake(12);
        burst(this.pos.x, this.pos.y-26, 10, 255,80,80);
        if (ESTADO.vidas <= 0) { go("gameover"); return; }
        let p = true;
        const fx = loop(0.08, () => { this.opacity = p ? 0.2 : 1; p = !p; });
        wait(1.4, () => { fx.cancel(); this.opacity = 1; this.invulneravel = false; });
      },

      usarPulso() {
        if (this.pulsoCD || ESTADO.poder < 30) return;
        ESTADO.poder -= 30;
        this.pulsoCD = true;
        setSkillReady("x", false);
        showFlash(); shake(8);
        burst(this.pos.x, this.pos.y-26, 20, 255,200,0, 10);
        get("inimigo").forEach(e => {
          if (!e.exists()) return;
          const d = e.pos.dist(this.pos);
          if (d < 220) {
            e.receberDano(2);
            const dir = e.pos.sub(this.pos).unit();
            e.pos = e.pos.add(dir.scale(90));
          }
        });
        wait(0.1, () => showCombo("PULSO!"));
        wait(4, () => { this.pulsoCD = false; setSkillReady("x", ESTADO.poder >= 30); });
      },

      ativarEscudo() {
        if (this.escudoCD || this.escudoAtivo || ESTADO.poder < 20) return;
        ESTADO.poder -= 20;
        this.escudoAtivo = true;
        setSkillReady("z", false);
        burst(this.pos.x, this.pos.y-26, 12, 0,200,255, 7);
        if (this._escudoHandle) this._escudoHandle.cancel();
        this._escudoHandle = wait(3.5, () => {
          this.escudoAtivo = false;
          this.escudoCD = true;
          wait(5, () => {
            this.escudoCD = false;
            setSkillReady("z", ESTADO.poder >= 20);
          });
        });
      },
    }
  ]);

  // anel visual do escudo
  const anel = add([
    circle(38), pos(player.pos.x, player.pos.y-26),
    color(0,200,255), opacity(0),
    anchor("center"), z(29),
  ]);

  // controles
  onKeyDown("right", () => {
    if (!player.exists()) return;
    player.move(340, 0); player.flipX = false;
  });
  onKeyDown("left", () => {
    if (!player.exists()) return;
    player.move(-340, 0); player.flipX = true;
  });
  onKeyPress("space", () => {
    if (!player.exists()) return;
    if (player.isGrounded()) {
      player.jump();
      burst(player.pos.x, player.pos.y, 5, 180,180,255, 4);
    }
  });
  onKeyPress("x", () => { if (player.exists()) player.usarPulso(); });
  onKeyPress("z", () => { if (player.exists()) player.ativarEscudo(); });

  player.onUpdate(() => {
    if (!player.exists()) return;

    // câmera
    camPos(
      lerp(camPos().x, player.pos.x + 180, dt() * 5),
      lerp(camPos().y, height() / 2,        dt() * 3)
    );

    // abismo
    if (player.pos.y > 1600) {
      player.sofrerDano();
      if (ESTADO.vidas > 0) go(ESTADO.faseAtual);
      return;
    }

    // anel do escudo
    anel.pos = vec2(player.pos.x, player.pos.y - 26);
    anel.opacity = player.escudoAtivo
      ? 0.22 + 0.1 * Math.sin(time() * 8)
      : Math.max(0, anel.opacity - dt() * 3);

    // cor da Sofia
    if (player.escudoAtivo) player.color = rgb(100, 200, 255);
    else                     player.color = rgb(255, 80, 170);

    // HUD
    hudUpdate(ESTADO.vidas, ESTADO.lembrancas, window._totalMem||0, window._faseNome||"", ESTADO.poder);
    setSkillReady("x", ESTADO.poder >= 30 && !player.pulsoCD);
    setSkillReady("z", ESTADO.poder >= 20 && !player.escudoCD && !player.escudoAtivo);
  });

  return player;
}

// ════════════════════════════════════════════════════════════════
// INIMIGO
// ════════════════════════════════════════════════════════════════
function criarInimigo(x, y, tipo) {
  const cfgs = {
    basico: { cor:C.ENEMY,  hp:2, vel:120, w:30, h:38, pts:50  },
    voador: { cor:C.ENEMY2, hp:1, vel:160, w:26, h:26, pts:80  },
    tanque: { cor:[80,20,20],hp:6,vel:60,  w:48, h:52, pts:200 },
  };
  const cfg = cfgs[tipo] || cfgs.basico;

  const e = add([
    rect(cfg.w, cfg.h, {radius:3}),
    pos(x, y),
    anchor("bot"),
    color(...cfg.cor),
    area(),
    ...(tipo !== "voador" ? [body({isStatic:false})] : []),
    outline(2, rgb(255,60,60)),
    z(20),
    "inimigo",
    {
      hp: cfg.hp, hpMax: cfg.hp,
      vel: cfg.vel, dir: 1,
      spawnX: x, vt: 0, tipo,

      receberDano(dmg) {
        if (!this.exists()) return;
        this.hp -= dmg;
        flashObj(this);
        burst(this.pos.x, this.pos.y - cfg.h/2, 6, cfg.cor[0]||200, cfg.cor[1]||60, cfg.cor[2]||60);
        if (this.hp <= 0) {
          ESTADO.pontos += cfg.pts;
          ESTADO.combo++;
          ESTADO.poder = Math.min(ESTADO.poder + 12, 100);
          if (ESTADO.combo >= 3) showCombo("×" + ESTADO.combo + " COMBO!");
          burst(this.pos.x, this.pos.y - cfg.h/2, 16, cfg.cor[0]||200, cfg.cor[1]||60, cfg.cor[2]||60, 8);
          destroy(this);
        }
      }
    }
  ]);

  // mini barra de HP
  const hpW = cfg.w;
  const hpBar = add([
    rect(hpW, 4), pos(x - hpW/2, y - cfg.h - 10),
    color(200, 40, 40), z(21),
    { dono: e, update() {
      if (!e.exists()) { destroy(this); return; }
      this.pos = vec2(e.pos.x - hpW/2, e.pos.y - cfg.h - 10);
      this.width = hpW * Math.max(0, e.hp / e.hpMax);
    }}
  ]);

  e.onUpdate(() => {
    if (!e.exists()) return;
    if (tipo === "voador") {
      e.vt = (e.vt||0) + dt();
      e.pos.x += e.dir * e.vel * dt();
      e.pos.y += Math.sin(e.vt * 3) * 1.1;
      if (Math.abs(e.pos.x - e.spawnX) > 200) e.dir *= -1;
    } else {
      e.move(e.dir * e.vel, 0);
      if (Math.abs(e.pos.x - e.spawnX) > 250) e.dir *= -1;
    }
    if (e.pos.y > 1600) destroy(e);
  });

  e.onCollide("jogador", (p) => { if (p && p.sofrerDano) p.sofrerDano(); });
  return e;
}

// ════════════════════════════════════════════════════════════════
// PROJÉTIL
// ════════════════════════════════════════════════════════════════
function criarProjetil(x, y, dx) {
  const p = add([
    circle(6), pos(x, y),
    color(...C.BULLET),
    area({shape: new Circle(vec2(0),7)}),
    anchor("center"),
    move(vec2(dx > 0 ? 1 : -1, 0), 420),
    lifespan(2.5),
    z(22), "projetil",
  ]);
  p.onCollide("jogador", (pl) => { if (pl && pl.sofrerDano) pl.sofrerDano(); destroy(p); });
  p.onCollide("plataforma", () => destroy(p));
}

// ════════════════════════════════════════════════════════════════
// BOSS
// ════════════════════════════════════════════════════════════════
function criarBoss(x, y, nome, hpMax) {
  const boss = add([
    rect(80, 90, {radius:6}),
    pos(x, y), anchor("bot"),
    color(...C.BOSS),
    area(), body({isStatic:false}),
    outline(3, rgb(255,80,150)),
    z(28), "boss", "inimigo",
    {
      hp: hpMax, hpMax, nome,
      dir: 1, fase: 1, atTimer: 0, spawnX: x,

      receberDano(dmg) {
        if (!this.exists()) return;
        this.hp -= dmg; shake(6); flashObj(this);
        burst(this.pos.x, this.pos.y-45, 8, 220,0,80);
        const pct = Math.max(0, this.hp / this.hpMax * 100);
        showBossBar(this.nome, pct);
        if (this.hp <= 0) {
          ESTADO.pontos += 1000;
          ESTADO.poder = Math.min(ESTADO.poder+40, 100);
          burst(this.pos.x, this.pos.y-45, 40, 255,80,150, 12);
          showBossBar(this.nome, 0);
          destroy(this);
          wait(0.8, () => showCombo("BOSS DERROTADO!"));
        } else if (this.hp < hpMax * 0.4 && this.fase === 1) {
          this.fase = 2;
          this.color = rgb(255,0,80);
          shake(20); showCombo("FÚRIA DO CHEFE!");
        }
      }
    }
  ]);

  boss.onUpdate(() => {
    if (!boss.exists()) return;
    const spd = boss.fase === 2 ? 150 : 85;
    boss.move(boss.dir * spd, 0);
    if (Math.abs(boss.pos.x - boss.spawnX) > 330) boss.dir *= -1;
    boss.atTimer += dt();
    const cd = boss.fase === 2 ? 1.1 : 2.0;
    if (boss.atTimer >= cd) {
      boss.atTimer = 0;
      criarProjetil(boss.pos.x, boss.pos.y - 45, -boss.dir);
      if (boss.fase === 2) wait(0.28, () => criarProjetil(boss.pos.x, boss.pos.y - 45, boss.dir));
    }
  });

  boss.onCollide("jogador", (p) => { if (p && p.sofrerDano) p.sofrerDano(); });
  showBossBar(nome, 100);
  return boss;
}

// ════════════════════════════════════════════════════════════════
// COLETAS (handler genérico)
// ════════════════════════════════════════════════════════════════
function registrarColetas(player, total, proxFase) {
  player.onCollide("lembranca", (b) => {
    if (!b || !b.exists()) return;
    destroy(b); ESTADO.lembrancas++;
    ESTADO.poder = Math.min(ESTADO.poder + 8, 100);
    burst(b.pos.x, b.pos.y, 10, 255,60,170);
    if (ESTADO.lembrancas >= total) wait(0.6, () => go(proxFase));
  });
  player.onCollide("powerup", (b) => {
    if (!b || !b.exists()) return;
    destroy(b);
    ESTADO.poder = Math.min(ESTADO.poder + 35, 100);
    showCombo("PODER +35!");
    burst(b.pos.x, b.pos.y, 14, 255,210,0, 7);
  });
}

// ════════════════════════════════════════════════════════════════
// ── CENA: MENU ──────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════
scene("menu", () => {
  showBossBar("", 0);
  add([rect(width(), height()), color(7,9,15), fixed(), z(0)]);

  for (let i = 0; i < 140; i++) {
    add([
      circle(rand(0.4, 2.2)),
      pos(rand(0,width()), rand(0,height())),
      color(255,255,255), opacity(rand(0.1,0.6)), z(1),
      { t: rand(0,6.28), update() { this.opacity = 0.1+0.5*Math.abs(Math.sin(time()*rand(0.3,1.2)+this.t)); } }
    ]);
  }

  add([
    text("A JORNADA DE SOFIA", {size:58}),
    pos(width()/2, height()*0.27), anchor("center"),
    fixed(), z(10), color(255,80,170),
    { t:0, update() { this.t+=dt(); this.scale=vec2(1+0.012*Math.sin(this.t*2)); } }
  ]);
  add([
    text("Uma história de amor em pixels", {size:20}),
    pos(width()/2, height()*0.39), anchor("center"),
    fixed(), z(10), color(160,140,180)
  ]);
  add([
    text("←→  Mover    ESPAÇO  Pular\nX  Pulso de Energia  (30 poder)\nZ  Escudo  (20 poder)", {size:17, align:"center", width:640}),
    pos(width()/2, height()*0.57), anchor("center"),
    fixed(), z(10), color(120,130,160)
  ]);

  const btn = add([
    text("[ PRESSIONE ESPAÇO ]", {size:28}),
    pos(width()/2, height()*0.78), anchor("center"),
    fixed(), z(10), color(255,255,255)
  ]);
  loop(0.55, () => { if (btn.exists()) btn.opacity = btn.opacity > 0.6 ? 0.2 : 1; });

  onKeyPress("space", () => { ESTADO.reset(); go("fase1"); });
  onKeyPress("enter", () => { ESTADO.reset(); go("fase1"); });
});

// ════════════════════════════════════════════════════════════════
// ── FASE 1: PELOTAS ──────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════
scene("fase1", () => {
  ESTADO.faseAtual = "fase1"; ESTADO.lembrancas = 0;
  window._totalMem = 3; window._faseNome = "Pelotas";
  showPhaseBanner(1, "Pelotas"); showBossBar("", 0);

  criarFundo(15, 18, 35, true);

  const mapa = [
    "                                                                   ",
    "                                                                   ",
    "                                          *                        ",
    "                                          _                        ",
    "                          O                                 O      ",
    "               __                        __               ____     ",
    "                                                                   ",
    "      O                                                            ",
    "     __                                                            ",
    "                                                                   ",
    "=====    ====    ======     ====     ====     ====     ====   =====",
  ];
  addLevel(mapa, {...TILES, pos: vec2(0, height() - mapa.length * 64)});
  animColetaveis();

  const player = criarSofia(160, height() - 200);
  registrarColetas(player, 3, "cutscene1");

  criarInimigo(480,  height() - 64*2, "basico");
  criarInimigo(720,  height() - 64*2, "basico");
  criarInimigo(1000, height() - 64*2, "voador");

  add([text("7 de Set. 2024 · O primeiro oi…", {size:22, align:"center"}),
    pos(width()/2, 80), fixed(), anchor("center"), color(180,180,200), opacity(0.6), z(8)]);
});

// ════════════════════════════════════════════════════════════════
// ── CUTSCENE 1 ───────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════
scene("cutscene1", () => {
  add([rect(width(),height()), color(10,10,18), fixed(), z(0)]);
  add([
    text("A primeira mensagem\ncruzou o país…", {size:44, align:"center", width:900}),
    pos(width()/2, height()*0.42), anchor("center"), fixed(), z(10), color(255,200,220)
  ]);
  add([
    text("De Pelotas ao Rio de Janeiro", {size:22, align:"center"}),
    pos(width()/2, height()*0.62), anchor("center"), fixed(), z(10), color(120,140,180)
  ]);
  wait(3.2, () => go("fase2"));
});

// ════════════════════════════════════════════════════════════════
// ── FASE 2: RIO DE JANEIRO ───────────────────────────────────────
// ════════════════════════════════════════════════════════════════
scene("fase2", () => {
  ESTADO.faseAtual = "fase2"; ESTADO.lembrancas = 0;
  window._totalMem = 4; window._faseNome = "Rio de Janeiro";
  showPhaseBanner(2, "Rio de Janeiro"); showBossBar("", 0);

  criarFundo(10, 30, 55, false);

  const mapa = [
    "                                                                         ",
    "                                                                         ",
    "                                    *                         O          ",
    "                                    _                        ____        ",
    "           O                                 O                           ",
    "          ___                       __      ___                          ",
    "                   O                                                     ",
    "                  __                                                     ",
    "                                                                         ",
    "====  WWW  ==   WWWWW  ====   ==  WWWWW   ====  WWWWW  ===  WWWW   =====",
  ];
  addLevel(mapa, {...TILES, pos: vec2(0, height() - mapa.length * 64)});
  animColetaveis();

  const player = criarSofia(120, height() - 200);
  registrarColetas(player, 4, "cutscene2");
  player.onCollide("agua", () => { player.sofrerDano(); if (ESTADO.vidas > 0) go("fase2"); });

  criarInimigo(360,  height()-64*2, "basico");
  criarInimigo(600,  height()-64*2, "voador");
  criarInimigo(860,  height()-64*2, "voador");
  criarInimigo(1100, height()-64*2, "tanque");

  add([text("O Rio que une caminhos", {size:22, align:"center"}),
    pos(width()/2, 80), fixed(), anchor("center"), color(140,180,220), opacity(0.6), z(8)]);
});

// ════════════════════════════════════════════════════════════════
// ── CUTSCENE 2 ───────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════
scene("cutscene2", () => {
  add([rect(width(),height()), color(8,18,8), fixed(), z(0)]);
  add([
    text("E então, dois caminhos\nse tornaram um.", {size:44, align:"center", width:900}),
    pos(width()/2, height()*0.42), anchor("center"), fixed(), z(10), color(180,255,200)
  ]);
  add([
    text("Próximo destino: Tefé — Amazônia", {size:22, align:"center"}),
    pos(width()/2, height()*0.62), anchor("center"), fixed(), z(10), color(100,170,120)
  ]);
  wait(3.2, () => go("fase3"));
});

// ════════════════════════════════════════════════════════════════
// ── FASE 3: TEFÉ ─────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════
scene("fase3", () => {
  ESTADO.faseAtual = "fase3"; ESTADO.lembrancas = 0;
  window._totalMem = 3; window._faseNome = "Tefé — Amazônia";
  showPhaseBanner(3, "Tefé — Amazônia"); showBossBar("", 0);

  criarFundo(8, 40, 18, false);

  const mapa = [
    "                                                                              ",
    "                                                                              ",
    "                                                   O                          ",
    "                                                  ___                         ",
    "                    O                    *                                    ",
    "                   ___                   _                    O               ",
    "         O                                              _    ___              ",
    "        ___                                                                   ",
    "                                                                              ",
    "====  WWWWW  =   LLLL  ===  WWWWWW  ==  LLLL  ===  WWWWWW  =  LLLL  ===  ===",
  ];
  addLevel(mapa, {...TILES, pos: vec2(0, height() - mapa.length * 64)});
  animColetaveis();

  const player = criarSofia(120, height() - 200);
  registrarColetas(player, 3, "boss_fase3");
  player.onCollide("agua", () => { player.sofrerDano(); if (ESTADO.vidas > 0) go("fase3"); });
  player.onCollide("lava", () => { player.sofrerDano(); if (ESTADO.vidas > 0) go("fase3"); });

  criarInimigo(400,  height()-64*2, "voador");
  criarInimigo(650,  height()-64*2, "tanque");
  criarInimigo(920,  height()-64*2, "voador");
  criarInimigo(1180, height()-64*2, "basico");
  criarInimigo(1420, height()-64*2, "voador");

  add([text("Onde a floresta guarda segredos", {size:22, align:"center"}),
    pos(width()/2, 80), fixed(), anchor("center"), color(120,200,140), opacity(0.6), z(8)]);
});

// ════════════════════════════════════════════════════════════════
// ── BOSS ─────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════
scene("boss_fase3", () => {
  ESTADO.faseAtual = "boss_fase3";
  window._faseNome = "BOSS";
  showPhaseBanner("", "CONFRONTO FINAL");

  criarFundo(20, 5, 25, true);

  const mapa = [
    "                                                                ",
    "                                                                ",
    "                                                                ",
    "          __                  __                  __            ",
    "                                                                ",
    "################################################################",
  ];
  addLevel(mapa, {...TILES, pos: vec2(0, height() - mapa.length * 64)});

  const player = criarSofia(160, height() - 180);
  const boss   = criarBoss(700, height() - 64, "GUARDIÃO DAS SOMBRAS", 14);

  // pular sobre o boss causa dano
  player.onCollide("boss", (b) => {
    if (!b || !b.exists()) return;
    if (!player.isGrounded()) {
      b.receberDano(1);
      player.jump(500);
    } else {
      player.sofrerDano();
    }
  });

  // pulso também atinge o boss (já está no loop de get("inimigo"))

  // extra inimigos aos 5s
  wait(5, () => {
    if (get("boss").length) {
      criarInimigo(280, height()-160, "voador");
      criarInimigo(920, height()-160, "voador");
    }
  });

  // vitória quando boss morrer
  onUpdate(() => {
    if (!get("boss").length) wait(1.2, () => go("vitoria"));
  });

  add([text("⚠  CHEFE FINAL  ⚠", {size:22, align:"center"}),
    pos(width()/2, 80), fixed(), anchor("center"), color(255,80,80), opacity(0.8), z(8)]);
});

// ════════════════════════════════════════════════════════════════
// ── GAME OVER ────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════
scene("gameover", () => {
  showBossBar("", 0);
  add([rect(width(),height()), color(25,5,5), fixed(), z(0)]);
  add([text("FIM DA JORNADA", {size:62}),
    pos(width()/2, height()*0.35), anchor("center"), fixed(), z(10), color(255,60,60)]);
  add([text("Pontuação: " + ESTADO.pontos, {size:26}),
    pos(width()/2, height()*0.50), anchor("center"), fixed(), z(10), color(200,160,160)]);
  add([text("A distância não venceu desta vez.", {size:20}),
    pos(width()/2, height()*0.60), anchor("center"), fixed(), z(10), color(160,100,100)]);

  const btn = add([text("[ ESPAÇO ] tentar de novo", {size:24}),
    pos(width()/2, height()*0.74), anchor("center"), fixed(), z(10), color(220,100,100)]);
  loop(0.6, () => { if (btn.exists()) btn.opacity = btn.opacity > 0.6 ? 0.2 : 1; });

  onKeyPress("space", () => go("menu"));
  onKeyPress("enter", () => go("menu"));
});

// ════════════════════════════════════════════════════════════════
// ── VITÓRIA ──────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════
scene("vitoria", () => {
  showBossBar("", 0);
  add([rect(width(),height()), color(10,18,12), fixed(), z(0)]);

  loop(0.06, () => {
    if (!chance(0.7)) return;
    const cols = [
      rgb(255,80,170), rgb(255,210,0),
      rgb(0,200,255),  rgb(120,255,120),
    ];
    const c = choose(cols);
    add([
      rect(rand(8,18), rand(8,18), {radius:rand(0,4)}),
      pos(rand(0,width()), -20),
      color(c.r, c.g, c.b),
      move(DOWN, rand(140,340)),
      rotate(rand(0,360)),
      lifespan(4, {fade:true}),
      z(15),
      { vx: rand(-40,40), update() { this.pos.x += this.vx*dt(); this.angle += rand(-60,60)*dt(); } }
    ]);
  });

  add([text("FELIZ DIA DOS NAMORADOS!", {size:52}),
    pos(width()/2, height()*0.24), anchor("center"), fixed(), z(10), color(255,100,180)]);
  add([text("Pontuação Final:  " + ESTADO.pontos, {size:26}),
    pos(width()/2, height()*0.42), anchor("center"), fixed(), z(10), color(255,220,100)]);
  add([text("De Pelotas ao Rio, e agora em Tefé.\nOnde quer que seja, desde que seja com você.", {size:26, align:"center", width:900}),
    pos(width()/2, height()*0.57), anchor("center"), fixed(), z(10), color(220,230,255)]);
  add([text("Com amor.  ♥", {size:26}),
    pos(width()/2, height()*0.77), anchor("center"), fixed(), z(10), color(255,120,180),
    { t:0, update() { this.t+=dt(); this.scale=vec2(1+0.06*Math.sin(this.t*3)); } }]);

  onKeyPress("space", () => { ESTADO.reset(); go("menu"); });
  onKeyPress("enter", () => { ESTADO.reset(); go("menu"); });
});

// ════════════════════════════════════════════════════════════════
// START
// ════════════════════════════════════════════════════════════════
go("menu");

}); // fim do window.addEventListener("load", ...)
