# QRQC - Gestion des Ateliers de Production

Application web professionnelle pour le management des ateliers de production.

## 🎯 Fonctionnalités

- **Dashboard QRQC** : Vue synthétique des indicateurs de production (TRG, TRS, FPY, etc.)
- **Tableaux CMS 2 & Intégration** : Indicateurs par ligne de production avec code couleur
- **Analyse des écarts** : Suivi des actions correctives
- **Saisie des données** : Formulaire pour chefs d'atelier
- **Gestion des utilisateurs** : Authentification et gestion des rôles
- **Export** : PDF et Excel des rapports

## 🛠️ Tech Stack

- **Frontend** : React + Vite
- **Backend** : Node.js + Express
- **Base de données** : MySQL
- **Styles** : CSS personnalisé

## 🚀 Installation Rapide

### Prérequis

- Node.js (v18+)
- MySQL (v8.0+)

### Étapes

1. **Cloner le projet**
   ```bash
   cd qrqc-app
   ```

2. **Installer les dépendances**
   ```bash
   # Installation racine
   npm install
   
   # Installation frontend
   cd frontend && npm install
   
   # Installation backend
   cd ../backend && npm install
   ```

3. **Configurer la base de données**
   ```bash
   # Créer la base de données MySQL
   mysql -u root -p < backend/database/schema.sql
   ```

4. **Lancer l'application**
   ```bash
   # Depuis la racine - lance frontend + backend
   npm run dev
   ```

   L'application sera accessible sur : `http://localhost:5173`

## 👤 Comptes de démonstration

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Admin | admin@qrqc.fr | admin123 |
| Chef Atelier | chef@qrqc.fr | chef123 |
| Management | manager@qrqc.fr | manager123 |

## 📁 Structure du projet

```
qrqc-app/
├── frontend/                 # Application React
│   ├── src/
│   │   ├── components/       # Composants React
│   │   ├── pages/           # Pages de l'application
│   │   ├── context/         # Contextes React
│   │   └── styles/          # Fichiers CSS
│   ├── package.json
│   └── vite.config.js
│
├── backend/                  # API Node.js
│   ├── src/
│   │   └── index.js         # Serveur Express
│   ├── database/
│   │   └── schema.sql       # Schéma MySQL
│   └── package.json
│
├── package.json              # Script de lancement
└── SPEC.md                  # Spécifications du projet
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - Connexion utilisateur

### Users
- `GET /api/users` - Liste des utilisateurs

### Ateliers
- `GET /api/ateliers` - Liste des ateliers

### Production
- `GET /api/production` - Données de production
- `POST /api/production` - Créer une entrée

### Indicateurs
- `GET /api/indicators` - Tous les indicateurs
- `GET /api/indicators/:atelier` - Indicateurs par atelier

## 🎨 Design

- Style industriel/professionnel
- Couleurs : Bleu marine (#1a365d), Orange (#ed8936)
- En-têtes beige clair (#f5f0e6)
- Code couleur des indicateurs :
  - 🟢 Vert : Objectif atteint
  - 🟡 Jaune : Attention
  - 🔴 Rouge : Critique

## 📝 License

Propriétaire - Usage interne

## 🌐 Déploiement Public (Vercel + Render)

### 1) Backend sur Render

- Root Directory : `backend`
- Build Command : `npm install`
- Start Command : `npm start`

Variables d'environnement Render :

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `JWT_SECRET`
- `PORT`
- `CORS_ORIGINS` (exemple : `https://votre-frontend.vercel.app`)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` (si notifications email actives)

### 2) Frontend sur Vercel

- Root Directory : `frontend`
- Build Command : `npm run build`
- Output Directory : `dist`

Variable d'environnement Vercel :

- `VITE_API_URL` (exemple : `https://votre-backend.onrender.com/api`)

### 3) Vérifications après déploiement

- Connexion utilisateur
- Chargement du dashboard
- Création/édition des données (KPI, lignes, actions)
- Accès API sans erreur CORS

