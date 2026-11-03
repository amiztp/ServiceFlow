export const demoMode = import.meta.env.VITE_DEMO_MODE !== 'false'
const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '')
let accessToken: string | null = null
export function setAccessToken(value: string | null) { accessToken = value }
export class ApiError extends Error {
  constructor(message: string, public status = 400, public fieldErrors: Record<string, string> = {}) { super(message) }
}
export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(baseUrl + path, {
      method, headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000)
    })
  } catch { throw new ApiError('Cannot reach ServiceFlow. Check your connection and try again.', 0) }
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const raw = data?.field_errors ?? {}
    const fields = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value.join(' ') : String(value)]))
    if (Array.isArray(data?.detail)) {
      for (const issue of data.detail) {
        const key = issue.loc?.filter((part: unknown) => part !== 'body').join('.')
        if (key && typeof issue.msg === 'string') fields[key] = issue.msg
      }
    }
    const message = data?.message || (typeof data?.detail === 'string' ? data.detail : undefined)
      || (response.status === 422 ? 'Please check the highlighted fields.' : 'This action could not be completed. Refresh and try again.')
    throw new ApiError(message, response.status, fields)
  }
  return data as T
}
