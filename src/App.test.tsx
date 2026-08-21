import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

function fillVisual(right = '0.04', left = 'hand') {
  fireEvent.change(screen.getByLabelText('右眼 矯正視力'), { target: { value: right } })
  fireEvent.change(screen.getByLabelText('左眼 矯正視力'), { target: { value: left } })
  fireEvent.click(screen.getByLabelText(/入力値は矯正視力です/))
}

function fillGoldmann(value = '10') {
  screen.getAllByRole('spinbutton').forEach((input) => fireEvent.change(input, { target: { value } }))
  fireEvent.click(screen.getByLabelText('該当しない'))
}

describe('判定フロー', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => { cleanup(); vi.restoreAllMocks() })

  it('矯正視力確認後に視力判定し、視野ステップへ進む', () => {
    render(<App />)
    fillVisual()
    fireEvent.click(screen.getByRole('button', { name: /視力を判定する/ }))
    expect(screen.getByRole('heading', { name: '視野障害の判定' })).toBeInTheDocument()
  })

  it('未確認の矯正視力は判定しない', () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText('右眼 矯正視力'), { target: { value: '0.04' } })
    fireEvent.change(screen.getByLabelText('左眼 矯正視力'), { target: { value: 'hand' } })
    fireEvent.click(screen.getByRole('button', { name: /視力を判定する/ }))
    expect(screen.getByRole('alert')).toHaveTextContent('矯正視力であることを確認')
  })

  it('複視該当時は0として扱う眼を必須にする', () => {
    render(<App />)
    fillVisual('0.8', '0.04')
    fireEvent.click(screen.getByLabelText('該当する'))
    fireEvent.click(screen.getByRole('button', { name: /視力を判定する/ }))
    expect(screen.getByRole('alert')).toHaveTextContent('0として扱う眼を選択')
  })

  it('複視で指定した眼だけを0扱いし実測視力と根拠を表示する', () => {
    render(<App />)
    fillVisual('0.8', '0.04')
    fireEvent.click(screen.getByLabelText('該当する'))
    fireEvent.click(screen.getByLabelText('右眼', { selector: 'input' }))
    fireEvent.click(screen.getByRole('button', { name: /3\s*結果/ }))
    expect(screen.getByText('右眼').parentElement).toHaveTextContent('0.8（計算値 0）')
    expect(screen.getByText('複視に関する特殊条件を適用：右眼を視力0として判定')).toBeInTheDocument()
    expect(screen.getAllByText('2級').length).toBeGreaterThan(0)
  })

  it('複視の選択状態を再読込相当でも保持し履歴から復元する', () => {
    const first = render(<App />)
    fillVisual('0.8', '0.04')
    fireEvent.click(screen.getByLabelText('該当する'))
    fireEvent.click(screen.getByLabelText('左眼', { selector: 'input' }))
    first.unmount()
    render(<App />)
    expect(screen.getByLabelText('該当する')).toBeChecked()
    expect(screen.getByLabelText('左眼', { selector: 'input' })).toBeChecked()

    fireEvent.click(screen.getByRole('button', { name: /3\s*結果/ }))
    fireEvent.change(screen.getByLabelText('保存ラベル（任意）'), { target: { value: '複視保存' } })
    fireEvent.click(screen.getByRole('button', { name: '履歴に保存する' }))
    fireEvent.click(screen.getByRole('button', { name: '履歴' }))
    fireEvent.click(screen.getByRole('button', { name: (name) => name.includes('複視保存') && !name.includes('削除') }))
    expect(screen.getByText('複視に関する特殊条件を適用：左眼を視力0として判定')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /このデータを判定画面で開く/ }))
    fireEvent.click(screen.getByRole('button', { name: /1\s*視力/ }))
    expect(screen.getByLabelText('該当する')).toBeChecked()
    expect(screen.getByLabelText('左眼', { selector: 'input' })).toBeChecked()
  })

  it('複視ヘルプを閉じても入力値を保持する', () => {
    render(<App />)
    fillVisual('0.1', '0.03')
    fireEvent.click(screen.getByRole('button', { name: '複視に関する説明を開く' }))
    expect(screen.getByRole('heading', { name: '両眼を同時に使用できない複視とは？' })).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText('右眼 矯正視力')).toHaveValue('0.1')
  })

  it('視力の編集中データを画面移動後も保持する', () => {
    render(<App />)
    fillVisual('0.08', '0.02')
    fireEvent.click(screen.getByRole('button', { name: '履歴' }))
    fireEvent.click(screen.getByRole('button', { name: '判定' }))
    expect(screen.getByLabelText('右眼 矯正視力')).toHaveValue('0.08')
    expect(screen.getByLabelText('左眼 矯正視力')).toHaveValue('0.02')
    expect(screen.getByLabelText(/入力値は矯正視力です/)).toBeChecked()
  })

  it('再読込相当の再マウント後も編集中データを復元する', () => {
    const first = render(<App />)
    fillVisual('0.1', '0.03')
    first.unmount()
    render(<App />)
    expect(screen.getByLabelText('右眼 矯正視力')).toHaveValue('0.1')
    expect(screen.getByLabelText('左眼 矯正視力')).toHaveValue('0.03')
    expect(screen.getByLabelText(/入力値は矯正視力です/)).toBeChecked()
  })

  it('ゴールドマンと自動視野計の入力を方式切替後もそれぞれ保持する', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /2\s*視野/ }))
    const goldmannInputs = screen.getAllByRole('spinbutton')
    goldmannInputs.forEach((input, index) => fireEvent.change(input, { target: { value: String(index + 1) } }))
    fireEvent.click(screen.getByLabelText('該当しない'))

    fireEvent.click(screen.getByRole('button', { name: '自動視野計' }))
    fireEvent.change(screen.getByLabelText('エスターマン視認点数'), { target: { value: '75' } })
    fireEvent.change(screen.getByLabelText('10-2右眼視認点数'), { target: { value: '41' } })
    fireEvent.change(screen.getByLabelText('10-2左眼視認点数'), { target: { value: '39' } })
    fireEvent.click(screen.getByRole('button', { name: 'ゴールドマン型' }))
    screen.getAllByRole('spinbutton').forEach((input, index) => expect(input).toHaveValue(index + 1))
    expect(screen.getByLabelText('該当しない')).toBeChecked()

    fireEvent.click(screen.getByRole('button', { name: '自動視野計' }))
    expect(screen.getByLabelText('エスターマン視認点数')).toHaveValue(75)
    expect(screen.getByLabelText('10-2右眼視認点数')).toHaveValue(41)
    expect(screen.getByLabelText('10-2左眼視認点数')).toHaveValue(39)

    fireEvent.click(screen.getByRole('button', { name: 'ゴールドマン型' }))
    fireEvent.click(screen.getByRole('button', { name: /視野を判定する/ }))
    expect(screen.getByText('I/4 右眼').parentElement).toHaveTextContent('36°')
    expect(screen.getByText('I/4 左眼').parentElement).toHaveTextContent('164°')
    expect(screen.getByText('I/2 右眼・左眼').parentElement).toHaveTextContent('100°・228°')
    expect(screen.getByText('両眼中心視野角度').parentElement).toHaveTextContent('＝196°')
  })

  it('ゴールドマンの欠損説明とI/4・I/2角度ヘルプを表示する', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /2\s*視野/ }))
    fireEvent.click(screen.getByRole('button', { name: '両眼による視野欠損の説明を開く' }))
    expect(screen.getByText(/生理的限界の面積に対して/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'ヘルプを閉じる' }))
    const peripheralHelp = screen.getAllByRole('button', { name: 'I/4 視野角度の算出方法を開く' })
    const centralHelp = screen.getAllByRole('button', { name: 'I/2 視野角度の算出方法を開く' })
    expect(peripheralHelp).toHaveLength(2)
    expect(centralHelp).toHaveLength(2)
    fireEvent.click(peripheralHelp[0])
    expect(screen.getByRole('heading', { name: '視野角度の算出方法' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '5. 中心部と連続していない周辺視野' })).toBeInTheDocument()
  })

  it('総合等級ヘルプで現在の合計指数行を強調する', () => {
    render(<App />)
    fillVisual()
    fireEvent.click(screen.getByRole('button', { name: /2\s*視野/ }))
    fillGoldmann()
    fireEvent.click(screen.getByRole('button', { name: /視野を判定する/ }))
    fireEvent.click(screen.getByRole('button', { name: '総合等級の判定方法を開く' }))
    expect(screen.getByText(/視力指数 11/)).toBeInTheDocument()
    const currentRow = screen.getByText('11～17').closest('tr')
    expect(currentRow).toHaveTextContent('11～17')
    expect(currentRow).toHaveTextContent('2級')
  })

  it('入力修正時に視力等級と総合結果を自動再計算する', () => {
    render(<App />)
    fillVisual('0.05', 'hand')
    fireEvent.click(screen.getByRole('button', { name: /3\s*結果/ }))
    expect(screen.getAllByText('3級').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: /1\s*視力/ }))
    fireEvent.change(screen.getByLabelText('右眼 矯正視力'), { target: { value: '0.01' } })
    fireEvent.click(screen.getByRole('button', { name: /3\s*結果/ }))
    expect(screen.getAllByText('1級').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: /1\s*視力/ }))
    fireEvent.change(screen.getByLabelText('左眼 矯正視力'), { target: { value: '' } })
    expect(screen.getByRole('button', { name: /3\s*結果/ })).toBeDisabled()
  })

  it('入力クリアは確認キャンセルで保持し、承認時だけ入力を消して履歴を残す', () => {
    localStorage.setItem('visual-impairment-grading:history:v1', JSON.stringify([{ schemaVersion: 1, id: 'saved', createdAt: new Date().toISOString() }]))
    render(<App />)
    fillVisual('0.08', '0.02')
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    fireEvent.click(screen.getByRole('button', { name: '入力をクリア' }))
    expect(screen.getByLabelText('右眼 矯正視力')).toHaveValue('0.08')
    fireEvent.click(screen.getByRole('button', { name: '入力をクリア' }))
    expect(screen.getByLabelText('右眼 矯正視力')).toHaveValue('')
    expect(confirm).toHaveBeenCalledTimes(2)
    expect(JSON.parse(localStorage.getItem('visual-impairment-grading:history:v1') ?? '[]')).toHaveLength(1)
  })

  it('履歴保存後に入力を消し、履歴から元データを再度開ける', () => {
    render(<App />)
    fillVisual('0.08', '0.02')
    fireEvent.click(screen.getByRole('button', { name: /3\s*結果/ }))
    fireEvent.change(screen.getByLabelText('保存ラベル（任意）'), { target: { value: '再編集テスト' } })
    fireEvent.click(screen.getByRole('button', { name: '履歴に保存する' }))
    expect(screen.getByRole('heading', { name: '視力障害の判定' })).toBeInTheDocument()
    expect(screen.getByLabelText('右眼 矯正視力')).toHaveValue('')

    fireEvent.click(screen.getByRole('button', { name: '履歴' }))
    fireEvent.click(screen.getByRole('button', { name: (name) => name.includes('再編集テスト') && !name.includes('削除') }))
    fireEvent.click(screen.getByRole('button', { name: /このデータを判定画面で開く/ }))
    expect(screen.getByRole('heading', { name: '判定結果' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /1\s*視力/ }))
    expect(screen.getByLabelText('右眼 矯正視力')).toHaveValue('0.08')
    expect(screen.getByLabelText('左眼 矯正視力')).toHaveValue('0.02')
  })

  it('履歴保存に失敗した場合は入力を保持する', () => {
    const originalSetItem = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
      if (key === 'visual-impairment-grading:history:v1') throw new Error('storage full')
      originalSetItem.call(this, key, value)
    })
    render(<App />)
    fillVisual('0.08', '0.02')
    fireEvent.click(screen.getByRole('button', { name: /3\s*結果/ }))
    fireEvent.click(screen.getByRole('button', { name: '履歴に保存する' }))
    expect(screen.getByRole('alert')).toHaveTextContent('入力内容は保持されています')
    fireEvent.click(screen.getByRole('button', { name: /1\s*視力/ }))
    expect(screen.getByLabelText('右眼 矯正視力')).toHaveValue('0.08')
  })
})
