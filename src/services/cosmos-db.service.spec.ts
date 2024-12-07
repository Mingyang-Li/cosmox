import { expect, test } from 'vitest';
import { buildQueryFindMany } from './cosmos-db.service';

type User = {
  firstName: string;
  lastName: string;
  createdAt: Date;
  isSuperAdmin: boolean;
};

const query = buildQueryFindMany<User>({
  where: {
    isSuperAdmin: {
      equals: true,
    },
    createdAt: {},
    firstName: {
      contains: 'haha',
      mode: 'INSENSITIVE',
    },
    lastName: {
      equals: 'hehe',
    },
  },
  select: {
    firstName: true,
    lastName: false,
  },
  orderBy: {
    lastName: 'ASC',
  },
});

test('pass', () => {
  console.log(`query => ${query}`);
  expect(true).toEqual(true);
});
