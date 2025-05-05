<p align="center">
  <img src="docs/logo.png" />
</p>

<div align="center">
  <h1>Cosmox</h1>
  <a href="#"><img src="https://img.shields.io/npm/v/cosmox.svg?style=flat" /></a>
  <a href="#"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT%202-blue" /></a>
  <br />
  <br />
</div>

> Cosmox is the missing ORM layer for CosmosDB — Type-safe, developer-friendly, designed to simplify data access and boost performance for TypeScript developers.

Have you been searching for a **Prisma-style ORM for CosmosDB**?

Are you still writing raw SQL for querying your CosmosDB?

Are you still writing hard-coded API endpoints to apply filtering on your data?

Are you still wrestling in a world without a proper, type-safe ORM for CosmosDB in Node.js?

If you answered "yes" to any of the questions above, you've come to the right place!

Cosmox is built for developers building data-driven applications on Azure CosmosDB NoSQL, offering a modern, type-safe abstraction over the `@azure/cosmos` SDK — without sacrificing performance.

If you're tired of writing raw SQL queries with complex filters or managing inconsistent JSON responses, Cosmox is your new best friend.

> Cosmox is not a replacement for @azure/cosmos — It's a lightweight abstraction built to make CosmosDB more accessible and type-safe for TypeScript developers.

<p align="center">
  <img src="docs/demo.gif" />
  The code above gives you query auto-completion based on the data model you specified for each container in Azure CosmosDB
</p>

## 🤔 Use cases:

- Data analytics dashboards
- E-commerce applications
- IoT telemetry processing
- Multi-tenant SaaS applications
- Internal admin panels

## 🧠 Let's compare `cosmox` with `@azure/cosmos`

| Features                       | `cosmox`                        | `@azure/cosmos`                   |
| ------------------------------ | ------------------------------- | --------------------------------- |
| CRUD                           | ✅ Simplified, Type-safe API    | ✅ Flexible, low-level API        |
| Type-safe filtering queries    | ✅ Built-in, inspired by Prisma | SQL-based filtering               |
| Type-safe field selection      | ✅ Automatic inference          | Custom SQL required               |
| SQL query builder              | ✅ Built-in and type-checked    | Manual SQL writing                |
| Optimized SQL query generation | ✅ Automatic & performant       | Developer-defined SQL             |
| Pagination                     | ✅ Built-in by default          | Custom logic needed               |
| Input-validations              | ✅ Automatic input validation   | Limited built-in validation       |
| Developer experience           | ✅ Prisma-like, fluent API      | Low-level, more flexible          |
| Error messages                 | ✅ Actionable, contextual       | Partial error messages            |
| Bbundle size                   | ✅ Small and focused            | Larger due to broader feature set |

## 🚶‍♂️ How to get started?

Install this package

```shell
npm install cosmox
yarn install cosmox
pnpm install cosmox
```

Define pure TypeScript as models for your containers

```ts
type User = {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  createdAt: Date;
  isSuperAdmin: boolean;
};

type Post = {
  id: string;
  title: string;
  content: string;
  createdBy: string; // foreign key - User.id
};
```

Instantiate the client

```ts
import { createClient } from 'cosmox';

// Example 1 - Using connection string
const orm = createClient({
  database: '<DATABASE_ID>',
  connectionString: '<DB_CONNECTION_STRING>',
  models: (t) => ({
    // infer your types as the models for your containers during initialization
    user: t.createModel<User>({ container: '<USER_CONTAINER_ID>' }),
    post: t.createModel<Post>({ container: '<POST_CONTAINER_ID>' }),
  }),
});

// Example 2 - Using CosmosDB client options
const orm = createClient({
  database: '<DATABASE_ID>',
  // same type-definition as "CosmosClientOptions" from "@azure/cosmos"
  cosmosClientOptions: {
    endpoint: '<EXAMPLE_ENDPOINT>',
  },
  models: (t) => ({
    user: t.createModel<User>({ container: '<USER_CONTAINER_ID>' }),
    post: t.createModel<Post>({ container: '<POST_CONTAINER_ID>' }),
  }),
});
```

✨ Done! You can now start to query CosmosDB using the ORM.

# 📚 Examples:

## The "flagship" feature - `findMany()` method

With `async findMany()`, you can query your CosmosDB using almost the same syntax as you'd do in if you were using Prisma. Here's some examples in action:

```typescript
// Making queries with simple filters

const result = await orm.user.findMany({
  where: { firstName: { contains: 'Sam' } },
});

const result = await orm.user.findMany({
  where: { age: { gte: 18 } },
});

const result = await orm.user.findMany({
  where: { createdAt: { gte: new Date('2024-01-01') } },
});

const result = await orm.post.findMany({
  where: { createdBy: { equals: '<SOME_USER_ID>' } },
});
```

Make a query without any filters

```typescript
// This will return maximum of 100 items by default
const result = await orm.user.findMany({});
```

Or, make a query by applying some complex filters, field-selections, and pagination logic:

```typescript
const result = await orm.user.findMany({
  where: {
    firstName: {
      startsWith: 'Sa',
      endsWith: 'lyn',
      mode: 'INSENSITIVE',
    },
    age: {
      lte: 20,
      gte: 10,
      not: 15,
    },
    isSuperAdmin: {
      not: true,
    },
    createdAt: {
      lte: new Date('2024-12-31'),
      gte: new Date('2024-12-01'),
      not: new Date('2024-12-15'),
    },
  },
  orderBy: {
    firstName: 'ASC',
  },
  take: 10,
  select: {
    id: true,
    firstName: true,
    age: true,
  },
  nextCursor: '<PAGINATION_TOKEN>',
});
```

## ⚠️ IMPORTANT: Error-handling for `findMany()`

As of version `1.0.4`, you will have to start to explicitly handle errors for`findMany()` before accessing returned values.

The key consideration for this design approach is that we need to be able to return quite a few metadata for each `findMany()` request for obvervability purposes. Throwing errors does not make it easy to expose observability info, as these information will be convoluted alongside stack traces.

> Why do we choose not to log SQL queries during execution?

We want to keep this ORM as light-weight as possible, and this means keeping it "state-less" and not keeping any data to itself.

Considering this ORM would be used in different Node.js environments / frameworks, and every team / company has its own logging approach, we thought it's best to leave it to the developers to decide where, when and how to log these SQL queries, but we'll provide you with the "what" (to log).

We will simply provide you with the raw SQL generated by this ORM, it's up to you to decide what to do with that information.

```ts
const result = await orm.user.findMany({ ... });

const logger = new YOUR_CUSTOM_LOGGER();

// explicitly check for errors
if (result.isErr()) {
  logger.error(result.error); // result.error will be of type "Metadata"

  // now you can print out the error metadata one-by-one to see what's wrong
  logger.debug(`What's the SQL query generated (if any)? ${result.error.queryExecuted}`);

  logger.debug(`Did it made query to the actual DB? ${result.error.isQueryExecuted}`);

  logger.debug(`Was it a paginated query? ${result.error.isPaginatedQuery}`);

  logger.debug(`What was the exact error message? ${result.error.message}`);

  logger.debug(`How many items was it trying to retrieve? ${result.error.countItemsToRetrieve}`);

  logger.debug(`What was the request charge? ${result.error.requestCharge}`);

  logger.debug(`How long did it take to execute? ${result.error.duration}`);
}

// only after you checked for errors, you are allowed to access the returned data
result.value.data.forEach((item) => { ... })

// You can also check for metadata of successful queries
logger.info(`Query successful. Metadata: ${JSON.stringify(result.value._metadata)}`)
```

In some situations where you don't want to check for errors, you can access the return value directly by doing this:

```ts
const result = await orm.user.findMany({ ... });

result._unsafeUnwrap().data.forEach((item) => { ... })
```

As you've probably noticed, we have a couple of new methods: `.isErr()` and `._unsafeUnwrap()`.

They are part of the syntax from [neverthrow](https://github.com/supermacro/neverthrow) - a functional-programming library that helps making JS/TS applications more bullet-proof, inspired by Rust. To learn more, please visit their repo: https://github.com/supermacro/neverthrow

> You do not have to explicitly check for errors when accessing returned values for `create()`, `update()`, `findOne()`, `delete()`

# Other Methods

## `findOne()` - Find an item by ID

```typescript
// without field-selection
const result = orm.user.findOne({
  where: { id: 'USER_ID' },
});

// with field-selection
const result = orm.user.findOne<User>({
  where: { id: 'USER_ID' },
  select: { id: true, firstName: true },
});

logger.info(`data found: ${result.id}`);
```

## `create()` - Create an item

```typescript
type CreateUserInput = Partial<User>;

const result = await orm.user.create<CreateUserInput>({
  data: {
    firstName: '<FIRST_NAME>',
    lastName: '<LAST_NAME>',
  },
});

logger.info(`data created: ${result.firstName}`);
```

## `update()` - Update an item

```typescript
type UpdateUserInput = Partial<User>;

const result = await orm.user.update<UpdateUserInput>({
  where: { id: '<USER_ID>' },
  data: {
    firstName: '<UPDATED_FIRST_NAME>',
  },
});

logger.info(`data updated: ${result.firstName}`);
```

## `delete()` - Delete an item

```typescript
const result = await orm.user.delete({
  where: { id: '<USER_ID>' },
});
```

## 😀 Roadmap

- ~~Core Query builder~~
- ~~Observability - query logging~~
- ~~Performance monitoring~~
- Documentation website
- Audit fields configuration (system fields) such as `createdAt`, `updatedAt`, `archivedAt`, etc
- Bulk create / update operations
- Filtering on more complex data types such as: composite types, enums, enum arrays, string arrays & number arrays

## Contributing

We're building Cosmox to make CosmosDB more accessible for TypeScript developers, and we welcome contributions passionate about improving the developer experience — whether you're a CosmosDB user, a TypeScript enthusiast, a Prisma user, or part of the broader database community.

## Disclaimer

This project is not an official **Azure** nor **Prisma** product. Provided "as is" without warranty.
