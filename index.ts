import { existsSync, readFileSync } from "node:fs";

function parseAsNumber(value: string | undefined) {
    if(value == null) return NaN;
    if(value.trim().length == 0) return NaN;

    return +value;
}

const TRUE_BOOLEANS = [ "true", "1", "yes", "on", "enable", "enabled" ];
const FALSE_BOOLEANS = [ "false", "0", "no", "off", "disable", "disabled" ];

function parseAsBoolean(value: string | undefined) {
    if(value == null) return null;

    value = value.trim().toLowerCase();

    if(TRUE_BOOLEANS.includes(value)) return true;
    if(FALSE_BOOLEANS.includes(value)) return false;

    return null;
}

export namespace env {
    /**
     * Gets an environment variable as a string, or throws a `ReferenceError` if it doesn't
     * exist and no default is set.
     * @param name Name of the environment variable. Case sensitive.
     * @param defaultValue A `string` or a getter for a `string` in case the variable isn't set.
     */
    export function string(name: string, defaultValue?: string | (() => string)): string {
        let value = process.env[name] ?? (typeof defaultValue == "function" ? defaultValue() : defaultValue);

        if(value === undefined) throw new ReferenceError(`Environment variable ${name} not set`);

        return value;
    }
    /**
     * Gets an environment variable as a string, or returns `undefined` if it doesn't exist.
     * @param name Name of the environment variable. Case sensitive.
     */
    export function stringOptional(name: string): string | undefined {
        return process.env[name];
    }
    /**
     * Gets an environment variable as a number, throws a `ReferenceError` if it doesn't exist
     * and no default is set, or throws a `TypeError` if it can't be parsed as a number.
     * @param name Name of the environment variable. Case sensitive.
     * @param defaultValue A `number` or a getter for a `number` in case the variable isn't set.
     */
    export function number(name: string, defaultValue?: number | (() => number)): number {
        let value = process.env[name] ?? (typeof defaultValue == "function" ? defaultValue() : defaultValue);

        if(value === undefined) throw new ReferenceError(`Environment variable ${name} not set`);

        const parsedValue = typeof value == "string" ? parseAsNumber(value) : value;
        if(isNaN(parsedValue)) throw new TypeError(`Environment variable ${name} is not a number (got "${value}")`);

        return parsedValue;
    }
    /**
     * Gets an environment variable as a number, throws a `TypeError` if it can't be parsed as
     * a number, or returns `undefined` if it doesn't exist.
     * @param name Name of the environment variable. Case sensitive.
     */
    export function numberOptional(name: string): number | undefined {
        let value = process.env[name];

        if(value === undefined) return undefined;
        
        const parsedValue = typeof value == "string" ? parseAsNumber(value) : value;
        if(isNaN(parsedValue)) throw new TypeError(`Environment variable ${name} is not a number (got "${value}")`);

        return parsedValue;
    }
    /**
     * Gets an environment variable as a boolean, throws a `ReferenceError` if it doesn't exist
     * and no default is set, or throws a `TypeError` if it can't be parsed as a boolean.
     * @param name Name of the environment variable. Case sensitive.
     * @param defaultValue A `boolean` or a getter for a `boolean` in case the variable isn't set.
     */
    export function boolean(name: string, defaultValue?: boolean | (() => boolean)): boolean {
        let value = process.env[name] ?? (typeof defaultValue == "function" ? defaultValue() : defaultValue);

        if(value === undefined) throw new ReferenceError(`Environment variable ${name} not set`);

        const parsedValue = typeof value == "string" ? parseAsBoolean(value) : value;
        if(parsedValue == null) throw new TypeError(`Environment variable ${name} is not a boolean (got "${value}")`);

        return parsedValue;
    }
    /**
     * Gets an environment variable as a boolean, throws a `TypeError` if it can't be parsed as
     * a boolean, or returns `undefined` if it doesn't exist.
     * @param name Name of the environment variable. Case sensitive.
     */
    export function booleanOptional(name: string): boolean | undefined {
        let value = process.env[name];

        if(value === undefined) return undefined;
        
        const parsedValue = typeof value == "string" ? parseAsBoolean(value) : value;
        if(parsedValue == null) throw new TypeError(`Environment variable ${name} is not a boolean (got "${value}")`);

        return parsedValue;
    }
    export namespace file {
        /**
         * Reads the contents of a file as a string, or throws a `ReferenceError` if it doesn't
         * exist and no default is set.
         * @param filePath Path to the file
         * @param defaultValue A `string` or a getter for a `string` in case the file doesn't exist.
         * @returns Contents of the file, or the default value
         */
        export function string(filePath: string, defaultValue?: string | (() => string)): string {
            if(!existsSync(filePath)) {
                if(defaultValue != null) return typeof defaultValue == "function" ? defaultValue() : defaultValue;
                else throw new ReferenceError(`File ${filePath} not found`);
            }

            return readFileSync(filePath, "utf-8").toString();
        }
        /**
         * Reads the contents of a file as a string, or returns `undefined` if it doesn't exist.
         * @param filePath Path to the file
         * @returns Contents of the file, or `undefined`
         */
        export function stringOptional(filePath: string): string | undefined {
            if(!existsSync(filePath)) return;
            
            return readFileSync(filePath, "utf-8").toString();
        }
        /**
         * Reads the contents of a file as a number, throws a `ReferenceError` if it doesn't
         * exist and no default is set, or throws a `TypeError` if the contents of the file
         * can't be parsed as a number.
         * @param filePath Path to the file
         * @param defaultValue A `number` or a getter for a `number` in case the file doesn't exist.
         * @returns Contents of the file as a number, or the default value
         */
        export function number(filePath: string, defaultValue?: number | (() => number)): number {
            if(!existsSync(filePath)) {
                if(defaultValue != null) return typeof defaultValue == "function" ? defaultValue() : defaultValue;
                else throw new ReferenceError(`File ${filePath} not found`);
            }

            const contents = readFileSync(filePath, "utf-8").toString();

            const parsedContents = typeof contents == "string" ? parseAsNumber(contents) : contents;
            if(isNaN(parsedContents)) throw new TypeError(`File ${filePath} does not contain a number (got "${contents}")`);

            return parsedContents;
        }
        /**
         * Reads the contents of a file as a number, or returns `undefined` if it doesn't exist.
         * @param filePath Path to the file
         * @returns Contents of the file as a number, or `undefined`
         */
        export function numberOptional(filePath: string): number | undefined {
            if(!existsSync(filePath)) return;

            const contents = readFileSync(filePath, "utf-8").toString();

            const parsedContents = typeof contents == "string" ? parseAsNumber(contents) : contents;
            if(isNaN(parsedContents)) throw new TypeError(`File ${filePath} does not contain a number (got "${contents}")`);

            return parsedContents;
        }
        /**
         * Reads the contents of a file as a boolean, throws a `ReferenceError` if it doesn't
         * exist and no default is set, or throws a `TypeError` if the contents of the file
         * can't be parsed as a boolean.
         * @param filePath Path to the file
         * @param defaultValue A `boolean` or a getter for a `boolean` in case the file doesn't exist.
         * @returns Contents of the file as a boolean, or the default value
         */
        export function boolean(filePath: string, defaultValue?: boolean | (() => boolean)): boolean {
            if(!existsSync(filePath)) {
                if(defaultValue != null) return typeof defaultValue == "function" ? defaultValue() : defaultValue;
                else throw new ReferenceError(`File ${filePath} not found`);
            }

            const contents = readFileSync(filePath, "utf-8").toString();

            const parsedContents = typeof contents == "string" ? parseAsBoolean(contents) : contents;
            if(parsedContents == null) throw new TypeError(`File ${filePath} does not contain a boolean (got "${contents}")`);

            return parsedContents;
        }
        /**
         * Reads the contents of a file as a boolean, or returns `undefined` if it doesn't exist.
         * @param filePath Path to the file
         * @returns Contents of the file as a boolean, or `undefined`
         */
        export function booleanOptional(filePath: string): boolean | undefined {
            if(!existsSync(filePath)) return;

            const contents = readFileSync(filePath, "utf-8").toString();

            const parsedContents = typeof contents == "string" ? parseAsBoolean(contents) : contents;
            if(parsedContents == null) throw new TypeError(`File ${filePath} does not contain a boolean (got "${contents}")`);

            return parsedContents;
        }
    }

    export namespace orFile {
        /**
         * Gets an environment variable as a string. If the variable doesn't exist, then a file is loaded from
         * the path specified in the environment variable with the suffix "_FILE". If neither exist, a `ReferenceError`
         * is thrown if a default value isn't specified.
         * 
         * `get env "PASSWORD"` -> `doesn't exist` -> `get env "PASSWORD_FILE"` -> `exists` -> `read file ${PASSWORD_FILE}`
         * @param name Name of the variable to read
         * @param defaultValue A `string` or a getter for a `string` in case neither the file nor variable exist.
         * @returns environment variable, otherwise file contents, otherwise the default value
         */
        export function string(name: string, defaultValue?: string | (() => string)): string {
            const value = env.stringOptional(name);
            if(value != null) return value;
            
            const filePath = env.stringOptional(name + "_FILE");
            if(filePath != null) return env.file.string(filePath, defaultValue);

            if(defaultValue != null) return typeof defaultValue == "function" ? defaultValue() : defaultValue;
            throw new ReferenceError(`Neither ${name} nor ${name}_FILE exist`);
        }
        /**
         * Gets an environment variable as a string. If the variable doesn't exist, then a file is loaded from
         * the path specified in the environment variable with the suffix "_FILE". If neither exist, `undefined`
         * is returned.
         * 
         * `get env "PASSWORD"` -> `doesn't exist` -> `get env "PASSWORD_FILE"` -> `exists` -> `read file ${PASSWORD_FILE}`
         * @param name Name of the variable to read
         * @returns environment variable, otherwise file contents, otherwise `undefined`
         */
        export function stringOptional(name: string): string | undefined {
            const value = env.stringOptional(name);
            if(value != null) return value;
            
            const filePath = env.stringOptional(name + "_FILE");
            if(filePath != null) return env.file.stringOptional(filePath);

            return undefined;
        }
        /**
         * Gets an environment variable as a number. If the variable doesn't exist, then a file is loaded from
         * the path specified in the environment variable with the suffix "_FILE". If neither exist, a `ReferenceError`
         * is thrown if a default value isn't specified. If the result can't be parsed as a number, a `TypeError` is
         * thrown.
         * 
         * `get env "SECRET_PORT"` -> `doesn't exist` -> `get env "SECRET_PORT_FILE"` -> `exists` ->
         * `read file ${SECRET_PORT_FILE}` -> `parse as number`
         * @param name Name of the variable to read
         * @param defaultValue A `number` or a getter for a `number` in case neither the file nor variable exist.
         * @returns environment variable, otherwise file contents, otherwise the default value
         */
        export function number(name: string, defaultValue?: number | (() => number)): number {
            const value = env.numberOptional(name);
            if(value != null) return value;
            
            const filePath = env.stringOptional(name + "_FILE");
            if(filePath != null) return env.file.number(filePath, defaultValue);

            if(defaultValue != null) return typeof defaultValue == "function" ? defaultValue() : defaultValue;
            throw new ReferenceError(`Neither ${name} nor ${name}_FILE exist`);
        }
        /**
         * Gets an environment variable as a number. If the variable doesn't exist, then a file is loaded from
         * the path specified in the environment variable with the suffix "_FILE". If neither exist, `undefined`
         * is returned. If either exist, but can't be parsed as a number, a `TypeError` is thrown.
         * 
         * `get env "SECRET_PORT"` -> `doesn't exist` -> `get env "SECRET_PORT_FILE"` -> `exists` ->
         * `read file ${SECRET_PORT_FILE}` -> `parse as number`
         * @param name Name of the variable to read
         * @returns environment variable, otherwise file contents, otherwise `undefined`
         */
        export function numberOptional(name: string): number | undefined {
            const value = env.numberOptional(name);
            if(value != null) return value;
            
            const filePath = env.stringOptional(name + "_FILE");
            if(filePath != null) return env.file.numberOptional(filePath);

            return undefined;
        }
        /**
         * Gets an environment variable as a boolean. If the variable doesn't exist, then a file is loaded from
         * the path specified in the environment variable with the suffix "_FILE". If neither exist, a `ReferenceError`
         * is thrown if a default value isn't specified. If the result can't be parsed as a boolean, a `TypeError` is
         * thrown.
         * 
         * `get env "ENABLE_SECRETS"` -> `doesn't exist` -> `get env "ENABLE_SECRETS_FILE"` -> `exists` ->
         * `read file ${ENABLE_SECRETS_FILE}` -> `parse as boolean`
         * @param name Name of the variable to read
         * @param defaultValue A `boolean` or a getter for a `boolean` in case neither the file nor variable exist.
         * @returns environment variable, otherwise file contents, otherwise the default value
         */
        export function boolean(name: string, defaultValue?: boolean | (() => boolean)): boolean {
            const value = env.booleanOptional(name);
            if(value != null) return value;
            
            const filePath = env.stringOptional(name + "_FILE");
            if(filePath != null) return env.file.boolean(filePath, defaultValue);

            if(defaultValue != null) return typeof defaultValue == "function" ? defaultValue() : defaultValue;
            throw new ReferenceError(`Neither ${name} nor ${name}_FILE exist`);
        }
        /**
         * Gets an environment variable as a boolean. If the variable doesn't exist, then a file is loaded from
         * the path specified in the environment variable with the suffix "_FILE". If neither exist, `undefined`
         * is returned. If either exist, but can't be parsed as a boolean, a `TypeError` is thrown.
         * 
         * `get env "ENABLE_SECRETS"` -> `doesn't exist` -> `get env "ENABLE_SECRETS_FILE"` -> `exists` ->
         * `read file ${ENABLE_SECRETS_FILE}` -> `parse as boolean`
         * @param name Name of the variable to read
         * @returns environment variable, otherwise file contents, otherwise `undefined`
         */
        export function booleanOptional(name: string): boolean | undefined {
            const value = env.booleanOptional(name);
            if(value != null) return value;
            
            const filePath = env.stringOptional(name + "_FILE");
            if(filePath != null) return env.file.booleanOptional(filePath);

            return undefined;
        }
    }
};