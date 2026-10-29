import { useCallback, useEffect, useMemo, useState } from 'react'
import gameData from './game-data/index.json'
import { fetchBattleLog, fetchPlayer } from './lib/api'
import {
  createEmptyBlocks,
  pruneMaxedBlockLines,
  reconcileCompletedUpgrades,
  type BuilderBlocksState,
} from './lib/builderBlocks'
import type { GlobalDiscounts } from './lib/discounts'
import {
  findBuilderHallLevel,
  findTownHallLevel,
  parseExportText,
  parseVillageExport,
} from './lib/parseExport'
import {
  computeActiveUpgrades,
  computeHeroPathToMax,
  computeProgress,
  computeRecommendations,
  computeRemainingCost,
  type HeroPathSummary,
} from './lib/progress'
import {
  loadBattles,
  loadBuilderBlocks,
  loadDiscounts,
  loadExport,
  loadStorageAmounts,
  mergeBattles,
  saveBuilderBlocks,
  saveBuilderBlockSnapshot,
  saveDiscounts,
  saveExport,
  saveStorageAmounts,
} from './lib/storage'
import type {
  BattleLogEntry,
  GameDataIndex,
  PlayerProfile,
  ResourceTotals,
  SortMode,
  VillageExport,
  VillageView,
} from './types'
import { PasteExport } from './components/PasteExport'
import { PlayerHeader } from './components/PlayerHeader'
import { ProgressRings } from './components/ProgressRings'
import { ResourceBars } from './components/ResourceBars'
import { DiscountSettings } from './components/DiscountSettings'
import { BuilderTimeline } from './components/BuilderTimeline'
import { Recommendations } from './components/Recommendations'
import { BuilderBlocks } from './components/BuilderBlocks'
import { HeroesPanel } from './components/HeroesPanel'
import { HeroPathModal } from './components/HeroPathModal'
import { BattleLog } from './components/BattleLog'
import { BattleAnalytics } from './components/BattleAnalytics'
import { CollapsibleSection } from './components/CollapsibleSection'
import './App.css'

const DATA = gameData as GameDataIndex

export default function App() {
  const [village, setVillage] = useState<VillageExport | null>(() => loadExport())
  const [storage, setStorage] = useState<ResourceTotals>(() => loadStorageAmounts())
  const [discounts, setDiscounts] = useState<GlobalDiscounts>(() => loadDiscounts())
  const [view, setView] = useState<VillageView>('home')
  const [sortMode, setSortMode] = useState<SortMode>('time')
  const [player, setPlayer] = useState<PlayerProfile | null>(null)
  const [playerError, setPlayerError] = useState<string | null>(null)
  const [battles, setBattles] = useState<BattleLogEntry[]>([])
  const [battleLoading, setBattleLoading] = useState(false)
  const [battleError, setBattleError] = useState<string | null>(null)
  const [heroPath, setHeroPath] = useState<HeroPathSummary | null>(null)
  const [builderBlocks, setBuilderBlocks] = useState<BuilderBlocksState>(() => createEmptyBlocks())

  const items = useMemo(
    () => (village ? parseVillageExport(village, DATA) : []),
    [village],
  )
  const tag = village?.tag ? String(village.tag) : ''
  const townHall = findTownHallLevel(items)
  const builderHall = findBuilderHallLevel(items)
  const hasBuilder = items.some((item) => item.base === 'builder')
  const hallLevel = view === 'home' ? townHall : builderHall

  const progress = useMemo(
    () => computeProgress(items, hallLevel, view),
    [items, hallLevel, view],
  )
  const remaining = useMemo(
    () => computeRemainingCost(items, hallLevel, view, discounts),
    [items, hallLevel, view, discounts],
  )
  const upgrades = useMemo(
    () => computeActiveUpgrades(items).filter((u) => u.base === view),
    [items, view],
  )
  const allActives = useMemo(() => computeActiveUpgrades(items), [items])
  const recommendations = useMemo(
    () =>
      sortMode === 'blocks'
        ? []
        : computeRecommendations(
            items,
            hallLevel,
            view,
            sortMode,
            storage.Gold + storage.Elixir + storage['Dark Elixir'] > 0 ? storage : null,
            discounts,
          ),
    [items, hallLevel, view, sortMode, storage, discounts],
  )
  const heroes = useMemo(
    () => items.filter((item) => item.base === 'home' && item.category === 'hero' && item.known),
    [items],
  )

  const refreshApi = useCallback(async (playerTag: string) => {
    setPlayerError(null)
    setBattleError(null)
    setBattleLoading(true)
    try {
      const profile = await fetchPlayer(playerTag)
      setPlayer(profile)
    } catch (err) {
      setPlayer(null)
      setPlayerError(err instanceof Error ? err.message : 'Player lookup failed')
    }
    try {
      const log = await fetchBattleLog(playerTag)
      setBattles(mergeBattles(playerTag, log))
    } catch (err) {
      setBattles(loadBattles(playerTag))
      setBattleError(err instanceof Error ? err.message : 'Battle log failed')
    } finally {
      setBattleLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!tag) return
    setBattles(loadBattles(tag))
    void refreshApi(tag)
  }, [tag, refreshApi])

  useEffect(() => {
    const loaded = loadBuilderBlocks(tag)
    if (!village) {
      setBuilderBlocks(loaded)
      return
    }
    // Never wipe in-progress plan lines on re-import (finishesAt shifts every paste).
    // Only drop lines that are already fully maxed for this TH.
    const pruned = pruneMaxedBlockLines(loaded, items, DATA, townHall)
    setBuilderBlocks(pruned.blocks)
    if (pruned.changed) {
      saveBuilderBlocks(tag, pruned.blocks)
    }
    const snapshot = reconcileCompletedUpgrades(pruned.blocks, allActives).snapshot
    saveBuilderBlockSnapshot(tag, snapshot)
  }, [village, allActives, tag, items, townHall])

  function handleBuilderBlocksChange(next: BuilderBlocksState) {
    setBuilderBlocks(next)
    saveBuilderBlocks(tag, next)
    const snapshot = reconcileCompletedUpgrades(next, allActives).snapshot
    saveBuilderBlockSnapshot(tag, snapshot)
  }

  function handleImport(text: string) {
    const parsed = parseExportText(text)
    if (!parsed.tag) {
      throw new Error('Export is missing a player tag.')
    }
    saveExport(parsed)
    setVillage(parsed)
    setView('home')
  }

  function handleStorageChange(next: ResourceTotals) {
    setStorage(next)
    saveStorageAmounts(next)
  }

  function handleDiscountChange(next: GlobalDiscounts) {
    setDiscounts(next)
    saveDiscounts(next)
  }

  function openHeroPath(dataId: number) {
    const hero = items.find((item) => item.dataId === dataId && item.category === 'hero')
    if (!hero) return
    const summary = computeHeroPathToMax(hero, townHall, DATA, discounts)
    if (summary) setHeroPath(summary)
  }

  return (
    <div className="app">
      <div className="bg-glow" />
      <div className="shell">
        <CollapsibleSection
          id="import"
          title="Import village"
          description="Paste a fresh export from Settings → More Settings → Data Export"
          defaultOpen={!village}
        >
          <PasteExport onImport={handleImport} hasVillage={Boolean(village)} />
        </CollapsibleSection>

        {village && (
          <>
            <CollapsibleSection
              id="profile"
              title="Player profile"
              description={`${tag} · Town Hall ${townHall}`}
            >
              <PlayerHeader
                tag={tag}
                townHall={townHall}
                builderHall={builderHall}
                player={player}
                playerError={playerError}
                view={view}
                onViewChange={setView}
                hasBuilder={hasBuilder}
              />
            </CollapsibleSection>

            <CollapsibleSection
              id="progress"
              title="Progress"
              description="Levels vs max for your current hall"
            >
              <ProgressRings categories={progress} />
            </CollapsibleSection>

            <CollapsibleSection
              id="resources"
              title="Resources still needed"
              description={
                discounts.costPercent > 0 || discounts.timePercent > 0
                  ? 'Sum of remaining upgrades at this hall (with global discounts)'
                  : 'Sum of remaining upgrades at this hall'
              }
            >
              <ResourceBars
                remaining={remaining}
                storage={storage}
                onStorageChange={handleStorageChange}
              />
              <DiscountSettings discounts={discounts} onChange={handleDiscountChange} />
            </CollapsibleSection>

            {view === 'home' && heroes.length > 0 && (
              <CollapsibleSection
                id="heroes"
                title="Heroes"
                description={`Tap a hero for total cost and time to TH${townHall} max`}
              >
                <HeroesPanel heroes={heroes} onHeroClick={openHeroPath} />
              </CollapsibleSection>
            )}

            <CollapsibleSection
              id="timeline"
              title="Builder timeline"
              description="From the export snapshot — re-paste after starting or finishing upgrades"
            >
              <BuilderTimeline upgrades={upgrades} />
            </CollapsibleSection>

            <CollapsibleSection
              id="recommendations"
              title="Upgrade recommendations"
              description="Next level for each unfinished item (equipment excluded)"
            >
              <Recommendations
                items={recommendations}
                sortMode={sortMode}
                onSortChange={setSortMode}
                onHeroClick={openHeroPath}
                blocksPanel={
                  <BuilderBlocks
                    blocks={builderBlocks}
                    onChange={handleBuilderBlocksChange}
                    items={items}
                    actives={allActives}
                    gameData={DATA}
                    discounts={discounts}
                    hallLevel={townHall}
                  />
                }
              />
            </CollapsibleSection>

            {view === 'home' && (
              <>
                <CollapsibleSection
                  id="analytics"
                  title="Battle analytics"
                  description="Attack-pattern intelligence from your stored battle history"
                >
                  <BattleAnalytics battles={battles} />
                </CollapsibleSection>

                <CollapsibleSection
                  id="battle-log"
                  title="Battle log"
                  description="Gold, elixir, and dark elixir only"
                >
                  <BattleLog
                    battles={battles}
                    loading={battleLoading}
                    error={battleError}
                    onRefresh={() => tag && void refreshApi(tag)}
                  />
                </CollapsibleSection>
              </>
            )}

            <footer className="footer">
              <p>
                Export gaps: forge builders, helper assignments, potions/boosts, and current
                storages are not included. Icons via{' '}
                <a href="https://assets.clashk.ing" target="_blank" rel="noreferrer">
                  ClashKing Assets
                </a>
                . Upgrade data from{' '}
                <a
                  href="https://www.npmjs.com/package/clash-of-clans-data"
                  target="_blank"
                  rel="noreferrer"
                >
                  clash-of-clans-data
                </a>
                .
              </p>
            </footer>
          </>
        )}
      </div>

      {heroPath && <HeroPathModal summary={heroPath} onClose={() => setHeroPath(null)} />}
    </div>
  )
}
