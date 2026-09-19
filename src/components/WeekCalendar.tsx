import {
  addDays,
  format,
  isSameDay,
  isSameWeek,
  startOfWeek,
} from 'date-fns'
import type { LessonSlot } from '@shared/types'
import { LESSON_LABELS } from '@shared/types'
import { formatAud, getInstructor } from '../lib/api'

interface Props {
  slots: LessonSlot[]
  weekStart: Date
  selectedId?: string
  onSelect: (slot: LessonSlot) => void
  onWeekChange: (next: Date) => void
}

export function WeekCalendar({
  slots,
  weekStart,
  selectedId,
  onSelect,
  onWeekChange,
}: Props) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const today = new Date()

  return (
    <div className="calendar-panel">
      <div className="cal-toolbar">
        <h3>{format(weekStart, 'MMMM yyyy')}</h3>
        <div className="cal-nav">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => onWeekChange(addDays(weekStart, -7))}
            aria-label="Previous week"
          >
            ←
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => onWeekChange(startOfWeek(new Date(), { weekStartsOn: 1 }))}
          >
            This week
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => onWeekChange(addDays(weekStart, 7))}
            aria-label="Next week"
          >
            →
          </button>
        </div>
      </div>

      <div className="week-grid" role="grid" aria-label="Lesson availability">
        {days.map((day) => {
          const daySlots = slots
            .filter((s) => isSameDay(new Date(s.start), day))
            .sort((a, b) => +new Date(a.start) - +new Date(b.start))

          return (
            <div
              key={day.toISOString()}
              className={`day-col${isSameDay(day, today) ? ' is-today' : ''}`}
              role="gridcell"
            >
              <div className="day-label">{format(day, 'EEE')}</div>
              <div className="day-num">{format(day, 'd')}</div>
              {daySlots.length === 0 && <div className="empty-day">No times</div>}
              {daySlots.map((slot, idx) => {
                const instructor = getInstructor(slot.instructorId)
                return (
                  <button
                    key={slot.id}
                    type="button"
                    className={`slot-chip${slot.booked ? ' is-booked' : ''}${
                      selectedId === slot.id ? ' is-selected' : ''
                    }`}
                    style={{ animationDelay: `${idx * 40}ms` }}
                    disabled={slot.booked}
                    onClick={() => onSelect(slot)}
                    title={`${LESSON_LABELS[slot.lessonType]} with ${instructor?.name ?? 'instructor'}`}
                  >
                    {format(new Date(slot.start), 'h:mm a')}
                    <small>
                      {instructor?.name.split(' ')[0]} · {formatAud(slot.priceCents)}
                    </small>
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>

      <div className="legend">
        <span>
          <i style={{ background: 'var(--road)' }} /> Open
        </span>
        <span>
          <i style={{ background: 'var(--mark)' }} /> Selected
        </span>
        <span>
          <i style={{ background: '#c9c4ba' }} /> Booked
        </span>
        {!isSameWeek(weekStart, today, { weekStartsOn: 1 }) && (
          <span>Showing week of {format(weekStart, 'd MMM')}</span>
        )}
      </div>

      <div className="slot-list" aria-label="Open lessons this week">
        <h4>Open this week</h4>
        {slots
          .filter(
            (s) =>
              !s.booked &&
              isSameWeek(new Date(s.start), weekStart, { weekStartsOn: 1 }),
          )
          .sort((a, b) => +new Date(a.start) - +new Date(b.start))
          .slice(0, 12)
          .map((slot) => {
            const instructor = getInstructor(slot.instructorId)
            return (
              <button
                key={`list-${slot.id}`}
                type="button"
                className={`slot-row${selectedId === slot.id ? ' is-selected' : ''}`}
                onClick={() => onSelect(slot)}
              >
                <span>
                  {format(new Date(slot.start), "EEE d MMM · h:mm a")}
                  <small>
                    {instructor?.name} · {slot.suburb} · {LESSON_LABELS[slot.lessonType]}
                  </small>
                </span>
                <strong>{formatAud(slot.priceCents)}</strong>
              </button>
            )
          })}
      </div>
    </div>
  )
}
