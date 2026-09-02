/**
 * Configuração de Tema e Cores para o Gráfico 3D de Contribuições
 * 
 * Modifique as variáveis abaixo para personalizar as cores facilmente:
 */
export const THEME_CONFIG = {
  // Cor de fundo do gráfico (definido para combinar com os cards de Estatísticas e Linguagens)
  backgroundColor: "#0D0814",

  // Modo do gradiente:
  // - "animated": onda de gradiente animada que pulsa entre os tons da paleta
  // - "static": gradiente fixo baseado na quantidade de commits por dia (níveis 0 a 4)
  gradientMode: "animated",

  // Duração do ciclo de animação (apenas quando gradientMode = "animated")
  animationDuration: "10s",

  // Cores por nível de atividade (usadas no modo "static" e como base de brilho no "animated")
  // 0: sem commits -> 4: muitas contribuições
  levels: {
    level0: "#1E1035", // Sem contribuições (roxo escuro discreto)
    level1: "#3D105B", // Poucas contribuições (violeta escuro)
    level2: "#7928CA", // Contribuições moderadas (roxo vívido)
    level3: "#A855F7", // Altas contribuições (roxo elétrico)
    level4: "#FF2A5F", // Pico de contribuições (rosa neon vibrante)
  },

  // Cores da onda de gradiente (usadas no modo "animated")
  // Transição suave: violeta -> roxo -> lavanda -> rosa neon -> magenta -> roxo
  gradientStops: [
    "#3D105B", // Violeta profundo
    "#7928CA", // Roxo vibrante
    "#A855F7", // Roxo médio
    "#C084FC", // Lavanda
    "#FF2A5F", // Rosa neon
    "#D946EF", // Magenta / fúcsia
    "#3D105B", // Volta ao violeta
  ],
};
