export const BANNER_CONFIG = {
  // "capsule": faixas originais; "topographic": curvas de nível animadas.
  mode: "topographic",
  width: 480,
  height: 66,
  fps: 60,
  durationSeconds: 10,        // Ciclo mais lento, mantendo 60 quadros por segundo
  background: null,           // null: transparente; ou um hexadecimal para fundo sólido
  contourFrequency: 28,       // Mais curvas de nível, com ilhas e dobras orgânicas
  fadeStart: 0.27,            // Desvanecimento apenas próximo ao topo da faixa
  alphaLevels: 4,             // Suavização compacta para manter a transparência leve
  colors: ["#C084FC", "#C084FC", "#C084FC"], // Linhas uniformes, como na referência
};
