# stale-exports

CLI qui détecte les exports TypeScript jamais importés ailleurs dans un projet — un export mort, oublié après un refactor, qui gonfle inutilement le bundle et complique la lecture du code.

Contrairement à une simple recherche texte, l'outil s'appuie sur le *language service* de TypeScript (via [ts-morph](https://ts-morph.com/)) pour résoudre les références réelles, y compris à travers les alias et les ré-exports.

## Installation

```bash
npm install
npm run build
```

## Usage

```bash
node dist/cli.js chemin/vers/tsconfig.json
```

### Options

| Option | Description |
|---|---|
| `-i, --ignore <patterns...>` | Sous-chaînes de chemin à exclure de l'analyse (ex: `index.ts`, `main.ts`) |
| `--json` | Sortie au format JSON, pratique en CI |

### Exemple

```bash
node dist/cli.js fixture/tsconfig.json
```

```
✘ 3 export(s) inutilisé(s) détecté(s) :

  src/utils.ts:5  FunctionDeclaration  unusedFunction
  src/utils.ts:9  VariableDeclaration  unusedConst
  src/utils.ts:11 InterfaceDeclaration UnusedInterface
```

Le code de sortie est `1` si des exports inutilisés sont trouvés, `0` sinon — utilisable directement pour bloquer une CI.

## Comment ça marche

1. Le projet TypeScript est chargé via `ts-morph` à partir de son `tsconfig.json`.
2. Pour chaque fichier, on récupère la liste de ses exports (`getExportedDeclarations`).
3. Pour chaque export, on cherche ses références réelles dans tout le projet (`findReferencesAsNodes`).
4. Si aucune référence ne provient d'un fichier différent de celui de la déclaration, l'export est considéré comme mort.

## Limites connues (MVP)

Ce projet est un MVP volontairement simple. Les cas suivants génèrent des faux positifs et sont documentés comme axes d'amélioration :

- **Barrel files** : un export ré-exporté via un `index.ts` puis utilisé ailleurs peut être mal détecté selon la structure.
- **Monorepos / workspaces** : les exports utilisés uniquement par un autre package du même monorepo ne sont pas résolus si celui-ci n'est pas inclus dans le même `tsconfig.json`.
- **Entry points** : un fichier jamais importé nulle part (ex: `main.ts` lancé directement) verra tous ses exports signalés à tort — utiliser `--ignore` en attendant.
- **Exports par défaut anonymes** (`export default { ... }`) : ignorés pour l'instant, faute de nom à rapporter proprement.
- **Tests** : les usages présents uniquement dans des fichiers de test comptent comme "utilisé", ce qui peut masquer du code mort en prod.

## Roadmap

- [ ] Détection des barrel files et résolution des ré-exports en chaîne
- [ ] Support des workspaces monorepo (plusieurs `tsconfig.json`)
- [ ] Mode `--fix` : suppression interactive du code mort
- [ ] Fichier de config `.deadexportsrc` (exclusions par glob)
- [ ] Cache incrémental pour les gros projets
- [ ] Sortie SARIF pour intégration GitHub Actions

## Stack technique

- TypeScript
- [ts-morph](https://ts-morph.com/) — manipulation d'AST TypeScript
- [commander](https://github.com/tj/commander.js) — parsing CLI
- [chalk](https://github.com/chalk/chalk) — sortie colorée



point  1
Je te propose qu'on fasse ça proprement dans ton projet actuel, sans réécrire inutilement le CLI :

identifier exactement ce que ts-morph retourne pour les références d'un ré-export ;
écrire une fonction de résolution des barrel files ;
gérer export { foo }, export { foo as bar } et export *;
gérer les chaînes de barrel files ;
ajouter plusieurs fixtures de régression ;
vérifier que les anciens tests continuent de passer ;
seulement ensuite optimiser si nécessaire.


fixture/
├── direct-import/
│   ├── src/
│   │   ├── utils.ts
│   │   └── app.ts
│   └── tsconfig.json
│
├── barrel/
│   ├── src/
│   │   ├── utils.ts
│   │   ├── index.ts
│   │   └── app.ts
│   └── tsconfig.json
│
├── barrel-alias/
│   ├── src/
│   │   ├── utils.ts
│   │   ├── index.ts
│   │   └── app.ts
│   └── tsconfig.json
│
├── barrel-star/
│   ├── src/
│   │   ├── utils.ts
│   │   ├── index.ts
│   │   └── app.ts
│   └── tsconfig.json
│
├── barrel-chain/
│   ├── src/
│   │   ├── utils.ts
│   │   ├── index.ts
│   │   ├── public-api.ts
│   │   └── app.ts
│   └── tsconfig.json
│
└── dead-barrel/
    ├── src/
    │   ├── utils.ts
    │   └── index.ts
    └── tsconfig.json