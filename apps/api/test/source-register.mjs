// Test-only source execution: no application build and no generated JS files.
import { registerHooks } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import ts from 'typescript';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && specifier.endsWith('.js') && context.parentURL?.includes('/src/')) {
      const url = new URL(specifier.slice(0, -3) + '.ts', context.parentURL);
      if (existsSync(url)) return { url: url.href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith('.ts') && url.includes('/src/')) {
      return { format: 'module', shortCircuit: true,
        source: ts.transpileModule(readFileSync(new URL(url), 'utf8'), { compilerOptions: {
          module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022,
          experimentalDecorators: true, emitDecoratorMetadata: true,
        } }).outputText };
    }
    return nextLoad(url, context);
  },
});
