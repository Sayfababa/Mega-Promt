/**
 * Gold regression seeds (spec 18.3): fixed fixtures + seeds → fixed hashes.
 * Intentional engine/balance changes: run `npx tsx src/tooling/updateGold.ts` AND log it in BALANCE_CHANGELOG.md.
 */
import { goldHashes } from '../../tooling/goldHashes';
import GOLD from '../fixtures/gold.json';

describe('gold regression seeds', () => {
  it('combat + loot hashes match the stored gold file', () => {
    expect(goldHashes()).toEqual(GOLD);
  });
});
