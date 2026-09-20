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
import type {
  CreateBookingPayload,
  LessonSlot,
  LicenceAttachment,
  PaymentChoice,
} from '@shared/types'
import {
  DEPOSIT_PERCENT,
  LESSON_LABELS,
  calcPaymentAmounts,
  isSlotOpen,
} from '@shared/types'

type Step = 1 | 2 | 3

export function BookPage() {
  const navigate = useNavigate()
  const [slots, setSlots] = useState<LessonSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [instructorFilter, setInstructorFilter] = useState<string | 'all'>('all')
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  )
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [step, setStep] = useState<Step>(1)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [paymentChoice, setPaymentChoice] = useState<PaymentChoice>('full')

  const [studentName, setStudentName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [meetupLocation, setMeetupLocation] = useState('')
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

  const selectedSlots = useMemo(
    () =>
      selectedIds
        .map((id) => slots.find((s) => s.id === id))
        .filter((s): s is LessonSlot => Boolean(s && isSlotOpen(s)))
        .sort((a, b) => +new Date(a.start) - +new Date(b.start)),
    [selectedIds, slots],
  )

  const totalCents = selectedSlots.reduce((sum, s) => sum + s.priceCents, 0)
  const amounts = calcPaymentAmounts(totalCents, paymentChoice)

  function onToggleSlot(slot: LessonSlot) {
    if (!isSlotOpen(slot)) return
    setSelectedIds((ids) =>
      ids.includes(slot.id) ? ids.filter((id) => id !== slot.id) : [...ids, slot.id],
    )
    setError(null)
  }

  function goToDetails() {
    if (selectedSlots.length === 0) {
      setError('Select at least one open lesson for your block.')
      return
    }
    setStep(2)
    setError(null)
  }

  async function goToPayment() {
    setError(null)
    if (selectedSlots.length === 0) return
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
      const checkout = await createCheckout(
        selectedSlots.map((s) => s.id),
        email,
        studentName,
        paymentChoice,
      )
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
    if (selectedSlots.length === 0) return
    setSubmitting(true)
    setError(null)
    try {
      const payload: CreateBookingPayload = {
        slotIds: selectedSlots.map((s) => s.id),
        studentName,
        email,
        phone,
        notes,
        meetupLocation,
        licence: licence as LicenceAttachment,
        paymentMethod: 'demo',
        paymentChoice,
      }
      const booking = await createBooking(payload)
      navigate(`/confirmation/${booking.id}`, { state: { booking } })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Booking failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="shell section">
      <div className="section-head">
        <h2>Live lesson calendar</h2>
        <p>
          Build a block of lessons, pay in full or leave a {DEPOSIT_PERCENT}% deposit. Times show as
          pending until admin confirms — they won’t be available to anyone else.
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
              slots={slots}
              weekStart={weekStart}
              selectedIds={selectedIds}
              onToggle={onToggleSlot}
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
              1 Block
            </span>
            <span className={`step-pill${step === 2 ? ' is-active' : ''}${step > 2 ? ' is-done' : ''}`}>
              2 Details & licence
            </span>
            <span className={`step-pill${step === 3 ? ' is-active' : ''}`}>3 Pay</span>
          </div>

          {error && <div className="error-banner">{error}</div>}

          {step === 1 && (
            <>
              <p style={{ margin: '0 0 1rem', opacity: 0.8, lineHeight: 1.5 }}>
                Tap open times to build your lesson block. Pending times are held for someone else
                and can’t be selected.
              </p>
              {selectedSlots.length > 0 && (
                <div className="summary-box">
                  <h3>
                    {selectedSlots.length} lesson{selectedSlots.length > 1 ? 's' : ''} ·{' '}
                    {formatAud(totalCents)}
                  </h3>
                  {selectedSlots.map((s) => {
                    const inst = getInstructor(s.instructorId)
                    return (
                      <p key={s.id}>
                        {format(new Date(s.start), "EEE d MMM · h:mm a")} — {inst?.name} ·{' '}
                        {formatAud(s.priceCents)}
                      </p>
                    )
                  })}
                </div>
              )}
              <div className="wizard-actions">
                <span />
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={selectedSlots.length === 0}
                  onClick={goToDetails}
                >
                  Continue with block
                </button>
              </div>
            </>
          )}

          {step >= 2 && selectedSlots.length > 0 && (
            <div className="summary-box">
              <h3>
                Block · {selectedSlots.length} lesson{selectedSlots.length > 1 ? 's' : ''}
              </h3>
              <p>Total {formatAud(totalCents)}</p>
              {selectedSlots.slice(0, 4).map((s) => (
                <p key={s.id}>
                  {format(new Date(s.start), "EEE d MMM · h:mm a")} · {LESSON_LABELS[s.lessonType]}
                </p>
              ))}
              {selectedSlots.length > 4 && <p>+{selectedSlots.length - 4} more</p>}
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
                  <label htmlFor="meetupLocation">Meetup location suggestion</label>
                  <input
                    id="meetupLocation"
                    value={meetupLocation}
                    onChange={(e) => setMeetupLocation(e.target.value)}
                    placeholder="e.g. Coles car park, Norwood Parade — optional"
                    autoComplete="street-address"
                  />
                </div>
                <div className="field full">
                  <label htmlFor="notes">Notes for instructor</label>
                  <textarea
                    id="notes"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Dual-control preference, test date, anything else…"
                  />
                </div>
              </div>

              <LicenceUpload value={licence} onChange={setLicence} />

              <fieldset className="pay-choice">
                <legend>How would you like to pay?</legend>
                <label className={`pay-option${paymentChoice === 'full' ? ' is-on' : ''}`}>
                  <input
                    type="radio"
                    name="paymentChoice"
                    checked={paymentChoice === 'full'}
                    onChange={() => setPaymentChoice('full')}
                  />
                  <span>
                    <strong>Pay full block</strong>
                    <small>{formatAud(totalCents)} now</small>
                  </span>
                </label>
                <label className={`pay-option${paymentChoice === 'deposit' ? ' is-on' : ''}`}>
                  <input
                    type="radio"
                    name="paymentChoice"
                    checked={paymentChoice === 'deposit'}
                    onChange={() => setPaymentChoice('deposit')}
                  />
                  <span>
                    <strong>Pay {DEPOSIT_PERCENT}% deposit</strong>
                    <small>
                      {formatAud(amounts.depositCents)} now · {formatAud(amounts.remainingCents)}{' '}
                      remaining after approval
                    </small>
                  </span>
                </label>
              </fieldset>

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

          {step === 3 && selectedSlots.length > 0 && (
            <>
              <div className="pay-demo">
                <h3 style={{ margin: '0 0 0.35rem', fontSize: '1.35rem' }}>
                  {paymentChoice === 'deposit' ? 'Pay deposit' : 'Pay full block'}
                </h3>
                <p className="hint">
                  {checkoutHint ||
                    'After payment, your block stays pending until an admin confirms it.'}
                </p>
                <p style={{ margin: '0 0 0.85rem' }}>
                  <strong>Pay now:</strong> {formatAud(amounts.amountPaidCents)}
                  {paymentChoice === 'deposit' && (
                    <>
                      {' '}
                      · Remaining later: {formatAud(amounts.remainingCents)}
                    </>
                  )}
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
                    ? 'Submitting…'
                    : `Pay ${formatAud(amounts.amountPaidCents)} & submit`}
                </button>
              </div>
            </>
          )}
        </aside>
      </div>
    </main>
  )
}
