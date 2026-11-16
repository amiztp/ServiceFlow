export const demoMode = import.meta.env.VITE_DEMO_MODE !== 'false'
export const liveApiMode = import.meta.env.VITE_USE_LIVE_API === 'true'
const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '')
let accessToken: string | null = null
export function setAccessToken(value: string | null) { accessToken = value }

export class ApiError extends Error {
  constructor(message: string, public status = 400, public fieldErrors: Record<string, string> = {}){ super(message) }
}

type ApiOptions = { timeout?: number; isFormData?: boolean }

function authHeaders(extra: Record<string, string> = {}) {
  return { ...extra, ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) }
}

export async function api<T>(
  path: string,
  method = 'GET',
  body?: unknown,
  options: ApiOptions = {}
): Promise<T> {
  const timeout = options.timeout ?? 20000
  let response: Response
  try {
    response = await fetch(baseUrl + path, {
      method,
      headers: authHeaders(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeout),
    })
  } catch {
    throw new ApiError('Cannot reach ServiceFlow. Check your connection and try again.', 0)
  }
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const raw = data?.field_errors ?? {}
    const fields = Object.fromEntries(
      Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value.join(' ') : String(value)])
    )
    if (Array.isArray(data?.detail)) {
      for (const issue of data.detail) {
        const key = issue.loc?.filter((part: unknown) => part !== 'body').join('.')
        if (key && typeof issue.msg === 'string') fields[key] = issue.msg
      }
    }
    const message = data?.message
      || (typeof data?.detail === 'string' ? data.detail : undefined)
      || (response.status === 422 ? 'Please check the highlighted fields.' : 'This action could not be completed. Refresh and try again.')
    if (response.status === 401) {
      accessToken = null
      try { window.localStorage.removeItem('sf_token') } catch {}
    }
    throw new ApiError(message, response.status, fields)
  }
  return data as T
}

export async function apiUpload<T>(path: string, form: FormData): Promise<T> {
  let response: Response
  try {
    response = await fetch(baseUrl + path, {
      method: 'POST',
      headers: authHeaders(),
      body: form,
      signal: AbortSignal.timeout(60000),
    })
  } catch {
    throw new ApiError('Cannot reach ServiceFlow. Check your connection and try again.', 0)
  }
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const message = data?.message
      || (typeof data?.detail === 'string' ? data.detail : undefined)
      || 'Upload failed.'
    throw new ApiError(message, response.status)
  }
  return data as T
}

export async function apiBlob(path: string): Promise<Blob> {
  let response: Response
  try {
    response = await fetch(baseUrl + path, {
      headers: authHeaders(),
      signal: AbortSignal.timeout(60000),
    })
  } catch {
    throw new ApiError('Cannot reach ServiceFlow.', 0)
  }
  if (!response.ok) throw new ApiError('Download failed.', response.status)
  return response.blob()
}