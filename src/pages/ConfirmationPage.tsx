import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { fetchBookings, formatAud, getInstructor } from '../lib/api'
import type { Booking } from '../types'
import { LESSON_LABELS, LICENCE_LABELS } from '../types'

export function ConfirmationPage() {
  const { id } = useParams()
  const location = useLocation()
  const fromState = (location.state as { booking?: Booking } | null)?.booking
  const [booking, setBooking] = useState<Booking | null>(fromState ?? null)

  useEffect(() => {
    if (booking || !id) return
    void fetchBookings().then((list) => {
      setBooking(list.find((b) => b.id === id) ?? null)
    })
  }, [id, booking])

  if (!booking) {
    return (
      <main className="shell success-panel">
        <h1>Booking not found</h1>
        <p>That confirmation link may have expired locally.</p>
        <Link to="/book" className="btn btn-primary">
          Back to calendar
        </Link>
      </main>
    )
  }

  const instructor = getInstructor(booking.instructorId)

  return (
    <main className="shell success-panel">
      <div className="check" aria-hidden>
        ✓
      </div>
      <h1>You’re booked</h1>
      <p style={{ opacity: 0.8, maxWidth: 420, margin: '0 auto' }}>
        Payment received{booking.paymentStatus === 'demo_paid' ? ' (demo)' : ''}. Your instructor
        can see the attached licence ahead of the lesson.
      </p>

      <dl className="booking-meta">
        <dt>Reference</dt>
        <dd>{booking.id}</dd>
        <dt>When</dt>
        <dd>{format(new Date(booking.start), "EEEE d MMMM yyyy · h:mm a")}</dd>
        <dt>Instructor</dt>
        <dd>
          {instructor?.name ?? 'Instructor'} · {booking.suburb}
        </dd>
        <dt>Lesson</dt>
        <dd>
          {LESSON_LABELS[booking.lessonType]} · {formatAud(booking.amountCents)}
        </dd>
        <dt>Student</dt>
        <dd>
          {booking.studentName} · {booking.email} · {booking.phone}
        </dd>
        <dt>Licence on file</dt>
        <dd>
          {LICENCE_LABELS[booking.licence.type]}
          {booking.licence.fileName ? ` · ${booking.licence.fileName}` : ''}
          {booking.licence.countryOrState ? ` · ${booking.licence.countryOrState}` : ''}
        </dd>
      </dl>

      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link to="/book" className="btn btn-ghost">
          Book another
        </Link>
        <Link to="/manage" className="btn btn-primary">
          View my bookings
        </Link>
      </div>
    </main>
  )
}
