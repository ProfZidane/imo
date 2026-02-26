# MVP Cadastre 3D

Application Next.js pour la visualisation et l'analyse de parcelles cadastrales en 2D et 3D avec génération automatique de contraintes et plans d'étage.

## 🎯 Fonctionnalités

- **Visualisation 2D** : Carte interactive OpenLayers pour sélectionner des parcelles
- **Visualisation 3D** : Rendu Cesium pour visualiser les bâtiments en 3D
- **Analyse GPU** : Récupération automatique des contraintes d'urbanisme (PLU)
- **Génération de bâtiments** : Création automatique de bâtiments selon les contraintes
- **Édition de plans** : Outil d'édition de plans d'étage avec Archilogic Floor Plan SDK
- **Perspectives photoréalistes** : Génération d'images architecturales via Gemini AI

## 🚀 Démarrage rapide

### Prérequis

- Node.js 18+ 
- npm, yarn, pnpm ou bun

### Installation

```bash
# Cloner le projet
git clone <repo-url>
cd archi-mini

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env.local
# Éditer .env.local avec vos clés API
```

### Configuration

Créez un fichier `.env.local` avec les clés suivantes :

```env
NEXT_PUBLIC_CESIUM_TOKEN=votre_token_cesium
NEXT_PUBLIC_OPENAI_API_KEY=votre_cle_openai
GOOGLE_AI_API_KEY=votre_cle_gemini
```

### Lancement

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

## 📁 Structure du projet

```
archi-mini/
├── app/
│   ├── components/          # Composants React
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Map2D.tsx       # Carte OpenLayers
│   │   ├── Map3D.tsx       # Vue Cesium 3D
│   │   ├── FloorPlanEditor.tsx
│   │   ├── FloorPlanViewer.tsx
│   │   └── PerspectiveModal.tsx
│   ├── lib/                # Utilitaires et logique métier
│   │   ├── api.ts          # Appels API (GPU, etc.)
│   │   ├── constants.ts    # Constantes de l'app
│   │   ├── geometry.ts     # Calculs géométriques
│   │   └── utils.ts        # Fonctions utilitaires
│   ├── types/              # Définitions TypeScript
│   │   └── index.ts
│   ├── api/                # Routes API Next.js
│   │   └── perspective/
│   │       └── route.ts    # Génération d'images Gemini
│   ├── layout.tsx          # Layout racine
│   ├── page.tsx            # Page principale
│   └── globals.css         # Styles globaux
├── public/
│   └── cesium/             # Assets Cesium
├── .env.local              # Variables d'environnement (non versionné)
├── .env.example            # Template des variables d'env
├── cadastre.json           # Données cadastrales
└── package.json
```

## 🛠️ Technologies

- **Framework** : Next.js 16 (App Router)
- **UI** : React 19, TailwindCSS
- **Cartographie** : OpenLayers, Cesium
- **3D** : Three.js
- **Plans** : Archilogic Floor Plan SDK, Konva
- **IA** : OpenAI, Google Gemini AI

## 📖 Utilisation

1. **Sélectionner une parcelle** : Cliquez sur la carte 2D
2. **Analyser les contraintes** : Les contraintes PLU/GPU sont récupérées automatiquement
3. **Générer un bâtiment** : Ajustez les paramètres et générez le bâtiment en 3D
4. **Éditer les plans** : Utilisez l'éditeur de plans pour personnaliser les étages
5. **Générer une perspective** : Créez une vue photoréaliste du projet

## 🔑 APIs utilisées

- **IGN API Carto** : Récupération des données GPU (Plan Local d'Urbanisme)
- **Cesium Ion** : Tuiles 3D et imagerie satellite
- **OpenAI** : Génération des plans d'étage
- **Google Gemini** : Rendu photoréaliste des perspectives

## 📝 License

Private
