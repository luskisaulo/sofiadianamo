// =========================================================================
// MOTOR KABOOM - CONFIGURAÇÃO DE ALTA RESOLUÇÃO E RESPONSIVIDADE
// =========================================================================
kaboom({
    root: document.getElementById("game-container"),
    width: 1280,
    height: 720,
    letterbox: true, // Mantém a proporção em qualquer monitor/celular
    background: [15, 15, 20],
    global: true,
});

// =========================================================================
// 1. GERENCIADOR DE RECURSOS (PRELOADER)
// =========================================================================
// DICA: Substitua pelas suas artes finais
loadSprite("fundo_rio", "assets/fundo_rio.jpeg").catch(() => {});

// Corrigindo o fatiamento da Sofia (se ainda der problema, a arte precisa de edição no Photoshop)
loadSprite("sofia", "assets/sofia.png", {
    sliceX: 4, 
    sliceY: 4, 
    anims: {
        idle: { from: 0, to: 0 },
        run: { from: 1, to: 3, loop: true, speed: 12 },
        jump: { from: 8, to: 8 },
        fall: { from: 9, to: 9 }, // Animação de queda se houver
    }
});

// =========================================================================
// 2. VARIÁVEIS GERAIS E FÍSICA DO MOTOR
// =========================================================================
const GRAVIDADE = 2400;
const FORCA_PULO = 900;
const VELOCIDADE_JOGADOR = 350;
const ESCALA_SOFIA = 0.4; 

setGravity(GRAVIDADE);

// Estado Global do Jogo
let pontuacaoGlobal = 0;
let vidasGlobais = 3;

// =========================================================================
// 3. COMPONENTES CUSTOMIZADOS (PROGRAMAÇÃO ORIENTADA A OBJETOS)
// =========================================================================

// Componente: Patrulha de Inimigos (IA básica que inverte direção ao bater em paredes)
function patrulhaInimiga(velocidade = 100, direcao = 1) {
    return {
        id: "patrol",
        require: [ "pos", "area" ],
        add() {
            this.on("collide", (obj, col) => {
                if (col.isLeft() || col.isRight()) {
                    direcao = -direcao;
                    if(this.flipX !== undefined) this.flipX = direcao > 0;
                }
            });
        },
        update() {
            this.move(velocidade * direcao, 0);
        }
    };
}

// Componente: Plataforma Móvel (Vertical ou Horizontal)
function plataformaMovel(distancia, velocidade, eixo = 'x') {
    let posicaoInicial = null;
    let direcao = 1;

    return {
        id: "moving_platform",
        require: [ "pos" ],
        add() { posicaoInicial = this.pos.clone(); },
        update() {
            if (eixo === 'x') {
                this.move(velocidade * direcao, 0);
                if (Math.abs(this.pos.x - posicaoInicial.x) > distancia) direcao = -direcao;
            } else {
                this.move(0, velocidade * direcao);
                if (Math.abs(this.pos.y - posicaoInicial.y) > distancia) direcao = -direcao;
            }
        }
    };
}

// Efeito de Partículas (Explosão do inimigo)
function spawnExplosao(posicao) {
    for (let i = 0; i < 15; i++) {
        add([
            rect(6, 6),
            pos(posicao.x, posicao.y),
            color(255, rand(50, 200), 50),
            move(rand(0, 360), rand(100, 300)),
            lifespan(0.5, { fade: 0.5 }),
            z(50)
        ]);
    }
}

// =========================================================================
// 4. ENTIDADE PRINCIPAL: A JOGADORA (SOFIA)
// =========================================================================
function instanciarSofia(posX, posY) {
    const player = add([
        sprite("sofia"),
        pos(posX, posY),
        scale(ESCALA_SOFIA),
        anchor("bot"), // Pés no chão
        // Área de colisão precisa (Hitbox)
        area({ offset: vec2(0, -10), shape: new Rect(vec2(0, -60), 40, 70) }),
        body(),
        z(20),
        "jogador",
        {
            invulneravel: false,
            tomarDano() {
                if (this.invulneravel) return;
                vidasGlobais--;
                this.invulneravel = true;
                shake(15);
                
                if (vidasGlobais <= 0) {
                    go("gameover");
                } else {
                    // Efeito de piscar vermelho quando toma dano (I-frames)
                    let piscando = true;
                    const efeitoPiscar = loop(0.1, () => {
                        this.color = piscando ? rgb(255, 0, 0) : rgb(255, 255, 255);
                        piscando = !piscando;
                    });
                    
                    wait(1.5, () => {
                        efeitoPiscar.cancel();
                        this.color = rgb(255, 255, 255);
                        this.invulneravel = false;
                    });
                }
            }
        }
    ]);

    player.play("idle");

    // Controles de Movimento
    onKeyDown("right", () => {
        player.move(VELOCIDADE_JOGADOR, 0);
        player.flipX = false;
        if (player.isGrounded() && player.curAnim() !== "run") player.play("run");
    });

    onKeyDown("left", () => {
        player.move(-VELOCIDADE_JOGADOR, 0);
        player.flipX = true;
        if (player.isGrounded() && player.curAnim() !== "run") player.play("run");
    });

    onKeyRelease(["left", "right"], () => {
        if (player.isGrounded()) player.play("idle");
    });

    onKeyPress("space", () => {
        if (player.isGrounded()) {
            player.jump(FORCA_PULO);
            player.play("jump");
            add([ rect(15,5), pos(player.pos.x, player.pos.y), color(200,200,200), lifespan(0.2, {fade: 0.1}), z(19) ]);
        }
    });

    // Câmera Profissional Suave (Smooth Camera)
    player.onUpdate(() => {
        // Câmera travada no eixo Y para não enjoar, segue apenas o X com limite
        let camX = player.pos.x + 250;
        if (camX < width() / 2) camX = width() / 2;
        camPos(camX, height() / 2 - 50);

        if (player.pos.y > height() + 400) {
            vidasGlobais--;
            if(vidasGlobais <= 0) go("gameover");
            else go(sceneName()); // Recarrega a fase
        }
    });

    // LÓGICA DE COMBATE: Pulo na cabeça do inimigo (Stomp)
    player.onCollide("inimigo", (inimigo, col) => {
        // Se a colisão for por cima (bottom of player hits top of enemy)
        if (col.isBottom()) {
            player.jump(FORCA_PULO * 0.7); // Quica na cabeça
            destroy(inimigo);
            spawnExplosao(inimigo.pos);
            pontuacaoGlobal += 100;
            atualizarHUD();
        } else {
            player.tomarDano();
        }
    });

    return player;
}

// =========================================================================
// 5. INTERFACE DO USUÁRIO (HUD)
// =========================================================================
let hudVidas, hudPontos;

function criarHUD() {
    hudVidas = add([
        text(`VIDAS: ${vidasGlobais}`, { size: 24, font: "monospace" }),
        pos(24, 24), fixed(), color(255, 50, 50), z(100)
    ]);

    hudPontos = add([
        text(`MEMÓRIAS: ${pontuacaoGlobal}`, { size: 24, font: "monospace" }),
        pos(24, 60), fixed(), color(255, 215, 0), z(100)
    ]);
}

function atualizarHUD() {
    if(hudVidas) hudVidas.text = `VIDAS: ${vidasGlobais}`;
    if(hudPontos) hudPontos.text = `MEMÓRIAS: ${pontuacaoGlobal}`;
}

// =========================================================================
// 6. AS FASES (LEVEL DESIGN AVANÇADO)
// =========================================================================

scene("fase_santa_teresa", () => {
    // Parallax de Fundo
    add([ sprite("fundo_rio", { width: 3000, height: height() }), pos(0, 0), z(0) ]);

    // DICIONÁRIO DO LEVEL DESIGN
    // = : Chão Invisível (pra andar sobre a arte)
    // - : Plataforma flutuante
    // * : Inimigo (Saudade/Distância)
    // $ : Moeda/Lembrança
    // > : Plataforma que se move horizontalmente
    // ^ : Plataforma que se move verticalmente
    // @ : O Jogador
    // P : O Portal para vencer

    const mapaFase = [
        "                                                                                    ",
        "                                                                                    ",
        "                                                                               P    ",
        "                                           ^                                  ==    ",
        "                                                                                    ",
        "                                                                                    ",
        "                           -                                                        ",
        "                                    >                 -                             ",
        "               $                                                      *             ",
        "             ---                                                    ====            ",
        "      *                 *                  *                                        ",
        "================================      ===========    ===========================    "
    ];

    const configMapa = {
        tileWidth: 64,
        tileHeight: 64,
        pos: vec2(0, height() - (12 * 64)), // Alinha o fundo do mapa com a tela
        tiles: {
            "=": () => [ rect(64, 64), area(), body({ isStatic: true }), color(0,255,0), opacity(0), "chao" ], // Chão invisível
            "-": () => [ rect(64, 20), area(), body({ isStatic: true }), color(100,50,0), z(10) ], // Plataforma real de madeira
            "$": () => [ circle(15), area(), color(255,215,0), "lembranca", z(10) ], // Coletável
            "*": () => [ rect(40, 40), area(), body(), color(255,0,0), patrulhaInimiga(150), anchor("bot"), "inimigo", z(15) ], // Inimigo vermelho
            ">": () => [ rect(120, 20), area(), body({ isStatic: true }), color(0,100,200), plataformaMovel(200, 100, 'x'), z(10) ], // Elevador horizontal
            "^": () => [ rect(120, 20), area(), body({ isStatic: true }), color(0,150,200), plataformaMovel(200, 100, 'y'), z(10) ], // Elevador vertical
            "P": () => [ rect(64, 128), area(), color(255,100,255), "portal_fim", z(5) ] // Final da fase
        }
    };

    // Gera o mundo com base no array acima
    const nivel = addLevel(mapaFase, configMapa);

    // O jogador será spawnado manualmente para controle fino de posição
    const player = instanciarSofia(100, height() - 200);

    criarHUD();

    // INTERAÇÕES DA FASE
    player.onCollide("lembranca", (moeda) => {
        destroy(moeda);
        pontuacaoGlobal += 50;
        atualizarHUD();
        // Feedback visual
        add([ text("+50", {size:20}), pos(moeda.pos), color(255,255,0), move(UP, 100), lifespan(0.5, {fade: 0.2}) ]);
    });

    player.onCollide("portal_fim", () => {
        go("vitoria");
    });
});

// =========================================================================
// 7. TELAS DE SISTEMA (MENU, GAMEOVER, VITÓRIA)
// =========================================================================
scene("menu", () => {
    add([ rect(width(), height()), color(20, 20, 30) ]);
    
    add([
        text("A JORNADA ÉPICA DE SOFIA", { size: 60 }),
        pos(width()/2, height()/3), anchor("center"), color(255, 105, 180)
    ]);

    add([
        text("SETAS: Move  |  ESPAÇO: Pula  |  Pule na cabeça dos inimigos!", { size: 24 }),
        pos(width()/2, height()/2 + 50), anchor("center"), color(200, 200, 200)
    ]);

    const btn = add([ text("Pressione [ESPAÇO] para iniciar", { size: 30 }), pos(width()/2, height()/1.3), anchor("center"), color(255, 255, 255) ]);
    loop(0.5, () => btn.hidden = !btn.hidden); // Pisca

    onKeyPress("space", () => {
        vidasGlobais = 3;
        pontuacaoGlobal = 0;
        go("fase_santa_teresa");
    });
});

scene("gameover", () => {
    add([ rect(width(), height()), color(50, 0, 0) ]);
    add([ text("FIM DA JORNADA", { size: 80 }), pos(width()/2, height()/3), anchor("center"), color(255, 50, 50) ]);
    add([ text("A distância venceu desta vez...", { size: 30 }), pos(width()/2, height()/2), anchor("center"), color(200, 200, 200) ]);
    add([ text("Pressione ESPAÇO para tentar de novo", { size: 24 }), pos(width()/2, height() - 100), anchor("center") ]);

    onKeyPress("space", () => go("menu"));
});

scene("vitoria", () => {
    add([ rect(width(), height()), color(0, 50, 20) ]);
    add([ text("VOCÊ CHEGOU EM TEFÉ!", { size: 80 }), pos(width()/2, height()/3), anchor("center"), color(50, 255, 50) ]);
    add([ text(`Pontuação Final de Memórias: ${pontuacaoGlobal}`, { size: 40 }), pos(width()/2, height()/2), anchor("center"), color(255, 215, 0) ]);
    add([ text("Feliz Dia dos Namorados!", { size: 50 }), pos(width()/2, height()/1.5), anchor("center"), color(255, 105, 180) ]);
});

// START
go("menu");
