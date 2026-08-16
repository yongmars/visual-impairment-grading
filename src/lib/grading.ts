import type {
  AutomatedInput, AutomatedResult, DirectionValues, FieldResult, Grade, GoldmannInput,
  GoldmannResult, OverallResult, VisualResult, VisualValue,
} from '../types'

export const VISUAL_OPTIONS: Array<{ value: VisualValue; label: string }> = [
  { value: 'no-light', label: '光覚なし（0）' },
  { value: 'light', label: '光覚弁' },
  { value: 'hand', label: '手動弁' },
  { value: 'counting', label: '指数弁' },
  ...(['0.01', '0.02', '0.03', '0.04', '0.05', '0.06', '0.07', '0.08', '0.09', '0.1', '0.15', '0.2', '0.3', '0.4', '0.5', '0.6', '0.7', '0.8', '0.9', '1.0', '1.2', '1.5', '2.0'] as VisualValue[])
    .map((value) => ({ value, label: value })),
]

export function visualLabel(value: VisualValue): string {
  return VISUAL_OPTIONS.find((option) => option.value === value)?.label ?? value
}

export function visualCalculated(value: VisualValue): number {
  if (value === 'no-light' || value === 'light' || value === 'hand') return 0
  if (value === 'counting') return 0.01
  if (value === '0.15') return 0.1
  return Number(value)
}

function handOrWorse(value: VisualValue): boolean {
  return value === 'no-light' || value === 'light' || value === 'hand'
}

function result(grade: Grade, index: number, ruleId: string, reason: string) {
  return { grade, index, ruleId, reason }
}

export function gradeVisual(right: VisualValue, left: VisualValue): VisualResult {
  const rightCalculated = visualCalculated(right)
  const leftCalculated = visualCalculated(left)
  const rightIsBetter = rightCalculated >= leftCalculated
  const betterValue = rightIsBetter ? right : left
  const otherValue = rightIsBetter ? left : right
  const better = Math.max(rightCalculated, leftCalculated)
  const other = Math.min(rightCalculated, leftCalculated)
  let graded = result('非該当' as const, 0, 'VA-NONE', '視力障害の等級条件に該当しません')

  if (better <= 0.01) graded = result(1, 18, 'VA-1', '良い方の眼の視力が0.01以下')
  else if (better >= 0.02 && better <= 0.03) graded = result(2, 11, 'VA-2-1', '良い方の眼の視力が0.02以上0.03以下')
  else if (better === 0.04 && handOrWorse(otherValue)) graded = result(2, 11, 'VA-2-2', '良い方の眼が0.04、かつ他方の眼が手動弁以下')
  else if (better >= 0.04 && better <= 0.07) graded = result(3, 7, 'VA-3-1', '良い方の眼の視力が0.04以上0.07以下')
  else if (better === 0.08 && handOrWorse(otherValue)) graded = result(3, 7, 'VA-3-2', '良い方の眼が0.08、かつ他方の眼が手動弁以下')
  else if (better >= 0.08 && better <= 0.1) graded = result(4, 4, 'VA-4', '良い方の眼の視力が0.08以上0.1以下')
  else if (better === 0.2 && other <= 0.02) graded = result(5, 2, 'VA-5', '良い方の眼が0.2、かつ他方の眼が0.02以下')
  else if (better >= 0.3 && better <= 0.6 && other <= 0.02) graded = result(6, 1, 'VA-6', '良い方の眼が0.3以上0.6以下、かつ他方の眼が0.02以下')

  const same = rightCalculated === leftCalculated
  return {
    ...graded,
    right,
    left,
    rightCalculated,
    leftCalculated,
    betterLabel: same ? '両眼同等' : rightIsBetter ? '右眼' : '左眼',
    otherLabel: same ? '両眼同等' : rightIsBetter ? '左眼' : '右眼',
  }
}

export function sumDirections(values: DirectionValues): number {
  return Object.values(values).reduce((sum, value) => sum + value, 0)
}

export function weightedBinocular(right: number, left: number): { value: number; calculation: string } {
  const high = Math.max(right, left)
  const low = Math.min(right, left)
  return { value: Math.round((high * 3 + low) / 4), calculation: `(${high}×3＋${low})÷4` }
}

export function gradeGoldmann(input: GoldmannInput): GoldmannResult {
  const rightPeripheralSum = sumDirections(input.right.peripheral)
  const leftPeripheralSum = sumDirections(input.left.peripheral)
  const rightPeripheralQualifies = input.right.peripheralCenterAbsent || rightPeripheralSum <= 80
  const leftPeripheralQualifies = input.left.peripheralCenterAbsent || leftPeripheralSum <= 80
  const peripheralBoth = rightPeripheralQualifies && leftPeripheralQualifies
  const rightCentralSum = input.right.centralCenterAbsent ? 0 : sumDirections(input.right.central)
  const leftCentralSum = input.left.centralCenterAbsent ? 0 : sumDirections(input.left.central)
  const weighted = weightedBinocular(rightCentralSum, leftCentralSum)
  let graded = result('非該当' as const, 0, 'VF-G-NONE', 'ゴールドマン型視野の等級条件に該当しません')

  if (peripheralBoth && weighted.value <= 28) graded = result(2, 11, 'VF-G-2', '左右眼の周辺視野角度総和がそれぞれ80度以下、かつ両眼中心視野角度が28度以下')
  else if (peripheralBoth && weighted.value <= 56) graded = result(3, 7, 'VF-G-3', '左右眼の周辺視野角度総和がそれぞれ80度以下、かつ両眼中心視野角度が56度以下')
  else if (peripheralBoth) graded = result(4, 4, 'VF-G-4', '左右眼の周辺視野角度総和がそれぞれ80度以下')
  else if (input.halfFieldLoss) graded = result(5, 2, 'VF-G-5-1', '両眼による視野が2分の1以上欠損')
  else if (weighted.value <= 56) graded = result(5, 2, 'VF-G-5-2', '両眼中心視野角度が56度以下')

  return {
    ...graded,
    method: 'goldmann',
    rightPeripheralSum,
    leftPeripheralSum,
    rightPeripheralQualifies,
    leftPeripheralQualifies,
    rightCentralSum,
    leftCentralSum,
    binocularCentral: weighted.value,
    calculation: weighted.calculation,
  }
}

export function gradeAutomated(input: AutomatedInput): AutomatedResult {
  const weighted = weightedBinocular(input.rightCentral, input.leftCentral)
  let graded = result('非該当' as const, 0, 'VF-A-NONE', '自動視野計の等級条件に該当しません')
  if (input.esterman <= 70 && weighted.value <= 20) graded = result(2, 11, 'VF-A-2', 'エスターマン70点以下、かつ両眼中心視野視認点数20点以下')
  else if (input.esterman <= 70 && weighted.value <= 40) graded = result(3, 7, 'VF-A-3', 'エスターマン70点以下、かつ両眼中心視野視認点数40点以下')
  else if (input.esterman <= 70) graded = result(4, 4, 'VF-A-4', 'エスターマン70点以下')
  else if (input.esterman <= 100) graded = result(5, 2, 'VF-A-5-1', 'エスターマン71点以上100点以下')
  else if (weighted.value <= 40) graded = result(5, 2, 'VF-A-5-2', '両眼中心視野視認点数40点以下')
  return { ...graded, method: 'automated', ...input, binocularCentral: weighted.value, calculation: weighted.calculation }
}

export function gradeOverall(visual: VisualResult, field: FieldResult): OverallResult {
  const totalIndex = visual.index + field.index
  let grade: Grade = '非該当'
  if (totalIndex >= 18) grade = 1
  else if (totalIndex >= 11) grade = 2
  else if (totalIndex >= 7) grade = 3
  else if (totalIndex >= 4) grade = 4
  else if (totalIndex >= 2) grade = 5
  else if (totalIndex === 1) grade = 6
  const range = totalIndex >= 18 ? '18以上' : totalIndex >= 11 ? '11～17' : totalIndex >= 7 ? '7～10' : totalIndex >= 4 ? '4～6' : totalIndex >= 2 ? '2～3' : String(totalIndex)
  return {
    grade,
    index: totalIndex,
    totalIndex,
    ruleId: `TOTAL-${grade}`,
    calculation: `${visual.index}＋${field.index}＝${totalIndex}`,
    reason: `合計指数${totalIndex}は「${range}」に該当`,
  }
}
