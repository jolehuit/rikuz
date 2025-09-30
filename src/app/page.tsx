'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default function Home() {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && user) {
      router.push('/feed')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  if (user) {
    return null // Will redirect to /feed
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-3xl">Welcome to Rikuz</CardTitle>
          <CardDescription>Your AI-powered content discovery platform</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Get personalized content recommendations based on your interests. Let AI agents search
            and curate the best content for you.
          </p>

          <div className="space-y-2">
            <Link href="/login" className="block">
              <Button className="w-full" size="lg">
                Sign In
              </Button>
            </Link>

            <div className="text-center text-sm text-muted-foreground">
              <p>Quick links:</p>
              <div className="flex gap-2 justify-center mt-2">
                <Link href="/topics" className="text-primary hover:underline">
                  Topics
                </Link>
                <span>•</span>
                <Link href="/feed" className="text-primary hover:underline">
                  Feed
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
