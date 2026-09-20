import type { Config, Context } from '@netlify/functions'
import type { LessonPriceMap, LessonType } from '../../shared/types'
import { LESSON_LABELS, LESSON_PRICES, isLessonType, isSlotOpen } from '../../shared/types'
import { generateOpenSlots } from '../../shared/catalogue'
import {
  applyPricesToOpenSlots,
  corsPreflight,
  json,
  loadPrices,
  loadSlots,
  requireAdmin,
  savePrices,
  saveSlots,
} from './_shared/store'

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') return corsPreflight()

  if (req.method === 'GET') {
    const prices = await loadPrices()
    return json({
      prices,
      defaults: LESSON_PRICES,
      labels: LESSON_LABELS,
    })
  }

  if (req.method === 'PUT') {
    const denied = requireAdmin(req)
    if (denied) return denied

    const body = (await req.json()) as {
      prices?: Partial<LessonPriceMap>
      applyToOpenSlots?: boolean
      regenerateSlots?: boolean
    }

    if (!body.prices || typeof body.prices !== 'object') {
      return json({ error: 'prices object required' }, 400)
    }

    const current = await loadPrices()
    const next: LessonPriceMap = { ...current }

    for (const [key, value] of Object.entries(body.prices)) {
      if (!isLessonType(key)) continue
      const cents = Number(value)
      if (!Number.isFinite(cents) || cents < 0) {
        return json({ error: `Invalid price for ${key}` }, 400)
      }
      next[key as LessonType] = Math.round(cents)
    }

    await savePrices(next)

    let slots = await loadSlots()
    let updatedOpen = 0

    if (body.regenerateSlots) {
      const held = slots.filter((s) => !isSlotOpen(s))
      const fresh = generateOpenSlots(new Date(), next)
      const heldIds = new Set(held.map((s) => s.id))
      slots = [...held, ...fresh.filter((s) => !heldIds.has(s.id))]
      updatedOpen = slots.filter((s) => isSlotOpen(s)).length
      await saveSlots(slots)
    } else if (body.applyToOpenSlots !== false) {
      const before = slots.map((s) => s.priceCents)
      slots = applyPricesToOpenSlots(slots, next)
      updatedOpen = slots.filter((s, i) => isSlotOpen(s) && s.priceCents !== before[i]).length
      await saveSlots(slots)
    }

    return json({
      prices: next,
      updatedOpenSlots: updatedOpen,
      message: 'Prices saved. Open lesson times now show the new amounts to customers.',
    })
  }

  return json({ error: 'Method not allowed' }, 405)
}

export const config: Config = {
  path: '/api/admin/prices',
  method: ['GET', 'PUT', 'OPTIONS'],
}
