import { afterAll, afterEach, beforeAll, describe, expect, mock, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { env } from "./index";

const PREFIX = "BUN_ENV_TEST_";
let dir: string;
let fileCounter = 0;

/** Writes `contents` to a fresh file in the temp directory and returns its path. */
function tempFile(contents: string): string {
    const path = join(dir, `file-${fileCounter++}`);
    writeFileSync(path, contents);
    return path;
}

/** A path inside the temp directory that is guaranteed not to exist. */
function missingFile(): string {
    return join(dir, `missing-${fileCounter++}`);
}

/** Sets a prefixed environment variable and returns its full name. */
function setVar(name: string, value: string): string {
    process.env[PREFIX + name] = value;
    return PREFIX + name;
}

beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "bun-env-test-"));
});

afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
});

afterEach(() => {
    for(const key of Object.keys(process.env)) {
        if(key.startsWith(PREFIX)) delete process.env[key];
    }
});

describe("env.string", () => {
    test("returns the variable's value", () => {
        expect(env.string(setVar("A", "hello"))).toBe("hello");
    });

    test("returns an empty string if the variable is set to empty", () => {
        expect(env.string(setVar("A", ""), "default")).toBe("");
    });

    test("is case sensitive", () => {
        setVar("CASE", "upper");
        expect(() => env.string(PREFIX + "case")).toThrow(ReferenceError);
    });

    test("throws ReferenceError if unset with no default", () => {
        expect(() => env.string(PREFIX + "UNSET")).toThrow(ReferenceError);
    });

    test("returns a default value if unset", () => {
        expect(env.string(PREFIX + "UNSET", "fallback")).toBe("fallback");
    });

    test("accepts an empty-string default", () => {
        expect(env.string(PREFIX + "UNSET", "")).toBe("");
    });

    test("calls a default getter only when unset", () => {
        const getter = mock(() => "lazy");
        expect(env.string(PREFIX + "UNSET", getter)).toBe("lazy");
        expect(getter).toHaveBeenCalledTimes(1);

        getter.mockClear();
        expect(env.string(setVar("A", "set"), getter)).toBe("set");
        expect(getter).not.toHaveBeenCalled();
    });
});

describe("env.stringOptional", () => {
    test("returns the variable's value", () => {
        expect(env.stringOptional(setVar("A", "hello"))).toBe("hello");
    });

    test("returns undefined if unset", () => {
        expect(env.stringOptional(PREFIX + "UNSET")).toBeUndefined();
    });
});

describe("env.number", () => {
    test.each([
        ["42", 42],
        ["-3.5", -3.5],
        ["1e3", 1000],
        ["0", 0],
        [" 42 ", 42],
        ["0x1F", 31],
        ["Infinity", Infinity],
    ])("parses %p as %p", (raw, expected) => {
        expect(env.number(setVar("N", raw))).toBe(expected);
    });

    test.each(["abc", "12abc", "80 80", "NaN"])("throws TypeError for %p", (raw) => {
        expect(() => env.number(setVar("N", raw))).toThrow(TypeError);
    });

    test("throws TypeError for an empty variable", () => {
        expect(() => env.number(setVar("N", ""))).toThrow(TypeError);
    });

    test("throws TypeError for a whitespace-only variable", () => {
        expect(() => env.number(setVar("N", "   "))).toThrow(TypeError);
    });

    test("throws ReferenceError if unset with no default", () => {
        expect(() => env.number(PREFIX + "UNSET")).toThrow(ReferenceError);
    });

    test("returns a default value if unset", () => {
        expect(env.number(PREFIX + "UNSET", 8080)).toBe(8080);
    });

    test("accepts a default of 0", () => {
        expect(env.number(PREFIX + "UNSET", 0)).toBe(0);
    });

    test("calls a default getter only when unset", () => {
        const getter = mock(() => 7);
        expect(env.number(PREFIX + "UNSET", getter)).toBe(7);
        expect(getter).toHaveBeenCalledTimes(1);

        getter.mockClear();
        expect(env.number(setVar("N", "1"), getter)).toBe(1);
        expect(getter).not.toHaveBeenCalled();
    });
});

describe("env.numberOptional", () => {
    test("parses the variable as a number", () => {
        expect(env.numberOptional(setVar("N", "42"))).toBe(42);
    });

    test("returns undefined if unset", () => {
        expect(env.numberOptional(PREFIX + "UNSET")).toBeUndefined();
    });

    test("throws TypeError if not a number", () => {
        expect(() => env.numberOptional(setVar("N", "abc"))).toThrow(TypeError);
    });

    test("throws TypeError for an empty variable", () => {
        expect(() => env.numberOptional(setVar("N", ""))).toThrow(TypeError);
    });
});

describe("env.boolean", () => {
    test.each([
        ["true", true],
        ["false", false],
        ["1", true],
        ["0", false],
        ["yes", true],
        ["no", false],
        ["enable", true],
        ["disable", false],
        ["enabled", true],
        ["disabled", false],
        ["TRUE", true],
        ["False", false],
        ["YES", true],
        ["Disabled", false],
    ])("parses %p as %p", (raw, expected) => {
        expect(env.boolean(setVar("B", raw))).toBe(expected);
    });

    test.each(["", "y", "n", "t", "f", "2", "-1", "01", "1.0", "truthy", "yess"])("throws TypeError for %p", (raw) => {
        expect(() => env.boolean(setVar("B", raw))).toThrow(TypeError);
    });

    test.each([
        [" true", true],
        ["false ", false],
        ["true\n", true],
    ])("ignores surrounding whitespace in %p", (raw, expected) => {
        expect(env.boolean(setVar("B", raw))).toBe(expected);
    });

    test("throws TypeError for a whitespace-only variable", () => {
        expect(() => env.boolean(setVar("B", "   "))).toThrow(TypeError);
    });

    test("throws ReferenceError if unset with no default", () => {
        expect(() => env.boolean(PREFIX + "UNSET")).toThrow(ReferenceError);
    });

    test.each([true, false])("returns a default of %p if unset", (fallback) => {
        expect(env.boolean(PREFIX + "UNSET", fallback)).toBe(fallback);
    });

    test("prefers the variable over a default", () => {
        expect(env.boolean(setVar("B", "false"), true)).toBe(false);
    });

    test("calls a default getter only when unset", () => {
        const getter = mock(() => true);
        expect(env.boolean(PREFIX + "UNSET", getter)).toBe(true);
        expect(getter).toHaveBeenCalledTimes(1);

        getter.mockClear();
        expect(env.boolean(setVar("B", "false"), getter)).toBe(false);
        expect(getter).not.toHaveBeenCalled();
    });
});

describe("env.booleanOptional", () => {
    test.each([
        ["true", true],
        ["FALSE", false],
        ["1", true],
        ["no", false],
        ["on", true],
    ])("parses %p as %p", (raw, expected) => {
        expect(env.booleanOptional(setVar("B", raw))).toBe(expected);
    });

    test("returns undefined if unset", () => {
        expect(env.booleanOptional(PREFIX + "UNSET")).toBeUndefined();
    });

    test.each(["", "y", "maybe"])("throws TypeError for %p", (raw) => {
        expect(() => env.booleanOptional(setVar("B", raw))).toThrow(TypeError);
    });
});

describe("env.file.string", () => {
    test("returns the file's contents", () => {
        expect(env.file.string(tempFile("secret"))).toBe("secret");
    });

    test("does not trim contents", () => {
        expect(env.file.string(tempFile("secret\n"))).toBe("secret\n");
    });

    test("throws ReferenceError if the file is missing with no default", () => {
        expect(() => env.file.string(missingFile())).toThrow(ReferenceError);
    });

    test("returns a default value if the file is missing", () => {
        expect(env.file.string(missingFile(), "fallback")).toBe("fallback");
    });

    test("accepts an empty-string default", () => {
        expect(env.file.string(missingFile(), "")).toBe("");
    });

    test("calls a default getter only when the file is missing", () => {
        const getter = mock(() => "lazy");
        expect(env.file.string(missingFile(), getter)).toBe("lazy");
        expect(getter).toHaveBeenCalledTimes(1);

        getter.mockClear();
        expect(env.file.string(tempFile("real"), getter)).toBe("real");
        expect(getter).not.toHaveBeenCalled();
    });
});

describe("env.file.stringOptional", () => {
    test("returns the file's contents", () => {
        expect(env.file.stringOptional(tempFile("secret"))).toBe("secret");
    });

    test("returns undefined if the file is missing", () => {
        expect(env.file.stringOptional(missingFile())).toBeUndefined();
    });
});

describe("env.file.number", () => {
    test("parses the file's contents as a number", () => {
        expect(env.file.number(tempFile("5432"))).toBe(5432);
    });

    test("tolerates a trailing newline", () => {
        expect(env.file.number(tempFile("5432\n"))).toBe(5432);
    });

    test("throws TypeError if the contents are not a number", () => {
        expect(() => env.file.number(tempFile("not a number"))).toThrow(TypeError);
    });

    test("throws TypeError if the file is empty", () => {
        expect(() => env.file.number(tempFile(""))).toThrow(TypeError);
    });

    test("throws TypeError if the file contains only a newline", () => {
        expect(() => env.file.number(tempFile("\n"))).toThrow(TypeError);
    });

    test("throws ReferenceError if the file is missing with no default", () => {
        expect(() => env.file.number(missingFile())).toThrow(ReferenceError);
    });

    test("returns a default value if the file is missing", () => {
        expect(env.file.number(missingFile(), 99)).toBe(99);
    });

    test("accepts a default of 0", () => {
        expect(env.file.number(missingFile(), 0)).toBe(0);
    });

    test("calls a default getter only when the file is missing", () => {
        const getter = mock(() => 7);
        expect(env.file.number(missingFile(), getter)).toBe(7);
        expect(getter).toHaveBeenCalledTimes(1);

        getter.mockClear();
        expect(env.file.number(tempFile("1"), getter)).toBe(1);
        expect(getter).not.toHaveBeenCalled();
    });
});

describe("env.file.numberOptional", () => {
    test("parses the file's contents as a number", () => {
        expect(env.file.numberOptional(tempFile("12"))).toBe(12);
    });

    test("returns undefined if the file is missing", () => {
        expect(env.file.numberOptional(missingFile())).toBeUndefined();
    });

    test("throws TypeError if the contents are not a number", () => {
        expect(() => env.file.numberOptional(tempFile("nope"))).toThrow(TypeError);
    });
});

describe("env.file.boolean", () => {
    test.each([
        ["true", true],
        ["false", false],
        ["True", true],
        ["0", false],
        ["enabled", true],
    ])("parses %p as %p", (raw, expected) => {
        expect(env.file.boolean(tempFile(raw))).toBe(expected);
    });

    test.each([
        ["true\n", true],
        ["1\n", true],
        ["no\n", false],
    ])("tolerates a trailing newline in %p", (raw, expected) => {
        expect(env.file.boolean(tempFile(raw))).toBe(expected);
    });

    test.each(["", "\n", "y", "maybe"])("throws TypeError for %p", (raw) => {
        expect(() => env.file.boolean(tempFile(raw))).toThrow(TypeError);
    });

    test("throws ReferenceError if the file is missing with no default", () => {
        expect(() => env.file.boolean(missingFile())).toThrow(ReferenceError);
    });

    test.each([true, false])("returns a default of %p if the file is missing", (fallback) => {
        expect(env.file.boolean(missingFile(), fallback)).toBe(fallback);
    });

    test("calls a default getter only when the file is missing", () => {
        const getter = mock(() => true);
        expect(env.file.boolean(missingFile(), getter)).toBe(true);
        expect(getter).toHaveBeenCalledTimes(1);

        getter.mockClear();
        expect(env.file.boolean(tempFile("false"), getter)).toBe(false);
        expect(getter).not.toHaveBeenCalled();
    });
});

describe("env.file.booleanOptional", () => {
    test("parses the file's contents as a boolean", () => {
        expect(env.file.booleanOptional(tempFile("false"))).toBe(false);
    });

    test("returns undefined if the file is missing", () => {
        expect(env.file.booleanOptional(missingFile())).toBeUndefined();
    });

    test("throws TypeError if the contents are not a boolean", () => {
        expect(() => env.file.booleanOptional(tempFile("nope"))).toThrow(TypeError);
    });
});

describe("env.orFile.string", () => {
    test("returns the variable if set", () => {
        expect(env.orFile.string(setVar("P", "from-env"))).toBe("from-env");
    });

    test("prefers the variable over the _FILE variable", () => {
        setVar("P_FILE", tempFile("from-file"));
        expect(env.orFile.string(setVar("P", "from-env"))).toBe("from-env");
    });

    test("reads the file named by the _FILE variable if the variable is unset", () => {
        setVar("P_FILE", tempFile("from-file"));
        expect(env.orFile.string(PREFIX + "P")).toBe("from-file");
    });

    test("throws ReferenceError if neither is set and there is no default", () => {
        expect(() => env.orFile.string(PREFIX + "P")).toThrow(ReferenceError);
    });

    test("throws ReferenceError if the _FILE path is missing and there is no default", () => {
        setVar("P_FILE", missingFile());
        expect(() => env.orFile.string(PREFIX + "P")).toThrow(ReferenceError);
    });

    test("returns a default value if neither is set", () => {
        expect(env.orFile.string(PREFIX + "P", "fallback")).toBe("fallback");
    });

    test("returns a default value if the _FILE path is missing", () => {
        setVar("P_FILE", missingFile());
        expect(env.orFile.string(PREFIX + "P", "fallback")).toBe("fallback");
    });

    test("accepts an empty-string default", () => {
        expect(env.orFile.string(PREFIX + "P", "")).toBe("");
    });

    test("calls a default getter only when needed", () => {
        const getter = mock(() => "lazy");
        expect(env.orFile.string(PREFIX + "P", getter)).toBe("lazy");
        expect(getter).toHaveBeenCalledTimes(1);

        getter.mockClear();
        expect(env.orFile.string(setVar("P", "set"), getter)).toBe("set");
        expect(getter).not.toHaveBeenCalled();
    });
});

describe("env.orFile.stringOptional", () => {
    test("returns the variable if set", () => {
        expect(env.orFile.stringOptional(setVar("P", "from-env"))).toBe("from-env");
    });

    test("prefers the variable over the _FILE variable", () => {
        setVar("P_FILE", tempFile("from-file"));
        expect(env.orFile.stringOptional(setVar("P", "from-env"))).toBe("from-env");
    });

    test("reads the file named by the _FILE variable if the variable is unset", () => {
        setVar("P_FILE", tempFile("from-file"));
        expect(env.orFile.stringOptional(PREFIX + "P")).toBe("from-file");
    });

    test("returns undefined if neither is set", () => {
        expect(env.orFile.stringOptional(PREFIX + "P")).toBeUndefined();
    });

    test("returns undefined if the _FILE path is missing", () => {
        setVar("P_FILE", missingFile());
        expect(env.orFile.stringOptional(PREFIX + "P")).toBeUndefined();
    });
});

describe("env.orFile.number", () => {
    test("returns the variable if set", () => {
        expect(env.orFile.number(setVar("PORT", "8080"))).toBe(8080);
    });

    test("prefers the variable over the _FILE variable", () => {
        setVar("PORT_FILE", tempFile("9090"));
        expect(env.orFile.number(setVar("PORT", "8080"))).toBe(8080);
    });

    test("reads the file named by the _FILE variable if the variable is unset", () => {
        setVar("PORT_FILE", tempFile("9090"));
        expect(env.orFile.number(PREFIX + "PORT")).toBe(9090);
    });

    test("throws TypeError if the variable is not a number", () => {
        expect(() => env.orFile.number(setVar("PORT", "abc"))).toThrow(TypeError);
    });

    test("throws TypeError if the file does not contain a number", () => {
        setVar("PORT_FILE", tempFile("abc"));
        expect(() => env.orFile.number(PREFIX + "PORT")).toThrow(TypeError);
    });

    test("throws ReferenceError if neither is set and there is no default", () => {
        expect(() => env.orFile.number(PREFIX + "PORT")).toThrow(ReferenceError);
    });

    test("throws ReferenceError if the _FILE path is missing and there is no default", () => {
        setVar("PORT_FILE", missingFile());
        expect(() => env.orFile.number(PREFIX + "PORT")).toThrow(ReferenceError);
    });

    test("returns a default value if neither is set", () => {
        expect(env.orFile.number(PREFIX + "PORT", 3000)).toBe(3000);
    });

    test("returns a default value if the _FILE path is missing", () => {
        setVar("PORT_FILE", missingFile());
        expect(env.orFile.number(PREFIX + "PORT", 3000)).toBe(3000);
    });

    test("accepts a default of 0", () => {
        expect(env.orFile.number(PREFIX + "PORT", 0)).toBe(0);
    });

    test("calls a default getter only when needed", () => {
        const getter = mock(() => 7);
        expect(env.orFile.number(PREFIX + "PORT", getter)).toBe(7);
        expect(getter).toHaveBeenCalledTimes(1);

        getter.mockClear();
        expect(env.orFile.number(setVar("PORT", "1"), getter)).toBe(1);
        expect(getter).not.toHaveBeenCalled();
    });
});

describe("env.orFile.numberOptional", () => {
    test("returns the variable if set", () => {
        expect(env.orFile.numberOptional(setVar("PORT", "8080"))).toBe(8080);
    });

    test("prefers the variable over the _FILE variable", () => {
        setVar("PORT_FILE", tempFile("9090"));
        expect(env.orFile.numberOptional(setVar("PORT", "8080"))).toBe(8080);
    });

    test("reads the file named by the _FILE variable if the variable is unset", () => {
        setVar("PORT_FILE", tempFile("9090"));
        expect(env.orFile.numberOptional(PREFIX + "PORT")).toBe(9090);
    });

    test("returns undefined if neither is set", () => {
        expect(env.orFile.numberOptional(PREFIX + "PORT")).toBeUndefined();
    });

    test("returns undefined if the _FILE path is missing", () => {
        setVar("PORT_FILE", missingFile());
        expect(env.orFile.numberOptional(PREFIX + "PORT")).toBeUndefined();
    });

    test("throws TypeError if the variable is not a number", () => {
        expect(() => env.orFile.numberOptional(setVar("PORT", "abc"))).toThrow(TypeError);
    });

    test("throws TypeError if the file does not contain a number", () => {
        setVar("PORT_FILE", tempFile("abc"));
        expect(() => env.orFile.numberOptional(PREFIX + "PORT")).toThrow(TypeError);
    });
});

describe("env.orFile.boolean", () => {
    test("returns the variable if set", () => {
        expect(env.orFile.boolean(setVar("FLAG", "true"))).toBe(true);
    });

    test("prefers the variable over the _FILE variable", () => {
        setVar("FLAG_FILE", tempFile("true"));
        expect(env.orFile.boolean(setVar("FLAG", "false"))).toBe(false);
    });

    test("reads the file named by the _FILE variable if the variable is unset", () => {
        setVar("FLAG_FILE", tempFile("false"));
        expect(env.orFile.boolean(PREFIX + "FLAG")).toBe(false);
    });

    test("throws TypeError if the variable is not a boolean", () => {
        expect(() => env.orFile.boolean(setVar("FLAG", "maybe"))).toThrow(TypeError);
    });

    test("throws TypeError if the file does not contain a boolean", () => {
        setVar("FLAG_FILE", tempFile("maybe"));
        expect(() => env.orFile.boolean(PREFIX + "FLAG")).toThrow(TypeError);
    });

    test("throws ReferenceError if neither is set and there is no default", () => {
        expect(() => env.orFile.boolean(PREFIX + "FLAG")).toThrow(ReferenceError);
    });

    test("throws ReferenceError if the _FILE path is missing and there is no default", () => {
        setVar("FLAG_FILE", missingFile());
        expect(() => env.orFile.boolean(PREFIX + "FLAG")).toThrow(ReferenceError);
    });

    test.each([true, false])("returns a default of %p if neither is set", (fallback) => {
        expect(env.orFile.boolean(PREFIX + "FLAG", fallback)).toBe(fallback);
    });

    test("returns a default value if the _FILE path is missing", () => {
        setVar("FLAG_FILE", missingFile());
        expect(env.orFile.boolean(PREFIX + "FLAG", false)).toBe(false);
    });

    test("calls a default getter only when needed", () => {
        const getter = mock(() => true);
        expect(env.orFile.boolean(PREFIX + "FLAG", getter)).toBe(true);
        expect(getter).toHaveBeenCalledTimes(1);

        getter.mockClear();
        expect(env.orFile.boolean(setVar("FLAG", "false"), getter)).toBe(false);
        expect(getter).not.toHaveBeenCalled();
    });
});

describe("env.orFile.booleanOptional", () => {
    test("returns the variable if set", () => {
        expect(env.orFile.booleanOptional(setVar("FLAG", "false"))).toBe(false);
    });

    test("prefers the variable over the _FILE variable", () => {
        setVar("FLAG_FILE", tempFile("true"));
        expect(env.orFile.booleanOptional(setVar("FLAG", "false"))).toBe(false);
    });

    test("reads the file named by the _FILE variable if the variable is unset", () => {
        setVar("FLAG_FILE", tempFile("true"));
        expect(env.orFile.booleanOptional(PREFIX + "FLAG")).toBe(true);
    });

    test("returns undefined if neither is set", () => {
        expect(env.orFile.booleanOptional(PREFIX + "FLAG")).toBeUndefined();
    });

    test("returns undefined if the _FILE path is missing", () => {
        setVar("FLAG_FILE", missingFile());
        expect(env.orFile.booleanOptional(PREFIX + "FLAG")).toBeUndefined();
    });

    test("throws TypeError if the variable is not a boolean", () => {
        expect(() => env.orFile.booleanOptional(setVar("FLAG", "maybe"))).toThrow(TypeError);
    });

    test("throws TypeError if the file does not contain a boolean", () => {
        setVar("FLAG_FILE", tempFile("maybe"));
        expect(() => env.orFile.booleanOptional(PREFIX + "FLAG")).toThrow(TypeError);
    });
});
