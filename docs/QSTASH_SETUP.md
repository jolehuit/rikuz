# QStash Configuration Guide

## ✅ Migration terminée

**Supprimé :**

- ❌ `vercel.json` (Vercel Cron)
- ❌ `/api/cron/daily-search`
- ❌ `/api/jobs/process`

**Reste uniquement :**

- ✅ `/api/workflow/daily-search` (Upstash)
- ✅ `/api/workflow/send-daily-notifications` (Upstash)

---

## 🚀 Configuration QStash (POST-DÉPLOIEMENT)

### Prérequis

1. Compte Upstash : https://console.upstash.com
2. Variables `.env.local` :
   ```env
   QSTASH_TOKEN=xxxxx
   QSTASH_CURRENT_SIGNING_KEY=xxxxx
   QSTASH_NEXT_SIGNING_KEY=xxxxx
   NEXT_PUBLIC_APP_URL=https://rikuz.vercel.app
   ```

---

## 📅 Créer les Schedules

### Étape 1 : Aller sur QStash Dashboard

https://console.upstash.com/qstash

### Étape 2 : Créer Schedule #1 - Daily Search

1. Cliquer **"Schedules"** → **"Create Schedule"**
2. Remplir le formulaire :

   ```
   Name: Daily Search
   Destination: https://rikuz.vercel.app/api/workflow/daily-search
   Schedule: 0 8 * * *
   Timezone: UTC
   Method: POST
   ```

3. **Cliquer "Create"**

#### Explication du cron

- `0 8 * * *` = Tous les jours à 8h00 UTC
- UTC → Paris : 8h UTC = 9h/10h Paris (selon été/hiver)

### Étape 3 : Créer Schedule #2 - Send Notifications

1. Cliquer **"Schedules"** → **"Create Schedule"**
2. Remplir le formulaire :

   ```
   Name: Send Daily Notifications
   Destination: https://rikuz.vercel.app/api/workflow/send-daily-notifications
   Schedule: 0 10 * * *
   Timezone: UTC
   Method: POST
   ```

3. **Cliquer "Create"**

#### Explication du timing

- `0 10 * * *` = 2h après les recherches
- Donne le temps aux agents de chercher et générer les briefs
- Users reçoivent notifications vers 11h/12h Paris

---

## 🧪 Tests

### Test manuel des workflows

#### 1. Tester Daily Search

```bash
curl -X POST https://rikuz.vercel.app/api/workflow/daily-search \
  -H "Content-Type: application/json"
```

**Résultat attendu** :

```json
{
  "success": true,
  "message": "Daily search workflow completed",
  "enqueued": 10,
  "processed": 10,
  "completed": 8,
  "failed": 2
}
```

#### 2. Tester Send Notifications

```bash
curl -X POST https://rikuz.vercel.app/api/workflow/send-daily-notifications \
  -H "Content-Type: application/json"
```

**Résultat attendu** :

```json
{
  "success": true,
  "message": "Daily notifications sent",
  "briefsGenerated": 5,
  "emailsSent": 3,
  "discordSent": 2,
  "errors": 0
}
```

### Vérifier les logs QStash

1. Aller sur https://console.upstash.com/qstash
2. Cliquer sur **"Logs"**
3. Filtrer par schedule name
4. Vérifier les statuts (200 OK)

---

## 📊 Monitoring

### Dashboard QStash

https://console.upstash.com/qstash/logs

**Métriques disponibles :**

- Nombre d'exécutions
- Taux de succès/échec
- Durée moyenne
- Retry automatiques

### Logs Vercel

https://vercel.com/dashboard/logs

**Filtrer par :**

- `/api/workflow/daily-search`
- `/api/workflow/send-daily-notifications`

### Base de données

```sql
-- Vérifier les briefs générés
SELECT date, COUNT(*) as briefs_count
FROM daily_summaries
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY date
ORDER BY date DESC;

-- Vérifier les notifications envoyées
SELECT
  type,
  status,
  COUNT(*) as count,
  DATE(created_at) as day
FROM notifications_log
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY type, status, day
ORDER BY day DESC, type;
```

---

## 🔧 Troubleshooting

### Schedule ne se déclenche pas

1. Vérifier que l'URL est correcte (avec HTTPS)
2. Vérifier que le cron est en UTC
3. Checker les logs QStash pour erreurs d'auth
4. Vérifier variables `QSTASH_*` dans Vercel env

### Workflow échoue (500 error)

1. Checker les logs Vercel
2. Vérifier variables d'environnement :
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GOOGLE_GENERATIVE_AI_API_KEY`
   - `RESEND_API_KEY`
3. Tester les endpoints manuellement

### Notifications ne partent pas

1. Vérifier table `notification_settings` a des users
2. Vérifier `RESEND_API_KEY` est valide
3. Checker logs dans `notifications_log`
4. Vérifier domaine Resend vérifié

---

## 🎯 Architecture finale

```
┌─────────────────────────────────────────────────────┐
│              UPSTASH QSTASH SCHEDULES               │
└─────────────────────────────────────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                 │
        ▼                                 ▼
  ┌──────────┐                    ┌─────────────┐
  │  8:00 UTC │                    │  10:00 UTC  │
  └──────────┘                    └─────────────┘
        │                                 │
        ▼                                 ▼
┌───────────────────┐          ┌────────────────────────┐
│ Daily Search      │          │ Send Notifications     │
│ Workflow          │─────────▶│ Workflow               │
├───────────────────┤          ├────────────────────────┤
│ 1. Fetch agents   │          │ 1. Generate briefs     │
│ 2. Enqueue agents │          │ 2. Fetch users         │
│ 3. Process queue  │          │ 3. Send emails         │
│ 4. Return stats   │          │ 4. Send Discord        │
└───────────────────┘          │ 5. Check failure rate  │
                               └────────────────────────┘
```

---

## 📝 Checklist de déploiement

- [ ] Variables d'environnement configurées dans Vercel
- [ ] Application déployée sur Vercel
- [ ] Schedule #1 créé (Daily Search)
- [ ] Schedule #2 créé (Send Notifications)
- [ ] Test manuel des 2 workflows réussi
- [ ] Logs QStash vérifiés (200 OK)
- [ ] Au moins 1 user avec notifications activées
- [ ] Première exécution automatique validée

---

## 🆘 Support

**Documentation Upstash QStash :**
https://upstash.com/docs/qstash/overall/getstarted

**En cas de problème :**

1. Checker logs QStash
2. Checker logs Vercel
3. Tester manuellement avec curl
4. Vérifier variables d'environnement
