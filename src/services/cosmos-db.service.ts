import {
  CosmosClient,
  Container,
  Resource,
  FeedResponse,
  ErrorResponse,
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

export const constructFieldSelection = <T extends Base>(
  args?: FindManyArgs<T>['select'],
): string => {
  if (isNull(args) || isUndefined(args) || objectIsEmpty(args)) {
    return '*';
  }

  return Object.keys(args)
    ?.map((key) => `c.${key}`)
    ?.join(', ');
};

type CreateFilterArgs<TFilterKey extends keyof TFilter> = {
  field: string;
  filterKey: TFilterKey;
  mode: QueryMode;
  value: unknown;
};

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
      return `ENDSWITH(LOWER(c.${field}), LOWER('${value}'))`;
    }
    return `ENDSWITH(c.${field},'${value}')`;
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
      .join(',')})`;
  }

  if (filterKey === 'notIn') {
    return `c.${field} NOT IN (${(value as [])
      ?.map((v) => {
        if (isBoolean(v) || isNumber(v)) {
          return v;
        }
        return `'${v}'`;
      })
      .join(',')})`;
  }

  return '';
};

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

export type Base = object;

// Type to represent a Cosmos Resource
type CosmosResource<T extends Base> = Resource & T;

interface AutoFields {
  /** Automatically generate an ID on document creation - defaults to true */
  id?: boolean;
  /** Automatically generate createdAt and updatedAt fields on document create/updates - defaults to true */
  timestamp?: boolean;
}

export interface ModelOptions {
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
}

const initial = {};

const defaultFields: AutoFields = {
  id: true,
  timestamp: true,
};

/** Utility type to define where clause filters */
type Where<T extends Base> = {
  [K in keyof T]?: T[K] extends string
    ? StringFilter
    : T[K] extends number
      ? NumberFilter
      : T[K] extends boolean
        ? BooleanFilter
        : T[K] extends Date
          ? DateFilter
          : never;
};

type FindManyArgs<T extends Base> = {
  where?: Where<T>;
  take?: number;
  nextCursor?: string;
  select?: Partial<Record<keyof T, boolean>>;
  orderBy?: Partial<Record<keyof T, 'ASC' | 'DESC'>>;
};

type FindManyResponse<T extends Base> = {
  items: T[];
  nextCursor?: string;
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

  /** Find many resources with pagination and type-safe filters */
  public async findMany(args: FindManyArgs<T>): Promise<FindManyResponse<T>> {
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
          maxItemCount: take,
        })
        .fetchNext(),
      (e) => e as ErrorResponse,
    );
    if (result.isErr()) {
      const message = `Failed to retrieve items form db. ${result.error?.message}`;
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
