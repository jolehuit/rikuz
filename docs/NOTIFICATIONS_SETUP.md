# Notifications & Daily Briefs Setup Guide

## Overview

Le système de notifications envoie automatiquement des briefs quotidiens aux utilisateurs via **Email** (Resend) et/ou **Discord** (webhooks).

---

## Architecture

```
Daily Search (8h UTC)
    ↓
Generate Briefs (10h UTC)
    ↓
Send Notifications (10h05 UTC)
    ↓
Email (Resend) + Discord (Webhooks)
```

---

## Configuration requise

### 1. Variables d'environnement

Ajouter dans `.env.local` :

```env
# Resend API Key (obligatoire pour emails)
RESEND_API_KEY=re_xxxxxxxxxxxxx

# Upstash QStash (pour workflows)
QSTASH_TOKEN=xxxxx
QSTASH_CURRENT_SIGNING_KEY=xxxxx
QSTASH_NEXT_SIGNING_KEY=xxxxx

# App URL (pour liens dans emails)
NEXT_PUBLIC_APP_URL=https://rikuz.vercel.app
```

### 2. Configuration Resend

1. Créer un compte sur [resend.com](https://resend.com)
2. Générer une API key dans **Settings → API Keys**
3. **Important** : Vérifier votre domaine dans **Domains** (ou utiliser l'email de test)
4. L'email expéditeur est configuré : `jolehuitt@gmail.com`

### 3. Configuration Upstash QStash

**⚠️ IMPORTANT : Voir le guide complet dans `docs/QSTASH_SETUP.md`**

Résumé : Créer 2 schedules sur https://console.upstash.com/qstash

1. **Daily Search** : `0 8 * * *` → `/api/workflow/daily-search`
2. **Send Notifications** : `0 10 * * *` → `/api/workflow/send-daily-notifications`

---

## Tables Supabase

Les tables suivantes ont été créées automatiquement :

### `notification_settings`

```sql
- user_id (UUID, unique)
- email_enabled (BOOLEAN)
- discord_enabled (BOOLEAN)
- discord_webhook_url (TEXT)
- send_time (TEXT) -- format "HH:MM"
- timezone (TEXT)
```

### `notifications_log`

```sql
- user_id (UUID)
- type ('email' | 'discord')
- status ('sent' | 'failed' | 'retried')
- error_message (TEXT)
- retry_count (INTEGER)
- created_at (TIMESTAMPTZ)
```

### `daily_summaries`

```sql
- topic_id (UUID)
- user_id (UUID)
- date (DATE)
- summary (TEXT) -- généré par AI
- items_count (INTEGER)
```

---

## Utilisation pour les utilisateurs

### 1. Configurer les notifications

Aller sur `/settings/notifications` pour :

- Activer/désactiver email
- Activer/désactiver Discord
- Configurer le webhook Discord
- Choisir l'heure d'envoi (6h-20h)

### 2. Créer un webhook Discord

1. Dans Discord, aller dans **Server Settings → Integrations → Webhooks**
2. Cliquer **New Webhook**
3. Copier l'URL (format : `https://discord.com/api/webhooks/...`)
4. Coller dans `/settings/notifications`

---

## Flow technique

### 1. Génération des briefs (`BriefGenerationService`)

```typescript
// Pour chaque topic actif
const brief = await briefService.generateDailyBrief(topicId, date)
// → Fetch feed_items du jour
// → Génère résumé AI avec Gemini
// → Sauvegarde dans daily_summaries
```

### 2. Envoi des notifications (`NotificationService`)

**Email (Resend)** :

```typescript
await notificationService.sendEmail(to, subject, html, userId)
// → Template HTML responsive
// → Retry logic (3 tentatives)
// → Exponential backoff (1s, 5s, 15s)
// → Log dans notifications_log
```

**Discord** :

```typescript
await notificationService.sendDiscord(webhookUrl, embed, userId)
// → Rich embeds avec couleurs
// → Retry logic identique
// → Log dans notifications_log
```

### 3. Monitoring de la fiabilité

```typescript
const failureRate = await notificationService.getFailureRate(1) // dernières 24h
if (failureRate > 5%) {
  // Alert admin via Sentry
}
```

---

## Workflow Upstash

**Endpoint** : `/api/workflow/send-daily-notifications`

**Steps** :

1. `generate-daily-briefs` : Génère briefs pour tous les topics actifs
2. `fetch-notification-users` : Récupère users avec notifications activées
3. `send-notifications` : Envoie email + Discord pour chaque user
4. `check-failure-rate` : Vérifie taux d'échec et alerte si >5%

**Configuration retry** :

- 2 tentatives max par workflow
- Failure function log les erreurs

---

## Tests manuels

### Tester l'envoi d'email

```bash
curl -X POST http://localhost:3000/api/workflow/send-daily-notifications \
  -H "Content-Type: application/json"
```

### Vérifier les logs

```sql
SELECT * FROM notifications_log
ORDER BY created_at DESC
LIMIT 10;
```

### Vérifier le taux d'échec

```sql
SELECT
  type,
  status,
  COUNT(*) as count
FROM notifications_log
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY type, status;
```

---

## Templates

### Email Template

- **Responsive** : Fonctionne sur mobile/desktop
- **Rich HTML** : Couleurs, cards, boutons CTA
- **Contenu** :
  - En-tête avec logo + date
  - Résumé par topic
  - Top 5 items par topic
  - Lien "View Full Feed"
  - Footer avec lien settings

### Discord Embed

- **Couleur** : Bleu (#2563eb)
- **Contenu** :
  - Titre du brief + date
  - Description (nb items/topics)
  - Fields par topic
  - Top 3 items par topic
  - Timestamp

---

## Monitoring & Alertes

### Métriques à surveiller

1. **Taux d'envoi** : % de notifications envoyées avec succès
2. **Taux d'échec** : % de notifications échouées après 3 retries
3. **Temps de traitement** : Durée du workflow
4. **Nombre d'utilisateurs notifiés** : Par jour

### Alertes configurées

- ⚠️ Taux d'échec >5% → Log error console
- 🔴 Workflow échoue 2 fois → Failure function appelée

### TODO : Alertes admin

```typescript
// Dans workflow failure function
if (failureRate > 5) {
  await sendAdminAlert({
    type: 'high_failure_rate',
    rate: failureRate,
    date: today,
  })
}
```

---

## Troubleshooting

### Email ne part pas

1. Vérifier `RESEND_API_KEY` dans `.env.local`
2. Vérifier domaine vérifié dans Resend
3. Checker logs : `SELECT * FROM notifications_log WHERE type='email' AND status='failed'`

### Discord ne part pas

1. Vérifier format webhook URL (doit commencer par `https://discord.com/api/webhooks/`)
2. Tester webhook avec `curl` :
   ```bash
   curl -X POST "WEBHOOK_URL" \
     -H "Content-Type: application/json" \
     -d '{"content": "Test"}'
   ```

### Briefs pas générés

1. Vérifier que des feed_items existent pour aujourd'hui
2. Checker table `daily_summaries` :
   ```sql
   SELECT * FROM daily_summaries WHERE date = CURRENT_DATE;
   ```

### Workflow n'est pas déclenché

1. Vérifier schedule QStash configuré
2. Vérifier `QSTASH_TOKEN` dans `.env.local`
3. Tester manuellement l'endpoint

---

## Limites & Considérations

### Resend (Free tier)

- 100 emails/jour
- 3,000 emails/mois
- Si dépassé → upgrade requis

### Discord Webhooks

- Rate limit : 30 messages/minute par webhook
- Pas de limite mensuelle
- Pas de retry automatique côté Discord

### Upstash QStash (Free tier)

- 500 messages/jour
- Suffisant pour ~250 users avec email+Discord

---

## Roadmap améliorations

- [ ] Dashboard admin pour monitoring
- [ ] Alertes Sentry/email pour admin
- [ ] A/B testing templates email
- [ ] Personnalisation heure d'envoi par user (actuellement global)
- [ ] Support Slack webhooks
- [ ] Export PDF des briefs
- [ ] Unsubscribe link dans emails
- [ ] Digest hebdomadaire optionnel

---

## Support

Pour questions ou bugs : [GitHub Issues](https://github.com/yourusername/rikuz/issues)
