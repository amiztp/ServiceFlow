import { ApiError, demoMode } from './api'
import type { Session, User } from '../types/client'

type Account = { user: User; email: string; phone: string; password: string }
const accounts = new Map<string, Account>([
  ['nimal@example.com', {
    user: { id: 'demo-client', name: 'Nimal Fernando', role: 'client', email_verified: true },
    email: 'nimal@example.com', phone: '0771234567', password: 'DemoClient123!',
  }],
])
let active: Account | undefined
const links = new Map<string, { email: string; purpose: 'verify' | 'reset'; expires: number }>()

export function requireDemo(feature: string) {
  if (!demoMode) {
    throw new ApiError(`${feature} is awaiting an agreed backend API. This action is available in the sample demo only.`, 501)
  }
}

function session(account: Account): Session {
  active = account
  return { access_token: 'demo-only', user: structuredClone(account.user) }
}

export const demoAccount = {
  id: () => active?.user.id,
  logout: () => { active = undefined },
  login(email: string, password: string) {
    const account = accounts.get(email.toLowerCase())
    if (!account || account.password !== password) throw new ApiError('Invalid email or password.', 401)
    return session(account)
  },
  register(kind: string, body: Record<string, string>) {
    const email = body.email.toLowerCase()
    if (accounts.has(email)) throw new ApiError('An account with this email already exists.', 409, { email: 'Choose another email or sign in.' })
    const account: Account = {
      email, phone: body.phone, password: body.password,
      user: {
        id: crypto.randomUUID(), name: body.name, role: kind === 'company' ? 'manager' : 'client',
        email_verified: false,
        ...(kind === 'company' ? { company_status: 'PENDING' as const, company_name: body.company_name } : {}),
      },
    }
    accounts.set(email, account)
    return session(account)
  },
  me() {
    if (!active) throw new ApiError('Sign in to continue.', 401)
    return structuredClone(active.user)
  },
  profile() {
    if (!active) throw new ApiError('Sign in to continue.', 401)
    return { name: active.user.name, email: active.email, phone: active.phone }
  },
  updateProfile(name: string, phone: string) {
    if (!active) throw new ApiError('Sign in to continue.', 401)
    active.user.name = name
    active.phone = phone
    return structuredClone(active.user)
  },
  changePassword(password: string) {
    if (!active) throw new ApiError('Sign in to continue.', 401)
    active.password = password
    active.user.must_change_password = false
  },
  issueLink(email: string, purpose: 'verify' | 'reset') {
    requireDemo(purpose === 'verify' ? 'Email verification' : 'Password recovery')
    const normalized = email.toLowerCase()
    if (!accounts.has(normalized)) return null
    if (purpose === 'verify' && active?.email !== normalized) throw new ApiError('Sign in to verify your account.', 403)
    const token = crypto.randomUUID()
    links.set(token, { email: normalized, purpose, expires: Date.now() + 15 * 60 * 1000 })
    return token
  },
  redeem(token: string, purpose: 'verify' | 'reset', password?: string) {
    requireDemo(purpose === 'verify' ? 'Email verification' : 'Password recovery')
    const link = links.get(token)
    if (!link || link.purpose !== purpose || link.expires < Date.now()) throw new ApiError('This link is invalid or expired. Request a new link.', 400)
    const account = accounts.get(link.email)!
    if (purpose === 'verify') {
      if (active !== account) throw new ApiError('Sign in to the account that requested this link.', 403)
      account.user.email_verified = true
    } else {
      if (!password || password.length < 8) throw new ApiError('Use at least 8 characters.', 422)
      account.password = password
    }
    links.delete(token)
    return structuredClone(account.user)
  },
}
