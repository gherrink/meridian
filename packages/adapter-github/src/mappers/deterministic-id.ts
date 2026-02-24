import { createHash } from 'node:crypto'

export const ISSUE_ID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
export const COMMENT_ID_NAMESPACE = '6ba7b811-9dad-11d1-80b4-00c04fd430c8'
export const USER_ID_NAMESPACE = '6ba7b812-9dad-11d1-80b4-00c04fd430c8'
export const MILESTONE_ID_NAMESPACE = '6ba7b813-9dad-11d1-80b4-00c04fd430c8'
export const ISSUE_LINK_ID_NAMESPACE = '6ba7b814-9dad-11d1-80b4-00c04fd430c8'

export function generateDeterministicId(namespace: string, input: string): string {
  const hash = createHash('sha1')
    .update(namespace)
    .update(input)
    .digest('hex')

  const timeLow = hash.slice(0, 8)
  const timeMid = hash.slice(8, 12)
  const timeHiVersion = `5${hash.slice(13, 16)}`
  const clockSeqReserved = ((Number.parseInt(hash.slice(16, 18), 16) & 0x3F) | 0x80).toString(16).padStart(2, '0')
  const clockSeqLow = hash.slice(18, 20)
  const node = hash.slice(20, 32)

  return `${timeLow}-${timeMid}-${timeHiVersion}-${clockSeqReserved}${clockSeqLow}-${node}`
}
