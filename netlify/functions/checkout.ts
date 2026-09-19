import type { Config, Context } from '@netlify/functions'
import { corsPreflight, json, loadSlots } from './_shared/store'

/**
 * Payment endpoint. Without STRIPE_SECRET_KEY, returns a demo checkout
 * token so the booking flow works locally. Wire real Stripe Checkout
 * by setting STRIPE_SECRET_KEY + STRIPE_PRICE / success URL env vars.
 */
export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') return corsPreflight()
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const body = (await req.json()) as { slotId?: string; email?: string; studentName?: string }
  if (!body.slotId) return json({ error: 'slotId required' }, 400)

  const slots = await loadSlots()
  const slot = slots.find((s) => s.id === body.slotId)
  if (!slot) return json({ error: 'Slot not found' }, 404)
  if (slot.booked) return json({ error: 'Slot unavailable' }, 409)

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    return json({
      mode: 'demo',
      clientSecret: `demo_${slot.id}`,
      amountCents: slot.priceCents,
      currency: 'aud',
      message:
        'Demo payment ready. Connect Stripe (STRIPE_SECRET_KEY) for live card payments.',
    })
  }

  // Live Stripe Checkout Session (requires stripe package + keys in production)
  try {
    const params = new URLSearchParams()
    params.set('mode', 'payment')
    params.set('success_url', `${process.env.URL || 'http://localhost:5173'}/confirmation?session_id={CHECKOUT_SESSION_ID}`)
    params.set('cancel_url', `${process.env.URL || 'http://localhost:5173'}/book`)
    params.set('customer_email', body.email || '')
    params.set('line_items[0][price_data][currency]', 'aud')
    params.set('line_items[0][price_data][unit_amount]', String(slot.priceCents))
    params.set(
      'line_items[0][price_data][product_data][name]',
      `DriveSA lesson — ${slot.suburb}`,
    )
    params.set('line_items[0][quantity]', '1')
    params.set('metadata[slotId]', slot.id)
    params.set('metadata[studentName]', body.studentName || '')

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    })
    const session = (await res.json()) as { id?: string; url?: string; error?: { message: string } }
    if (!res.ok) {
      return json({ error: session.error?.message || 'Stripe error' }, 502)
    }
    return json({
      mode: 'stripe',
      sessionId: session.id,
      url: session.url,
      amountCents: slot.priceCents,
      currency: 'aud',
    })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Payment setup failed' }, 500)
  }
}

export const config: Config = {
  path: '/api/checkout',
  method: ['POST', 'OPTIONS'],
}
