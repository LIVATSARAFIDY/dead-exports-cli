
import {
  Node,
  Project,
  SourceFile,
  ReferenceFindableNode,
} from "ts-morph";

import {
  AnalyzeOptions,
  ExportChain,
  ReferenceAnalysis,
  UnusedExport,
} from "./types.js";

import {
  analyzeReferences,
} from "./references.js";

/**
 * Analyse le projet et retourne les exports réellement morts.
 *
 * Un symbole ré-exporté par plusieurs barrel files est regroupé
 * dans une seule ExportChain.
 */
export function analyze(
  options: AnalyzeOptions
): UnusedExport[] {
  const chains = analyzeExportChains(options);

  return chains
    .filter((chain) => chain.usages.length === 0)
    .map((chain) => ({
      filePath: chain.declarationFilePath,
      name: chain.name,
      kind: chain.kind,
      line: chain.line,
      reExports: chain.reExports.map((reference) => ({
        filePath: reference.filePath,
        line: reference.line,
        originalName: reference.originalName ?? reference.text,
        exportedName: reference.exportedName ?? reference.text,
      })),
    }))
    .sort((a, b) =>
      a.filePath.localeCompare(b.filePath)
    );
}

/**
 * Construit les chaînes d'exports du projet.
 */
export function analyzeExportChains(
  options: AnalyzeOptions
): ExportChain[] {
  const project = new Project({
    tsConfigFilePath: options.tsConfigFilePath,
  });

  const sourceFiles = project
    .getSourceFiles()
    .filter((sf) => !sf.isDeclarationFile());

  const chains = new Map<string, ExportChain>();

  for (const sourceFile of sourceFiles) {
    if (
      shouldIgnore(
        sourceFile.getFilePath(),
        options.ignoreFiles
      )
    ) {
      continue;
    }

    const exportedDeclarations =
      sourceFile.getExportedDeclarations();

    for (const [exportedName, declarations] of exportedDeclarations) {
      for (const declaration of declarations) {
        if (!Node.isReferenceFindable(declaration)) {
          continue;
        }

        const declarationSourceFile =
          declaration.getSourceFile();

        const declarationFilePath =
          declarationSourceFile.getFilePath();

        const declarationKey = createDeclarationKey(
          declarationSourceFile,
          declaration
        );

        let chain = chains.get(declarationKey);

        if (!chain) {
          chain = {
            declaration,
            declarationFilePath,
            name: getDeclarationName(declaration),
            kind: declaration.getKindName(),
            line: declaration.getStartLineNumber(),
            reExports: [],
            usages: [],
          };

          chains.set(declarationKey, chain);
        }

        const references = analyzeReferences(
          declaration,
          declarationFilePath
        );

        for (const reference of references) {
          if (reference.kind === "re-export") {
            addUniqueReference(
              chain.reExports,
              reference
            );
          } else {
            addUniqueReference(
              chain.usages,
              reference
            );
          }
        }
      }
    }
  }

  analyzeStarReExports(sourceFiles, chains);

  return Array.from(chains.values());
}

function analyzeStarReExports(
  sourceFiles: SourceFile[],
  chains: Map<string, ExportChain>
): void {
  for (const sourceFile of sourceFiles) {
    for (const exportDeclaration of sourceFile.getExportDeclarations()) {
      if (!exportDeclaration.isNamespaceExport()) {
        continue;
      }

      const targetSourceFile =
        exportDeclaration.getModuleSpecifierSourceFile();

      if (!targetSourceFile) {
        continue;
      }

      const exportedDeclarations =
        targetSourceFile.getExportedDeclarations();

      for (const [exportedName, declarations] of exportedDeclarations) {
        for (const declaration of declarations) {
          if (!Node.isReferenceFindable(declaration)) {
            continue;
          }

          const declarationSourceFile =
            declaration.getSourceFile();

          const declarationFilePath =
            declarationSourceFile.getFilePath();

          const declarationKey = createDeclarationKey(
            declarationSourceFile,
            declaration
          );

          const chain = chains.get(declarationKey);

          if (!chain) {
            continue;
          }

          addUniqueReference(
            chain.reExports,
            {
              kind: "re-export",
              filePath: sourceFile.getFilePath(),
              line: exportDeclaration.getStartLineNumber(),
              text: exportedName,
              originalName: getDeclarationName(declaration),
              exportedName,
            }
          );
        }
      }
    }
  }
}


/**
 * Crée une identité stable pour une déclaration.
 *
 * On utilise le fichier + position dans le fichier plutôt
 * que le nom, car plusieurs fichiers peuvent déclarer un
 * symbole portant le même nom.
 */
function createDeclarationKey(
  sourceFile: SourceFile,
  declaration: Node
): string {
  return `${sourceFile.getFilePath()}:${declaration.getStartLineNumber()}:${declaration.getKindName()}:${declaration.getText()}`;
}

/**
 * Évite les doublons dans les références.
 */
function addUniqueReference(
  references: ReferenceAnalysis[],
  reference: ReferenceAnalysis
): void {
  const exists = references.some(
    (existing) =>
      existing.kind === reference.kind &&
      existing.filePath === reference.filePath &&
      existing.line === reference.line &&
      existing.originalName === reference.originalName &&
      existing.exportedName === reference.exportedName
  );

  if (!exists) {
    references.push(reference);
  }
}

function shouldIgnore(
  filePath: string,
  patterns?: string[]
): boolean {
  if (!patterns || patterns.length === 0) {
    return false;
  }

  return patterns.some((pattern) =>
    filePath.includes(pattern)
  );
}

function getDeclarationName(declaration: Node): string {
  if (Node.isFunctionDeclaration(declaration)) {
    return declaration.getName() ?? "<anonymous>";
  }

  if (Node.isClassDeclaration(declaration)) {
    return declaration.getName() ?? "<anonymous>";
  }

  if (Node.isInterfaceDeclaration(declaration)) {
    return declaration.getName();
  }

  if (Node.isTypeAliasDeclaration(declaration)) {
    return declaration.getName();
  }

  if (Node.isEnumDeclaration(declaration)) {
    return declaration.getName();
  }

  if (Node.isVariableDeclaration(declaration)) {
    return declaration.getName();
  }

  return declaration.getText();
}

