import { expect, test } from 'vitest';
import { buildQueryFindMany } from './cosmos-db.service';

type User = {
  firstName: string;
  lastName: string;
  age: number;
  createdAt: Date;
  isSuperAdmin: boolean;
};

const query = buildQueryFindMany<User>({
  where: {
    isSuperAdmin: {
      not: true,
    },
    firstName: {
      startsWith: 'haha',
      endsWith: 'hehe',
      mode: 'INSENSITIVE',
    },
    lastName: {
      equals: 'hehe',
    },
    age: {
      lte: 10,
      notIn: [1, 2, 3],
    },
  },
  select: {
    firstName: true,
    lastName: true,
  },
  orderBy: {
    lastName: 'ASC',
    firstName: 'DESC',
  },
});

test('pass', () => {
  console.log(`query => ${query}`);
  expect(true).toEqual(true);
});
