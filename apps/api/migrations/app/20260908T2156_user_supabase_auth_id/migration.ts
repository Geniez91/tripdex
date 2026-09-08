#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/a148478d9a8de5696f87c13a6d465f98f0d5b05532f9eb3f79208de54cfa9208/contract';
import endContract from '../../snapshots/a148478d9a8de5696f87c13a6d465f98f0d5b05532f9eb3f79208de54cfa9208/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/ddbf534774b40fbcfb518efd693c7f45f034416db8ff2accb27ff65d37cdf13a/contract';
import startContract from '../../snapshots/ddbf534774b40fbcfb518efd693c7f45f034416db8ff2accb27ff65d37cdf13a/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'user',
        column: col('supabaseAuthId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'user',
        constraint: 'user_supabaseAuthId_key',
        columns: ['supabaseAuthId'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
