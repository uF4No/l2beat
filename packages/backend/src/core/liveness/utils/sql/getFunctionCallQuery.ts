import { EthereumAddress, UnixTime } from '@l2beat/shared-pure'
import { knex } from 'knex'

import { LivenessFunctionCall } from '../../types/LivenessConfig'

export function getFunctionCallQuery(
  functionCallsConfig: LivenessFunctionCall[],
  from: UnixTime,
  to: UnixTime,
) {
  const addresses = functionCallsConfig.map((m) => m.address)
  const methodSelectors = functionCallsConfig.map((m) =>
    m.selector.toLowerCase(),
  )

  const db = knex({
    client: 'pg',
  })

  const query = db
    .select(
      'block_number',
      db.raw('LEFT(input, 10) AS input'),
      'to_address',
      'block_timestamp',
      'transaction_hash',
    )
    .from(db.raw('bigquery-public-data.crypto_ethereum.traces'))
    .where(db.raw('call_type = ?', ['call']))
    .where(db.raw('status = ?', [1]))
    .andWhere(
      db.raw('block_timestamp >= ?', [
        db.raw('TIMESTAMP(?)', [from.toDate().toISOString()]),
      ]),
    )
    .andWhere(
      db.raw('block_timestamp < ?', [
        db.raw('TIMESTAMP(?)', [to.toDate().toISOString()]),
      ]),
    )
    .orderByRaw('block_timestamp ?', [db.raw('asc')])

  addresses.forEach((address, index) => {
    query
      .orWhere((builder) => {
        builder
          .where('to_address', address)
          .andWhere(db.raw('LEFT(input, 10) = ?', [methodSelectors[index]]))
          .catch(() => {})
      })
      .catch(() => {})
  })

  console.log(query.toQuery())

  // Order the results

  return [
    'SELECT',
    'block_number,',
    'LEFT(input, 10) AS input,',
    'to_address,',
    'block_timestamp,',
    'transaction_hash,',
    'FROM',
    'bigquery-public-data.crypto_ethereum.traces',
    'WHERE',
    "call_type = 'call'",
    'AND status = 1',
    `AND block_timestamp >= TIMESTAMP("${from.toDate().toISOString()}")`,
    `AND block_timestamp < TIMESTAMP("${to.toDate().toISOString()}")`,
    'AND',
    '(',
    ...addresses.map((address, i) => getBatch(address, methodSelectors[i], i)),
    ')',
    'ORDER BY',
    'block_timestamp ASC;',
  ].join('\n')
}

function getBatch(to: EthereumAddress, selector: string, i: number) {
  let batch = ''
  if (i > 0) {
    batch += 'OR\n'
  }
  batch += `(to_address = LOWER('${to.toLocaleLowerCase()}')
AND input LIKE '${selector.toLocaleLowerCase()}%')`
  return batch
}
