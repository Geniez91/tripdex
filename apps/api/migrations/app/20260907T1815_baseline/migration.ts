#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/cedac38e72ad05a1b88d36efb1c9bcda3ab0e0e4d679c989cb207db7b2b56270/contract';
import endContract from '../../snapshots/cedac38e72ad05a1b88d36efb1c9bcda3ab0e0e4d679c989cb207db7b2b56270/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'city',
        columns: [
          col('countryId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('latitude', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('longitude', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('slug', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'country',
        columns: [
          col('continentCode', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('iso2', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('iso3', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('slug', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'trip',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('endDate', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('rating', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('review', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('startDate', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'tripCity',
        columns: [
          col('arrivalDate', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('cityId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('departureDate', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('tripId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['tripId', 'cityId'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'tripCountry',
        columns: [
          col('arrivalDate', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('countryId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('departureDate', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('tripId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['tripId', 'countryId'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'user',
        columns: [
          col('avatarUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('bio', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('username', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'city',
        constraint: 'city_countryId_slug_key',
        columns: ['countryId', 'slug'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'country',
        constraint: 'country_iso2_key',
        columns: ['iso2'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'country',
        constraint: 'country_iso3_key',
        columns: ['iso3'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'country',
        constraint: 'country_slug_key',
        columns: ['slug'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'user',
        constraint: 'user_email_key',
        columns: ['email'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'user',
        constraint: 'user_username_key',
        columns: ['username'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'city',
        index: 'city_countryId_idx_27b43b27',
        columns: ['countryId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'trip',
        index: 'trip_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'tripCity',
        index: 'tripCity_cityId_idx_1ab1b247',
        columns: ['cityId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'tripCity',
        index: 'tripCity_tripId_idx_75da6d97',
        columns: ['tripId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'tripCountry',
        index: 'tripCountry_countryId_idx_27b43b27',
        columns: ['countryId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'tripCountry',
        index: 'tripCountry_tripId_idx_75da6d97',
        columns: ['tripId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'city',
        foreignKey: {
          name: 'city_countryId_fkey',
          columns: ['countryId'],
          references: { schema: 'public', table: 'country', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'trip',
        foreignKey: {
          name: 'trip_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'tripCity',
        foreignKey: {
          name: 'tripCity_tripId_fkey',
          columns: ['tripId'],
          references: { schema: 'public', table: 'trip', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'tripCity',
        foreignKey: {
          name: 'tripCity_cityId_fkey',
          columns: ['cityId'],
          references: { schema: 'public', table: 'city', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'tripCountry',
        foreignKey: {
          name: 'tripCountry_tripId_fkey',
          columns: ['tripId'],
          references: { schema: 'public', table: 'trip', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'tripCountry',
        foreignKey: {
          name: 'tripCountry_countryId_fkey',
          columns: ['countryId'],
          references: { schema: 'public', table: 'country', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
