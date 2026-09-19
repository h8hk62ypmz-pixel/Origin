import { useRef, useState } from 'react'
import type { LicenceAttachment, LicenceType } from '@shared/types'
import { LICENCE_LABELS } from '@shared/types'
import { isNativeApp, pickLicencePhoto } from '../lib/native'

interface Props {
  value: Partial<LicenceAttachment>
  onChange: (next: Partial<LicenceAttachment>) => void
}

const MAX_BYTES = 4 * 1024 * 1024

export function LicenceUpload({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File | undefined) {
    if (!file) return
    setError(null)

    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) {
      setError('Upload a photo or PDF of the licence (JPG, PNG, WebP, or PDF).')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('File must be under 4 MB.')
      return
    }

    const dataUrl = await readAsDataUrl(file)
    onChange({
      ...value,
      fileName: file.name,
      contentType: file.type,
      dataUrl,
    })
  }

  async function openPicker() {
    setError(null)
    if (isNativeApp()) {
      try {
        const photo = await pickLicencePhoto()
        if (photo) {
          onChange({
            ...value,
            fileName: photo.fileName,
            contentType: photo.contentType,
            dataUrl: photo.dataUrl,
          })
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not open camera or photos')
      }
      return
    }
    inputRef.current?.click()
  }

  return (
    <div className="field-grid">
      <div className="field">
        <label htmlFor="licenceType">Licence type</label>
        <select
          id="licenceType"
          value={value.type ?? ''}
          onChange={(e) =>
            onChange({ ...value, type: e.target.value as LicenceType })
          }
          required
        >
          <option value="" disabled>
            Select licence…
          </option>
          {(Object.keys(LICENCE_LABELS) as LicenceType[]).map((key) => (
            <option key={key} value={key}>
              {LICENCE_LABELS[key]}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="licenceNumber">Licence / permit number</label>
        <input
          id="licenceNumber"
          value={value.licenceNumber ?? ''}
          onChange={(e) => onChange({ ...value, licenceNumber: e.target.value })}
          placeholder="Optional but recommended"
        />
      </div>

      {(value.type === 'international' || value.type === 'interstate') && (
        <div className="field full">
          <label htmlFor="countryOrState">
            {value.type === 'international' ? 'Issuing country' : 'Australian state / territory'}
          </label>
          <input
            id="countryOrState"
            value={value.countryOrState ?? ''}
            onChange={(e) => onChange({ ...value, countryOrState: e.target.value })}
            placeholder={value.type === 'international' ? 'e.g. United Kingdom' : 'e.g. Victoria'}
            required
          />
        </div>
      )}

      <div className="field full">
        <label>Attach licence document</label>
        <div
          className={`licence-drop${dragging ? ' is-dragging' : ''}`}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') void openPicker()
          }}
          onClick={() => void openPicker()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            void handleFile(e.dataTransfer.files[0])
          }}
        >
          <strong>
            {isNativeApp()
              ? 'Take a photo or choose from library'
              : 'Drop a photo or PDF of the licence'}
          </strong>
          Learners, provisional, full SA, interstate, or international — attach it here so your
          instructor can verify before the lesson.
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            hidden
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
        </div>

        {error && (
          <div className="error-banner" style={{ marginTop: '0.75rem' }}>
            {error}
          </div>
        )}

        {value.fileName && value.dataUrl && (
          <div className="licence-preview">
            {value.contentType?.startsWith('image/') ? (
              <img src={value.dataUrl} alt="Licence preview" />
            ) : (
              <div className="avatar" style={{ background: 'var(--bush)' }}>
                PDF
              </div>
            )}
            <div>
              <strong>{value.fileName}</strong>
              <div style={{ opacity: 0.7, fontSize: '0.9rem' }}>
                {value.type ? LICENCE_LABELS[value.type] : 'Licence attached'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
