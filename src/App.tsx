import { useMemo, useState } from 'react'
import {
  BookOpenCheck, Calculator, CheckCircle2, ChevronRight, ClipboardList, Eye,
  FileCheck2, History, Info, RotateCcw, Save, Settings, ShieldCheck, Trash2,
} from 'lucide-react'
import { PwaPrompt } from './components/PwaPrompt'
import { gradeAutomated, gradeGoldmann, gradeOverall, gradeVisual, visualLabel, VISUAL_OPTIONS } from './lib/grading'
import { historyStorage } from './lib/storage'
import {
  RULESET_CHECKED_AT, RULESET_ID, type AutomatedInput, type Direction, type FieldResult,
  type GoldmannEyeInput, type GoldmannInput, type OverallResult, type SavedAssessment,
  type VisualResult, type VisualValue,
} from './types'

type MainTab = 'assessment' | 'history' | 'settings'
type Stage = 1 | 2 | 3
type FieldMethod = 'goldmann' | 'automated'
type DirectionText = Record<Direction, string>

const directionLabels: Record<Direction, string> = {
  up: '上', innerUp: '内上', inner: '内', innerDown: '内下', down: '下',
  outerDown: '外下', outer: '外', outerUp: '外上',
}

const emptyDirections = (): DirectionText => ({
  up: '', innerUp: '', inner: '', innerDown: '', down: '', outerDown: '', outer: '', outerUp: '',
})

interface GoldmannEyeForm {
  peripheral: DirectionText
  central: DirectionText
  peripheralCenterAbsent: boolean
  peripheralDisconnected: boolean
  centralCenterAbsent: boolean
}

const emptyGoldmannEye = (): GoldmannEyeForm => ({
  peripheral: emptyDirections(),
  central: emptyDirections(),
  peripheralCenterAbsent: false,
  peripheralDisconnected: false,
  centralCenterAbsent: false,
})

const parseDirections = (values: DirectionText) => Object.fromEntries(
  Object.entries(values).map(([key, value]) => [key, Number(value)]),
) as GoldmannEyeInput['peripheral']

const directionsValid = (values: DirectionText) => Object.values(values).every(
  (value) => value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 180,
)

function gradeText(grade: VisualResult['grade']) {
  return grade === '非該当' ? grade : `${grade}級`
}

function ResultBadge({ result, title }: { result: { grade: VisualResult['grade']; index: number }; title: string }) {
  return (
    <div className="mini-result">
      <span>{title}</span>
      <strong>{gradeText(result.grade)}</strong>
      <small>指数 {result.index}</small>
    </div>
  )
}

function StageNav({ stage, setStage, visualReady, fieldReady }: {
  stage: Stage
  setStage: (stage: Stage) => void
  visualReady: boolean
  fieldReady: boolean
}) {
  return (
    <nav className="stage-nav" aria-label="判定の進行状況">
      <button className={stage === 1 ? 'active' : ''} onClick={() => setStage(1)}><b>1</b><span>視力</span>{visualReady && <CheckCircle2 />}</button>
      <button className={stage === 2 ? 'active' : ''} onClick={() => setStage(2)}><b>2</b><span>視野</span>{fieldReady && <CheckCircle2 />}</button>
      <button className={stage === 3 ? 'active' : ''} onClick={() => setStage(3)} disabled={!visualReady && !fieldReady}><b>3</b><span>結果</span></button>
    </nav>
  )
}

function VisualStage({ onComplete, current }: { onComplete: (right: VisualValue, left: VisualValue, result: VisualResult) => void; current?: VisualResult }) {
  const [right, setRight] = useState<VisualValue | ''>(current?.right ?? '')
  const [left, setLeft] = useState<VisualValue | ''>(current?.left ?? '')
  const [confirmed, setConfirmed] = useState(Boolean(current))
  const [message, setMessage] = useState('')

  const calculate = () => {
    if (!right || !left) return setMessage('右眼・左眼の矯正視力を選択してください。')
    if (!confirmed) return setMessage('矯正視力であることを確認してください。未確認の場合は判定できません。')
    setMessage('')
    onComplete(right, left, gradeVisual(right, left))
  }

  return (
    <section className="stage-section" aria-labelledby="visual-title">
      <div className="section-heading"><Eye /><div><p>STEP 1</p><h2 id="visual-title">視力障害の判定</h2></div></div>
      <div className="info-callout"><Info /><span>万国式試視力表による値を使用し、屈折異常がある場合は最も適正なレンズで測定した矯正視力を入力します。</span></div>
      <div className="card eye-inputs">
        <label><span>右眼 矯正視力</span><select aria-label="右眼 矯正視力" value={right} onChange={(event) => setRight(event.target.value as VisualValue)}><option value="">選択してください</option>{VISUAL_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label><span>左眼 矯正視力</span><select aria-label="左眼 矯正視力" value={left} onChange={(event) => setLeft(event.target.value as VisualValue)}><option value="">選択してください</option>{VISUAL_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <div className="conversion-note"><b>計算上の換算</b><span>光覚弁・手動弁＝0 ／ 指数弁＝0.01 ／ 0.15＝0.1</span></div>
      </div>
      <label className="confirm-card"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span><b>入力値は矯正視力です</b><small>未矯正の場合は再検査し、このアプリでは判定しません。</small></span></label>
      {message && <p className="field-error" role="alert">{message}</p>}
      <button className="primary-button" type="button" onClick={calculate}>視力を判定する<ChevronRight /></button>
    </section>
  )
}

function DirectionGrid({ eye, values, onChange, disabled }: {
  eye: 'right' | 'left'
  values: DirectionText
  onChange: (direction: Direction, value: string) => void
  disabled?: boolean
}) {
  const place = (position: string, direction: Direction) => (
    <label className={`direction-field ${position}`} key={direction}>
      <span>{directionLabels[direction]}</span>
      <input aria-label={`${eye === 'right' ? '右眼' : '左眼'} ${directionLabels[direction]}`} inputMode="decimal" type="number" min="0" max="180" step="0.1" value={values[direction]} disabled={disabled} onChange={(event) => onChange(direction, event.target.value)} />
    </label>
  )
  const nasal = eye === 'right' ? 'left' : 'right'
  const temporal = eye === 'right' ? 'right' : 'left'
  return (
    <div className="direction-grid">
      {place('top', 'up')}
      {place(`${nasal}-top`, 'innerUp')}
      {place(nasal, 'inner')}
      {place(`${nasal}-bottom`, 'innerDown')}
      {place('bottom', 'down')}
      {place(`${temporal}-bottom`, 'outerDown')}
      {place(temporal, 'outer')}
      {place(`${temporal}-top`, 'outerUp')}
      <div className="eye-center" aria-hidden="true">{eye === 'right' ? '右眼' : '左眼'}</div>
    </div>
  )
}

function GoldmannEyeCard({ eye, form, onChange }: {
  eye: 'right' | 'left'
  form: GoldmannEyeForm
  onChange: (form: GoldmannEyeForm) => void
}) {
  const eyeLabel = eye === 'right' ? '右眼' : '左眼'
  const setDirection = (group: 'peripheral' | 'central', direction: Direction, value: string) => onChange({ ...form, [group]: { ...form[group], [direction]: value } })
  return (
    <article className="card goldmann-eye">
      <h3>{eyeLabel}</h3>
      <div className="target-heading"><b>周辺視野 I/4</b><small>暗点等と重なる角度を差し引いて入力</small></div>
      <DirectionGrid eye={eye} values={form.peripheral} onChange={(direction, value) => setDirection('peripheral', direction, value)} />
      <label className="check-row"><input type="checkbox" checked={form.peripheralDisconnected} onChange={(event) => onChange({ ...form, peripheralDisconnected: event.target.checked })} /><span>周辺視野が中心部と連続していない<small>中心部だけに基づく8方向を入力してください。</small></span></label>
      <label className="check-row"><input type="checkbox" checked={form.peripheralCenterAbsent} onChange={(event) => onChange({ ...form, peripheralCenterAbsent: event.target.checked })} /><span>中心10度以内にI/4視野がない<small>実測総和とは別に「80度以下」として扱います。</small></span></label>
      <div className="target-heading central"><b>中心視野 I/2</b><small>8方向の中心視野角度</small></div>
      <label className="check-row prominent"><input type="checkbox" checked={form.centralCenterAbsent} onChange={(event) => onChange({ ...form, centralCenterAbsent: event.target.checked })} /><span>中心10度以内にI/2視野がない<small>中心視野角度総和を0度として扱います。</small></span></label>
      <DirectionGrid eye={eye} values={form.central} disabled={form.centralCenterAbsent} onChange={(direction, value) => setDirection('central', direction, value)} />
    </article>
  )
}

function GoldmannForm({ onComplete }: { onComplete: (input: GoldmannInput, result: FieldResult) => void }) {
  const [right, setRight] = useState(emptyGoldmannEye)
  const [left, setLeft] = useState(emptyGoldmannEye)
  const [halfLoss, setHalfLoss] = useState<boolean | null>(null)
  const [message, setMessage] = useState('')

  const calculate = () => {
    const validEye = (form: GoldmannEyeForm) => directionsValid(form.peripheral) && (form.centralCenterAbsent || directionsValid(form.central))
    if (!validEye(right) || !validEye(left)) return setMessage('必要な8方向をすべて0～180度で入力してください。')
    if (halfLoss === null) return setMessage('「両眼による視野が2分の1以上欠損」の該当有無を選択してください。')
    const convert = (form: GoldmannEyeForm): GoldmannEyeInput => ({
      ...form,
      peripheral: parseDirections(form.peripheral),
      central: form.centralCenterAbsent ? Object.fromEntries(Object.keys(form.central).map((key) => [key, 0])) as GoldmannEyeInput['central'] : parseDirections(form.central),
    })
    const input: GoldmannInput = { right: convert(right), left: convert(left), halfFieldLoss: halfLoss }
    setMessage('')
    onComplete(input, gradeGoldmann(input))
  }

  return (
    <div className="goldmann-form">
      <div className="info-callout"><Info /><span>I/4とI/2を区別し、視認できない部分や暗点と重なる角度を除いて入力してください。</span></div>
      <GoldmannEyeCard eye="right" form={right} onChange={setRight} />
      <GoldmannEyeCard eye="left" form={left} onChange={setLeft} />
      <fieldset className="card half-field"><legend>両眼による視野が2分の1以上欠損</legend><p>両眼で一点を注視して測定した視野が、生理的限界の面積の2分の1以上欠けている場合です。</p><div className="radio-pair"><label><input type="radio" name="half-loss" checked={halfLoss === true} onChange={() => setHalfLoss(true)} />該当する</label><label><input type="radio" name="half-loss" checked={halfLoss === false} onChange={() => setHalfLoss(false)} />該当しない</label></div></fieldset>
      {message && <p className="field-error" role="alert">{message}</p>}
      <button className="primary-button" type="button" onClick={calculate}>視野を判定する<ChevronRight /></button>
    </div>
  )
}

function AutomatedForm({ onComplete }: { onComplete: (input: AutomatedInput, result: FieldResult) => void }) {
  const [esterman, setEsterman] = useState('')
  const [right, setRight] = useState('')
  const [left, setLeft] = useState('')
  const [message, setMessage] = useState('')
  const calculate = () => {
    const values = [esterman, right, left]
    if (values.some((value) => value === '' || !Number.isInteger(Number(value)))) return setMessage('すべての項目を整数で入力してください。')
    if (Number(esterman) < 0 || Number(esterman) > 120 || Number(right) < 0 || Number(right) > 68 || Number(left) < 0 || Number(left) > 68) return setMessage('エスターマンは0～120、10-2は0～68の範囲で入力してください。')
    const input = { esterman: Number(esterman), rightCentral: Number(right), leftCentral: Number(left) }
    setMessage('')
    onComplete(input, gradeAutomated(input))
  }
  return (
    <div className="automated-form">
      <div className="card automated-card"><label><span>両眼開放エスターマンテスト</span><b>視認点数</b><div className="input-unit"><input aria-label="エスターマン視認点数" type="number" min="0" max="120" step="1" inputMode="numeric" value={esterman} onChange={(event) => setEsterman(event.target.value)} /><span>/ 120点</span></div></label></div>
      <div className="info-callout"><Info /><span>10-2プログラムで測定した各検査点のうち、26dB以上の検査点の数を入力してください。</span></div>
      <div className="card automated-card"><h3>10-2プログラム</h3><div className="two-eye-fields"><label><span>右眼</span><div className="input-unit"><input aria-label="10-2右眼視認点数" type="number" min="0" max="68" step="1" inputMode="numeric" value={right} onChange={(event) => setRight(event.target.value)} /><span>/ 68点</span></div></label><label><span>左眼</span><div className="input-unit"><input aria-label="10-2左眼視認点数" type="number" min="0" max="68" step="1" inputMode="numeric" value={left} onChange={(event) => setLeft(event.target.value)} /><span>/ 68点</span></div></label></div></div>
      {message && <p className="field-error" role="alert">{message}</p>}
      <button className="primary-button" type="button" onClick={calculate}>視野を判定する<ChevronRight /></button>
    </div>
  )
}

function FieldStage({ method, setMethod, onComplete }: { method: FieldMethod; setMethod: (method: FieldMethod) => void; onComplete: (input: GoldmannInput | AutomatedInput, result: FieldResult) => void }) {
  return (
    <section className="stage-section" aria-labelledby="field-title">
      <div className="section-heading"><FileCheck2 /><div><p>STEP 2</p><h2 id="field-title">視野障害の判定</h2></div></div>
      <div className="method-switch" role="group" aria-label="視野検査方式"><button className={method === 'goldmann' ? 'active' : ''} onClick={() => setMethod('goldmann')}>ゴールドマン型</button><button className={method === 'automated' ? 'active' : ''} onClick={() => setMethod('automated')}>自動視野計</button></div>
      {method === 'goldmann' ? <GoldmannForm key="goldmann" onComplete={onComplete} /> : <AutomatedForm key="automated" onComplete={onComplete} />}
    </section>
  )
}

function ResultsStage({ visual, field, overall, onSave, onReset }: { visual?: VisualResult; field?: FieldResult; overall?: OverallResult; onSave: (label: string, memo: string) => void; onReset: () => void }) {
  const [label, setLabel] = useState('')
  const [memo, setMemo] = useState('')
  const [saved, setSaved] = useState(false)
  if (!visual && !field) return <div className="empty-state card"><ClipboardList /><h2>判定結果がありません</h2><p>視力または視野を入力して判定してください。</p></div>
  const save = () => { onSave(label.trim(), memo.trim()); setSaved(true) }
  return (
    <section className="results-stage" aria-labelledby="results-title">
      <div className="section-heading"><BookOpenCheck /><div><p>STEP 3</p><h2 id="results-title">判定結果</h2></div></div>
      {overall ? <div className="overall-hero"><span>総合等級</span><strong>{gradeText(overall.grade)}</strong><b>合計指数 {overall.totalIndex}</b><p>{overall.calculation}</p></div> : <div className="info-callout amber"><Info /><span>総合等級は視力・視野の両方を判定すると表示されます。現在の個別結果は保存できます。</span></div>}
      <div className="result-pair">{visual && <ResultBadge result={visual} title="視力障害" />}{field && <ResultBadge result={field} title="視野障害" />}</div>
      {visual && <article className="card detail-result"><h3>視力の判定根拠</h3><dl><div><dt>右眼</dt><dd>{visualLabel(visual.right)}（計算値 {visual.rightCalculated}）</dd></div><div><dt>左眼</dt><dd>{visualLabel(visual.left)}（計算値 {visual.leftCalculated}）</dd></div><div><dt>良い方</dt><dd>{visual.betterLabel}</dd></div></dl><p className="reason"><CheckCircle2 />{visual.reason}</p><small>ルールID：{visual.ruleId}</small></article>}
      {field && <article className="card detail-result"><h3>視野の判定根拠</h3>{field.method === 'goldmann' ? <dl><div><dt>I/4 右眼</dt><dd>{field.rightPeripheralSum}°{field.rightPeripheralQualifies ? '（80°以下扱い）' : ''}</dd></div><div><dt>I/4 左眼</dt><dd>{field.leftPeripheralSum}°{field.leftPeripheralQualifies ? '（80°以下扱い）' : ''}</dd></div><div><dt>I/2 右眼・左眼</dt><dd>{field.rightCentralSum}°・{field.leftCentralSum}°</dd></div><div><dt>両眼中心視野角度</dt><dd>{field.calculation}＝{field.binocularCentral}°</dd></div></dl> : <dl><div><dt>エスターマン</dt><dd>{field.esterman} / 120点</dd></div><div><dt>10-2 右眼・左眼</dt><dd>{field.rightCentral}点・{field.leftCentral}点</dd></div><div><dt>両眼中心視野視認点数</dt><dd>{field.calculation}＝{field.binocularCentral}点</dd></div></dl>}<p className="reason"><CheckCircle2 />{field.reason}</p><small>ルールID：{field.ruleId}</small></article>}
      {overall && <article className="card detail-result total-detail"><h3>総合判定根拠</h3><p className="formula">{overall.calculation}</p><p className="reason"><CheckCircle2 />{overall.reason}</p></article>}
      <div className="card save-card"><h3><Save />この結果を端末に保存</h3><label><span>保存ラベル（任意）</span><input value={label} maxLength={40} placeholder="例：症例A、再検前" onChange={(event) => setLabel(event.target.value)} /></label><label><span>メモ（任意）</span><textarea value={memo} maxLength={500} rows={3} onChange={(event) => setMemo(event.target.value)} /></label><p><ShieldCheck />患者名など個人を特定できる情報は入力しないでください。データはこの端末内だけに保存されます。</p><button className="primary-button" type="button" onClick={save} disabled={saved}>{saved ? '保存しました' : '履歴に保存する'}</button></div>
      <button className="secondary-button" type="button" onClick={onReset}><RotateCcw />新しい判定を始める</button>
    </section>
  )
}

function HistoryPage({ records, onDelete, onClear }: { records: SavedAssessment[]; onDelete: (id: string) => void; onClear: () => void }) {
  const [selected, setSelected] = useState<SavedAssessment | null>(null)
  if (selected) return <div className="page history-detail"><button className="back-link" onClick={() => setSelected(null)}>← 履歴一覧へ</button><h2>{selected.label || '名称未設定の判定'}</h2><p className="date-line">{new Date(selected.createdAt).toLocaleString('ja-JP')}</p><div className="result-pair">{selected.visualResult && <ResultBadge title="視力障害" result={selected.visualResult} />}{selected.fieldResult && <ResultBadge title="視野障害" result={selected.fieldResult} />}</div>{selected.overallResult && <div className="overall-hero compact"><span>総合等級</span><strong>{gradeText(selected.overallResult.grade)}</strong><b>合計指数 {selected.overallResult.totalIndex}</b></div>}<article className="card detail-result"><h3>判定根拠</h3>{selected.visualResult && <p>視力：{selected.visualResult.reason}</p>}{selected.fieldResult && <p>視野：{selected.fieldResult.reason}</p>}{selected.overallResult && <p>総合：{selected.overallResult.reason}</p>}{selected.memo && <><h3>メモ</h3><p>{selected.memo}</p></>}<small>基準：{selected.rulesetId}</small></article></div>
  return (
    <div className="page"><div className="page-title"><History /><div><h2>判定履歴</h2><p>この端末に保存した結果</p></div></div>{records.length > 0 && <button className="clear-button" onClick={onClear}><Trash2 />履歴をすべて削除</button>}{records.length === 0 ? <div className="empty-state card"><History /><h2>保存した履歴はありません</h2><p>判定結果画面から、必要な結果だけを保存できます。</p></div> : <div className="history-list">{records.map((record) => <article className="card history-item" key={record.id}><button className="history-open" onClick={() => setSelected(record)}><span><b>{record.label || '名称未設定の判定'}</b><small>{new Date(record.createdAt).toLocaleString('ja-JP')}・{record.fieldResult?.method === 'goldmann' ? 'ゴールドマン型' : record.fieldResult?.method === 'automated' ? '自動視野計' : '視力のみ'}</small></span><strong>{record.overallResult ? `総合 ${gradeText(record.overallResult.grade)}` : record.visualResult && record.fieldResult ? '個別結果' : record.visualResult ? `視力 ${gradeText(record.visualResult.grade)}` : record.fieldResult ? `視野 ${gradeText(record.fieldResult.grade)}` : ''}</strong><ChevronRight /></button><button className="delete-button" aria-label={`${record.label || '名称未設定の判定'}を削除`} onClick={() => onDelete(record.id)}><Trash2 /></button></article>)}</div>}</div>
  )
}

function SettingsPage() {
  return <div className="page"><div className="page-title"><Settings /><div><h2>設定・基準情報</h2><p>アプリについて</p></div></div><article className="card settings-card"><h3>判定基準</h3><dl><div><dt>基準ID</dt><dd>{RULESET_ID}</dd></div><div><dt>最終確認日</dt><dd>{RULESET_CHECKED_AT}</dd></div></dl><p>身体障害者福祉法施行規則別表第5号および身体障害認定基準の2018年7月改正内容に基づきます。</p></article><article className="card settings-card"><h3>このアプリについて</h3><ul><li>入力値、計算途中、該当条件を確認するための業務用補助ツールです。</li><li>履歴はブラウザの端末内にのみ保存され、外部には送信されません。</li><li>視野図の画像解析、診断書作成、複視の自動判定には対応していません。</li></ul></article><div className="warning-card"><Info /><div><b>重要</b><p>最終的な診断・認定は、最新の身体障害認定基準および指定医・認定機関の判断を優先してください。</p></div></div><p className="version">視覚障害等級判定 Ver.1.0.0</p></div>
}

export default function App() {
  const [tab, setTab] = useState<MainTab>('assessment')
  const [stage, setStage] = useState<Stage>(1)
  const [fieldMethod, setFieldMethod] = useState<FieldMethod>('goldmann')
  const [visualResult, setVisualResult] = useState<VisualResult>()
  const [visualInput, setVisualInput] = useState<SavedAssessment['visualInput']>()
  const [fieldResult, setFieldResult] = useState<FieldResult>()
  const [fieldInput, setFieldInput] = useState<SavedAssessment['fieldInput']>()
  const [history, setHistory] = useState(() => historyStorage.load())
  const overall = useMemo(() => visualResult && fieldResult ? gradeOverall(visualResult, fieldResult) : undefined, [visualResult, fieldResult])

  const saveHistory = (records: SavedAssessment[]) => { setHistory(records); historyStorage.save(records) }
  const reset = () => { setVisualResult(undefined); setVisualInput(undefined); setFieldResult(undefined); setFieldInput(undefined); setStage(1) }
  const save = (label: string, memo: string) => {
    const record: SavedAssessment = { schemaVersion: 1, id: crypto.randomUUID(), createdAt: new Date().toISOString(), label, memo, rulesetId: RULESET_ID, visualInput, visualResult, fieldInput, fieldResult, overallResult: overall }
    saveHistory([record, ...history])
  }

  const pageTitle = tab === 'assessment' ? '視覚障害等級判定' : tab === 'history' ? '判定履歴' : '設定'
  return (
    <div className="app-shell">
      <header className="app-header"><img src="/icon.svg" alt="" /><h1>{pageTitle}</h1><span /></header>
      <main className="main-content">
        {tab === 'assessment' && <div className="page assessment-page"><StageNav stage={stage} setStage={setStage} visualReady={Boolean(visualResult)} fieldReady={Boolean(fieldResult)} />{stage === 1 && <VisualStage current={visualResult} onComplete={(right, left, result) => { setVisualInput({ right, left, correctedConfirmed: true }); setVisualResult(result); setStage(2); window.scrollTo(0, 0) }} />}{stage === 2 && <FieldStage method={fieldMethod} setMethod={setFieldMethod} onComplete={(input, result) => { setFieldInput(input); setFieldResult(result); setStage(3); window.scrollTo(0, 0) }} />}{stage === 3 && <ResultsStage visual={visualResult} field={fieldResult} overall={overall} onSave={save} onReset={reset} />}</div>}
        {tab === 'history' && <HistoryPage records={history} onDelete={(id) => saveHistory(history.filter((record) => record.id !== id))} onClear={() => { if (window.confirm('この端末の判定履歴をすべて削除しますか？')) saveHistory([]) }} />}
        {tab === 'settings' && <SettingsPage />}
      </main>
      <nav className="bottom-nav" aria-label="メインナビゲーション"><button className={tab === 'assessment' ? 'active' : ''} onClick={() => setTab('assessment')}><Calculator /><span>判定</span></button><button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}><History /><span>履歴</span></button><button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}><Settings /><span>設定</span></button></nav>
      <PwaPrompt />
    </div>
  )
}
