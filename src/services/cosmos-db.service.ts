import {
  CosmosClient,
  Container,
  ItemDefinition,
  Resource,
  FeedResponse,
} from '@azure/cosmos';
import { isString } from '@/utils';
import {
  BooleanFilter,
  DateFilter,
  NumberFilter,
  StringFilter,
} from '@/types/filters';

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

/** BaseModel class for querying CosmosDB */
export class BaseModel<T extends Base = typeof initial> {
  client: Container;
  connectionStringSetting = 'COSMOS_CONNECTION_STRING';
  fields: AutoFields = { ...defaultFields };

  constructor(private options: ModelOptions) {
    if (options.connectionStringSetting) {
      this.connectionStringSetting = options.connectionStringSetting;
    }

    if (typeof this.options === 'boolean' && !this.options) {
      this.fields = { id: false, timestamp: false };
    }
    if (typeof this.options === 'object') {
      this.fields = {
        ...this.fields,
        ...(this.options.fields as AutoFields),
      };
    }

    this.client = options.client
      .database(options.database)
      .container(options.container);
  }

  /** Find many resources with pagination and type-safe filters */
  public async findMany(args: {
    where?: Where<T>; // Type-safe where clause
    paginationToken?: string;
    select?: Record<string, boolean>;
    orderBy?: Record<string, 'ASC' | 'DESC'>;
  }): Promise<CosmosResource<T>[]> {
    const { where, paginationToken, select, orderBy } = args;
    const containerClient: Container = this.client;

    // Start building the query
    let query = 'SELECT * FROM C';
    let parameters: { name: string; value: any }[] = [];

    // Handle 'where' filters with type-safety
    if (where) {
      const whereClauses: string[] = [];
      for (const [field, value] of Object.entries(where)) {
        // Ensure that the property exists in the model
        if (!(field in {})) {
          throw new Error(`Invalid field: ${field} in where clause`);
        }

        // Check for special operators like 'contains', 'gte', etc.
        if ((value as any).contains !== undefined) {
          whereClauses.push(`C.${field} LIKE @${field}_contains`);
          parameters.push({
            name: `@${field}_contains`,
            value: `%${(value as any).contains}%`,
          });
        } else if ((value as any).gte !== undefined) {
          whereClauses.push(`C.${field} >= @${field}_gte`);
          parameters.push({ name: `@${field}_gte`, value: (value as any).gte });
        } else if ((value as any).lte !== undefined) {
          whereClauses.push(`C.${field} <= @${field}_lte`);
          parameters.push({ name: `@${field}_lte`, value: (value as any).lte });
        } else if ((value as any).not !== undefined) {
          whereClauses.push(`C.${field} != @${field}_not`);
          parameters.push({ name: `@${field}_not`, value: (value as any).not });
        } else {
          whereClauses.push(`C.${field} = @${field}`);
          parameters.push({ name: `@${field}`, value });
        }
      }
      if (whereClauses.length > 0) {
        query += ' WHERE ' + whereClauses.join(' AND ');
      }
    }

    // Handle pagination with 'paginationToken'
    if (paginationToken) {
      query += ` OFFSET @paginationToken`;
      parameters.push({ name: '@paginationToken', value: paginationToken });
    }

    // Handle 'select' (fields to return)
    const selectFields = select
      ? Object.keys(select).filter((field) => select[field])
      : [];
    if (selectFields.length > 0) {
      query = query.replace('*', selectFields.join(', '));
    }

    // Handle 'orderBy' for sorting
    if (orderBy) {
      const orderClauses = Object.entries(orderBy).map(
        ([field, direction]) => `C.${field} ${direction}`,
      );
      query += ` ORDER BY ${orderClauses.join(', ')}`;
    }

    // Query the Cosmos container with pagination
    let result: FeedResponse<CosmosResource<T>> = await containerClient.items
      .query({
        query,
        parameters,
      })
      .fetchNext();

    const results: CosmosResource<T>[] =
      result.resources as CosmosResource<T>[];

    return results;
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
> & {
  client: CosmosClient;
};

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

  return {
    client,
    ...models,
  };
};

const orm = createClient({
  connectionStringSetting: 'COSMOS_CONNECTION_STRING',
  // Required, the name of the Cosmos database you want to create a client for
  database: 'my-db',
  // Optional, but kind of the whole point: create a map of containers -> models
  // (t) is a helper function to create a model for a container
  models: (t) => ({
    // The createModel function accepts a generic, so you can get typed methods + returned data
    user: t.createModel<{ name: string; email: string }>('User'),
    post: t.createModel<{ id: string }>('Post'),
    role: t.createModel('Role'),
  }),
});

orm.user.findMany({
  where: {
    name: {
      contains: 'haha',
    },
  },
});
