import {
    Node,
    ReferenceFindableNode,
} from "ts-morph";

import {
    ReferenceAnalysis,
} from "./types.js";

export function analyzeReferences(
    declaration: ReferenceFindableNode,
    declarationFilePath: string
): ReferenceAnalysis[] {
    const references: ReferenceAnalysis[] = [];

    for (const reference of declaration.findReferencesAsNodes()) {
        const sourceFile = reference.getSourceFile();
        const filePath = sourceFile.getFilePath();

        if (
            filePath === declarationFilePath &&
            !isInternalTypeUsage(reference)
        ) {
            continue;
        }

        const exportSpecifier = findExportSpecifier(reference);

        if (exportSpecifier) {
            const originalName = getOriginalName(exportSpecifier);
            const exportedName = getExportedName(exportSpecifier);

            references.push({
                kind: "re-export",
                filePath,
                line: exportSpecifier.getStartLineNumber(),
                text: exportedName,
                originalName,
                exportedName,
            });

            continue;
        }

        const exportDeclaration = findExportStarDeclaration(reference);

        if (exportDeclaration) {
            const originalName = reference.getText();

            references.push({
                kind: "re-export",
                filePath,
                line: exportDeclaration.getStartLineNumber(),
                text: originalName,
                originalName,
                exportedName: originalName,
            });

            continue;
        }

        references.push({
            kind: "usage",
            filePath,
            line: reference.getStartLineNumber(),
            text: reference.getText(),
        });
    }

    return deduplicateReferences(references);
}

function findExportSpecifier(
    reference: Node
): Node | undefined {
    let current: Node | undefined = reference;

    while (current) {
        if (Node.isExportSpecifier(current)) {
            return current;
        }

        current = current.getParent();
    }

    return undefined;
}

function findExportStarDeclaration(
    reference: Node
): Node | undefined {
    let current: Node | undefined = reference;

    while (current) {
        if (
            Node.isExportDeclaration(current) &&
            current.isNamespaceExport()
        ) {
            return current;
        }

        current = current.getParent();
    }

    return undefined;
}

function getOriginalName(
    exportSpecifier: Node
): string {
    if (!Node.isExportSpecifier(exportSpecifier)) {
        return exportSpecifier.getText();
    }

    return exportSpecifier.getNameNode().getText();
}

function getExportedName(
    exportSpecifier: Node
): string {
    if (!Node.isExportSpecifier(exportSpecifier)) {
        return exportSpecifier.getText();
    }

    const aliasNode = exportSpecifier.getAliasNode();

    if (aliasNode) {
        return aliasNode.getText();
    }

    return exportSpecifier.getNameNode().getText();
}


function deduplicateReferences(
    references: ReferenceAnalysis[]
): ReferenceAnalysis[] {
    const unique = new Map<string, ReferenceAnalysis>();

    for (const reference of references) {
        const key = [
            reference.kind,
            reference.filePath,
            reference.line,
            reference.originalName,
            reference.exportedName,
            reference.text,
        ].join(":");

        if (!unique.has(key)) {
            unique.set(key, reference);
        }
    }

    return Array.from(unique.values());
}

function isInternalTypeUsage(reference: Node): boolean {
    let current: Node | undefined = reference;

    while (current) {
        if (
            Node.isExpressionWithTypeArguments(current) ||
            Node.isTypeReference(current) ||
            Node.isTypeQuery(current)
        ) {
            return true;
        }

        current = current.getParent();
    }

    return false;
}