# Configuration des Cronjobs avec Upstash Workflow

## 🎯 Ce qui a été fait

Migration du cron job Vercel vers **@upstash/workflow** pour éviter les limitations du plan Hobby (2 crons/jour max).

### Fichiers créés

1. **`src/app/api/workflow/daily-search/route.ts`** - Le workflow principal avec 4 étapes
2. **`src/app/api/workflow/setup-schedule/route.ts`** - Endpoint d'informations
3. **`.env.local`** - Variables d'environnement

---

## 📋 Configuration simple en 3 étapes

### Étape 1: Obtenir vos credentials

1. Allez sur https://console.upstash.com/qstash
2. Copiez ces 3 valeurs:
   - `QSTASH_TOKEN`
   - `QSTASH_CURRENT_SIGNING_KEY`
   - `QSTASH_NEXT_SIGNING_KEY`

### Étape 2: Configurer `.env.local`

```bash
QSTASH_TOKEN=votre_vraie_clé
QSTASH_CURRENT_SIGNING_KEY=votre_vraie_clé
QSTASH_NEXT_SIGNING_KEY=votre_vraie_clé

# Pour dev local seulement:
QSTASH_URL=http://127.0.0.1:8080
```

### Étape 3: Créer le schedule (via Dashboard)

1. Allez sur https://console.upstash.com/qstash
2. Cliquez sur **"Schedules"** → **"Create Schedule"**
3. Remplissez:
   - **Destination URL**: `https://rikuz.vercel.app/api/workflow/daily-search`
   - **Cron Expression**: `0 8 * * *` (tous les jours à 8h UTC / 9h Paris)
   - **Schedule ID**: `rikuz-daily-search`
4. Cliquez **"Schedule"**

✅ **C'est tout !** Le workflow s'exécutera automatiquement chaque jour.

---

## 🧪 Test en local

```bash
# Terminal 1: Démarrer le serveur QStash local
npx @upstash/qstash-cli dev

# Terminal 2: Démarrer Next.js
bun dev

# Terminal 3: Tester le workflow
curl -X POST http://localhost:3000/api/workflow/daily-search
```

---

## 📊 Monitoring

Dashboard: https://console.upstash.com/qstash

Vous verrez:

- ✅ Étapes réussies (fetch agents → enqueue → process → stats)
- ⏱️ Durée de chaque étape
- 🔄 Retries automatiques en cas d'erreur
- ❌ Logs d'erreur détaillés

---

## 🎨 Personnalisation du cron

Dans le dashboard QStash, éditez votre schedule:

```bash
0 8 * * *      # Tous les jours à 8h UTC
0 */6 * * *    # Toutes les 6 heures
0 0 * * 1      # Chaque lundi à minuit
30 7 * * 1-5   # Lun-Ven à 7h30 UTC
```

Aide: https://crontab.guru

---

## ✨ Avantages

✅ **Pas de limite de crons** (vs 2/jour Vercel Hobby)
✅ **Pas de timeout** (15min max par step)
✅ **Auto-retry** (3 fois par défaut)
✅ **Monitoring gratuit**
✅ **Résistant aux pannes**

---

## 🔒 Sécurité

Les `SIGNING_KEY` vérifient que les requêtes viennent bien de QStash.
Sans ces clés, n'importe qui pourrait déclencher votre workflow.

En production (Vercel):

1. Variables d'environnement → Ajouter `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`
2. **Ne PAS** ajouter `QSTASH_URL` en production

---

## 🐛 Troubleshooting

**Erreur: "Failed to authenticate"**
→ Vérifiez que les `SIGNING_KEY` sont corrects

**Le workflow ne se lance pas**
→ Vérifiez que le schedule existe dans le dashboard QStash

**Timeout en local**
→ Vérifiez que `npx @upstash/qstash-cli dev` tourne

**Workflow échoue**
→ Consultez les logs dans le dashboard QStash

---

## 📚 Docs

- Upstash Workflow: https://upstash.com/docs/workflow
- QStash Schedules: https://upstash.com/docs/qstash/features/schedules
