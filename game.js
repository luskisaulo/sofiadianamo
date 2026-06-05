// Inicialização profissional com Letterbox (adapta a qualquer tela sem distorcer)
kaboom({
    root: document.getElementById("game-container"),
    width: 1024,
    height: 576,
    letterbox: true,
    background: [15, 15, 25],
});

// ==========================================================
// 1. CARREGAMENTO DE ASSETS (O "Preload")
// ==========================================================
// Ajuste os nomes para os arquivos reais que você tem na pasta assets
loadSprite("fundo_rio", "assets/fundo_rio.jpeg").catch(() => {});

loadSprite("sofia", "assets/sofia.png", {
    sliceX: 4, 
    sliceY: 4, 
    anims: {
        idle: { from: 0, to: 0 },
        run: { from: 1, to: 3, loop: true, speed: 12 },
        jump: { from: 8, to: 8 },
    }
});

// ==========================================================
// 2. CONFIGURAÇÕES GERAIS E FÍSICA
// ==========================================================
const GRAVIDADE = 2400;
const FORCA_PULO = 850;
const VELOCIDADE = 300;

// AJUSTE ISSO: Se a Sofia ficar gigante, mude para 0.5, 0.3, 0.1...
const ESCALA_SOFIA = 0.5; 

setGravity(GRAVIDADE);

// ==========================================================
// 3. EFEITOS ESPECIAIS (GAME JUICE)
// ==========================================================
// Função para criar fumaça/poeira no chão quando pula ou corre
function criarPoeira(posicao) {
    add([
        rect(8, 8),
        pos(posicao.x, posicao.y),
        color(200, 200, 200),
        opacity(0.8),
        move(LEFT, rand(10, 50)),
        lifespan(0.3, { fade: 0.1 }),
        z(15)
    ]);
}

// ==========================================================
// 4. MENU PRINCIPAL (A porta de entrada)
// ==========================================================
scene("menu", () => {
    // Efeito de fundo pulsante
    add([
        rect(width(), height()),
        color(30, 10, 40),
        z(0)
    ]);

    // Título do Jogo
    add([
        text("A JORNADA DE SOFIA", { size: 64, font: "monospace" }),
        pos(width() / 2, height() / 3),
        anchor("center"),
        color(255, 215, 0),
    ]);

    // Botão Jogar piscando
    const btnJogar = add([
        text("Pressione [ESPAÇO] para Entrar", { size: 24 }),
        pos(width() / 2, height() / 1.5),
        anchor("center"),
        color(255, 255, 255),
    ]);

    loop(0.8, () => {
        btnJogar.hidden = !btnJogar.hidden;
    });

    onKeyPress("space", () => {
        // Transição suave
        add([
            rect(width(), height()),
            color(0, 0, 0),
            opacity(0),
            lifespan(1, { fade: 1 }),
            z(100)
        ]);
        wait(1, () => go("fase_rio"));
    });
});

// ==========================================================
// 5. O CONTROLADOR DO JOGADOR (Lógica encapsulada)
// ==========================================================
function spawnPlayer(posX, posY) {
    const player = add([
        sprite("sofia"),
        pos(posX, posY),
        scale(ESCALA_SOFIA),
        // anchor("bot") é O SEGREDO: O ponto (x,y) dela passa a ser os PÉS, não o meio do peito.
        // Isso resolve o problema dela afundar no chão.
        anchor("bot"), 
        // Área de colisão dinâmica, alinhada com os pés
        area({ offset: vec2(0, 0), shape: new Rect(vec2(0, -60), 40, 60) }),
        body(),
        z(20),
        "jogador"
    ]);

    player.play("idle");

    // Máquina de estados da animação e movimento
    onKeyDown("right", () => {
        player.move(VELOCIDADE, 0);
        player.flipX = false;
        if (player.isGrounded()) {
            if (player.curAnim() !== "run") player.play("run");
            if (chance(0.2)) criarPoeira(player.pos); // Efeito de poeira aleatório
        }
    });

    onKeyDown("left", () => {
        player.move(-VELOCIDADE, 0);
        player.flipX = true;
        if (player.isGrounded()) {
            if (player.curAnim() !== "run") player.play("run");
            if (chance(0.2)) criarPoeira(player.pos);
        }
    });

    onKeyRelease(["left", "right"], () => {
        if (player.isGrounded()) player.play("idle");
    });

    onKeyPress("space", () => {
        if (player.isGrounded()) {
            player.jump(FORCA_PULO);
            player.play("jump");
            criarPoeira(player.pos);
            criarPoeira(vec2(player.pos.x - 10, player.pos.y));
            criarPoeira(vec2(player.pos.x + 10, player.pos.y));
        }
    });

    player.onGround(() => {
        criarPoeira(player.pos); // Impacto ao cair
        if (!isKeyDown("left") && !isKeyDown("right")) {
            player.play("idle");
        } else {
            player.play("run");
        }
    });

    // Câmera Profissional (Segue com atraso/suavidade)
    player.onUpdate(() => {
        let camX = player.pos.x + 200;
        // Evita que a câmera mostre o "nada" à esquerda do mapa
        if (camX < width() / 2) camX = width() / 2; 
        camPos(camX, height() / 2);

        // Sistema de morte e respawn
        if (player.pos.y > height() + 200) {
            shake(12);
            go("fase_rio"); 
        }
    });

    return player;
}

// ==========================================================
// 6. FASE 1: SANTA TERESA (Imersão Total)
// ==========================================================
scene("fase_rio", () => {
    let memoriasColetadas = 0;
    const TOTAL_MEMORIAS = 3;

    // Fundo Parallax (Fica fixo e preenche a tela)
    add([
        sprite("fundo_rio", { width: 2000, height: height() }),
        pos(0, 0),
        z(0)
    ]);

    // O Chão Perfeito (Invisível para não estragar a arte, mas físico para pisar)
    // Ajuste o pos.y para alinhar perfeitamente com a calçada da sua imagem
    add([
        rect(3000, 100),
        pos(0, height() - 50), 
        area(),
        body({ isStatic: true }),
        opacity(0), // Coloque 0.5 aqui se precisar "ver" o chão invisível para debugar
        "chao"
    ]);

    // Obstáculos/Plataformas (Use para criar os degraus da ladeira)
    add([ rect(200, 40), pos(600, height() - 150), area(), body({ isStatic: true }), opacity(0) ]);
    add([ rect(200, 40), pos(1000, height() - 250), area(), body({ isStatic: true }), opacity(0) ]);

    const player = spawnPlayer(100, height() - 150);

    // Sistema de Coletáveis (Memórias do casal)
    function criarMemoria(x, y) {
        add([
            circle(15), color(255, 50, 150),
            pos(x, y), area(), "memoria", z(10)
        ]);
    }

    criarMemoria(650, height() - 200);
    criarMemoria(1050, height() - 300);
    criarMemoria(1500, height() - 100);

    // O Portal do Fim da Fase (Só abre se pegar tudo)
    const portal = add([
        rect(50, 150), pos(2000, height() - 200), area(), color(0, 255, 0), opacity(0.5), "portal"
    ]);

    // UI (HUD) - Fixo na tela
    const uiLembrancas = add([
        text("Lembranças: 0/3", { size: 24 }),
        pos(20, 20), fixed(), color(255, 255, 255), z(100)
    ]);

    player.onCollide("memoria", (m) => {
        destroy(m);
        memoriasColetadas++;
        uiLembrancas.text = `Lembranças: ${memoriasColetadas}/${TOTAL_MEMORIAS}`;
        // Efeito visual ao pegar
        add([
            text("+1", { size: 30 }), pos(player.pos.x, player.pos.y - 50),
            color(255, 255, 0), move(UP, 100), lifespan(1, { fade: 0.5 })
        ]);
    });

    player.onCollide("portal", () => {
        if (memoriasColetadas >= TOTAL_MEMORIAS) {
            go("vitoria");
        } else {
            // Efeito de erro ("faltam memorias")
            shake(5);
        }
    });
});

// ==========================================================
// 7. TELA DE VITÓRIA (O Fim Comercial)
// ==========================================================
scene("vitoria", () => {
    add([ rect(width(), height()), color(10, 5, 20), z(0) ]);

    add([
        text("A JORNADA FOI CONCLUÍDA.", { size: 48 }),
        pos(width() / 2, height() / 3), anchor("center"), color(255, 215, 0)
    ]);

    add([
        text("De Pelotas ao Rio, e agora em Tefé.\n\nFeliz Dia dos Namorados, Sofia Eymard!", { size: 24, align: "center" }),
        pos(width() / 2, height() / 1.5), anchor("center"), color(255, 255, 255)
    ]);
});

// Inicia o motor na tela de menu
go("menu");
