// ============================================================================================
// MOTOR KABOOM V3 - JOGO COMPLETO (SOFIA)
// ============================================================================================
kaboom({
    root: document.getElementById("game-container"),
    width: 1280,
    height: 720,
    letterbox: true,
    background: [15, 20, 30], 
    global: true,
});

// ============================================================================================
// 1. ASSETS
// ============================================================================================
// ATENÇÃO: Para sumir o "fantasma" do lado da Sofia, a imagem png original precisa 
// ter a largura exata e divisível por 4, com ela centralizada em cada quadro.
loadSprite("fundo_rio", "assets/fundo_rio.jpeg").catch(() => {});
loadSprite("sofia", "assets/sofia.png", { 
    sliceX: 4, sliceY: 4, 
    anims: { 
        idle: { from: 0, to: 0 }, 
        run: { from: 1, to: 3, loop: true, speed: 12 }, 
        jump: { from: 8, to: 8 } 
    } 
}).catch(() => {
    // Fallback de segurança
    loadSpriteAtlas("fallback", { "sofia": { x: 0, y: 0, width: 40, height: 60 }});
});

// ============================================================================================
// 2. ESTADO GLOBAL E FÍSICA
// ============================================================================================
setGravity(2400);

const ESTADO = {
    vidas: 3,
    lembrancas: 0,
    faseAtual: "fase1_pelotas",
    resetar() {
        this.vidas = 3;
        this.lembrancas = 0;
    }
};

// ============================================================================================
// 3. JOGADORA (MECÂNICAS MODERNAS)
// ============================================================================================
function criarSofia(spawnX, spawnY) {
    const player = add([
        sprite("sofia"), 
        pos(spawnX, spawnY), 
        anchor("bot"), 
        scale(0.35),
        area({ shape: new Rect(vec2(0, -35), 30, 70) }),
        body({ jumpForce: 850 }), 
        z(30),
        "jogador",
        {
            invulneravel: false,
            sofrerDano() {
                if (this.invulneravel) return;
                ESTADO.vidas--;
                this.invulneravel = true;
                shake(15);
                
                if (ESTADO.vidas <= 0) go("gameover");
                
                let piscando = true;
                const fx = loop(0.1, () => {
                    this.opacity = piscando ? 0.3 : 1;
                    piscando = !piscando;
                });
                wait(1.5, () => { fx.cancel(); this.opacity = 1; this.invulneravel = false; });
            }
        }
    ]);

    player.play("idle");

    onKeyDown("right", () => {
        player.move(350, 0); player.flipX = false;
        if (player.isGrounded() && player.curAnim() !== "run") player.play("run");
    });
    
    onKeyDown("left", () => {
        player.move(-350, 0); player.flipX = true;
        if (player.isGrounded() && player.curAnim() !== "run") player.play("run");
    });
    
    onKeyRelease(["left", "right"], () => {
        if (player.isGrounded()) player.play("idle");
    });

    onKeyPress("space", () => {
        if (player.isGrounded()) {
            player.jump();
            player.play("jump");
        }
    });

    player.onUpdate(() => {
        camPos(lerp(camPos().x, player.pos.x + 200, dt() * 4), height() / 2);
        if (player.pos.y > 1500) {
            player.sofrerDano();
            if (ESTADO.vidas > 0) go(ESTADO.faseAtual); 
        }
    });

    return player;
}

// ============================================================================================
// 4. INTERFACE / HUD
// ============================================================================================
function criarHUD(totalLembrancasDaFase) {
    const uiLembrancas = add([ text(`Lembranças: ${ESTADO.lembrancas}/${totalLembrancasDaFase}`, { size: 28 }), pos(20, 20), fixed(), color(255, 255, 255), z(100) ]);
    const uiVidas = add([ text(`Vidas: ${ESTADO.vidas}`, { size: 28 }), pos(20, 60), fixed(), color(255, 100, 100), z(100) ]);
    
    onUpdate(() => {
        uiLembrancas.text = `Lembranças: ${ESTADO.lembrancas}/${totalLembrancasDaFase}`;
        uiVidas.text = `Vidas: ${ESTADO.vidas}`;
    });
}

// ============================================================================================
// 5. COMPONENTES DO LEVEL DESIGN
// ============================================================================================
const designPlataformas = {
    tileWidth: 64, tileHeight: 64,
    tiles: {
        "=": () => [ rect(64, 64, { radius: 8 }), color(0, 0, 0), opacity(0.3), area(), body({ isStatic: true }) ],
        "_": () => [ rect(64, 20, { radius: 10 }), pos(0, 20), color(0, 0, 0), opacity(0.5), area(), body({ isStatic: true }) ],
        "O": () => [ circle(15), color(255, 50, 150), area(), "lembranca", anchor("center") ],
        "W": () => [ rect(64, 64), color(0, 50, 150), opacity(0.6), area(), "agua" ]
    }
};

// ============================================================================================
// 6. FASES COMPLETAS
// ============================================================================================

scene("fase1_pelotas", () => {
    ESTADO.faseAtual = "fase1_pelotas";
    ESTADO.lembrancas = 0; // Zera as lembranças ao entrar na fase

    add([ rect(width(), height()), color(20, 30, 45), fixed(), z(0) ]);
    for(let i=0; i<80; i++) add([ rect(3, 3), pos(rand(0, width()*2), rand(0, height())), color(255,255,255), fixed(), opacity(rand(0.2, 0.8)), z(1) ]);

    add([ text("7 de Set. 2024\nO primeiro oi...", { size: 40, align: "center" }), pos(width()/2, 150), fixed(), anchor("center"), color(200,200,200), z(5) ]);

    const mapa = [
        "                                               ",
        "                                               ",
        "                                             O ",
        "            _      _                        __ ",
        "                                               ",
        "         O                                     ",
        "==============================================="
    ];

    addLevel(mapa, { ...designPlataformas, pos: vec2(0, height() - (mapa.length * 64)) });
    const player = criarSofia(200, height() - 300);
    criarHUD(2);

    player.onCollide("lembranca", (b) => {
        destroy(b); ESTADO.lembrancas++;
        if (ESTADO.lembrancas >= 2) wait(0.5, () => go("cutscene_1"));
    });
});

scene("fase2_santateresa", () => {
    ESTADO.faseAtual = "fase2_santateresa";
    ESTADO.lembrancas = 0;

    // Tenta carregar o fundo, se falhar, fica uma cor sólida parecida com a sua arte
    const bg = add([ sprite("fundo_rio", { width: width(), height: height() }), fixed(), pos(0,0), z(0) ]);
    if (!bg.width) add([ rect(width(), height()), color(255, 150, 100), fixed(), z(0) ]);

    const mapa = [
        "                                                            ",
        "                                                            ",
        "                     O                                      ",
        "                    __                                      ",
        "                                                            ",
        "          O                                                 ",
        "         __                                                 ",
        "                                           O                ",
        "==   ==                  ==        ==      __       ========"
    ];

    const nivel = addLevel(mapa, { ...designPlataformas, pos: vec2(0, height() - (mapa.length * 64)) });
    const player = criarSofia(100, nivel.pos.y + 100);
    criarHUD(3);

    player.onCollide("lembranca", (b) => {
        destroy(b); ESTADO.lembrancas++;
        if (ESTADO.lembrancas >= 3) wait(0.5, () => go("cutscene_2"));
    });
});

scene("fase3_tefe", () => {
    ESTADO.faseAtual = "fase3_tefe";
    ESTADO.lembrancas = 0;

    add([ rect(width(), height()), color(15, 60, 30), fixed(), z(0) ]);

    const mapa = [
        "                                                                       ",
        "                                                                       ",
        "                                                                    O  ",
        "                                                                    __ ",
        "                                         O                             ",
        "                             __         ___           __               ",
        "                 O                                                     ",
        "                ___                                                    ",
        "                                                                       ",
        "===    WWWWW           WWWWW           WWWWW            WWWWWW     ===="
    ];

    const nivel = addLevel(mapa, { ...designPlataformas, pos: vec2(0, height() - (mapa.length * 64)) });
    const player = criarSofia(100, nivel.pos.y + 100);
    criarHUD(3);

    player.onCollide("agua", () => {
        player.sofrerDano();
        if (ESTADO.vidas > 0) go("fase3_tefe");
    });

    player.onCollide("lembranca", (b) => {
        destroy(b); ESTADO.lembrancas++;
        if (ESTADO.lembrancas >= 3) wait(0.5, () => go("vitoria"));
    });
});

// ============================================================================================
// 7. CUTSCENES E MENUS
// ============================================================================================
scene("cutscene_1", () => {
    add([ rect(width(), height()), color(10, 10, 15) ]);
    add([ text("A primeira mensagem cruzou o país...", { size: 40, align: "center" }), pos(width()/2, height()/2), anchor("center") ]);
    wait(3, () => go("fase2_santateresa"));
});

scene("cutscene_2", () => {
    add([ rect(width(), height()), color(10, 10, 15) ]);
    add([ text("E então, o Rio de Janeiro uniu dois caminhos.", { size: 40, align: "center" }), pos(width()/2, height()/2), anchor("center") ]);
    wait(3, () => go("fase3_tefe"));
});

scene("menu", () => {
    add([ rect(width(), height()), color(20, 20, 35) ]);
    add([ text("A JORNADA DE SOFIA", { size: 70, weight: "bold" }), pos(width()/2, height() * 0.35), anchor("center"), color(255, 105, 180) ]);
    add([ text("[SETAS] Mover  |  [ESPAÇO] Pular\nColete as Lembranças!", { size: 24, align: "center" }), pos(width()/2, height() * 0.55), anchor("center"), color(200, 200, 200) ]);
    
    const btn = add([ text("Pressione [ESPAÇO] para iniciar", { size: 30 }), pos(width()/2, height() * 0.8), anchor("center"), color(255, 255, 255) ]);
    loop(0.6, () => btn.opacity = btn.opacity === 1 ? 0.3 : 1);
    
    onKeyPress("space", () => {
        ESTADO.resetar();
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
    onUpdate(() => {
        if(chance(0.3)) add([ rect(12, 12, { radius: 3 }), pos(rand(0, width()), -20), color(rand(150, 255), rand(150, 255), rand(150, 255)), move(DOWN, rand(150, 350)), rotate(rand(0, 360)), lifespan(4) ]);
    });

    add([ text("FELIZ DIA DOS NAMORADOS!", { size: 65, weight: "bold" }), pos(width()/2, height() * 0.3), anchor("center"), color(255, 105, 180) ]);
    add([ text("De Pelotas ao Rio, e agora em Tefé.\nOnde quer que seja, desde que seja com você.", { size: 32, align: "center", width: 1000 }), pos(width()/2, height() * 0.55), anchor("center"), color(255, 255, 255) ]);
    add([ text("Com amor.", { size: 30, font: "italic" }), pos(width()/2, height() * 0.8), anchor("center"), color(200, 200, 200) ]);
});

// START DO MOTOR
go("menu");
