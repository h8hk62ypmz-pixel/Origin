import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { fetchBookings, formatAud, getInstructor } from '../lib/api'
import type { Booking } from '@shared/types'
import { APPROVAL_LABELS, LESSON_LABELS, LICENCE_LABELS } from '@shared/types'

export function ManagePage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void fetchBookings()
      .then(setBookings)
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="shell section">
      <div className="section-head">
        <h2>My bookings</h2>
        <p>
          Pending blocks are held on the calendar until an admin confirms. Confirmed lessons are
          good to go.
        </p>
      </div>

      {loading && <p>Loading…</p>}

      {!loading && bookings.length === 0 && (
        <div className="wizard">
          <p style={{ marginTop: 0 }}>No bookings yet.</p>
          <Link to="/book" className="btn btn-mark">
            Open the calendar
          </Link>
        </div>
      )}

      <div className="instructor-list">
        {bookings.map((b) => {
          const lessons = b.lessons?.length
            ? b.lessons
            : [
                {
                  slotId: b.slotId,
                  start: b.start,
                  instructorId: b.instructorId,
                  lessonType: b.lessonType,
                  priceCents: b.amountCents,
                },
              ]
          const status = b.approvalStatus ?? 'confirmed'
          return (
            <article key={b.id} className="calendar-panel" style={{ marginBottom: '0.85rem' }}>
              <div className={`status-badge status-${status}`}>{APPROVAL_LABELS[status]}</div>
              <h3 style={{ fontSize: '1.45rem', marginBottom: '0.35rem' }}>
                {lessons.length} lesson{lessons.length > 1 ? 's' : ''} ·{' '}
                {formatAud(b.totalCents ?? b.amountCents)}
              </h3>
              <p style={{ margin: '0 0 0.5rem', opacity: 0.8 }}>
                Paid {formatAud(b.amountPaidCents ?? b.amountCents)}
                {b.paymentChoice === 'deposit'
                  ? ` deposit · ${formatAud(b.remainingCents ?? 0)} remaining`
                  : ' in full'}
              </p>
              <ul style={{ margin: '0 0 0.5rem', paddingLeft: '1.1rem', opacity: 0.85 }}>
                {lessons.map((l) => (
                  <li key={l.slotId}>
                    {format(new Date(l.start), "EEE d MMM · h:mm a")} —{' '}
                    {getInstructor(l.instructorId)?.name} · {LESSON_LABELS[l.lessonType]}
                  </li>
                ))}
              </ul>
              <p style={{ margin: '0 0 0.35rem' }}>
                <strong>{b.studentName}</strong>
              </p>
              {b.meetupLocation && (
                <p style={{ margin: '0 0 0.35rem', fontSize: '0.92rem' }}>
                  Meetup: {b.meetupLocation}
                </p>
              )}
              <p style={{ margin: 0, fontSize: '0.92rem', opacity: 0.75 }}>
                Licence: {LICENCE_LABELS[b.licence.type]}
                {b.licence.fileName ? ` (${b.licence.fileName})` : ''}
              </p>
              <Link
                to={`/confirmation/${b.id}`}
                state={{ booking: b }}
                className="btn btn-ghost"
                style={{ marginTop: '0.85rem' }}
              >
                View details
              </Link>
            </article>
          )
        })}
      </div>
    </main>
  )
}
