#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import path from "node:path";
import { analyze } from "./analyzer.js";

interface CliOptions {
  ignore?: string[];
  json?: boolean;
}

const program = new Command();

program
  .name("dead-exports")
  .description(
    "Détecte les exports TypeScript jamais importés ailleurs dans le projet."
  )
  .argument("<tsconfig>", "Chemin vers le tsconfig.json du projet à analyser")
  .option(
    "-i, --ignore <patterns...>",
    "Sous-chaînes de chemin à ignorer (ex: index.ts main.ts)"
  )
  .option("--json", "Sortie au format JSON (utile en CI)")
  .action((tsconfigArg: string, opts: CliOptions) => {
    const tsConfigFilePath = path.resolve(process.cwd(), tsconfigArg);

    let results;
    try {
      results = analyze({ tsConfigFilePath, ignoreFiles: opts.ignore });
    } catch (err) {
      console.error(chalk.red(`Erreur lors de l'analyse : ${(err as Error).message}`));
      process.exitCode = 2;
      return;
    }

    if (opts.json) {
      console.log(JSON.stringify(results, null, 2));
      if (results.length > 0) process.exitCode = 1;
      return;
    }

    if (results.length === 0) {
      console.log(chalk.green("✔ Aucun export inutilisé détecté."));
      return;
    }

    const label =
      results.length === 1
        ? "export inutilisé détecté"
        : "exports inutilisés détectés";

    console.log(
      chalk.red(`✘ ${results.length} ${label} :\n`)
    );

    for (const r of results) {
      console.log(
        `  ${chalk.bold(r.name)}`
      );

      const declarationPath = path.relative(
        process.cwd(),
        r.filePath
      );

      console.log(
        `\n  déclaré dans :`
      );

      console.log(
        `    ${chalk.yellow(declarationPath)}:${r.line}`
      );

      if (r.reExports.length > 0) {
        console.log(
          `\n  ré-exporté par :`
        );

        for (const reExport of r.reExports) {
          const reExportPath = path.relative(
            process.cwd(),
            reExport.filePath
          );

          console.log(
            `    ${chalk.yellow(reExportPath)}:${reExport.line}`
          );

          if (
            reExport.originalName !==
            reExport.exportedName
          ) {
            console.log(
              `      ${chalk.dim(
                `${reExport.originalName} → ${reExport.exportedName}`
              )}`
            );
          }
        }
      }

      console.log();
    }

    console.log();
    process.exitCode = 1;
  });

program.parse();
