import { expect, test } from 'vitest';
import { createClient } from '../src/services/cosmos-db.service';
import {
  CosmosClient,
  JSONObject,
  OperationInput,
  PartitionKeyDefinition,
} from '@azure/cosmos';

type User = {
  firstName: string;
  lastName: string;
  age: number;
  createdAt: Date;
  isSuperAdmin: boolean;
};

/**
 * e2e test - high-level steps
 *
 * 1. create Azure CosmosDB Emulator in github actions - done in /github/workflow/test-e2e.yml
 * 2. create db
 * 3. create container(s)
 * 4. seed container(s)
 * 5. test functionalities
 */

const DATABASE_NAME = 'test-db';
const CONTAINER_ID = 'User';
const DB_CONNECTION_STRING =
  'AccountEndpoint=http://localhost:8081/;AccountKey=C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==';

const cosmosClient = new CosmosClient(DB_CONNECTION_STRING);

test('Should create database if not exists', async () => {
  await cosmosClient.databases.createIfNotExists({ id: DATABASE_NAME });
  expect(true).toBe(true);
});

test('Should create containers if not exists', async () => {
  await cosmosClient.database(DATABASE_NAME).containers.createIfNotExists({
    id: CONTAINER_ID,
    partitionKey: {
      kind: 'Hash',
      paths: ['/id'],
    } as PartitionKeyDefinition,
  });

  expect(true).toBe(true);
});

test('Should seed the container(s)', async () => {
  const items: OperationInput[] = Array.from({ length: 10 }, (v, i) => {
    const resourceBody: User = {
      firstName: `FirstName${i}`,
      lastName: `FirstName${i}`,
      age: i * 10,
      createdAt: new Date(),
      isSuperAdmin: false,
    };
    return {
      operationType: 'Create',
      resourceBody: resourceBody as unknown as JSONObject,
    };
  });
  await cosmosClient
    .database(DATABASE_NAME)
    .container(CONTAINER_ID)
    .items.batch(items);
  expect(true).toBe(true);
});

const db = createClient({
  database: DATABASE_NAME,
  connectionString: DB_CONNECTION_STRING,
  models: (t) => ({
    user: t.createModel<User>({ container: CONTAINER_ID }),
  }),
});

test('Should initialise ORM client', async () => {
  expect(db).toBeDefined();
});

test('Should return x items when requesting x items', async () => {
  const result = await db.user.findMany({
    take: 10,
  });
  expect(result.items?.length).toEqual(10);
});

test('Should return items that satisfies filters applied', async () => {
  const result = await db.user.findMany({
    where: {
      lastName: {
        startsWith: 'a',
      },
    },
  });
  expect(result.items?.length).toEqual(0);
});
