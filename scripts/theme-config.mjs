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
  // Cor de fundo do gráfico (idêntica ao fundo dos cards de estatísticas e linguagens)
  backgroundColor: "#0D0814",

  // Modo do gradiente:
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
};
