import type { Config, Context } from '@netlify/functions'
import type { ApprovalStatus } from '../../shared/types'
import {
  corsPreflight,
  json,
  loadBookings,
  loadSlots,
  requireAdmin,
  saveBookings,
  saveSlots,
} from './_shared/store'

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') return corsPreflight()
  if (req.method !== 'PATCH') return json({ error: 'Method not allowed' }, 405)

  const denied = requireAdmin(req)
  if (denied) return denied

  const body = (await req.json()) as {
    bookingId?: string
    action?: 'confirm' | 'reject'
  }

  if (!body.bookingId || (body.action !== 'confirm' && body.action !== 'reject')) {
    return json({ error: 'bookingId and action (confirm|reject) required' }, 400)
  }

  const bookings = await loadBookings()
  const booking = bookings.find((b) => b.id === body.bookingId)
  if (!booking) return json({ error: 'Booking not found' }, 404)
  if (booking.approvalStatus !== 'pending') {
    return json({ error: `Booking is already ${booking.approvalStatus}` }, 409)
  }

  const slots = await loadSlots()
  const slotIds = booking.slotIds?.length ? booking.slotIds : [booking.slotId]
  const nextStatus: ApprovalStatus = body.action === 'confirm' ? 'confirmed' : 'rejected'

  booking.approvalStatus = nextStatus

  for (const slot of slots) {
    if (!slotIds.includes(slot.id)) continue
    if (body.action === 'confirm') {
      slot.status = 'confirmed'
      slot.booked = true
      slot.bookingId = booking.id
    } else {
      // Release hold — times become available again
      slot.status = 'open'
      slot.booked = false
      slot.bookingId = undefined
    }
  }

  await saveSlots(slots)
  await saveBookings(bookings)

  return json({
    booking,
    message:
      body.action === 'confirm'
        ? 'Lessons confirmed. The block is locked in for the customer.'
        : 'Booking rejected. Those times are open again on the calendar.',
  })
}

export const config: Config = {
  path: '/api/admin/bookings',
  method: ['PATCH', 'OPTIONS'],
}
