/**
 * Frontend API contract and base client.
 * Backend not implemented; use mock services.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api'

export async function api<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`)
  return res.json() as Promise<T>
}

export const authHeader = () => {
  // When backend exists: return { Authorization: `Bearer ${token}` }
  return {}
}
