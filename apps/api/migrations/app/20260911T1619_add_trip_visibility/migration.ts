#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/61f3606ee05c8287dba4ff47c3025ded53b28aaa1ca09951257bb102272470a0/contract';
import startContract from '../../snapshots/61f3606ee05c8287dba4ff47c3025ded53b28aaa1ca09951257bb102272470a0/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/724bacc108b76cf89752f01172466f208df1c4b33d797cebfa490738c6f91a60/contract';
import endContract from '../../snapshots/724bacc108b76cf89752f01172466f208df1c4b33d797cebfa490738c6f91a60/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'trip',
        column: col('visibility', 'text', {
          notNull: true,
          default: lit('private'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'trip',
        constraint: 'trip_visibility_check_b9e4faaa',
        expression: "\"visibility\" IN ('public', 'private')",
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
