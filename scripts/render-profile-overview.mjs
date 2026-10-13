const escapeXml = (value) => String(value).replace(/[<>&"']/g, (character) => ({
  "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;",
})[character]);

export function renderProfileOverview(stats, languages, rank, { background, border, title, text, ringTrack }) {
  const icons = [
    '<path d="m10 1 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L10 15.3l-5.6 2.9 1.1-6.2L1 7.6l6.2-.9Z" fill="currentColor" stroke="none" />',
    '<path d="M16 7a7 7 0 1 0 1 6M16 2v5h-5" />',
    '<circle cx="5" cy="4" r="2" /><circle cx="5" cy="16" r="2" /><circle cx="15" cy="16" r="2" /><path d="M5 6v8m5-11h2a3 3 0 0 1 3 3v8m-5-11 3-2m-3 2 3 2" />',
    '<circle cx="10" cy="10" r="8" /><path d="M10 5v6m0 3v1" />',
  ];
  const rows = [
    ["Total Stars:", stats.stars], ["Total Commits:", stats.commits],
    ["Total PRs:", stats.pullRequests], ["Total Issues:", stats.issues],
  ].map(([label, value], index) => {
    const y = 92 + index * 36;
    return `<g transform="translate(32 ${y - 16})" class="icon" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icons[index]}</g>
  <text x="66" y="${y}" class="label">${label}</text><text x="290" y="${y}" class="value">${escapeXml(value)}</text>`;
  }).join("\n  ");
  let offset = 520;
  const bar = languages.map((language) => {
    const width = language.percentage * 4.08;
    const segment = `<rect x="${offset.toFixed(2)}" y="64" width="${width.toFixed(2)}" height="8" fill="${language.color}" />`;
    offset += width;
    return segment;
  }).join("");
  const legend = languages.map((language, index) => {
    const x = index < 4 ? 520 : 748;
    const y = 108 + (index % 4) * 32;
    return `<circle cx="${x + 5}" cy="${y - 5}" r="5" fill="${language.color}" /><text x="${x + 20}" y="${y}" class="language">${escapeXml(language.name)} ${language.percentage.toFixed(2)}%</text>`;
  }).join("\n  ");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="240" viewBox="0 0 960 240" role="img" aria-label="GitHub Stats and Most Used Languages">
  <style>
    text { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; fill: ${text}; }
    .title { font-size: 22px; font-weight: 700; fill: ${title}; }
    .label, .value { font-size: 16px; font-weight: 700; }
    .value { text-anchor: end; }
    .language { font-size: 16px; }
    .icon { color: #FF2A5F; }
  </style>
  <rect x="1" y="1" width="958" height="238" rx="8" fill="${background}" stroke="${border}" stroke-width="2" />
  <path d="M480 32v176" stroke="${border}" />
  <text x="32" y="44" class="title">GitHub Stats</text>
  ${rows}
  <circle cx="388" cy="140" r="46" fill="none" stroke="${ringTrack}" stroke-width="9" />
  <circle cx="388" cy="140" r="46" fill="none" stroke="#D7FF5F" stroke-width="9" stroke-linecap="round" pathLength="100" stroke-dasharray="${Math.max(5, rank.progress).toFixed(2)} 100" transform="rotate(-90 388 140)" />
  <text x="388" y="151" text-anchor="middle" font-size="${rank.label.length > 2 ? 26 : 34}" font-weight="700">${escapeXml(rank.label)}</text>
  <text x="520" y="44" class="title">Most Used Languages</text>
  <defs><clipPath id="language-bar"><rect x="520" y="64" width="408" height="8" rx="4" /></clipPath></defs>
  <g clip-path="url(#language-bar)">${bar}</g>
  ${legend}
</svg>\n`;
}
