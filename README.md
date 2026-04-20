# Tonium 💎

**Tonium** est un orchestrateur de design system et un moteur de cohérence visuelle pour les projets front-end modernes, avec une première cible claire : **Next.js + Tailwind CSS + shadcn/ui**.

Tonium détecte l'existant, respecte la structure réelle du projet, améliore la cohérence chromatique et typographique, renforce les contrastes, puis prépare un contexte exploitable par les agents IA via **`AGENTS.md`**.

---

## Vision

Tonium ne sert pas à ajouter une couche décorative.

Tonium sert à :

- comprendre le système visuel déjà présent ;
- corriger les incohérences de couleurs par remplacement direct ;
- améliorer les contrastes et l'accessibilité ;
- respecter les polices existantes si l'utilisateur le souhaite ;
- produire un contexte clair et des règles précises pour les agents IA ;
- éviter la dérive esthétique dans les itérations futures.

---

## Fonctionnalités clés

- **Moteur couleur basé sur OKLCH**  
  Tonium utilise **OKLCH comme espace pivot interne** pour calculer les ramps, harmoniser les variantes et mieux maîtriser les contrastes.

- **Audit visuel**  
  Analyse les styles actifs, détecte les couleurs réellement présentes dans le CSS et produit des rapports persistants dans `.tonium/reports/`.

- **Respect de l'existant et remplacement direct**  
  Tonium détecte les variables sémantiques dans `globals.css` et les polices dans `app/layout.tsx`. Il remplace directement les valeurs pour une intégration native sans surcharge CSS inutile.

- **Palette de marque multi-couleurs**  
  Tonium travaille à partir d'une **palette de marque**, pas d'une seule couleur primaire.

- **Format de sortie configurable**  
  Les couleurs peuvent être restituées en **HEX**, **RGB**, **HSL** ou **OKLCH**, même si les calculs restent centrés sur OKLCH.

- **Guidage des agents IA**  
  Tonium centralise les règles de design et les contraintes du projet dans **`AGENTS.md`**, offrant aux agents un cadre de décision robuste.

- **CLI bilingue**  
  L'interface CLI prend en charge **Français** et **English**.

---

## Skill externe recommandé

Pour un guidage chromatique encore plus solide côté agent, nous recommandons l'installation du skill externe `chromatic-design` depuis le toolkit Felicio AI Skills :

```bash
npx @joyboy-dy/felicio-ai-skills add chromatic-design
```

Ce skill est optionnel mais recommandé.

Tonium écrit les règles spécifiques au projet dans `AGENTS.md`, tandis que le skill externe apporte une expertise réutilisable sur la gestion des contrastes, l'harmonie des palettes et les bonnes décisions chromatiques.

---

## Ce que Tonium génère

### Dans le projet cible

Tonium peut générer ou mettre à jour :

```txt
.tonium/
  config.json
  generated/
  reports/
  tokens/

AGENTS.md
app/globals.css
app/layout.tsx
```

### Rôle de chaque zone

* **`.tonium/`**
  Stockage interne de Tonium : configuration, rapports, tokens, artefacts générés et snapshots techniques.

* **`AGENTS.md`**
  Point d'entrée central pour les agents IA. Il contient l'identité de marque, les règles de couleurs, les règles typographiques et les recommandations utiles.

* **`app/globals.css`**
  Fichier de styles global mis à jour directement par Tonium pour remplacer les variables sémantiques existantes.

* **`app/layout.tsx`**
  Mis à jour uniquement lorsque la configuration typographique doit réellement changer.

---

## Installation

### npx (recommandé)

```bash
npx tonium init
```

### pnpm

```bash
pnpm exec tonium init
```

### Bun

```bash
bunx tonium init
```

### Yarn

```bash
yarn dlx tonium init
```

---

## Utilisation

Le workflow recommandé de Tonium est :

```txt
init → audit → apply
```

### 1) Initialisation (`init`)

Tonium :

* détecte le projet ;
* analyse les polices existantes ;
* demande les informations de marque ;
* enregistre la configuration dans `.tonium/config.json`.

Exemple :

```bash
npx tonium init
```

### 2) Audit (`audit`)

Tonium analyse l'existant et génère des rapports persistants dans `.tonium/reports/`.

Fichiers générés :

```txt
.tonium/reports/audit.json
.tonium/reports/audit.md
```

Exemple :

```bash
npx tonium audit
```

### 3) Application (`apply`)

Tonium :

* génère les ramps tonales et les tokens ;
* met à jour directement `globals.css` ;
* met à jour `layout.tsx` si nécessaire pour les polices ;
* met à jour `AGENTS.md` avec le contexte projet.

Exemple :

```bash
npx tonium apply
```

---

## Contrat des commandes

* **`init`**
  Initialise Tonium dans le projet, détecte l'existant et crée la configuration de base.

* **`audit`**
  Analyse les styles actifs et écrit des rapports exploitables dans `.tonium/reports/`.

* **`apply`**
  Applique les changements au projet, met à jour les styles actifs et actualise `AGENTS.md`.

---

## Comportement technique sur `globals.css` 

Tonium privilégie le **remplacement direct** plutôt que l'indirection.

Il cible les variables existantes dans `:root` et `.dark`, par exemple :

```css
:root {
  --background: oklch(...);
  --foreground: oklch(...);
  --primary: oklch(...);
  --primary-foreground: oklch(...);
}
```

Cette approche garantit :

* zéro surcharge CSS inutile ;
* une meilleure lisibilité des styles ;
* une compatibilité propre avec Tailwind CSS et shadcn/ui ;
* un comportement plus prévisible côté runtime.

---

## Détection du projet

Tonium analyse automatiquement le projet pour détecter :

* le framework utilisé ;
* la présence de Tailwind CSS ;
* la structure `app/` ;
* le fichier `app/globals.css` ;
* le fichier `app/layout.tsx` ;
* les polices déjà configurées ;
* les variables de thème existantes.

---

## Développement local

Pour éviter de publier une nouvelle version à chaque test, utilise ce workflow local :

### 1. Construire le package

```bash
npm run build
```

### 2. Générer un tarball local

```bash
npm pack
```

### 3. Installer le tarball dans un projet cible

#### Avec pnpm

```bash
pnpm add -D ../path/to/tonium-x.y.z.tgz
pnpm exec tonium init
```

#### Avec npm

```bash
npm install --save-dev ../path/to/tonium-x.y.z.tgz
npx tonium init
```

#### Avec Yarn

```bash
yarn add -D ../path/to/tonium-x.y.z.tgz
yarn tonium init
```

#### Avec Bun

```bash
bun add -d ../path/to/tonium-x.y.z.tgz
bunx tonium init
```

### Recommandation importante

Utilise de préférence **le même gestionnaire de paquets que le projet cible**.
Par exemple, si le projet cible utilise `pnpm`, teste Tonium avec `pnpm` dans ce projet.

---

## Dépannage

### `tonium` n'est pas reconnu

Utilise la commande adaptée à ton gestionnaire :

* `npx tonium ...` 
* `pnpm exec tonium ...` 
* `bunx tonium ...` 
* `yarn dlx tonium ...` 

### `package.json not found` 

Assure-toi d'exécuter Tonium à la racine du projet cible.

### Le tarball local est introuvable

Vérifie le chemin vers le fichier `.tgz`.
Sous Windows, préfère un chemin absolu si nécessaire.

### Projet géré par pnpm

Évite de mélanger `npm install` et `pnpm` dans le même projet de test.

---

## Structure du package Tonium

Exemple de structure côté package :

```txt
tonium/
  scripts/
  skills/
  src/
  package.json
  README.md
```

---

## Structure attendue dans le projet cible

```txt
project/
  .tonium/
    config.json
    generated/
    reports/
    tokens/
  AGENTS.md
  app/
    globals.css
    layout.tsx
```

---

## Roadmap

* [x] CLI de base et multilingue
* [x] Détection de projet
* [x] Audit avec rapports persistants
* [x] Centralisation des règles dans `AGENTS.md` 
* [ ] Remplacement sémantique complet des variables existantes dans `globals.css` 
* [ ] Stratégies avancées de mapping couleur par type de projet
* [ ] Serveur MCP complet

---

## Licence

Tonium est distribué sous licence **Apache 2.0**.

Le fichier `NOTICE` doit être conservé conformément aux conditions associées.

---

**Tonium** — cohérence visuelle, structure durable, agents mieux guidés.
