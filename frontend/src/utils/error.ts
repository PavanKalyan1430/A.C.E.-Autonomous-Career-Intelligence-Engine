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
