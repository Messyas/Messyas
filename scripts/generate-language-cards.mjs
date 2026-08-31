import { mkdir, writeFile } from "node:fs/promises";

const username = process.env.PROFILE_USERNAME;
const token = process.env.METRICS_TOKEN;

if (!username || !token) throw new Error("PROFILE_USERNAME e METRICS_TOKEN são obrigatórios.");

const ignored = new Set(["html", "css", "markdown", "powershell", "handlebars", "jupyter notebook", "tex", "less", "scss"]);
const colors = {
  typescript: "#A855F7", rust: "#FF4D8D", python: "#D7FF5F", javascript: "#FDE047",
  java: "#FB7185", go: "#C084FC", c: "#8B5CF6", "c++": "#B779FF",
  kotlin: "#E879F9", dart: "#A78BFA", "c#": "#C084FC", php: "#F43F7E",
};
const fallbackColors = ["#A855F7", "#FF4D8D", "#D7FF5F", "#F43F7E", "#C084FC", "#8B5CF6", "#B779FF", "#FDE047"];

const query = `query ($login: String!) {
  user(login: $login) {
    repositories(first: 100, ownerAffiliations: OWNER, privacy: PUBLIC, isFork: false) {
      nodes { stargazerCount languages(first: 100) { edges { size node { name } } } }
    }
  }
}`;
const response = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json", "User-Agent": "Messyas-language-card" },
  body: JSON.stringify({ query, variables: { login: username } }),
});
const payload = await response.json();
if (!response.ok || payload.errors || !payload.data?.user) {
  throw new Error(`Não foi possível consultar linguagens: ${JSON.stringify(payload.errors ?? payload)}`);
}

async function githubSearch(query) {
  const search = await fetch(`https://api.github.com/search/${query}`, {
    headers: { Authorization: `bearer ${token}`, Accept: "application/vnd.github+json", "User-Agent": "Messyas-profile-card" },
  });
  const result = await search.json();
  if (!search.ok) throw new Error(`Falha ao consultar estatísticas: ${JSON.stringify(result)}`);
  return result.total_count;
}

const encodedUser = encodeURIComponent(username);
const [commits, pullRequests, issues] = await Promise.all([
  githubSearch(`commits?q=author:${encodedUser}`),
  githubSearch(`issues?q=author:${encodedUser}+is:pr`),
  githubSearch(`issues?q=author:${encodedUser}+is:issue`),
]);
const stars = payload.data.user.repositories.nodes.reduce((sum, repository) => sum + repository.stargazerCount, 0);
const stats = { stars, commits, pullRequests, issues };

const totals = new Map();
for (const repository of payload.data.user.repositories.nodes) {
  for (const edge of repository.languages.edges) {
    const name = edge.node.name;
    if (!ignored.has(name.toLowerCase())) totals.set(name, (totals.get(name) ?? 0) + edge.size);
  }
}
const ranked = [...totals.entries()].sort(([, left], [, right]) => right - left).slice(0, 8);
const total = ranked.reduce((sum, [, size]) => sum + size, 0);
const languages = ranked.map(([name, size], index) => ({
  name, percentage: total ? (size / total) * 100 : 0,
  color: colors[name.toLowerCase()] ?? fallbackColors[index],
}));

const escapeXml = (value) => String(value).replace(/[<>&"']/g, (character) => ({
  "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;",
})[character]);

function renderCard({ background, border, title, text }) {
  let offset = 20;
  const bar = languages.map((language) => {
    const width = language.percentage * 2.6;
    const segment = `<rect x="${offset.toFixed(2)}" y="0" width="${width.toFixed(2)}" height="8" fill="${language.color}" />`;
    offset += width;
    return segment;
  }).join("");
  const rows = languages.map((language, index) => {
    const x = index < 4 ? 20 : 158;
    const y = 88 + (index % 4) * 21;
    return `<circle cx="${x}" cy="${y - 4}" r="5" fill="${language.color}" />
      <text x="${x + 11}" y="${y}" class="language">${escapeXml(language.name)} ${language.percentage.toFixed(2)}%</text>`;
  }).join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="180" viewBox="0 0 300 180" role="img" aria-label="Linguagens mais utilizadas">
  <style>.title { font: 700 17px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; fill: ${title}; }.language { font: 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; fill: ${text}; }</style>
  <rect x="0.75" y="0.75" width="298.5" height="178.5" rx="5" fill="${background}" stroke="${border}" stroke-width="1.5" />
  <text x="20" y="39" class="title">Linguagens mais utilizadas</text>
  <clipPath id="bar-clip"><rect x="20" y="55" width="260" height="8" rx="4" /></clipPath>
  <g clip-path="url(#bar-clip)">${bar}</g>
  ${rows}
</svg>`;
}

function rankFor({ stars, commits, pullRequests, issues }) {
  // O peso privilegia contribuições de código e mantém o perfil atual no nível S.
  const score = commits + pullRequests * 12 + issues * 8 + stars * 20;
  if (score >= 9000) return { label: "SSS+", progress: 100 };
  if (score >= 5000) return { label: "SSS", progress: ((score - 5000) / 4000) * 100 };
  if (score >= 2500) return { label: "SS", progress: ((score - 2500) / 2500) * 100 };
  if (score >= 1200) return { label: "S", progress: ((score - 1200) / 1300) * 100 };
  if (score >= 700) return { label: "A", progress: ((score - 700) / 500) * 100 };
  return { label: "B", progress: (score / 700) * 100 };
}

function renderStatsCard({ background, border, title, text, ringTrack }) {
  const rank = rankFor(stats);
  const rows = [
    ["★", "Total de estrelas:", stats.stars],
    ["↻", "Total de commits:", stats.commits],
    ["⚯", "Total de PRs:", stats.pullRequests],
    ["!", "Total de Issues:", stats.issues],
  ].map(([icon, label, value], index) => {
    const y = 76 + index * 27;
    return `<text x="23" y="${y}" class="icon">${icon}</text><text x="48" y="${y}" class="label">${label}</text><text x="180" y="${y}" class="value">${value}</text>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="180" viewBox="0 0 300 180" role="img" aria-label="Estatísticas do GitHub">
  <style>.title { font: 700 17px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; fill: ${title}; }.label { font: 700 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; fill: ${text}; }.value { font: 700 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; fill: ${text}; text-anchor: end; }.icon { font: 700 17px -apple-system, BlinkMacSystemFont, 'Segoe UI Symbol', sans-serif; fill: #FF2A5F; }</style>
  <rect x="0.75" y="0.75" width="298.5" height="178.5" rx="5" fill="${background}" stroke="${border}" stroke-width="1.5" />
  <text x="20" y="39" class="title">Estatísticas do GitHub</text>
  ${rows}
  <circle cx="246" cy="107" r="35" fill="none" stroke="${ringTrack}" stroke-width="7" />
  <circle cx="246" cy="107" r="35" fill="none" stroke="#D7FF5F" stroke-width="7" stroke-linecap="round" pathLength="100" stroke-dasharray="${Math.max(5, rank.progress).toFixed(2)} 100" transform="rotate(-90 246 107)" />
  <text x="246" y="115" text-anchor="middle" style="font: 700 ${rank.label.length > 2 ? 18 : 25}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; fill: ${text};">${rank.label}</text>
</svg>`;
}

await mkdir("assets", { recursive: true });
await Promise.all([
  writeFile("assets/github-languages-dark.svg", renderCard({ background: "#0D0814", border: "#3D105B", title: "#C084FC", text: "#ECE6F0" })),
  writeFile("assets/github-languages-light.svg", renderCard({ background: "#FAF5FF", border: "#D8B4FE", title: "#6B21A8", text: "#1E1035" })),
  writeFile("assets/github-stats-dark.svg", renderStatsCard({ background: "#0D0814", border: "#3D105B", title: "#C084FC", text: "#ECE6F0", ringTrack: "#3D105B" })),
  writeFile("assets/github-stats-light.svg", renderStatsCard({ background: "#FAF5FF", border: "#D8B4FE", title: "#6B21A8", text: "#1E1035", ringTrack: "#D8B4FE" })),
]);
