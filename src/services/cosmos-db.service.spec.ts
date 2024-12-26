import { describe, expect, it } from 'vitest';
import {
  FindManyArgs,
  Where,
  buildWhereClause,
  constructFieldSelection,
  constructOrderByClause,
} from './cosmos-db.service';

type User = {
  firstName: string;
  lastName: string;
  age: number;
  createdAt: Date;
  isSuperAdmin: boolean;
};

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

describe(buildWhereClause.name, () => {
  it('should return an empty string when where clause is undefined', () => {
    const result = buildWhereClause<User>(undefined);
    expect(result).toBe('');
  });

  it('should return an empty string when where clause is empty', () => {
    const result = buildWhereClause<User>({});
    expect(result).toBe('');
  });

  it('should construct a complex where clause with mixed conditions', () => {
    const where: Where<User> = {
      firstName: { startsWith: 'haha', endsWith: 'hEEh', mode: 'INSENSITIVE' },
      lastName: { equals: 'hehe' },
      age: { lte: 10, notIn: [1, 2, 3] },
      isSuperAdmin: { not: true },
    };

    const result = buildWhereClause(where);
    expect(result).toBe(
      "WHERE STARTSWITH(LOWER(c.firstName), LOWER('haha')) AND LOWER(c.firstName) LIKE '%LOWER('hEEh')' AND c.lastName = 'hehe' AND c.age <= 10 AND c.age NOT IN (1, 2, 3) AND c.isSuperAdmin != true",
    );
  });

  it('should handle case-sensitive and case-insensitive conditions', () => {
    const where: Where<User> = {
      firstName: { startsWith: 'A', mode: 'SENSITIVE' },
      lastName: { endsWith: 'z', mode: 'INSENSITIVE' },
    };

    const result = buildWhereClause(where);
    expect(result).toBe(
      "WHERE STARTSWITH(c.firstName, 'A') AND LOWER(c.lastName) LIKE '%LOWER('z')'",
    );
  });

  it('should handle "in" and "notIn" conditions', () => {
    const where: Where<User> = {
      age: { in: [25, 30, 35] },
      firstName: { notIn: ['Alice', 'Bob'] },
    };

    const result = buildWhereClause(where);
    expect(result).toBe(
      "WHERE c.age IN (25, 30, 35) AND c.firstName NOT IN ('Alice', 'Bob')",
    );
  });
});

describe(constructOrderByClause.name, () => {
  it('should return an empty string when orderBy is undefined', () => {
    const result = constructOrderByClause<User>(undefined);
    expect(result).toBe('');
  });

  it('should return an empty string when orderBy is empty', () => {
    const result = constructOrderByClause<User>({});
    expect(result).toBe('');
  });

  it('should construct an ORDER BY clause for a single field', () => {
    const orderBy: FindManyArgs<User>['orderBy'] = {
      age: 'ASC',
    };

    const result = constructOrderByClause(orderBy);
    expect(result).toBe('ORDER BY c.age ASC');
  });

  it('should construct an ORDER BY clause for multiple fields', () => {
    const orderBy: FindManyArgs<User>['orderBy'] = {
      lastName: 'DESC',
      firstName: 'ASC',
    };

    const result = constructOrderByClause(orderBy);
    expect(result).toBe('ORDER BY c.lastName DESC, c.firstName ASC');
  });

  it('should handle mixed case directions', () => {
    const orderBy: FindManyArgs<User>['orderBy'] = {
      createdAt: 'DESC',
      isSuperAdmin: 'ASC',
    };

    const result = constructOrderByClause(orderBy);
    expect(result).toBe('ORDER BY c.createdAt DESC, c.isSuperAdmin ASC');
  });
});
