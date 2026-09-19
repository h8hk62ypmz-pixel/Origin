import type { Instructor, LessonSlot, LessonType } from '../types'
import { LESSON_PRICES } from '../types'
import { addDays, setHours, setMinutes, startOfDay } from 'date-fns'

export const INSTRUCTORS: Instructor[] = [
  {
    id: 'inst-maya',
    name: 'Maya Nguyen',
    suburb: 'Norwood',
    bio: 'Patient automatic lessons across the eastern suburbs. Great with first-timers and test nerves.',
    languages: ['English', 'Vietnamese'],
    vehicle: 'Toyota Corolla Hybrid (auto)',
    rating: 4.9,
    photoHue: 165,
  },
  {
    id: 'inst-james',
    name: 'James Okafor',
    suburb: 'Prospect',
    bio: 'Manual & highway specialist. Former VORT examiner assistant covering north Adelaide.',
    languages: ['English'],
    vehicle: 'Mazda 3 (manual)',
    rating: 4.8,
    photoHue: 28,
  },
  {
    id: 'inst-priya',
    name: 'Priya Chand',
    suburb: 'Glenelg',
    bio: 'International licence conversions and coastal-route confidence building.',
    languages: ['English', 'Hindi'],
    vehicle: 'Hyundai i30 (auto)',
    rating: 5.0,
    photoHue: 200,
  },
]

const LESSON_ROTATION: LessonType[] = [
  'auto_beginner',
  'manual_beginner',
  'test_prep',
  'highway',
  'international_conversion',
]

/** Generate open lesson slots for the next 14 days (Adelaide-style weekday hours). */
export function generateOpenSlots(fromDate = new Date()): LessonSlot[] {
  const slots: LessonSlot[] = []
  const base = startOfDay(fromDate)
  const hours = [8, 9, 10, 11, 13, 14, 15, 16]

  for (let day = 0; day < 14; day++) {
    const date = addDays(base, day)
    const dow = date.getDay()
    if (dow === 0) continue // closed Sundays

    INSTRUCTORS.forEach((instructor, iIdx) => {
      hours.forEach((hour, hIdx) => {
        // Thin out so the calendar isn't completely full
        if ((day + iIdx + hIdx) % 3 === 0) return

        const start = setMinutes(setHours(date, hour), 0)
        const end = setMinutes(setHours(date, hour + 1), 0)
        const lessonType = LESSON_ROTATION[(day + hIdx + iIdx) % LESSON_ROTATION.length]

        slots.push({
          id: `slot-${instructor.id}-${start.toISOString()}`,
          instructorId: instructor.id,
          start: start.toISOString(),
          end: end.toISOString(),
          lessonType,
          priceCents: LESSON_PRICES[lessonType],
          suburb: instructor.suburb,
          booked: false,
        })
      })
    })
  }

  return slots
}
