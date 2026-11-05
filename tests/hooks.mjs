// Lets Node run the app's plain logic files directly: resolves the `@/` alias and extensionless imports.
// Run every test with: node --import ./tests/hooks.mjs --test "tests/*.test.mts"
import { existsSync } from 'node:fs';
import { registerHooks } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const src = path.resolve(fileURLToPath(new URL('../src', import.meta.url)));

registerHooks({
  resolve(specifier, context, nextResolve) {
    const relative = specifier.startsWith('.') && context.parentURL?.startsWith('file:');
    if (specifier.startsWith('@/') || relative) {
      const base = specifier.startsWith('@/') ? path.join(src, specifier.slice(2)) : path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
      const found = [`${base}.ts`, `${base}.tsx`].find((f) => existsSync(f));
      if (found) return { url: pathToFileURL(found).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
