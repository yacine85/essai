# 🚀 Quick Start - QRQC UI/UX v2.0

## Installation & Déploiement

### 1. Installer les dépendances
```bash
cd frontend
npm install
```

### 2. Lancer le serveur dev
```bash
npm run dev
```

L'app ouvrira sur `http://localhost:3003` (ou le port configuré dans `vite.config.js`)

### 3. Build pour production
```bash
npm run build
```

Crée un dossier `dist/` optimisé et prêt pour déploiement.

---

## 📋 Caractéristiques Clés

### ✨ Nouveau (v2.0)

| Caractéristique | Avant | Après | Impact |
|---|---|---|---|
| **Menu** | Statique | Collapsible + Tooltips | +30% espace |
| **KPIs** | Plain text | Cards colorées + interactif | Lisibilité ↑↑ |
| **Graphiques** | Aucun | Recharts modernes | Analyse ↑↑↑ |
| **Layout** | Ad-hoc | CSS Grid 12 col | Cohérence ↑↑ |
| **Animations** | Aucune | Framer Motion fluides | UX ↑↑↑ |
| **Responsive** | Mobile oublié | Optimisé < 768px | Mobile ✅ |

---

## 🎯 Navigation Rapide

### Créer une nouvelle action KPI
1. Admin clique un **KPI card** (ex: TRG)
2. **Modal s'ouvre**
3. Remplit: Action, Description, Responsable, Priorité, Délai
4. Clique **"Créer l'action"**
5. Action créée (intégration Plan Actions à faire)

### Réduire/Déployer le menu
1. Clique le **chevron** en haut du sidebar
2. Menu slide de 280px → 80px (ou inverse)
3. En réduit, **hover icône = tooltip**

### Consulter les graphiques
1. **Performance Globale** shows TRG/FOR/FPY trend
2. **CMS2 Chart** montre performance par ligne (EE PRO, Claro, Wawoo)
3. **Intégration Chart** montre OPL + Intégration
4. Hover la courbe = détails du jour

---

## 📊 Données et API

### Actuellement: Mock Data
```javascript
// src/pages/Dashboard.jsx
const mockData = {
  trg: { value: 92, objective: 95, status: 'warning', trend: -2 },
  // ...
}
```

### Pour connecter API réelle:
```javascript
// Dans fetchData()
const response = await fetch(`${API_URL}/dashboard`, {
  headers: getAuthHeader()
})
const data = await response.json()
setKpiData(data)
```

### Endpoints suggérés
```
GET  /api/kpis                  → Valeurs KPI actuelles
GET  /api/kpis/history?date=X   → Historique pour graphiques
GET  /api/ateliers              → Liste ateliers (CMS2, Intégration)
POST /api/plan-actions          → Créer nouvelle action
POST /api/reset-template        → Réinitialiser template
```

---

## 🛠️ Développement

### Ajouter un nouveau KPI
```jsx
// Dans Dashboard.jsx
<KPICard
  title="Nouveau KPI"
  value={currentValue}
  objective={100}
  status={status} // 'success' | 'warning' | 'danger'
  trend={changePercent}
  interactive={isAdmin}
  onClick={() => handleKPIClick('NouveauKPI', data)}
/>
```

### Ajouter une nouvelle colonne grille
```jsx
<motion.div variants={itemVariants} style={{ gridColumn: 'span 3' }}>
  {/* Content */}
</motion.div>
```

Grid system:
- `span 3` = 25% width
- `span 4` = 33% width
- `span 6` = 50% width
- `span 12` = 100% width

### Modifier les couleurs
```css
/* src/styles/index.css */
:root {
  --color-primary: #1a365d;      /* Bleu */
  --color-accent: #ed8936;       /* Orange */
  --color-success: #38a169;      /* Vert */
  --color-warning: #d69e2e;      /* Jaune */
  --color-danger: #e53e3e;       /* Rouge */
}
```

---

## 🧪 Testing

### Test responsiveness
1. F12 → Device toggle (mobile simulator)
2. Tester à 320px, 768px, 1024px, 1440px
3. Vérifier sidebar, grille, modales

### Test performance
1. F12 → Lighthouse
2. Run audit (Performance, Accessibility, SEO)
3. Target: 90+ score

### Test animations
1. F12 → Rendering → Paint flashing
2. Vérifier pas de repaints inutiles
3. Sidebar slide doit être smooth 60fps

---

## 📁 Structure des Fichiers

```
frontend/
├── src/
│   ├── components/
│   │   ├── KPICard.jsx           ← Fiche KPI
│   │   ├── Charts.jsx            ← Graphiques
│   │   ├── KPIModals.jsx         ← Modales
│   │   └── Layout/
│   │       └── Layout.jsx        ← Sidebar collapsible
│   │
│   ├── pages/
│   │   ├── Dashboard.jsx         ← NOUVEAU Dashboard
│   │   ├── Dashboard_BACKUP.jsx  ← Ancien (archive)
│   │   ├── Login.jsx
│   │   └── ...
│   │
│   ├── styles/
│   │   └── index.css             ← Styles (+150 lignes)
│   │
│   ├── context/
│   │   └── AuthContext.jsx
│   │
│   └── App.jsx
│
├── package.json                   ← +2 deps (recharts, framer-motion)
├── IMPROVEMENTS.md                ← Documentation détaillée
├── IMPROVEMENTS_SUMMARY.md        ← Résumé (ce fichier)
├── QUICKSTART.md                  ← Instructions déploiement
└── README.md
```

---

## ⚡ Optimisations Appliquées

- ✅ CSS-in-motion: Framer Motion pour animations GPU-accelerated
- ✅ Lazy components: Charts charge on demand
- ✅ Memoized renders: Dashboard stagger avec delays
- ✅ CSS Grid: Pas de flexbox overflow issues
- ✅ Responsive images: Lucide React (vecteur)

---

## 🔐 Sécurité

- ✅ getAuthHeader() utilisé pour tous les appels API
- ✅ Validation des inputs dans les modales
- ✅ Reset modal demande confirmation
- ✅ Role-based rendering (isAdmin checks)

---

## 🎓 Apprentissage Rapide

### Comprendre Framer Motion
```jsx
<motion.div
  initial={{ opacity: 0, y: 20 }}      // État initial
  animate={{ opacity: 1, y: 0 }}       // État final
  transition={{ duration: 0.3 }}        // Timing
>
  Content
</motion.div>
```

### Comprendre CSS Grid
```css
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);  /* 12 colonnes égales */
  gap: 20px;
}

.item {
  grid-column: span 4;  /* Prend 4 colonnes = 33% width */
}
```

### Recharts Basics
```jsx
<ResponsiveContainer width="100%" height={300}>
  <LineChart data={data}>
    <XAxis dataKey="date" />
    <YAxis />
    <CartesianGrid strokeDasharray="3 3" />
    <Line dataKey="TRG" stroke="#color" />
  </LineChart>
</ResponsiveContainer>
```

---

## 🐛 Dépannage

### "Address already in use :3003"
```bash
# Kill le processus existant
lsof -i :3003
kill -9 <PID>

# Ou changer le port dans vite.config.js
```

### Sidebar ne se collapse pas
- Vérifier que Framer Motion est importé
- Console pour erreurs JS
- Vérifier le CSS `.sidebar.collapsed`

### Graphiques ne s'affichent pas
- Vérifier recharts installed: `npm list recharts`
- Vérifier data passed correctement
- Check browser console pour erreurs

### Animations saccadées
- Vérifier 60 FPS: DevTools → Rendering
- Réduire nombre d'éléments animés simultanément
- Utiliser `will-change: transform` si besoin

---

## 📞 Support Interne

Pour des questions:

1. **Styling** → Consulter `src/styles/index.css`
2. **Layout** → Consulter `src/components/Layout/Layout.jsx`
3. **Dashboard** → Consulter `src/pages/Dashboard.jsx`
4. **Components** → Consulter dossier `src/components/`
5. **Détails** → Lire `IMPROVEMENTS.md`

---

## 🎉 You're all set!

L'interface QRQC est maintenant:
- ✨ Moderne et professionnelle
- 🎯 Intuitive et ergonomique
- 📊 Riche en visualisations
- 📱 Responsive sur tous les devices
- ⚡ Performante et fluide
- 🔄 Prête pour l'évolution

**Bon développement!** 🚀

---

**Last Updated:** 2026-03-27
**Version:** 2.0 Production
