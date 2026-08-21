import { HelpDialog } from './HelpDialog'

const cases = [
  { image: '/normal.png', alt: '通常の視野で固視点からイソプタまでを算入する図', title: '1. 通常の視野', text: '固視点から各経線上のイソプタまでを視野角度として数えます。青線が算入する部分です。' },
  { image: '/central.png', alt: '中心暗点と重なる部分を差し引いて算出する図', title: '2. 中心暗点が存在する場合', text: 'イソプタまでの角度から、中心暗点（灰色）と重なる部分を差し引き、実際に視認できる部分だけを数えます。' },
  { image: '/eccentric.png', alt: '傍中心暗点と経線が重なる部分だけを差し引く図', title: '3. 傍中心暗点が存在する場合', text: '暗点と経線が重なる部分だけを差し引きます。重ならない方向はそのまま数えます。' },
  { image: '/peripheral.png', alt: '固視点を含まない偏心視野でイソプタと重なる部分だけを算入する図', title: '4. 固視点を含まず偏心して視野が存在する場合', text: '固視点から外側までではなく、各経線と実際のイソプタが重なる部分だけを数えます。' },
  { image: '/separation.png', alt: '中心部から離れた周辺視野を加算せず中心部だけで判定する図', title: '5. 中心部と連続していない周辺視野', text: '中心部の視野だけで判定し、離れて存在する周辺視野（赤線）は加算しません。' },
]

export function VisualFieldAngleHelp({ target }: { target: 'I/4' | 'I/2' }) {
  return (
    <HelpDialog title="視野角度の算出方法" triggerLabel={`${target} 視野角度の算出方法を開く`}>
      <p>周辺視野角度は<strong>I/4視標</strong>、中心視野角度は<strong>I/2視標</strong>を使用します。</p>
      <p>上・内上・内・内下・下・外下・外・外上の8方向について、各経線上で実際に視標を視認できる部分を視野角度として算出します。</p>
      <div className="diagram-legend"><span><i className="counted-swatch" />青い線：計測に含める線</span><span><i className="excluded-swatch" />赤い線：計測に含めない線</span><span><i className="scotoma-swatch" />灰色：暗点</span></div>
      <div className="diagram-list">{cases.map((item) => <article key={item.image}><h3>{item.title}</h3><img className="field-diagram" src={item.image} alt={item.alt} width="512" height="512" /><p>{item.text}</p></article>)}</div>
      <div className="help-rule"><strong>I/4に関する追加ルール</strong><p>I/4視標で中心10°以内に視野が存在しない場合は、周辺視野角度の総和を80°以下として取り扱います。</p></div>
      <div className="help-rule"><strong>I/2に関する追加ルール</strong><p>I/2視標で中心10°以内に視野が存在しない場合は、中心視野角度の総和を0°として取り扱います。</p></div>
      <p className="help-note">この説明は角度入力方法を確認するためのものです。視野図画像からの自動算出は行いません。</p>
    </HelpDialog>
  )
}
