import type { Config, Context } from '@netlify/functions'
import {
  corsPreflight,
  json,
  loadSlots,
  requireAdmin,
  saveSlots,
} from './_shared/store'

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') return corsPreflight()

  if (req.method === 'PATCH') {
    const denied = requireAdmin(req)
    if (denied) return denied

    const body = (await req.json()) as { slotId?: string; priceCents?: number }
    if (!body.slotId) return json({ error: 'slotId required' }, 400)

    const cents = Number(body.priceCents)
    if (!Number.isFinite(cents) || cents < 0) {
      return json({ error: 'priceCents must be a non-negative number' }, 400)
    }

    const slots = await loadSlots()
    const slot = slots.find((s) => s.id === body.slotId)
    if (!slot) return json({ error: 'Slot not found' }, 404)
    if (slot.booked) {
      return json({ error: 'That lesson is already booked — price is locked.' }, 409)
    }

    slot.priceCents = Math.round(cents)
    await saveSlots(slots)

    return json({
      slot,
      message: 'Customer will see this price when they book this time.',
    })
  }

  return json({ error: 'Method not allowed' }, 405)
}

export const config: Config = {
  path: '/api/admin/slots',
  method: ['PATCH', 'OPTIONS'],
}
