import { HelpDialog } from './HelpDialog'

export function DiplopiaHelp() {
  return <HelpDialog title="両眼を同時に使用できない複視とは？" triggerLabel="複視に関する説明を開く">
    <p>眼筋麻痺などにより両眼複視が生じ、両眼を同時に使用することができず、日常生活で片眼を遮閉しなければならないような場合が対象です。</p>
    <p>この場合、認定基準では<strong>一眼の視力を0として取り扱います。</strong></p>
    <p>眼位ずれがあっても、両眼複視を自覚しない場合は、この取り扱いには該当しません。</p>
  </HelpDialog>
}

export function HalfFieldHelp() {
  return <HelpDialog title="「両眼による視野が2分の1以上欠損」とは？" triggerLabel="両眼による視野欠損の説明を開く">
    <p>ゴールドマン型視野計の<strong>I/4視標</strong>で左右眼それぞれの視野を測定し、両眼の視野を重ね合わせて評価します。</p>
    <p>両眼で見える視野が、<strong>生理的限界の面積に対して2分の1以上欠損している場合</strong>に「該当する」とします。</p>
    <p>これは8方向の視野角度総和が半分という意味ではなく、<strong>視野の面積</strong>についての判定です。</p>
    <h3>生理的限界の目安</h3>
    <dl className="limit-grid"><div><dt>上</dt><dd>60°</dd></div><div><dt>内上</dt><dd>60°</dd></div><div><dt>内</dt><dd>60°</dd></div><div><dt>内下</dt><dd>60°</dd></div><div><dt>下</dt><dd>70°</dd></div><div><dt>外下</dt><dd>80°</dd></div><div><dt>外</dt><dd>95°</dd></div><div><dt>外上</dt><dd>75°</dd></div></dl>
    <h3>この項目が必要な理由</h3>
    <p>視野障害5級には「両眼による視野が2分の1以上欠損」と「両眼中心視野角度が56°以下」という独立した条件があり、<strong>どちらか一方に該当すれば5級の条件</strong>になります。</p>
  </HelpDialog>
}

const totalRows = [
  { label: '18以上', min: 18, max: Infinity, grade: '1級' },
  { label: '11～17', min: 11, max: 17, grade: '2級' },
  { label: '7～10', min: 7, max: 10, grade: '3級' },
  { label: '4～6', min: 4, max: 6, grade: '4級' },
  { label: '2～3', min: 2, max: 3, grade: '5級' },
  { label: '1', min: 1, max: 1, grade: '6級' },
]

export function OverallHelp({ visualIndex, fieldIndex, totalIndex }: { visualIndex: number; fieldIndex: number; totalIndex: number }) {
  return <HelpDialog title="総合等級の判定方法" triggerLabel="総合等級の判定方法を開く">
    <p>視力障害の指数と視野障害の指数を合計し、その合計指数から総合等級を判定します。</p>
    <p className="help-formula">視力指数 {visualIndex}<br />＋ 視野指数 {fieldIndex}<br />＝ 合計指数 {totalIndex}</p>
    <table className="total-index-table"><thead><tr><th>合計指数</th><th>総合等級</th></tr></thead><tbody>{totalRows.map((row) => {
      const current = totalIndex >= row.min && totalIndex <= row.max
      return <tr key={row.label} className={current ? 'current' : ''} aria-current={current ? 'true' : undefined}><td>{row.label}</td><td>{row.grade}{current && <span>現在</span>}</td></tr>
    })}</tbody></table>
  </HelpDialog>
}
