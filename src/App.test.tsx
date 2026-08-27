import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
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
    expect(screen.getByText('I/4 左眼').parentElement).toHaveTextContent('100°')
    expect(screen.getByText('I/2 右眼・左眼').parentElement).toHaveTextContent('164°・228°')
    expect(screen.getByText('両眼中心視野角度').parentElement).toHaveTextContent('＝212°')
  })

  it('ゴールドマンの欠損説明とI/4・I/2角度ヘルプを表示する', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /2\s*視野/ }))
    fireEvent.click(screen.getByRole('button', { name: '両眼による視野欠損の説明を開く' }))
    expect(screen.getByText(/生理的限界の面積に対して/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'ヘルプを閉じる' }))
    const peripheralHelp = screen.getAllByRole('button', { name: 'I/4 視野角度の算出方法を開く' })
    const centralHelp = screen.getAllByRole('button', { name: 'I/2 視野角度の算出方法を開く' })
    expect(peripheralHelp).toHaveLength(1)
    expect(centralHelp).toHaveLength(1)
    fireEvent.click(peripheralHelp[0])
    expect(screen.getByRole('heading', { name: '視野角度の算出方法' })).toBeInTheDocument()
    expect(screen.getByText('赤い線：計測に含めない線')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '5. 中心部と連続していない周辺視野' })).toBeInTheDocument()
    const expectedImages = [
      ['通常の視野で固視点からイソプタまでを算入する図', '/normal.png'],
      ['中心暗点と重なる部分を差し引いて算出する図', '/central.png'],
      ['傍中心暗点と経線が重なる部分だけを差し引く図', '/eccentric.png'],
      ['固視点を含まない偏心視野でイソプタと重なる部分だけを算入する図', '/peripheral.png'],
      ['中心部から離れた周辺視野を加算せず中心部だけで判定する図', '/separation.png'],
    ]
    expectedImages.forEach(([name, src]) => expect(screen.getByRole('img', { name })).toHaveAttribute('src', src))
    fireEvent.click(screen.getByRole('button', { name: 'ヘルプを閉じる' }))
    fireEvent.click(centralHelp[0])
    expect(screen.getAllByRole('img')).toHaveLength(5)
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

  it('視力基準ヘルプに1～6級を表示し特殊条件を個別強調して入力を保持する', () => {
    render(<App />)
    fillVisual('0.08', 'hand')
    fireEvent.click(screen.getByRole('button', { name: /3\s*結果/ }))
    expect(screen.getByText('ルールID：VA-3-2')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '視力障害の等級判定基準を開く' }))
    const dialog = screen.getByRole('dialog', { name: '視力障害の等級判定基準' })
    ;['1級', '2級', '3級', '4級', '5級', '6級'].forEach((grade) => {
      expect(within(dialog).getByRole('heading', { name: grade })).toBeInTheDocument()
    })
    ;['指数 18', '指数 11', '指数 7', '指数 4', '指数 2', '指数 1'].forEach((index) => {
      expect(within(dialog).getByText(index)).toBeInTheDocument()
    })
    const currentCondition = within(dialog).getByText('良い方の眼の視力が0.08かつ、他方の眼が手動弁以下').closest('li')
    expect(currentCondition).toHaveAttribute('aria-current', 'true')
    const otherCondition = within(dialog).getByText('良い方の眼の視力が0.04以上0.07以下').closest('li')
    expect(otherCondition).not.toHaveAttribute('aria-current')

    fireEvent.click(within(dialog).getByRole('button', { name: '閉じる' }))
    expect(screen.getByText('ルールID：VA-3-2')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /1\s*視力/ }))
    expect(screen.getByLabelText('右眼 矯正視力')).toHaveValue('0.08')
    expect(screen.getByLabelText('左眼 矯正視力')).toHaveValue('hand')
  })

  it('ゴールドマン基準を表示し5級の中心視野条件だけを強調する', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /2\s*視野/ }))
    const inputs = screen.getAllByRole('spinbutton')
    inputs.slice(0, 16).forEach((input) => fireEvent.change(input, { target: { value: '11' } }))
    inputs.slice(16, 32).forEach((input) => fireEvent.change(input, { target: { value: '5' } }))
    fireEvent.click(screen.getByLabelText('該当しない'))
    fireEvent.click(screen.getByRole('button', { name: /視野を判定する/ }))
    expect(screen.getByText('ルールID：VF-G-5-2')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '視野障害の等級判定基準を開く' }))
    const dialog = screen.getByRole('dialog', { name: '視野障害の等級判定基準' })
    expect(within(dialog).getByText('ゴールドマン型視野計')).toBeInTheDocument()
    expect(within(dialog).getByText(/周辺視野はI\/4視標/)).toBeInTheDocument()
    const gradeFive = within(dialog).getByRole('heading', { name: '5級' }).closest('article')
    expect(gradeFive).toHaveAttribute('aria-current', 'true')
    const gradeFiveScope = within(gradeFive as HTMLElement)
    expect(gradeFiveScope.getByText('両眼中心視野角度が56°以下').closest('li')).toHaveAttribute('aria-current', 'true')
    expect(gradeFiveScope.getByText('両眼による視野が2分の1以上欠損').closest('li')).not.toHaveAttribute('aria-current')
  })

  it('自動視野計基準を表示し5級のエスターマン条件だけを強調する', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /2\s*視野/ }))
    fireEvent.click(screen.getByRole('button', { name: '自動視野計' }))
    fireEvent.change(screen.getByLabelText('エスターマン視認点数'), { target: { value: '75' } })
    fireEvent.change(screen.getByLabelText('10-2右眼視認点数'), { target: { value: '50' } })
    fireEvent.change(screen.getByLabelText('10-2左眼視認点数'), { target: { value: '50' } })
    fireEvent.click(screen.getByRole('button', { name: /視野を判定する/ }))
    expect(screen.getByText('ルールID：VF-A-5-1')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '視野障害の等級判定基準を開く' }))
    const dialog = screen.getByRole('dialog', { name: '視野障害の等級判定基準' })
    expect(within(dialog).getByText('自動視野計')).toBeInTheDocument()
    expect(within(dialog).getByText(/中心視野は10-2プログラム/)).toBeInTheDocument()
    const gradeFive = within(dialog).getByRole('heading', { name: '5級' }).closest('article')
    const gradeFiveScope = within(gradeFive as HTMLElement)
    expect(gradeFiveScope.getByText('両眼開放エスターマンテスト視認点数が70点を超え100点以下').closest('li')).toHaveAttribute('aria-current', 'true')
    expect(gradeFiveScope.getByText('両眼中心視野視認点数（10-2プログラム）が40点以下').closest('li')).not.toHaveAttribute('aria-current')
    expect(within(dialog).queryByText(/I\/4による周辺視野角度総和/)).not.toBeInTheDocument()
  })

  it('非該当の視力基準ヘルプでは特定の等級を強調しない', () => {
    render(<App />)
    fillVisual('0.7', '0.7')
    fireEvent.click(screen.getByRole('button', { name: /3\s*結果/ }))
    fireEvent.click(screen.getByRole('button', { name: '視力障害の等級判定基準を開く' }))
    const dialog = screen.getByRole('dialog', { name: '視力障害の等級判定基準' })
    expect(dialog.querySelector('[aria-current="true"]')).toBeNull()
    expect(within(dialog).queryByText('現在該当')).not.toBeInTheDocument()
  })

  it('新しいI/4・I/2順で8方向が揃った眼だけ総和を表示する', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /2\s*視野/ }))
    const inputs = screen.getAllByRole('spinbutton')

    inputs.slice(0, 7).forEach((input) => fireEvent.change(input, { target: { value: '10' } }))
    expect(screen.queryByText('周辺視野角度総和')).not.toBeInTheDocument()
    fireEvent.change(inputs[7], { target: { value: '10' } })
    expect(screen.getByText('周辺視野角度総和').parentElement).toHaveTextContent('80°')
    inputs.slice(0, 8).forEach((input) => fireEvent.change(input, { target: { value: '0.1' } }))
    expect(screen.getByText('周辺視野角度総和').parentElement).toHaveTextContent('0.8°')
    inputs.slice(0, 8).forEach((input) => fireEvent.change(input, { target: { value: '10' } }))

    inputs.slice(8, 16).forEach((input) => fireEvent.change(input, { target: { value: '11' } }))
    const peripheralSums = screen.getAllByText('周辺視野角度総和').map((node) => node.parentElement?.textContent)
    expect(peripheralSums).toEqual(expect.arrayContaining([expect.stringContaining('80°'), expect.stringContaining('88°')]))

    inputs.slice(16, 24).forEach((input) => fireEvent.change(input, { target: { value: '2' } }))
    inputs.slice(24, 32).forEach((input) => fireEvent.change(input, { target: { value: '1' } }))
    const centralSums = screen.getAllByText('中心視野角度総和').map((node) => node.parentElement?.textContent)
    expect(centralSums).toEqual(expect.arrayContaining([expect.stringContaining('16°'), expect.stringContaining('8°')]))
    expect(screen.getByText('(16×3＋8)÷4＝14°')).toBeInTheDocument()
  })

  it('I/4とI/2の特殊条件を実測値と判定値に分けて表示する', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /2\s*視野/ }))
    const inputs = screen.getAllByRole('spinbutton')
    inputs.slice(0, 8).forEach((input) => fireEvent.change(input, { target: { value: '11' } }))
    fireEvent.click(screen.getAllByLabelText(/中心10度以内にI\/4視野がない/)[0])
    const peripheralSum = screen.getByText('周辺視野角度総和').parentElement
    expect(peripheralSum).toHaveTextContent('88°')
    expect(peripheralSum).toHaveTextContent('判定上：80°以下として扱う')

    inputs.slice(16, 24).forEach((input) => fireEvent.change(input, { target: { value: '3' } }))
    inputs.slice(24, 32).forEach((input) => fireEvent.change(input, { target: { value: '1' } }))
    fireEvent.click(screen.getAllByLabelText(/中心10度以内にI\/2視野がない/)[0])
    expect(inputs[16]).toBeDisabled()
    expect(inputs[16]).toHaveValue(3)
    expect(screen.getByText('実測総和：24°').parentElement).toHaveTextContent('判定上 0°')
    expect(screen.getByText('(8×3＋0)÷4＝6°')).toBeInTheDocument()
  })

  it('10-2左右が有効な整数として揃うとエスターマン未入力でも3対1計算を表示する', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /2\s*視野/ }))
    fireEvent.click(screen.getByRole('button', { name: '自動視野計' }))
    const right = screen.getByLabelText('10-2右眼視認点数')
    const left = screen.getByLabelText('10-2左眼視認点数')
    fireEvent.change(right, { target: { value: '3' } })
    expect(screen.queryByText('両眼中心視野視認点数')).not.toBeInTheDocument()
    fireEvent.change(left, { target: { value: '1' } })
    expect(screen.getByText('(3×3＋1)÷4＝3点')).toBeInTheDocument()
    fireEvent.change(right, { target: { value: '3.5' } })
    expect(screen.queryByText('両眼中心視野視認点数')).not.toBeInTheDocument()
    fireEvent.change(right, { target: { value: '68' } })
    expect(screen.getByText('(68×3＋1)÷4＝51点')).toBeInTheDocument()
    fireEvent.change(right, { target: { value: '69' } })
    expect(screen.queryByText('両眼中心視野視認点数')).not.toBeInTheDocument()
    fireEvent.change(right, { target: { value: '0' } })
    fireEvent.change(left, { target: { value: '0' } })
    expect(screen.getByText('(0×3＋0)÷4＝0点')).toBeInTheDocument()
  })

  it('保存履歴の詳細でも視野の左右値と両眼計算式を表示する', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /2\s*視野/ }))
    fillGoldmann('10')
    fireEvent.click(screen.getByRole('button', { name: /視野を判定する/ }))
    fireEvent.change(screen.getByLabelText('保存ラベル（任意）'), { target: { value: '視野内訳' } })
    fireEvent.click(screen.getByRole('button', { name: '履歴に保存する' }))
    fireEvent.click(screen.getByRole('button', { name: '履歴' }))
    fireEvent.click(screen.getByRole('button', { name: (name) => name.includes('視野内訳') && !name.includes('削除') }))
    expect(screen.getByRole('heading', { name: '視野の計算内訳' })).toBeInTheDocument()
    expect(screen.getByText('I/4 右眼').parentElement).toHaveTextContent('80°')
    expect(screen.getByText('I/2 右眼・左眼').parentElement).toHaveTextContent('80°・80°')
    expect(screen.getByText('両眼中心視野角度').parentElement).toHaveTextContent('(80×3＋80)÷4＝80°')
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
