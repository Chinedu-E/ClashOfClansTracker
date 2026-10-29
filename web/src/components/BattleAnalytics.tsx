import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import gameData from '../game-data/index.json'
import {
  analyzeBattles,
  type BattleModeFilter,
  type BattleTypeFilter,
} from '../lib/battleAnalytics'
import { formatCompact, formatDuration, formatNumber } from '../lib/format'
import type { BattleLogEntry, GameDataIndex } from '../types'
import { ItemIcon } from './ItemIcon'

interface Props {
  battles: BattleLogEntry[]
}

const DATA = gameData as GameDataIndex
const STAR_COLORS = ['#64748b', '#f59e0b', '#38bdf8', '#34d399']
const TYPE_COLORS = ['#f0c14b', '#8b5cf6', '#38bdf8', '#94a3b8']

function pct(value: number): string {
  return `${Math.round(value * 100)}%`
}

export function BattleAnalytics({ battles }: Props) {
  const [mode, setMode] = useState<BattleModeFilter>('attack')
  const [type, setType] = useState<BattleTypeFilter>('all')

  const analytics = useMemo(
    () => analyzeBattles(battles, DATA, mode, type),
    [battles, mode, type],
  )

  const starChart = analytics.starDistribution.map((row) => ({
    name: `${row.stars}★`,
    count: row.count,
    fill: STAR_COLORS[row.stars],
  }))

  const typeChart = analytics.byType.map((row, index) => ({
    name: row.label,
    avgStars: Number(row.avgStars.toFixed(2)),
    threeStarRate: Number((row.threeStarRate * 100).toFixed(1)),
    count: row.count,
    fill: TYPE_COLORS[index % TYPE_COLORS.length],
  }))

  const troopChart = analytics.troopRankings.slice(0, 10).map((row) => ({
    name: row.name,
    avgStars: Number(row.avgStars.toFixed(2)),
    appearances: row.appearances,
  }))

  const lootTrend = analytics.trend.map((row) => ({
    ...row,
    avgStars: Number(row.avgStars.toFixed(2)),
  }))

  if (!battles.length) {
    return <p className="muted">Analytics unlock after battles are loaded.</p>
  }

  return (
    <div className="analytics">
      <div className="section-toolbar analytics-toolbar">
        <div className="seg">
          {(
            [
              ['attack', 'Attacks'],
              ['defense', 'Defenses'],
              ['all', 'All battles'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={mode === value ? 'active' : ''}
              onClick={() => setMode(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="seg">
          {(
            [
              ['all', 'All types'],
              ['home', 'Home'],
              ['ranked', 'Ranked'],
              ['legend', 'Legend'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={type === value ? 'active' : ''}
              onClick={() => setType(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="muted">Battles</span>
          <strong>{formatNumber(analytics.kpis.battles)}</strong>
          <span className="muted tiny">
            {analytics.kpis.attacks} atk · {analytics.kpis.defenses} def
          </span>
        </div>
        <div className="kpi-card">
          <span className="muted">Avg stars</span>
          <strong>{analytics.kpis.avgStars.toFixed(2)}★</strong>
          <span className="muted tiny">{pct(analytics.kpis.threeStarRate)} triples</span>
        </div>
        <div className="kpi-card">
          <span className="muted">Destruction</span>
          <strong>{Math.round(analytics.kpis.avgDestruction)}%</strong>
          <span className="muted tiny">{pct(analytics.kpis.failRate)} zero-star</span>
        </div>
        <div className="kpi-card">
          <span className="muted">Avg duration</span>
          <strong>
            {analytics.kpis.avgDuration
              ? formatDuration(analytics.kpis.avgDuration)
              : '—'}
          </strong>
          <span className="muted tiny">
            Army data on {analytics.kpis.withArmy}/{analytics.kpis.attacks || analytics.kpis.battles}
          </span>
        </div>
        <div className="kpi-card">
          <span className="muted">Gold looted</span>
          <strong className="gold-text">{formatCompact(analytics.kpis.totalGold)}</strong>
          <span className="muted tiny">avg {formatCompact(analytics.kpis.avgGold)}</span>
        </div>
        <div className="kpi-card">
          <span className="muted">Elixir looted</span>
          <strong className="elixir-text">{formatCompact(analytics.kpis.totalElixir)}</strong>
          <span className="muted tiny">avg {formatCompact(analytics.kpis.avgElixir)}</span>
        </div>
        <div className="kpi-card">
          <span className="muted">Dark elixir</span>
          <strong className="dark-text">{formatCompact(analytics.kpis.totalDark)}</strong>
          <span className="muted tiny">avg {formatCompact(analytics.kpis.avgDark)}</span>
        </div>
      </div>

      {analytics.insights.length > 0 && (
        <div className="insight-grid">
          {analytics.insights.map((insight) => (
            <article key={insight.title} className={`insight-card ${insight.tone}`}>
              <h3>{insight.title}</h3>
              <p className="muted">{insight.detail}</p>
            </article>
          ))}
        </div>
      )}

      <div className="analytics-grid">
        <div className="chart-panel">
          <h3>Star distribution</h3>
          <div className="chart-frame">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={starChart}
                  dataKey="count"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                >
                  {starChart.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#121a2b', border: '1px solid #334155' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-panel">
          <h3>Performance by battle type</h3>
          <div className="chart-frame">
            {typeChart.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={typeChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="name" tick={{ fill: '#9aa6bf', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#9aa6bf', fontSize: 12 }} domain={[0, 3]} />
                  <Tooltip
                    contentStyle={{ background: '#121a2b', border: '1px solid #334155' }}
                  />
                  <Bar dataKey="avgStars" name="Avg stars" radius={[8, 8, 0, 0]}>
                    {typeChart.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="muted">No type breakdown for this filter.</p>
            )}
          </div>
          {analytics.byType.length > 0 && (
            <div className="mini-table">
              {analytics.byType.map((row) => (
                <div key={row.key} className="mini-row">
                  <strong>{row.label}</strong>
                  <span>{row.count} battles</span>
                  <span>{row.avgStars.toFixed(2)}★</span>
                  <span>{pct(row.threeStarRate)} 3★</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="analytics-grid">
        <div className="chart-panel wide">
          <h3>Troops ranked by average stars</h3>
          <p className="muted tiny">
            Attribution uses attacks that include an army share. Higher is better for learning which
            units show up in your strongest raids.
          </p>
          <div className="chart-frame">
            {troopChart.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={troopChart} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis type="number" domain={[0, 3]} tick={{ fill: '#9aa6bf', fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    tick={{ fill: '#9aa6bf', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{ background: '#121a2b', border: '1px solid #334155' }}
                  />
                  <Bar dataKey="avgStars" name="Avg stars" fill="#f0c14b" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="muted">No troop army codes in this slice yet.</p>
            )}
          </div>
          {analytics.troopRankings.length > 0 && (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Troop</th>
                    <th>Uses</th>
                    <th>Avg ★</th>
                    <th>3★ rate</th>
                    <th>0★ rate</th>
                    <th>Avg %</th>
                    <th>Avg count</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.troopRankings.slice(0, 15).map((row) => (
                    <tr key={row.name}>
                      <td>
                        <div className="table-entity">
                          <ItemIcon
                            name={row.name}
                            category={row.category}
                            base="home"
                            size={28}
                          />
                          {row.name}
                        </div>
                      </td>
                      <td>{row.appearances}</td>
                      <td>{row.avgStars.toFixed(2)}</td>
                      <td>{pct(row.threeStarRate)}</td>
                      <td>{pct(row.zeroStarRate)}</td>
                      <td>{Math.round(row.avgDestruction)}%</td>
                      <td>{row.avgCount.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="analytics-grid">
        <div className="chart-panel">
          <h3>Spell performance</h3>
          {analytics.spellRankings.length ? (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Spell</th>
                    <th>Uses</th>
                    <th>Avg ★</th>
                    <th>3★</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.spellRankings.slice(0, 10).map((row) => (
                    <tr key={row.name}>
                      <td>
                        <div className="table-entity">
                          <ItemIcon
                            name={row.name}
                            category={row.category}
                            base="home"
                            size={28}
                          />
                          {row.name}
                        </div>
                      </td>
                      <td>{row.appearances}</td>
                      <td>{row.avgStars.toFixed(2)}</td>
                      <td>{pct(row.threeStarRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">No spell data in this filter.</p>
          )}
        </div>

        <div className="chart-panel">
          <h3>Opponent Town Hall matchups</h3>
          {analytics.thMatchups.length ? (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Opponent</th>
                    <th>Attacks</th>
                    <th>Avg ★</th>
                    <th>3★</th>
                    <th>Avg %</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.thMatchups.map((row) => (
                    <tr key={row.key}>
                      <td>{row.label}</td>
                      <td>{row.count}</td>
                      <td>{row.avgStars.toFixed(2)}</td>
                      <td>{pct(row.threeStarRate)}</td>
                      <td>{Math.round(row.avgDestruction)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">No opponent TH data for attacks in this filter.</p>
          )}
        </div>
      </div>

      <div className="chart-panel">
        <h3>Best repeating compositions</h3>
        <p className="muted tiny">
          Fingerprinted from troop counts in army share codes. Useful for spotting which exact
          recipes convert.
        </p>
        {analytics.compositions.length ? (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Composition</th>
                  <th>Uses</th>
                  <th>Avg ★</th>
                  <th>3★ rate</th>
                  <th>Avg %</th>
                </tr>
              </thead>
              <tbody>
                {analytics.compositions.slice(0, 12).map((row) => (
                  <tr key={row.signature}>
                    <td className="comp-label">{row.label}</td>
                    <td>{row.appearances}</td>
                    <td>{row.avgStars.toFixed(2)}</td>
                    <td>{pct(row.threeStarRate)}</td>
                    <td>{Math.round(row.avgDestruction)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">Need attacks with army codes to rank compositions.</p>
        )}
      </div>

      {lootTrend.length > 1 && (
        <div className="chart-panel">
          <h3>Daily trend</h3>
          <div className="chart-frame">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={lootTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="label" tick={{ fill: '#9aa6bf', fontSize: 12 }} />
                <YAxis yAxisId="left" domain={[0, 3]} tick={{ fill: '#9aa6bf', fontSize: 12 }} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: '#9aa6bf', fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{ background: '#121a2b', border: '1px solid #334155' }}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="avgStars"
                  name="Avg stars"
                  stroke="#f0c14b"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="gold"
                  name="Gold"
                  stroke="#eab308"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="elixir"
                  name="Elixir"
                  stroke="#d26bff"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
