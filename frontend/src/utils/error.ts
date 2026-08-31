/**
 * Safely extract and format API error details from Axios / FastAPI responses.
 * Prevents React crash when FastAPI returns an array or object in `err.response.data.detail`.
 */
export function formatApiError(err: any, fallbackMessage: string): string {
  const detail = err?.response?.data?.detail

  if (!detail) {
    return err?.message || fallbackMessage
  }

  if (typeof detail === 'string') {
    return detail
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === 'string') return item
        if (typeof item === 'object' && item !== null) {
          const field = Array.isArray(item.loc)
            ? item.loc.filter((l: any) => l !== 'body').join('.')
            : ''
          const msg = item.msg || JSON.stringify(item)
          return field ? `${field}: ${msg}` : msg
        }
        return String(item)
      })
      .join(', ')
  }

  if (typeof detail === 'object') {
    return detail.msg || detail.message || JSON.stringify(detail)
  }

  return String(detail)
}

/**
 * Safely normalize percentage values to an integer in the [0, 100] range.
 * Handles both 0-1 range (e.g. 0.82 -> 82) and 0-100 range (e.g. 42.9 -> 43).
 * Prevents double-scaling bugs like 4290%.
 */
export function normalizePercentage(val: number | undefined | null): number {
  if (val === undefined || val === null || isNaN(val)) return 0
  if (val > 0 && val <= 1.0) {
    return Math.round(val * 100)
  }
  return Math.round(Math.min(Math.max(val, 0), 100))
}

