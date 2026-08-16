import type { SavedAssessment } from '../types'

const HISTORY_KEY = 'visual-impairment-grading:history:v1'

function isRecord(value: unknown): value is SavedAssessment {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<SavedAssessment>
  return record.schemaVersion === 1 && typeof record.id === 'string' && typeof record.createdAt === 'string'
}

export const historyStorage = {
  load(): SavedAssessment[] {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]')
      return Array.isArray(parsed) ? parsed.filter(isRecord) : []
    } catch {
      return []
    }
  },
  save(records: SavedAssessment[]) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(records))
  },
}
