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

/** Every module a file reaches for: imports and re-exports in either quote, side-effect imports, import() and require(). */
function imports(path: string): string[] {
  const source = code(path);
  const found: string[] = [];
  for (const m of source.matchAll(/\b(?:import|export)\s+(?:[\w*\s{},$]+?\s+from\s*)?["']([^"']+)["']/g)) found.push(m[1]);
  for (const m of source.matchAll(/\b(?:import|require)\s*\(\s*(?:["']([^"']+)["'])?/g)) found.push(m[1] ?? "<computed>");
  return found;
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
    const pure = ["view/light.ts", "view/live.ts", "view/loop.ts", "view/rotation.ts", "view/reaction.ts", "view/cloud.ts", "view/hud.ts", "view/puppet.ts", "view/lips.ts", "view/palette.ts", "codec/codec.ts", "honesty/honesty.ts"];
    for (const name of pure) expect(imports(join(src, name)).filter((s) => s === "three" || s.startsWith("three/"))).toEqual([]);
  });
});

describe("banned calls", () => {
  // In the engine, the scope and the swatch nothing may read a clock, make randomness of its own, or touch the page.
  // An allow-list for Math, because a deny-list is always one name short.
  const MATH_ALLOWED = new Set(["floor", "abs", "min", "max", "trunc", "sign", "imul"]);
  const NEVER_IN_PURE = /\b(performance|Date|crypto|document|window|navigator|requestAnimationFrame|setTimeout|setInterval|localStorage|fetch)\b/;

  it("lets the engine, the scope and the swatch use nothing but arithmetic", () => {
    for (const path of files(src).filter((p) => /^(engine|scope|swatch)\//.test(relative(src, p)))) {
      const source = code(path);
      for (const m of source.matchAll(/\bMath\s*\.\s*(\w+)|\bMath\s*\[/g)) expect(MATH_ALLOWED.has(m[1] ?? ""), `${relative(src, path)} uses Math.${m[1] ?? "[…]"}`).toBe(true);
      expect(source, relative(src, path)).not.toMatch(NEVER_IN_PURE);
    }
  });

  it("keeps clocks and randomness out of everything between spikes and what the page says about them", () => {
    for (const name of ["view/light.ts", "view/live.ts", "view/reaction.ts", "view/cloud.ts", "view/hud.ts", "view/puppet.ts", "view/loop.ts", "view/rotation.ts", "view/lips.ts", "codec/codec.ts", "honesty/honesty.ts"]) {
      const source = code(join(src, name));
      expect(source, name).not.toMatch(/\bMath\s*\.\s*random\b|\bMath\s*\[/);
      expect(source, name).not.toMatch(NEVER_IN_PURE);
    }
  });

  it("would catch the ways round it", () => {
    const sneaky = ["import x from 'three'", 'export * from "../view/scene"', "await import('three')", "require(\"fs\")", "import(name)", "import 'side-effect'"];
    const seen = sneaky.map((line) => {
      const out: string[] = [];
      for (const m of line.matchAll(/\b(?:import|export)\s+(?:[\w*\s{},$]+?\s+from\s*)?["']([^"']+)["']/g)) out.push(m[1]);
      for (const m of line.matchAll(/\b(?:import|require)\s*\(\s*(?:["']([^"']+)["'])?/g)) out.push(m[1] ?? "<computed>");
      return out[0];
    });
    expect(seen).toEqual(["three", "../view/scene", "three", "fs", "<computed>", "side-effect"]);
    expect("const t = performance.now()").toMatch(NEVER_IN_PURE);
    expect("new Date().getTime()").toMatch(NEVER_IN_PURE);
    expect("Math['random']()").toMatch(/\bMath\s*\[/);
  });
});
