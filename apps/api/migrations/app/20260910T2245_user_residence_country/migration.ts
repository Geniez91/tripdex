#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/61f3606ee05c8287dba4ff47c3025ded53b28aaa1ca09951257bb102272470a0/contract';
import endContract from '../../snapshots/61f3606ee05c8287dba4ff47c3025ded53b28aaa1ca09951257bb102272470a0/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/a148478d9a8de5696f87c13a6d465f98f0d5b05532f9eb3f79208de54cfa9208/contract';
import startContract from '../../snapshots/a148478d9a8de5696f87c13a6d465f98f0d5b05532f9eb3f79208de54cfa9208/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'user',
        column: col('residenceCountryId', 'text', {
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'user',
        index: 'user_residenceCountryId_idx_410126ba',
        columns: ['residenceCountryId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'user',
        foreignKey: {
          name: 'user_residenceCountryId_fkey',
          columns: ['residenceCountryId'],
          references: { schema: 'public', table: 'country', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
