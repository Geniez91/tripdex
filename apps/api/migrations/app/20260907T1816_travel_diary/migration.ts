#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/cedac38e72ad05a1b88d36efb1c9bcda3ab0e0e4d679c989cb207db7b2b56270/contract';
import startContract from '../../snapshots/cedac38e72ad05a1b88d36efb1c9bcda3ab0e0e4d679c989cb207db7b2b56270/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/ddbf534774b40fbcfb518efd693c7f45f034416db8ff2accb27ff65d37cdf13a/contract';
import endContract from '../../snapshots/ddbf534774b40fbcfb518efd693c7f45f034416db8ff2accb27ff65d37cdf13a/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'trip',
        column: col('coverStoragePath', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'trip',
        index: 'trip_userId_startDate_id_idx_295d51d9',
        columns: ['userId', 'startDate', 'id'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
