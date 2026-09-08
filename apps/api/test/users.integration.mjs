import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, test } from 'node:test';
import { db } from '../dist/prisma/db.js';
import { UserRepository } from '../dist/users/repositories/user.repository.js';
import { UsersService } from '../dist/users/users.service.js';
import { UserIdentityConflictError } from '../dist/users/user-provisioning.error.js';

after(() => db.close());

function registration() {
  const suffix = randomUUID().replaceAll('-', '').slice(0, 20);
  return {
    supabaseAuthId: randomUUID(),
    email: `${suffix}@tripdex.invalid`,
    username: `m3_${suffix}`,
  };
}

test('lazy provisioning preserves the business ID and ignores later username metadata', async () => {
  // Arrange
  const identity = registration();
  const rollback = new Error('Rollback user fixtures');
  let provisionedId;

  // Act
  await assert.rejects(
    db.transaction(async (tx) => {
      const repository = new UserRepository({ client: tx });
      const service = new UsersService(repository);
      const first = await service.resolveOrCreateUser({
        ...identity,
        requestedUsername: identity.username,
      });
      const repeated = await service.resolveOrCreateUser({
        ...identity,
        requestedUsername: 'changed_username',
      });

      // Assert
      assert.notEqual(first.id, identity.supabaseAuthId);
      assert.deepEqual(repeated, first);
      assert.equal(first.username, identity.username);
      provisionedId = first.id;
      throw rollback;
    }),
    (error) => error === rollback,
  );
  assert.equal(
    await db.orm.public.User.where({ id: provisionedId }).first(),
    null,
  );
});

for (const [field, expected] of [
  ['supabaseAuthId', 'identity'],
  ['username', 'USERNAME_TAKEN'],
  ['email', 'ACCOUNT_LINK_CONFLICT'],
]) {
  test(`PostgreSQL enforces ${field} uniqueness and the repository translates it`, async () => {
    // Arrange
    const first = registration();
    const second = { ...registration(), [field]: first[field] };

    // Act
    const insertion = db.transaction(async (tx) => {
      const repository = new UserRepository({ client: tx });
      await repository.create(first);
      await repository.create(second);
      throw new Error('Expected unique constraint to reject duplicate');
    });

    // Assert
    await assert.rejects(insertion, (error) =>
      expected === 'identity'
        ? error instanceof UserIdentityConflictError
        : error?.code === expected,
    );
    assert.equal(
      await db.orm.public.User.where({
        supabaseAuthId: first.supabaseAuthId,
      }).first(),
      null,
    );
  });
}

test('multiple unlinked historical users keep nullable Auth identities', async () => {
  // Arrange
  const rollback = new Error('Rollback unlinked fixtures');
  const first = registration();
  const second = registration();

  // Act
  await assert.rejects(
    db.transaction(async (tx) => {
      const users = await Promise.all(
        [first, second].map(({ email, username }) =>
          tx.orm.public.User.create({ email, username }),
        ),
      );

      // Assert
      assert.ok(users.every((user) => user.supabaseAuthId === null));
      assert.notEqual(users[0].id, users[1].id);
      throw rollback;
    }),
    (error) => error === rollback,
  );
});
