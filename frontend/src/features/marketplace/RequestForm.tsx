import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ActionButton, SelectField, SurfaceCard, TextAreaField, TextField } from '../../components'
import { money, Notice, Resource, today, useResource } from '../../components/client-shared'
import { clientService } from '../../lib/client-service'
import { ApiError, demoMode } from '../../lib/api'
import type { RequestInput } from '../../types/client'

type Props = { companyId?: string; onCreated?: (id: string) => void; onCancel?: () => void }
type Photo = NonNullable<RequestInput['photos']>[number]

function readPhoto(file: File): Promise<Photo> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve({ name: file.name, type: file.type, data_url: String(reader.result) })
    reader.onerror = () => reject(new Error('Could not read this photo. Please try another file.'))
    reader.readAsDataURL(file)
  })
}

export function NewRequestPage({ companyId, onCreated, onCancel }: Props = {}) {
  const params = useParams()
  const id = companyId ?? params.id ?? ''
  const resource = useResource(() => clientService.company(id), [id])
  const navigate = useNavigate()
  const location = useLocation()
  const [service, setService] = useState(new URLSearchParams(location.search).get('service') || '')
  const [description, setDescription] = useState('')
  const [address, setAddress] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [photos, setPhotos] = useState<Photo[]>([])
  const [pending, setPending] = useState(false)
  const [reading, setReading] = useState(false)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')
  const [fields, setFields] = useState<Record<string, string>>({})

  function locate() {
    if (!navigator.geolocation) { setError('Location is unavailable. Enter coordinates manually.'); return }
    setLocating(true)
    setError('')
    navigator.geolocation.getCurrentPosition(position => {
      setLatitude(position.coords.latitude.toFixed(6))
      setLongitude(position.coords.longitude.toFixed(6))
      setLocating(false)
    }, () => {
      setError('Could not access your location. Enter coordinates manually or allow location access and retry.')
      setLocating(false)
    }, { timeout: 10000, maximumAge: 60000 })
  }

  async function selectPhotos(files: FileList | null) {
    if (!files) return
    setError('')
    const selected = Array.from(files)
    if (photos.length + selected.length > 3 || selected.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024)) {
      setError('Choose up to 3 JPEG, PNG or WebP photos, each no larger than 2 MB.')
      return
    }
    setReading(true)
    try { const added = await Promise.all(selected.map(readPhoto)); setPhotos(current => [...current, ...added]) }
    catch (cause) { setError((cause as Error).message) }
    finally { setReading(false) }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (pending || reading) return
    if (!!latitude !== !!longitude) { setError('Provide both latitude and longitude.'); return }
    setPending(true)
    setError('')
    setFields({})
    try {
      const input: RequestInput = {
        company_id: id, company_service_id: service, description: description.trim(), address: address.trim(), preferred_date: date,
        ...(demoMode ? {
          preferred_time: time || undefined,
          latitude: latitude ? Number(latitude) : undefined,
          longitude: longitude ? Number(longitude) : undefined,
          photos,
        } : {}),
      }
      const row = await clientService.createRequest(input)
      if (onCreated) onCreated(row.id)
      else navigate(`/client/requests/${row.id}`)
    } catch (cause) {
      setError((cause as Error).message)
      if (cause instanceof ApiError) setFields(cause.fieldErrors)
    } finally { setPending(false) }
  }

  return <Resource {...resource} retry={resource.reload}>
    {resource.data && <SurfaceCard className="space-y-5 p-5">
      <h2 className="sf-display text-xl font-semibold">Request from {resource.data.name}</h2>
      <Notice>Your preferred time is a suggestion. The company proposes a confirmed appointment after quotation approval.</Notice>
      <form className="space-y-5" onSubmit={submit}>
        <SelectField label="Service" required value={service} onChange={event => setService(event.target.value)} error={fields.company_service_id}>
          <option value="">Choose a service</option>
          {resource.data.offerings.filter(offering => offering.active).map(offering => <option key={offering.id} value={offering.id}>{offering.name} — from {money(offering.starting_price)}</option>)}
        </SelectField>
        <TextAreaField label="Describe the work" required minLength={10} maxLength={2000} value={description} onChange={event => setDescription(event.target.value)} error={fields.description} />
        <TextField label="Service address" required maxLength={500} value={address} onChange={event => setAddress(event.target.value)} error={fields.address} />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField label="Preferred date" type="date" required min={today()} value={date} onChange={event => setDate(event.target.value)} error={fields.preferred_date} />
          <SelectField label="Preferred time · Asia/Colombo" disabled={!demoMode} value={time} onChange={event => setTime(event.target.value)}>
            <option value="">No preference</option>
            {[9, 10, 11, 12, 13, 14, 15, 16].map(hour => <option key={hour} value={`${hour.toString().padStart(2, '0')}:00`}>{hour.toString().padStart(2, '0')}:00</option>)}
          </SelectField>
        </div>
        <fieldset className="space-y-4 border-t border-line pt-5" disabled={!demoMode || pending}>
          <legend className="font-semibold">Service location</legend>
          <p className="text-sm text-text-secondary">Use your current location or enter coordinates for the service address. Check the address before submitting.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Latitude" type="number" step="any" min={-90} max={90} required={demoMode} value={latitude} onChange={event => setLatitude(event.target.value)} />
            <TextField label="Longitude" type="number" step="any" min={-180} max={180} required={demoMode} value={longitude} onChange={event => setLongitude(event.target.value)} />
          </div>
          <ActionButton disabled={locating || !demoMode} onClick={locate}>{locating ? 'Finding location…' : 'Use my current location'}</ActionButton>
        </fieldset>
        <fieldset className="space-y-3 border-t border-line pt-5" disabled={!demoMode || pending || reading}>
          <legend className="font-semibold">Optional photos</legend>
          <label className="block text-sm" htmlFor="request-photos">Attach up to 3 photos · JPEG, PNG or WebP · 2 MB each</label>
          <input id="request-photos" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={event => { void selectPhotos(event.target.files); event.target.value = '' }} />
          <div className="grid grid-cols-2 gap-3">{photos.map((photo, index) => <div key={`${photo.name}-${index}`}>
            <img src={photo.data_url} alt={`Attachment ${index + 1}`} className="h-24 w-full rounded-docket object-cover" />
            <p className="break-all text-xs">{photo.name}</p>
            <ActionButton onClick={() => setPhotos(current => current.filter((_, selected) => selected !== index))}>Remove photo {index + 1}</ActionButton>
          </div>)}</div>
        </fieldset>
        {!demoMode && <Notice>Preferred time, coordinates and photos await an agreed backend contract. The connected request form currently sends the core request fields.</Notice>}
        {error && <Notice error>{error}</Notice>}
        <div className="flex flex-wrap gap-4">
          <ActionButton type="submit" variant="stamp" disabled={pending || reading || !description.trim() || !address.trim()}>{pending ? 'Sending…' : 'Send request'}</ActionButton>
          {onCancel ? <ActionButton disabled={pending} onClick={onCancel}>Cancel</ActionButton> : <Link className="sf-link" to={`/companies/${id}`}>Back to company</Link>}
        </div>
      </form>
    </SurfaceCard>}
  </Resource>
}
