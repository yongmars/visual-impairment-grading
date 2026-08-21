import { beforeEach, describe, expect, it } from 'vitest'
import { createEmptyDraft, draftStorage } from './storage'

describe('編集中データの端末内保存', () => {
  beforeEach(() => localStorage.clear())

  it('保存した編集中データを復元する', () => {
    const draft = createEmptyDraft()
    draft.visual = { right: '0.08', left: '0.02', correctedConfirmed: true, diplopia: true, zeroEye: 'left' }
    draft.automated = { esterman: '75', rightCentral: '41', leftCentral: '39' }
    draft.fieldMethod = 'automated'

    expect(draftStorage.save(draft)).toBe(true)
    expect(draftStorage.load()).toEqual(draft)
  })

  it('壊れたJSONは空の作業データへ戻す', () => {
    localStorage.setItem('visual-impairment-grading:draft:v1', '{broken')
    expect(draftStorage.load()).toEqual(createEmptyDraft())
  })

  it('形式が不正なデータは空の作業データへ戻す', () => {
    localStorage.setItem('visual-impairment-grading:draft:v1', JSON.stringify({ schemaVersion: 1, fieldMethod: 'unknown' }))
    expect(draftStorage.load()).toEqual(createEmptyDraft())
  })

  it('旧形式の編集中データは複視なしとして補完する', () => {
    const legacy = createEmptyDraft() as unknown as { visual: Record<string, unknown> }
    legacy.visual = { right: '0.08', left: '0.02', correctedConfirmed: true }
    localStorage.setItem('visual-impairment-grading:draft:v1', JSON.stringify(legacy))
    expect(draftStorage.load().visual).toEqual({
      right: '0.08', left: '0.02', correctedConfirmed: true, diplopia: false, zeroEye: null,
    })
  })
})
