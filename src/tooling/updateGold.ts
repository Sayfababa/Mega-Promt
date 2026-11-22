/** Regenerates src/tests/fixtures/gold.json (only after an intentional, changelogged change). */
import { writeFileSync } from 'node:fs';
import { goldHashes } from './goldHashes';
writeFileSync('src/tests/fixtures/gold.json', JSON.stringify(goldHashes(), null, 2) + '\n');
console.log('gold.json updated');
