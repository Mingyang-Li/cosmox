import {
  CosmosClient,
  Container,
  Resource,
  FeedResponse,
  ErrorResponse,
  ItemResponse,
} from '@azure/cosmos';
import { z } from 'zod';
import { fromPromise } from 'neverthrow';
import {
  isArray,
  isBoolean,
  isEmptyArray,
  isNonEmptyString,
  isNull,
  isNumber,
  isObject,
  isUndefined,
  objectIsEmpty,
} from '@/utils';
import {
  BooleanFilter,
  DateFilter,
  NumberFilter,
  QueryMode,
  StringFilter,
} from '@/types/filters';

export type TFilter = StringFilter & NumberFilter & BooleanFilter & DateFilter;

export const IdSchema = z
  .string()
  .min(1)
  .refine(
    (value) => {
      const regex = /^\S+$/;
      return regex.test(value);
    },
    {
      message: `ID should not contain space characters, nor can it be an empty string.`,
    },
  );

/**
 * Determines which columns to retrieve from CosmosDB
 */
export const constructFieldSelection = <T extends Base>(
  args?: FindManyArgs<T>['select'],
): string => {
  if (isNull(args) || isUndefined(args) || objectIsEmpty(args)) {
    return '*';
  }

  const fieldsSelected = Object.keys(args)?.filter(
    (key) => args[key as keyof FindManyArgs<T>['select']] === true,
  );
  if (isEmptyArray(fieldsSelected)) {
    return '*';
  }

  return fieldsSelected?.map((key) => `c.${key}`)?.join(', ');
};

type CreateFilterArgs<TFilterKey extends keyof TFilter> = {
  field: string;
  filterKey: TFilterKey;
  mode: QueryMode;
  value: unknown;
};

/**
 * Given a condition, determines the SQL filtering query
 */
export const createFilter = <TFilterKey extends keyof TFilter>(
  args: CreateFilterArgs<TFilterKey>,
): string => {
  const { field, filterKey, value, mode } = args;

  if (isNull(args) || isUndefined(args) || objectIsEmpty(args)) {
    return '';
  }

  if (filterKey === 'contains') {
    if (mode === 'INSENSITIVE') {
      return `CONTAINS(LOWER(c.${field}), LOWER('${value}'))`;
    }
    return `CONTAINS(c.${field}, '${value}')`;
  }

  if (filterKey === 'startsWith') {
    if (mode === 'INSENSITIVE') {
      return `STARTSWITH(LOWER(c.${field}), LOWER('${value}'))`;
    }
    return `STARTSWITH(c.${field}, '${value}')`;
  }

  if (filterKey === 'endsWith') {
    if (mode === 'INSENSITIVE') {
      return `LOWER(c.${field}) LIKE '%LOWER('${value}')'`;
    }
    return `c.${field} LIKE '%${value}'`;
  }

  if (filterKey === 'equals') {
    if (isBoolean(value) || isNumber(value)) {
      return `c.${field} = ${value}`;
    }
    return `c.${field} = '${value}'`;
  }

  if (filterKey === 'not') {
    if (isBoolean(value) || isNumber(value)) {
      return `c.${field} != ${value}`;
    }
    return `c.${field} != '${value}'`;
  }

  if (filterKey === 'gt') {
    if (isBoolean(value) || isNumber(value)) {
      return `c.${field} > ${value}`;
    }
    return `c.${field} > '${value}'`;
  }

  if (filterKey === 'gte') {
    if (isBoolean(value) || isNumber(value)) {
      return `c.${field} >= ${value}`;
    }
    return `c.${field} >= '${value}'`;
  }

  if (filterKey === 'lt') {
    if (isBoolean(value) || isNumber(value)) {
      return `c.${field} < ${value}`;
    }
    return `c.${field} < '${value}'`;
  }

  if (filterKey === 'lte') {
    if (isBoolean(value) || isNumber(value)) {
      return `c.${field} <= ${value}`;
    }
    return `c.${field} <= '${value}'`;
  }

  if (filterKey === 'in') {
    return `c.${field} IN (${(value as [])
      ?.map((v) => {
        if (isBoolean(v) || isNumber(v)) {
          return v;
        }
        return `'${v}'`;
      })
      .join(', ')})`;
  }

  if (filterKey === 'notIn') {
    return `c.${field} NOT IN (${(value as [])
      ?.map((v) => {
        if (isBoolean(v) || isNumber(v)) {
          return v;
        }
        return `'${v}'`;
      })
      .join(', ')})`;
  }

  return '';
};

/**
 * Constructs the "where" clause section of CosmosDB SQL query
 */
export const buildWhereClause = <T extends Base>(
  args: FindManyArgs<T>['where'],
): string => {
  if (isNull(args) || isUndefined(args) || objectIsEmpty(args)) {
    return '';
  }

  const conditions: Array<string> = Object.entries(args)
    ?.map(([field, filters]): Array<string> => {
      const _filters: Pick<TFilter, 'mode'> = filters as Pick<TFilter, 'mode'>;
      const mode: QueryMode = _filters?.mode ? _filters?.mode : 'SENSITIVE';

      const filterQueriesForCurrentField = Object.entries(
        filters as TFilter,
      )?.map(([filterKey, value]): string => {
        const _filterKey = filterKey as keyof TFilter;
        const filterCondition = createFilter({
          field,
          filterKey: _filterKey,
          mode,
          value,
        });
        return filterCondition;
      });
      return filterQueriesForCurrentField;
    })
    ?.flatMap((item) => item)
    ?.filter((item) => isNonEmptyString(item));

  if (isEmptyArray(conditions)) {
    return '';
  }

  const clauses = ['WHERE', conditions.join(' AND ')];
  const query = clauses?.join(' ');
  return query;
};

export const constructOrderByClause = <T extends Base>(
  args?: FindManyArgs<T>['orderBy'],
): string => {
  if (isNull(args) || isUndefined(args) || objectIsEmpty(args)) {
    return '';
  }

  return `ORDER BY ${Object.entries(args)
    .map(([field, direction]) => `c.${field} ${direction}`)
    .join(', ')}`;
};

export const buildQueryFindMany = <T extends Base>(dto: FindManyArgs<T>) => {
  const { where, select, orderBy } = dto;

  const fieldsSelected = constructFieldSelection(select);

  const whereClause = buildWhereClause(where);

  const orderByClause = constructOrderByClause(orderBy);

  const clauses = [
    'SELECT',
    fieldsSelected,
    'FROM c',
    whereClause,
    orderByClause,
  ]?.filter((clause) => isNonEmptyString(clause));

  const query = clauses?.join(' ');
  return query;
};

export const buildQueryFindOne = <T extends Base>(dto: FindOneArgs<T>) => {
  const { where, select } = dto;

  const fieldsSelected = constructFieldSelection(select);

  const { id } = where;
  const whereClause = `WHERE c.id = '${id}'`;

  const clauses = ['SELECT', fieldsSelected, 'FROM c', whereClause]?.filter(
    (clause) => isNonEmptyString(clause),
  );

  const query = clauses?.join(' ');
  return query;
};

export type Base = object;

// Type to represent a Cosmos Resource
type CosmosResource<T extends Base> = Resource & T;

interface AutoFields {
  /** Automatically generate an ID on document creation - defaults to true */
  id?: boolean;
  /** Automatically generate createdAt and updatedAt fields on document create/updates - defaults to true */
  timestamp?: boolean;
}

export type ModelOptions = {
  /** The name of the Cosmos database */
  database: string;
  /** The name of the Cosmos container within the database */
  container: string;
  /** The instantiated Cosmos client */
  client: CosmosClient;
  /** The name of the env of the Cosmos connection string - defaults to `COSMOS_CONNECTION_STRING` */
  connectionStringSetting?: string;
  /** Automatic fields creation - defaults to true */
  fields?: AutoFields | boolean;
};

const initial = {};

const defaultFields: AutoFields = {
  id: true,
  timestamp: true,
};

/** Utility type to define where clause filters */
export type Where<T extends Base> = {
  [K in keyof T]?: T[K] extends string | undefined
    ? StringFilter
    : T[K] extends number | undefined
      ? NumberFilter
      : T[K] extends boolean | undefined
        ? BooleanFilter
        : T[K] extends Date | undefined
          ? DateFilter
          : never;
};

export type FindManyArgs<T extends Base> = {
  where?: Where<T>;
  take?: number;
  nextCursor?: string;
  select?: Partial<Record<keyof T, boolean>>;
  orderBy?: Partial<Record<keyof T, 'ASC' | 'DESC'>>;
};

export type FindManyResponse<T extends Base> = {
  items: T[];
  nextCursor?: string;
};

export type FindOneArgs<T extends Base> = {
  where: { id: string };
  select?: Partial<Record<keyof T, boolean>>;
};

export type CreateArgs<T extends Base> = {
  data: T;
};

export type UpdateArgs<T extends Base> = {
  where: { id: string };
  data: T;
};

/** BaseModel class for querying CosmosDB */
export class BaseModel<T extends Base = typeof initial> {
  client: Container;
  connectionStringSetting = 'COSMOS_CONNECTION_STRING';
  fields: AutoFields = { ...defaultFields };

  constructor(private readonly options: ModelOptions) {
    if (options.connectionStringSetting) {
      this.connectionStringSetting = options.connectionStringSetting;
    }

    this.client = options.client
      .database(options.database)
      .container(options.container);
  }

  /** Find many items with pagination and type-safe filters */
  public async findMany(
    args: FindManyArgs<Required<T>>,
  ): Promise<FindManyResponse<T>> {
    const { take, nextCursor } = args;

    // validate "take" if provided by user
    if (!isNull(take) && !isUndefined(take)) {
      if (z.number().int().min(1).safeParse(take).success === false) {
        throw new Error(
          `Please make sure "take" is a positive integer. You provided ${take} `,
        );
      }
    }

    const container: Container = this.client;

    const query = buildQueryFindMany(args);

    const result = await fromPromise<
      FeedResponse<CosmosResource<T>>,
      ErrorResponse
    >(
      container.items
        .query(query, {
          continuationToken: nextCursor,
          maxItemCount: take ?? 100,
        })
        .fetchNext(),
      (e) => e as ErrorResponse,
    );
    if (result.isErr()) {
      const message = `Failed to retrieve items from db. ${result.error?.message}`;
      throw new Error(message);
    }

    const { resources, continuationToken } = result.value;
    if (isArray<T>(resources) === false) {
      const message = `Retrieved data from db, but received ${typeof resources} instead of a list of items`;
      throw new Error(message);
    }

    const response: FindManyResponse<T> = {
      items: resources as unknown as T[],
      nextCursor: continuationToken,
    };

    return response;
  }

  /**
   * Find item by ID
   */
  public async findOne<T extends Base>(args: FindOneArgs<T>): Promise<T> {
    const { where } = args;

    const validateId = IdSchema.safeParse(where?.id);
    if (validateId.success === false) {
      throw new Error(validateId?.error?.message);
    }

    // use query builder instead of sdk to maximise for performance
    const query = buildQueryFindOne(args);

    const container: Container = this.client;

    const result = await fromPromise<
      FeedResponse<CosmosResource<T>>,
      ErrorResponse
    >(
      container.items
        .query(query, {
          maxItemCount: 1,
        })
        .fetchAll(),
      (e) => e as ErrorResponse,
    );
    if (result.isErr()) {
      const message = `Failed to retrieve item form db. ${result.error?.message}`;
      throw new Error(message);
    }

    const { resources } = result.value;
    if (isArray<T>(resources) === false) {
      const message = `Retrieved data from db, but received ${typeof resources} instead of a list of items`;
      throw new Error(message);
    }

    if (isEmptyArray(resources)) {
      const message = `We cannot find anything using the ID you provided`;
      throw new Error(message);
    }

    const response: T = resources[0] as T;

    return response;
  }

  /**
   * Create an item
   */
  public async create<T extends Base>(args: CreateArgs<T>): Promise<T> {
    const { data } = args;

    if (!isObject(data)) {
      throw new Error(
        `Please provide an object as payload. You provided "${data}"`,
      );
    }

    if (objectIsEmpty(data)) {
      throw new Error(
        `Please provide an non-empty object as payload. You provided "{}"`,
      );
    }

    const container: Container = this.client;

    const result = await fromPromise<ItemResponse<T>, ErrorResponse>(
      container.items.create(data),
      (e) => e as ErrorResponse,
    );

    if (result.isErr()) {
      const message = `Failed to create item in db. ${result.error?.message}`;
      throw new Error(message);
    }

    const { resource } = result.value;
    return resource as T;
  }

  /**
   * Update an item
   */
  public async update<T extends Base>(args: UpdateArgs<T>): Promise<T> {
    const { where, data } = args;
    const { id } = where;

    const validateId = IdSchema.safeParse(id);
    if (validateId.success === false) {
      throw new Error(validateId?.error?.message);
    }

    if (!isObject(data)) {
      throw new Error(
        `Please provide an object as payload. You provided "${data}"`,
      );
    }

    if (objectIsEmpty(data)) {
      throw new Error(
        `Please provide an non-empty object as payload. You provided "{}"`,
      );
    }

    // check if item in db
    const checkItemInDb = await fromPromise(
      this.findOne<{ id: string }>({
        where,
        select: { id: true },
      }),
      (e) => e as Error,
    );
    if (checkItemInDb.isErr()) {
      throw new Error(
        `Failed to update item in db. The item you're trying to update cannot be found.`,
      );
    }

    // replace item
    const existingItem = checkItemInDb.value;
    const container: Container = this.client;
    const replaceItem = await fromPromise<ItemResponse<T>, ErrorResponse>(
      container.item(id, id).replace({
        ...existingItem,
        ...data,
      }),
      (e) => e as ErrorResponse,
    );

    if (replaceItem.isErr()) {
      const message = `Failed to update item. ${replaceItem.error?.message}`;
      throw new Error(message);
    }
    return replaceItem.value?.resource as T;
  }

  /**
   * @warning Permanently delete an item
   */
  public async delete(args: Pick<FindOneArgs<T>, 'where'>): Promise<void> {
    const { where } = args;
    const { id } = where;

    const validateId = IdSchema.safeParse(id);
    if (validateId.success === false) {
      throw new Error(validateId?.error?.message);
    }

    // check if item in db
    const checkItemInDb = await fromPromise(
      this.findOne<FindOneArgs<T>['where']>({
        where,
        select: { id: true },
      }),
      (e) => e as Error,
    );
    if (checkItemInDb.isErr()) {
      throw new Error(
        `Failed to delete item in db. The item you're trying to delete cannot be found.`,
      );
    }

    // delete item
    const container: Container = this.client;
    const deleteItem = await fromPromise(
      container.item(id, id).delete(),
      (e) => e as ErrorResponse,
    );

    if (deleteItem.isErr()) {
      const message = `Failed to delete item. ${deleteItem.error?.message}`;
      throw new Error(message);
    }

    return undefined;
  }
}

interface Builder {
  createModel: <T extends Base>(args: {
    container: string;
    options?: Pick<ModelOptions, 'fields'>;
  }) => BaseModel<T>;
}

/** Default client configuration - for example the connection string setting, and the database name. */
export interface Options<M extends { [K: string]: BaseModel }> {
  /** The name of the Cosmos database */
  database: string;

  /**
   * The Cosmos connection string
   */
  connectionString?: string;
  /** A list of the models to create, and their container names. */
  models: (builder: Builder) => M;
}

export type DB<M extends Record<string, BaseModel>> = ReturnType<
  Options<M>['models']
>;

export const createClient = <M extends Record<string, BaseModel>>(
  options: Options<M>,
): DB<M> => {
  const client = new CosmosClient(options?.connectionString ?? '');

  const builder: Builder = {
    createModel: (args: { container: string }) => {
      const { container } = args;
      return new BaseModel({ client, container, ...options });
    },
  };

  const models = options.models(builder);

  return models;
};
