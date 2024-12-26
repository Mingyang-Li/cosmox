import { describe, expect, it } from 'vitest';
import {
  FindManyArgs,
  buildQueryFindMany,
  constructFieldSelection,
} from './cosmos-db.service';

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
      endsWith: 'hEEh',
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

it('pass', async () => {
  console.log(`query => ${query}`);
  expect(true).toEqual(true);
});

describe(constructFieldSelection.name, () => {
  it('should return "*" when select object is undefined', () => {
    const result = constructFieldSelection(undefined);
    expect(result).toBe('*');
  });

  it('should return "*" when select object is empty', () => {
    const result = constructFieldSelection({});
    expect(result).toBe('*');
  });

  it('should return correct fields when some fields are selected', () => {
    const select: FindManyArgs<User>['select'] = {
      firstName: true,
      lastName: true,
      age: false,
    };
    const result = constructFieldSelection(select);
    expect(result).toBe('c.firstName, c.lastName');
  });

  it('should return all fields when all fields are selected', () => {
    const select: FindManyArgs<User>['select'] = {
      firstName: true,
      lastName: true,
      age: true,
    };
    const result = constructFieldSelection(select);
    expect(result).toBe('c.firstName, c.lastName, c.age');
  });

  it('should return empty string when no fields are selected', () => {
    const select: FindManyArgs<{}>['select'] = {
      firstName: false,
      lastName: false,
      age: false,
    };
    const result = constructFieldSelection(select);
    expect(result).toBe('*');
  });
});
