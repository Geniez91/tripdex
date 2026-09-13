#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/04f7a3c4ecfb14d577ae8168b440455bf292be6ab25c348c51b09959c38913c4/contract';
import startContract from '../../snapshots/04f7a3c4ecfb14d577ae8168b440455bf292be6ab25c348c51b09959c38913c4/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/972b17073e6c58a686ad786480387e9b3d3afeeca3e70f25a23d764628110535/contract';
import endContract from '../../snapshots/972b17073e6c58a686ad786480387e9b3d3afeeca3e70f25a23d764628110535/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'photoContest',
        column: col('weeklyPeriod', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'photoContest',
        constraint: 'photoContest_weeklyPeriod_key',
        columns: ['weeklyPeriod'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
