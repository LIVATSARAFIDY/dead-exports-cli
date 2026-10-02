
import { Node } from "ts-morph";

export type ReferenceKind =
    | "usage"
    | "re-export";

export interface ReExportInfo {
    filePath: string;
    line: number;
    originalName: string;
    exportedName: string;
}

export interface UnusedExport {
    filePath: string;
    name: string;
    kind: string;
    line: number;
    /**
   * Les fichiers qui ré-exportent cet export.
   */
    reExports: ReExportInfo[];
}

export interface ReferenceAnalysis {
    kind: ReferenceKind;
    filePath: string;
    line: number;
    text: string;
    originalName?: string;
    exportedName?: string;
}

export interface ExportAnalysis {
    declaration: Node;
    sourceFilePath: string;
    name: string;
    kind: string;
    line: number;
    references: ReferenceAnalysis[];
    used: boolean;
}

export interface ExportChain {
    /**
     * Déclaration originale du symbole.
     */
    declaration: Node;

    /**
     * Fichier contenant la déclaration originale.
     */
    declarationFilePath: string;

    /**
     * Nom sous lequel le symbole est exposé.
     */
    name: string;

    /**
     * Type syntaxique de la déclaration.
     */
    kind: string;

    /**
     * Ligne de la déclaration originale.
     */
    line: number;

    /**
     * Liste des fichiers qui ré-exportent ce symbole.
     */
    reExports: ReferenceAnalysis[];

    /**
     * Utilisations réelles du symbole.
     */
    usages: ReferenceAnalysis[];
}

export interface AnalyzeOptions {
    /**
     * Chemin absolu vers le tsconfig.json du projet à analyser.
     */
    tsConfigFilePath: string;

    /**
     * Sous-chaînes de chemin à ignorer.
     */
    ignoreFiles?: string[];
}

