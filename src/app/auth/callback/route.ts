import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Create or update user profile
      const { error: profileError } = await supabase
        .from('users')
        .upsert({
          id: data.user.id,
          email: data.user.email || '',
          updated_at: new Date().toISOString(),
        })
        .select()

      if (profileError) {
        console.error('Error creating user profile:', profileError)
      }

      // Redirect to feed
      return NextResponse.redirect(new URL('/feed', request.url))
    }
  }

  // Redirect to error page or login
  return NextResponse.redirect(new URL('/login?error=auth_error', request.url))
}
