/**
 * The one DOM side effect in this feature, isolated so the transfer panel stays
 * a pure-ish component that tests can hand a spy.
 */
export type SaveFile = (filename: string, contents: string) => void

export const downloadFile: SaveFile = (filename, contents) => {
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }))
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = filename
  anchor.click()

  URL.revokeObjectURL(url)
}

export function exportFilename(now: Date): string {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `thor-${String(now.getFullYear())}-${month}-${day}.json`
}
