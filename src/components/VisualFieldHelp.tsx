import { HelpDialog } from './HelpDialog'

type DiagramKind = 'normal' | 'central' | 'paracentral' | 'eccentric' | 'disconnected'

const rays = [
  [100, 100, 100, 32], [100, 100, 150, 50], [100, 100, 176, 100], [100, 100, 150, 150],
  [100, 100, 100, 168], [100, 100, 50, 150], [100, 100, 24, 100], [100, 100, 50, 50],
]

const centralRays = [
  [100, 77, 100, 32], [116, 84, 150, 50], [123, 100, 176, 100], [116, 116, 150, 150],
  [100, 123, 100, 168], [84, 116, 50, 150], [77, 100, 24, 100], [84, 84, 50, 50],
]

const eccentricRays = [[119, 81, 150, 50], [123, 100, 174, 100], [119, 126, 150, 150]]

function Plot({ kind }: { kind: DiagramKind }) {
  const standardRays = kind === 'eccentric' ? eccentricRays : kind === 'central' ? centralRays : rays
  return (
    <svg className="field-diagram" viewBox="0 0 200 200" role="img" aria-label={kind === 'normal' ? '通常の視野模式図' : kind === 'central' ? '中心暗点の模式図' : kind === 'paracentral' ? '傍中心暗点の模式図' : kind === 'eccentric' ? '偏心視野の模式図' : '中心部と連続しない周辺視野の模式図'}>
      <g className="plot-grid">
        {[24, 42, 60, 78].map((radius) => <circle key={radius} cx="100" cy="100" r={radius} />)}
        <path d="M18 100H182M100 18V182M42 42L158 158M158 42L42 158" />
      </g>
      {kind !== 'eccentric' && kind !== 'disconnected' && <ellipse className="isopter" cx="100" cy="100" rx="76" ry="68" />}
      {kind === 'eccentric' && <path className="isopter" d="M112 42C158 35 181 66 174 106C170 145 143 171 111 156C126 135 126 64 112 42Z" />}
      {kind === 'disconnected' && <><ellipse className="isopter" cx="100" cy="100" rx="36" ry="31" /><path className="excluded-island" d="M148 50C177 42 189 65 177 82C165 95 143 87 142 70C141 61 144 55 148 50Z" /></>}
      <g className="counted-lines">
        {standardRays.map(([x1, y1, x2, y2], index) => <line key={index} x1={x1} y1={y1} x2={kind === 'disconnected' ? 100 + (x2 - 100) * .43 : x2} y2={kind === 'disconnected' ? 100 + (y2 - 100) * .43 : y2} />)}
      </g>
      {kind === 'central' && <circle className="scotoma" cx="100" cy="100" r="23" />}
      {kind === 'central' && <circle className="fixation" cx="100" cy="100" r="3" />}
      {kind === 'paracentral' && <path className="scotoma" d="M124 83C146 76 158 92 151 113C145 131 121 134 114 116C108 101 112 88 124 83Z" />}
      {kind === 'paracentral' && <path className="deducted" d="M117 100H152M116 116L139 132" />}
      {kind === 'eccentric' && <circle className="fixation" cx="100" cy="100" r="4" />}
      {kind === 'disconnected' && <><circle className="fixation" cx="100" cy="100" r="3" /><text x="144" y="43">加算しない</text></>}
    </svg>
  )
}

const cases: Array<{ kind: DiagramKind; title: string; text: string }> = [
  { kind: 'normal', title: '1. 通常の視野', text: '固視点から各経線上のイソプタまでを視野角度として数えます。青線が算入する部分です。' },
  { kind: 'central', title: '2. 中心暗点が存在する場合', text: 'イソプタまでの角度から、中心暗点（灰色）と重なる部分を差し引き、実際に視認できる部分だけを数えます。' },
  { kind: 'paracentral', title: '3. 傍中心暗点が存在する場合', text: '暗点と経線が重なる部分だけを差し引きます。重ならない方向はそのまま数えます。' },
  { kind: 'eccentric', title: '4. 固視点を含まず偏心して視野が存在する場合', text: '固視点から外側までではなく、各経線と実際のイソプタが重なる部分だけを数えます。' },
  { kind: 'disconnected', title: '5. 中心部と連続していない周辺視野', text: '中心部の視野だけで判定し、離れて存在する周辺視野（破線）は加算しません。' },
]

export function VisualFieldAngleHelp({ target }: { target: 'I/4' | 'I/2' }) {
  return (
    <HelpDialog title="視野角度の算出方法" triggerLabel={`${target} 視野角度の算出方法を開く`}>
      <p>周辺視野角度は<strong>I/4視標</strong>、中心視野角度は<strong>I/2視標</strong>を使用します。</p>
      <p>上・内上・内・内下・下・外下・外・外上の8方向について、各経線上で実際に視標を視認できる部分を視野角度として算出します。</p>
      <div className="diagram-legend"><span><i className="counted-swatch" />算入する部分</span><span><i className="scotoma-swatch" />暗点・除外部分</span></div>
      <div className="diagram-list">{cases.map((item) => <article key={item.kind}><h3>{item.title}</h3><Plot kind={item.kind} /><p>{item.text}</p></article>)}</div>
      <div className="help-rule"><strong>I/4に関する追加ルール</strong><p>I/4視標で中心10°以内に視野が存在しない場合は、周辺視野角度の総和を80°以下として取り扱います。</p></div>
      <div className="help-rule"><strong>I/2に関する追加ルール</strong><p>I/2視標で中心10°以内に視野が存在しない場合は、中心視野角度の総和を0°として取り扱います。</p></div>
      <p className="help-note">この説明は角度入力方法を確認するためのものです。視野図画像からの自動算出は行いません。</p>
    </HelpDialog>
  )
}
