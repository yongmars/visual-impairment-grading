export const RULESET_ID = 'jp-visual-disability-2018-07:v1'
export const RULESET_CHECKED_AT = '2026-08-17'

export type Grade = 1 | 2 | 3 | 4 | 5 | 6 | '非該当'
export type VisualValue =
  | 'no-light' | 'light' | 'hand' | 'counting'
  | '0.01' | '0.02' | '0.03' | '0.04' | '0.05' | '0.06' | '0.07'
  | '0.08' | '0.09' | '0.1' | '0.15' | '0.2' | '0.3' | '0.4' | '0.5'
  | '0.6' | '0.7' | '0.8' | '0.9' | '1.0' | '1.2' | '1.5' | '2.0'

export type Direction = 'up' | 'innerUp' | 'inner' | 'innerDown' | 'down' | 'outerDown' | 'outer' | 'outerUp'
export type DirectionValues = Record<Direction, number>

export interface GradingResult {
  grade: Grade
  index: number
  ruleId: string
  reason: string
}

export interface VisualResult extends GradingResult {
  right: VisualValue
  left: VisualValue
  rightCalculated: number
  leftCalculated: number
  betterLabel: string
  otherLabel: string
}

export interface GoldmannEyeInput {
  peripheral: DirectionValues
  central: DirectionValues
  peripheralCenterAbsent: boolean
  peripheralDisconnected: boolean
  centralCenterAbsent: boolean
}

export interface GoldmannInput {
  right: GoldmannEyeInput
  left: GoldmannEyeInput
  halfFieldLoss: boolean
}

export interface GoldmannResult extends GradingResult {
  method: 'goldmann'
  rightPeripheralSum: number
  leftPeripheralSum: number
  rightPeripheralQualifies: boolean
  leftPeripheralQualifies: boolean
  rightCentralSum: number
  leftCentralSum: number
  binocularCentral: number
  calculation: string
}

export interface AutomatedInput {
  esterman: number
  rightCentral: number
  leftCentral: number
}

export interface AutomatedResult extends GradingResult {
  method: 'automated'
  esterman: number
  rightCentral: number
  leftCentral: number
  binocularCentral: number
  calculation: string
}

export type FieldResult = GoldmannResult | AutomatedResult

export interface OverallResult extends GradingResult {
  totalIndex: number
  calculation: string
}

export interface SavedAssessment {
  schemaVersion: 1
  id: string
  createdAt: string
  label: string
  memo: string
  rulesetId: typeof RULESET_ID
  visualInput?: { right: VisualValue; left: VisualValue; correctedConfirmed: true }
  visualResult?: VisualResult
  fieldInput?: GoldmannInput | AutomatedInput
  fieldResult?: FieldResult
  overallResult?: OverallResult
}
