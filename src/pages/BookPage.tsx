import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, startOfWeek } from 'date-fns'
import { WeekCalendar } from '../components/WeekCalendar'
import { LicenceUpload } from '../components/LicenceUpload'
import { INSTRUCTORS } from '@shared/catalogue'
import {
  createBooking,
  createCheckout,
  fetchSlots,
  formatAud,
  getInstructor,
} from '../lib/api'
import type { CreateBookingPayload, LessonSlot, LicenceAttachment } from '@shared/types'
import { LESSON_LABELS } from '@shared/types'

type Step = 1 | 2 | 3

export function BookPage() {
  const navigate = useNavigate()
  const [slots, setSlots] = useState<LessonSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [instructorFilter, setInstructorFilter] = useState<string | 'all'>('all')
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  )
  const [selected, setSelected] = useState<LessonSlot | null>(null)
  const [step, setStep] = useState<Step>(1)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [studentName, setStudentName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [licence, setLicence] = useState<Partial<LicenceAttachment>>({})
  const [checkoutHint, setCheckoutHint] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void fetchSlots(instructorFilter === 'all' ? undefined : instructorFilter)
      .then((data) => {
        if (!cancelled) setSlots(data)
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [instructorFilter])

  const visibleSlots = useMemo(() => slots, [slots])

  function onSelectSlot(slot: LessonSlot) {
    setSelected(slot)
    setStep(2)
    setError(null)
  }

  async function goToPayment() {
    setError(null)
    if (!selected) return
    if (!studentName.trim() || !email.trim() || !phone.trim()) {
      setError('Please fill in your name, email, and phone.')
      return
    }
    if (!licence.type || !licence.fileName || !licence.dataUrl) {
      setError('Attach a photo or PDF of the licence before paying.')
      return
    }
    if (
      (licence.type === 'international' || licence.type === 'interstate') &&
      !licence.countryOrState?.trim()
    ) {
      setError('Tell us where the licence was issued.')
      return
    }

    try {
      const checkout = await createCheckout(selected.id, email, studentName)
      setCheckoutHint(checkout.message ?? null)
      if (checkout.mode === 'stripe' && checkout.url) {
        window.location.href = checkout.url
        return
      }
      setStep(3)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start payment')
    }
  }

  async function confirmPay() {
    if (!selected) return
    setSubmitting(true)
    setError(null)
    try {
      const payload: CreateBookingPayload = {
        slotId: selected.id,
        studentName,
        email,
        phone,
        notes,
        licence: licence as LicenceAttachment,
        paymentMethod: 'demo',
      }
      const booking = await createBooking(payload)
      navigate(`/confirmation/${booking.id}`, { state: { booking } })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Booking failed')
    } finally {
      setSubmitting(false)
    }
  }

  const instructor = selected ? getInstructor(selected.instructorId) : null

  return (
    <main className="shell section">
      <div className="section-head">
        <h2>Live lesson calendar</h2>
        <p>
          Everyone sees the same open times. Choose a slot, attach your licence, and pay to lock
          it in.
        </p>
      </div>

      <div className="filters" role="group" aria-label="Filter instructors">
        <button
          type="button"
          className={`chip-filter${instructorFilter === 'all' ? ' is-on' : ''}`}
          onClick={() => setInstructorFilter('all')}
        >
          All instructors
        </button>
        {INSTRUCTORS.map((inst) => (
          <button
            key={inst.id}
            type="button"
            className={`chip-filter${instructorFilter === inst.id ? ' is-on' : ''}`}
            onClick={() => setInstructorFilter(inst.id)}
          >
            {inst.name} · {inst.suburb}
          </button>
        ))}
      </div>

      <div className="split">
        <div>
          {loading ? (
            <div className="calendar-panel">Loading Adelaide availability…</div>
          ) : (
            <WeekCalendar
              slots={visibleSlots}
              weekStart={weekStart}
              selectedId={selected?.id}
              onSelect={onSelectSlot}
              onWeekChange={setWeekStart}
            />
          )}

          <div className="instructor-list" style={{ marginTop: '1.25rem' }}>
            {INSTRUCTORS.filter(
              (i) => instructorFilter === 'all' || instructorFilter === i.id,
            ).map((inst) => (
              <div
                key={inst.id}
                className={`instructor-row${instructorFilter === inst.id ? ' is-active' : ''}`}
                onClick={() => setInstructorFilter(inst.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setInstructorFilter(inst.id)
                }}
                role="button"
                tabIndex={0}
              >
                <div
                  className="avatar"
                  style={{ background: `hsl(${inst.photoHue} 42% 32%)` }}
                >
                  {inst.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </div>
                <div>
                  <h4>{inst.name}</h4>
                  <p>
                    {inst.suburb} · {inst.vehicle}
                    <br />
                    {inst.bio}
                  </p>
                </div>
                <div className="rating">{inst.rating.toFixed(1)}</div>
              </div>
            ))}
          </div>
        </div>

        <aside className="wizard" aria-live="polite">
          <div className="steps">
            <span className={`step-pill${step === 1 ? ' is-active' : ''}${step > 1 ? ' is-done' : ''}`}>
              1 Time
            </span>
            <span className={`step-pill${step === 2 ? ' is-active' : ''}${step > 2 ? ' is-done' : ''}`}>
              2 Details & licence
            </span>
            <span className={`step-pill${step === 3 ? ' is-active' : ''}`}>3 Pay</span>
          </div>

          {error && <div className="error-banner">{error}</div>}

          {step === 1 && (
            <p style={{ margin: 0, opacity: 0.8, lineHeight: 1.5 }}>
              Tap an open time on the calendar. Booked slots are greyed out for everyone the
              moment they’re taken.
            </p>
          )}

          {step >= 2 && selected && (
            <div className="summary-box">
              <h3>{format(new Date(selected.start), "EEE d MMM · h:mm a")}</h3>
              <p>
                {instructor?.name} · {selected.suburb}
              </p>
              <p>
                {LESSON_LABELS[selected.lessonType]} · {formatAud(selected.priceCents)}
              </p>
            </div>
          )}

          {step === 2 && (
            <>
              <div className="field-grid" style={{ marginBottom: '1rem' }}>
                <div className="field">
                  <label htmlFor="studentName">Full name</label>
                  <input
                    id="studentName"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    autoComplete="name"
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="phone">Mobile</label>
                  <input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                    placeholder="04…"
                    required
                  />
                </div>
                <div className="field full">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
                <div className="field full">
                  <label htmlFor="notes">Notes for instructor</label>
                  <textarea
                    id="notes"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Pickup suburb, dual-control preference, test date…"
                  />
                </div>
              </div>

              <LicenceUpload value={licence} onChange={setLicence} />

              <div className="wizard-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>
                  Back
                </button>
                <button type="button" className="btn btn-primary" onClick={() => void goToPayment()}>
                  Continue to payment
                </button>
              </div>
            </>
          )}

          {step === 3 && selected && (
            <>
              <div className="pay-demo">
                <h3 style={{ margin: '0 0 0.35rem', fontSize: '1.35rem' }}>Pay now</h3>
                <p className="hint">
                  {checkoutHint ||
                    'Demo checkout — no card is charged. Add STRIPE_SECRET_KEY on Netlify for live AUD payments.'}
                </p>
                <div className="field-grid">
                  <div className="field full">
                    <label htmlFor="card">Card number</label>
                    <input id="card" defaultValue="4242 4242 4242 4242" readOnly />
                  </div>
                  <div className="field">
                    <label htmlFor="exp">Expiry</label>
                    <input id="exp" defaultValue="12 / 28" readOnly />
                  </div>
                  <div className="field">
                    <label htmlFor="cvc">CVC</label>
                    <input id="cvc" defaultValue="123" readOnly />
                  </div>
                </div>
              </div>
              <div className="wizard-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setStep(2)}>
                  Back
                </button>
                <button
                  type="button"
                  className="btn btn-mark"
                  disabled={submitting}
                  onClick={() => void confirmPay()}
                >
                  {submitting
                    ? 'Booking…'
                    : `Pay ${formatAud(selected.priceCents)} & book`}
                </button>
              </div>
            </>
          )}
        </aside>
      </div>
    </main>
  )
}
