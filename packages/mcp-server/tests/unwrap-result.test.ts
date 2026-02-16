import { failure, NotFoundError, success } from '@meridian/core'
import { describe, expect, it } from 'vitest'

import { unwrapResultToMcpResponse } from '../src/helpers/unwrap-result.js'

describe('unwrapResultToMcpResponse', () => {
  it('tC-19: unwraps success result', () => {
    const result = success({ id: '1' })

    const response = unwrapResultToMcpResponse(result)

    expect(response.isError).toBeUndefined()
    const parsed = JSON.parse(response.content[0]!.text)
    expect(parsed).toEqual({ id: '1' })
  })

  it('tC-20: unwraps failure result', () => {
    const result = failure(new NotFoundError('Issue', '1'))

    const response = unwrapResultToMcpResponse(result)

    expect(response.isError).toBe(true)
    const parsed = JSON.parse(response.content[0]!.text)
    expect(parsed.code).toBe('NOT_FOUND')
  })

  it('tC-21: success with null value', () => {
    const result = success(null)

    const response = unwrapResultToMcpResponse(result)

    expect(response.content[0]!.text).toBe('null')
    expect(response.isError).toBeUndefined()
  })
})
