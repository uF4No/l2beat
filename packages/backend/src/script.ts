// https://api.etherscan.io/api
//    ?module=account
//    &action=txlist
//    &address=0xc5102fE9359FD9a28f877a67E36B0F050d81a3CC
//    &startblock=0
//    &endblock=99999999
//    &page=1
//    &offset=10
//    &sort=asc
//    &apikey=YourApiKeyToken

import { ethers } from 'ethers'
import { writeFileSync } from 'fs'

async function main() {
  const address = '0x3dB52cE065f728011Ac6732222270b3F2360d919'
  const selector = '0x7739cbe7'

  const etherscanProvider = new ethers.providers.EtherscanProvider(
    'homestead',
    'RC2W28PYNA2EUU86RJW52W2QXDXF13EWFK',
  )
  const blockRanges = getBlockRanges(18031264, 18213199)

  const results: {
    txHash: string
    blockNumber: number | undefined
    data: string
  }[] = []
  for (const blockRange of blockRanges) {
    const history = await etherscanProvider.getHistory(
      address,
      blockRange.startBlock,
      blockRange.endBlock,
    )
    history.forEach((tx) => {
      if (tx.data.startsWith(selector)) {
        results.push({
          txHash: tx.hash,
          blockNumber: tx.blockNumber,
          data: tx.data,
        })
      }
    })
    writeFileSync(
      './test.csv',
      results.map((d) => Object.values(d).join(';')).join('\n'),
    )
    console.log(results)
  }
}

main().catch(console.error)

function getBlockRanges(startBlock: number, endBlock: number) {
  const maxBlockRange = 1000
  const blockRanges = []

  let currentStartBlock = startBlock
  let currentEndBlock = Math.min(endBlock, startBlock + maxBlockRange - 1)

  while (currentStartBlock <= endBlock) {
    blockRanges.push({
      startBlock: currentStartBlock,
      endBlock: currentEndBlock,
    })

    currentStartBlock = currentEndBlock + 1
    currentEndBlock = Math.min(endBlock, currentStartBlock + maxBlockRange - 1)
  }

  return blockRanges
}
