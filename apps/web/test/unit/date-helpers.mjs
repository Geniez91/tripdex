import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
export function loadDateUtility(name = "dates") {
  const module = { exports: {} };
  const source = readFileSync(
    new URL("../../app/utils/" + name + ".ts", import.meta.url),
    "utf8",
  );
  vm.runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    { module, exports: module.exports, require: () => loadDateUtility() },
  );
  return module.exports;
}
