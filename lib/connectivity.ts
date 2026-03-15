export async function isOnline(): Promise<boolean> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return false

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5_000)
    const res = await fetch("/api/health", {
      signal: controller.signal,
      cache: "no-store",
    })
    clearTimeout(timeout)
    return res.ok
  } catch {
    return false
  }
}

export function onConnectivityChange(
  callback: (online: boolean) => void
): () => void {
  function handleOnline() {
    callback(true)
  }
  function handleOffline() {
    callback(false)
  }

  window.addEventListener("online", handleOnline)
  window.addEventListener("offline", handleOffline)

  return () => {
    window.removeEventListener("online", handleOnline)
    window.removeEventListener("offline", handleOffline)
  }
}
