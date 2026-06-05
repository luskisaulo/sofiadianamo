// Inicializa o Kaboom.js dentro da div do HTML
kaboom({
    root: document.getElementById("game-container"),
    width: 800,
    height: 600,
    background: [20, 20, 40], // Fundo padrão escuro
});

// ==========================================================
// 1. CARREGAMENTO DE IMAGENS (ASSETS)
// ==========================================================
// Quando tiver suas imagens na pasta "assets", descomente (tire as //) destas linhas:
// loadSprite("sofia", "assets/sofia.png");
// loadSprite("chao_cidade", "assets/chao_cidade.png");
// loadSprite("chao_pedra", "assets/chao_pedra.png");
// loadSprite("chao_selva", "assets/chao_selva.png");
// loadSprite("item", "assets/item.png");

// Configurações Globais da Física
const VELOCIDADE = 350;
const FORCA_PULO = 750;
const GRAVIDADE = 1800;

// ==========================================================
// FASE 1: O Início (7 de Set. 2024 - Conexão RJ/Pelotas)
// ==========================================================
scene("fase1", () => {
    setGravity(GRAVIDADE);
    setBackground(135, 206, 235); // Céu azul

    // Texto da Fase fixo na tela (não se move com a câmera)
    add([
        text("7 de Set. 2024\nConexao RJ - Pelotas", { size: 24 }),
        pos(20, 20),
        color(0, 0, 0),
        fixed() 
    ]);

    // MAPA DA FASE 1
    const mapa = [
        "                                      ",
        "                                      ",
        "                                     @",
        "                          ======      ",
        "                                      ",
        "             ======                   ",
        "                                      ",
        "======================================",
    ];

    const configMapa = {
        tileWidth: 40,
        tileHeight: 40,
        tiles: {
            "=": () => [
                rect(40, 40), color(100, 100, 100), // Substitua por: sprite("chao_cidade"),
                area(), body({ isStatic: true })
            ],
            "@": () => [
                circle(15), color(255, 215, 0),     // Substitua por: sprite("item"),
                area(), "objetivo"
            ]
        }
    };

    addLevel(mapa, configMapa);

    // O JOGADOR (Sofia)
    const player = add([
        rect(40, 40), color(255, 105, 180),         // Substitua por: sprite("sofia"),
        pos(50, 100),
        area(),
        body(),
    ]);

    // Câmera e limite de queda
    player.onUpdate(() => {
        camPos(player.pos.x, 300);
        if (player.pos.y > 800) { shake(10); go("fase1"); }
    });

    // Controles
    onKeyDown("right", () => { player.move(VELOCIDADE, 0); player.flipX = false; });
    onKeyDown("left", () => { player.move(-VELOCIDADE, 0); player.flipX = true; });
    onKeyPress("space", () => { if (player.isGrounded()) player.jump(FORCA_PULO); });

    // Passar de fase
    player.onCollide("objetivo", () => { go("fase2"); });
});

// ==========================================================
// FASE 2: O Encontro (23 de Março - Santa Teresa, RJ)
// ==========================================================
scene("fase2", () => {
    setGravity(GRAVIDADE);
    setBackground(255, 182, 193); // Pôr do sol rosado

    add([
        text("23 de Marco\nO bondinho de Santa Teresa", { size: 24 }),
        pos(20, 20),
        color(0, 0, 0),
        fixed()
    ]);

    // MAPA DA FASE 2 (Estilo ladeira/escadas)
    const mapa = [
        "                                            ",
        "                                            ",
        "                                           @",
        "                                      ======",
        "                                            ",
        "                                =====       ",
        "                                            ",
        "                          =====             ",
        "                                            ",
        "              ======                        ",
        "                                            ",
        "=======   ==                                ",
    ];

    const configMapa = {
        tileWidth: 40,
        tileHeight: 40,
        tiles: {
            "=": () => [
                rect(40, 40), color(139, 69, 19), // Substitua por: sprite("chao_pedra"),
                area(), body({ isStatic: true })
            ],
            "@": () => [
                rect(40, 40), color(0, 0, 255),   // Representa você esperando
                area(), "objetivo"
            ]
        }
    };

    addLevel(mapa, configMapa);

    const player = add([
        rect(40, 40), color(255, 105, 180),       // Substitua por: sprite("sofia"),
        pos(50, 300),
        area(),
        body(),
    ]);

    player.onUpdate(() => {
        camPos(player.pos.x, player.pos.y); // Câmera segue X e Y por causa da ladeira
        if (player.pos.y > 1000) { shake(10); go("fase2"); }
    });

    onKeyDown("right", () => { player.move(VELOCIDADE, 0); player.flipX = false; });
    onKeyDown("left", () => { player.move(-VELOCIDADE, 0); player.flipX = true; });
    onKeyPress("space", () => { if (player.isGrounded()) player.jump(FORCA_PULO); });

    player.onCollide("objetivo", () => { go("fase3"); });
});

// ==========================================================
// FASE 3: O Presente (Tefé, Amazonas)
// ==========================================================
scene("fase3", () => {
    setGravity(GRAVIDADE);
    setBackground(34, 139, 34); // Verde Floresta

    add([
        text("Hoje\nA aventura ate Tefe", { size: 24 }),
        pos(20, 20),
        color(255, 255, 255),
        fixed()
    ]);

    // MAPA DA FASE 3 (Plataformas distantes sobre a "água")
    const mapa = [
        "                                                         ",
        "                                                        @",
        "                                                    =====",
        "                                                         ",
        "                                          =====          ",
        "                                                         ",
        "                             ======                      ",
        "                                                         ",
        "                 ======                                  ",
        "                                                         ",
        "========                                                 ",
        "^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^",
    ];

    const configMapa = {
        tileWidth: 40,
        tileHeight: 40,
        tiles: {
            "=": () => [
                rect(40, 40), color(0, 100, 0), // Vitória-régias/Folhas
                area(), body({ isStatic: true })
            ],
            "^": () => [
                rect(40, 40), color(0, 0, 255), // Rio Solimões (Água)
                area(), "agua"
            ],
            "@": () => [
                rect(40, 40), color(255, 215, 0), // Você com o presente final
                area(), "objetivo_final"
            ]
        }
    };

    addLevel(mapa, configMapa);

    const player = add([
        rect(40, 40), color(255, 105, 180),
        pos(50, 300),
        area(),
        body(),
    ]);

    player.onUpdate(() => {
        camPos(player.pos.x, 300);
        if (player.pos.y > 800) { shake(10); go("fase3"); }
    });

    // Se encostar na água, recomeça
    player.onCollide("agua", () => {
        shake(10);
        go("fase3");
    });

    onKeyDown("right", () => { player.move(VELOCIDADE, 0); player.flipX = false; });
    onKeyDown("left", () => { player.move(-VELOCIDADE, 0); player.flipX = true; });
    onKeyPress("space", () => { if (player.isGrounded()) player.jump(FORCA_PULO); });

    player.onCollide("objetivo_final", () => { go("vitoria"); });
});

// ==========================================================
// TELA FINAL: A Declaração
// ==========================================================
scene("vitoria", () => {
    setBackground(26, 11, 46); // Fundo escuro romântico

    add([
        text("Feliz Dia dos Namorados,\nSofia Eymard!", { size: 28, width: 700, align: "center" }),
        pos(width() / 2, height() / 2 - 100),
        anchor("center"),
        color(255, 105, 180)
    ]);

    add([
        text("De Pelotas ao Rio, e agora em Tefe.\nA melhor aventura da minha vida\ne estar com voce.", { size: 16, width: 700, align: "center" }),
        pos(width() / 2, height() / 2 + 50),
        anchor("center"),
        color(255, 255, 255)
    ]);
});

// ==========================================================
// INICIA O JOGO NA FASE 1
// ==========================================================
go("fase1");
