import { useEffect, useMemo, useState } from 'react'
import {
  BookOpenCheck, Calculator, CheckCircle2, ChevronRight, ClipboardList, Eye,
  FileCheck2, History, Info, RotateCcw, Save, Settings, ShieldCheck, Trash2,
} from 'lucide-react'
import { PwaPrompt } from './components/PwaPrompt'
import { DiplopiaHelp, HalfFieldHelp, OverallHelp } from './components/AssessmentHelp'
import { FieldCriteriaHelp, VisualCriteriaHelp } from './components/GradingCriteriaHelp'
import { VisualFieldAngleHelp } from './components/VisualFieldHelp'
import { UpdateInfoDialog } from './components/UpdateInfoDialog'
import { APP_VERSION } from './lib/appVersion'
import {
  gradeAutomated, gradeGoldmann, gradeOverall, gradeVisual, sumDirections,
  visualLabel, VISUAL_OPTIONS, weightedBinocular,
} from './lib/grading'
import { createEmptyDraft, draftStorage, historyStorage } from './lib/storage'
import {
  RULESET_CHECKED_AT, RULESET_ID, type AutomatedInput, type Direction, type DirectionTextValues,
  type DraftAssessment, type DraftGoldmannEye, type FieldResult,
  type GoldmannEyeInput, type GoldmannInput, type OverallResult, type SavedAssessment,
  type VisualResult,
} from './types'

type MainTab = 'assessment' | 'history' | 'settings'
type Stage = 1 | 2 | 3

const directionLabels: Record<Direction, string> = {
  up: '上', innerUp: '内上', inner: '内', innerDown: '内下', down: '下',
  outerDown: '外下', outer: '外', outerUp: '外上',
}

const parseDirections = (values: DirectionTextValues) => Object.fromEntries(
  Object.entries(values).map(([key, value]) => [key, Number(value)]),
) as GoldmannEyeInput['peripheral']

const directionsValid = (values: DirectionTextValues) => Object.values(values).every(
  (value) => value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 180,
)

const directionSum = (values: DirectionTextValues): number | undefined => directionsValid(values)
  ? sumDirections(parseDirections(values))
  : undefined

const automatedCentralValue = (value: string): number | undefined => value !== ''
  && Number.isInteger(Number(value))
  && Number(value) >= 0
  && Number(value) <= 68
  ? Number(value)
  : undefined

const formatComputedNumber = (value: number): string => String(Number(value.toFixed(10)))
const binocularCalculation = (right: number, left: number): string => {
  const high = Math.max(right, left)
  const low = Math.min(right, left)
  return `(${formatComputedNumber(high)}×3＋${formatComputedNumber(low)})÷4`
}

const goldmannEyeValid = (form: DraftGoldmannEye) => directionsValid(form.peripheral)
  && (form.centralCenterAbsent || directionsValid(form.central))

const convertGoldmannEye = (form: DraftGoldmannEye): GoldmannEyeInput => ({
  ...form,
  peripheral: parseDirections(form.peripheral),
  central: form.centralCenterAbsent
    ? Object.fromEntries(Object.keys(form.central).map((key) => [key, 0])) as GoldmannEyeInput['central']
    : parseDirections(form.central),
})

function getVisualResult(draft: DraftAssessment): VisualResult | undefined {
  const { right, left, correctedConfirmed, diplopia, zeroEye } = draft.visual
  return right && left && correctedConfirmed && (!diplopia || zeroEye)
    ? gradeVisual(right, left, diplopia ? zeroEye : null)
    : undefined
}

function getGoldmannInput(draft: DraftAssessment): GoldmannInput | undefined {
  const { right, left, halfFieldLoss } = draft.goldmann
  if (!goldmannEyeValid(right) || !goldmannEyeValid(left) || halfFieldLoss === null) return undefined
  return { right: convertGoldmannEye(right), left: convertGoldmannEye(left), halfFieldLoss }
}

function getAutomatedInput(draft: DraftAssessment): AutomatedInput | undefined {
  const { esterman, rightCentral, leftCentral } = draft.automated
  const values = [esterman, rightCentral, leftCentral]
  if (values.some((value) => value === '' || !Number.isInteger(Number(value)))) return undefined
  if (Number(esterman) < 0 || Number(esterman) > 120 || Number(rightCentral) < 0 || Number(rightCentral) > 68 || Number(leftCentral) < 0 || Number(leftCentral) > 68) return undefined
  return { esterman: Number(esterman), rightCentral: Number(rightCentral), leftCentral: Number(leftCentral) }
}

const directionTextFromNumbers = (values: GoldmannEyeInput['peripheral']): DirectionTextValues => Object.fromEntries(
  Object.entries(values).map(([key, value]) => [key, String(value)]),
) as DirectionTextValues

function draftFromSaved(record: SavedAssessment): DraftAssessment {
  const draft = createEmptyDraft()
  if (record.visualInput) {
    const diplopia = Boolean(record.visualInput.diplopia)
    draft.visual = {
      right: record.visualInput.right,
      left: record.visualInput.left,
      correctedConfirmed: true,
      diplopia,
      zeroEye: diplopia && (record.visualInput.zeroEye === 'right' || record.visualInput.zeroEye === 'left') ? record.visualInput.zeroEye : null,
    }
  }
  if (record.fieldInput && 'halfFieldLoss' in record.fieldInput) {
    draft.fieldMethod = 'goldmann'
    draft.goldmann = {
      right: {
        ...record.fieldInput.right,
        peripheral: directionTextFromNumbers(record.fieldInput.right.peripheral),
        central: directionTextFromNumbers(record.fieldInput.right.central),
      },
      left: {
        ...record.fieldInput.left,
        peripheral: directionTextFromNumbers(record.fieldInput.left.peripheral),
        central: directionTextFromNumbers(record.fieldInput.left.central),
      },
      halfFieldLoss: record.fieldInput.halfFieldLoss,
    }
  } else if (record.fieldInput) {
    draft.fieldMethod = 'automated'
    draft.automated = {
      esterman: String(record.fieldInput.esterman),
      rightCentral: String(record.fieldInput.rightCentral),
      leftCentral: String(record.fieldInput.leftCentral),
    }
  }
  return draft
}

function draftHasInput(draft: DraftAssessment): boolean {
  return JSON.stringify(draft) !== JSON.stringify(createEmptyDraft())
}

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

function VisualStage({ form, onChange, onComplete }: {
  form: DraftAssessment['visual']
  onChange: (form: DraftAssessment['visual']) => void
  onComplete: () => void
}) {
  const [message, setMessage] = useState('')

  const calculate = () => {
    if (!form.right || !form.left) return setMessage('右眼・左眼の矯正視力を選択してください。')
    if (!form.correctedConfirmed) return setMessage('矯正視力であることを確認してください。未確認の場合は判定できません。')
    if (form.diplopia && !form.zeroEye) return setMessage('複視の認定計算で0として扱う眼を選択してください。')
    setMessage('')
    onComplete()
  }

  return (
    <section className="stage-section" aria-labelledby="visual-title">
      <div className="section-heading"><Eye /><div><p>STEP 1</p><h2 id="visual-title">視力障害の判定</h2></div></div>
      <div className="info-callout"><Info /><span>万国式試視力表による値を使用し、屈折異常がある場合は最も適正なレンズで測定した矯正視力を入力します。</span></div>
      <div className="card eye-inputs">
        <label><span>右眼 矯正視力</span><select aria-label="右眼 矯正視力" value={form.right} onChange={(event) => onChange({ ...form, right: event.target.value as DraftAssessment['visual']['right'] })}><option value="">選択してください</option>{VISUAL_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label><span>左眼 矯正視力</span><select aria-label="左眼 矯正視力" value={form.left} onChange={(event) => onChange({ ...form, left: event.target.value as DraftAssessment['visual']['left'] })}><option value="">選択してください</option>{VISUAL_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <div className="conversion-note"><b>計算上の換算</b><span>光覚弁・手動弁＝0 ／ 指数弁＝0.01 ／ 0.15＝0.1</span></div>
      </div>
      <fieldset className="card special-condition diplopia-card">
        <legend><span>両眼を同時に使用できない複視</span><DiplopiaHelp /></legend>
        <div className="radio-pair"><label><input type="radio" name="diplopia" checked={form.diplopia} onChange={() => onChange({ ...form, diplopia: true })} />該当する</label><label><input type="radio" name="diplopia" checked={!form.diplopia} onChange={() => onChange({ ...form, diplopia: false, zeroEye: null })} />該当しない</label></div>
        {form.diplopia && <div className="zero-eye-choice"><b>0として扱う眼</b><div className="radio-pair"><label><input type="radio" name="zero-eye" checked={form.zeroEye === 'right'} onChange={() => onChange({ ...form, zeroEye: 'right' })} />右眼</label><label><input type="radio" name="zero-eye" checked={form.zeroEye === 'left'} onChange={() => onChange({ ...form, zeroEye: 'left' })} />左眼</label></div><small>実測矯正視力は保持し、認定計算上のみ選択した眼を0として扱います。</small></div>}
      </fieldset>
      <label className="confirm-card"><input type="checkbox" checked={form.correctedConfirmed} onChange={(event) => onChange({ ...form, correctedConfirmed: event.target.checked })} /><span><b>入力値は矯正視力です</b><small>未矯正の場合は再検査し、このアプリでは判定しません。</small></span></label>
      {message && <p className="field-error" role="alert">{message}</p>}
      <button className="primary-button" type="button" onClick={calculate}>視力を判定する<ChevronRight /></button>
    </section>
  )
}

function DirectionGrid({ eye, values, onChange, disabled }: {
  eye: 'right' | 'left'
  values: DirectionTextValues
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

function GoldmannEyePanel({ eye, group, form, onChange }: {
  eye: 'right' | 'left'
  group: 'peripheral' | 'central'
  form: DraftGoldmannEye
  onChange: (form: DraftGoldmannEye) => void
}) {
  const eyeLabel = eye === 'right' ? '右眼' : '左眼'
  const values = form[group]
  const measuredSum = directionSum(values)
  const isPeripheral = group === 'peripheral'
  const setDirection = (group: 'peripheral' | 'central', direction: Direction, value: string) => onChange({ ...form, [group]: { ...form[group], [direction]: value } })
  return (
    <section className="goldmann-eye-panel" aria-labelledby={`${group}-${eye}-title`}>
      <h3 id={`${group}-${eye}-title`}>{eyeLabel}</h3>
      <DirectionGrid eye={eye} values={values} disabled={!isPeripheral && form.centralCenterAbsent} onChange={(direction, value) => setDirection(group, direction, value)} />
      <div className="sum-display" aria-live="polite">
        {isPeripheral
          ? measuredSum !== undefined
            ? <><span>周辺視野角度総和</span><strong>{formatComputedNumber(measuredSum)}°</strong></>
            : <small>8方向をすべて入力すると総和を表示します。</small>
          : form.centralCenterAbsent
            ? <><span>{measuredSum !== undefined ? `実測総和：${formatComputedNumber(measuredSum)}°` : '中心視野角度総和'}</span><strong>判定上 0°</strong></>
            : measuredSum !== undefined
              ? <><span>中心視野角度総和</span><strong>{formatComputedNumber(measuredSum)}°</strong></>
              : <small>8方向をすべて入力すると総和を表示します。</small>}
        {isPeripheral && form.peripheralCenterAbsent && <em>判定上：80°以下として扱う</em>}
      </div>
      {isPeripheral ? <>
        <label className="check-row"><input type="checkbox" checked={form.peripheralDisconnected} onChange={(event) => onChange({ ...form, peripheralDisconnected: event.target.checked })} /><span>周辺視野が中心部と連続していない<small>中心部だけに基づく8方向を入力してください。</small></span></label>
        <label className="check-row"><input type="checkbox" checked={form.peripheralCenterAbsent} onChange={(event) => onChange({ ...form, peripheralCenterAbsent: event.target.checked })} /><span>中心10度以内にI/4視野がない<small>実測総和とは別に「80度以下」として扱います。</small></span></label>
      </> : <label className="check-row prominent"><input type="checkbox" checked={form.centralCenterAbsent} onChange={(event) => onChange({ ...form, centralCenterAbsent: event.target.checked })} /><span>中心10度以内にI/2視野がない<small>中心視野角度総和を0度として扱います。</small></span></label>}
    </section>
  )
}

function GoldmannForm({ form, onChange, onComplete }: {
  form: DraftAssessment['goldmann']
  onChange: (form: DraftAssessment['goldmann']) => void
  onComplete: () => void
}) {
  const [message, setMessage] = useState('')
  const rightCentralSum = form.right.centralCenterAbsent ? 0 : directionSum(form.right.central)
  const leftCentralSum = form.left.centralCenterAbsent ? 0 : directionSum(form.left.central)
  const binocularCentral = rightCentralSum !== undefined && leftCentralSum !== undefined
    ? weightedBinocular(rightCentralSum, leftCentralSum)
    : undefined

  const calculate = () => {
    if (!goldmannEyeValid(form.right) || !goldmannEyeValid(form.left)) return setMessage('必要な8方向をすべて0～180度で入力してください。')
    if (form.halfFieldLoss === null) return setMessage('「両眼による視野が2分の1以上欠損」の該当有無を選択してください。')
    setMessage('')
    onComplete()
  }

  return (
    <div className="goldmann-form">
      <div className="info-callout"><Info /><span>I/4とI/2を区別し、視認できない部分や暗点と重なる角度を除いて入力してください。</span></div>
      <article className="card goldmann-section">
        <div className="target-heading"><span><b>周辺視野 I/4</b><VisualFieldAngleHelp target="I/4" /></span><small>暗点等と重なる角度を差し引いて入力</small></div>
        <GoldmannEyePanel eye="right" group="peripheral" form={form.right} onChange={(right) => onChange({ ...form, right })} />
        <GoldmannEyePanel eye="left" group="peripheral" form={form.left} onChange={(left) => onChange({ ...form, left })} />
      </article>
      <fieldset className="card half-field"><legend><span>両眼による視野が2分の1以上欠損</span><HalfFieldHelp /></legend><p>両眼で一点を注視して測定した視野が、生理的限界の面積の2分の1以上欠けている場合です。</p><div className="radio-pair"><label><input type="radio" name="half-loss" checked={form.halfFieldLoss === true} onChange={() => onChange({ ...form, halfFieldLoss: true })} />該当する</label><label><input type="radio" name="half-loss" checked={form.halfFieldLoss === false} onChange={() => onChange({ ...form, halfFieldLoss: false })} />該当しない</label></div></fieldset>
      <article className="card goldmann-section">
        <div className="target-heading"><span><b>中心視野 I/2</b><VisualFieldAngleHelp target="I/2" /></span><small>8方向の中心視野角度</small></div>
        <GoldmannEyePanel eye="right" group="central" form={form.right} onChange={(right) => onChange({ ...form, right })} />
        <GoldmannEyePanel eye="left" group="central" form={form.left} onChange={(left) => onChange({ ...form, left })} />
      </article>
      {binocularCentral && rightCentralSum !== undefined && leftCentralSum !== undefined && <div className="card calculation-card" aria-live="polite"><span>両眼中心視野角度</span><strong>{binocularCentral.value}°</strong><p>{binocularCalculation(rightCentralSum, leftCentralSum)}＝{binocularCentral.value}°</p></div>}
      {message && <p className="field-error" role="alert">{message}</p>}
      <button className="primary-button" type="button" onClick={calculate}>視野を判定する<ChevronRight /></button>
    </div>
  )
}

function AutomatedForm({ form, onChange, onComplete }: {
  form: DraftAssessment['automated']
  onChange: (form: DraftAssessment['automated']) => void
  onComplete: () => void
}) {
  const [message, setMessage] = useState('')
  const rightCentral = automatedCentralValue(form.rightCentral)
  const leftCentral = automatedCentralValue(form.leftCentral)
  const binocularCentral = rightCentral !== undefined && leftCentral !== undefined
    ? weightedBinocular(rightCentral, leftCentral)
    : undefined
  const calculate = () => {
    const values = [form.esterman, form.rightCentral, form.leftCentral]
    if (values.some((value) => value === '' || !Number.isInteger(Number(value)))) return setMessage('すべての項目を整数で入力してください。')
    if (Number(form.esterman) < 0 || Number(form.esterman) > 120 || Number(form.rightCentral) < 0 || Number(form.rightCentral) > 68 || Number(form.leftCentral) < 0 || Number(form.leftCentral) > 68) return setMessage('エスターマンは0～120、10-2は0～68の範囲で入力してください。')
    setMessage('')
    onComplete()
  }
  return (
    <div className="automated-form">
      <div className="card automated-card"><label><span>両眼開放エスターマンテスト</span><b>視認点数</b><div className="input-unit"><input aria-label="エスターマン視認点数" type="number" min="0" max="120" step="1" inputMode="numeric" value={form.esterman} onChange={(event) => onChange({ ...form, esterman: event.target.value })} /><span>/ 120点</span></div></label></div>
      <div className="info-callout"><Info /><span>10-2プログラムで測定した各検査点のうち、26dB以上の検査点の数を入力してください。</span></div>
      <div className="card automated-card"><h3>10-2プログラム</h3><div className="two-eye-fields"><label><span>右眼</span><div className="input-unit"><input aria-label="10-2右眼視認点数" type="number" min="0" max="68" step="1" inputMode="numeric" value={form.rightCentral} onChange={(event) => onChange({ ...form, rightCentral: event.target.value })} /><span>/ 68点</span></div></label><label><span>左眼</span><div className="input-unit"><input aria-label="10-2左眼視認点数" type="number" min="0" max="68" step="1" inputMode="numeric" value={form.leftCentral} onChange={(event) => onChange({ ...form, leftCentral: event.target.value })} /><span>/ 68点</span></div></label></div>{binocularCentral && rightCentral !== undefined && leftCentral !== undefined && <div className="calculation-card embedded" aria-live="polite"><span>両眼中心視野視認点数</span><strong>{binocularCentral.value}点</strong><p>{binocularCalculation(rightCentral, leftCentral)}＝{binocularCentral.value}点</p></div>}</div>
      {message && <p className="field-error" role="alert">{message}</p>}
      <button className="primary-button" type="button" onClick={calculate}>視野を判定する<ChevronRight /></button>
    </div>
  )
}

function FieldStage({ draft, onChange, onComplete }: {
  draft: DraftAssessment
  onChange: (draft: DraftAssessment) => void
  onComplete: () => void
}) {
  return (
    <section className="stage-section" aria-labelledby="field-title">
      <div className="section-heading"><FileCheck2 /><div><p>STEP 2</p><h2 id="field-title">視野障害の判定</h2></div></div>
      <div className="method-switch" role="group" aria-label="視野検査方式"><button className={draft.fieldMethod === 'goldmann' ? 'active' : ''} onClick={() => onChange({ ...draft, fieldMethod: 'goldmann' })}>ゴールドマン型</button><button className={draft.fieldMethod === 'automated' ? 'active' : ''} onClick={() => onChange({ ...draft, fieldMethod: 'automated' })}>自動視野計</button></div>
      {draft.fieldMethod === 'goldmann'
        ? <GoldmannForm form={draft.goldmann} onChange={(goldmann) => onChange({ ...draft, goldmann })} onComplete={onComplete} />
        : <AutomatedForm form={draft.automated} onChange={(automated) => onChange({ ...draft, automated })} onComplete={onComplete} />}
    </section>
  )
}

function FieldCalculationDetails({ field }: { field: FieldResult }) {
  return field.method === 'goldmann' ? <dl>
    <div><dt>I/4 右眼</dt><dd>{formatComputedNumber(field.rightPeripheralSum)}°{field.rightPeripheralQualifies && field.rightPeripheralSum > 80 ? '（判定上80°以下）' : ''}</dd></div>
    <div><dt>I/4 左眼</dt><dd>{formatComputedNumber(field.leftPeripheralSum)}°{field.leftPeripheralQualifies && field.leftPeripheralSum > 80 ? '（判定上80°以下）' : ''}</dd></div>
    <div><dt>I/2 右眼・左眼</dt><dd>{formatComputedNumber(field.rightCentralSum)}°・{formatComputedNumber(field.leftCentralSum)}°</dd></div>
    <div><dt>両眼中心視野角度</dt><dd>{binocularCalculation(field.rightCentralSum, field.leftCentralSum)}＝{field.binocularCentral}°</dd></div>
  </dl> : <dl>
    <div><dt>エスターマン</dt><dd>{field.esterman} / 120点</dd></div>
    <div><dt>10-2 右眼・左眼</dt><dd>{field.rightCentral}点・{field.leftCentral}点</dd></div>
    <div><dt>両眼中心視野視認点数</dt><dd>{field.calculation}＝{field.binocularCentral}点</dd></div>
  </dl>
}

function ResultsStage({ visual, field, overall, onSave, onReset }: { visual?: VisualResult; field?: FieldResult; overall?: OverallResult; onSave: (label: string, memo: string) => boolean; onReset: () => void }) {
  const [label, setLabel] = useState('')
  const [memo, setMemo] = useState('')
  const [saveError, setSaveError] = useState('')
  if (!visual && !field) return <div className="empty-state card"><ClipboardList /><h2>判定結果がありません</h2><p>視力または視野を入力して判定してください。</p></div>
  const save = () => {
    if (!onSave(label.trim(), memo.trim())) setSaveError('履歴を保存できませんでした。入力内容は保持されています。')
  }
  return (
    <section className="results-stage" aria-labelledby="results-title">
      <div className="section-heading"><BookOpenCheck /><div><p>STEP 3</p><h2 id="results-title">判定結果</h2></div></div>
      {overall && visual && field ? <div className="overall-hero"><span className="overall-label">総合等級<OverallHelp visualIndex={visual.index} fieldIndex={field.index} totalIndex={overall.totalIndex} /></span><strong>{gradeText(overall.grade)}</strong><b>合計指数 {overall.totalIndex}</b><p>{overall.calculation}</p></div> : <div className="info-callout amber"><Info /><span>総合等級は視力・視野の両方を判定すると表示されます。現在の個別結果は保存できます。</span></div>}
      <div className="result-pair">{visual && <ResultBadge result={visual} title="視力障害" />}{field && <ResultBadge result={field} title="視野障害" />}</div>
      {visual && <article className="card detail-result"><div className="detail-result-heading"><h3>視力の判定根拠</h3><VisualCriteriaHelp currentRuleId={visual.ruleId} /></div><dl><div><dt>右眼</dt><dd>{visualLabel(visual.right)}（計算値 {visual.rightCalculated}）</dd></div><div><dt>左眼</dt><dd>{visualLabel(visual.left)}（計算値 {visual.leftCalculated}）</dd></div><div><dt>良い方</dt><dd>{visual.betterLabel}</dd></div></dl>{visual.diplopiaApplied && visual.zeroEye && <p className="special-reason">複視に関する特殊条件を適用：{visual.zeroEye === 'right' ? '右眼' : '左眼'}を視力0として判定</p>}<p className="reason"><CheckCircle2 />{visual.reason}</p><small>ルールID：{visual.ruleId}</small></article>}
      {field && <article className="card detail-result"><div className="detail-result-heading"><h3>視野の判定根拠</h3><FieldCriteriaHelp method={field.method} currentRuleId={field.ruleId} /></div><FieldCalculationDetails field={field} /><p className="reason"><CheckCircle2 />{field.reason}</p><small>ルールID：{field.ruleId}</small></article>}
      {overall && <article className="card detail-result total-detail"><h3>総合判定根拠</h3><p className="formula">{overall.calculation}</p><p className="reason"><CheckCircle2 />{overall.reason}</p></article>}
      <div className="card save-card"><h3><Save />この結果を端末に保存</h3><label><span>保存ラベル（任意）</span><input value={label} maxLength={40} placeholder="例：症例A、再検前" onChange={(event) => setLabel(event.target.value)} /></label><label><span>メモ（任意）</span><textarea value={memo} maxLength={500} rows={3} onChange={(event) => setMemo(event.target.value)} /></label><p><ShieldCheck />患者名など個人を特定できる情報は入力しないでください。データはこの端末内だけに保存されます。</p>{saveError && <p className="field-error" role="alert">{saveError}</p>}<button className="primary-button" type="button" onClick={save}>履歴に保存する</button></div>
      <button className="secondary-button" type="button" onClick={onReset}><RotateCcw />新しい判定を始める</button>
    </section>
  )
}

function HistoryPage({ records, onDelete, onClear, onRestore }: { records: SavedAssessment[]; onDelete: (id: string) => void; onClear: () => void; onRestore: (record: SavedAssessment) => void }) {
  const [selected, setSelected] = useState<SavedAssessment | null>(null)
  if (selected) return <div className="page history-detail"><button className="back-link" onClick={() => setSelected(null)}>← 履歴一覧へ</button><h2>{selected.label || '名称未設定の判定'}</h2><p className="date-line">{new Date(selected.createdAt).toLocaleString('ja-JP')}</p><div className="result-pair">{selected.visualResult && <ResultBadge title="視力障害" result={selected.visualResult} />}{selected.fieldResult && <ResultBadge title="視野障害" result={selected.fieldResult} />}</div>{selected.overallResult && <div className="overall-hero compact"><span>総合等級</span><strong>{gradeText(selected.overallResult.grade)}</strong><b>合計指数 {selected.overallResult.totalIndex}</b></div>}<article className="card detail-result"><h3>判定根拠</h3>{selected.visualResult && <p>視力：{selected.visualResult.reason}</p>}{selected.visualResult?.diplopiaApplied && selected.visualResult.zeroEye && <p className="special-reason">複視に関する特殊条件を適用：{selected.visualResult.zeroEye === 'right' ? '右眼' : '左眼'}を視力0として判定</p>}{selected.fieldResult && <><p>視野：{selected.fieldResult.reason}</p><h3 className="history-calculation-title">視野の計算内訳</h3><FieldCalculationDetails field={selected.fieldResult} /></>}{selected.overallResult && <p>総合：{selected.overallResult.reason}</p>}{selected.memo && <><h3>メモ</h3><p>{selected.memo}</p></>}<small>基準：{selected.rulesetId}</small></article><button className="primary-button" type="button" onClick={() => onRestore(selected)}><RotateCcw />このデータを判定画面で開く</button></div>
  return (
    <div className="page"><div className="page-title"><History /><div><h2>判定履歴</h2><p>この端末に保存した結果</p></div></div>{records.length > 0 && <button className="clear-button" onClick={onClear}><Trash2 />履歴をすべて削除</button>}{records.length === 0 ? <div className="empty-state card"><History /><h2>保存した履歴はありません</h2><p>判定結果画面から、必要な結果だけを保存できます。</p></div> : <div className="history-list">{records.map((record) => <article className="card history-item" key={record.id}><button className="history-open" onClick={() => setSelected(record)}><span><b>{record.label || '名称未設定の判定'}</b><small>{new Date(record.createdAt).toLocaleString('ja-JP')}・{record.fieldResult?.method === 'goldmann' ? 'ゴールドマン型' : record.fieldResult?.method === 'automated' ? '自動視野計' : '視力のみ'}</small></span><strong>{record.overallResult ? `総合 ${gradeText(record.overallResult.grade)}` : record.visualResult && record.fieldResult ? '個別結果' : record.visualResult ? `視力 ${gradeText(record.visualResult.grade)}` : record.fieldResult ? `視野 ${gradeText(record.fieldResult.grade)}` : ''}</strong><ChevronRight /></button><button className="delete-button" aria-label={`${record.label || '名称未設定の判定'}を削除`} onClick={() => onDelete(record.id)}><Trash2 /></button></article>)}</div>}</div>
  )
}

function SettingsPage() {
  return (
    <div className="page settings-page">
      <div className="page-title"><Settings /><div><h2>設定・基準情報</h2><p>アプリについて</p></div></div>
      <article className="card settings-card"><h3>判定基準</h3><dl><div><dt>基準ID</dt><dd>{RULESET_ID}</dd></div><div><dt>最終確認日</dt><dd>{RULESET_CHECKED_AT}</dd></div></dl><p>身体障害者福祉法施行規則別表第5号および身体障害認定基準の2018年7月改正内容に基づきます。</p></article>
      <article className="card settings-card"><h3>このアプリについて</h3><ul><li>入力値、計算途中、該当条件を確認するための業務用補助ツールです。</li><li>履歴はブラウザの端末内にのみ保存され、外部には送信されません。</li><li>視野図の画像解析や診断書作成には対応していません。</li></ul></article>
      <section className="settings-lower" aria-label="アプリ情報">
        <UpdateInfoDialog />
        <div className="creator-row"><span>作った人：</span><a href="https://yongmars.com/" target="_blank" rel="noopener noreferrer">視能訓練士 ゆうまるす</a></div>
        <section className="disclaimer-section">
          <h3>【免責事項】</h3>
          <ul><li>最終的な診断・認定は、最新の身体障害認定基準および指定医・認定機関の判断を優先してください。</li></ul>
        </section>
      </section>
      <p className="version">視覚障害等級判定 Ver. {APP_VERSION}</p>
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState<MainTab>('assessment')
  const [stage, setStage] = useState<Stage>(1)
  const [draft, setDraft] = useState(() => draftStorage.load())
  const [history, setHistory] = useState(() => historyStorage.load())
  const visualResult = useMemo(() => getVisualResult(draft), [draft])
  const visualInput = useMemo<SavedAssessment['visualInput']>(() => visualResult ? {
    right: draft.visual.right || visualResult.right,
    left: draft.visual.left || visualResult.left,
    correctedConfirmed: true,
    diplopia: draft.visual.diplopia,
    zeroEye: draft.visual.diplopia ? draft.visual.zeroEye : null,
  } : undefined, [draft.visual, visualResult])
  const fieldInput = useMemo<SavedAssessment['fieldInput']>(() => draft.fieldMethod === 'goldmann' ? getGoldmannInput(draft) : getAutomatedInput(draft), [draft])
  const fieldResult = useMemo<FieldResult | undefined>(() => fieldInput
    ? ('halfFieldLoss' in fieldInput ? gradeGoldmann(fieldInput) : gradeAutomated(fieldInput))
    : undefined, [fieldInput])
  const overall = useMemo(() => visualResult && fieldResult ? gradeOverall(visualResult, fieldResult) : undefined, [visualResult, fieldResult])

  useEffect(() => { draftStorage.save(draft) }, [draft])

  const saveHistory = (records: SavedAssessment[]): boolean => {
    if (!historyStorage.save(records)) return false
    setHistory(records)
    return true
  }
  const reset = () => {
    draftStorage.clear()
    setDraft(createEmptyDraft())
    setStage(1)
    window.scrollTo(0, 0)
  }
  const save = (label: string, memo: string): boolean => {
    const record: SavedAssessment = { schemaVersion: 1, id: crypto.randomUUID(), createdAt: new Date().toISOString(), label, memo, rulesetId: RULESET_ID, visualInput, visualResult, fieldInput, fieldResult, overallResult: overall }
    if (!saveHistory([record, ...history])) return false
    reset()
    return true
  }
  const clearInput = () => {
    if (window.confirm('現在入力中の視力・視野データをすべて消去しますか？保存済みの履歴は削除されません。')) reset()
  }
  const restoreFromHistory = (record: SavedAssessment) => {
    if (draftHasInput(draft) && !window.confirm('現在入力中のデータを、選択した履歴のデータで置き換えますか？')) return
    const restored = draftFromSaved(record)
    setDraft(restored)
    setStage(record.visualInput || record.fieldInput ? 3 : 1)
    setTab('assessment')
    window.scrollTo(0, 0)
  }

  const pageTitle = tab === 'assessment' ? '視覚障害等級判定' : tab === 'history' ? '判定履歴' : '設定'
  return (
    <div className="app-shell">
      <header className="app-header"><img src="/vig_icon192.png" alt="" /><h1>{pageTitle}</h1><span /></header>
      <main className="main-content">
        {tab === 'assessment' && <div className="page assessment-page"><StageNav stage={stage} setStage={setStage} visualReady={Boolean(visualResult)} fieldReady={Boolean(fieldResult)} /><button className="clear-button assessment-clear" type="button" onClick={clearInput}><Trash2 />入力をクリア</button>{stage === 1 && <VisualStage form={draft.visual} onChange={(visual) => setDraft({ ...draft, visual })} onComplete={() => { setStage(2); window.scrollTo(0, 0) }} />}{stage === 2 && <FieldStage draft={draft} onChange={setDraft} onComplete={() => { setStage(3); window.scrollTo(0, 0) }} />}{stage === 3 && <ResultsStage visual={visualResult} field={fieldResult} overall={overall} onSave={save} onReset={reset} />}</div>}
        {tab === 'history' && <HistoryPage records={history} onDelete={(id) => { saveHistory(history.filter((record) => record.id !== id)) }} onClear={() => { if (window.confirm('この端末の判定履歴をすべて削除しますか？')) saveHistory([]) }} onRestore={restoreFromHistory} />}
        {tab === 'settings' && <SettingsPage />}
      </main>
      <nav className="bottom-nav" aria-label="メインナビゲーション"><button className={tab === 'assessment' ? 'active' : ''} onClick={() => setTab('assessment')}><Calculator /><span>判定</span></button><button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}><History /><span>履歴</span></button><button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}><Settings /><span>設定</span></button></nav>
      <PwaPrompt />
    </div>
  )
}
