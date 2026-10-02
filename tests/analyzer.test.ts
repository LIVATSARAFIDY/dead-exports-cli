import { describe, it, expect } from "vitest";
import path from "node:path";

import { analyze } from "../src/analyzer.js";
import { Project } from "ts-morph";

const testCases = [
    {
        fixture: "direct-import",
        expected: ["unusedFunction"],
    },
    {
        fixture: "barrel",
        expected: ["unusedFunction"],
    },
    {
        fixture: "barrel-alias",
        expected: ["unusedFunction"],
    },
    {
        fixture: "barrel-star",
        expected: ["unusedFunction"],
    },
    {
        fixture: "barrel-chain",
        expected: ["unusedFunction"],
    },
    {
        fixture: "dead-barrel",
        expected: ["completelyUnused"],
    },
    {
        fixture: "export-star-1",
        expected: ["unusedFunction"],
    },
    {
        fixture: "export-star-2",
        expected: ["unusedFunction"],
    },
    {
        fixture: "export-star-3",
        expected: [],
    },
    {
        fixture: "export-star-4",
        expected: ["completelyUnused"],
    },
    {
        fixture: "export-default-1",
        expected: ["usedFunction"],
    },
    {
        fixture: "export-default-2",
        expected: ["UserService"],
    },
    {
        fixture: "export-default-3",
        expected: ["usedFunction"],
    },
    {
        fixture: "export-default-4",
        expected: ["usedFunction"],
    },
    {
        fixture: "export-default-5",
        expected: ["usedFunction"],
    },
    {
        fixture: "export-local-1",
        expected: ["unusedFunction"],
    },
    {
        fixture: "export-local-2",
        expected: ["usedFunction", "unusedFunction"],
    },
    {
        fixture: "export-variable-1",
        expected: ["API_URL", "UNUSED_VALUE"],
    },
    {
        fixture: "export-variable-2",
        expected: ["counter", "oldValue", "unusedCounter", "unusedValue"],
    },
    {
        fixture: "export-variable-3",
        expected: ["config", "unusedConfig"],
    },
    {
        fixture: "export-variable-5",
        expected: ["UNUSED_URL"],
    },
    {
        fixture: "interface-type",
        expected: ["UnusedInterface", "UnusedType"],
    },
    {
        fixture: "interface-type-usage",
        expected: ["UnusedInterface", "UnusedType"],
    },
];

describe("analyze", () => {
    it.each(testCases)(
        "détecte correctement les exports inutilisés dans $fixture",
        ({ fixture, expected }) => {
            const tsconfigPath = path.resolve(
                `fixture/${fixture}/tsconfig.json`
            );

            const results = analyze({
                tsConfigFilePath: tsconfigPath,
            });

            const actual = results
                .map((result) => result.name)
                .sort();

            expect(actual).toEqual([...expected].sort());
        }
    );
    it("identifie correctement un alias de re-export", () => {
        const tsconfigPath = path.resolve(
            "fixture/barrel-alias/tsconfig.json"
        );

        const results = analyze({
            tsConfigFilePath: tsconfigPath,
        });

        const unusedExport = results.find(
            (result) => result.name === "unusedFunction"
        );

        expect(unusedExport).toBeDefined();

        expect(unusedExport?.reExports).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    originalName: "unusedFunction",
                    exportedName: "unusedPublicFunction",
                }),
            ])
        );
    });
    it("identifie les différentes étapes d'une chaîne de re-exports", () => {
        const fixturePath = path.resolve("fixture/barrel-chain");

        const results = analyze({
            tsConfigFilePath: path.join(fixturePath, "tsconfig.json"),
        });

        const unusedExport = results.find(
            (result) => result.name === "unusedFunction"
        );

        expect(unusedExport).toBeDefined();

        const reExportPaths = unusedExport?.reExports.map(
            (reExport) => reExport.filePath.replace(/\\/g, "/")
        );

        expect(reExportPaths).toContain(
            path.join(fixturePath, "src", "index.ts").replace(/\\/g, "/")
        );

        expect(reExportPaths).toContain(
            path.join(fixturePath, "src", "public-api.ts").replace(/\\/g, "/")
        );
    });
});