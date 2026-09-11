import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isAdminAuthorized } from '@/lib/admin-guard'

// GET /api/admin/orders — list all orders (newest first)
// Query params: ?status=NEW&from=2026-09-01&to=2026-09-10
export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const status = req.nextUrl.searchParams.get('status')
  const from = req.nextUrl.searchParams.get('from')
  const to = req.nextUrl.searchParams.get('to')

  const where: any = {}
  if (status && status !== 'ALL') where.status = status
  if (from || to) {
    where.createdAt = {}
    if (from) where.createdAt.gte = new Date(from + 'T00:00:00')
    if (to) where.createdAt.lte = new Date(to + 'T23:59:59')
  }

  const orders = await db.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { items: true, customer: { select: { name: true, email: true, phone: true } } },
    take: 200,
  })
  return NextResponse.json({
    orders: orders.map((o) => ({
      ...o,
      // Normalize the paymentReceived boolean (SQLite stores it as 0/1)
      paymentReceived: Boolean(o.paymentReceived),
    })),
  })
}
