export type LicenceType =
  | 'learner'
  | 'provisional_p1'
  | 'provisional_p2'
  | 'full_sa'
  | 'interstate'
  | 'international'

export type LessonType =
  | 'auto_beginner'
  | 'manual_beginner'
  | 'highway'
  | 'test_prep'
  | 'international_conversion'

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'demo_paid'
export type PaymentChoice = 'full' | 'deposit'
/** Admin must approve after customer pays — slots stay held as pending until then. */
export type ApprovalStatus = 'pending' | 'confirmed' | 'rejected'
export type SlotStatus = 'open' | 'pending' | 'confirmed'

export interface Instructor {
  id: string
  name: string
  suburb: string
  bio: string
  languages: string[]
  vehicle: string
  rating: number
  photoHue: number
}

export interface LessonSlot {
  id: string
  instructorId: string
  start: string
  end: string
  lessonType: LessonType
  priceCents: number
  suburb: string
  /** @deprecated use status — kept for older stored data */
  booked?: boolean
  status: SlotStatus
  bookingId?: string
}

export interface LicenceAttachment {
  type: LicenceType
  fileName: string
  contentType: string
  dataUrl?: string
  blobKey?: string
  licenceNumber?: string
  countryOrState?: string
}

export interface BookingLesson {
  slotId: string
  start: string
  end: string
  lessonType: LessonType
  instructorId: string
  suburb: string
  priceCents: number
}

export interface Booking {
  id: string
  /** First lesson — kept for older UI */
  slotId: string
  slotIds: string[]
  lessons: BookingLesson[]
  createdAt: string
  studentName: string
  email: string
  phone: string
  notes?: string
  /** Customer-suggested meetup / pickup location */
  meetupLocation?: string
  licence: LicenceAttachment
  paymentStatus: PaymentStatus
  paymentChoice: PaymentChoice
  /** Full price of the block before deposit split */
  totalCents: number
  /** What the customer paid now (full or deposit) */
  amountPaidCents: number
  remainingCents: number
  approvalStatus: ApprovalStatus
  amountCents: number
  lessonType: LessonType
  instructorId: string
  start: string
  end: string
  suburb: string
}

export interface CreateBookingPayload {
  /** Prefer slotIds for a block; slotId alone still works for one lesson */
  slotId?: string
  slotIds?: string[]
  studentName: string
  email: string
  phone: string
  notes?: string
  /** Customer-suggested meetup / pickup location */
  meetupLocation?: string
  licence: LicenceAttachment
  paymentMethod: 'card' | 'demo'
  paymentChoice: PaymentChoice
}

export const LICENCE_LABELS: Record<LicenceType, string> = {
  learner: "Learner's permit (L)",
  provisional_p1: 'Provisional P1',
  provisional_p2: 'Provisional P2',
  full_sa: 'Full SA licence',
  interstate: 'Interstate Australian licence',
  international: 'International / overseas licence',
}

export const LESSON_LABELS: Record<LessonType, string> = {
  auto_beginner: 'Automatic — beginners',
  manual_beginner: 'Manual — beginners',
  highway: 'Highway & freeway',
  test_prep: 'VORT / CBD test prep',
  international_conversion: 'International conversion',
}

export const LESSON_PRICES: Record<LessonType, number> = {
  auto_beginner: 7500,
  manual_beginner: 8000,
  highway: 8500,
  test_prep: 9000,
  international_conversion: 9500,
}

/** Deposit is 30% of the block total (rounded to nearest cent). */
export const DEPOSIT_PERCENT = 30

export type LessonPriceMap = Record<LessonType, number>

export function isLessonType(value: string): value is LessonType {
  return value in LESSON_LABELS
}

export function normalizeSlotStatus(slot: LessonSlot): SlotStatus {
  if (slot.status) return slot.status
  return slot.booked ? 'confirmed' : 'open'
}

export function isSlotOpen(slot: LessonSlot): boolean {
  return normalizeSlotStatus(slot) === 'open'
}

export function isSlotUnavailable(slot: LessonSlot): boolean {
  return !isSlotOpen(slot)
}

export function calcDepositCents(totalCents: number): number {
  return Math.round((totalCents * DEPOSIT_PERCENT) / 100)
}

export function calcPaymentAmounts(totalCents: number, choice: PaymentChoice) {
  if (choice === 'full') {
    return { amountPaidCents: totalCents, remainingCents: 0, depositCents: calcDepositCents(totalCents) }
  }
  const depositCents = calcDepositCents(totalCents)
  return {
    amountPaidCents: depositCents,
    remainingCents: Math.max(0, totalCents - depositCents),
    depositCents,
  }
}

export const APPROVAL_LABELS: Record<ApprovalStatus, string> = {
  pending: 'Pending admin approval',
  confirmed: 'Confirmed',
  rejected: 'Rejected',
}
