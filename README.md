# Tonium 💎

**Tonium** est un orchestreur de design system et un moteur de cohérence visuelle conçu pour les projets front-end modernes (Next.js, Tailwind CSS, shadcn/ui).

Il garantit l'alignement parfait entre votre vision créative, l'accessibilité réelle (WCAG) et l'implémentation technique, tout en fournissant une couche sémantique prête pour les agents d'intelligence artificielle (MCP).

---

## ✨ Points Forts

- 🎨 **Moteur Chromatique OKLCH** : Manipulation des couleurs dans l'espace perceptuel pour des contrastes parfaits et des teintes vibrantes.
- 📐 **Audit d'Accessibilité** : Analyse en temps réel des contrastes et détection automatique des vulnérabilités WCAG AA/AAA.
- 🔡 **Moteur Typographique Intelligent** : Détecte et respecte les polices existantes (next/font/google), ne force jamais de fallbacks non désirés.
- 🤖 **IA-First** : Génère des artefacts de règles de design (`brand-system.md`, `design-rules.md`, `AGENTS.md`) optimisés en Anglais pour les agents IA.
- 🌐 **Multilingue (CLI)** : Interface interactive disponible en **Français** et **Anglais**.
- 🛠️ **Compatible MCP** : Serveur Model Context Protocol intégré pour connecter votre design à des outils comme Claude Desktop.
- 🎯 **Détection de Projet** : Scanne automatiquement `app/layout.tsx` et `app/globals.css` pour comprendre l'existant avant de modifier.

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

Le flux de travail avec Tonium est conçu pour détecter, respecter, puis corriger votre projet.

### 1. Initialisation
Tonium scanne votre projet (Next.js, Tailwind, polices existantes) et vous pose des questions sur votre identité de marque.
```bash
npx tonium init
```

**Nouveau en V1.2 :**
- Détection des polices existantes dans `app/layout.tsx` et `app/globals.css`
- Option de conservation des polices détectées
- Palette de marque (plusieurs couleurs) au lieu d'une seule couleur primaire
- Choix du format de sortie (HEX, RGB, HSL, OKLCH)

### 2. Application du Système
Tonium modifie vos fichiers sources actifs et génère les artefacts pour les agents IA.
```bash
npx tonium apply
```

**Ce que fait `apply` en V1.2 :**
- Met à jour `app/globals.css` avec les tokens couleur
- Modifie `app/layout.tsx` seulement si les polices changent
- Génère les artefacts agents dans `.agents/tonium/`
- Crée/met à jour `AGENTS.md` à la racine
- Génère le skill standard sous `.agents/skills/chromatic-design/`

### 3. Audit
Tonium analyse vos styles actifs, détecte les couleurs (hex, rgb, hsl, oklch), puis écrit systématiquement les rapports d'audit.
```bash
npx tonium audit
```

**Contrat des commandes :**
- `init` : initialise la configuration, la détection projet et les dossiers Tonium.
- `audit` : lit l'existant et écrit `.tonium/reports/audit.json` + `.tonium/reports/audit.md`.
- `apply` : génère les tokens primitifs + sémantiques, met à jour le CSS actif, puis génère les artefacts agents.

---

## 🛠 Détection du projet

Tonium analyse automatiquement votre projet pour détecter :
- Le framework (Next.js supporté)
- La présence de Tailwind CSS
- La configuration de shadcn/ui
- Les polices Google Fonts utilisées
- Les fichiers CSS globaux

### Résolution des problèmes

Si vous recevez l'erreur `package.json not found`, assurez-vous de :
1. Lancer la commande à la racine de votre projet Node.js.
2. Vérifier que vous avez les droits de lecture sur le répertoire.
3. Sur Windows, préférez l'utilisation d'un terminal standard (CMD ou PowerShell).

---

## 🎨 Design System & Agents

Tonium génère des artefacts dans `.agents/tonium/` pour aider vos agents IA (comme Antigravity ou Claude) à comprendre et respecter vos règles de design.

- `theme-rules.md` : Règles de style Tailwind et CSS.
- `brand-identity.md` : Identité visuelle et personnalité.
- `tokens/` : Échelles de couleurs et typographies.

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
  - `config.json` : Configuration centrale du design system (Version 1.2.0).
  - `tokens/` : Fichiers JSON contenant palette, scales, et tokens sémantiques.
  - `generated/` : Tokens CSS générés pour import dans `globals.css`.
- **`.agents/tonium/`** :
  - `brand-system.md` : Votre identité de marque expliquée aux IA (en Anglais).
  - `design-rules.md` : Les contraintes de design strictes pour vos agents codeurs (en Anglais).
- **`.agents/skills/chromatic-design/`** :
  - `SKILL.md` : Skill standard compatible avec les agents IA.
  - `references/` : Documentation détaillée sur les contrastes et tokens.
- **`AGENTS.md`** (racine) : Point d'entrée pour les agents IA avec bloc Tonium délimité.

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
- [x] **Phase 3** : Détection de projet et respect de l'existant (V1.2).
- [ ] **Phase 4** : Enrichissement Sémantique via IA (OpenRouter).
- [ ] **Phase 5** : Serveur MCP complet.

---

## 📄 Licence

Distribué sous licence **Apache 2.0**. Toute œuvre dérivée doit impérativement inclure une mention et un lien vers le projet original **Tonium**, conformément aux termes du fichier `NOTICE`.

---
*Propulsé par Tonium - L'excellence visuelle pilotée par le code.*
