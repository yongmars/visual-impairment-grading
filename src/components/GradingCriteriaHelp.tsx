import { HelpDialog } from './HelpDialog'
import type { FieldMethod } from '../types'

type Criterion = {
  id: string
  text: string
  ruleIds: string[]
  note?: string
}

type CriteriaCardData = {
  grade: number
  index: number
  intro?: string
  criteria: Criterion[]
}

const visualCriteria: CriteriaCardData[] = [
  {
    grade: 1,
    index: 18,
    criteria: [{ id: 'va-1', text: '良い方の眼の視力が0.01以下', ruleIds: ['VA-1'] }],
  },
  {
    grade: 2,
    index: 11,
    intro: '以下のいずれかに該当',
    criteria: [
      { id: 'va-2-1', text: '良い方の眼の視力が0.02以上0.03以下', ruleIds: ['VA-2-1'] },
      { id: 'va-2-2', text: '良い方の眼の視力が0.04かつ、他方の眼が手動弁以下', ruleIds: ['VA-2-2'] },
    ],
  },
  {
    grade: 3,
    index: 7,
    intro: '以下のいずれかに該当',
    criteria: [
      {
        id: 'va-3-1',
        text: '良い方の眼の視力が0.04以上0.07以下',
        note: '※2級の特殊条件に該当するものを除く',
        ruleIds: ['VA-3-1'],
      },
      { id: 'va-3-2', text: '良い方の眼の視力が0.08かつ、他方の眼が手動弁以下', ruleIds: ['VA-3-2'] },
    ],
  },
  {
    grade: 4,
    index: 4,
    criteria: [{
      id: 'va-4',
      text: '良い方の眼の視力が0.08以上0.1以下',
      note: '※3級の特殊条件に該当するものを除く',
      ruleIds: ['VA-4'],
    }],
  },
  {
    grade: 5,
    index: 2,
    criteria: [{ id: 'va-5', text: '良い方の眼の視力が0.2かつ、他方の眼の視力が0.02以下', ruleIds: ['VA-5'] }],
  },
  {
    grade: 6,
    index: 1,
    criteria: [{ id: 'va-6', text: '良い方の眼の視力が0.3以上0.6以下かつ、他方の眼の視力が0.02以下', ruleIds: ['VA-6'] }],
  },
]

const goldmannCriteria: CriteriaCardData[] = [
  {
    grade: 2,
    index: 11,
    intro: '以下のすべてに該当',
    criteria: [
      { id: 'vf-g-2-peripheral', text: 'I/4による周辺視野角度総和が左右それぞれ80°以下', ruleIds: ['VF-G-2'] },
      { id: 'vf-g-2-central', text: '両眼中心視野角度が28°以下', ruleIds: ['VF-G-2'] },
    ],
  },
  {
    grade: 3,
    index: 7,
    intro: '以下のすべてに該当',
    criteria: [
      { id: 'vf-g-3-peripheral', text: 'I/4による周辺視野角度総和が左右それぞれ80°以下', ruleIds: ['VF-G-3'] },
      { id: 'vf-g-3-central', text: '両眼中心視野角度が56°以下', ruleIds: ['VF-G-3'] },
    ],
  },
  {
    grade: 4,
    index: 4,
    criteria: [{ id: 'vf-g-4', text: 'I/4による周辺視野角度総和が左右それぞれ80°以下', ruleIds: ['VF-G-4'] }],
  },
  {
    grade: 5,
    index: 2,
    intro: '以下のいずれかに該当',
    criteria: [
      { id: 'vf-g-5-1', text: '両眼による視野が2分の1以上欠損', ruleIds: ['VF-G-5-1'] },
      { id: 'vf-g-5-2', text: '両眼中心視野角度が56°以下', ruleIds: ['VF-G-5-2'] },
    ],
  },
]

const automatedCriteria: CriteriaCardData[] = [
  {
    grade: 2,
    index: 11,
    intro: '以下のすべてに該当',
    criteria: [
      { id: 'vf-a-2-esterman', text: '両眼開放エスターマンテスト視認点数が70点以下', ruleIds: ['VF-A-2'] },
      { id: 'vf-a-2-central', text: '両眼中心視野視認点数（10-2プログラム）が20点以下', ruleIds: ['VF-A-2'] },
    ],
  },
  {
    grade: 3,
    index: 7,
    intro: '以下のすべてに該当',
    criteria: [
      { id: 'vf-a-3-esterman', text: '両眼開放エスターマンテスト視認点数が70点以下', ruleIds: ['VF-A-3'] },
      { id: 'vf-a-3-central', text: '両眼中心視野視認点数（10-2プログラム）が40点以下', ruleIds: ['VF-A-3'] },
    ],
  },
  {
    grade: 4,
    index: 4,
    criteria: [{ id: 'vf-a-4', text: '両眼開放エスターマンテスト視認点数が70点以下', ruleIds: ['VF-A-4'] }],
  },
  {
    grade: 5,
    index: 2,
    intro: '以下のいずれかに該当',
    criteria: [
      { id: 'vf-a-5-1', text: '両眼開放エスターマンテスト視認点数が70点を超え100点以下', ruleIds: ['VF-A-5-1'] },
      { id: 'vf-a-5-2', text: '両眼中心視野視認点数（10-2プログラム）が40点以下', ruleIds: ['VF-A-5-2'] },
    ],
  },
]

function CriteriaCards({ cards, currentRuleId }: { cards: CriteriaCardData[]; currentRuleId: string }) {
  return <div className="criteria-list">{cards.map((card) => {
    const current = card.criteria.some((criterion) => criterion.ruleIds.includes(currentRuleId))
    return <article className={`criteria-card${current ? ' current' : ''}`} key={card.grade} aria-current={current ? 'true' : undefined}>
      <header>
        <h3>{card.grade}級</h3>
        <span className="criteria-index">指数 {card.index}</span>
        {current && <span className="current-label">現在該当</span>}
      </header>
      {card.intro && <p className="criteria-intro">{card.intro}</p>}
      <ul>{card.criteria.map((criterion) => {
        const criterionCurrent = criterion.ruleIds.includes(currentRuleId)
        return <li className={criterionCurrent ? 'current' : ''} key={criterion.id} aria-current={criterionCurrent ? 'true' : undefined}>
          <span>{criterion.text}{criterion.note && <small>{criterion.note}</small>}</span>
          {criterionCurrent && <b>現在該当</b>}
        </li>
      })}</ul>
    </article>
  })}</div>
}

export function VisualCriteriaHelp({ currentRuleId }: { currentRuleId: string }) {
  return <HelpDialog title="視力障害の等級判定基準" triggerLabel="視力障害の等級判定基準を開く">
    <p className="criteria-lead">良い方の眼の視力と、必要な場合は他方の眼の視力を組み合わせて判定します。</p>
    <CriteriaCards cards={visualCriteria} currentRuleId={currentRuleId} />
  </HelpDialog>
}

export function FieldCriteriaHelp({ method, currentRuleId }: { method: FieldMethod; currentRuleId: string }) {
  const goldmann = method === 'goldmann'
  const methodLabel = goldmann ? 'ゴールドマン型視野計' : '自動視野計'
  return <HelpDialog title="視野障害の等級判定基準" triggerLabel="視野障害の等級判定基準を開く">
    <p className="criteria-method"><span>現在の検査方法</span><strong>{methodLabel}</strong></p>
    <p className="criteria-lead">{goldmann
      ? '周辺視野はI/4視標、中心視野はI/2視標による値を使用します。'
      : '周辺視野は両眼開放エスターマンテスト、中心視野は10-2プログラムによる値を使用します。'}</p>
    <CriteriaCards cards={goldmann ? goldmannCriteria : automatedCriteria} currentRuleId={currentRuleId} />
  </HelpDialog>
}
