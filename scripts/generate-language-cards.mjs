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
      nodes { languages(first: 100) { edges { size node { name } } } }
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

await mkdir("assets", { recursive: true });
await Promise.all([
  writeFile("assets/github-languages-dark.svg", renderCard({ background: "#0D0814", border: "#3D105B", title: "#C084FC", text: "#ECE6F0" })),
  writeFile("assets/github-languages-light.svg", renderCard({ background: "#FAF5FF", border: "#D8B4FE", title: "#6B21A8", text: "#1E1035" })),
]);
