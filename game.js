// Inicializa o Kaboom.js dentro da div que criamos no HTML
kaboom({
    root: document.getElementById("game-container"),
    width: 800,
    height: 600,
    background: [135, 206, 235], // Cor de fundo: Azul Céu
});

// ==========================================================
// 1. CARREGAMENTO DE RECURSOS (Imagens e Sons)
// ==========================================================
// O Kaboom usa um personagem padrão chamado "bean" (um feijãozinho).
// Futuramente, você vai trocar isso por: loadSprite("sofia", "pasta/sofia.png")
loadBean("sofia"); 

const VELOCIDADE_MOVIMENTO = 300;
const FORCA_PULO = 700;

// ==========================================================
// FASE 1: O Início (7 de Setembro de 2024 - RJ e RS)
// ==========================================================
scene("fase1", () => {
    setGravity(1600);

    // Adiciona o texto na tela
    add([
        text("7 de Set. 2024\nConexao RJ - Pelotas", { size: 24 }),
        pos(20, 20),
        color(0, 0, 0)
    ]);

    // O jogador: Sofia
    const player = add([
        sprite("sofia"),
        pos(50, 400),
        area(),
        body(),
    ]);

    // O chão da fase 1 (Cinza urbano)
    add([
        rect(800, 50),
        pos(0, 550),
        outline(4),
        area(),
        body({ isStatic: true }),
        color(100, 100, 100),
    ]);

    // Plataformas flutuantes
    add([rect(150, 20), pos(200, 450), area(), body({ isStatic: true }), color(100, 100, 100)]);
    add([rect(150, 20), pos(450, 350), area(), body({ isStatic: true }), color(100, 100, 100)]);

    // O objetivo desta fase: "O Sinal de Wi-Fi" (O primeiro contato)
    // Aqui estamos usando um círculo amarelo para representar a mensagem
    add([
        circle(20),
        pos(500, 300),
        area(),
        color(255, 215, 0),
        "mensagem" // Uma tag para sabermos com o que a Sofia colidiu
    ]);

    // Controle da personagem
    onKeyDown("right", () => player.move(VELOCIDADE_MOVIMENTO, 0));
    onKeyDown("left", () => player.move(-VELOCIDADE_MOVIMENTO, 0));
    onKeyPress("space", () => {
        if (player.isGrounded()) player.jump(FORCA_PULO);
    });

    // Lógica: Quando a Sofia pegar a mensagem, vai para a Fase 2
    player.onCollide("mensagem", (msg) => {
        destroy(msg); // Remove a mensagem da tela
        go("fase2");  // Carrega a próxima fase
    });
});

// ==========================================================
// FASE 2: O Encontro (23 de Março - Santa Teresa, RJ)
// ==========================================================
scene("fase2", () => {
    setGravity(1600);
    setBackground(255, 182, 193); // Muda o céu para um tom de pôr do sol rosado

    add([
        text("23 de Marco\nO bondinho de Santa Teresa", { size: 24 }),
        pos(20, 20),
        color(0, 0, 0)
    ]);

    const player = add([
        sprite("sofia"),
        pos(50, 400),
        area(),
        body(),
    ]);

    // Chão e plataformas estilo Ladeiras de Paralelepípedo
    add([rect(300, 50), pos(0, 550), area(), body({ isStatic: true }), color(139, 69, 19)]);
    add([rect(200, 50), pos(400, 450), area(), body({ isStatic: true }), color(139, 69, 19)]);
    add([rect(150, 50), pos(650, 350), area(), body({ isStatic: true }), color(139, 69, 19)]);

    // O perigo (o vão entre as ruas). Se cair, reinicia a fase
    player.onUpdate(() => {
        if (player.pos.y > 650) {
            go("fase2"); // Caiu, tenta de novo
        }
    });

    // O "Você" (representado por um quadrado azul esperando nela no final da ladeira)
    add([
        rect(40, 40),
        pos(700, 310),
        area(),
        color(0, 0, 255),
        "voce_no_rio"
    ]);

    onKeyDown("right", () => player.move(VELOCIDADE_MOVIMENTO, 0));
    onKeyDown("left", () => player.move(-VELOCIDADE_MOVIMENTO, 0));
    onKeyPress("space", () => {
        if (player.isGrounded()) player.jump(FORCA_PULO);
    });

    // Lógica: Quando vocês se encontrarem, avança para a Fase 3
    player.onCollide("voce_no_rio", () => {
        go("fase3");
    });
});

// ==========================================================
// FASE 3: O Presente (Tefé, Amazonas)
// ==========================================================
scene("fase3", () => {
    setGravity(1600);
    setBackground(34, 139, 34); // Fundo verde floresta

    add([
        text("Hoje\nA aventura ate Tefe", { size: 24 }),
        pos(20, 20),
        color(255, 255, 255)
    ]);

    const player = add([
        sprite("sofia"),
        pos(20, 400),
        area(),
        body(),
    ]);

    // Plataformas flutuantes estilo Vitória-Régia no Rio Solimões
    add([rect(150, 30), pos(0, 500), area(), body({ isStatic: true }), color(0, 100, 0)]);
    add([rect(100, 30), pos(250, 450), area(), body({ isStatic: true }), color(0, 100, 0)]);
    add([rect(100, 30), pos(450, 350), area(), body({ isStatic: true }), color(0, 100, 0)]);
    add([rect(150, 30), pos(650, 250), area(), body({ isStatic: true }), color(0, 100, 0)]);

    player.onUpdate(() => {
        if (player.pos.y > 650) {
            go("fase3"); // Se cair na água, tenta de novo
        }
    });

    // O "Você" final, segurando o coração/presente (Quadrado azul + Coração)
    add([
        rect(40, 40),
        pos(700, 210),
        area(),
        color(0, 0, 255),
        "voce_no_amazonas"
    ]);

    onKeyDown("right", () => player.move(VELOCIDADE_MOVIMENTO, 0));
    onKeyDown("left", () => player.move(-VELOCIDADE_MOVIMENTO, 0));
    onKeyPress("space", () => {
        if (player.isGrounded()) player.jump(FORCA_PULO);
    });

    // Lógica: Encontro final
    player.onCollide("voce_no_amazonas", () => {
        go("vitoria");
    });
});

// ==========================================================
// TELA FINAL: A Declaração
// ==========================================================
scene("vitoria", () => {
    setBackground(26, 11, 46); // Fundo escuro romântico

    add([
        text("Feliz Dia dos Namorados,\nSofia Eymard!", { size: 32, width: 700, align: "center" }),
        pos(width() / 2, height() / 2 - 100),
        anchor("center"),
        color(255, 105, 180) // Rosa
    ]);

    add([
        text("De Pelotas ao Rio, e agora em Tefe.\nA melhor aventura da minha vida\ne estar com voce.", { size: 18, width: 700, align: "center" }),
        pos(width() / 2, height() / 2 + 50),
        anchor("center"),
        color(255, 255, 255)
    ]);
});

// ==========================================================
// INICIA O JOGO
// ==========================================================
// Dá o play chamando a primeira fase da história
go("fase1");
