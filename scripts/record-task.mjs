import { readFileSync, writeFileSync } from 'node:fs';
const [id, evidence] = process.argv.slice(2);
const path = new URL('../PORTFOLIO_TASKS.md', import.meta.url);
let plan = readFileSync(path, 'utf8');
if (!/^T\d{2}$/.test(id) || !evidence) throw new Error('Require task ID and verified evidence');
if (!plan.includes(`**${id} —`)) throw new Error('Unknown task');
plan = plan.replace(`- [ ] **${id} —`, `- [x] **${id} —`);
plan += `\n- ${id} — hoàn thành: ${evidence}\n`;
writeFileSync(path, plan);
