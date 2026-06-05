// =========================================================================
// MOTOR KABOOM - RENDERIZAÇÃO RETRÔ E ESCALA PERFEITA
// =========================================================================
kaboom({
    root: document.getElementById("game-container"),
    width: 1280,
    height: 720,
    letterbox: true,
    background: [20, 24, 36], // Fundo noturno elegante
    global: true,
});

// =========================================================================
// 1. CARREGAMENTO (Apenas a Sofia)
// =========================================================================
// Mantemos a Sofia, mas vamos forçar o tamanho dela caso a imagem esteja errada
loadSprite("sofia", "assets/sofia.png", {
    sliceX: 4, sliceY: 4, 
    anims: {
        idle: { from: 0, to: 0 },
        run: { from: 1, to: 3, loop: true, speed: 12 },
        jump: { from: 8, to: 8 },
    }
}).catch(() => {
    // Se a imagem falhar, cria um boneco de fallback estilizado automaticamente
    loadSpriteAtlas("fallback", { "sofia": { x: 0, y: 0, width: 40, height: 60 } });
});

// Constantes Físicas
const GRAVIDADE = 2400;
const FORCA_PULO = 850;
const VELOCIDADE_JOGADOR = 350;

setGravity(GRAVIDADE);

let pontuacao = 0;
let vidas = 3;

// =========================================================================
// 2. SISTEMA DE EFEITOS (GAME JUICE 100% CÓDIGO)
// =========================================================================
function spawnPoeira(p) {
    add([
        rect(8, 8), pos(p.x, p.y), color(200, 200, 200),
        move(LEFT, rand(20, 60)), lifespan(0.3, { fade: 0.1 }), z(15)
    ]);
}

function spawnExplosaoInimigo(p) {
    for (let i = 0; i < 12; i++) {
        add([
            rect(8, 8), pos(p), color(255, 50, 50),
            move(rand(0, 360), rand(150, 400)), lifespan(0.4, { fade: 0.4 }), z(50)
        ]);
    }
}

function spawnBrilhoLembranca(p) {
    for (let i = 0; i < 6; i++) {
        add([
            circle(4), pos(p), color(255, 215, 0),
            move(UP, rand(50, 150)), lifespan(0.6, { fade: 0.3 }), z(50)
        ]);
    }
}

// =========================================================================
// 3. O JOGADOR (FÍSICA E ANIMAÇÃO PERFEITAS)
// =========================================================================
function instanciarJogador(posX, posY) {
    const player = add([
        sprite("sofia"),
        pos(posX, posY),
        // Se a imagem for muito grande, o scale reduz. Ajuste se necessário.
        scale(0.35), 
        anchor("bot"), // Ponto zero é a sola do pé. NUNCA MAIS AFUNDA.
        area({ shape: new Rect(vec2(0, -40), 50, 80) }), // Hitbox exata manual
        body(),
        z(30),
        "jogador",
        {
            invulneravel: false,
            dano() {
                if (this.invulneravel) return;
                vidas--;
                this.invulneravel = true;
                shake(10);
                if (vidas <= 0) go("gameover");
                
                let piscando = true;
                const piscar = loop(0.1, () => {
                    this.color = piscando ? rgb(255, 0, 0) : rgb(255, 255, 255);
                    piscando = !piscando;
                });
                wait(1.5, () => { piscar.cancel(); this.color = rgb(255, 255, 255); this.invulneravel = false; });
            }
        }
    ]);

    player.play("idle");

    onKeyDown("right", () => {
        player.move(VELOCIDADE_JOGADOR, 0); player.flipX = false;
        if (player.isGrounded() && player.curAnim() !== "run") player.play("run");
    });
    onKeyDown("left", () => {
        player.move(-VELOCIDADE_JOGADOR, 0); player.flipX = true;
        if (player.isGrounded() && player.curAnim() !== "run") player.play("run");
    });
    onKeyRelease(["left", "right"], () => { if (player.isGrounded()) player.play("idle"); });
    
    onKeyPress("space", () => {
        if (player.isGrounded()) {
            player.jump(FORCA_PULO); player.play("jump"); spawnPoeira(player.pos);
        }
    });

    player.onGround(() => {
        spawnPoeira(player.pos);
        if (!isKeyDown("left") && !isKeyDown("right")) player.play("idle");
        else player.play("run");
    });

    player.onUpdate(() => {
        camPos(player.pos.x + 200, height() / 2);
        if (player.pos.y > height() + 300) { player.dano(); go(sceneName()); } // Caiu no buraco
    });

    // Pular no inimigo
    player.onCollide("inimigo", (inimigo, col) => {
        if (col.isBottom()) {
            player.jump(FORCA_PULO * 0.7);
            destroy(inimigo);
            spawnExplosaoInimigo(inimigo.pos);
            pontuacao += 100;
        } else {
            player.dano();
        }
    });

    return player;
}

// =========================================================================
// 4. LEVEL DESIGN (TUDO DESENHADO NO CÓDIGO)
// =========================================================================

scene("fase_rio", () => {
    // DESENHANDO O CÉU E O FUNDO (Parallax em Código)
    // Gradiente do Pôr do Sol no Rio
    add([ rect(width(), height()), color(255, 140, 100), fixed(), z(0) ]);
    add([ rect(width(), height()/2), pos(0, height()/2), color(200, 80, 80), fixed(), z(1) ]);
    
    // Prédios no fundo (Desenhados com retângulos)
    for(let i = 0; i < 20; i++) {
        let altura = rand(100, 400);
        add([
            rect(rand(80, 150), altura),
            pos(i * 120, height() - altura),
            color(50, 30, 40), z(2) // Escuros para dar profundidade
        ]);
    }

    // O MAPA DA FASE (Cada caractere é um bloco de 64x64)
    // = : Asfalto/Chão
    // [ e ] : Degraus da Ladeira
    // - : Plataformas voadoras
    // * : Inimigos (A Ansiedade/Distância)
    // $ : Lembranças do dia 23 de Março
    // P : Portal para a próxima fase

    const mapa = [
        "                                                                                    ",
        "                                                                                    ",
        "                                                                               P    ",
        "                                                                              ===   ",
        "                                           -                                        ",
        "                                                                $                   ",
        "                               -                      -       ----                  ",
        "                     $                                                              ",
        "                   ----                                                             ",
        "                                         * ",
        "          [                 ]          ======                                       ",
        "       [  |                 |  ]                                                    ",
        "    [  |  |        * |  |  ]                                                 ",
        "=================================================     ==============================="
    ];

    const config = {
        tileWidth: 64,
        tileHeight: 64,
        pos: vec2(0, height() - (14 * 64)), // Alinha com a parte inferior da tela
        tiles: {
            // Chão estilo paralelepípedo retrô
            "=": () => [ rect(64, 64), outline(2, rgb(30,30,30)), color(120, 120, 130), area(), body({ isStatic: true }), z(10) ],
            
            // Degraus e Pilastras (Lapa/Santa Teresa vibe)
            "[": () => [ rect(64, 64), color(180, 170, 160), area(), body({ isStatic: true }), z(10) ],
            "]": () => [ rect(64, 64), color(180, 170, 160), area(), body({ isStatic: true }), z(10) ],
            "|": () => [ rect(64, 64), color(150, 140, 130), z(9) ], // Apenas visual, sem física
            
            // Plataformas
            "-": () => [ rect(64, 20), color(200, 100, 50), outline(2), area(), body({ isStatic: true }), z(10) ],
            
            // Inimigos (Pequenos quadrados vermelhos que patrulham)
            "*": () => [ 
                rect(40, 40), color(255, 50, 50), outline(2), area(), body(), anchor("bot"), "inimigo", z(15),
                { dir: 1, update() { this.move(100 * this.dir, 0); } } // IA simples: anda pra frente
            ],
            
            // Lembranças
            "$": () => [ circle(15), color(255, 215, 0), outline(2), area(), "lembranca", z(15) ],
            
            // Portal (O embarque para o Amazonas)
            "P": () => [ rect(80, 120), color(50, 200, 255), outline(2), area(), "portal", z(5) ]
        }
    };

    addLevel(mapa, config);

    // Inverte os inimigos quando batem na parede
    onCollide("inimigo", "chao", (i, c, col) => { if (col.isLeft() || col.isRight()) i.dir = -i.dir; });

    const player = instanciarJogador(100, 200);

    // HUD Fixo
    const uiVidas = add([ text(`VIDAS: ${vidas}`, { size: 24 }), pos(20, 20), fixed(), color(255, 50, 50), z(100) ]);
    const uiPontos = add([ text(`LEMBRANÇAS: ${pontuacao}`, { size: 24 }), pos(20, 60), fixed(), color(255, 215, 0), z(100) ]);

    player.onCollide("lembranca", (l) => {
        destroy(l);
        pontuacao += 50;
        uiPontos.text = `LEMBRANÇAS: ${pontuacao}`;
        spawnBrilhoLembranca(l.pos);
        add([ text("+50", {size:20}), pos(l.pos), color(255,255,0), move(UP, 80), lifespan(0.5, {fade: 0.2}) ]);
    });

    player.onCollide("portal", () => {
        go("vitoria"); // Aqui você pode criar a "fase_amazonia" e redirecionar pra ela depois!
    });
});

// =========================================================================
// 5. TELAS DO SISTEMA
// =========================================================================

scene("menu", () => {
    add([ rect(width(), height()), color(15, 15, 25) ]);
    add([ text("A JORNADA PARA TEFÉ", { size: 64 }), pos(width()/2, height()/3), anchor("center"), color(255, 100, 150) ]);
    const btn = add([ text("Pressione ESPAÇO", { size: 30 }), pos(width()/2, height()/1.5), anchor("center") ]);
    loop(0.5, () => btn.hidden = !btn.hidden);
    onKeyPress("space", () => { vidas = 3; pontuacao = 0; go("fase_rio"); });
});

scene("gameover", () => {
    add([ rect(width(), height()), color(50, 10, 10) ]);
    add([ text("FIM DE JOGO", { size: 80 }), pos(width()/2, height()/3), anchor("center"), color(255, 50, 50) ]);
    add([ text("Tente novamente. A distância não vai vencer.", { size: 24 }), pos(width()/2, height()/2), anchor("center") ]);
    onKeyPress("space", () => go("menu"));
});

scene("vitoria", () => {
    add([ rect(width(), height()), color(10, 50, 20) ]);
    add([ text("CHEGAMOS EM TEFÉ!", { size: 80 }), pos(width()/2, height()/3), anchor("center"), color(50, 255, 50) ]);
    add([ text("Feliz Dia dos Namorados, Sofia!", { size: 40 }), pos(width()/2, height()/2), anchor("center"), color(255, 105, 180) ]);
});

// START
go("menu");
