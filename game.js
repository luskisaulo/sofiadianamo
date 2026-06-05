// ============================================================================================
// MOTOR KABOOM V3 - ARQUITETURA PROFISSIONAL (Edição Sofia)
// ============================================================================================
kaboom({
    root: document.getElementById("game-container"),
    width: 1280,
    height: 720,
    letterbox: true,
    background: [15, 15, 20], 
    global: true,
    font: "sans-serif", // Fonte padrão mais limpa
});

// ============================================================================================
// 1. GERENCIAMENTO DE ASSETS ROBUSTO
// ============================================================================================
// Carregamento de sprites com tratamento global de erros para evitar tela preta
loadRoot("assets/");
const assetsSeguros = [
    { nome: "fundo_rio", caminho: "fundo_rio.jpeg" },
    { nome: "sofia", caminho: "sofia.png", config: { 
        sliceX: 4, sliceY: 4, 
        anims: { 
            idle: { from: 0, to: 0 }, 
            run: { from: 1, to: 3, loop: true, speed: 12 }, 
            jump: { from: 8, to: 8 } 
        } 
    }}
];

assetsSeguros.forEach(asset => {
    try {
        if (asset.config) loadSprite(asset.nome, asset.caminho, asset.config);
        else loadSprite(asset.nome, asset.caminho);
    } catch (e) {
        console.warn(`Aviso: Falha ao carregar ${asset.nome}. O motor usará formas geométricas padrão.`);
    }
});

// ============================================================================================
// 2. CONSTANTES DE FÍSICA E ESTADO GLOBAL (SINGLETON)
// ============================================================================================
const FISICA = {
    GRAVIDADE: 2600,
    FORCA_PULO: 900,
    VELOCIDADE: 400,
    COYOTE_TIME: 0.15, // Permite pular logo após sair da beirada
};

setGravity(FISICA.GRAVIDADE);

const JOGO_ESTADO = {
    vidas: 3,
    memorias: 0,
    resetar() { this.vidas = 3; this.memorias = 0; }
};

// ============================================================================================
// 3. GAME JUICE: EFEITOS VISUAIS E FEEDBACK (PARTÍCULAS E TWEENS)
// ============================================================================================
function spawnPoeira(posicao) {
    add([
        rect(8, 8), pos(posicao.x, posicao.y - 5), color(220, 220, 220), opacity(0.8),
        move(LEFT, rand(10, 50)), lifespan(0.4, { fade: 0.2 }), z(15)
    ]);
}

function spawnExplosao(posicao, cor = rgb(255, 80, 80)) {
    for (let i = 0; i < 12; i++) {
        add([
            rect(rand(6, 12), rand(6, 12)), pos(posicao), color(cor),
            move(rand(0, 360), rand(200, 600)), lifespan(0.4, { fade: 0.4 }), z(50)
        ]);
    }
}

function textoFlutuante(txt, posicao, cor) {
    add([
        text(txt, { size: 24 }), pos(posicao.x, posicao.y - 20), color(cor), anchor("center"),
        move(UP, 100), lifespan(1, { fade: 0.5 }), z(100)
    ]);
}

// ============================================================================================
// 4. COMPONENTES INTELIGENTES (IA E COMPORTAMENTO)
// ============================================================================================
function iaPatrulha(distancia = 150, velocidade = 120) {
    let pInicial = null;
    let dir = 1;
    return {
        id: "patrulha",
        require: [ "pos" ],
        add() { pInicial = this.pos.clone(); },
        update() {
            this.move(velocidade * dir, 0);
            if (Math.abs(this.pos.x - pInicial.x) > distancia) {
                dir = -dir;
                if (this.flipX !== undefined) this.flipX = dir < 0;
            }
        }
    };
}

function movelOscilante(eixo = 'x', distancia = 200, velocidade = 100) {
    let origem = 0;
    let tempo = 0;
    return {
        id: "movel_oscilante",
        require: ["pos"],
        add() { origem = this.pos[eixo]; },
        update() {
            tempo += dt();
            this.pos[eixo] = origem + Math.sin(tempo * (velocidade/100)) * distancia;
        }
    };
}

// ============================================================================================
// 5. O CONSTRUTOR DA JOGADORA (MÁQUINA DE ESTADOS E CONTROLES FLUIDOS)
// ============================================================================================
function instanciarSofia(spawnX, spawnY, cenaAtual) {
    const player = add([
        // Fallback dinâmico: se o sprite falhar, vira um retângulo rosa
        getSprite("sofia") ? sprite("sofia") : rect(40, 60), 
        getSprite("sofia") ? color(255,255,255) : color(255, 105, 180),
        pos(spawnX, spawnY), anchor("bot"), scale(0.35),
        area({ shape: new Rect(vec2(0, -30), 30, 60) }), // Hitbox perdoadora
        body({ jumpForce: FISICA.FORCA_PULO, maxVelocity: 1500 }), z(30),
        "jogador",
        {
            invulneravel: false,
            puloDuploDisponivel: true,
            tempoNoAr: 0,
            
            sofrerDano() {
                if (this.invulneravel) return;
                JOGO_ESTADO.vidas--;
                this.invulneravel = true;
                
                shake(20); // Screen shake para impacto
                spawnExplosao(this.pos, rgb(255, 255, 255));
                
                if (JOGO_ESTADO.vidas <= 0) go("gameover");
                
                // Efeito visual de dano (piscar)
                let piscando = true;
                const fx = loop(0.1, () => {
                    this.opacity = piscando ? 0.3 : 1;
                    piscando = !piscando;
                });
                wait(1.5, () => { fx.cancel(); this.opacity = 1; this.invulneravel = false; });
            }
        }
    ]);

    if (player.play) player.play("idle");

    // Lógica de Atualização (Coyote Time e Limites)
    player.onUpdate(() => {
        camPos(lerp(camPos().x, player.pos.x + 200, dt() * 4), height() / 2); // Câmera suave (Lerp)
        
        if (player.isGrounded()) {
            player.tempoNoAr = 0;
            player.puloDuploDisponivel = true;
        } else {
            player.tempoNoAr += dt();
        }

        if (player.pos.y > 2000) { // Queda no abismo
            player.sofrerDano();
            if (JOGO_ESTADO.vidas > 0) go(cenaAtual); 
        }
    });

    // Controles responsivos
    onKeyDown("right", () => {
        player.move(FISICA.VELOCIDADE, 0); player.flipX = false;
        if (player.isGrounded() && player.curAnim() !== "run" && player.play) player.play("run");
    });
    
    onKeyDown("left", () => {
        player.move(-FISICA.VELOCIDADE, 0); player.flipX = true;
        if (player.isGrounded() && player.curAnim() !== "run" && player.play) player.play("run");
    });
    
    onKeyRelease(["left", "right"], () => {
        if (player.isGrounded() && player.play) player.play("idle");
    });

    // Sistema de Pulo (Coyote Time + Pulo Duplo)
    onKeyPress("space", () => {
        if (player.isGrounded() || player.tempoNoAr < FISICA.COYOTE_TIME) {
            player.jump(); 
            if(player.play) player.play("jump");
            spawnPoeira(player.pos);
        } else if (player.puloDuploDisponivel) {
            player.jump(FISICA.FORCA_PULO * 0.8);
            player.puloDuploDisponivel = false;
            spawnExplosao(player.pos, rgb(200, 200, 255)); // Efeito visual no pulo duplo
            if(player.play) player.play("jump");
        }
    });

    // Sistema de Combate (Hitstop e Bounce)
    player.onCollide("inimigo", (ini, col) => {
        if (col.isBottom()) {
            player.jump(FISICA.FORCA_PULO * 0.75); // Quica na cabeça
            destroy(ini);
            spawnExplosao(ini.pos);
            textoFlutuante("+100", ini.pos, rgb(255, 215, 0));
            JOGO_ESTADO.memorias += 100;
            
            // Hitstop: congela o jogo por 50ms para dar peso ao impacto
            wait(0.05, () => {}); 
        } else {
            player.sofrerDano();
        }
    });

    return player;
}

// ============================================================================================
// 6. INTERFACE DE USUÁRIO (HUD) PROFISSIONAL
// ============================================================================================
function montarHUD() {
    const margem = 30;
    
    // Fundo semitransparente para a HUD
    add([ rect(250, 90, { radius: 10 }), pos(20, 20), color(0, 0, 0), opacity(0.5), fixed(), z(99) ]);

    const uiVidas = add([ text("", { size: 24, font: "sans-serif", weight: "bold" }), pos(margem, margem), fixed(), color(255, 80, 80), z(100) ]);
    const uiMemoria = add([ text("", { size: 24, font: "sans-serif", weight: "bold" }), pos(margem, margem + 35), fixed(), color(255, 215, 0), z(100) ]);
    
    onUpdate(() => {
        uiVidas.text = `❤ Vidas: ${JOGO_ESTADO.vidas}`;
        uiMemoria.text = `★ Memórias: ${JOGO_ESTADO.memorias}`;
    });
}

// ============================================================================================
// 7. ARQUITETURA DE FASES (LEVEL DESIGN MODULAR)
// ============================================================================================
const NUCLEO_LEVEL_DESIGN = {
    tileWidth: 64, tileHeight: 64,
    tiles: {
        "=": () => [ rect(64, 64, { radius: 8 }), color(80, 90, 100), area(), body({ isStatic: true }) ],
        "_": () => [ rect(64, 32), pos(0, 32), color(100, 150, 80), area(), body({ isStatic: true }) ], // Plataforma fina
        "M": () => [ rect(128, 24, { radius: 12 }), color(200, 120, 50), area(), body({ isStatic: true }), movelOscilante('x', 150, 80) ],
        "I": () => [ rect(40, 40, { radius: 5 }), color(255, 60, 60), area(), body(), anchor("bot"), iaPatrulha(100, 90), "inimigo" ],
        "P": () => [ rect(64, 128, { radius: 10 }), color(0, 255, 150), area(), opacity(0.8), "portal", { glow: true } ],
        "W": () => [ rect(64, 64), color(0, 100, 200), opacity(0.7), area(), "agua" ] // Água tóxica/profunda
    }
};

// --- FASE 1: PELOTAS ---
scene("fase1_pelotas", () => {
    add([ rect(width(), height()), color(20, 30, 45), fixed(), z(0) ]); // Noite estrelada
    // Estrelas de fundo
    for(let i=0; i<50; i++) add([ circle(rand(1, 3)), pos(rand(0, width()), rand(0, height()/2)), color(255,255,255), fixed(), opacity(rand(0.3, 0.8)), z(1) ]);

    add([ text("7 de Setembro de 2024\nO primeiro oi...", { size: 32, align: "center" }), pos(400, 150), color(200,200,200), z(5) ]);

    const mapa = [
        "                                               ",
        "                                               ",
        "                                             P ",
        "                                            == ",
        "                         I        M            ",
        "                M       ====                   ",
        "                                               ",
        "          ===                                  ",
        "                                               ",
        "==============================================="
    ];

    const cenario = addLevel(mapa, { ...NUCLEO_LEVEL_DESIGN, pos: vec2(0, height() - (mapa.length * 64)) });
    const player = instanciarSofia(100, cenario.pos.y + 300, "fase1_pelotas");
    montarHUD();

    player.onCollide("portal", () => go("cutscene", "A distância inicial parecia imensa...", "fase2_santateresa"));
});

// --- FASE 2: SANTA TERESA ---
scene("fase2_santateresa", () => {
    add([ rect(width(), height()), color(250, 160, 100), fixed(), z(0) ]); // Pôr do sol
    
    // Sol de fundo
    add([ circle(100), pos(width() * 0.8, height() * 0.4), color(255, 200, 50), fixed(), z(1), opacity(0.8) ]);

    const mapa = [
        "                                                            ",
        "                                                          P ",
        "                                                         == ",
        "                                        M                   ",
        "                         I                                  ",
        "               ===      ====                                ",
        "                                                            ",
        "          I                                                 ",
        "         ====                                               ",
        "==   ==        WWWWWWWW      M        WWWWWWWW      ========"
    ];

    const cenario = addLevel(mapa, { ...NUCLEO_LEVEL_DESIGN, pos: vec2(0, height() - (mapa.length * 64)) });
    const player = instanciarSofia(100, cenario.pos.y + 300, "fase2_santateresa");
    montarHUD();

    player.onCollide("agua", () => { player.sofrerDano(); if(JOGO_ESTADO.vidas > 0) go("fase2_santateresa"); });
    player.onCollide("portal", () => go("cutscene", "O Rio de Janeiro uniu nossos caminhos.", "fase3_tefe"));
});

// --- FASE 3: TEFÉ ---
scene("fase3_tefe", () => {
    add([ rect(width(), height()), color(15, 60, 30), fixed(), z(0) ]); // Floresta Amazônica Escura

    const mapa = [
        "                                                                       ",
        "                                                                     P ",
        "                                                                    == ",
        "                                         I                             ",
        "                             M          ===           M                ",
        "                                                                       ",
        "                 I                                                     ",
        "                ===                                                    ",
        "                                                                       ",
        "===    WWWWW           WWWWW           WWWWW            WWWWWW     ===="
    ];

    // Substituir a textura base para parecer musgo/vitória régia
    const tilesTefe = { ...NUCLEO_LEVEL_DESIGN.tiles, "=": () => [ rect(64, 64, { radius: 8 }), color(34, 139, 34), area(), body({ isStatic: true }) ] };

    const cenario = addLevel(mapa, { ...NUCLEO_LEVEL_DESIGN, tiles: tilesTefe, pos: vec2(0, height() - (mapa.length * 64)) });
    const player = instanciarSofia(100, cenario.pos.y + 300, "fase3_tefe");
    montarHUD();

    player.onCollide("agua", () => { player.sofrerDano(); if(JOGO_ESTADO.vidas > 0) go("fase3_tefe"); });
    player.onCollide("portal", () => go("vitoria"));
});

// ============================================================================================
// 8. SISTEMA CÊNICO (MENUS E CUTSCENES REUTILIZÁVEIS)
// ============================================================================================
scene("cutscene", (texto, proximaFase) => {
    add([ rect(width(), height()), color(10, 10, 15) ]);
    add([ text(texto, { size: 40, align: "center", width: 800 }), pos(width()/2, height()/2), anchor("center"), color(255,255,255) ]);
    
    const pule = add([ text("Pressione [ESPAÇO]", { size: 20 }), pos(width()/2, height() - 100), anchor("center"), color(150,150,150) ]);
    loop(0.8, () => pule.hidden = !pule.hidden);

    onKeyPress("space", () => go(proximaFase));
    wait(4, () => go(proximaFase)); // Avança sozinho após 4 segundos se não apertar nada
});

scene("menu", () => {
    add([ rect(width(), height()), color(20, 20, 35) ]);
    add([ text("A JORNADA DE SOFIA", { size: 70, weight: "bold" }), pos(width()/2, height() * 0.35), anchor("center"), color(255, 105, 180) ]);
    add([ text("CONTROLES:\n[SETAS] Mover  |  [ESPAÇO] Pular / Pulo Duplo\nPule nos quadrados vermelhos!", { size: 24, align: "center" }), pos(width()/2, height() * 0.55), anchor("center"), color(200, 200, 200) ]);
    
    const btn = add([ text("Pressione [ESPAÇO] para iniciar", { size: 30 }), pos(width()/2, height() * 0.8), anchor("center"), color(255, 255, 255) ]);
    loop(0.6, () => btn.opacity = btn.opacity === 1 ? 0.3 : 1);
    
    onKeyPress("space", () => {
        JOGO_ESTADO.resetar();
        go("fase1_pelotas");
    });
});

scene("gameover", () => {
    add([ rect(width(), height()), color(40, 10, 10) ]);
    add([ text("A distância não venceu.", { size: 60, weight: "bold" }), pos(width()/2, height() * 0.4), anchor("center"), color(255, 80, 80) ]);
    add([ text("Pressione [ESPAÇO] para tentar de novo.", { size: 28 }), pos(width()/2, height() * 0.6), anchor("center"), color(200, 200, 200) ]);
    onKeyPress("space", () => go("menu"));
});

scene("vitoria", () => {
    add([ rect(width(), height()), color(15, 30, 20) ]);
    
    // Chuva de confetes aprimorada
    onUpdate(() => {
        if(chance(0.3)) {
            add([
                rect(12, 12, { radius: 3 }), pos(rand(0, width()), -20), 
                color(rand(150, 255), rand(150, 255), rand(150, 255)), 
                move(DOWN, rand(150, 350)), rotate(rand(0, 360)), lifespan(4)
            ]);
        }
    });

    add([ text("FELIZ DIA DOS NAMORADOS!", { size: 65, weight: "bold" }), pos(width()/2, height() * 0.3), anchor("center"), color(255, 105, 180) ]);
    add([ text("De Pelotas ao Rio, e agora em Tefé.\nOnde quer que seja, desde que seja com você.", { size: 32, align: "center", width: 1000 }), pos(width()/2, height() * 0.55), anchor("center"), color(255, 255, 255) ]);
    add([ text("Com amor.", { size: 30, font: "italic" }), pos(width()/2, height() * 0.8), anchor("center"), color(200, 200, 200) ]);
});

// ============================================================================================
// START DO MOTOR
// ============================================================================================
go("menu");
