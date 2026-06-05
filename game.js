// ═══════════════════════════════════════════════════════════════════
// LOADING FAKE PROGRESS
// ═══════════════════════════════════════════════════════════════════
const loadBar   = document.getElementById("load-bar");
const loadMsg   = document.getElementById("load-status");
const loadScr   = document.getElementById("loading-screen");
const msgs = [
  "Inicializando motor…",
  "Gerando partículas…",
  "Carregando memórias…",
  "Calibrando superpoderes…",
  "Quase lá…",
  "Pronto!"
];
let lp = 0;
const loadInt = setInterval(() => {
  lp = Math.min(lp + Math.random() * 18 + 4, 100);
  loadBar.style.width = lp + "%";
  loadMsg.textContent = msgs[Math.min(Math.floor(lp / 18), msgs.length-1)];
  if (lp >= 100) { clearInterval(loadInt); setTimeout(() => loadScr.classList.add("hidden"), 600); }
}, 220);

// ═══════════════════════════════════════════════════════════════════
// HUD DOM HELPERS
// ═══════════════════════════════════════════════════════════════════
function hudUpdate(lives, mem, total, phase, power) {
  ["h1","h2","h3"].forEach((id, i) => {
    document.getElementById(id).classList.toggle("empty", i >= lives);
  });
  document.getElementById("hud-mem").textContent   = `${mem} / ${total}`;
  document.getElementById("hud-phase").textContent = phase || "— — —";
  document.getElementById("power-bar").style.width = Math.min(power, 100) + "%";
}

function hudDamage() {
  const v = document.getElementById("vignette");
  v.classList.add("damaged");
  setTimeout(() => v.classList.remove("damaged"), 420);
}

function showCombo(label) {
  const el = document.getElementById("combo-popup");
  el.textContent = label;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 900);
}

function showFlash() {
  const f = document.getElementById("flash");
  f.classList.add("active");
  setTimeout(() => f.classList.remove("active"), 90);
}

function showBossBar(name, pct) {
  document.getElementById("boss-bar-container").classList.toggle("visible", pct > 0);
  document.getElementById("boss-name-label").textContent = name;
  document.getElementById("boss-bar-fill").style.width   = pct + "%";
}

function showPhaseBanner(num, title) {
  const el = document.getElementById("phase-banner");
  document.getElementById("pb-num").textContent   = `FASE ${num}`;
  document.getElementById("pb-title").textContent = title;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2800);
}

function setSkillReady(key, ready) {
  const pill = document.getElementById(`skill-${key}`);
  const k    = document.getElementById(`key-${key}`);
  if (pill) pill.classList.toggle("ready", ready);
  if (k)    k.classList.toggle("active",  ready);
}

// ═══════════════════════════════════════════════════════════════════
// KABOOM INIT
// ═══════════════════════════════════════════════════════════════════
kaboom({
  root:       document.getElementById("game-container"),
  width:      1280,
  height:     720,
  letterbox:  true,
  background: [7, 9, 15],
  global:     true,
  crisp:      false,
});

// ═══════════════════════════════════════════════════════════════════
// GLOBAL STATE
// ═══════════════════════════════════════════════════════════════════
const ESTADO = {
  vidas:      3,
  vidasMax:   3,
  lembrancas: 0,
  faseAtual:  "fase1",
  pontos:     0,
  combo:      0,
  poder:      0,   // 0-100
  escudo:     false,
  reset() {
    this.vidas = this.vidasMax;
    this.lembrancas = 0;
    this.pontos = 0;
    this.combo  = 0;
    this.poder  = 0;
    this.escudo = false;
  }
};

// ─── PALETA ──────────────────────────────────────────────────────
const COR = {
  PLATAFORMA:  [40,  45,  70],
  PLATAFORMA2: [30,  60,  90],
  AGUA:        [0,   80, 200],
  LAVA:        [200, 50,  10],
  LEMBRANCA:   [255, 60, 170],
  INIMIGO:     [200, 40,  40],
  INIMIGO2:    [60,  0,  160],
  PROJETIL:    [255, 100, 20],
  PODER:       [255, 200,  0],
  ESCUDO:      [0,  200, 255],
  BOSS:        [160,  0,  60],
};

setGravity(2200);

// ═══════════════════════════════════════════════════════════════════
// TILES (tile-map renderer)
// ═══════════════════════════════════════════════════════════════════
const TILES = {
  tileWidth:  64,
  tileHeight: 64,
  tiles: {
    // plataformas
    "=": () => [
      rect(64, 20, { radius: 6 }),
      color(...COR.PLATAFORMA),
      area(),
      body({ isStatic: true }),
      outline(2, rgb(80, 90, 130)),
      "plataforma",
    ],
    "_": () => [
      rect(64, 12, { radius: 4 }),
      pos(0, 26),
      color(...COR.PLATAFORMA2),
      area(),
      body({ isStatic: true }),
      outline(1, rgb(60, 120, 180)),
      "plataforma",
    ],
    // hazards
    "W": () => [
      rect(64, 40),
      pos(0, 24),
      color(...COR.AGUA),
      opacity(0.7),
      area(),
      "agua",
    ],
    "L": () => [
      rect(64, 40),
      pos(0, 24),
      color(...COR.LAVA),
      opacity(0.9),
      area(),
      "lava",
    ],
    // colecionáveis
    "O": () => [
      circle(12),
      color(...COR.LEMBRANCA),
      area({ shape: new Circle(vec2(0), 14) }),
      anchor("center"),
      "lembranca",
      { tempo: 0 },
    ],
    // power-up (estrela)
    "*": () => [
      polygon([vec2(0,-14), vec2(4,-5), vec2(14,-5), vec2(6,2),
               vec2(9,13),  vec2(0,7),  vec2(-9,13), vec2(-6,2),
               vec2(-14,-5),vec2(-4,-5)]),
      color(...COR.PODER),
      area({ shape: new Circle(vec2(0), 14) }),
      anchor("center"),
      "powerup",
      { tempo: 0 },
    ],
    // blocos sólidos decorativos
    "#": () => [
      rect(64, 64),
      color(25, 28, 48),
      area(),
      body({ isStatic: true }),
      outline(1, rgb(50, 55, 90)),
      "solido",
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════
// CRIAÇÃO DA SOFIA (JOGADORA)
// ═══════════════════════════════════════════════════════════════════
function criarSofia(x, y) {
  const BASE_SPEED  = 340;
  const JUMP_FORCE  = 800;
  const SUPERVEL    = 580;

  const player = add([
    rect(28, 52, { radius: 4 }),
    pos(x, y),
    anchor("bot"),
    color(255, 80, 170),
    area({ shape: new Rect(vec2(0, -26), 28, 52) }),
    body({ jumpForce: JUMP_FORCE }),
    outline(2, rgb(255, 150, 220)),
    z(30),
    "jogador",
    {
      invulneravel: false,
      superAtivo:   false,
      escudoAtivo:  false,
      escudoTimer:  null,
      pulsoCD:      false,
      escudoCD:     false,
      comboTimer:   null,

      sofrerDano() {
        if (this.invulneravel || ESTADO.escudo) return;
        ESTADO.vidas--;
        ESTADO.combo = 0;
        this.invulneravel = true;
        hudDamage();
        shake(12);
        // partículas de dano
        spawnParticulas(this.pos.x, this.pos.y - 26, 12, rgb(255,80,80), 6);

        if (ESTADO.vidas <= 0) { go("gameover"); return; }

        let piscando = true;
        const fx = loop(0.08, () => {
          this.opacity = piscando ? 0.25 : 1;
          piscando = !piscando;
        });
        wait(1.4, () => { if (fx) fx.cancel(); this.opacity = 1; this.invulneravel = false; });
      },

      // ── PULSO DE ENERGIA ──────────────────────────
      usarPulso() {
        if (this.pulsoCD || ESTADO.poder < 30) return;
        ESTADO.poder -= 30;
        this.pulsoCD = true;
        setSkillReady("x", false);
        showFlash();
        shake(8);
        spawnParticulas(this.pos.x, this.pos.y - 26, 20, rgb(255,200,0), 10);
        // empurrar todos os inimigos próximos
        get("inimigo").forEach(e => {
          const d = e.pos.dist(this.pos);
          if (d < 220) {
            e.hurt(2);
            const dir = e.pos.sub(this.pos).unit();
            e.pos = e.pos.add(dir.scale(100));
          }
        });
        wait(0.08, () => showCombo("PULSO!"));
        wait(4, () => { this.pulsoCD = false; if (ESTADO.poder >= 30) setSkillReady("x", true); });
      },

      // ── ESCUDO ────────────────────────────────────
      ativarEscudo() {
        if (this.escudoCD || ESTADO.poder < 20 || this.escudoAtivo) return;
        ESTADO.poder -= 20;
        this.escudoCD  = false;
        this.escudoAtivo = true;
        ESTADO.escudo  = true;
        this.outline   = true;
        setSkillReady("z", false);
        if (this.escudoTimer) this.escudoTimer.cancel();
        this.escudoTimer = wait(3.5, () => {
          this.escudoAtivo = false;
          ESTADO.escudo    = false;
          this.escudoCD    = true;
          wait(5, () => { this.escudoCD = false; if (ESTADO.poder >= 20) setSkillReady("z", true); });
        });
      },
    }
  ]);

  // ── CORPO DO ESCUDO (visual) ──────────────────────
  const shieldCircle = add([
    circle(38),
    pos(player.pos),
    color(0, 200, 255),
    opacity(0),
    z(29),
    anchor("center"),
    "shield-visual",
  ]);

  // ── INPUT ─────────────────────────────────────────
  onKeyDown("right", () => {
    if (player.exists()) {
      const speed = player.superAtivo ? SUPERVEL : BASE_SPEED;
      player.move(speed, 0);
      player.flipX = false;
    }
  });
  onKeyDown("left", () => {
    if (player.exists()) {
      const speed = player.superAtivo ? SUPERVEL : BASE_SPEED;
      player.move(-speed, 0);
      player.flipX = true;
    }
  });
  onKeyPress("space", () => {
    if (player.exists() && player.isGrounded()) {
      player.jump();
      spawnParticulas(player.pos.x, player.pos.y, 5, rgb(200,200,255), 4);
    }
  });
  onKeyPress("x", () => { if (player.exists()) player.usarPulso(); });
  onKeyPress("z", () => { if (player.exists()) player.ativarEscudo(); });

  // ── ON UPDATE ─────────────────────────────────────
  player.onUpdate(() => {
    if (!player.exists()) return;

    // câmera suave
    const tx = player.pos.x + 180;
    const ty = height() / 2;
    camPos(lerp(camPos().x, tx, dt() * 5), lerp(camPos().y, ty, dt() * 3));

    // queda no abismo
    if (player.pos.y > 1600) {
      player.sofrerDano();
      if (ESTADO.vidas > 0) go(ESTADO.faseAtual);
      return;
    }

    // visual do escudo
    shieldCircle.pos = vec2(player.pos.x, player.pos.y - 26);
    shieldCircle.opacity = player.escudoAtivo
      ? 0.22 + 0.1 * Math.sin(time() * 8)
      : Math.max(0, shieldCircle.opacity - dt() * 3);

    // cor da Sofia (modo super ativo)
    if (player.superAtivo) {
      player.color = rgb(
        255,
        120 + 60 * Math.sin(time() * 10),
        0 + 80 * Math.cos(time() * 7)
      );
    } else if (player.escudoAtivo) {
      player.color = rgb(100, 200, 255);
    } else {
      player.color = rgb(255, 80, 170);
    }

    // atualiza HUD DOM
    hudUpdate(
      ESTADO.vidas,
      ESTADO.lembrancas,
      window._totalMem || 0,
      window._faseNome || "",
      ESTADO.poder
    );
    // skill readiness
    setSkillReady("x", ESTADO.poder >= 30 && !player.pulsoCD);
    setSkillReady("z", ESTADO.poder >= 20 && !player.escudoCD && !player.escudoAtivo);
  });

  return player;
}

// ═══════════════════════════════════════════════════════════════════
// INIMIGO BASE
// ═══════════════════════════════════════════════════════════════════
function criarInimigo(x, y, tipo) {
  const cfg = {
    basico:   { cor: COR.INIMIGO,  hp: 2, velocidade: 120, tam: [30, 38], tag: "inimigo",   pontos: 50  },
    voador:   { cor: COR.INIMIGO2, hp: 1, velocidade: 160, tam: [26, 26], tag: "inimigoVoo", pontos: 80  },
    tanque:   { cor: [80, 20, 20], hp: 6, velocidade:  60, tam: [48, 52], tag: "inimigo",   pontos: 200 },
  };
  const c = cfg[tipo] || cfg.basico;

  const e = add([
    rect(...c.tam, { radius: 3 }),
    pos(x, y),
    anchor("bot"),
    color(...c.cor),
    area(),
    ...(tipo !== "voador" ? [body({ isStatic: false })] : []),
    outline(2, rgb(255, 60, 60)),
    z(20),
    c.tag,
    "inimigo",
    {
      hp:         c.hp,
      velocidade: c.velocidade,
      dir:        1,
      tempoVoo:   0,
      tipo,
      hurt(dmg) {
        this.hp -= dmg;
        flash(this);
        spawnParticulas(this.pos.x, this.pos.y - 20, 6, rgb(255, 60, 60), 4);
        if (this.hp <= 0) {
          ESTADO.pontos  += c.pontos;
          ESTADO.combo++;
          ESTADO.poder    = Math.min(ESTADO.poder + 12, 100);
          if (ESTADO.combo >= 3) showCombo(`×${ESTADO.combo} COMBO!`);
          spawnParticulas(this.pos.x, this.pos.y - 20, 18, rgb(...c.cor), 8);
          destroy(this);
          destroy(shieldCircle(this));
        }
      }
    }
  ]);

  // barra de HP mini
  const hpBar = add([
    rect(c.tam[0], 4),
    pos(x, y - c.tam[1] - 8),
    anchor("bot"),
    color(200, 40, 40),
    z(21),
    { dono: e },
  ]);
  hpBar.onUpdate(() => {
    if (!e.exists()) { destroy(hpBar); return; }
    hpBar.pos = vec2(e.pos.x - c.tam[0] / 2, e.pos.y - c.tam[1] - 8);
    hpBar.width = c.tam[0] * (e.hp / c.hp);
  });

  // AI de movimento
  e.onUpdate(() => {
    if (!e.exists()) return;
    if (tipo === "voador") {
      e.tempoVoo += dt();
      e.pos.x += e.dir * e.velocidade * dt();
      e.pos.y += Math.sin(e.tempoVoo * 3) * 1.2;
      // inverte se sair muito longe do spawn
      if (Math.abs(e.pos.x - x) > 200) e.dir *= -1;
    } else {
      e.move(e.dir * e.velocidade, 0);
      if (Math.abs(e.pos.x - x) > 250) e.dir *= -1;
    }
    // detectar queda
    if (e.pos.y > 1600) destroy(e);
  });

  // colisão com jogador
  e.onCollide("jogador", (player) => {
    if (player && player.sofrerDano) player.sofrerDano();
  });

  return e;
}

// helper fictício (evita erro se nenhum escudo visual nesse inimigo)
function shieldCircle(obj) { return null; }
function flash(obj) {
  if (!obj || !obj.exists()) return;
  const orig = obj.color.clone ? obj.color.clone() : rgb(255,255,255);
  obj.color = rgb(255,255,255);
  wait(0.07, () => { if (obj.exists()) obj.color = orig; });
}

// ═══════════════════════════════════════════════════════════════════
// PROJETIL (inimigos à distância disparam)
// ═══════════════════════════════════════════════════════════════════
function criarProjetil(x, y, dirX) {
  const p = add([
    circle(6),
    pos(x, y),
    color(...COR.PROJETIL),
    area({ shape: new Circle(vec2(0), 7) }),
    anchor("center"),
    move(vec2(dirX, 0).unit(), 420),
    lifespan(2.5),
    z(22),
    "projetil",
  ]);
  p.onCollide("jogador", (player) => {
    if (player && player.sofrerDano) player.sofrerDano();
    destroy(p);
  });
  p.onCollide("solido",   () => destroy(p));
  p.onCollide("plataforma", () => destroy(p));
}

// ═══════════════════════════════════════════════════════════════════
// BOSS
// ═══════════════════════════════════════════════════════════════════
function criarBoss(x, y, nome, hpMax) {
  const boss = add([
    rect(80, 90, { radius: 6 }),
    pos(x, y),
    anchor("bot"),
    color(...COR.BOSS),
    area(),
    body({ isStatic: false }),
    outline(3, rgb(255, 80, 150)),
    z(28),
    "boss",
    "inimigo",
    {
      hp:     hpMax,
      hpMax,
      nome,
      dir:    1,
      fase:   1, // 1 normal, 2 fúria
      tempoAtaque: 0,

      hurt(dmg) {
        this.hp -= dmg;
        shake(6);
        flash(this);
        spawnParticulas(this.pos.x, this.pos.y - 45, 10, rgb(200,0,80), 6);
        showBossBar(this.nome, Math.max(0, this.hp / this.hpMax * 100));
        if (this.hp <= 0) this.morrer();
        else if (this.hp < this.hpMax * 0.4 && this.fase === 1) {
          this.fase = 2;
          this.color = rgb(255, 0, 80);
          showCombo("FÚRIA DO CHEFE!");
          shake(20);
        }
      },
      morrer() {
        ESTADO.poder = Math.min(ESTADO.poder + 40, 100);
        ESTADO.pontos += 1000;
        spawnParticulas(this.pos.x, this.pos.y - 45, 40, rgb(255, 80, 150), 12);
        showBossBar(this.nome, 0);
        destroy(this);
        wait(0.8, () => showCombo("BOSS DERROTADO!"));
      }
    }
  ]);

  boss.onUpdate(() => {
    if (!boss.exists()) return;
    const spd = boss.fase === 2 ? 140 : 80;
    boss.move(boss.dir * spd, 0);
    if (Math.abs(boss.pos.x - x) > 320) boss.dir *= -1;

    boss.tempoAtaque += dt();
    const cdAtaque = boss.fase === 2 ? 1.2 : 2.2;
    if (boss.tempoAtaque >= cdAtaque) {
      boss.tempoAtaque = 0;
      criarProjetil(boss.pos.x - 40 * boss.dir, boss.pos.y - 45, -boss.dir);
      if (boss.fase === 2) {
        wait(0.3, () => criarProjetil(boss.pos.x, boss.pos.y - 45, -boss.dir));
      }
    }
  });

  boss.onCollide("jogador", (p) => { if (p && p.sofrerDano) p.sofrerDano(); });
  showBossBar(nome, 100);
  return boss;
}

// ═══════════════════════════════════════════════════════════════════
// PARTÍCULAS
// ═══════════════════════════════════════════════════════════════════
function spawnParticulas(x, y, n, cor, radius) {
  for (let i = 0; i < n; i++) {
    const ang = rand(0, 360);
    const spd = rand(60, 260);
    const p = add([
      circle(rand(2, radius)),
      pos(x, y),
      color(cor.r || cor[0] || 255, cor.g || cor[1] || 255, cor.b || cor[2] || 255),
      move(ang, spd),
      lifespan(rand(0.3, 0.9), { fade: true }),
      anchor("center"),
      z(50),
    ]);
  }
}

// ═══════════════════════════════════════════════════════════════════
// FUNDO PARALLAX
// ═══════════════════════════════════════════════════════════════════
function criarFundo(c1, c2, estrelas) {
  // céu / gradiente
  add([
    rect(4000, height()),
    pos(-200, 0),
    color(...c1),
    z(-10),
    fixed(),
  ]);
  if (estrelas) {
    for (let i = 0; i < 120; i++) {
      add([
        circle(rand(0.5, 2.5)),
        pos(rand(-200, 4000), rand(0, height())),
        color(255, 255, 255),
        opacity(rand(0.15, 0.7)),
        z(-5),
        {
          tempo: rand(0, Math.PI * 2),
          update() { this.opacity = 0.15 + 0.55 * Math.abs(Math.sin(time() * rand(0.5, 1.5) + this.tempo)); }
        }
      ]);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// COLETÁVEIS — animação flutuante
// ═══════════════════════════════════════════════════════════════════
function animarColetaveis() {
  onUpdate("lembranca", (obj) => {
    if (!obj.exists()) return;
    obj.tempo = (obj.tempo || 0) + dt();
    obj.pos.y += Math.sin(obj.tempo * 3) * 0.8;
    obj.color = rgb(
      255,
      50 + 30 * Math.sin(obj.tempo * 4),
      150 + 50 * Math.cos(obj.tempo * 3)
    );
  });
  onUpdate("powerup", (obj) => {
    if (!obj.exists()) return;
    obj.tempo = (obj.tempo || 0) + dt();
    obj.pos.y += Math.sin(obj.tempo * 4) * 0.7;
    obj.color = rgb(
      255,
      180 + 70 * Math.sin(obj.tempo * 6),
      0
    );
  });
}

// ═══════════════════════════════════════════════════════════════════
// COLETAR LEMBRANÇA (handler genérico)
// ═══════════════════════════════════════════════════════════════════
function registrarColetas(player, totalMem, proximaFase) {
  player.onCollide("lembranca", (b) => {
    if (!b.exists()) return;
    destroy(b);
    ESTADO.lembrancas++;
    ESTADO.poder = Math.min(ESTADO.poder + 8, 100);
    spawnParticulas(b.pos.x, b.pos.y, 10, rgb(255, 60, 170), 5);
    if (ESTADO.lembrancas >= totalMem) wait(0.6, () => go(proximaFase));
  });
  player.onCollide("powerup", (b) => {
    if (!b.exists()) return;
    destroy(b);
    ESTADO.poder = Math.min(ESTADO.poder + 35, 100);
    showCombo("PODER +35!");
    spawnParticulas(b.pos.x, b.pos.y, 14, rgb(255, 210, 0), 7);
  });
}

// ═══════════════════════════════════════════════════════════════════
// ══ FASE 1 — PELOTAS ════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════
scene("fase1", () => {
  ESTADO.faseAtual  = "fase1";
  ESTADO.lembrancas = 0;
  window._totalMem  = 3;
  window._faseNome  = "Pelotas";
  showPhaseBanner(1, "Pelotas");
  showBossBar("", 0);

  criarFundo([15, 18, 35], [30, 35, 60], true);

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

  addLevel(mapa, { ...TILES, pos: vec2(0, height() - mapa.length * 64) });
  animarColetaveis();

  const player = criarSofia(160, height() - 200);
  registrarColetas(player, 3, "cutscene1");

  // ── inimigos ──────────────────────────────────────
  criarInimigo(480, height() - 64 * 2, "basico");
  criarInimigo(720, height() - 64 * 2, "basico");
  criarInimigo(980, height() - 64 * 2, "voador");

  // texto narrativo
  add([
    text("7 de Set. 2024\nO primeiro oi...", { size: 26, align: "center", width: 400 }),
    pos(width() / 2, 90),
    fixed(),
    anchor("center"),
    color(180, 180, 200),
    opacity(0.7),
    z(8),
  ]);
});

// ═══════════════════════════════════════════════════════════════════
// ══ CUTSCENE 1 ══════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════
scene("cutscene1", () => {
  add([ rect(width(), height()), color(10, 10, 18), fixed(), z(0) ]);
  // linhas decorativas
  for (let i = 0; i < 5; i++) {
    add([
      rect(width() * rand(0.1, 0.6), 1),
      pos(rand(0, width()), rand(0, height())),
      color(255, 60, 170),
      opacity(0.15),
      fixed(), z(1),
    ]);
  }
  add([
    text("A primeira mensagem\ncruzou o país…", { size: 44, align: "center", width: 900 }),
    pos(width() / 2, height() * 0.42),
    anchor("center"),
    fixed(), z(10),
    color(255, 200, 220),
  ]);
  add([
    text("De Pelotas ao Rio de Janeiro", { size: 22, align: "center" }),
    pos(width() / 2, height() * 0.62),
    anchor("center"),
    fixed(), z(10),
    color(120, 140, 180),
  ]);
  wait(3.2, () => go("fase2"));
});

// ═══════════════════════════════════════════════════════════════════
// ══ FASE 2 — RIO DE JANEIRO ══════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════
scene("fase2", () => {
  ESTADO.faseAtual  = "fase2";
  ESTADO.lembrancas = 0;
  window._totalMem  = 4;
  window._faseNome  = "Rio de Janeiro";
  showPhaseBanner(2, "Rio de Janeiro");
  showBossBar("", 0);

  criarFundo([10, 30, 55], [20, 50, 80], false);
  // brilho de oceano
  for (let i = 0; i < 30; i++) {
    add([
      rect(rand(60, 200), rand(1, 3)),
      pos(rand(0, 3000), rand(height() * 0.4, height() * 0.7)),
      color(0, 180, 255),
      opacity(rand(0.05, 0.2)),
      z(-4),
      { tempo: rand(0, 6.28),
        update() { this.opacity = 0.05 + 0.15 * Math.abs(Math.sin(time() * rand(0.4,1.2) + this.tempo)); }
      }
    ]);
  }

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

  addLevel(mapa, { ...TILES, pos: vec2(0, height() - mapa.length * 64) });
  animarColetaveis();

  const player = criarSofia(120, height() - 200);
  registrarColetas(player, 4, "cutscene2");

  // água mata
  player.onCollide("agua", () => {
    player.sofrerDano();
    if (ESTADO.vidas > 0) go("fase2");
  });

  // inimigos
  criarInimigo(360, height() - 64 * 2, "basico");
  criarInimigo(600, height() - 64 * 2, "voador");
  criarInimigo(860, height() - 64 * 2, "voador");
  criarInimigo(1100, height() - 64 * 2, "tanque");

  add([
    text("O Rio que une caminhos", { size: 26, align: "center" }),
    pos(width() / 2, 90), fixed(), anchor("center"),
    color(140, 180, 220), opacity(0.7), z(8),
  ]);
});

// ═══════════════════════════════════════════════════════════════════
// ══ CUTSCENE 2 ══════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════
scene("cutscene2", () => {
  add([ rect(width(), height()), color(8, 18, 8), fixed(), z(0) ]);
  add([
    text("E então, dois caminhos\nse tornaram um.", { size: 44, align: "center", width: 900 }),
    pos(width() / 2, height() * 0.42),
    anchor("center"), fixed(), z(10), color(180, 255, 200),
  ]);
  add([
    text("Próximo destino: Tefé — Amazônia", { size: 22, align: "center" }),
    pos(width() / 2, height() * 0.62),
    anchor("center"), fixed(), z(10), color(100, 170, 120),
  ]);
  wait(3.2, () => go("fase3"));
});

// ═══════════════════════════════════════════════════════════════════
// ══ FASE 3 — TEFÉ / AMAZÔNIA ════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════
scene("fase3", () => {
  ESTADO.faseAtual  = "fase3";
  ESTADO.lembrancas = 0;
  window._totalMem  = 3;
  window._faseNome  = "Tefé — Amazônia";
  showPhaseBanner(3, "Tefé — Amazônia");
  showBossBar("", 0);

  criarFundo([8, 40, 18], [15, 60, 30], false);
  // folhas flutuantes
  for (let i = 0; i < 25; i++) {
    const leaf = add([
      rect(rand(6,14), rand(3,7), { radius: 3 }),
      pos(rand(0, 3200), rand(0, height() - 100)),
      color(40, rand(140, 200), 60),
      opacity(rand(0.3, 0.7)),
      z(-3),
      rotate(rand(0, 360)),
      { vx: rand(-30, -80), vy: rand(-10, 10), vy2: 0,
        update() {
          this.pos.x += this.vx * dt();
          this.vy2 += Math.sin(time() * rand(1,3)) * 0.4;
          this.pos.y += (this.vy + this.vy2) * dt();
          if (this.pos.x < -50) this.pos.x = 3200;
          if (this.pos.y > height() + 20) this.pos.y = -20;
        }
      }
    ]);
  }

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

  addLevel(mapa, { ...TILES, pos: vec2(0, height() - mapa.length * 64) });
  animarColetaveis();

  const player = criarSofia(120, height() - 200);
  registrarColetas(player, 3, "boss_fase3");

  player.onCollide("agua",  () => { player.sofrerDano(); if (ESTADO.vidas > 0) go("fase3"); });
  player.onCollide("lava",  () => { player.sofrerDano(); if (ESTADO.vidas > 0) go("fase3"); });

  // inimigos mais difíceis
  criarInimigo(400,  height() - 64 * 2, "voador");
  criarInimigo(650,  height() - 64 * 2, "tanque");
  criarInimigo(920,  height() - 64 * 2, "voador");
  criarInimigo(1180, height() - 64 * 2, "basico");
  criarInimigo(1420, height() - 64 * 2, "voador");

  add([
    text("Onde a floresta guarda segredos", { size: 26, align: "center" }),
    pos(width() / 2, 90), fixed(), anchor("center"),
    color(120, 200, 140), opacity(0.7), z(8),
  ]);
});

// ═══════════════════════════════════════════════════════════════════
// ══ BOSS FASE 3 ══════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════
scene("boss_fase3", () => {
  ESTADO.faseAtual = "boss_fase3";
  window._faseNome = "BOSS";

  criarFundo([20, 5, 25], [40, 10, 50], true);

  const mapa = [
    "                                                                ",
    "                                                                ",
    "                                                                ",
    "          __                  __                  __            ",
    "                                                                ",
    "################################################################",
  ];

  addLevel(mapa, { ...TILES, pos: vec2(0, height() - mapa.length * 64) });

  const player = criarSofia(160, height() - 180);
  const boss    = criarBoss(700, height() - 64, "GUARDIÃO DAS SOMBRAS", 14);

  // player pode atacar o boss com pulso (tecla X)
  // já está registrado no handler do pulso dentro de criarSofia
  // adicionalmente: pular sobre o boss faz dano
  player.onCollide("boss", (b) => {
    if (!b || !b.exists()) return;
    if (!player.isGrounded()) {
      b.hurt(1);
      player.jump(500);
    } else {
      player.sofrerDano();
    }
  });

  // vitória quando boss morrer
  onUpdate(() => {
    if (!get("boss").length) {
      wait(1.2, () => go("vitoria"));
    }
  });

  // inimigos extras na fase do boss
  wait(5, () => {
    if (get("boss").length) {
      criarInimigo(300, height() - 140, "voador");
      criarInimigo(900, height() - 140, "voador");
    }
  });

  add([
    text("⚠ CHEFE FINAL ⚠", { size: 22, align: "center" }),
    pos(width() / 2, 90), fixed(), anchor("center"),
    color(255, 80, 80), opacity(0.8), z(8),
  ]);
});

// ═══════════════════════════════════════════════════════════════════
// ══ MENU ════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════
scene("menu", () => {
  showBossBar("", 0);
  add([ rect(width(), height()), color(7, 9, 15), fixed(), z(0) ]);

  // estrelas de fundo
  for (let i = 0; i < 140; i++) {
    add([
      circle(rand(0.4, 2.2)),
      pos(rand(0, width()), rand(0, height())),
      color(255, 255, 255),
      opacity(rand(0.1, 0.6)),
      z(1),
      { t: rand(0, 6.28),
        update() { this.opacity = 0.1 + 0.5 * Math.abs(Math.sin(time() * rand(0.3, 1.2) + this.t)); }
      }
    ]);
  }

  // linhas decorativas
  for (let i = 0; i < 4; i++) {
    add([
      rect(rand(200, 600), 1),
      pos(rand(0, width()), rand(0, height())),
      color(255, 60, 170),
      opacity(0.12), fixed(), z(2),
    ]);
  }

  add([
    text("A JORNADA DE SOFIA", { size: 68, font: "monospace" }),
    pos(width() / 2, height() * 0.28),
    anchor("center"), fixed(), z(10),
    color(255, 80, 170),
    { t: 0,
      update() {
        this.t += dt();
        const s = 1 + 0.012 * Math.sin(this.t * 2);
        this.transform = { scale: vec2(s, s) };
      }
    }
  ]);

  add([
    text("Uma história de amor em pixels", { size: 20 }),
    pos(width() / 2, height() * 0.39),
    anchor("center"), fixed(), z(10),
    color(160, 140, 180),
  ]);

  // controles
  add([
    text("←→  Mover   |   ESPAÇO  Pular\n  X  Pulso de Energia (30 poder)\n  Z  Escudo (20 poder)", {
      size: 18, align: "center", width: 700
    }),
    pos(width() / 2, height() * 0.58),
    anchor("center"), fixed(), z(10),
    color(120, 130, 160),
  ]);

  const btnTxt = add([
    text("[ PRESSIONE ESPAÇO ]", { size: 30 }),
    pos(width() / 2, height() * 0.78),
    anchor("center"), fixed(), z(10),
    color(255, 255, 255),
  ]);
  loop(0.55, () => { if (btnTxt.exists()) btnTxt.opacity = btnTxt.opacity > 0.6 ? 0.2 : 1; });

  onKeyPress("space", () => {
    ESTADO.reset();
    go("fase1");
  });
  onKeyPress("enter", () => {
    ESTADO.reset();
    go("fase1");
  });
});

// ═══════════════════════════════════════════════════════════════════
// ══ GAME OVER ════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════
scene("gameover", () => {
  showBossBar("", 0);
  add([ rect(width(), height()), color(25, 5, 5), fixed(), z(0) ]);

  add([
    text("FIM DA JORNADA", { size: 62 }),
    pos(width() / 2, height() * 0.35),
    anchor("center"), fixed(), z(10),
    color(255, 60, 60),
  ]);
  add([
    text(`Pontuação: ${ESTADO.pontos}`, { size: 28 }),
    pos(width() / 2, height() * 0.50),
    anchor("center"), fixed(), z(10),
    color(200, 160, 160),
  ]);
  add([
    text("A distância não venceu desta vez.", { size: 22 }),
    pos(width() / 2, height() * 0.60),
    anchor("center"), fixed(), z(10),
    color(160, 100, 100),
  ]);

  const btnTxt = add([
    text("[ ESPAÇO ] tentar de novo", { size: 24 }),
    pos(width() / 2, height() * 0.75),
    anchor("center"), fixed(), z(10),
    color(220, 100, 100),
  ]);
  loop(0.6, () => { if (btnTxt.exists()) btnTxt.opacity = btnTxt.opacity > 0.6 ? 0.25 : 1; });

  onKeyPress("space", () => go("menu"));
  onKeyPress("enter", () => go("menu"));
});

// ═══════════════════════════════════════════════════════════════════
// ══ VITÓRIA ══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════
scene("vitoria", () => {
  showBossBar("", 0);
  add([ rect(width(), height()), color(10, 18, 12), fixed(), z(0) ]);

  // confetes
  loop(0.06, () => {
    if (chance(0.7)) {
      const cor = choose([
        rgb(255, 80, 170), rgb(255, 210, 0), rgb(0, 200, 255),
        rgb(120, 255, 120), rgb(255, 120, 60)
      ]);
      add([
        rect(rand(8, 18), rand(8, 18), { radius: rand(0, 4) }),
        pos(rand(0, width()), -20),
        color(cor.r, cor.g, cor.b),
        move(DOWN, rand(140, 340)),
        rotate(rand(0, 360)),
        lifespan(4, { fade: true }),
        z(15),
        { vx: rand(-40, 40),
          update() { this.pos.x += this.vx * dt(); this.angle += rand(-60, 60) * dt(); }
        }
      ]);
    }
  });

  add([
    text("FELIZ DIA DOS NAMORADOS!", { size: 56 }),
    pos(width() / 2, height() * 0.25),
    anchor("center"), fixed(), z(10),
    color(255, 100, 180),
  ]);
  add([
    text(`Pontuação Final: ${ESTADO.pontos}`, { size: 28 }),
    pos(width() / 2, height() * 0.43),
    anchor("center"), fixed(), z(10),
    color(255, 220, 100),
  ]);
  add([
    text("De Pelotas ao Rio, e agora em Tefé.\nOnde quer que seja, desde que seja com você.", {
      size: 28, align: "center", width: 900
    }),
    pos(width() / 2, height() * 0.58),
    anchor("center"), fixed(), z(10),
    color(220, 230, 255),
  ]);
  add([
    text("Com amor. ♥", { size: 26 }),
    pos(width() / 2, height() * 0.77),
    anchor("center"), fixed(), z(10),
    color(255, 120, 180),
    { t: 0, update() { this.t += dt(); this.scale = vec2(1 + 0.06 * Math.sin(this.t * 3)); } }
  ]);

  onKeyPress("space", () => { ESTADO.reset(); go("menu"); });
  onKeyPress("enter", () => { ESTADO.reset(); go("menu"); });
});

// ═══════════════════════════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════════════════════════
go("menu");
