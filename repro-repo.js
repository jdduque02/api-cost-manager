require('dotenv').config();
const { DataSource } = require('typeorm');
const { TransactionRecord } = require('./dist/src/modules/finance/entities/transaction-record.entity');
const { TransactionRecordRepository } = require('./dist/src/modules/finance/repositories/transaction-record.repository');

async function main() {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [TransactionRecord],
    synchronize: false,
  });
  await ds.initialize();
  const repo = ds.getRepository(TransactionRecord);
  const fakeI18n = { t: (k, o) => k };
  const fakeEnc = {};
  const instance = new TransactionRecordRepository(repo, ds, fakeEnc, fakeI18n);
  const result = await instance.getSummary(1, { date_from: '2026-08-01', date_to: '2026-08-04', group_by: 'day' });
  console.log('getSummary OK');
  console.log('totals:', JSON.stringify(result.totals));
  console.log('by_category len:', result.by_category.length);
  console.log('series len:', result.series.length);
  console.log('series[0]:', JSON.stringify(result.series[0]));
  await ds.destroy();
}
main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
