import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

function fillVisual(right = '0.04', left = 'hand') {
  fireEvent.change(screen.getByLabelText('右眼 矯正視力'), { target: { value: right } })
  fireEvent.change(screen.getByLabelText('左眼 矯正視力'), { target: { value: left } })
  fireEvent.click(screen.getByLabelText(/入力値は矯正視力です/))
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
