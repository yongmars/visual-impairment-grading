import { VISUAL_OPTIONS } from './grading'
import type {
  Direction, DirectionTextValues, DraftAssessment, DraftGoldmannEye, SavedAssessment,
} from '../types'

const HISTORY_KEY = 'visual-impairment-grading:history:v1'
const DRAFT_KEY = 'visual-impairment-grading:draft:v1'
const DIRECTIONS: Direction[] = ['up', 'innerUp', 'inner', 'innerDown', 'down', 'outerDown', 'outer', 'outerUp']
const VISUAL_VALUES = new Set(VISUAL_OPTIONS.map(({ value }) => value))

const emptyDirections = (): DirectionTextValues => ({
  up: '', innerUp: '', inner: '', innerDown: '', down: '', outerDown: '', outer: '', outerUp: '',
})

const emptyGoldmannEye = (): DraftGoldmannEye => ({
  peripheral: emptyDirections(),
  central: emptyDirections(),
  peripheralCenterAbsent: false,
  peripheralDisconnected: false,
  centralCenterAbsent: false,
})

export function createEmptyDraft(): DraftAssessment {
  return {
    schemaVersion: 1,
    fieldMethod: 'goldmann',
    visual: { right: '', left: '', correctedConfirmed: false, diplopia: false, zeroEye: null },
    goldmann: { right: emptyGoldmannEye(), left: emptyGoldmannEye(), halfFieldLoss: null },
    automated: { esterman: '', rightCentral: '', leftCentral: '' },
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

function isDirections(value: unknown): value is DirectionTextValues {
  return isObject(value) && DIRECTIONS.every((direction) => typeof value[direction] === 'string')
}

function isGoldmannEye(value: unknown): value is DraftGoldmannEye {
  return isObject(value)
    && isDirections(value.peripheral)
    && isDirections(value.central)
    && typeof value.peripheralCenterAbsent === 'boolean'
    && typeof value.peripheralDisconnected === 'boolean'
    && typeof value.centralCenterAbsent === 'boolean'
}

function parseDraft(value: unknown): DraftAssessment | null {
  if (!isObject(value) || value.schemaVersion !== 1) return null
  const visual = value.visual
  const goldmann = value.goldmann
  const automated = value.automated
  const valid = (value.fieldMethod === 'goldmann' || value.fieldMethod === 'automated')
    && isObject(visual)
    && (visual.right === '' || (typeof visual.right === 'string' && VISUAL_VALUES.has(visual.right as never)))
    && (visual.left === '' || (typeof visual.left === 'string' && VISUAL_VALUES.has(visual.left as never)))
    && typeof visual.correctedConfirmed === 'boolean'
    && isObject(goldmann)
    && isGoldmannEye(goldmann.right)
    && isGoldmannEye(goldmann.left)
    && (goldmann.halfFieldLoss === null || typeof goldmann.halfFieldLoss === 'boolean')
    && isObject(automated)
    && typeof automated.esterman === 'string'
    && typeof automated.rightCentral === 'string'
    && typeof automated.leftCentral === 'string'
  if (!valid) return null

  const visualObject = visual as Record<string, unknown>
  const diplopia = typeof visualObject.diplopia === 'boolean' ? visualObject.diplopia : false
  const zeroEye = diplopia && (visualObject.zeroEye === 'right' || visualObject.zeroEye === 'left') ? visualObject.zeroEye : null
  return {
    schemaVersion: 1,
    fieldMethod: value.fieldMethod as DraftAssessment['fieldMethod'],
    visual: {
      right: visualObject.right as DraftAssessment['visual']['right'],
      left: visualObject.left as DraftAssessment['visual']['left'],
      correctedConfirmed: visualObject.correctedConfirmed as boolean,
      diplopia,
      zeroEye,
    },
    goldmann: goldmann as unknown as DraftAssessment['goldmann'],
    automated: automated as unknown as DraftAssessment['automated'],
  }
}

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
  save(records: SavedAssessment[]): boolean {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(records))
      return true
    } catch {
      return false
    }
  },
}

export const draftStorage = {
  load(): DraftAssessment {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null')
      return parseDraft(parsed) ?? createEmptyDraft()
    } catch {
      return createEmptyDraft()
    }
  },
  save(draft: DraftAssessment): boolean {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
      return true
    } catch {
      return false
    }
  },
  clear(): boolean {
    try {
      localStorage.removeItem(DRAFT_KEY)
      return true
    } catch {
      return false
    }
  },
}
