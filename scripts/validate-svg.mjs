import { readFile } from "node:fs/promises";

const svg = await readFile("profile-3d-contrib/profile-night-rainbow.svg", "utf8");

// Check for duplicate attributes on ANY tag
const tagRegex = /<([a-zA-Z0-9]+)\b([^>]*)>/g;
let match;
let errors = 0;
while ((match = tagRegex.exec(svg)) !== null) {
  const tagName = match[1];
  const attrsStr = match[2];
  
  // match attribute names
  const attrRegex = /([a-zA-Z0-9:-]+)=/g;
  let attrMatch;
  const seen = new Set();
  while ((attrMatch = attrRegex.exec(attrsStr)) !== null) {
    const attrName = attrMatch[1];
    if (seen.has(attrName)) {
      console.log(`ERROR: Duplicate attribute '${attrName}' in <${tagName}>:`, attrsStr);
      errors++;
    }
    seen.add(attrName);
  }
}

if (errors === 0) {
  console.log("No duplicate attributes found! XML is valid!");
} else {
  console.log(`Total duplicate attribute errors: ${errors}`);
}
