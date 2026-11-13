// Regenerates CHEATSHEET.md from the lesson data: node tools/build-cheatsheet.js
global.window = global;
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'js', 'lessons');
fs.readdirSync(dir).sort().forEach(f => eval(fs.readFileSync(path.join(dir, f), 'utf8')));
const strip = s => String(s || '').replace(/<[^>]+>/g, '').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
let md = '# CI/CD Cheat Sheet\n\n_Auto-generated from the CI/CD Explorer lessons. One master memory hook + the key commands per lesson._\n\n';
window.LESSONS.sort((a, b) => a.num - b.num).forEach(l => {
  md += `## ${String(l.num).padStart(2, '0')} · ${l.title}\n\n> ★ ${strip(l.hook)}\n\n| Command | What it does |\n|---|---|\n`;
  (l.cheat || []).forEach(c => md += `| \`${c[0].replace(/\|/g, '\\|')}\` | ${c[1]} |\n`);
  md += '\n**Memory hooks:**\n\n' + l.steps.filter(s => s.hook).map(s => `- **${s.t}**: ${strip(s.hook)}`).join('\n') + '\n\n';
});
fs.writeFileSync(path.join(__dirname, '..', 'CHEATSHEET.md'), md);
console.log('CHEATSHEET.md written');
