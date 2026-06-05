// ============================================================================================
// MOTOR KABOOM V3 - CONFIGURAÇÃO DE ALTA PERFORMANCE
// ============================================================================================
kaboom({
    root: document.getElementById("game-container"),
    width: 1280,
    height: 720,
    letterbox: true,      // Escala perfeita em qualquer tela (celular ou PC)
    background: [10, 10, 15], // Tela de fundo escura (evita a "tela azul" do vazio)
    global: true,
});

// ============================================================================================
// 1. GERENCIAMENTO DE ASSETS E PRELOADER SEGURO
// ============================================================================================
// O jogo não vai quebrar se a imagem não carregar. Ele vai usar quadrados estilizados como fallback.
loadSprite("fundo_rio", "assets/fundo_rio.jpeg").catch(() => {});

// Fatiamento da Sofia. IMPORTANTE: Se ela ficar invisível, o problema é o tamanho do seu PNG.
loadSprite("sofia", "assets/sofia.png", {
    sliceX: 4, sliceY: 4, 
    anims: {
        idle: { from: 0, to: 0 },
        run: { from: 1, to: 3, loop: true, speed: 12 },
        jump: { from: 8, to: 8 },
    }
}).catch(() => {
    // FALLBACK DE SEGURANÇA: Se a imagem falhar, cria uma boneca rosa
    loadSpriteAtlas("fallback", { "sofia": { x: 0, y: 0, width: 40, height: 60 }});
});

// ============================================================================================
// 2. VARIÁVEIS GLOBAIS E FÍSICA
// ============================================================================================
const GRAVIDADE = 2400;
const FORCA_PULO = 850;
const VELOCIDADE_JOGADOR = 350;

setGravity(GRAVIDADE);

const ESTADO_GLOBAL = {
    vidas: 3,
    memorias: 0,
    faseAtual: 1
};

// ============================================================================================
// 3. EFEITOS VISUAIS E GAME JUICE (SISTEMA DE PARTÍCULAS)
// ============================================================================================
function gerarPoeira(posicao) {
    add([
        rect(10, 10), pos(posicao.x, posicao.y - 5), color(200, 200, 200),
        move(LEFT, rand(20, 80)), lifespan(0.3, { fade: 0.1 }), z(15)
    ]);
}

function gerarExplosaoInimigo(posicao) {
    for (let i = 0; i < 15; i++) {
        add([
            rect(8, 8), pos(posicao), color(255, 50, 50),
            move(rand(0, 360), rand(150, 500)), lifespan(0.5, { fade: 0.5 }), z(50)
        ]);
    }
}

// ============================================================================================
// 4. ENTIDADES E COMPONENTES INTELIGENTES (IA e Física)
// ============================================================================================

// IA Básica de Patrulha para os Inimigos
function patrulha(distancia = 100, velocidade = 100) {
    let pInicial = null;
    let dir = 1;
    return {
        id: "patrulha",
        require: [ "pos" ],
        add() { pInicial = this.pos.clone(); },
        update() {
            this.move(velocidade * dir, 0);
            if (Math.abs(this.pos.x - pInicial.x) > distancia) dir = -dir;
        }
    };
}

// Plataformas que se movem sozinhas
function plataformaFlutuante(distancia, velocidade, eixo = 'x') {
    let pInicial = null;
    let dir = 1;
    return {
        id: "plat_movel",
        require: [ "pos" ],
        add() { pInicial = this.pos.clone(); },
        update() {
            if (eixo === 'x') {
                this.move(velocidade * dir, 0);
                if (Math.abs(this.pos.x - pInicial.x) > distancia) dir = -dir;
            } else {
                this.move(0, velocidade * dir);
                if (Math.abs(this.pos.y - pInicial.y) > distancia) dir = -dir;
            }
        }
    };
}

// ============================================================================================
// 5. O CONSTRUTOR DO JOGADOR (A SOFIA) - FÍSICA BLINDADA
// ============================================================================================
function criarSofia(posX, posY, nomeCenaMorte) {
    const player = add([
        sprite("sofia"),
        pos(posX, posY),
        scale(0.35), // Ajuste a escala conforme o tamanho do seu PNG
        anchor("bot"), // O segredo para não afundar no chão: colisão pelos pés
        area({ shape: new Rect(vec2(0, -40), 40, 70) }), // Hitbox manual estrita
        body(), // Habilita gravidade e colisão sólida
        z(30),
        "jogador",
        {
            invulneravel: false,
            sofrerDano() {
                if (this.invulneravel) return;
                ESTADO_GLOBAL.vidas--;
                this.invulneravel = true;
                shake(15);
                
                if (ESTADO_GLOBAL.vidas <= 0) go("gameover");
                
                let piscando = true;
                const efeito = loop(0.1, () => {
                    this.color = piscando ? rgb(255, 0, 0) : rgb(255, 255, 255);
                    piscando = !piscando;
                });
                wait(1.5, () => { efeito.cancel(); this.color = rgb(255, 255, 255); this.invulneravel = false; });
            }
        }
    ]);

    player.play("idle");

    // Lógica de Controles
    onKeyDown("right", () => {
        player.move(VELOCIDADE_JOGADOR, 0); player.flipX = false;
        if (player.isGrounded() && player.curAnim() !== "run") player.play("run");
    });
    
    onKeyDown("left", () => {
        player.move(-VELOCIDADE_JOGADOR, 0); player.flipX = true;
        if (player.isGrounded() && player.curAnim() !== "run") player.play("run");
    });
    
    onKeyRelease(["left", "right"], () => {
        if (player.isGrounded()) player.play("idle");
    });
    
    onKeyPress("space", () => {
        if (player.isGrounded()) {
            player.jump(FORCA_PULO); player.play("jump"); gerarPoeira(player.pos);
        }
    });

    player.onGround(() => {
        gerarPoeira(player.pos);
        if (!isKeyDown("left") && !isKeyDown("right")) player.play("idle");
        else player.play("run");
    });

    // Câmera e Prevenção de Queda no Vazio (O erro que você relatou)
    player.onUpdate(() => {
        camPos(player.pos.x + 250, height() / 2);
        
        // Se ela cair além do limite do mapa (3000 pixels para baixo), toma dano e reinicia
        if (player.pos.y > 3000) {
            player.sofrerDano();
            if (ESTADO_GLOBAL.vidas > 0) go(nomeCenaMorte); 
        }
    });

    // Combate: Pular na cabeça do inimigo
    player.onCollide("inimigo", (ini, col) => {
        if (col.isBottom()) {
            player.jump(FORCA_PULO * 0.7);
            destroy(ini);
            gerarExplosaoInimigo(ini.pos);
            ESTADO_GLOBAL.memorias += 100;
        } else {
            player.sofrerDano();
        }
    });

    return player;
}

// ============================================================================================
// 6. INTERFACE (HUD)
// ============================================================================================
function criarHUD() {
    const uiVidas = add([ text(`VIDAS: ${ESTADO_GLOBAL.vidas}`, { size: 28 }), pos(30, 30), fixed(), color(255, 50, 50), z(100) ]);
    const uiPontos = add([ text(`MEMÓRIAS: ${ESTADO_GLOBAL.memorias}`, { size: 28 }), pos(30, 70), fixed(), color(255, 215, 0), z(100) ]);
    
    onUpdate(() => {
        uiVidas.text = `VIDAS: ${ESTADO_GLOBAL.vidas}`;
        uiPontos.text = `MEMÓRIAS: ${ESTADO_GLOBAL.memorias}`;
    });
}

// ============================================================================================
// 7. LEVEL DESIGN - AS 3 FASES COMPLETAS
// ============================================================================================

// FASE 1: O Início (Pelotas / Setembro)
scene("fase1_pelotas", () => {
    add([ rect(width(), height()), color(30, 40, 60), fixed(), z(0) ]); // Fundo azul escuro frio
    add([ text("7 de Set. 2024\nA primeira mensagem...", { size: 30 }), pos(100, 100), fixed(), color(255,255,255), z(1) ]);

    const mapa = [
        "                                               ",
        "                                               ",
        "                                           P   ",
        "                                          ===  ",
        "                             ====              ",
        "                                               ",
        "                  ====                         ",
        "                                               ",
        "=============================================== "
    ];

    addLevel(mapa, {
        tileWidth: 64, tileHeight: 64, pos: vec2(0, height() - (9 * 64)),
        tiles: {
            "=": () => [ rect(64, 64), color(100, 100, 110), outline(2), area(), body({ isStatic: true }) ],
            "P": () => [ rect(64, 128), color(0, 255, 100), area(), "portal" ]
        }
    });

    // O SPAWN É SEGURO AQUI. Tem chão sob x: 100
    const player = criarSofia(100, height() - 150, "fase1_pelotas");
    criarHUD();

    player.onCollide("portal", () => { go("cutscene_1"); });
});

// FASE 2: Santa Teresa (Março / O Encontro)
scene("fase2_santateresa", () => {
    add([ rect(width(), height()), color(255, 140, 100), fixed(), z(0) ]); // Pôr do sol
    
    // Tenta carregar a sua arte no fundo
    try { add([ sprite("fundo_rio", { width: 3000, height: height() }), pos(0, 0), z(1) ]); } catch(e){}

    const mapa = [
        "                                                                     ",
        "                                                                     ",
        "                                                                 P   ",
        "                                                                ===  ",
        "                                              * ",
        "                                    >        ====                    ",
        "                            ===                                      ",
        "                 ^                                                   ",
        "                                                                     ",
        "          ====                                                       ",
        "     * ",
        "===============      ============     ==============================="
    ];

    addLevel(mapa, {
        tileWidth: 64, tileHeight: 64, pos: vec2(0, height() - (12 * 64)),
        tiles: {
            "=": () => [ rect(64, 64), color(180, 170, 160), outline(2), area(), body({ isStatic: true }) ],
            "^": () => [ rect(128, 20), color(200, 100, 50), area(), body({ isStatic: true }), plataformaFlutuante(150, 100, 'y') ],
            ">": () => [ rect(128, 20), color(200, 100, 50), area(), body({ isStatic: true }), plataformaFlutuante(200, 100, 'x') ],
            "*": () => [ rect(40, 40), color(255, 50, 50), area(), body(), anchor("bot"), patrulha(150, 80), "inimigo" ],
            "P": () => [ rect(64, 128), color(0, 255, 100), area(), "portal" ]
        }
    });

    const player = criarSofia(100, height() - 300, "fase2_santateresa");
    criarHUD();

    player.onCollide("portal", () => { go("cutscene_2"); });
});

// FASE 3: Tefé, Amazonas (O Presente)
scene("fase3_tefe", () => {
    add([ rect(width(), height()), color(20, 80, 40), fixed(), z(0) ]); // Verde floresta escuro

    // O RIO (Morte instantânea se encostar)
    add([ rect(4000, 150), pos(0, height() - 50), color(0, 50, 150), area(), "agua", z(50) ]);

    const mapa = [
        "                                                                                    ",
        "                                                                                P   ",
        "                                                                               ===  ",
        "                                                 ===                                ",
        "                                                                                    ",
        "                                         ===                                        ",
        "                                                                                    ",
        "                                 >                                                  ",
        "                                                                                    ",
        "                    ===                                                             ",
        "                                                                                    ",
        "======                                                                              ",
        "                                                                                    "
    ];

    addLevel(mapa, {
        tileWidth: 64, tileHeight: 64, pos: vec2(0, height() - (13 * 64)),
        tiles: {
            "=": () => [ rect(64, 30), color(0, 150, 50), outline(2), area(), body({ isStatic: true }) ], // Vitória Régia
            ">": () => [ rect(128, 30), color(0, 200, 100), area(), body({ isStatic: true }), plataformaFlutuante(300, 120, 'x') ],
            "P": () => [ rect(64, 128), color(255, 105, 180), area(), "portal_final" ] // O Presente
        }
    });

    const player = criarSofia(100, height() - 300, "fase3_tefe");
    criarHUD();

    player.onCollide("agua", () => {
        player.sofrerDano();
        if(ESTADO_GLOBAL.vidas > 0) go("fase3_tefe");
    });

    player.onCollide("portal_final", () => { go("vitoria"); });
});

// ============================================================================================
// 8. CUTSCENES (A História Imersiva)
// ============================================================================================
scene("cutscene_1", () => {
    add([ rect(width(), height()), color(0, 0, 0) ]);
    add([ text("A primeira mensagem cruzou o país...", { size: 40 }), pos(width()/2, height()/2), anchor("center") ]);
    wait(3, () => go("fase2_santateresa"));
});

scene("cutscene_2", () => {
    add([ rect(width(), height()), color(0, 0, 0) ]);
    add([ text("E então, o Rio de Janeiro uniu dois caminhos.", { size: 40 }), pos(width()/2, height()/2), anchor("center") ]);
    wait(3, () => go("fase3_tefe"));
});

// ============================================================================================
// 9. TELAS DO SISTEMA (Menu, GameOver e Vitória)
// ============================================================================================
scene("menu", () => {
    add([ rect(width(), height()), color(15, 15, 25) ]);
    
    add([ text("A JORNADA DE SOFIA", { size: 70 }), pos(width()/2, height()/3), anchor("center"), color(255, 105, 180) ]);
    add([ text("SETAS: Move  |  ESPAÇO: Pula  |  Pule nos inimigos", { size: 24 }), pos(width()/2, height()/2), anchor("center"), color(150, 150, 150) ]);
    
    const btn = add([ text("Pressione [ESPAÇO] para iniciar", { size: 30 }), pos(width()/2, height()/1.3), anchor("center") ]);
    loop(0.5, () => btn.hidden = !btn.hidden);
    
    onKeyPress("space", () => {
        ESTADO_GLOBAL.vidas = 3;
        ESTADO_GLOBAL.memorias = 0;
        go("fase1_pelotas");
    });
});

scene("gameover", () => {
    add([ rect(width(), height()), color(50, 0, 0) ]);
    add([ text("FIM DA JORNADA", { size: 80 }), pos(width()/2, height()/3), anchor("center"), color(255, 50, 50) ]);
    add([ text("A distância não pode vencer. Tente de novo.", { size: 30 }), pos(width()/2, height()/2), anchor("center") ]);
    add([ text("Pressione ESPAÇO", { size: 24 }), pos(width()/2, height()/1.3), anchor("center") ]);
    onKeyPress("space", () => go("menu"));
});

scene("vitoria", () => {
    add([ rect(width(), height()), color(10, 50, 20) ]);
    
    // Efeito de confete
    loop(0.1, () => {
        add([ rect(10, 10), pos(rand(0, width()), -10), color(rand(100, 255), rand(100, 255), rand(100, 255)), move(DOWN, rand(100, 300)), lifespan(3) ]);
    });

    add([ text("BEM-VINDA A TEFÉ!", { size: 80 }), pos(width()/2, height()/4), anchor("center"), color(50, 255, 50) ]);
    add([ text("De Pelotas ao Rio, e agora no Amazonas.", { size: 30 }), pos(width()/2, height()/2), anchor("center"), color(255, 255, 255) ]);
    add([ text("Feliz Dia dos Namorados, Sofia Eymard!", { size: 50 }), pos(width()/2, height()/1.5), anchor("center"), color(255, 105, 180) ]);
});

// ============================================================================================
// INICIA O MOTOR
// ============================================================================================
go("menu");
