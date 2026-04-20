# Tonium 💎

**Tonium** est un orchestreur de design system et un moteur de cohérence visuelle conçu pour les projets front-end modernes (Next.js, Tailwind CSS, shadcn/ui). 

Il garantit l'alignement parfait entre votre vision créative, l'accessibilité réelle (WCAG) et l'implémentation technique, tout en fournissant une couche sémantique prête pour les agents d'intelligence artificielle (MCP).

---

## ✨ Points Forts

- 🎨 **Moteur Chromatique OKLCH** : Manipulation des couleurs dans l'espace perceptuel pour des contrastes parfaits et des teintes vibrantes.
- 📐 **Audit d'Accessibilité** : Analyse en temps réel des contrastes et détection automatique des vulnérabilités WCAG AA/AAA.
- 🔡 **Moteur Typographique** : Gestion intelligente des hiérarchies (Heading, Body, Mono) avec intégration Google Fonts automatique.
- 🤖 **IA-First** : Génère des artefacts de règles de design (`brand-system.md`, `design-rules.md`) optimisés en Anglais pour les agents IA.
- 🌐 **Multilingue (CLI)** : Interface interactive disponible en **Français** et **Anglais**.
- 🛠️ **Compatible MCP** : Serveur Model Context Protocol intégré pour connecter votre design à des outils comme Claude Desktop.

---

## 🚀 Installation

Tonium peut être installé globalement ou utilisé via vos gestionnaires de paquets préférés.

### npm
```bash
# Installation globale
npm install -g tonium

# Ou usage direct
npx tonium init
```

### pnpm
```bash
# Installation globale
pnpm add -g tonium

# Ou usage direct
pnpm dlx tonium init
```

### Bun
```bash
# Installation globale
bun add -g tonium

# Ou usage direct
bunx tonium init
```

### Yarn
```bash
# Installation globale
yarn global add tonium

# Ou usage direct
yarn dlx tonium init
```

---

## 📖 Utilisation

Le flux de travail avec Tonium est conçu pour être simple et progressif.

### 1. Initialisation
Démarrez votre projet Design System. Tonium scannera votre architecture (Next.js, Tailwind) et vous posera des questions sur votre identité de marque.
```bash
npx tonium init
```
*Note : C'est ici que vous choisirez la langue de l'interface (FR/EN) et vos préférences typographiques.*

### 2. Audit Visuel
Analysez vos fichiers CSS existants pour extraire les couleurs et vérifier les contrastes.
```bash
npx tonium audit
```

### 3. Application du Système
Générez les tokens (JSON/CSS) et les artefacts pour vos agents IA.
```bash
npx tonium apply
```

---

## 🏗️ Pour les Développeurs (Maintenance)

Si vous contribuez au projet ou souhaitez gérer vos propres releases :

```bash
# Lancer le script de release automatique
# (Détecte le type de version via les commits et gère le build/tagging)
npm run release

# Puis publier
git push --follow-tags
npm publish
```

---

## 🛠️ Structure du Projet

Tonium organise ses données de manière transparente à la racine de votre projet :

- **`.tonium/`** : 
  - `config.json` : Configuration centrale du design system (Version 1.0.1).
  - `tokens/` : Fichiers CSS et JSON contenant vos rampes de couleurs et variables font-family.
- **`.agents/tonium/`** : 
  - `brand-system.md` : Votre identité de marque expliquée aux IA (en Anglais).
  - `design-rules.md` : Les contraintes de design strictes pour vos agents codeurs (en Anglais).

---

## 💻 Compatibilité Système

Tonium est conçu pour fonctionner de manière agnostique sur les environnements suivants :
- **Windows** (PowerShell, CMD, Git Bash)
- **macOS** (zsh, bash)
- **Linux**

*Prérequis : Node.js v18.0.0 ou supérieur.*

---

## 🗺️ Roadmap

- [x] **Phase 1** : Moteur Couleur OKLCH & CLI de base.
- [x] **Phase 2** : i18n & Moteur Typographique.
- [ ] **Phase 3** : Enrichissement Sémantique via IA (OpenRouter).
- [ ] **Phase 4** : Serveur MCP complet et intégration de Skills.

---

## 📄 Licence

Distribué sous licence **Apache 2.0**. Toute œuvre dérivée doit impérativement inclure une mention et un lien vers le projet original **Tonium**, conformément aux termes du fichier `NOTICE`.

---
*Propulsé par Tonium - L'excellence visuelle pilotée par le code.*
