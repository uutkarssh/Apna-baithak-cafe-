import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSupabaseForUser } from '@/lib/supabase-server'

// GET /api/auth/me — returns the customer profile mirror row for the current
// Supabase session (read from the Authorization header sent by the client).
// Creates the row on first login (mirrors auth user).
export async function GET(req: Request) {
  const supabase = await getSupabaseForUser(req)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ profile: null, session: null })
  }

  // Upsert the customer mirror row (idempotent)
  // First try by supabaseUserId, then by email (in case the row was created
  // with a different supabaseUserId — e.g. test users created via admin API)
  let customer = await db.customer.findUnique({
    where: { supabaseUserId: user.id },
  })
  if (!customer && user.email) {
    const existingByEmail = await db.customer.findUnique({
      where: { email: user.email },
    })
    if (existingByEmail) {
      // Link the existing row to this Supabase user
      customer = await db.customer.update({
        where: { id: existingByEmail.id },
        data: { supabaseUserId: user.id },
      })
    }
  }
  if (!customer) {
    const email = user.email ?? ''
    const name =
      (user.user_metadata?.full_name as string) ||
      (user.user_metadata?.name as string) ||
      (email ? email.split('@')[0] : 'Guest')
    const phone = (user.user_metadata?.phone as string) ?? null
    const avatarUrl = (user.user_metadata?.avatar_url as string) ?? null
    customer = await db.customer.create({
      data: {
        supabaseUserId: user.id,
        email,
        name,
        phone,
        avatarUrl,
      },
    })
  } else {
    // keep the mirror in sync with Supabase on each load
    const name =
      (user.user_metadata?.full_name as string) ||
      (user.user_metadata?.name as string) ||
      customer.name
    const phone = (user.user_metadata?.phone as string) ?? customer.phone
    const avatarUrl = (user.user_metadata?.avatar_url as string) ?? customer.avatarUrl
    if (
      name !== customer.name ||
      phone !== customer.phone ||
      avatarUrl !== customer.avatarUrl
    ) {
      customer = await db.customer.update({
        where: { id: customer.id },
        data: { name, phone, avatarUrl },
      })
    }
  }

  return NextResponse.json({
    profile: {
      id: customer.id,
      email: customer.email,
      name: customer.name,
      phone: customer.phone,
      avatarUrl: customer.avatarUrl,
    },
  })
}
