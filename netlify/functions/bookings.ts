import type { Config, Context } from '@netlify/functions'
import type { Booking, CreateBookingPayload } from '../../src/types'
import {
  corsPreflight,
  json,
  licencesStore,
  loadBookings,
  loadSlots,
  saveBookings,
  saveSlots,
} from './_shared/store'

function bookingId(): string {
  return `bk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') return corsPreflight()

  if (req.method === 'GET') {
    const bookings = await loadBookings()
    return json({ bookings })
  }

  if (req.method === 'POST') {
    const body = (await req.json()) as CreateBookingPayload

    if (!body.slotId || !body.studentName || !body.email || !body.phone || !body.licence) {
      return json({ error: 'Missing required booking fields' }, 400)
    }

    if (!body.licence.type || !body.licence.fileName) {
      return json({ error: 'A licence document attachment is required' }, 400)
    }

    const slots = await loadSlots()
    const slot = slots.find((s) => s.id === body.slotId)
    if (!slot) return json({ error: 'Slot not found' }, 404)
    if (slot.booked) return json({ error: 'That time was just booked. Pick another slot.' }, 409)

    const id = bookingId()
    let blobKey: string | undefined

    if (body.licence.dataUrl) {
      const match = body.licence.dataUrl.match(/^data:([^;]+);base64,(.+)$/)
      if (!match) return json({ error: 'Invalid licence file encoding' }, 400)
      const [, contentType, base64] = match
      const bytes = Buffer.from(base64, 'base64')
      blobKey = `${id}/${body.licence.fileName}`
      await licencesStore().set(blobKey, bytes, {
        metadata: {
          contentType,
          licenceType: body.licence.type,
          studentEmail: body.email,
        },
      })
    }

    const booking: Booking = {
      id,
      slotId: slot.id,
      createdAt: new Date().toISOString(),
      studentName: body.studentName.trim(),
      email: body.email.trim().toLowerCase(),
      phone: body.phone.trim(),
      notes: body.notes?.trim(),
      licence: {
        type: body.licence.type,
        fileName: body.licence.fileName,
        contentType: body.licence.contentType,
        licenceNumber: body.licence.licenceNumber,
        countryOrState: body.licence.countryOrState,
        blobKey,
      },
      paymentStatus: body.paymentMethod === 'demo' ? 'demo_paid' : 'paid',
      amountCents: slot.priceCents,
      lessonType: slot.lessonType,
      instructorId: slot.instructorId,
      start: slot.start,
      end: slot.end,
      suburb: slot.suburb,
    }

    slot.booked = true
    await saveSlots(slots)

    const bookings = await loadBookings()
    bookings.unshift(booking)
    await saveBookings(bookings)

    return json({ booking }, 201)
  }

  return json({ error: 'Method not allowed' }, 405)
}

export const config: Config = {
  path: '/api/bookings',
  method: ['GET', 'POST', 'OPTIONS'],
}
