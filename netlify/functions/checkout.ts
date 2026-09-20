import type { Config, Context } from '@netlify/functions'
import type { PaymentChoice } from '../../shared/types'
import {
  calcPaymentAmounts,
  isSlotOpen,
} from '../../shared/types'
import {
  corsPreflight,
  json,
  loadSlots,
} from './_shared/store'

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') return corsPreflight()
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const body = (await req.json()) as {
    slotId?: string
    slotIds?: string[]
    email?: string
    studentName?: string
    paymentChoice?: PaymentChoice
  }

  const slotIds = [...new Set(body.slotIds?.length ? body.slotIds : body.slotId ? [body.slotId] : [])]
  if (slotIds.length === 0) return json({ error: 'slotId or slotIds required' }, 400)

  const paymentChoice: PaymentChoice = body.paymentChoice === 'deposit' ? 'deposit' : 'full'
  const slots = await loadSlots()
  const selected = slotIds.map((id) => slots.find((s) => s.id === id))
  if (selected.some((s) => !s)) return json({ error: 'Slot not found' }, 404)
  if (selected.some((s) => s && !isSlotOpen(s))) {
    return json({ error: 'One or more slots are pending or unavailable' }, 409)
  }

  const totalCents = selected.reduce((sum, s) => sum + (s?.priceCents ?? 0), 0)
  const { amountPaidCents, remainingCents, depositCents } = calcPaymentAmounts(
    totalCents,
    paymentChoice,
  )

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    return json({
      mode: 'demo',
      clientSecret: `demo_${slotIds.join('_')}`,
      amountCents: amountPaidCents,
      totalCents,
      remainingCents,
      depositCents,
      paymentChoice,
      currency: 'aud',
      lessonCount: slotIds.length,
      message:
        paymentChoice === 'deposit'
          ? `Demo deposit (${Math.round((depositCents / totalCents) * 100)}% of block). Admin must still approve before lessons are confirmed.`
          : 'Demo full payment. Admin must still approve before lessons are confirmed.',
    })
  }

  try {
    const label =
      slotIds.length > 1
        ? `DriveSA lesson block ×${slotIds.length}`
        : `DriveSA lesson — ${selected[0]?.suburb ?? 'SA'}`
    const params = new URLSearchParams()
    params.set('mode', 'payment')
    params.set(
      'success_url',
      `${process.env.URL || 'http://localhost:5173'}/confirmation?session_id={CHECKOUT_SESSION_ID}`,
    )
    params.set('cancel_url', `${process.env.URL || 'http://localhost:5173'}/book`)
    params.set('customer_email', body.email || '')
    params.set('line_items[0][price_data][currency]', 'aud')
    params.set('line_items[0][price_data][unit_amount]', String(amountPaidCents))
    params.set(
      'line_items[0][price_data][product_data][name]',
      paymentChoice === 'deposit' ? `${label} (deposit)` : label,
    )
    params.set('line_items[0][quantity]', '1')
    params.set('metadata[slotIds]', slotIds.join(','))
    params.set('metadata[paymentChoice]', paymentChoice)
    params.set('metadata[studentName]', body.studentName || '')

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    })
    const session = (await res.json()) as {
      id?: string
      url?: string
      error?: { message: string }
    }
    if (!res.ok) {
      return json({ error: session.error?.message || 'Stripe error' }, 502)
    }
    return json({
      mode: 'stripe',
      sessionId: session.id,
      url: session.url,
      amountCents: amountPaidCents,
      totalCents,
      remainingCents,
      depositCents,
      paymentChoice,
      currency: 'aud',
      lessonCount: slotIds.length,
    })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Payment setup failed' }, 500)
  }
}

export const config: Config = {
  path: '/api/checkout',
  method: ['POST', 'OPTIONS'],
}
