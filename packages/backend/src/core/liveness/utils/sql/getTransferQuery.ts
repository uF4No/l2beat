import { UnixTime } from '@l2beat/shared-pure'
import knex from 'knex'

import { LivenessTransfer } from '../../types/LivenessConfig'

export function getTransferQuery(
  transfersConfig: LivenessTransfer[],
  from: UnixTime,
  to: UnixTime,
) {
  const senders = transfersConfig.map((t) => t.from)
  const receivers = transfersConfig.map((t) => t.to)

  const db = knex({
    client: 'pg',
  })

  const query = db
    .select(
      db.raw('block_number'),
      db.raw('from_address'),
      db.raw('to_address'),
      db.raw('block_timestamp'),
      db.raw('transaction_hash'),
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
    .andWhere(function () {
      senders.forEach((sender, index) => {
        if (index === 0) {
          this.where(function () {
            this.where(db.raw('from_address = ?', [sender.toLocaleLowerCase()]))
              .andWhere(
                db.raw('to_address = ?', [
                  receivers[index].toLocaleLowerCase(),
                ]),
              )
              .catch(() => {})
          }).catch(() => {})
        } else {
          this.orWhere(function () {
            this.where(db.raw('from_address = ?', [sender.toLocaleLowerCase()]))
              .andWhere(
                db.raw('to_address = ?', [
                  receivers[index].toLocaleLowerCase(),
                ]),
              )
              .catch(() => {})
          }).catch(() => {})
        }
      })
    })
    .orderByRaw('block_timestamp ?', [db.raw('asc')])

  return query.toQuery()
}
