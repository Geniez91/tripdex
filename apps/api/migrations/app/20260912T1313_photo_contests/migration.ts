#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/04f7a3c4ecfb14d577ae8168b440455bf292be6ab25c348c51b09959c38913c4/contract';
import endContract from '../../snapshots/04f7a3c4ecfb14d577ae8168b440455bf292be6ab25c348c51b09959c38913c4/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/724bacc108b76cf89752f01172466f208df1c4b33d797cebfa490738c6f91a60/contract';
import startContract from '../../snapshots/724bacc108b76cf89752f01172466f208df1c4b33d797cebfa490738c6f91a60/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'photoContest',
        columns: [
          col('countryId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('endsAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('startsAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('OPEN'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('winnerSubmissionId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('photoContest_status_check_32214e16', "\"status\" IN ('OPEN', 'CLOSED')"),
          checkExpression('photo_contest_period_11ffcbfd', '"startsAt" < "endsAt"'),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'photoContestSubmission',
        columns: [
          col('contestId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('coverStoragePath', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tripId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'photoContestVote',
        columns: [
          col('contestId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('submissionId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'photoContestSubmission',
        constraint: 'photoContestSubmission_contestId_userId_key',
        columns: ['contestId', 'userId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'photoContestSubmission',
        constraint: 'photoContestSubmission_contestId_id_key',
        columns: ['contestId', 'id'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'photoContestVote',
        constraint: 'photoContestVote_contestId_userId_key',
        columns: ['contestId', 'userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'photoContest',
        index: 'photoContest_countryId_endsAt_id_idx_f56bfe70',
        columns: ['countryId', 'endsAt', 'id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'photoContest',
        index: 'photoContest_countryId_idx_27b43b27',
        columns: ['countryId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'photoContest',
        index: 'photoContest_startsAt_id_idx_8f6c6775',
        columns: ['startsAt', 'id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'photoContest',
        index: 'photoContest_winnerSubmissionId_idx_27cae014',
        columns: ['winnerSubmissionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'photoContestSubmission',
        index: 'photoContestSubmission_contestId_idx_8a30d986',
        columns: ['contestId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'photoContestSubmission',
        index: 'photoContestSubmission_tripId_coverStoragePath_idx_3c56c9ff',
        columns: ['tripId', 'coverStoragePath'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'photoContestSubmission',
        index: 'photoContestSubmission_tripId_idx_75da6d97',
        columns: ['tripId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'photoContestSubmission',
        index: 'photoContestSubmission_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'photoContestVote',
        index: 'photoContestVote_contestId_idx_8a30d986',
        columns: ['contestId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'photoContestVote',
        index: 'photoContestVote_contestId_submissionId_idx_3198671f',
        columns: ['contestId', 'submissionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'photoContestVote',
        index: 'photoContestVote_submissionId_idx_89cd3f4e',
        columns: ['submissionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'photoContestVote',
        index: 'photoContestVote_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'photoContest',
        foreignKey: {
          name: 'photoContest_countryId_fkey',
          columns: ['countryId'],
          references: { schema: 'public', table: 'country', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'photoContest',
        foreignKey: {
          name: 'photoContest_winnerSubmissionId_fkey',
          columns: ['winnerSubmissionId'],
          references: { schema: 'public', table: 'photoContestSubmission', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'photoContestSubmission',
        foreignKey: {
          name: 'photoContestSubmission_contestId_fkey',
          columns: ['contestId'],
          references: { schema: 'public', table: 'photoContest', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'photoContestSubmission',
        foreignKey: {
          name: 'photoContestSubmission_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'photoContestSubmission',
        foreignKey: {
          name: 'photoContestSubmission_tripId_fkey',
          columns: ['tripId'],
          references: { schema: 'public', table: 'trip', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'photoContestVote',
        foreignKey: {
          name: 'photoContestVote_contestId_fkey',
          columns: ['contestId'],
          references: { schema: 'public', table: 'photoContest', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'photoContestVote',
        foreignKey: {
          name: 'photoContestVote_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'photoContestVote',
        foreignKey: {
          name: 'photoContestVote_contestId_submissionId_fkey',
          columns: ['contestId', 'submissionId'],
          references: {
            schema: 'public',
            table: 'photoContestSubmission',
            columns: ['contestId', 'id'],
          },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
