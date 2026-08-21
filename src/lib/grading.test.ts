import { describe, expect, it } from 'vitest'
import { gradeAutomated, gradeGoldmann, gradeOverall, gradeVisual, weightedBinocular } from './grading'
import type { DirectionValues, GoldmannInput, VisualValue } from '../types'

const directions = (sum: number): DirectionValues => ({
  up: sum / 8, innerUp: sum / 8, inner: sum / 8, innerDown: sum / 8,
  down: sum / 8, outerDown: sum / 8, outer: sum / 8, outerUp: sum / 8,
})

function goldmann(rightPeripheral: number, leftPeripheral: number, rightCentral: number, leftCentral: number, overrides: Partial<GoldmannInput> = {}): GoldmannInput {
  return {
    right: { peripheral: directions(rightPeripheral), central: directions(rightCentral), peripheralCenterAbsent: false, peripheralDisconnected: false, centralCenterAbsent: false },
    left: { peripheral: directions(leftPeripheral), central: directions(leftCentral), peripheralCenterAbsent: false, peripheralDisconnected: false, centralCenterAbsent: false },
    halfFieldLoss: false,
    ...overrides,
  }
}

describe('視力等級', () => {
  it.each<[VisualValue, VisualValue, number | string, number]>([
    ['0.01', '0.01', 1, 18],
    ['0.02', '0.02', 2, 11],
    ['0.04', 'hand', 2, 11],
    ['0.04', 'counting', 3, 7],
    ['0.08', 'hand', 3, 7],
    ['0.08', 'counting', 4, 4],
    ['0.2', '0.02', 5, 2],
    ['0.3', '0.02', 6, 1],
    ['0.6', '0.02', 6, 1],
    ['0.7', '0.02', '非該当', 0],
  ])('%s と %s を正しく判定する', (right, left, grade, index) => {
    expect(gradeVisual(right, left)).toMatchObject({ grade, index })
  })

  it('左右交換で結果が変わらない', () => {
    const a = gradeVisual('0.04', 'hand')
    const b = gradeVisual('hand', '0.04')
    expect([a.grade, a.index, a.ruleId]).toEqual([b.grade, b.index, b.ruleId])
  })

  it('特殊視力と0.15を換算しつつ元入力を保持する', () => {
    expect(gradeVisual('0.15', 'hand')).toMatchObject({ right: '0.15', rightCalculated: 0.1, leftCalculated: 0, grade: 4 })
    expect(gradeVisual('counting', 'hand')).toMatchObject({ rightCalculated: 0.01, leftCalculated: 0, grade: 1 })
  })

  it('指定した右眼だけを0として扱い実測値を保持する', () => {
    expect(gradeVisual('0.8', '0.04', 'right')).toMatchObject({
      right: '0.8', left: '0.04', rightCalculated: 0, leftCalculated: 0.04,
      betterLabel: '左眼', grade: 2, index: 11, diplopiaApplied: true, zeroEye: 'right',
    })
  })

  it('指定した左眼だけを0として扱い通常ロジックへ渡す', () => {
    expect(gradeVisual('0.2', '0.8', 'left')).toMatchObject({
      rightCalculated: 0.2, leftCalculated: 0, grade: 5, index: 2, zeroEye: 'left',
    })
  })

  it('0扱い眼を指定しなければ従来結果と一致する', () => {
    expect(gradeVisual('0.08', 'hand', null)).toEqual(gradeVisual('0.08', 'hand'))
  })
})

describe('3:1計算', () => {
  it('大きい方を3倍して四捨五入する', () => {
    expect(weightedBinocular(20, 28)).toEqual({ value: 26, calculation: '(28×3＋20)÷4' })
    expect(weightedBinocular(18, 26)).toEqual({ value: 24, calculation: '(26×3＋18)÷4' })
    expect(weightedBinocular(1, 3).value).toBe(3)
  })
})

describe('ゴールドマン型視野', () => {
  it('80度と28度を2級条件に含む', () => expect(gradeGoldmann(goldmann(80, 80, 28, 28))).toMatchObject({ grade: 2, index: 11 }))
  it('29度は2級条件から外れ3級になる', () => expect(gradeGoldmann(goldmann(80, 80, 29, 29))).toMatchObject({ grade: 3 }))
  it('56度を3級条件に含み57度は4級になる', () => {
    expect(gradeGoldmann(goldmann(80, 80, 56, 56)).grade).toBe(3)
    expect(gradeGoldmann(goldmann(80, 80, 57, 57)).grade).toBe(4)
  })
  it('一眼でも81度なら周辺視野2～4級条件に該当しない', () => expect(gradeGoldmann(goldmann(80, 81, 57, 57)).grade).toBe('非該当'))
  it('I/4の中心10度以内に視野がなければ実測81度でも80度以下扱いにする', () => {
    const input = goldmann(81, 80, 57, 57)
    input.right.peripheralCenterAbsent = true
    expect(gradeGoldmann(input)).toMatchObject({ grade: 4, rightPeripheralSum: 81, rightPeripheralQualifies: true })
  })
  it('I/2の中心10度以内に視野がなければ0度にする', () => {
    const input = goldmann(80, 80, 100, 100)
    input.right.centralCenterAbsent = true
    input.left.centralCenterAbsent = true
    expect(gradeGoldmann(input)).toMatchObject({ grade: 2, rightCentralSum: 0, leftCentralSum: 0, binocularCentral: 0 })
  })
  it('左右交換で結果が変わらない', () => {
    const a = gradeGoldmann(goldmann(75, 80, 20, 28))
    const b = gradeGoldmann(goldmann(80, 75, 28, 20))
    expect([a.grade, a.index, a.binocularCentral]).toEqual([b.grade, b.index, b.binocularCentral])
  })
})

describe('自動視野計', () => {
  it.each([
    [70, 20, 2], [70, 21, 3], [70, 40, 3], [70, 41, 4],
    [71, 41, 5], [100, 41, 5], [101, 41, '非該当'], [101, 40, 5],
  ])('エスターマン%s・中心%sを判定する', (esterman, central, grade) => {
    expect(gradeAutomated({ esterman: Number(esterman), rightCentral: Number(central), leftCentral: Number(central) }).grade).toBe(grade)
  })
  it('左右交換で3:1計算が変わらない', () => {
    expect(gradeAutomated({ esterman: 65, rightCentral: 18, leftCentral: 26 }).binocularCentral).toBe(24)
    expect(gradeAutomated({ esterman: 65, rightCentral: 26, leftCentral: 18 }).binocularCentral).toBe(24)
  })
})

describe('総合指数', () => {
  it.each([[1, 6], [2, 5], [3, 5], [4, 4], [6, 4], [7, 3], [10, 3], [11, 2], [17, 2], [18, 1], [25, 1]])('合計%sを%s級にする', (total, grade) => {
    const visual = { ...gradeVisual('0.7', '0.7'), index: total }
    const field = { ...gradeAutomated({ esterman: 120, rightCentral: 68, leftCentral: 68 }), index: 0 }
    expect(gradeOverall(visual, field).grade).toBe(grade)
  })
})
