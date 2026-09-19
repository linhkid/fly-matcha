// Seams inside the one web package, enforced (CONTRACTS.md, "Target layout"), and the calls that are banned where spikes become light.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const src = new URL("../src/", import.meta.url).pathname;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : path.endsWith(".ts") ? [path] : [];
  });
}

/** A file's code with comments removed, so that a comment may name the rule it obeys. */
function code(path: string): string {
  return readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

function imports(path: string): string[] {
  return [...readFileSync(path, "utf8").matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]);
}

describe("import boundaries", () => {
  it("keeps the engine, the scope and the swatch free of the DOM, three.js and every other folder", () => {
    for (const folder of ["engine", "scope", "swatch"]) {
      for (const path of files(src).filter((p) => relative(src, p).startsWith(`${folder}/`))) {
        for (const spec of imports(path)) expect(spec.startsWith("./"), `${relative(src, path)} imports ${spec}`).toBe(true);
      }
    }
  });

  it("keeps three.js out of everything that must stay pure", () => {
    const pure = ["view/light.ts", "view/loop.ts", "view/rotation.ts", "view/reaction.ts", "view/cloud.ts", "codec/codec.ts", "honesty/honesty.ts"];
    for (const name of pure) expect(imports(join(src, name)).filter((s) => s === "three" || s.startsWith("three/"))).toEqual([]);
  });
});

describe("banned calls", () => {
  it("has no randomness where spikes become light, and no clock or transcendental in the engine", () => {
    const rules: [RegExp, RegExp][] = [
      [/^(engine|scope|swatch)\//, /Math\.random|Math\.exp|Math\.fround|Date\.now/],
      [/^view\/(light|reaction|cloud)\.ts$/, /Math\.random|Date\.now/],
    ];
    for (const path of files(src)) {
      for (const [where, banned] of rules) {
        if (where.test(relative(src, path))) expect(code(path), relative(src, path)).not.toMatch(banned);
      }
    }
  });
});
