# Tonium 💎

Tonium est un moteur de cohérence visuelle pour les projets front-end modernes (Next.js, Tailwind CSS, shadcn/ui). 

Il orchestre la direction artistique via un pivot chromatique **OKLCH**, garantit l'accessibilité (WCAG) et produit des artefacts exploitables par les développeurs et les agents IA.

## Caractéristiques

- **Pivot OKLCH** : Manipulation chromatique haute fidélité.
- **Audit de Contraste** : Détection automatique des risques d'accessibilité.
- **Ramps Tonales** : Génération de gammes harmonieuses de 50 à 950.
- **Artefacts Agents** : Génération de règles de design et de profils de marque pour les IA.
- **Interface Premium** : CLI interactive basée sur `@clack/prompts`.
- **Compatible MCP** : Prêt pour le Model Context Protocol.

## Installation

```bash
npm install
npm run build
```

## Utilisation

```bash
# Initialiser le projet et définir la marque
tonium init

# Analyser les couleurs et contrastes existants
tonium audit

# Appliquer le système et générer les artefacts
tonium apply
```

## Structure Générée

- `.tonium/` : Configuration interne, rapports d'audit et tokens JSON/CSS.
- `.agents/tonium/` : Guides de styles et règles de design pour les agents IA.

## Architecture

- `src/core/scanner` : Détection Framework & Styles.
- `src/core/color` : Moteur chromatique OKLCH & WCAG.
- `src/core/generator` : Production de tokens et d'artefacts Markdown.
- `src/mcp` : Définitions pour le Model Context Protocol.

---
*Propulsé par Tonium - Orchestrateur de Direction Artistique.*
