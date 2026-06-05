kaboom({
    root: document.getElementById("game-container"),
    width: 800,
    height: 600,
    background: [20, 20, 40], // Fundo noturno padrão
});

// ==========================================================
// 1. CARREGAMENTO DE IMAGENS PROFISSIONAIS (ASSETS)
// ==========================================================
// Cenários das 3 fases
loadSprite("fundo_pelotas", "assets/fundo_pelotas.jpg").catch(() => {}); 
loadSprite("fundo_rio", "assets/fundo_rio.jpeg");
loadSprite("fundo_amazonia", "assets/fundo_amazonia.jpg").catch(() => {});

// A folha de animação da Sofia (Sprite Sheet)
// O código corta a imagem em 4 colunas e 4 linhas
loadSprite("sofia", "assets/sofia.png", {
    sliceX: 4, 
    sliceY: 4, 
    anims: {
        idle: { from: 0, to: 0 }, // Parada
        run: { from: 1, to: 3, loop: true, speed: 12 }, // Correndo (animando os quadros)
        jump: { from: 8, to: 8 }, // Pulando
    }
});

// Ícones temporários para os objetivos usando emojis (para garantir que funcione agora)
// Depois você pode trocar por loadSprite e imagens reais.
const OBJETIVO_FASE1 = "📱"; // Sinal de mensagem
const OBJETIVO_FASE2 = "❤️"; // Coração no Rio
const OBJETIVO_FASE3 = "🎁"; // O Presente em Tefé

// Física global
const VELOCIDADE = 280;
const FORCA_PULO = 700;
const GRAVIDADE = 1800;

// ==========================================================
// FUNÇÃO REUTILIZÁVEL: CONTROLES E CÂMERA DA SOFIA
// ==========================================================
// Como as 3 fases usam a mesma personagem, centralizamos a lógica aqui
function criarSofia(posX, posY, nomeCenaAtual) {
    const player = add([
        sprite("sofia"),
        pos(posX, posY),
        scale(1.5), 
        // Área de colisão ajustada para o corpo dela (ignorando espaços vazios da imagem)
        area({ shape: new Rect(vec2(0, 0), 30, 50) }), 
        body(),
        z(10), // Garante que ela fique na frente de todos os fundos
        "jogador"
    ]);

    player.play("idle");

    // Movimentação fluida e acionamento das animações
    onKeyDown("right", () => {
        player.move(VELOCIDADE, 0);
        player.flipX = false;
        if (player.isGrounded() && player.curAnim() !== "run") player.play("run");
    });

    onKeyDown("left", () => {
        player.move(-VELOCIDADE, 0);
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
        }
    });

    player.onGround(() => {
        if (!isKeyDown("left") && !isKeyDown("right")) {
            player.play("idle");
        } else {
            player.play("run");
        }
    });

    // Câmera dinâmica e morte ao cair em buracos
    player.onUpdate(() => {
        camPos(player.pos.x + 150, height() / 2); // Câmera levemente adiantada
        if (player.pos.y > 900) {
            shake(15); // Trepidação na tela
            go(nomeCenaAtual); // Reinicia a fase atual
        }
    });

    return player;
}


// ==========================================================
// FASE 1: O INÍCIO (7 de Setembro de 2024 - Pelotas/RJ)
// ==========================================================
scene("fase1", () => {
    setGravity(GRAVIDADE);
    setBackground(135, 206, 235); // Azul céu como base

    // Se você adicionar o fundo_pelotas.jpg, ele usa. Se não, fica o fundo azul.
    try {
        add([
            sprite("fundo_pelotas", { width: 1600, height: 600 }),
            pos(0, 0), z(0)
        ]);
    } catch(e) {}

    // Textos imersivos
    add([ text("7 de Set. 2024", { size: 24 }), pos(20, 20), fixed(), color(0,0,0), z(100) ]);
    add([ text("A primeira mensagem...", { size: 16 }), pos(20, 50), fixed(), color(50,50,50), z(100) ]);

    // O Nível (Chão e buracos)
    add([ rect(600, 50), pos(0, 500), area(), body({ isStatic: true }), color(80, 80, 80) ]);
    add([ rect(400, 50), pos(750, 500), area(), body({ isStatic: true }), color(80, 80, 80) ]);
    add([ rect(300, 50), pos(1300, 400), area(), body({ isStatic: true }), color(80, 80, 80) ]);

    // O Objetivo da Fase
    add([
        text(OBJETIVO_FASE1, { size: 40 }),
        pos(1450, 320),
        area(),
        "objetivo",
        z(5)
    ]);

    const player = criarSofia(50, 300, "fase1");

    // Lógica para avançar para Santa Teresa
    player.onCollide("objetivo", () => {
        go("fase2");
    });
});


// ==========================================================
// FASE 2: O ENCONTRO (23 de Março - Santa Teresa, RJ)
// ==========================================================
scene("fase2", () => {
    setGravity(GRAVIDADE);

    // EFEITO PARALLAX IMERSIVO COM A SUA ARTE
    // A imagem foi esticada para a direita para criar um corredor
    add([
        sprite("fundo_rio", { width: 1600, height: 600 }),
        pos(0, 0),
        z(0)
    ]);

    add([ text("23 de Marco", { size: 24 }), pos(20, 20), fixed(), color(255,255,255), z(100) ]);
    add([ text("Onde tudo se tornou real.", { size: 16 }), pos(20, 50), fixed(), color(200,200,200), z(100) ]);

    // CHÃO INVISÍVEL
    // Criamos plataformas invisíveis (opacity: 0) que se alinham com a rua do seu desenho
    add([ rect(800, 50), pos(0, 500), area(), body({ isStatic: true }), opacity(0) ]);
    
    // Plataformas simulando os degraus e ladeiras de Santa Teresa
    add([ rect(200, 20), pos(850, 420), area(), body({ isStatic: true }), opacity(0) ]);
    add([ rect(400, 50), pos(1100, 500), area(), body({ isStatic: true }), opacity(0) ]);

    // O Objetivo (O Encontro)
    add([
        text(OBJETIVO_FASE2, { size: 40 }),
        pos(1400, 420),
        area(),
        "objetivo",
        z(5)
    ]);

    const player = criarSofia(50, 300, "fase2");

    player.onCollide("objetivo", () => {
        go("fase3");
    });
});


// ==========================================================
// FASE 3: O PRESENTE (Tefé, Amazonas)
// ==========================================================
scene("fase3", () => {
    setGravity(GRAVIDADE);
    setBackground(34, 139, 34); // Fundo verde floresta como base

    try {
        add([
            sprite("fundo_amazonia", { width: 2000, height: 600 }),
            pos(0, 0), z(0)
        ]);
    } catch(e) {}

    add([ text("Hoje em Tefe, AM", { size: 24 }), pos(20, 20), fixed(), color(255,255,255), z(100) ]);
    add([ text("A ultima aventura ate voce.", { size: 16 }), pos(20, 50), fixed(), color(200,200,200), z(100) ]);

    // Desafio de plataformas (Vitória-Régias flutuantes)
    add([ rect(300, 30), pos(0, 500), area(), body({ isStatic: true }), color(0, 100, 0) ]);
    add([ rect(150, 30), pos(450, 450), area(), body({ isStatic: true }), color(0, 100, 0) ]);
    add([ rect(150, 30), pos(750, 350), area(), body({ isStatic: true }), color(0, 100, 0) ]);
    add([ rect(100, 30), pos(1050, 250), area(), body({ isStatic: true }), color(0, 100, 0) ]);
    add([ rect(400, 30), pos(1350, 450), area(), body({ isStatic: true }), color(0, 100, 0) ]);

    // O Rio Solimões (Morte se cair)
    add([
        rect(2000, 100),
        pos(0, 550),
        area(),
        color(0, 0, 139), // Azul escuro
        "agua",
        z(8)
    ]);

    // O Presente Final / Você
    add([
        text(OBJETIVO_FASE3, { size: 50 }),
        pos(1600, 360),
        area(),
        "vitoria_final",
        z(5)
    ]);

    const player = criarSofia(50, 300, "fase3");

    player.onCollide("agua", () => {
        shake(15);
        go("fase3");
    });

    player.onCollide("vitoria_final", () => {
        go("vitoria");
    });
});


// ==========================================================
// TELA FINAL: A RECOMPENSA E DECLARAÇÃO
// ==========================================================
scene("vitoria", () => {
    setBackground(20, 10, 30);

    // Efeito de confetes caindo
    loop(0.1, () => {
        add([
            rect(10, 10),
            pos(rand(0, width()), -10),
            color(rand(100, 255), rand(100, 255), rand(100, 255)),
            move(DOWN, rand(100, 300)),
            lifespan(3) // Some depois de 3 segundos
        ]);
    });

    add([
        text("Você chegou!", { size: 40, align: "center" }),
        pos(width() / 2, height() / 2 - 120),
        anchor("center"),
        color(255, 215, 0)
    ]);

    add([
        text("Feliz Dia dos Namorados,\nSofia Eymard!", { size: 30, align: "center" }),
        pos(width() / 2, height() / 2 - 40),
        anchor("center"),
        color(255, 105, 180)
    ]);

    add([
        text("De Pelotas ao Rio, e agora em Tefe.\nA distancia nunca foi um obstaculo,\nfoi apenas o cenario da nossa aventura.", { size: 16, align: "center", width: 700 }),
        pos(width() / 2, height() / 2 + 80),
        anchor("center"),
        color(255, 255, 255)
    ]);
});

// ==========================================================
// START
// ==========================================================
go("fase1");
