import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { fetchBookings, formatAud, getInstructor } from '../lib/api'
import type { Booking } from '@shared/types'
import { APPROVAL_LABELS, LESSON_LABELS, LICENCE_LABELS } from '@shared/types'

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

  const pending = booking.approvalStatus === 'pending' || !booking.approvalStatus
  const lessons = booking.lessons?.length
    ? booking.lessons
    : [
        {
          slotId: booking.slotId,
          start: booking.start,
          end: booking.end,
          lessonType: booking.lessonType,
          instructorId: booking.instructorId,
          suburb: booking.suburb,
          priceCents: booking.totalCents ?? booking.amountCents,
        },
      ]

  return (
    <main className="shell success-panel">
      <div className={`check${pending ? ' is-pending' : ''}`} aria-hidden>
        {pending ? '…' : '✓'}
      </div>
      <h1>{pending ? 'Payment received — pending approval' : 'You’re confirmed'}</h1>
      <p style={{ opacity: 0.8, maxWidth: 440, margin: '0 auto' }}>
        {pending
          ? 'Your lesson block is held on the calendar (not available to others) until an admin confirms it.'
          : 'Admin has confirmed your lessons. You’re all set.'}
        {booking.paymentStatus === 'demo_paid' ? ' (Demo payment.)' : ''}
      </p>

      <dl className="booking-meta">
        <dt>Reference</dt>
        <dd>{booking.id}</dd>
        <dt>Status</dt>
        <dd>{APPROVAL_LABELS[booking.approvalStatus ?? 'pending']}</dd>
        <dt>Payment</dt>
        <dd>
          Paid {formatAud(booking.amountPaidCents ?? booking.amountCents)}
          {booking.paymentChoice === 'deposit'
            ? ` deposit · ${formatAud(booking.remainingCents ?? 0)} remaining`
            : ' (full block)'}
        </dd>
        <dt>Lessons in block</dt>
        <dd>
          <ul style={{ margin: '0.35rem 0 0', paddingLeft: '1.1rem' }}>
            {lessons.map((l) => {
              const instructor = getInstructor(l.instructorId)
              return (
                <li key={l.slotId}>
                  {format(new Date(l.start), "EEE d MMM · h:mm a")} — {instructor?.name} ·{' '}
                  {LESSON_LABELS[l.lessonType]} · {formatAud(l.priceCents)}
                </li>
              )
            })}
          </ul>
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
          Back to calendar
        </Link>
        <Link to="/manage" className="btn btn-primary">
          View my bookings
        </Link>
      </div>
    </main>
  )
}
