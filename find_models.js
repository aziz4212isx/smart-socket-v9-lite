const fs = require('fs');
const c = fs.readFileSync('C:/Users/aziz/.gemini/antigravity-ide/brain/d8a4d703-eaa2-46d4-9cb2-5b0aa5622d8a/.system_generated/steps/2151/content.md', 'utf8');
const matches = [...c.matchAll(/"id":"([^"]+?free[^"]*?)"/g)];
console.log("FREE MODELS:");
console.log(matches.map(m => m[1]).join('\n'));
