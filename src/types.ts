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
  booked: boolean
}

export interface LicenceAttachment {
  type: LicenceType
  fileName: string
  contentType: string
  /** Base64 data URL for demo / client upload */
  dataUrl?: string
  /** Blob key when stored server-side */
  blobKey?: string
  licenceNumber?: string
  countryOrState?: string
}

export interface Booking {
  id: string
  slotId: string
  createdAt: string
  studentName: string
  email: string
  phone: string
  notes?: string
  licence: LicenceAttachment
  paymentStatus: PaymentStatus
  amountCents: number
  lessonType: LessonType
  instructorId: string
  start: string
  end: string
  suburb: string
}

export interface CreateBookingPayload {
  slotId: string
  studentName: string
  email: string
  phone: string
  notes?: string
  licence: LicenceAttachment
  paymentMethod: 'card' | 'demo'
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
