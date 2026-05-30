import { useState, useEffect, useCallback } from 'react'

export type PermissionStatus = 'prompt' | 'granted' | 'denied' | 'unsupported'

export function useMicrophonePermission() {
  const [status, setStatus] = useState<PermissionStatus>('prompt')
  const [checking, setChecking] = useState(true)

  const check = useCallback(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unsupported')
      setChecking(false)
      return
    }
    navigator.permissions?.query({ name: 'microphone' as PermissionName }).then(
      (result) => {
        setStatus(result.state === 'granted' ? 'granted' : result.state === 'denied' ? 'denied' : 'prompt')
        setChecking(false)
      },
      () => {
        setStatus('prompt')
        setChecking(false)
      }
    ).catch(() => {
      setStatus('prompt')
      setChecking(false)
    })
  }, [])

  useEffect(() => {
    check()
  }, [check])

  const request = useCallback(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unsupported')
      return Promise.resolve(false)
    }
    return navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => { setStatus('granted'); return true })
      .catch(() => { setStatus('denied'); return false })
  }, [])

  return { status, checking, request, recheck: check }
}

export function useGeolocationPermission() {
  const [status, setStatus] = useState<PermissionStatus>('prompt')
  useEffect(() => {
    if (!navigator.permissions?.query) {
      setStatus('prompt')
      return
    }
    navigator.permissions.query({ name: 'geolocation' }).then(
      (result) => setStatus(result.state === 'granted' ? 'granted' : result.state === 'denied' ? 'denied' : 'prompt'),
      () => setStatus('prompt')
    )
  }, [])
  const request = useCallback(() => {
    if (!navigator.geolocation) return Promise.resolve(false)
    return new Promise<boolean>((resolve) => {
      navigator.geolocation.getCurrentPosition(() => resolve(true), () => resolve(false))
    })
  }, [])
  return { status, request }
}
