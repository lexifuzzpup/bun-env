# bun-env

A lightweight environment variable parser for Bun. It should also work on Node.

# Usage
```ts
import { env } from "bun-env";

/*
    strings can be loaded from env, with defaults allowed.
*/
env.string("PROJECT_NAME"); // throws if it doesn't exist
env.string("PROJECT_NAME", "Default Project"); // specify a default value
env.stringOptional("PROJECT_NAME"); // return undefined if it doesn't exist


/*
    numbers can be loaded too.
    if the number isn't valid, an error is thrown.
*/
env.number("PORT", 3000); // default 3000


/*
    booleans. if the number isn't valid, an error is thrown.
*/
env.boolean("DEBUG", false); // default false


/*
    files can be loaded.
*/
env.file.string("/run/secrets/database_password"); // reads the file as a string
env.file.number("/run/secrets/port"); // reads the file as a number, throwing if nonexistent
env.file.booleanOptional("/run/secrets/enable_easter_eggs"); // reads the file as an optional boolean


/*
    files can be loaded in place of environment vars.
    this is useful for docker configs.

    in the following example, the DATABASE_PASSWORD variable is fetched, and if it doesn't
    exist, then DATABASE_PASSWORD_FILE will be fetched and read as a file path. if none
    exist, then an error is thrown.

    this works with strings, numbers, and booleans, and supports optionals.
*/
env.orFile.string("DATABASE_PASSWORD");
env.orFile.stringOptional("DATABASE_USER");
env.orFile.number("DATABASE_PORT");
env.orFile.boolean("USE_POSTGRES");
```

# Development

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

To type check:

```bash
bun check
```