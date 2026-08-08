require('dotenv').config();
import { DataSource } from 'typeorm';
import { TransactionRecord } from './src/modules/finance/entities/transaction-record.entity';

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

  const applyFilters = (qb: any) => {
    qb.where('tr.user_id = :userId', { userId: 1 })
      .andWhere('tr.deleted_at IS NULL')
      .andWhere('tr.transaction_date >= :from', { from: '2026-08-01' })
      .andWhere('tr.transaction_date <= :to', { to: '2026-08-31' });
    return qb;
  };

  const group_by = 'day';

  console.log('--- TOTALS ---');
  const totalsRaw = await applyFilters(
    repo.createQueryBuilder('tr')
      .select('tr.type', 'type')
      .addSelect('COALESCE(SUM(tr.amount), 0)', 'amount')
      .addSelect('COUNT(*)', 'count'),
  ).groupBy('tr.type').getRawMany();
  console.log('totals ok', totalsRaw.length);

  console.log('--- CATEGORY ---');
  const categoryRaw = await applyFilters(
    repo.createQueryBuilder('tr')
      .select('tr.category_id', 'category_id')
      .addSelect('tr.type', 'type')
      .addSelect('COALESCE(SUM(tr.amount), 0)', 'amount')
      .addSelect('COUNT(*)', 'count'),
  ).groupBy('tr.category_id').addGroupBy('tr.type').getRawMany();
  console.log('category ok', categoryRaw.length);

  console.log('--- SERIES ---');
  const qb = applyFilters(
    repo.createQueryBuilder('tr')
      .select('DATE_TRUNC(:trunc, tr.transaction_date)::date', 'bucket')
      .addSelect('tr.type', 'type')
      .addSelect('COALESCE(SUM(tr.amount), 0)', 'amount')
      .addSelect('COUNT(*)', 'count'),
  )
    .setParameter('trunc', group_by)
    .groupBy('DATE_TRUNC(:trunc, tr.transaction_date)::date')
    .addGroupBy('tr.type')
    .orderBy('DATE_TRUNC(:trunc, tr.transaction_date)::date', 'ASC');
  console.log('SQL:', qb.getQuery());
  console.log('PARAMS:', qb.getParameters());
  const seriesRaw = await qb.getRawMany();
  console.log('series ok', seriesRaw.length, JSON.stringify(seriesRaw[0]));

  await ds.destroy();
}

main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
