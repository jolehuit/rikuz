'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { Home, BookmarkIcon, Settings } from 'lucide-react'

export function Navigation() {
  const pathname = usePathname()
  const { user } = useAuth()

  if (!user) return null

  const navItems = [
    { href: '/feed', label: 'Feed', icon: Home },
    { href: '/topics', label: 'Topics', icon: Settings },
    { href: '/read-later', label: 'Read Later', icon: BookmarkIcon },
  ]

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-bold text-xl">
              Rikuz
            </Link>
            <div className="flex gap-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link key={item.href} href={item.href}>
                    <Button variant={isActive ? 'default' : 'ghost'} size="sm" className="gap-2">
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                )
              })}
            </div>
          </div>
          <Link href="/logout">
            <Button variant="ghost" size="sm">
              Logout
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  )
}
