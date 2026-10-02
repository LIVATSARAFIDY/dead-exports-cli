# Dead Exports CLI

## 1. Présentation

`dead-exports-cli` est un outil CLI développé en **Node.js + TypeScript** dont le but est de détecter les **exports TypeScript qui ne sont jamais utilisés/importés ailleurs dans le projet**.

Le projet est actuellement développé comme un **projet portfolio**.

L'objectif principal est d'avoir un outil fiable capable de comprendre les relations d'exports/imports TypeScript en utilisant la **sémantique TypeScript via ts-morph**, et non une simple recherche textuelle.

---

# 2. Stack technique

- Node.js
- TypeScript
- ts-morph `28.0.0`
- Commander
- Chalk
- Vitest `4.1.11`

Installation vérifiée :

```bash
npm list ts-morph
```

Résultat actuel :

```text
ts-morph@28.0.0
```

Vitest :

```text
vitest/4.1.11
```

---

# 3. Structure actuelle

```text
dead-exports-cli/
├── src/
│   ├── analyzer.ts
│   ├── references.ts
│   ├── types.ts
│   └── cli.ts
│
├── tests/
│   └── analyzer.test.ts
│
├── fixture/
│   ├── direct-import/
│   ├── barrel/
│   ├── barrel-alias/
│   ├── barrel-star/
│   ├── barrel-chain/
│   ├── dead-barrel/
│   ├── export-star-1/
│   ├── export-star-2/
│   ├── export-star-3/
│   ├── export-star-4/
│   ├── export-default-1/
│   ├── export-default-2/
│   ├── export-default-3/
│   ├── export-default-4/
│   ├── export-default-5/
│   ├── export-local-1/
│   ├── export-local-2/
│   ├── export-variable-1/
│   ├── export-variable-2/
│   ├── export-variable-3/
│   └── export-variable-5/
│
├── dist/
├── node_modules/
├── package.json
├── package-lock.json
├── tsconfig.json
└── tsconfig.test.json
```

---

# 4. Principe général de fonctionnement

Le fonctionnement est actuellement :

```text
tsconfig.json
      ↓
   ts-morph
      ↓
 récupération des SourceFiles
      ↓
 getExportedDeclarations()
      ↓
 identification des déclarations exportées
      ↓
 findReferencesAsNodes()
      ↓
 analyse des références
      ↓
 distinction :
   ├── usage
   └── re-export
      ↓
 construction des ExportChain
      ↓
 usages.length === 0
      ↓
 export considéré comme inutilisé
```

Le principe important est :

> Un export est considéré comme inutilisé uniquement lorsqu'aucune utilisation réelle n'est trouvée.

La stratégie est volontairement conservatrice :

> Il vaut mieux avoir un faux négatif qu'un faux positif.

---

# 5. Architecture du code

## `src/types.ts`

Définit les principaux types utilisés par l'analyse.

```ts
export type ReferenceKind =
  | "usage"
  | "re-export";
```

Une référence analysée :

```ts
export interface ReferenceAnalysis {
  kind: ReferenceKind;
  filePath: string;
  line: number;
  text: string;
  originalName?: string;
  exportedName?: string;
}
```

Un re-export :

```ts
export interface ReExportInfo {
  filePath: string;
  line: number;
  originalName: string;
  exportedName: string;
}
```

Un résultat final :

```ts
export interface UnusedExport {
  filePath: string;
  name: string;
  kind: string;
  line: number;
  reExports: ReExportInfo[];
}
```

Une chaîne d'export :

```ts
export interface ExportChain {
  declaration: Node;
  declarationFilePath: string;
  name: string;
  kind: string;
  line: number;
  reExports: ReferenceAnalysis[];
  usages: ReferenceAnalysis[];
}
```

---

# 6. `src/references.ts`

Ce fichier est responsable de l'analyse des références d'une déclaration.

La fonction principale est :

```ts
analyzeReferences(
  declaration: ReferenceFindableNode,
  declarationFilePath: string
)
```

Elle utilise :

```ts
declaration.findReferencesAsNodes()
```

pour demander à TypeScript où une déclaration est réellement référencée.

Important :

Les références situées dans le même fichier que la déclaration sont actuellement ignorées :

```ts
if (filePath === declarationFilePath) {
  continue;
}
```

Ensuite, le code vérifie si la référence se trouve dans un :

```ts
ExportSpecifier
```

Si oui, elle est classée comme :

```text
re-export
```

Sinon :

```text
usage
```

---

# 7. Gestion des aliases

Le système distingue :

```ts
export {
  unusedFunction as unusedPublicFunction
} from "./utils.js";
```

entre :

```text
originalName:
unusedFunction

exportedName:
unusedPublicFunction
```

Le résultat peut donc indiquer :

```text
unusedFunction → unusedPublicFunction
```

Cela permet de conserver la différence entre le nom réel de la déclaration et son nom public.

---

# 8. `src/analyzer.ts`

Le rôle principal de `analyzer.ts` est de construire les chaînes d'exports.

La fonction publique principale :

```ts
analyze(options)
```

retourne :

```ts
UnusedExport[]
```

Elle appelle :

```ts
analyzeExportChains(options)
```

puis conserve uniquement les chaînes qui n'ont aucune utilisation :

```ts
.filter((chain) => chain.usages.length === 0)
```

---

# 9. Export chains

Le système ne considère pas seulement l'export directement présent dans le fichier d'origine.

Exemple :

```text
utils.ts
   ↓
index.ts
   ↓
public-api.ts
   ↓
app.ts
```

Si `app.ts` utilise l'export :

```text
utils.ts → index.ts → public-api.ts → app.ts
```

alors l'export est considéré comme utilisé.

Si aucune utilisation finale n'existe, il peut être déclaré inutilisé avec les différents re-exports de la chaîne.

---

# 10. Barrels

Les barrels sont supportés.

Exemple :

```ts
export {
  usedFunction,
  unusedFunction
} from "./utils.js";
```

Le système sait déterminer que :

```text
usedFunction
```

est utilisée et que :

```text
unusedFunction
```

ne l'est pas.

Les barrels avec aliases sont également supportés.

---

# 11. `export *`

Les re-exports de type :

```ts
export * from "./utils.js";
```

sont également gérés.

Le traitement est réalisé dans :

```ts
analyzeStarReExports()
```

Le système peut suivre plusieurs niveaux :

```text
utils.ts
   ↓ export *
index.ts
   ↓ export *
public-api.ts
   ↓
app.ts
```

Il gère également les cas où une déclaration est exposée par plusieurs chemins `export *`.

---

# 12. Exports default

Les exports default suivants ont été testés.

### Fonction nommée

```ts
export default function usedFunction() {}
```

### Classe

```ts
export default class UserService {}
```

### Re-export default

```ts
export { default } from "./utils.js";
```

### Re-export default avec alias

```ts
export {
  default as publicFunction
} from "./utils.js";
```

### Export local puis default

```ts
function usedFunction() {}

export default usedFunction;
```

Ces cas ont été validés manuellement.

---

# 13. Exports locaux

Les exports locaux sont supportés.

Exemple :

```ts
function usedFunction() {}

function unusedFunction() {}

export {
  usedFunction,
  unusedFunction
};
```

Le système comprend que l'exportation d'une déclaration locale ne signifie pas automatiquement qu'elle est utilisée.

Si seule `usedFunction` est importée ailleurs :

```text
usedFunction       → utilisée
unusedFunction     → inutilisée
```

---

# 14. Aliases sur exports locaux

Cas supporté :

```ts
function usedFunction() {}
function unusedFunction() {}

export {
  usedFunction as publicFunction,
  unusedFunction as oldFunction
};
```

Si :

```ts
import { publicFunction } from "./utils.js";
```

alors :

```text
usedFunction → utilisée
unusedFunction → inutilisée
```

Si rien n'est importé, les deux exports sont correctement considérés comme inutilisés.

---

# 15. Variables exportées

Les types suivants ont été testés :

```ts
export const API_URL = "...";
export const UNUSED_VALUE = "...";
```

ainsi que :

```ts
export let counter = 0;
export var oldValue = 10;
```

Le système détecte correctement les variables inutilisées.

Les variables peuvent également être utilisées via leurs propriétés :

```ts
export const config = {
  apiUrl: "..."
};
```

puis :

```ts
config.apiUrl
```

Le système considère correctement `config` comme utilisé.

---

# 16. Fixtures de tests

Le projet utilise des petites fixtures TypeScript indépendantes.

Chaque fixture possède son propre :

```text
tsconfig.json
```

Exemple :

```text
fixture/direct-import/
├── tsconfig.json
└── src/
    ├── utils.ts
    └── app.ts
```

Cela permet de tester de vrais projets TypeScript plutôt que de simuler les fichiers avec de simples chaînes de caractères.

C'est un choix important du projet.

---

# 17. Fixtures déjà validées

Les familles suivantes ont déjà été testées manuellement.

## Imports directs

```text
direct-import
```

## Barrels

```text
barrel
barrel-alias
barrel-star
barrel-chain
dead-barrel
```

## Export stars

```text
export-star-1
export-star-2
export-star-3
export-star-4
```

Ces fixtures couvrent notamment :

- plusieurs niveaux de `export *`
- plusieurs chemins d'exposition
- export utilisé
- export complètement mort

## Export default

```text
export-default-1
export-default-2
export-default-3
export-default-4
export-default-5
```

## Exports locaux

```text
export-local-1
export-local-2
```

## Variables

```text
export-variable-1
export-variable-2
export-variable-3
export-variable-5
```

---

# 18. Prochaine famille à implémenter

La prochaine famille fonctionnelle prévue est :

```text
interface
type alias
```

Première fixture prévue :

```text
fixture/export-interface-1/
├── tsconfig.json
└── src/
    ├── types.ts
    └── app.ts
```

`types.ts` :

```ts
export interface User {
  name: string;
}

export interface UnusedUser {
  id: number;
}
```

`app.ts` :

```ts
import type { User } from "./types.js";

const user: User = {
  name: "John",
};
```

Résultat attendu :

```text
UnusedUser
```

Si `app.ts` est vide :

```text
User
UnusedUser
```

Le but est ensuite de tester :

- interfaces
- type aliases
- unions
- intersections
- `extends`
- types dans les signatures de fonctions
- imports `type`
- re-exports de types
- barrels de types

---

# 19. Tests automatisés avec Vitest

Vitest vient d'être introduit dans le projet.

Installation :

```bash
npm install --save-dev vitest
```

Le script suivant a été ajouté au `package.json` :

```json
"test": "vitest run"
```

Les tests sont placés dans :

```text
tests/
```

et non dans :

```text
src/
```

C'est volontaire.

---

# 20. Configuration TypeScript

Le `tsconfig.json` principal reste dédié à la production :

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "types": ["node"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": false,
    "sourceMap": false
  },
  "include": ["src/**/*.ts"]
}
```

Un `tsconfig.test.json` est utilisé pour les tests afin de ne pas mélanger le code de production et les tests.

Configuration :

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "rootDir": ".",
    "types": ["node", "vitest/globals"]
  },
  "include": [
    "src/**/*.ts",
    "tests/**/*.ts"
  ]
}
```

Important :

Les fixtures ne sont pas incluses dans le `tsconfig.test.json`.

Elles possèdent leur propre configuration TypeScript.

---

# 21. Premier test Vitest

Le premier test automatisé se trouve actuellement dans :

```text
tests/analyzer.test.ts
```

Il utilise :

```ts
describe()
it()
expect()
```

Exemple actuel :

```ts
import { describe, it, expect } from "vitest";
import path from "node:path";

import { analyze } from "../src/analyzer.js";

describe("analyze", () => {
  it("détecte un export inutilisé", () => {
    const tsconfigPath = path.resolve(
      "fixture/direct-import/tsconfig.json"
    );

    const results = analyze({
      tsConfigFilePath: tsconfigPath,
    });

    expect(results).toHaveLength(1);

    expect(results[0]).toMatchObject({
      name: "unusedFunction",
      kind: "FunctionDeclaration",
      line: 5,
      reExports: [],
    });
  });
});
```

Le test est actuellement vert.

Commande :

```bash
npm test
```

Résultat actuel :

```text
Test Files  1 passed (1)
Tests       1 passed (1)
```

---

# 22. Tests paramétrés

La prochaine étape des tests Vitest est d'utiliser :

```ts
it.each()
```

L'idée est d'éviter de copier-coller le même test pour chaque fixture.

Exemple :

```ts
const testCases = [
  {
    fixture: "direct-import",
    expected: ["unusedFunction"],
  },
  {
    fixture: "barrel",
    expected: ["unusedFunction"],
  },
];
```

Puis :

```ts
it.each(testCases)(
  "détecte correctement les exports inutilisés dans $fixture",
  ({ fixture, expected }) => {
    // analyse
  }
);
```

Cela permettra d'exécuter automatiquement toute la batterie de fixtures.

---

# 23. Philosophie des tests

Le projet doit privilégier des tests basés sur de **vrais petits projets TypeScript**.

Il ne faut pas remplacer les fixtures par de simples recherches textuelles.

Le but de `dead-exports-cli` est justement de tester les relations sémantiques TypeScript.

Les tests doivent donc vérifier le comportement réel de :

```text
TypeScript
+
ts-morph
+
analyzer
```

---

# 24. Ce qu'il ne faut pas faire

## Ne pas analyser les imports avec des regex

Exemple à éviter :

```ts
source.includes("unusedFunction")
```

Ce n'est pas suffisamment fiable.

## Ne pas considérer un export comme utilisé simplement parce qu'il est re-exporté

Un re-export :

```ts
export { foo } from "./utils.js";
```

ne signifie pas que `foo` est réellement consommé par l'application.

Il faut distinguer :

```text
re-export
```

et :

```text
usage
```

## Ne pas modifier l'analyzer sans test

Avant d'ajouter une nouvelle fonctionnalité :

1. créer une fixture
2. définir le résultat attendu
3. ajouter le test
4. constater l'échec si nécessaire
5. modifier l'analyzer
6. vérifier que le test passe
7. vérifier que les anciens tests passent toujours

---

# 25. CLI

Le CLI actuel peut être lancé avec :

```bash
node dist/cli.js chemin/vers/tsconfig.json
```

Options :

```text
-i, --ignore <patterns...>
--json
```

Le CLI retourne :

```text
0 → aucun export inutilisé
1 → exports inutilisés détectés
2 → erreur d'analyse
```

L'affichage humain indique notamment :

```text
✘ X exports inutilisés détectés
```

et présente :

- nom de l'export
- fichier
- ligne
- re-exports
- aliases

Le mode JSON utilise :

```ts
JSON.stringify(results, null, 2)
```

---

# 26. État actuel du projet

## Fonctionnel

- [x] Analyse des exports TypeScript
- [x] Imports directs
- [x] Références sémantiques via ts-morph
- [x] Barrels
- [x] Barrels avec aliases
- [x] `export *`
- [x] chaînes de re-exports
- [x] plusieurs chemins `export *`
- [x] exports default
- [x] exports locaux
- [x] aliases
- [x] `const`
- [x] `let`
- [x] `var`
- [x] objets exportés
- [x] détection des usages via propriétés
- [x] distinction usage / re-export
- [x] CLI
- [x] codes de sortie
- [x] mode JSON
- [x] ignore patterns
- [x] premières bases de tests Vitest

## En cours

- [ ] Automatiser toutes les fixtures existantes avec Vitest
- [ ] Tests paramétrés avec `it.each()`

## À faire ensuite

- [ ] Interfaces
- [ ] Type aliases
- [ ] Unions
- [ ] Intersections
- [ ] `extends`
- [ ] usages de types dans signatures
- [ ] imports `type`
- [ ] re-exports de types
- [ ] barrels de types
- [ ] cas limites TypeScript
- [ ] tests CLI
- [ ] éventuellement tests des codes de sortie
- [ ] éventuellement tests du format JSON

---

# 27. Prochaine étape immédiate

Ne pas modifier le moteur d'analyse pour l'instant.

Continuer les tests Vitest avec les fixtures déjà validées.

Première cible :

```text
direct-import
barrel
barrel-alias
barrel-star
barrel-chain
dead-barrel
```

Créer un tableau de scénarios :

```ts
const testCases = [
  {
    fixture: "direct-import",
    expected: ["unusedFunction"],
  },
  // ...
];
```

puis utiliser :

```ts
it.each(testCases)
```

Une fois cette mécanique maîtrisée, ajouter les autres familles.

---

# 28. Commandes utiles

Installer les dépendances :

```bash
npm install
```

Lancer les tests :

```bash
npm test
```

Lancer Vitest en mode watch :

```bash
npx vitest
```

Compiler :

```bash
npm run build
```

Lancer le CLI compilé :

```bash
node dist/cli.js fixture/direct-import/tsconfig.json
```

Vérifier ts-morph :

```bash
npm list ts-morph
```

---

# 29. Règle de développement actuelle

Le projet est développé de manière incrémentale.

Pour chaque nouvelle fonctionnalité :

```text
Fixture
   ↓
Test attendu
   ↓
Test échoue éventuellement
   ↓
Implémentation
   ↓
Test passe
   ↓
Régression sur toute la suite
```

Il faut éviter les gros changements non nécessaires.

La priorité est la **fiabilité de la détection**, avec une préférence explicite pour les faux négatifs plutôt que les faux positifs.

# 30. Limitations connues

Le projet est encore en développement. Les limitations ci-dessous sont connues et doivent être prises en compte avant de considérer l'outil comme un analyseur exhaustif de dead code TypeScript.

## 30.1 Analyse limitée aux exports

L'objectif actuel est de détecter les **exports inutilisés**.

L'outil ne cherche pas encore à détecter :

- les fonctions locales inutilisées ;
- les variables locales inutilisées ;
- les classes locales inutilisées ;
- les imports inutilisés ;
- les fichiers complètement inutilisés ;
- les paramètres inutilisés.

Exemple :

```ts
function neverUsed() {
  // ...
}
```

Si cette fonction n'est jamais exportée, elle n'entre actuellement pas dans le périmètre de l'analyse.

---

## 30.2 Analyse dépendante de la compréhension TypeScript

La détection repose sur le système de références de TypeScript via `ts-morph`.

Cela signifie que le résultat dépend de la capacité de TypeScript à comprendre correctement le projet analysé.

Les cas où la résolution des modules ou des types échoue peuvent donc entraîner des résultats incomplets.

---

## 30.3 Configuration TypeScript requise

L'analyse utilise un fichier :

```text
tsconfig.json
```

Le CLI attend donc un projet TypeScript correctement configuré.

Les projets avec une configuration TypeScript incorrecte, incomplète ou inhabituelle peuvent produire des résultats incomplets ou une erreur d'analyse.

---

## 30.4 JavaScript non pris en charge comme cible principale

Le projet est conçu pour analyser les exports TypeScript.

Les cas impliquant principalement des fichiers JavaScript (`.js`, `.jsx`) ne constituent pas actuellement une cible de test prioritaire.

---

## 30.5 Dynamic imports et accès dynamiques

Les utilisations qui ne peuvent pas être déterminées statiquement par TypeScript peuvent être difficiles ou impossibles à détecter.

Par exemple :

```ts
const moduleName = "./utils.js";

await import(moduleName);
```

ou des accès construits dynamiquement.

L'analyse actuelle repose sur les références statiques connues de TypeScript.

---

## 30.6 Reflection et métaprogrammation

Les usages indirects d'un export via des mécanismes dynamiques ne sont pas nécessairement détectés.

Par exemple :

```ts
const name = "myFunction";

someObject[name]();
```

Si la relation entre `name` et l'export n'est pas résolue statiquement par TypeScript, l'analyse peut considérer l'export comme inutilisé.

---

## 30.7 Frameworks et conventions externes

Certains frameworks utilisent des conventions où le simple fait d'exporter un symbole peut avoir une signification particulière.

Exemples possibles :

- fichiers de routes ;
- composants découverts automatiquement ;
- plugins ;
- systèmes basés sur des conventions de nommage ;
- métadonnées utilisées par un framework ;
- code chargé automatiquement au runtime.

Dans ces situations, un export peut être volontairement inutilisé du point de vue des imports TypeScript tout en étant réellement utilisé par l'application.

L'outil peut alors produire un faux positif.

---

## 30.8 Barrels complexes

Les cas classiques de :

```ts
export { foo } from "./foo.js";
```

et :

```ts
export * from "./foo.js";
```

sont actuellement couverts par les fixtures.

Cependant, les combinaisons extrêmement complexes de barrels, aliases, conflits de noms ou résolutions de modules doivent encore être couvertes progressivement par des tests.

---

## 30.9 Exports de types

La prise en charge des :

```ts
interface
type
```

est actuellement la prochaine famille fonctionnelle à couvrir complètement.

Les comportements liés à :

```ts
import type
export type
interface
type aliases
```

doivent donc encore faire l'objet d'une batterie de tests dédiée.

---

## 30.10 Ré-exports ≠ utilisations

Un point volontairement important de l'implémentation actuelle :

```ts
export { foo } from "./foo.js";
```

est considéré comme un **re-export**, pas comme une utilisation finale.

Ainsi, une chaîne comme :

```text
foo.ts
  ↓
index.ts
  ↓
public-api.ts
```

ne suffit pas à considérer `foo` comme utilisé.

Il faut qu'une véritable utilisation finale soit trouvée.

Cette distinction est fondamentale pour éviter de considérer un barrel complètement mort comme une utilisation réelle.

---

## 30.11 Préférence pour les faux négatifs

La règle actuelle est volontairement conservatrice :

```ts
chain.usages.length === 0
```

Un export est déclaré inutilisé lorsqu'aucune utilisation n'a été trouvée.

La philosophie du projet est :

> **Un faux négatif est préférable à un faux positif.**

Autrement dit, dans un cas ambigu, l'outil doit plutôt éviter de déclarer à tort qu'un export est mort.

---

## 30.12 L'outil ne supprime rien automatiquement

Le projet est actuellement un outil d'analyse.

Il ne modifie pas automatiquement le code source et ne supprime pas les exports détectés.

La suppression automatique pourrait être envisagée ultérieurement, mais elle nécessiterait une analyse beaucoup plus prudente afin d'éviter de casser l'API publique d'une application ou d'une librairie.

---

## 30.13 Pas encore de garantie de compatibilité avec tous les environnements

Le projet est actuellement développé et testé principalement autour de :

```text
Node.js
TypeScript
ts-morph
```

avec les fixtures présentes dans le repository.

La compatibilité avec des configurations très spécifiques de monorepos, project references, path aliases complexes, workspaces ou environnements de build particuliers devra être validée progressivement.

---

## 30.14 Les tests ne couvrent pas encore toutes les limitations

Les fixtures actuelles couvrent déjà de nombreux cas d'exports et de re-exports.

Cependant, la couverture automatisée avec Vitest vient seulement d'être mise en place.

La priorité immédiate est donc de transformer les fixtures déjà validées manuellement en tests automatisés, puis d'ajouter progressivement les cas limites.