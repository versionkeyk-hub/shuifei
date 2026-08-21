/** Split SQL seed files without breaking quoted multiline values. */
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

function readOption(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function splitStatements(sql) {
  const result = [];
  let start = 0;
  let inString = false;

  for (let index = 0; index < sql.length; index += 1) {
    const character = sql[index];
    if (character === "'") {
      if (inString && sql[index + 1] === "'") {
        index += 1;
        continue;
      }
      inString = !inString;
    } else if (character === ';' && !inString) {
      const statement = sql.slice(start, index + 1).trim();
      if (statement) result.push(statement);
      start = index + 1;
    }
  }

  if (inString || sql.slice(start).trim()) {
    throw new Error('Seed SQL ends inside a quoted or incomplete statement.');
  }
  return result;
}

const input = path.resolve(readOption('--input', 'data/generated/0001-initial-seed.sql'));
const outputDirectory = path.resolve(readOption('--output-dir', 'data/generated/seed-batches'));
const maxBytes = Number(readOption('--max-bytes', '30000'));
const source = await readFile(input, 'utf8');
const sourceStatements = splitStatements(source);

await mkdir(outputDirectory, { recursive: true });
for (const file of await readdir(outputDirectory)) {
  if (file.endsWith('.sql')) await rm(path.join(outputDirectory, file));
}

const batches = [];
let current = [];
let currentBytes = 0;
for (const statement of sourceStatements) {
  const statementBytes = Buffer.byteLength(statement, 'utf8') + 1;
  if (current.length && currentBytes + statementBytes > maxBytes) {
    batches.push(current);
    current = [];
    currentBytes = 0;
  }
  current.push(statement);
  currentBytes += statementBytes;
}
if (current.length) batches.push(current);

await Promise.all(batches.map((batch, index) => writeFile(
  path.join(outputDirectory, `${String(index + 1).padStart(3, '0')}.sql`),
  `${batch.join('\n')}\n`,
  'utf8',
)));

console.log(JSON.stringify({
  statements: sourceStatements.length,
  batches: batches.length,
  max_bytes: maxBytes,
  largest_statement_bytes: Math.max(...sourceStatements.map((statement) => Buffer.byteLength(statement, 'utf8'))),
}));
