import type { Config, Context } from '@netlify/functions'
import type {
  Booking,
  BookingLesson,
  CreateBookingPayload,
  PaymentChoice,
} from '../../shared/types'
import {
  calcPaymentAmounts,
  isSlotOpen,
} from '../../shared/types'
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

function resolveSlotIds(body: CreateBookingPayload): string[] {
  const ids = body.slotIds?.length
    ? body.slotIds
    : body.slotId
      ? [body.slotId]
      : []
  return [...new Set(ids)]
}

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') return corsPreflight()

  if (req.method === 'GET') {
    const bookings = await loadBookings()
    return json({ bookings })
  }

  if (req.method === 'POST') {
    const body = (await req.json()) as CreateBookingPayload
    const slotIds = resolveSlotIds(body)

    if (
      slotIds.length === 0 ||
      !body.studentName ||
      !body.email ||
      !body.phone ||
      !body.licence
    ) {
      return json({ error: 'Missing required booking fields' }, 400)
    }

    if (!body.licence.type || !body.licence.fileName) {
      return json({ error: 'A licence document attachment is required' }, 400)
    }

    const paymentChoice: PaymentChoice = body.paymentChoice === 'deposit' ? 'deposit' : 'full'

    const slots = await loadSlots()
    const selected = slotIds.map((id) => slots.find((s) => s.id === id))
    if (selected.some((s) => !s)) return json({ error: 'One or more slots not found' }, 404)
    if (selected.some((s) => s && !isSlotOpen(s))) {
      return json(
        { error: 'One or more times are pending or already booked. Pick open slots only.' },
        409,
      )
    }

    const lessons: BookingLesson[] = selected.map((slot) => ({
      slotId: slot!.id,
      start: slot!.start,
      end: slot!.end,
      lessonType: slot!.lessonType,
      instructorId: slot!.instructorId,
      suburb: slot!.suburb,
      priceCents: slot!.priceCents,
    }))

    const totalCents = lessons.reduce((sum, l) => sum + l.priceCents, 0)
    const { amountPaidCents, remainingCents } = calcPaymentAmounts(totalCents, paymentChoice)

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

    const first = lessons[0]
    const booking: Booking = {
      id,
      slotId: first.slotId,
      slotIds: lessons.map((l) => l.slotId),
      lessons,
      createdAt: new Date().toISOString(),
      studentName: body.studentName.trim(),
      email: body.email.trim().toLowerCase(),
      phone: body.phone.trim(),
      notes: body.notes?.trim(),
      meetupLocation: body.meetupLocation?.trim() || undefined,
      licence: {
        type: body.licence.type,
        fileName: body.licence.fileName,
        contentType: body.licence.contentType,
        licenceNumber: body.licence.licenceNumber,
        countryOrState: body.licence.countryOrState,
        blobKey,
      },
      paymentStatus: body.paymentMethod === 'demo' ? 'demo_paid' : 'paid',
      paymentChoice,
      totalCents,
      amountPaidCents,
      remainingCents,
      approvalStatus: 'pending',
      amountCents: amountPaidCents,
      lessonType: first.lessonType,
      instructorId: first.instructorId,
      start: first.start,
      end: first.end,
      suburb: first.suburb,
    }

    // Hold every lesson in the block as pending — not available until admin confirms
    for (const slot of slots) {
      if (slotIds.includes(slot.id)) {
        slot.status = 'pending'
        slot.booked = true
        slot.bookingId = id
      }
    }
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
