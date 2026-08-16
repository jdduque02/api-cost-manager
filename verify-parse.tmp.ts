import { readFile } from 'node:fs/promises';
import { parsePdfStatement } from './src/modules/finance/service/bank-statement-parser';

const files = [
  {
    name: 'Bancolombia',
    path: 'C:/Users/jdduq/Downloads/Extracto_1132483139_202607_TARJETA_MASTERCARD_2962.pdf',
    password: '1000445370',
  },
  {
    name: 'RappiCard',
    path: 'C:/Users/jdduq/Downloads/00200001000000497000CREDIT_CARD_STATEMENT.pdf',
    password: '1000445370',
  },
  {
    name: 'Nu',
    path: 'C:/Users/jdduq/Downloads/CuentaNu_JDG370_2026-07.pdf',
    password: '1000445370',
  },
];

(async () => {
  for (const f of files) {
    try {
      const buf = await readFile(f.path);
      const result = await parsePdfStatement(buf, f.password);
      console.log(`\n===== ${f.name} =====`);
      console.log('bank:', result.bank, '| period:', result.period ?? '(sin periodo)');
      console.log('transactions:', result.transactions.length);
      for (const tx of result.transactions) {
        console.log(
          `${tx.transaction_date} | ${tx.type.padEnd(7)} | ${String(tx.amount).padStart(12)} | ${tx.description}${tx.reference ? ` | ref=${tx.reference}` : ''}`,
        );
      }
    } catch (e) {
      console.error(`\n===== ${f.name} ===== ERROR:`, (e as Error).message);
    }
  }
})();
