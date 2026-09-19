import type { Config, Context } from '@netlify/functions'
import { corsPreflight, json, loadSlots, saveSlots } from './_shared/store'
import { generateOpenSlots } from '../../shared/catalogue'

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') return corsPreflight()

  if (req.method === 'GET') {
    const url = new URL(req.url)
    const instructorId = url.searchParams.get('instructorId')
    const refresh = url.searchParams.get('refresh') === '1'

    let slots = await loadSlots()
    if (refresh) {
      slots = generateOpenSlots()
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
