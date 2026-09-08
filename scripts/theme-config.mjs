/**
 * Configuração de Tema e Cores para o Gráfico 3D de Contribuições
 * 
 * Paleta harmonizada com os componentes do perfil:
 * - Fundo: #0D0814 (idêntico aos cards de estatísticas)
 * - Roxo / Violeta: #3D105B, #7928CA, #A855F7
 * - Rosa neon: #FF2A5F
 * - Verde claro Python: #D7FF5F (mesma cor do símbolo do Python e do círculo S)
 */
export const THEME_CONFIG = {
  // Configuração da moldura / borda do card (igual aos cards de Estatísticas e Linguagens)
  card: {
    rx: 16,                   // Arredondamento dos cantos (roundness)
    borderColor: "#3D105B",   // Cor da borda (violeta dos cards)
    borderWidth: 2,           // Espessura da borda
    backgroundColor: "#0D0814", // Fundo interno do card
  },

  // Cor de fundo do canvas geral
  backgroundColor: "#0D0814",

  // Modo do gradiente do calendário 3D:
  // - "animated": onda de gradiente que transita suavemente entre roxo, rosa e verde claro
  // - "static": cores fixas por nível de commits (0 a 4)
  gradientMode: "animated",

  // Duração da transição do gradiente animado
  animationDuration: "8s",

  // Se os dias sem commits (nível 0) devem animar ou ficar como base escura fixa
  animateEmptyDays: false,

  // Paleta por nível de atividade (usada no modo "static" ou para base dos blocos):
  levels: {
    level0: "#1E1035", // Sem commits (base roxa escura sutil da grade)
    level1: "#3D105B", // Poucos commits (violeta profundo)
    level2: "#7928CA", // Moderado (roxo vibrante)
    level3: "#FF2A5F", // Alto (rosa neon)
    level4: "#D7FF5F", // Pico / Máximo (verde claro neon igual ao símbolo Python)
  },

  // Paradas de cor da onda de gradiente (usada quando gradientMode = "animated"):
  // Transição contínua: Roxo -> Lavanda -> Rosa neon -> Verde Python -> Rosa neon -> Roxo
  gradientStops: [
    "#3D105B", // Violeta profundo
    "#7928CA", // Roxo vibrante
    "#A855F7", // Roxo elétrico
    "#FF2A5F", // Rosa neon
    "#D7FF5F", // Verde claro do Python (#D7FF5F)
    "#FF2A5F", // Rosa neon
    "#A855F7", // Roxo elétrico
    "#3D105B", // Retorno ao violeta
  ],

  // Configuração do Gráfico de Radar de Contribuições (Commit, Issue, PullReq, Review, Repo):
  radar: {
    show: true,                 // Exibir ou ocultar o gráfico de radar
    fillColor: "#D7FF5F",       // Cor de preenchimento do polígono (Verde Python neon)
    strokeColor: "#D7FF5F",     // Cor da borda neon do polígono
    fillOpacity: 0.35,          // Opacidade do preenchimento
    strokeWidth: "3px",         // Espessura da linha do radar
    gridColor: "#3D105B",       // Linhas da grade pentagonal (violeta profundo dos cards)
    labelColor: "#ECE6F0",      // Textos dos eixos (Commit, Issue, PullReq, Review, Repo)
    scaleColor: "#A855F7",      // Números da escala (1, 10, 100, 1K, 10K)
  },

  // Configuração da Animação 3D 360 no Plano Horizontal (Matemática: Rodrigues Axis-Angle + Tait-Bryan Pitch)
  rotation3d: {
    enabled: true,              // Ativar animação de rotação 360 no plano horizontal
    numFrames: 120,             // 120 quadros (ponto ideal de fluidez sem sobrecarga do navegador: 4.46 MB)
    duration: "4s",             // 4s por volta completa (velocidade reduzida em 50%, suave e sem lag)
    pitchAngleDeg: 28,          // Ângulo de elevação de visão (Tait-Bryan pitch)
    layout: "full-centered",    // Opção B: destaque total centralizado na rotação 360
    gridSpacingX: 16.5,         // Espaçamento entre semanas no plano horizontal
    gridSpacingZ: 28.0,         // Espaçamento entre dias da semana no plano horizontal
    blockWidth: 12.5,           // Largura do bloco de contribuição
    blockDepth: 21.0,           // Profundidade do bloco
    levelHeights: {
      0: 3.0,                   // Altura de dia sem commits (bloco no plano horizontal)
      1: 18.0,                  // Nível 1
      2: 38.0,                  // Nível 2
      3: 65.0,                  // Nível 3
      4: 95.0,                  // Nível 4
    },
    lightDirection: [0.45, 0.85, 0.3], // Vetor da fonte de luz para iluminação difusa
    basePlateColor: "#13091F",  // Cor da plataforma horizontal base
    basePlateBorder: "#3D105B", // Cor da borda da plataforma horizontal
  },
};
