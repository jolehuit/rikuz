# Migration Cron → Upstash Workflow

## Problèmes actuels

### Double implémentation

- ❌ `/api/cron/daily-search` (Vercel Cron) - 6h UTC
- ❌ `/api/workflow/daily-search` (Upstash Workflow) - Pas schedulé
- **Risque** : Exécution en double

### Jobs processor trop fréquent

- ❌ `/api/jobs/process` (Vercel Cron) - **TOUTES LES MINUTES**
- **Risque** : Coût élevé, rate limits API

### Notifications non schedulées

- ✅ `/api/workflow/send-daily-notifications` (Upstash Workflow) - **Pas configuré**

---

## ✅ Solution recommandée : 100% Upstash Workflow

### Étape 1 : Supprimer `vercel.json`

```bash
rm /Users/max/Rikuz/rikuz/vercel.json
```

### Étape 2 : Supprimer `/api/cron/daily-search`

```bash
rm -rf /Users/max/Rikuz/rikuz/src/app/api/cron
```

### Étape 3 : Supprimer `/api/jobs/process` (ou le migrer)

Deux options :

1. **Option A** : Le supprimer (la queue est déjà gérée dans `workflow/daily-search`)
2. **Option B** : Le garder pour trigger manuel uniquement

### Étape 4 : Configurer QStash schedules

Aller sur https://console.upstash.com/qstash et créer 2 schedules :

#### Schedule 1 : Daily Search

- **URL** : `https://rikuz.vercel.app/api/workflow/daily-search`
- **Cron** : `0 8 * * *` (8h UTC quotidien)
- **Method** : POST

#### Schedule 2 : Send Notifications

- **URL** : `https://rikuz.vercel.app/api/workflow/send-daily-notifications`
- **Cron** : `0 10 * * *` (10h UTC quotidien, après les recherches)
- **Method** : POST

---

## Architecture finale

```
8:00 UTC → Upstash Workflow: Daily Search
            ↓
            Enqueue agents → Process queue
            ↓
10:00 UTC → Upstash Workflow: Send Notifications
            ↓
            Generate briefs → Send emails/Discord
```

---

## Avantages Upstash Workflow

✅ **Retry natif** : 3 tentatives automatiques
✅ **Observabilité** : Dashboard dans console Upstash
✅ **Pas de limite 5min** : Peut tourner longtemps
✅ **Étapes atomiques** : `context.run()` garantit l'exécution
✅ **Failure function** : Gestion d'erreur centralisée

---

## Actions immédiates

1. **Décider** : Garder Vercel Cron ou tout migrer vers Upstash ?
2. **Supprimer** `vercel.json` si migration vers Upstash
3. **Configurer** les 2 schedules QStash
4. **Tester** en production
