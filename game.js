// ═══════════════════════════════════════════════════════════════════
// A JORNADA DE SOFIA — game.js (Versão Pura / Sem Bibliotecas Externas)
// Reconstruído com Canvas 2D Nativo para evitar bloqueios de CDN/CSP.
// ═══════════════════════════════════════════════════════════════════

window.addEventListener("load", function () {

    // ── LOADING BAR (MANTIDO DO ORIGINAL) ────────────────────────────
    const loadBar = document.getElementById("load-bar");
    const loadMsg = document.getElementById("load-status");
    const loadScr = document.getElementById("loading-screen");
    const msgs = [
        "Inicializando motor nativo…",
        "Gerando partículas de afeto…",
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

    // ── HUD HELPERS (MANTIDO DO ORIGINAL) ────────────────────────────
    function hudUpdate(lives, mem, total, phase, power) {
        ["h1", "h2", "h3"].forEach((id, i) => {
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
        if (pn) pn.textContent = num ? "FASE " + num : "";
        if (pt) pt.textContent = title;
        el.classList.add("show");
        setTimeout(() => el.classList.remove("show"), 2800);
    }
    function setSkillReady(key, ready) {
        const pill = document.getElementById("skill-" + key);
        const k = document.getElementById("key-" + key);
        if (pill) pill.classList.toggle("ready", ready);
        if (k) k.classList.toggle("active", ready);
    }

    // ── CONFIGURAÇÃO DO CANVAS NATIVO ────────────────────────────────
    const container = document.getElementById("game-container");
    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.objectFit = "contain";
    canvas.style.backgroundColor = "rgb(7, 9, 15)";
    if (container) container.appendChild(canvas);
    const ctx = canvas.getContext("2d");

    // ── CONTROLES GLOBAIS ────────────────────────────────────────────
    const keys = { right: false, left: false, space: false, x: false, z: false, enter: false };
    const pressedThisFrame = {};

    window.addEventListener("keydown", (e) => {
        let key = e.key.toLowerCase();
        if (key === " ") key = "space";
        if (key === "arrowright") key = "right";
        if (key === "arrowleft") key = "left";
        if (!keys[key]) pressedThisFrame[key] = true;
        keys[key] = true;
    });
    window.addEventListener("keyup", (e) => {
        let key = e.key.toLowerCase();
        if (key === " ") key = "space";
        if (key === "arrowright") key = "right";
        if (key === "arrowleft") key = "left";
        keys[key] = false;
    });

    // Função auxiliar para teclas pressionadas apenas uma vez
    function isKeyPressed(k) { return !!pressedThisFrame[k]; }

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
        PLAT: "rgb(40, 45, 70)", PLAT2: "rgb(30, 60, 90)",
        AGUA: "rgba(0, 80, 200, 0.7)", LAVA: "rgba(200, 50, 10, 0.9)",
        MEM: "rgb(255, 60, 170)", ENEMY: "rgb(200, 40, 40)",
        ENEMY2: "rgb(80, 0, 180)", BULLET: "rgb(255, 100, 20)",
        PODER: "rgb(255, 200, 0)", BOSS: "rgb(160, 0, 60)"
    };

    // ── MOTOR: FÍSICA E ENTIDADES ────────────────────────────────────
    const GRAVITY = 2200;
    let scene = "menu";
    let gameTime = 0;
    let shakeTimer = 0;
    let shakeIntensity = 0;
    
    // Entidades em cena
    let player = null;
    let boss = null;
    let platforms = [];
    let hazards = [];
    let enemies = [];
    let collectibles = [];
    let projectiles = [];
    let particles = [];
    let bgStars = [];
    let texts = []; // Textos fixos nas fases
    let bgColors = [7, 9, 15]; // Fundo atual da cena

    // Câmera
    let cam = { x: 640, y: 360 };

    // Utilitários de motor
    function lerp(start, end, amt) { return (1 - amt) * start + amt * end; }
    function rand(min, max) { return Math.random() * (max - min) + min; }
    function dist(p1, p2) { return Math.hypot(p2.x - p1.x, p2.y - p1.y); }
    function AABB(r1, r2) {
        return r1.x < r2.x + r2.w && r1.x + r1.w > r2.x && r1.y < r2.y + r2.h && r1.y + r1.h > r2.y;
    }
    function shake(val) { shakeTimer = 0.2; shakeIntensity = val; }

    function burst(x, y, n, colorStr, radius = 6) {
        for (let i = 0; i < n; i++) {
            const angle = rand(0, Math.PI * 2);
            const speed = rand(60, 260);
            particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: colorStr,
                r: rand(2, radius),
                life: 1.0,
                maxLife: rand(0.3, 0.9)
            });
        }
    }

    // ── DEFINIÇÃO DAS ENTIDADES ──────────────────────────────────────
    function createPlayer(x, y) {
        player = {
            x: x, y: y, w: 28, h: 52,
            vx: 0, vy: 0,
            jumpForce: 800, speed: 340,
            isGrounded: false, invulTimer: 0, color: "rgb(255, 80, 170)",
            escudoAtivo: false, pulsoCD: 0, escudoCD: 0, escudoTimer: 0,

            update(dt) {
                // Entrada (X)
                this.vx = 0;
                if (keys.right) this.vx = this.speed;
                if (keys.left) this.vx = -this.speed;

                // Movimento X & Colisão
                this.x += this.vx * dt;
                for (let p of platforms) {
                    if (AABB(this, p)) {
                        if (this.vx > 0) this.x = p.x - this.w;
                        else if (this.vx < 0) this.x = p.x + p.w;
                    }
                }

                // Entrada (Pulo)
                if (isKeyPressed("space") && this.isGrounded) {
                    this.vy = -this.jumpForce;
                    burst(this.x + this.w / 2, this.y + this.h, 5, "rgb(180,180,255)", 4);
                }

                // Gravidade, Movimento Y & Colisão
                this.vy += GRAVITY * dt;
                this.y += this.vy * dt;
                this.isGrounded = false;
                for (let p of platforms) {
                    if (AABB(this, p)) {
                        if (this.vy > 0) {
                            this.y = p.y - this.h;
                            this.vy = 0;
                            this.isGrounded = true;
                        } else if (this.vy < 0) {
                            this.y = p.y + p.h;
                            this.vy = 0;
                        }
                    }
                }

                // Habilidades e Cooldowns
                if (this.pulsoCD > 0) this.pulsoCD -= dt;
                if (this.escudoCD > 0) this.escudoCD -= dt;

                if (isKeyPressed("x") && this.pulsoCD <= 0 && ESTADO.poder >= 30) {
                    ESTADO.poder -= 30;
                    this.pulsoCD = 4.0;
                    showFlash(); shake(8);
                    burst(this.x + this.w / 2, this.y + this.h / 2, 20, "rgb(255,200,0)", 10);
                    showCombo("PULSO!");
                    
                    for (let e of enemies) {
                        let cx = this.x + this.w / 2; let cy = this.y + this.h / 2;
                        let ex = e.x + e.w / 2; let ey = e.y + e.h / 2;
                        if (dist({ x: cx, y: cy }, { x: ex, y: ey }) < 220) {
                            e.hp -= 2; e.flash = 0.1;
                            let angle = Math.atan2(ey - cy, ex - cx);
                            e.x += Math.cos(angle) * 90;
                        }
                    }
                }

                if (isKeyPressed("z") && this.escudoCD <= 0 && !this.escudoAtivo && ESTADO.poder >= 20) {
                    ESTADO.poder -= 20;
                    this.escudoAtivo = true;
                    this.escudoTimer = 3.5;
                    burst(this.x + this.w / 2, this.y + this.h / 2, 12, "rgb(0,200,255)", 7);
                }

                if (this.escudoAtivo) {
                    this.escudoTimer -= dt;
                    if (this.escudoTimer <= 0) {
                        this.escudoAtivo = false;
                        this.escudoCD = 5.0;
                    }
                }

                if (this.invulTimer > 0) this.invulTimer -= dt;

                // Abismo
                if (this.y > 1600) this.sofrerDano(true);
                
                // Coleta
                for (let i = collectibles.length - 1; i >= 0; i--) {
                    let c = collectibles[i];
                    if (AABB(this, c)) {
                        if (c.type === "lembranca") {
                            ESTADO.lembrancas++;
                            ESTADO.poder = Math.min(ESTADO.poder + 8, 100);
                            burst(c.x, c.y, 10, "rgb(255,60,170)");
                            if (ESTADO.lembrancas >= window._totalMem) {
                                setTimeout(() => loadScene(window._proxFase), 600);
                            }
                        } else {
                            ESTADO.poder = Math.min(ESTADO.poder + 35, 100);
                            showCombo("PODER +35!");
                            burst(c.x, c.y, 14, "rgb(255,210,0)", 7);
                        }
                        collectibles.splice(i, 1);
                    }
                }

                // Dano por hazards
                for (let h of hazards) {
                    if (AABB(this, h)) this.sofrerDano();
                }

                // HUD updates
                hudUpdate(ESTADO.vidas, ESTADO.lembrancas, window._totalMem || 0, window._faseNome || "", ESTADO.poder);
                setSkillReady("x", ESTADO.poder >= 30 && this.pulsoCD <= 0);
                setSkillReady("z", ESTADO.poder >= 20 && this.escudoCD <= 0 && !this.escudoAtivo);
            },

            sofrerDano(instantKill = false) {
                if ((this.invulTimer > 0 || this.escudoAtivo) && !instantKill) return;
                ESTADO.vidas--;
                ESTADO.combo = 0;
                this.invulTimer = 1.4;
                hudDamage(); shake(12);
                burst(this.x + this.w / 2, this.y + this.h / 2, 10, "rgb(255,80,80)");
                if (ESTADO.vidas <= 0) { loadScene("gameover"); return; }
                if (instantKill) loadScene(ESTADO.faseAtual);
            },

            draw(ctx) {
                let blink = this.invulTimer > 0 && Math.floor(gameTime * 15) % 2 === 0;
                if (!blink) {
                    ctx.fillStyle = this.escudoAtivo ? "rgb(100, 200, 255)" : this.color;
                    ctx.strokeStyle = "rgb(255,150,220)";
                    ctx.lineWidth = 2;
                    // Corpo arredondado
                    ctx.beginPath(); ctx.roundRect(this.x, this.y, this.w, this.h, 4);
                    ctx.fill(); ctx.stroke();
                }
                
                // Anel do escudo
                if (this.escudoAtivo || this.escudoTimer > 0) {
                    let op = this.escudoAtivo ? (0.22 + 0.1 * Math.sin(gameTime * 8)) : 0;
                    if(op > 0) {
                        ctx.beginPath();
                        ctx.arc(this.x + this.w / 2, this.y + this.h / 2, 38, 0, Math.PI * 2);
                        ctx.fillStyle = `rgba(0, 200, 255, ${op})`;
                        ctx.fill();
                    }
                }
            }
        };
    }

    function createEnemy(x, y, type) {
        const cfgs = {
            basico: { c:"rgb(200,40,40)", hp:2, vel:120, w:30, h:38, pts:50 },
            voador: { c:"rgb(80,0,180)",  hp:1, vel:160, w:26, h:26, pts:80 },
            tanque: { c:"rgb(80,20,20)",  hp:6, vel:60,  w:48, h:52, pts:200 },
        };
        const c = cfgs[type];
        enemies.push({
            x: x - c.w/2, y: y - c.h, w: c.w, h: c.h,
            color: c.c, hp: c.hp, maxHp: c.hp, vel: c.vel, dir: 1, type: type, spawnX: x, vt: 0, flash: 0
        });
    }

    function createBoss(x, y, nome, maxHp) {
        boss = {
            x: x - 40, y: y - 90, w: 80, h: 90,
            hp: maxHp, maxHp: maxHp, nome: nome, dir: 1, fase: 1, atTimer: 0, spawnX: x, flash: 0,
            color: C.BOSS
        };
        showBossBar(nome, 100);
    }

    function createProjectile(x, y, dx) {
        projectiles.push({ x: x, y: y, r: 6, vx: dx > 0 ? 420 : -420, life: 2.5 });
    }

    // ── MAP PARSER ───────────────────────────────────────────────────
    function loadMap(mapData, offsetY) {
        platforms = []; hazards = []; enemies = []; collectibles = []; projectiles = []; boss = null;
        let tw = 64, th = 64;
        for (let r = 0; r < mapData.length; r++) {
            for (let c = 0; c < mapData[r].length; c++) {
                let char = mapData[r][c];
                let px = c * tw; let py = offsetY + r * th;
                if (char === "=") platforms.push({ x: px, y: py, w: 64, h: 20, type: "plat" });
                else if (char === "_") platforms.push({ x: px, y: py + 26, w: 64, h: 12, type: "plat2" });
                else if (char === "#") platforms.push({ x: px, y: py, w: 64, h: 64, type: "wall" });
                else if (char === "W") hazards.push({ x: px, y: py + 24, w: 64, h: 40, type: "agua", c: C.AGUA });
                else if (char === "L") hazards.push({ x: px, y: py + 24, w: 64, h: 40, type: "lava", c: C.LAVA });
                else if (char === "O") collectibles.push({ x: px + 32, y: py + 32, w: 28, h: 28, type: "lembranca", t: rand(0, 5) });
                else if (char === "*") collectibles.push({ x: px + 32, y: py + 32, w: 24, h: 24, type: "powerup", t: rand(0, 5) });
            }
        }
    }

    function setupBackground(r, g, b, stars) {
        bgColors = [r, g, b];
        bgStars = [];
        if (stars) {
            for (let i = 0; i < 140; i++) {
                bgStars.push({
                    x: rand(-200, 4000), y: rand(0, 720), r: rand(0.4, 2.5),
                    baseOp: rand(0.1, 0.6), t: rand(0, 6.28), speed: rand(0.3, 1.5)
                });
            }
        }
    }

    // ── SCENARIOS ────────────────────────────────────────────────────
    function loadScene(name) {
        scene = name;
        texts = []; particles = [];
        showBossBar("", 0);
        player = null;

        if (name === "menu") {
            setupBackground(7, 9, 15, true);
        }
        else if (name === "fase1") {
            ESTADO.faseAtual = "fase1"; ESTADO.lembrancas = 0;
            window._totalMem = 3; window._faseNome = "Pelotas"; window._proxFase = "cutscene1";
            showPhaseBanner(1, "Pelotas");
            setupBackground(15, 18, 35, true);
            const mapa = [
                "                                                           ",
                "                                                           ",
                "                                          * ",
                "                                          _                ",
                "                          O                               O      ",
                "               __                        __                ____     ",
                "                                                           ",
                "      O                                                    ",
                "     __                                                    ",
                "                                                           ",
                "=====    ====    ======     ====     ====     ====     ====   =====",
            ];
            loadMap(mapa, 720 - mapa.length * 64);
            createPlayer(160, 720 - 200);
            createEnemy(480, 720 - 128, "basico");
            createEnemy(720, 720 - 128, "basico");
            createEnemy(1000, 720 - 128, "voador");
            texts.push({ text: "7 de Set. 2024 · O primeiro oi…", x: 640, y: 80, c: "rgba(180,180,200,0.6)" });
        }
        else if (name === "cutscene1") {
            setupBackground(10, 10, 18, false);
            setTimeout(() => loadScene("fase2"), 3200);
        }
        else if (name === "fase2") {
            ESTADO.faseAtual = "fase2"; ESTADO.lembrancas = 0;
            window._totalMem = 4; window._faseNome = "Rio de Janeiro"; window._proxFase = "cutscene2";
            showPhaseBanner(2, "Rio de Janeiro");
            setupBackground(10, 30, 55, false);
            const mapa = [
                "                                                                 ",
                "                                                                 ",
                "                                    * O         ",
                "                                    _                        ____        ",
                "           O                                 O                           ",
                "          ___                        __       ___                        ",
                "                   O                                                     ",
                "                  __                                                     ",
                "                                                                 ",
                "====  WWW  ==   WWWWW  ====   ==  WWWWW   ====  WWWWW  ===  WWWW   =====",
            ];
            loadMap(mapa, 720 - mapa.length * 64);
            createPlayer(120, 720 - 200);
            createEnemy(360, 720 - 128, "basico");
            createEnemy(600, 720 - 128, "voador");
            createEnemy(860, 720 - 128, "voador");
            createEnemy(1100, 720 - 128, "tanque");
            texts.push({ text: "O Rio que une caminhos", x: 640, y: 80, c: "rgba(140,180,220,0.6)" });
        }
        else if (name === "cutscene2") {
            setupBackground(8, 18, 8, false);
            setTimeout(() => loadScene("fase3"), 3200);
        }
        else if (name === "fase3") {
            ESTADO.faseAtual = "fase3"; ESTADO.lembrancas = 0;
            window._totalMem = 3; window._faseNome = "Tefé — Amazônia"; window._proxFase = "boss_fase3";
            showPhaseBanner(3, "Tefé — Amazônia");
            setupBackground(8, 40, 18, false);
            const mapa = [
                "                                                                      ",
                "                                                                      ",
                "                                                  O                           ",
                "                                                 ___                          ",
                "                    O                    * ",
                "                   ___                   _                    O               ",
                "         O                                               _    ___               ",
                "        ___                                                                   ",
                "                                                                      ",
                "====  WWWWW  =   LLLL  ===  WWWWWW  ==  LLLL  ===  WWWWWW  =  LLLL  ===  ===",
            ];
            loadMap(mapa, 720 - mapa.length * 64);
            createPlayer(120, 720 - 200);
            createEnemy(400, 720 - 128, "voador");
            createEnemy(650, 720 - 128, "tanque");
            createEnemy(920, 720 - 128, "voador");
            createEnemy(1180, 720 - 128, "basico");
            createEnemy(1420, 720 - 128, "voador");
            texts.push({ text: "Onde a floresta guarda segredos", x: 640, y: 80, c: "rgba(120,200,140,0.6)" });
        }
        else if (name === "boss_fase3") {
            ESTADO.faseAtual = "boss_fase3"; window._faseNome = "BOSS";
            showPhaseBanner("", "CONFRONTO FINAL");
            setupBackground(20, 5, 25, true);
            const mapa = [
                "                                                                ",
                "                                                                ",
                "                                                                ",
                "          __                  __                  __            ",
                "                                                                ",
                "################################################################",
            ];
            loadMap(mapa, 720 - mapa.length * 64);
            createPlayer(160, 720 - 180);
            createBoss(700, 720 - 64, "GUARDIÃO DAS SOMBRAS", 14);
            
            // Inimigos extras no boss após 5s
            setTimeout(() => {
                if (scene === "boss_fase3" && boss) {
                    createEnemy(280, 720 - 160, "voador");
                    createEnemy(920, 720 - 160, "voador");
                }
            }, 5000);
            
            texts.push({ text: "⚠  CHEFE FINAL  ⚠", x: 640, y: 80, c: "rgba(255,80,80,0.8)" });
        }
        else if (name === "gameover" || name === "vitoria") {
            setupBackground(name === "gameover" ? 25 : 10, name === "gameover" ? 5 : 18, name === "gameover" ? 5 : 12, name === "vitoria");
        }
    }

    // ── GAME LOOP PRINCIPAL ──────────────────────────────────────────
    let lastTime = 0;
    function gameLoop(timestamp) {
        let dt = (timestamp - lastTime) / 1000;
        if (dt > 0.1) dt = 0.1; // Limite de dt p/ evitar bugs de lag
        lastTime = timestamp;
        gameTime += dt;

        update(dt);
        draw(ctx);
        
        // Limpa estado the teclas press
        for (let k in pressedThisFrame) pressedThisFrame[k] = false;
        
        requestAnimationFrame(gameLoop);
    }

    function update(dt) {
        if (shakeTimer > 0) shakeTimer -= dt;

        if (scene === "menu" || scene === "gameover" || scene === "vitoria") {
            if (isKeyPressed("space") || isKeyPressed("enter")) {
                if (scene === "vitoria") ESTADO.reset();
                if (scene === "menu" || scene === "vitoria") { ESTADO.reset(); loadScene("fase1"); }
                if (scene === "gameover") loadScene("menu");
            }
            if (scene === "vitoria") {
                if (Math.random() < 0.1) {
                    burst(rand(0, 1280), -20, 1, "rgb(255,100,180)", 10);
                }
            }
        }

        // Lógica In-Game
        if (player) {
            player.update(dt);
            
            // Suave movimento de câmera
            cam.x = lerp(cam.x, player.x + 180, dt * 5);
            cam.y = lerp(cam.y, 360, dt * 3);

            // Atualiza inimigos
            for (let i = enemies.length - 1; i >= 0; i--) {
                let e = enemies[i];
                if (e.flash > 0) e.flash -= dt;
                
                if (e.type === "voador") {
                    e.vt += dt;
                    e.x += e.dir * e.vel * dt;
                    e.y += Math.sin(e.vt * 3) * 1.1;
                    if (Math.abs(e.x - e.spawnX) > 200) e.dir *= -1;
                } else {
                    e.x += e.dir * e.vel * dt;
                    if (Math.abs(e.x - e.spawnX) > 250) e.dir *= -1;
                }
                
                if (e.y > 1600) { e.hp = 0; }

                if (AABB(player, e)) player.sofrerDano();

                if (e.hp <= 0) {
                    ESTADO.pontos += e.type === "tanque" ? 200 : (e.type === "voador" ? 80 : 50);
                    ESTADO.combo++;
                    ESTADO.poder = Math.min(ESTADO.poder + 12, 100);
                    if (ESTADO.combo >= 3) showCombo("×" + ESTADO.combo + " COMBO!");
                    burst(e.x + e.w/2, e.y + e.h/2, 16, e.color, 8);
                    enemies.splice(i, 1);
                }
            }

            // Atualiza Boss
            if (boss) {
                if (boss.flash > 0) boss.flash -= dt;
                let spd = boss.fase === 2 ? 150 : 85;
                boss.x += boss.dir * spd * dt;
                if (Math.abs(boss.x - boss.spawnX) > 330) boss.dir *= -1;
                
                boss.atTimer += dt;
                let cd = boss.fase === 2 ? 1.1 : 2.0;
                if (boss.atTimer >= cd) {
                    boss.atTimer = 0;
                    createProjectile(boss.x + boss.w/2, boss.y + boss.h/2, -boss.dir);
                    if (boss.fase === 2) setTimeout(() => createProjectile(boss.x + boss.w/2, boss.y + boss.h/2, boss.dir), 280);
                }

                if (AABB(player, boss)) {
                    // Pulo no boss = dano, caso contrário jogador leva dano
                    if (!player.isGrounded && player.vy > 0 && player.y + player.h < boss.y + boss.h/2) {
                        boss.hp -= 1; boss.flash = 0.1; player.vy = -600;
                        burst(boss.x + boss.w/2, boss.y, 8, "rgb(220,0,80)");
                    } else {
                        player.sofrerDano();
                    }
                }

                if (boss.hp < boss.maxHp * 0.4 && boss.fase === 1) {
                    boss.fase = 2; boss.color = "rgb(255,0,80)";
                    shake(20); showCombo("FÚRIA DO CHEFE!");
                }
                
                showBossBar(boss.nome, Math.max(0, (boss.hp / boss.maxHp) * 100));

                if (boss.hp <= 0) {
                    ESTADO.pontos += 1000; ESTADO.poder = 100;
                    burst(boss.x + boss.w/2, boss.y + boss.h/2, 40, "rgb(255,80,150)", 12);
                    showBossBar(boss.nome, 0); boss = null;
                    showCombo("BOSS DERROTADO!");
                    setTimeout(() => loadScene("vitoria"), 1200);
                }
            }

            // Atualiza Projéteis
            for (let i = projectiles.length - 1; i >= 0; i--) {
                let p = projectiles[i];
                p.x += p.vx * dt;
                p.life -= dt;
                
                // Hack rápido de colisão projetil vs jogador em formato circulo
                if (dist({x:p.x, y:p.y}, {x:player.x+player.w/2, y:player.y+player.h/2}) < p.r + player.w/2) {
                    player.sofrerDano();
                    p.life = 0;
                }
                if (p.life <= 0) projectiles.splice(i, 1);
            }
        }

        // Partículas
        for (let i = particles.length - 1; i >= 0; i--) {
            let p = particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt / p.maxLife;
            if (p.life <= 0) particles.splice(i, 1);
        }
    }

    function draw(ctx) {
        // Fundo
        ctx.fillStyle = `rgb(${bgColors[0]}, ${bgColors[1]}, ${bgColors[2]})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Estrelas (Fundo Paralaxe estático)
        for (let s of bgStars) {
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            let op = s.baseOp + 0.5 * Math.abs(Math.sin(gameTime * s.speed + s.t));
            ctx.fillStyle = `rgba(255,255,255,${op})`;
            ctx.fill();
        }

        // Cenário Câmera
        ctx.save();
        if (shakeTimer > 0) {
            ctx.translate(rand(-shakeIntensity, shakeIntensity), rand(-shakeIntensity, shakeIntensity));
        }
        
        // Se estiver num mapa, aplica offset da câmera
        let noCamScenes = ["menu", "cutscene1", "cutscene2", "gameover", "vitoria"];
        if (!noCamScenes.includes(scene)) {
            ctx.translate(-cam.x + 640, -cam.y + 360);
        }

        // Plataformas / Paredes
        for (let p of platforms) {
            ctx.fillStyle = p.type === "plat" ? C.PLAT : (p.type === "plat2" ? C.PLAT2 : "rgb(25,28,48)");
            ctx.strokeStyle = p.type === "plat" ? "rgb(80,90,130)" : "rgb(60,120,180)";
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.roundRect(p.x, p.y, p.w, p.h, p.type === "plat" ? 5 : 4);
            ctx.fill(); ctx.stroke();
        }

        // Hazards (Lava, Água)
        for (let h of hazards) {
            ctx.fillStyle = h.c;
            ctx.fillRect(h.x, h.y, h.w, h.h);
        }

        // Coletáveis
        for (let c of collectibles) {
            let offset = Math.sin(gameTime * (c.type === "powerup" ? 4 : 3) + c.t) * 8;
            ctx.beginPath();
            ctx.arc(c.x, c.y + offset, c.w / 2, 0, Math.PI * 2);
            if (c.type === "lembranca") {
                ctx.fillStyle = `rgb(255, ${50+30*Math.sin(gameTime*4)}, ${150+50*Math.cos(gameTime*3)})`;
            } else {
                ctx.fillStyle = `rgb(255, ${180+70*Math.sin(gameTime*6)}, 0)`;
            }
            ctx.fill();
        }

        // Inimigos
        for (let e of enemies) {
            ctx.fillStyle = e.flash > 0 ? "white" : e.color;
            ctx.strokeStyle = "rgb(255,60,60)"; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.roundRect(e.x, e.y, e.w, e.h, 3);
            ctx.fill(); ctx.stroke();
            // HP Bar
            let pct = e.hp / e.maxHp;
            ctx.fillStyle = "rgb(200, 40, 40)";
            ctx.fillRect(e.x + (e.w - e.w)/2, e.y - 10, e.w * pct, 4);
        }

        // Boss
        if (boss) {
            ctx.fillStyle = boss.flash > 0 ? "white" : boss.color;
            ctx.strokeStyle = "rgb(255,80,150)"; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.roundRect(boss.x, boss.y, boss.w, boss.h, 6);
            ctx.fill(); ctx.stroke();
        }

        // Jogador
        if (player) player.draw(ctx);

        // Projéteis
        for (let p of projectiles) {
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = C.BULLET; ctx.fill();
        }

        // Partículas
        for (let p of particles) {
            ctx.globalAlpha = p.life;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = p.color; ctx.fill();
            ctx.globalAlpha = 1.0;
        }

        // Textos das fases in-game
        ctx.textAlign = "center";
        for (let t of texts) {
            ctx.font = "22px sans-serif";
            ctx.fillStyle = t.c;
            // Posições X são absolutas na tela (não acompanham câmera se colocar após restore)
            // Aqui estamos dentro do save() da câmera, o que é um mini-bug se for texto fixo,
            // então vamos desenhar os textos fixos DEPOIS do restore.
        }

        ctx.restore(); // FIM DO DESENHO MUNDO (Com câmera)

        // Textos Fixos In-Game (Fora da Câmera)
        ctx.textAlign = "center";
        for (let t of texts) {
            ctx.font = "bold 22px Arial";
            ctx.fillStyle = t.c;
            ctx.fillText(t.text, t.x, t.y);
        }

        // Cenas GUI Puras (Menus, Cutscenes, etc)
        if (scene === "menu") {
            ctx.fillStyle = "rgb(255,80,170)";
            ctx.font = "bold 58px Arial";
            let scale = 1 + 0.012 * Math.sin(gameTime * 2);
            ctx.save(); ctx.translate(640, 720 * 0.27); ctx.scale(scale, scale);
            ctx.fillText("A JORNADA DE SOFIA", 0, 0); ctx.restore();

            ctx.fillStyle = "rgb(160,140,180)"; ctx.font = "20px Arial";
            ctx.fillText("Uma história de amor em pixels", 640, 720 * 0.39);

            ctx.fillStyle = "rgb(120,130,160)"; ctx.font = "17px Arial";
            ctx.fillText("←→  Mover   ESPAÇO  Pular", 640, 720 * 0.55);
            ctx.fillText("X  Pulso de Energia  (30 poder)", 640, 720 * 0.60);
            ctx.fillText("Z  Escudo  (20 poder)", 640, 720 * 0.65);

            if (Math.floor(gameTime * 2) % 2 === 0) {
                ctx.fillStyle = "white"; ctx.font = "bold 28px Arial";
                ctx.fillText("[ PRESSIONE ESPAÇO ]", 640, 720 * 0.78);
            }
        }
        else if (scene === "cutscene1") {
            ctx.fillStyle = "rgb(255,200,220)"; ctx.font = "bold 44px Arial";
            ctx.fillText("A primeira mensagem", 640, 720 * 0.40);
            ctx.fillText("cruzou o país…", 640, 720 * 0.47);
            ctx.fillStyle = "rgb(120,140,180)"; ctx.font = "22px Arial";
            ctx.fillText("De Pelotas ao Rio de Janeiro", 640, 720 * 0.62);
        }
        else if (scene === "cutscene2") {
            ctx.fillStyle = "rgb(180,255,200)"; ctx.font = "bold 44px Arial";
            ctx.fillText("E então, dois caminhos", 640, 720 * 0.40);
            ctx.fillText("se tornaram um.", 640, 720 * 0.47);
            ctx.fillStyle = "rgb(100,170,120)"; ctx.font = "22px Arial";
            ctx.fillText("Próximo destino: Tefé — Amazônia", 640, 720 * 0.62);
        }
        else if (scene === "gameover") {
            ctx.fillStyle = "rgb(255,60,60)"; ctx.font = "bold 62px Arial";
            ctx.fillText("FIM DA JORNADA", 640, 720 * 0.35);
            ctx.fillStyle = "rgb(200,160,160)"; ctx.font = "26px Arial";
            ctx.fillText("Pontuação: " + ESTADO.pontos, 640, 720 * 0.50);
            ctx.fillStyle = "rgb(160,100,100)"; ctx.font = "20px Arial";
            ctx.fillText("A distância não venceu desta vez.", 640, 720 * 0.60);
            if (Math.floor(gameTime * 2) % 2 === 0) {
                ctx.fillStyle = "rgb(220,100,100)"; ctx.font = "bold 24px Arial";
                ctx.fillText("[ ESPAÇO ] tentar de novo", 640, 720 * 0.74);
            }
        }
        else if (scene === "vitoria") {
            ctx.fillStyle = "rgb(255,100,180)"; ctx.font = "bold 52px Arial";
            ctx.fillText("FELIZ DIA DOS NAMORADOS!", 640, 720 * 0.24);
            ctx.fillStyle = "rgb(255,220,100)"; ctx.font = "26px Arial";
            ctx.fillText("Pontuação Final:  " + ESTADO.pontos, 640, 720 * 0.42);
            ctx.fillStyle = "rgb(220,230,255)"; ctx.font = "26px Arial";
            ctx.fillText("De Pelotas ao Rio, e agora em Tefé.", 640, 720 * 0.55);
            ctx.fillText("Onde quer que seja, desde que seja com você.", 640, 720 * 0.60);
            
            ctx.fillStyle = "rgb(255,120,180)";
            let scale = 1 + 0.06 * Math.sin(gameTime * 3);
            ctx.save(); ctx.translate(640, 720 * 0.77); ctx.scale(scale, scale);
            ctx.fillText("Com amor.  ♥", 0, 0); ctx.restore();
        }
    }

    // ── INICIALIZAR ──────────────────────────────────────────────────
    loadScene("menu");
    requestAnimationFrame(gameLoop);

}); // fim do window.addEventListener("load", ...)
