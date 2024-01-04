import { Layer2 } from '@l2beat/config'
import cx from 'classnames'
import React from 'react'

import {
  ArbitrumIcon,
  LoopringIcon,
  OptimismIcon,
  OVMIcon,
  PolygonIcon,
  StarknetIcon,
  StarkWareIcon,
  ZKStackIcon,
  ZkSyncLiteIcon,
} from '../icons'
import { Tooltip } from '../tooltip/Tooltip'

export interface TypeCellProps {
  children: string
  disableColors?: boolean
  provider?: Layer2['display']['provider']
}

export function TypeCell({ provider, children, disableColors }: TypeCellProps) {
  const isRollup = children.includes('Rollup')
  const providerClassName = 'relative inline-block h-4 w-4 ml-1'
  const providerIconClassName = 'absolute -top-0.5 left-0 w-4 h-4'

  return (
    <span
      className={cx(
        isRollup && !disableColors && 'text-green-300 dark:text-green-450',
      )}
    >
      {children}
      {provider === 'StarkEx' && (
        <Tooltip
          className={providerClassName}
          content="This project is built using StarkEx."
        >
          <StarkWareIcon className={providerIconClassName} />
        </Tooltip>
      )}
      {provider === 'OP Stack' && (
        <Tooltip
          className={providerClassName}
          content="This project is based on OP Stack's code base."
        >
          <OptimismIcon className={providerIconClassName} />
        </Tooltip>
      )}
      {provider === 'OVM' && (
        <Tooltip
          className={providerClassName}
          content="This project is based on old OVM's code base."
        >
          <OVMIcon className={providerIconClassName} />
        </Tooltip>
      )}
      {provider === 'zkSync Lite' && (
        <Tooltip
          className={providerClassName}
          content="This project is based on zkSync Lite's code base."
        >
          <ZkSyncLiteIcon className={providerIconClassName} />
        </Tooltip>
      )}
      {provider === 'ZK Stack' && (
        <Tooltip
          className={providerClassName}
          content="This project is based on ZK Stack's code base."
        >
          <ZKStackIcon className={providerIconClassName} />
        </Tooltip>
      )}
      {provider === 'Loopring' && (
        <Tooltip
          className={providerClassName}
          content="This project is based on Loopring's code base."
        >
          <LoopringIcon className={providerIconClassName} />
        </Tooltip>
      )}
      {provider === 'Arbitrum' && (
        <Tooltip
          className={providerClassName}
          content="This project is based on Arbitrum's code base."
        >
          <ArbitrumIcon className={providerIconClassName} />
        </Tooltip>
      )}
      {provider === 'Polygon' && (
        <Tooltip
          className={providerClassName}
          content="This project is based on Polygon's code base."
        >
          <PolygonIcon className={providerIconClassName} />
        </Tooltip>
      )}
      {provider === 'Starknet' && (
        <Tooltip
          className={providerClassName}
          content="This project is based on Starknet's code base."
        >
          <StarknetIcon className={providerIconClassName} />
        </Tooltip>
      )}
    </span>
  )
}
