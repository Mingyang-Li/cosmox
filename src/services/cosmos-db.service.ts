import {
  CosmosClient,
  Container,
  ItemDefinition,
  Resource,
  FeedResponse,
} from '@azure/cosmos';
import {
  isEmptyArray,
  isNonEmptyString,
  isNull,
  isString,
  isUndefined,
  objectIsEmpty,
} from '@/utils';
import {
  BooleanFilter,
  DateFilter,
  NumberFilter,
  StringFilter,
  isBooleanFilter,
  isDateFilter,
  isNumberFilter,
  isStringFilter,
} from '@/types/filters';

export type TFilter = StringFilter & NumberFilter & BooleanFilter & DateFilter;

export type FilterKey =
  | keyof StringFilter
  | keyof NumberFilter
  | keyof BooleanFilter
  | keyof DateFilter;

export type FilterCondition = {
  field: string;
  filter: FilterKey;
  value: unknown;
};

export const createBooleanFilter = (condition: FilterCondition): string => {
  if (condition.filter === 'equals') {
    return `c.${condition.field} = ${condition.value}`;
  }
  if (condition.filter === 'not') {
    return `c.${condition.field} != ${condition.value}`;
  }
  return '';
};

export const createStringFilter = (condition: FilterCondition): string => {
  if (condition.filter === 'equals') {
    return `c.${condition.field} = '${condition.value}'`;
  }
  if (condition.filter === 'startsWith') {
    return `STARTSWITH(c.${condition.field}, '${condition.value}')`;
  }
  if (condition.filter === 'endsWith') {
    return `c.${condition.field} LIKE '%${condition.value}'`;
  }
  if (condition.filter === 'not') {
    return `c.${condition.field} != '${condition.value}'`;
  }
  if (condition.filter === 'gt') {
    return `c.${condition.field} > '${condition.value}'`;
  }
  if (condition.filter === 'gte') {
    return `c.${condition.field} >= '${condition.value}'`;
  }
  if (condition.filter === 'lt') {
    return `c.${condition.field} < '${condition.value}'`;
  }
  if (condition.filter === 'lte') {
    return `c.${condition.field} <= '${condition.value}'`;
  }
  if (condition.filter === 'in') {
    if (Array.isArray(condition.value)) {
      return `c.${condition.field} IN (${condition.value
        .map((v) => `'${v}'`)
        .join(',')})`;
    }
  }
  if (condition.filter === 'notIn') {
    if (Array.isArray(condition.value)) {
      return `c.${condition.field} NOT IN (${condition.value
        .map((v) => `'${v}'`)
        .join(',')})`;
    }
  }
  if (condition.filter === 'contains') {
    return `CONTAINS(c.${condition.field}, '${condition.value}')`;
  }
  return '';
};

export const createNumberFilter = (condition: FilterCondition): string => {
  if (condition.filter === 'equals') {
    return `c.${condition.field} = ${condition.value}${condition.value}`;
  }
  if (condition.filter === 'not') {
    return `c.${condition.field} != ${condition.value}`;
  }
  if (condition.filter === 'gt') {
    return `c.${condition.field} > ${condition.value}`;
  }
  if (condition.filter === 'gte') {
    return `c.${condition.field} >= ${condition.value}`;
  }
  if (condition.filter === 'lt') {
    return `c.${condition.field} < ${condition.value}`;
  }
  if (condition.filter === 'lte') {
    return `c.${condition.field} <= ${condition.value}`;
  }
  return '';
};

export const createDateFilter = (condition: FilterCondition): string => {
  if (condition.filter === 'equals') {
    return `c.${condition.field} = '${condition.value}'`;
  }
  if (condition.filter === 'not') {
    return `c.${condition.field} != '${condition.value}'`;
  }
  if (condition.filter === 'gt') {
    return `c.${condition.field} > '${condition.value}'`;
  }
  if (condition.filter === 'gte') {
    return `c.${condition.field} >= '${condition.value}'`;
  }
  if (condition.filter === 'lt') {
    return `c.${condition.field} < '${condition.value}'`;
  }
  if (condition.filter === 'lte') {
    return `c.${condition.field} <= '${condition.value}'`;
  }
  return '';
};

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

export type CreateFilterArgs<T extends TFilter> = {
  field: string;
  filter: T;
};
export const createFilter = <T extends TFilter>(
  args: CreateFilterArgs<T>,
): string => {
  const { field, filter } = args;

  if (isStringFilter(filter)) {
    console.log(`STRING-FILTER`);
    // return createStringFilter({})
  }
  if (isNumberFilter(filter)) {
    console.log(`NUMBER-FILTER`);
  }
  if (isBooleanFilter(filter)) {
    console.log(`BOOLEAN-FILTER`);
  }
  if (isDateFilter(filter)) {
    console.log(`DATE-FILTER`);
  }

  console.log(
    `field => ${field} (data-type: __) | filter => ${JSON.stringify(filter)} (filter-type: ${typeof filter})`,
  );

  // if (filter?.contains) {
  //   return `CONTAINS(c.${field}, '${filter.contains}')`;
  // }
  // if (filter?.startsWith) {
  //   return `STARTSWITH(c.${field}, '${filter.startsWith}')`;
  // }
  // if (filter?.endsWith) {
  //   return `ENDS WITH(c.${field}, '${filter.endsWith}')`;
  // }
  // if (filter?.equals) {
  //   return `c.${field} = '${filter.equals}'`;
  // }
  // if (filter?.not) {
  //   return `c.${field} != '${filter.not}'`;
  // }
  // if (filter?.gt) {
  //   return `c.${field} > ${filter.gt}`;
  // }
  // if (filter?.gte) {
  //   return `c.${field} >= ${filter.gte}`;
  // }
  // if (filter?.lt) {
  //   return `c.${field} < ${filter.lt}`;
  // }
  // if (filter?.lte) {
  //   return `c.${field} <= ${filter.lte}`;
  // }
  // if (filter?.in) {
  //   return `c.${field} IN (${filter?.in?.map((v) => `'${v}'`).join(',')})`;
  // }
  // if (filter?.notIn) {
  //   return `c.${field} NOT IN (${filter?.notIn?.map((v) => `'${v}'`).join(',')})`;
  // }

  return '';
};

export const buildWhereClause = <T extends Base>(
  args: FindManyArgs<T>['where'],
): string => {
  if (isNull(args) || isUndefined(args) || objectIsEmpty(args)) {
    return '';
  }

  const conditions: Array<string> = Object.entries(args)
    ?.map(([field, filter]): string => {
      const _filter = filter as TFilter;
      const filterCondition = createFilter({ field, filter: _filter });
      return filterCondition ? filterCondition : '';
    })
    ?.filter((condition) => isNonEmptyString(condition));

  const clauses = ['WHERE', conditions.join(' AND ')];

  const query = isEmptyArray(conditions) ? '' : clauses?.join(' ');
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
    'FROM C',
    whereClause,
    orderByClause,
  ]?.filter((clause) => isNonEmptyString(clause));

  const query = clauses?.join(' ');

  return query;
};

export type Base = object;

// Type to represent a Cosmos Resource
type CosmosResource<T extends Base> = Resource & T;
type CosmosItemDefinition<T extends Base> = ItemDefinition & T;

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

  constructor(private options: ModelOptions) {
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
    const containerClient: Container = this.client;

    const query = buildQueryFindMany(args);

    const itemsRetrieved: FeedResponse<CosmosResource<T>> =
      await containerClient.items
        .query(query, {
          continuationToken: nextCursor,
          maxItemCount: take,
        })
        .fetchNext();

    const result: FindManyResponse<T> = {
      items: itemsRetrieved?.resources as unknown as T[],
      nextCursor: itemsRetrieved?.continuationToken,
    };

    return result;
  }
}

interface Builder {
  createModel: <T extends Base>(
    container: string,
    options?: Pick<ModelOptions, 'fields'>,
  ) => BaseModel<T>;
}

/** Default client configuration - for example the connection string setting, and the database name. */
export interface Options<M extends { [K: string]: BaseModel }> {
  /** The name of the Cosmos database */
  database: string;
  /**
   * The name of the env of the Cosmos connection string - defaults to `COSMOS_CONNECTION_STRING`.
   * This can be replaced by directly passing in the connection string with the `connectionString` option,
   * but if you are using the binding shortcuts then this setting is required as it is used in the Azure Function bindings.
   */
  connectionStringSetting?: string;
  /**
   * The Cosmos connection string - overrides using the `connectionStringSetting` env.
   *
   * Preferably use the `connectionStringSetting` with the connection string as an environment variable if you are using
   * this within an Azure Functions app.
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
  const connectionStringSetting =
    options.connectionStringSetting || 'COSMOS_CONNECTION_STRING';
  const connectionString =
    options.connectionString ?? process.env[connectionStringSetting];

  if (!isString(connectionString)) {
    if (options.connectionString)
      throw new Error(
        'Missing connection string value (from `options.connectionString`)',
      );
    throw new Error(`Missing connection string for ${connectionStringSetting}`);
  }

  const client = new CosmosClient(connectionString);

  const builder: Builder = {
    createModel: (container) =>
      new BaseModel({ client, container, ...options }),
  };

  const models = options.models(builder);

  return models;
};

// const orm = createClient({
//   connectionStringSetting: 'COSMOS_CONNECTION_STRING',
//   // Required, the name of the Cosmos database you want to create a client for
//   database: 'my-db',
//   // Optional, but kind of the whole point: create a map of containers -> models
//   // (t) is a helper function to create a model for a container
//   models: (t) => ({
//     // The createModel function accepts a generic, so you can get typed methods + returned data
//     user: t.createModel<{ name: string; email: string }>('User'),
//     post: t.createModel<{ id: string }>('Post'),
//     role: t.createModel('Role'),
//   }),
// });

// orm.user.findMany({
//   where: {
//     name: {
//       contains: 'haha',
//       equals: 'hehe',
//     },
//   },
// });
