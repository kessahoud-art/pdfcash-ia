# 💸 PDF Cash IA — Guide de Déploiement (Mobile)

## Ce que tu as dans ce dossier

```
pdfcash/
├── index.html        → L'app (page principale)
├── style.css         → Le design
├── app.js            → La logique
├── vercel.json       → Config déploiement
├── api/
│   └── generate.js   → Fonction qui cache ta clé API
└── README.md         → Ce fichier
```

---

## 🚀 DÉPLOIEMENT EN 5 ÉTAPES (depuis ton téléphone)

### ÉTAPE 1 — Crée un compte GitHub
1. Va sur **github.com** depuis ton téléphone
2. Clique **Sign up**
3. Entre email + mot de passe + nom d'utilisateur
4. Vérifie ton email

---

### ÉTAPE 2 — Crée le repo et upload les fichiers
1. Sur GitHub, clique le **+** (en haut à droite)
2. Clique **New repository**
3. Nom du repo : `pdfcash-ia`
4. Mets-le en **Public**
5. Clique **Create repository**
6. Clique **uploading an existing file**
7. Upload TOUS les fichiers (index.html, style.css, app.js, vercel.json)
8. **IMPORTANT** : Pour le dossier `api/`, tu dois aussi créer le fichier :
   - Clique **Create new file**
   - Nom : `api/generate.js`
   - Colle le contenu du fichier `api/generate.js`
9. Clique **Commit changes**

---

### ÉTAPE 3 — Crée un compte Vercel
1. Va sur **vercel.com**
2. Clique **Sign Up**
3. Choisis **Continue with GitHub** ← IMPORTANT
4. Autorise Vercel à accéder à GitHub

---

### ÉTAPE 4 — Déploie
1. Sur Vercel, clique **Add New Project**
2. Tu vois ton repo `pdfcash-ia` → clique **Import**
3. Laisse tout par défaut
4. Clique **Deploy**
5. Attends 1-2 minutes → Vercel donne une URL du type `pdfcash-ia.vercel.app`

---

### ÉTAPE 5 — Ajoute ta clé API (OBLIGATOIRE)
Sans cette étape, l'IA ne fonctionnera pas.

1. Sur **console.anthropic.com** → crée un compte
2. Va dans **API Keys** → **Create Key**
3. Copie la clé (elle commence par `sk-ant-...`)

Sur Vercel :
1. Ouvre ton projet
2. Va dans **Settings** → **Environment Variables**
3. Clique **Add New**
4. Name : `ANTHROPIC_API_KEY`
5. Value : colle ta clé `sk-ant-...`
6. Clique **Save**
7. Va dans **Deployments** → clique les **3 points** sur le dernier déploiement → **Redeploy**

---

## ✅ C'est fait ! Ton app est en ligne

URL : `https://pdfcash-ia.vercel.app` (ou l'URL donnée par Vercel)

---

## 💰 Combien ça coûte ?

| Service | Prix |
|---------|------|
| GitHub | GRATUIT |
| Vercel | GRATUIT |
| API Anthropic | ~0,01$ par PDF généré (≈ 6 FCFA) |

Si tu vends un PDF à 3 000 FCFA et que chaque génération coûte 6 FCFA → tu gardes **2 994 FCFA**.

---

## 🔧 Problèmes fréquents

**"Erreur API"** → Vérifie que la clé API est bien ajoutée dans Vercel Environment Variables et que tu as redéployé.

**"Format de réponse invalide"** → L'IA a eu un problème. Réessaie avec le même sujet.

**Le PDF téléchargé est un .html pas un .pdf** → C'est normal ! Ouvre le fichier dans ton navigateur puis fais **Imprimer → Enregistrer en PDF**.

---

## 📲 Pour convertir le .html en vrai .pdf sur téléphone

1. Télécharge le fichier .html
2. Ouvre-le dans Chrome mobile
3. Appuie sur les **3 points** → **Partager** → **Imprimer**
4. Choisis **Enregistrer en PDF**
5. Ton PDF professionnel est prêt à vendre !

---

*Créé avec ❤️ — PDF Cash IA*
