# Background Jobs System

## Overview

The search execution has been moved to a background job queue system. When a user creates a topic, instead of executing the search immediately (which could take 30+ seconds), a job is queued and processed in the background.

## Architecture

### Database Tables

1. **topics table**
   - `search_status`: 'pending' | 'searching' | 'completed' | 'failed'
   - `last_search_at`: Timestamp of last search execution

2. **search_jobs table**
   - `id`: Job UUID
   - `topic_id`: Reference to topic
   - `user_id`: Reference to user
   - `status`: 'pending' | 'processing' | 'completed' | 'failed'
   - `retry_count`: Number of retry attempts
   - `max_retries`: Maximum retries (default: 3)
   - `error_message`: Error details if failed
   - `started_at`, `completed_at`, `created_at`, `updated_at`: Timestamps

### API Endpoints

1. **POST /api/topics**
   - Creates a new topic
   - Automatically creates a search_job with status 'pending'
   - Returns immediately without waiting for search

2. **POST /api/jobs/process** (Protected by Bearer token)
   - Processes pending search jobs (up to 5 at a time)
   - Updates topic and job status
   - Implements retry logic (max 3 retries)
   - Called by cron job or manual trigger

3. **GET /api/jobs/trigger** (Development only)
   - Manually triggers job processing
   - Useful for testing

## Workflow

1. **Topic Creation**

   ```
   User creates topic
   → Topic created with search_status='pending'
   → Search job created with status='pending'
   → User sees "⏳ Search pending" badge
   → User can navigate away safely
   ```

2. **Job Processing** (runs every minute via cron)

   ```
   Cron calls /api/jobs/process
   → Fetches pending jobs
   → For each job:
     - Mark as 'processing'
     - Update topic search_status='searching'
     - Execute search (categorization + agent search)
     - On success: mark as 'completed', topic='completed'
     - On error: increment retry_count, mark as 'failed' if max retries reached
   ```

3. **User Experience**
   ```
   Topics page shows real-time status:
   - ⏳ Search pending (yellow)
   - 🔄 Searching... (blue, animated spinner)
   - ✓ Up to date (green)
   - ✗ Search failed (red)
   ```

## Setup

### Environment Variables

Add to `.env.local`:

```bash
CRON_SECRET=your-secure-random-secret
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # or your production URL
```

### Cron Setup (Production)

**Option 1: Vercel Cron (Recommended)**

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/jobs/process",
      "schedule": "* * * * *"
    }
  ]
}
```

**Option 2: External Cron Service**

Use a service like:

- Cron-job.org
- EasyCron
- GitHub Actions

Call:

```bash
curl -X POST https://your-domain.com/api/jobs/process \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

### Development Testing

1. Create a topic via UI
2. Manually trigger job processing:
   ```bash
   curl http://localhost:3000/api/jobs/trigger
   ```
3. Check topic status in UI (should update from "pending" to "searching" to "completed")

## Monitoring

### Check Job Status

```sql
-- See all pending jobs
SELECT * FROM search_jobs WHERE status = 'pending';

-- See failed jobs
SELECT * FROM search_jobs WHERE status = 'failed';

-- See job queue depth
SELECT status, COUNT(*) FROM search_jobs GROUP BY status;
```

### Check Topic Status

```sql
-- See topics by search status
SELECT search_status, COUNT(*) FROM topics GROUP BY search_status;

-- See topics stuck in 'searching' status (potential issues)
SELECT id, title, search_status, last_search_at
FROM topics
WHERE search_status = 'searching'
  AND last_search_at < NOW() - INTERVAL '10 minutes';
```

## Benefits

✅ **User Experience**: Users can create topics and navigate away immediately
✅ **Reliability**: Automatic retry on failures (up to 3 times)
✅ **Scalability**: Jobs processed in batches, prevents server overload
✅ **Visibility**: Clear status indicators in UI
✅ **Recovery**: Failed jobs can be manually retried

## Limitations

⚠️ Jobs are processed sequentially (5 at a time)
⚠️ No real-time progress updates during search
⚠️ Requires external cron trigger in production

## Future Improvements

- [ ] Add job priority queue
- [ ] Implement webhook/SSE for real-time status updates
- [ ] Add admin dashboard for job monitoring
- [ ] Implement job scheduling (e.g., daily auto-refresh)
- [ ] Add job cancellation feature
