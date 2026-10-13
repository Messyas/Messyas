export function parseLanguagePalette(svg) {
  const colors = [...svg.matchAll(/<circle\b[^>]*fill="(#[\da-f]{6})"[^>]*\/>\s*<text\b[^>]*class="language"/gi)]
    .map((match) => match[1].toUpperCase());
  if (colors.length < 2) throw new Error("O card de linguagens deve conter pelo menos duas cores.");
  return colors;
}

export function languageWaveColor(item, progress, settings, palette) {
  if (palette.length < 2) throw new Error("A onda precisa de pelo menos duas cores.");
  // Fase no espaço da timeline: a onda acompanha as semanas durante a rotação.
  const phase = item.w / 53 * settings.spatialCycles - progress * settings.cyclesPerRotation;
  const position = ((phase % 1 + 1) % 1) * palette.length;
  const index = Math.floor(position);
  const fraction = position - index;
  const from = palette[index].slice(1).match(/../g).map((channel) => parseInt(channel, 16));
  const to = palette[(index + 1) % palette.length].slice(1).match(/../g).map((channel) => parseInt(channel, 16));
  const brightness = item.level === 0 ? settings.emptyBrightness : settings.activityBrightness[item.level];
  return "#" + from.map((channel, axis) => Math.round((channel + (to[axis] - channel) * fraction) * brightness)
    .toString(16).padStart(2, "0")).join("");
}
