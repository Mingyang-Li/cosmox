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

## 📚 Examples:

Make queries with simple filters

```typescript
const getFilteredUsers = async () => {
  return await orm.user.findMany({
    where: { firstName: { contains: 'Sam' } },
  });
};

const getFilteredUsers = async () => {
  return await orm.user.findMany({
    where: { age: { gte: 18 } },
  });
};

const getFilteredUsers = async () => {
  return await orm.user.findMany({
    where: { createdAt: { gte: new Date('2024-01-01') } },
  });
};

const getFilteredposts = async () => {
  return await orm.post.findMany({
    where: { createdBy: { equals: '<SOME_USER_ID>' } },
  });
};
```

Make a query without any filters

```typescript
// This will return maximum of 100 items by default
const result = orm.user.findMany({});
```

Or, make a query by applying some complex filters, field-selections, and pagination logic:

```typescript
const getFilteredUsers = async () => {
  return await orm.user.findMany({
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
};
```

Find an item by ID

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
```

Create an item

```typescript
type CreateUserInput = Partial<User>;

const result = orm.user.create<CreateUserInput>({
  data: {
    firstName: '<FIRST_NAME>',
    lastName: '<LAST_NAME>',
  },
});
```

Update an item

```typescript
type UpdateUserInput = Partial<User>;

const result = orm.user.update<UpdateUserInput>({
  where: { id: '<USER_ID>' },
  data: {
    firstName: '<UPDATED_FIRST_NAME>',
  },
});
```

Delete an item

```typescript
const result = orm.user.delete({
  where: { id: '<USER_ID>' },
});
```

## 😀 Roadmap

- ~~Core Query builder~~
- Audit fields configuration (system fields) such as `createdAt`, `updatedAt`, `archivedAt`, etc
- Bulk create / update operations
- Observability - query logging
- Filtering on more complex data types such as: composite types, enums, enum arrays, string arrays & number arrays

## Contributing

We're building Cosmox to make CosmosDB more accessible for TypeScript developers, and we welcome contributions passionate about improving the developer experience — whether you're a CosmosDB user, a TypeScript enthusiast, a Prisma user, or part of the broader database community.

## Disclaimer

This project is not an official **Azure** nor **Prisma** product. Provided "as is" without warranty.
