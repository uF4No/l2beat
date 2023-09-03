import { Logger } from '@l2beat/shared'
import {
  assert,
  ChainId,
  Hash256,
  ProjectId,
  Token,
  UnixTime,
} from '@l2beat/shared-pure'
import { setTimeout } from 'timers/promises'

import {
  ReportRecord,
  ReportRepository,
} from '../../peripherals/database/ReportRepository'
import { ReportStatusRepository } from '../../peripherals/database/ReportStatusRepository'
import { Clock } from '../Clock'
import { PriceUpdater } from '../PriceUpdater'
import { TaskQueue } from '../queue/TaskQueue'
import { createSuppliedFormulaReports } from '../reports/createTotalSupplyFormulaReports'
import { getTotalSupplyFormulaConfigHash } from '../reports/getTotalSupplyFormulaConfigHash'
import { CirculatingSupplyUpdater } from '../totalSupply/CirculatingSupplyUpdater'
import { AssetUpdater } from './AssetUpdater'

// TODO: Make this class more generic
// ProjectId, ChainId should be passed in the constructor
export class CirculatingSupplyFormulaUpdater implements AssetUpdater {
  private readonly configHash: Hash256
  private readonly taskQueue: TaskQueue<UnixTime>
  private readonly knownSet = new Set<number>()

  constructor(
    private readonly priceUpdater: PriceUpdater,
    private readonly circulatingSupplyUpdater: CirculatingSupplyUpdater,
    private readonly reportRepository: ReportRepository,
    private readonly reportStatusRepository: ReportStatusRepository,
    private readonly projectId: ProjectId,
    private readonly chainId: ChainId,
    private readonly clock: Clock,
    private readonly tokens: Token[],
    private readonly logger: Logger,
    private readonly minTimestamp: UnixTime,
  ) {
    assert(
      tokens.every(
        (token) =>
          token.chainId === this.chainId &&
          token.formula === 'circulatingSupply',
      ),
      'Programmer error: all tokens must be using circulatingSupply formula have the same chainId',
    )
    this.logger = this.logger.for(this)
    this.configHash = getTotalSupplyFormulaConfigHash(this.tokens)

    this.taskQueue = new TaskQueue(
      (timestamp) => this.update(timestamp),
      this.logger.for('taskQueue'),
      {
        metricsId: CirculatingSupplyFormulaUpdater.name,
      },
    )
  }

  getChainId() {
    return this.chainId
  }

  getConfigHash() {
    return this.configHash
  }

  getMinTimestamp() {
    return this.minTimestamp
  }

  async start() {
    const known = await this.reportStatusRepository.getByConfigHash(
      this.getConfigHash(),
      this.chainId,
    )

    for (const timestamp of known) {
      this.knownSet.add(timestamp.toNumber())
    }

    this.logger.info('Started')
    return this.clock.onEveryHour((timestamp) => {
      if (!this.knownSet.has(timestamp.toNumber())) {
        if (timestamp.gte(this.minTimestamp)) {
          // we add to front to sync from newest to oldest
          this.taskQueue.addToFront(timestamp)
        }
      }
    })
  }

  async update(timestamp: UnixTime) {
    assert(
      timestamp.gte(this.minTimestamp),
      'Timestamp cannot be smaller than minTimestamp',
    )

    this.logger.debug('Update started', { timestamp: timestamp.toNumber() })

    const [prices, circulatingSupplies] = await Promise.all([
      this.priceUpdater.getPricesWhenReady(timestamp),
      this.circulatingSupplyUpdater.getCirculatingSuppliesWhenReady(timestamp),
    ])
    this.logger.debug('Prices and supplies ready')

    const reports = createSuppliedFormulaReports(
      prices,
      circulatingSupplies,
      this.tokens,
      this.projectId,
      this.chainId,
    )
    await this.reportRepository.addOrUpdateMany(reports)

    await this.reportStatusRepository.add({
      configHash: this.getConfigHash(),
      timestamp,
      chainId: this.chainId,
    })

    this.knownSet.add(timestamp.toNumber())
    this.logger.info('Report updated', { timestamp: timestamp.toNumber() })
  }

  async getReportsWhenReady(
    timestamp: UnixTime,
    refreshIntervalMs = 1000,
  ): Promise<ReportRecord[]> {
    assert(
      timestamp.gte(this.minTimestamp),
      'Programmer error: requested timestamp does not exist',
    )

    while (!this.knownSet.has(timestamp.toNumber())) {
      this.logger.debug('Something is waiting for getReportsWhenReady', {
        timestamp: timestamp.toString(),
      })
      await setTimeout(refreshIntervalMs)
    }

    const canonical = await this.reportRepository.getByTimestampAndPreciseAsset(
      timestamp,
      this.getChainId(),
      'CBV',
    )

    const external = await this.reportRepository.getByTimestampAndPreciseAsset(
      timestamp,
      this.getChainId(),
      'EBV',
    )

    const native = await this.reportRepository.getByTimestampAndPreciseAsset(
      timestamp,
      this.getChainId(),
      'NMV',
    )

    const all = canonical.concat(external).concat(native)
    return all.filter((t) => this.tokens.some((m) => m.id === t.asset))
  }
}
