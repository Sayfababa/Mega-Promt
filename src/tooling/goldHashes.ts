import { simulateCombat } from '../engine/combat/simulate';
import { buildFixture } from './fixtures';
import { buildEnemy } from '../engine/run/run';
import { runConfigFor } from '../engine/state/commands';
import { generateEncounterDrops } from '../engine/loot/generator';
import { hashOf } from '../engine/core/hash';
import { DUNGEONS } from '../content/dungeons/dungeons';

export function goldHashes(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [arch, lvl, dungeon, mlvl] of [['bleed2h', 1, 'forsaken_gate', 1], ['block1h', 8, 'decayed_crypt', 8], ['bleed2h', 15, 'decayed_crypt', 14]] as const) {
    const fx = buildFixture(arch, lvl, lvl === 1 ? 'start' : 'early');
    const cfg = runConfigFor(dungeon, mlvl);
    cfg.encounters.forEach((enc, i) => {
      for (const seed of [1, 99]) out[`${arch}_L${lvl}_${enc.monsterId}_${seed}`] = simulateCombat(fx.player, [buildEnemy(cfg, enc, i)], { seed, record: false }).eventHash;
    });
  }
  const d = DUNGEONS[1]!;
  out.loot_boss_42 = hashOf(generateEncounterDrops({ seed: 42, encounterType: 'boss', monsterLevel: 14, baseWeights: d.baseWeights, baseFamilies: d.baseFamilies, magicFind: 0, bossId: 'boss_gravelord', source: 'gold' }).items);
  return out;
}
