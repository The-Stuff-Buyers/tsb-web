"use client"

import { useEffect, useState } from "react"

interface Props {
  status: "queued" | "retrying" | "success" | "partial" | "failed" | "pending" | null
  itemCount?: number
  sentCount?: number
  failedCount?: number
  onRetry?: () => void
  onDiscard?: () => void
}

export default function QueueStatusBanner({
  status,
  itemCount = 0,
  sentCount = 0,
  failedCount = 0,
  onRetry,
  onDiscard,
}: Props) {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (status === "success") {
      setDismissed(false)
      const timer = setTimeout(() => setDismissed(true), 8_000)
      return () => clearTimeout(timer)
    } else {
      setDismissed(false)
    }
  }, [status])

  if (!status || dismissed) return null

  const isAmber = status === "queued" || status === "retrying" || status === "partial" || status === "pending"
  const isGreen = status === "success"
  const isRed = status === "failed"

  const containerCls = [
    "w-full rounded-lg px-4 py-3 mb-4 flex items-start gap-3",
    isAmber && "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    isGreen && "bg-green-500/10 text-green-400 border border-green-500/20",
    isRed && "bg-red-500/10 text-red-400 border border-red-500/20",
  ]
    .filter(Boolean)
    .join(" ")

  function Message() {
    switch (status) {
      case "queued":
        return (
          <span className="text-sm">
            No internet detected. Your submission has been saved and will send automatically when you&apos;re back online.
          </span>
        )
      case "retrying":
        return (
          <span className="flex items-center gap-2 text-sm">
            <svg
              className="animate-spin h-4 w-4 flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"
              />
            </svg>
            Reconnected. Sending your saved submission...
          </span>
        )
      case "success":
        return (
          <span className="text-sm">
            Your saved submission was sent successfully!
          </span>
        )
      case "partial":
        return (
          <span className="text-sm">
            {sentCount} of {itemCount} items sent. {failedCount} item{failedCount !== 1 ? "s" : ""} had errors.
          </span>
        )
      case "failed":
        return (
          <span className="text-sm">
            Some items couldn&apos;t be submitted. Please review and try again.
          </span>
        )
      case "pending":
        return (
          <span className="text-sm">
            You have {itemCount} unsent submission{itemCount !== 1 ? "s" : ""}. They will send when you&apos;re back online.
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className={containerCls} role="status" aria-live="polite">
      <div className="flex-1">
        <Message />
      </div>
      {status === "failed" && (
        <div className="flex gap-2 flex-shrink-0 mt-0.5">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="text-xs font-semibold underline underline-offset-2 hover:opacity-80 transition-opacity"
            >
              Retry
            </button>
          )}
          {onDiscard && (
            <button
              type="button"
              onClick={onDiscard}
              className="text-xs font-semibold underline underline-offset-2 hover:opacity-80 transition-opacity"
            >
              Discard
            </button>
          )}
        </div>
      )}
    </div>
  )
}
