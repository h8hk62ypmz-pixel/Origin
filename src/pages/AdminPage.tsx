import { format } from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  fetchBookings,
  fetchPrices,
  fetchSlots,
  formatAud,
  getInstructor,
  reviewBooking,
  savePrices,
  updateSlotPrice,
} from '../lib/api'
import type { Booking, LessonPriceMap, LessonSlot, LessonType } from '@shared/types'
import {
  LESSON_LABELS,
  LESSON_PRICES,
  isSlotOpen,
} from '@shared/types'

const PIN_KEY = 'drivesa.adminPin'

export function AdminPage() {
  const [pin, setPin] = useState(() => sessionStorage.getItem(PIN_KEY) || '')
  const [unlocked, setUnlocked] = useState(() => Boolean(sessionStorage.getItem(PIN_KEY)))
  const [prices, setPrices] = useState<LessonPriceMap>({ ...LESSON_PRICES })
  const [draftDollars, setDraftDollars] = useState<Record<LessonType, string>>(
    dollarsFromCents(LESSON_PRICES),
  )
  const [slots, setSlots] = useState<LessonSlot[]>([])
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [slotDrafts, setSlotDrafts] = useState<Record<string, string>>({})

  async function loadAll() {
    const [priceRes, slotRes, bookingRes] = await Promise.all([
      fetchPrices(),
      fetchSlots(),
      fetchBookings(),
    ])
    setPrices(priceRes.prices)
    setDraftDollars(dollarsFromCents(priceRes.prices))
    const openSlots = slotRes
      .filter((s) => isSlotOpen(s))
      .sort((a, b) => +new Date(a.start) - +new Date(b.start))
    setSlots(openSlots)
    setSlotDrafts(
      Object.fromEntries(openSlots.map((s) => [s.id, (s.priceCents / 100).toFixed(2)])),
    )
    setPendingBookings(
      bookingRes.filter((b) => (b.approvalStatus ?? 'pending') === 'pending'),
    )
  }

  useEffect(() => {
    void loadAll().catch((e: Error) => setError(e.message))
  }, [])

  const lessonTypes = useMemo(
    () => Object.keys(LESSON_LABELS) as LessonType[],
    [],
  )

  function unlock(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!pin.trim()) {
      setError('Enter the admin PIN.')
      return
    }
    sessionStorage.setItem(PIN_KEY, pin.trim())
    setUnlocked(true)
    setMessage('Admin unlocked. Approve pending lesson blocks or edit prices.')
  }

  async function saveLessonPrices() {
    if (!unlocked) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const next: LessonPriceMap = { ...prices }
      for (const type of lessonTypes) {
        const dollars = Number(draftDollars[type])
        if (!Number.isFinite(dollars) || dollars < 0) {
          throw new Error(`Invalid price for ${LESSON_LABELS[type]}`)
        }
        next[type] = Math.round(dollars * 100)
      }
      const result = await savePrices(pin, next, true)
      setPrices(result.prices)
      setMessage(result.message)
      await loadAll()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save prices')
      if (e instanceof Error && e.message.includes('PIN')) {
        sessionStorage.removeItem(PIN_KEY)
        setUnlocked(false)
      }
    } finally {
      setSaving(false)
    }
  }

  async function saveOneSlot(slotId: string) {
    if (!unlocked) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const dollars = Number(slotDrafts[slotId])
      if (!Number.isFinite(dollars) || dollars < 0) throw new Error('Enter a valid dollar amount')
      const result = await updateSlotPrice(pin, slotId, Math.round(dollars * 100))
      setMessage(result.message)
      await loadAll()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update slot')
    } finally {
      setSaving(false)
    }
  }

  async function decide(bookingId: string, action: 'confirm' | 'reject') {
    if (!unlocked) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const result = await reviewBooking(pin, bookingId, action)
      setMessage(result.message)
      await loadAll()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update booking')
    } finally {
      setSaving(false)
    }
  }

  if (!unlocked) {
    return (
      <main className="shell section">
        <div className="section-head">
          <h2>Admin</h2>
          <p>Approve pending lesson blocks and manage prices customers see.</p>
        </div>
        {error && <div className="error-banner">{error}</div>}
        <form className="wizard" style={{ maxWidth: 420 }} onSubmit={unlock}>
          <div className="field">
            <label htmlFor="adminPin">Admin PIN</label>
            <input
              id="adminPin"
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="drivesa"
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>
            Unlock admin
          </button>
        </form>
      </main>
    )
  }

  return (
    <main className="shell section">
      <div className="section-head">
        <h2>Admin</h2>
        <p>
          Confirm or reject paid lesson blocks. Pending times stay off the open calendar until you
          decide.
        </p>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {message && (
        <div
          className="error-banner"
          style={{ background: 'var(--bush-soft)', color: 'var(--ok)', borderColor: 'var(--bush)' }}
        >
          {message}
        </div>
      )}

      <section className="wizard" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.45rem', marginBottom: '0.75rem' }}>
          Pending approval ({pendingBookings.length})
        </h3>
        {pendingBookings.length === 0 && (
          <p style={{ margin: 0, opacity: 0.7 }}>No blocks waiting — you’re clear.</p>
        )}
        <div className="admin-slot-list">
          {pendingBookings.map((b) => {
            const lessons = b.lessons?.length
              ? b.lessons
              : [
                  {
                    slotId: b.slotId,
                    start: b.start,
                    instructorId: b.instructorId,
                    lessonType: b.lessonType,
                    suburb: b.suburb,
                    priceCents: b.amountCents,
                  },
                ]
            return (
              <div key={b.id} className="admin-pending-card">
                <div>
                  <strong>
                    {b.studentName} · {lessons.length} lesson
                    {lessons.length > 1 ? 's' : ''}
                  </strong>
                  <div style={{ fontSize: '0.9rem', opacity: 0.75, marginTop: '0.25rem' }}>
                    {b.email} · {b.phone}
                    <br />
                    Paid {formatAud(b.amountPaidCents ?? b.amountCents)}
                    {b.paymentChoice === 'deposit'
                      ? ` deposit (${formatAud(b.remainingCents ?? 0)} remaining)`
                      : ' in full'}{' '}
                    · block total {formatAud(b.totalCents ?? b.amountCents)}
                  </div>
                  <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.1rem', fontSize: '0.9rem' }}>
                    {lessons.map((l) => (
                      <li key={l.slotId}>
                        {format(new Date(l.start), "EEE d MMM · h:mm a")} —{' '}
                        {getInstructor(l.instructorId)?.name} · {LESSON_LABELS[l.lessonType]}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="admin-slot-actions">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={saving}
                    onClick={() => void decide(b.id, 'reject')}
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    className="btn btn-mark"
                    disabled={saving}
                    onClick={() => void decide(b.id, 'confirm')}
                  >
                    Confirm
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="wizard" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.45rem', marginBottom: '0.75rem' }}>Default lesson prices (AUD)</h3>
        <p style={{ marginTop: 0, opacity: 0.75, fontSize: '0.95rem' }}>
          Saving updates every open (not pending/confirmed) slot to match these amounts.
        </p>
        <div className="field-grid">
          {lessonTypes.map((type) => (
            <div className="field" key={type}>
              <label htmlFor={`price-${type}`}>{LESSON_LABELS[type]}</label>
              <div className="price-input">
                <span>$</span>
                <input
                  id={`price-${type}`}
                  inputMode="decimal"
                  value={draftDollars[type]}
                  onChange={(e) =>
                    setDraftDollars((d) => ({ ...d, [type]: e.target.value }))
                  }
                />
              </div>
            </div>
          ))}
        </div>
        <div className="wizard-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              sessionStorage.removeItem(PIN_KEY)
              setUnlocked(false)
            }}
          >
            Lock admin
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving}
            onClick={() => void saveLessonPrices()}
          >
            {saving ? 'Saving…' : 'Save prices for customers'}
          </button>
        </div>
      </section>

      <section className="wizard">
        <h3 style={{ fontSize: '1.45rem', marginBottom: '0.75rem' }}>
          One-off price for a time slot
        </h3>
        <p style={{ marginTop: 0, opacity: 0.75, fontSize: '0.95rem' }}>
          Override a single open lesson — useful for a custom quote.
        </p>
        <div className="admin-slot-list">
          {slots.slice(0, 24).map((slot) => {
            const instructor = getInstructor(slot.instructorId)
            return (
              <div key={slot.id} className="admin-slot-row">
                <div>
                  <strong>{format(new Date(slot.start), "EEE d MMM · h:mm a")}</strong>
                  <div style={{ fontSize: '0.9rem', opacity: 0.75 }}>
                    {instructor?.name} · {slot.suburb} · {LESSON_LABELS[slot.lessonType]} · currently{' '}
                    {formatAud(slot.priceCents)}
                  </div>
                </div>
                <div className="admin-slot-actions">
                  <div className="price-input">
                    <span>$</span>
                    <input
                      aria-label={`Price for ${slot.id}`}
                      inputMode="decimal"
                      value={slotDrafts[slot.id] ?? ''}
                      onChange={(e) =>
                        setSlotDrafts((d) => ({ ...d, [slot.id]: e.target.value }))
                      }
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={saving}
                    onClick={() => void saveOneSlot(slot.id)}
                  >
                    Set
                  </button>
                </div>
              </div>
            )
          })}
          {slots.length === 0 && <p>No open slots to reprice.</p>}
        </div>
      </section>
    </main>
  )
}

function dollarsFromCents(prices: LessonPriceMap): Record<LessonType, string> {
  return Object.fromEntries(
    Object.entries(prices).map(([k, v]) => [k, (v / 100).toFixed(2)]),
  ) as Record<LessonType, string>
}
