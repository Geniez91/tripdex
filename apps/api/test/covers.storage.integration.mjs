import 'reflect-metadata';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../dist/app.module.js';
import { db } from '../dist/prisma/db.js';
import { DatabaseService } from '../dist/prisma/database.service.js';
import { CurrentUserService } from '../dist/current-user/current-user.service.js';
import { CoverStorageService } from '../dist/trips/cover-storage.service.js';

// Opt-in only. Application code loads the server configuration; never inspect
// credentials, request headers, signed URLs or raw SDK errors in this test.
test(
  'real NestJS, PostgreSQL and private Supabase cover lifecycle',
  {
    skip: process.env.RUN_STORAGE_INTEGRATION !== 'true',
    timeout: 180_000,
  },
  async () => {
    const storage = new CoverStorageService();
    const paths = new Set();
    const rollback = new Error('Rollback cover fixtures');
    let stage = 'private bucket configuration';
    let app;
    const check = (condition) => {
      if (!condition)
        throw new Error(`Live Storage validation failed: ${stage}`);
    };
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
      'base64',
    );
    try {
      const config = await storage.checkConfiguration();
      check(config.bucket === 'trip-covers' && config.private);
      stage = 'bucket size restriction (positive, at most 5242880 bytes)';
      check(
        Number(config.fileSizeLimit) > 0 &&
          Number(config.fileSizeLimit) <= 5 * 1024 * 1024,
      );
      stage = 'bucket MIME restrictions (JPEG, PNG, WebP only)';
      check(
        JSON.stringify([...(config.allowedMimeTypes ?? [])].sort()) ===
          JSON.stringify(['image/jpeg', 'image/png', 'image/webp']),
      );
      console.log('Private bucket, size limit and MIME restrictions verified.');
      stage = 'database connection and local identity';
      try {
        await db.transaction(async (tx) => {
          const database = {
            client: { orm: tx.orm, transaction: (fn) => fn(tx) },
          };
          const module = await Test.createTestingModule({
            imports: [AppModule],
          })
            .overrideProvider(DatabaseService)
            .useValue(database)
            .compile();
          app = module.createNestApplication({ logger: false });
          await app.init();
          const owner = await app.get(CurrentUserService).getUserId();
          const server = app.getHttpServer();
          const country = await tx.orm.public.Country.where({
            iso3: 'JPN',
          }).first();
          check(Boolean(country));
          stage = 'creation without cover';
          const created = await request(server)
            .post('/trips')
            .send({
              title: 'Storage rollback validation',
              startDate: '2026-09-08',
              countryIds: [country.id],
            });
          check(
            created.status === 201 &&
              created.body.coverStoragePath === null &&
              created.body.coverUrl === null,
          );
          const id = created.body.id;
          const endpoint = `/me/trips/${id}/cover`;
          stage = 'MIME, size and untrusted fields';
          check(
            (
              await request(server)
                .put(endpoint)
                .attach('cover', Buffer.from('text'), 'bad.txt')
            ).status === 400,
          );
          check(
            (
              await request(server)
                .put(endpoint)
                .attach('cover', Buffer.alloc(5 * 1024 * 1024 + 1), 'large.png')
            ).status === 413,
          );
          check(
            (
              await request(server)
                .put(endpoint)
                .field('userId', 'attacker')
                .attach('cover', png, 'cover.png')
            ).status === 400,
          );
          stage = 'non-owner upload and delete';
          const otherId = randomUUID();
          await tx.orm.public.User.create({
            id: otherId,
            email: `${otherId}@tripdex.invalid`,
            username: otherId,
          });
          const otherTrip = await tx.orm.public.Trip.create({
            userId: otherId,
            title: 'Other owner fixture',
            startDate: '2026-09-08T00:00:00.000Z',
            endDate: null,
          });
          check(
            (
              await request(server)
                .put(`/me/trips/${otherTrip.id}/cover`)
                .attach('cover', png, 'cover.png')
            ).status === 404,
          );
          check(
            (await request(server).delete(`/me/trips/${otherTrip.id}/cover`))
              .status === 404,
          );
          stage = 'valid upload';
          const first = await request(server)
            .put(endpoint)
            .attach('cover', png, 'cover.png');
          if (first.body.coverStoragePath)
            paths.add(first.body.coverStoragePath);
          check(
            first.status === 200 &&
              first.body.coverStoragePath?.startsWith(
                `users/${owner}/trips/${id}/cover/`,
              ),
          );
          stage = 'signed image download';
          const downloaded = await fetch(first.body.coverUrl);
          check(
            downloaded.ok &&
              Buffer.from(await downloaded.arrayBuffer()).equals(png),
          );
          stage = 'private object cannot be downloaded publicly';
          const publicUrl = new URL(first.body.coverUrl);
          publicUrl.pathname = publicUrl.pathname.replace(
            '/object/sign/',
            '/object/public/',
          );
          publicUrl.search = '';
          check(!(await fetch(publicUrl)).ok);
          stage = 'persistent path and derived journal/detail URLs';
          const persisted = await tx.orm.public.Trip.where({
            id,
            userId: owner,
          }).first();
          check(
            persisted.coverStoragePath === first.body.coverStoragePath &&
              !persisted.coverStoragePath.includes('?'),
          );
          for (const url of ['/me/trips', `/me/trips/${id}`]) {
            const response = await request(server).get(url);
            const result = Array.isArray(response.body)
              ? response.body.find((trip) => trip.id === id)
              : response.body;
            check(response.status === 200 && Boolean(result?.coverUrl));
            check(response.headers['cache-control'] === 'private, no-store');
            check((await fetch(result.coverUrl)).ok);
          }
          stage = 'replacement and old-object cleanup';
          const replacement = await request(server)
            .put(endpoint)
            .attach('cover', png, 'replacement.png');
          if (replacement.body.coverStoragePath)
            paths.add(replacement.body.coverStoragePath);
          check(
            replacement.status === 200 &&
              replacement.body.coverStoragePath !==
                first.body.coverStoragePath &&
              !replacement.body.cleanupPending,
          );
          check(
            (await storage.signedUrl(first.body.coverStoragePath)) === null,
          );
          check((await fetch(replacement.body.coverUrl)).ok);
          stage = 'missing object fallback';
          check(await storage.cleanup(replacement.body.coverStoragePath));
          const missing = await request(server).get(`/me/trips/${id}`);
          check(
            missing.status === 200 &&
              missing.body.coverUrl === null &&
              missing.body.coverStoragePath ===
                replacement.body.coverStoragePath,
          );
          stage = 'delete with missing object and null path';
          const removed = await request(server).delete(endpoint);
          check(
            removed.status === 200 &&
              removed.body.coverStoragePath === null &&
              !removed.body.cleanupPending,
          );
          check(
            (await tx.orm.public.Trip.where({ id, userId: owner }).first())
              .coverStoragePath === null,
          );
          stage = 'delete existing object';
          const last = await request(server)
            .put(endpoint)
            .attach('cover', png, 'last.png');
          if (last.body.coverStoragePath) paths.add(last.body.coverStoragePath);
          check(last.status === 200);
          check((await request(server).delete(endpoint)).status === 200);
          check((await storage.signedUrl(last.body.coverStoragePath)) === null);
          console.log(
            'Real upload, signed download, ownership, journal/detail, replacement, missing object and deletion verified.',
          );
          throw rollback;
        });
      } catch (error) {
        if (error !== rollback)
          throw new Error(`Live Storage validation failed: ${stage}`);
      }
    } catch {
      // Never forward exception objects that might contain network request details.
      throw new Error(`Live Storage validation failed: ${stage}`);
    } finally {
      let clean = true;
      for (const path of paths)
        if (!(await storage.cleanup(path))) clean = false;
      if (app) await app.close();
      await db.close();
      if (!clean)
        throw new Error('Live Storage fixture cleanup requires attention.');
    }
  },
);
