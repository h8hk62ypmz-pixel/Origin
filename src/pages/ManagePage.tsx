import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { fetchBookings, formatAud, getInstructor } from '../lib/api'
import type { Booking } from '../types'
import { LESSON_LABELS, LICENCE_LABELS } from '../types'

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
          Confirmed lessons with licence attachments. In production this view is scoped to your
          email; here we show bookings from this browser / site store.
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
          const instructor = getInstructor(b.instructorId)
          return (
            <article key={b.id} className="calendar-panel" style={{ marginBottom: '0.85rem' }}>
              <h3 style={{ fontSize: '1.45rem', marginBottom: '0.35rem' }}>
                {format(new Date(b.start), "EEE d MMM · h:mm a")}
              </h3>
              <p style={{ margin: '0 0 0.5rem', opacity: 0.8 }}>
                {instructor?.name} · {b.suburb} · {LESSON_LABELS[b.lessonType]}
              </p>
              <p style={{ margin: '0 0 0.35rem' }}>
                <strong>{b.studentName}</strong> · {formatAud(b.amountCents)} ·{' '}
                {b.paymentStatus.replace('_', ' ')}
              </p>
              <p style={{ margin: 0, fontSize: '0.92rem', opacity: 0.75 }}>
                Licence: {LICENCE_LABELS[b.licence.type]}
                {b.licence.fileName ? ` (${b.licence.fileName})` : ''}
                {b.licence.blobKey ? ' · stored securely' : ''}
              </p>
              <Link
                to={`/confirmation/${b.id}`}
                state={{ booking: b }}
                className="btn btn-ghost"
                style={{ marginTop: '0.85rem' }}
              >
                View confirmation
              </Link>
            </article>
          )
        })}
      </div>
    </main>
  )
}
