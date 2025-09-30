'use client'

import { useEffect, useState } from 'react'

interface QueueStats {
  pending: number
  processing: number
  completed: number
  failed: number
  total: number
}

interface QueueItem {
  id: string
  agent_id: string
  topic_id: string
  status: string
  retry_count: number
  max_retries: number
  error_message?: string
  results_count?: number
  started_at?: string
  completed_at?: string
  created_at: string
}

export default function QueueMonitorPage() {
  const [stats, setStats] = useState<QueueStats | null>(null)
  const [items, setItems] = useState<QueueItem[]>([])
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Fetch queue stats
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/queue/stats')
      const data = await response.json()
      setStats(data.stats)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  // Fetch queue items
  const fetchItems = async (status?: string) => {
    try {
      const url =
        status && status !== 'all'
          ? `/api/queue/items?status=${status}&limit=100`
          : '/api/queue/items?limit=100'
      const response = await fetch(url)
      const data = await response.json()
      setItems(data.items || [])
    } catch (error) {
      console.error('Failed to fetch items:', error)
    } finally {
      setLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    fetchStats()
    fetchItems(selectedStatus === 'all' ? undefined : selectedStatus)
  }, [selectedStatus])

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchStats()
      fetchItems(selectedStatus === 'all' ? undefined : selectedStatus)
    }, 10000)

    return () => clearInterval(interval)
  }, [autoRefresh, selectedStatus])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading queue data...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Search Queue Monitor</h1>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Auto-refresh (10s)</span>
            </label>
            <button
              onClick={() => {
                fetchStats()
                fetchItems(selectedStatus === 'all' ? undefined : selectedStatus)
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Refresh Now
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-5 gap-4 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-gray-500 text-sm mb-1">Total</div>
              <div className="text-3xl font-bold">{stats.total}</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-gray-500 text-sm mb-1">Pending</div>
              <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-gray-500 text-sm mb-1">Processing</div>
              <div className="text-3xl font-bold text-blue-600">{stats.processing}</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-gray-500 text-sm mb-1">Completed</div>
              <div className="text-3xl font-bold text-green-600">{stats.completed}</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-gray-500 text-sm mb-1">Failed</div>
              <div className="text-3xl font-bold text-red-600">{stats.failed}</div>
            </div>
          </div>
        )}

        {/* Status Filter */}
        <div className="mb-4">
          <label className="text-sm font-medium text-gray-700 mr-2">Filter by status:</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 border rounded"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {/* Queue Items Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Agent ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Retry
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Results
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                    {item.agent_id.substring(0, 30)}...
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(item.status)}`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.retry_count} / {item.max_retries}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.results_count !== null && item.results_count !== undefined
                      ? item.results_count
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(item.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.completed_at
                      ? `${Math.round((new Date(item.completed_at).getTime() - new Date(item.created_at).getTime()) / 1000)}s`
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {items.length === 0 && (
            <div className="text-center py-12 text-gray-500">No queue items found</div>
          )}
        </div>

        {/* Error Details for Failed Items */}
        {selectedStatus === 'failed' && items.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">Error Details</h2>
            <div className="space-y-4">
              {items
                .filter((item) => item.error_message)
                .map((item) => (
                  <div key={item.id} className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="font-mono text-sm text-gray-600 mb-2">{item.agent_id}</div>
                    <div className="text-red-800">{item.error_message}</div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
