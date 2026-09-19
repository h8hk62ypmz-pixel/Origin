import type { Config, Context } from '@netlify/functions'
import { generateOpenSlots } from '../../shared/catalogue'
import {
  corsPreflight,
  json,
  loadPrices,
  loadSlots,
  saveSlots,
} from './_shared/store'

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') return corsPreflight()

  if (req.method === 'GET') {
    const url = new URL(req.url)
    const instructorId = url.searchParams.get('instructorId')
    const refresh = url.searchParams.get('refresh') === '1'

    let slots = await loadSlots()
    if (refresh) {
      const prices = await loadPrices()
      const booked = slots.filter((s) => s.booked)
      const bookedIds = new Set(booked.map((s) => s.id))
      const fresh = generateOpenSlots(new Date(), prices)
      slots = [...booked, ...fresh.filter((s) => !bookedIds.has(s.id))]
      await saveSlots(slots)
    }

    const filtered = instructorId
      ? slots.filter((s) => s.instructorId === instructorId)
      : slots

    return json({
      slots: filtered,
      available: filtered.filter((s) => !s.booked),
    })
  }

  return json({ error: 'Method not allowed' }, 405)
}

export const config: Config = {
  path: '/api/slots',
  method: ['GET', 'OPTIONS'],
}
