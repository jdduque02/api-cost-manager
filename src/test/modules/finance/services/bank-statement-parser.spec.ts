import {
  parseStatementLines,
  TextLine,
} from '@finance/service/bank-statement-parser';
import { TransactionTypeEnum } from '@shared/enums';

type Tok = [number, string];

function line(y: number, page: number, toks: Tok[]): TextLine {
  return {
    y,
    page,
    tokens: toks.map(([absX, text]) => ({
      x: absX,
      y,
      text,
      absX,
      page,
    })),
  };
}

describe('bank-statement-parser', () => {
  describe('Bancolombia (tarjeta de crédito)', () => {
    const lines: TextLine[] = [
      line(586.6, 2, [
        [30, 'Nuevos movimientos entre 15 jun hasta 15 jul. 2026'],
      ]),
      line(566.4, 2, [
        [40, 'Número de'],
        [93.8, 'Fecha'],
        [165.1, 'Movimientos'],
        [275.2, 'Valor'],
        [381.7, 'Valor'],
        [534.3, 'Saldo'],
      ]),
      line(536.4, 2, [
        [40, 'C78699'],
        [85.8, '15/07/2026'],
        [142.9, 'ABONO SUCURSAL VIRTUAL'],
        [259.6, '$ -1.547.390,00'],
        [366.1, '$ -1.547.390,00'],
        [533.5, '$ 0,00'],
      ]),
      line(511.4, 2, [
        [40, '000000'],
        [85.8, '15/07/2026'],
        [155.6, 'CUOTA DE MANEJO'],
        [265.4, '$ 36.990,00'],
        [371.9, '$ 36.990,00'],
        [533.5, '$ 0,00'],
      ]),
      line(486.4, 2, [
        [40, 'R71865'],
        [85.8, '12/07/2026'],
        [145.2, 'MOVISTAR PAGOSEPAYCO'],
        [263.5, '$ 176.490,00'],
        [332.3, '1/1'],
        [380.5, '$ 0,00'],
        [533.5, '$ 0,00'],
      ]),
      line(371.6, 2, [[30, 'Movimientos antes de 15 jun']]),
      line(321.4, 2, [
        [40, 'C02797'],
        [85.8, '14/06/2026'],
        [142.9, 'ABONO SUCURSAL VIRTUAL'],
        [259.6, '$ -1.084.732,00'],
        [366.1, '$ -1.084.732,00'],
        [533.5, '$ 0,00'],
      ]),
      // Misma coordenada y que la fila de la página 2: nunca debe fusionarse.
      line(536.4, 5, [
        [40, '000000'],
        [85.8, '03/07/2026'],
        [143.1, 'TRASLADO SALDO A FAVOR'],
        [274, '$ 0,85'],
        [380.5, '$ 0,85'],
        [533.5, '$ 0,00'],
      ]),
    ];

    it('detecta el banco y el período', () => {
      const result = parseStatementLines(lines);
      expect(result.bank).toBe('bancolombia');
      expect(result.period).toBe('15 jun - 15 jul 2026');
    });

    it('parsea las transacciones de la sección de movimientos', () => {
      const result = parseStatementLines(lines);
      expect(result.transactions).toHaveLength(3);

      const [cuota, compra, traslado] = result.transactions;

      expect(cuota).toMatchObject({
        transaction_date: '2026-07-15',
        description: 'CUOTA DE MANEJO',
        amount: 36990,
        type: TransactionTypeEnum.EXPENSE,
        reference: '000000',
      });

      expect(compra).toMatchObject({
        transaction_date: '2026-07-12',
        description: 'MOVISTAR PAGOSEPAYCO',
        amount: 176490,
        type: TransactionTypeEnum.EXPENSE,
        reference: 'R71865',
      });

      expect(traslado).toMatchObject({
        transaction_date: '2026-07-03',
        description: 'TRASLADO SALDO A FAVOR',
        amount: 0.85,
        type: TransactionTypeEnum.EXPENSE,
      });
    });

    it('omite ABONO SUCURSAL VIRTUAL (pago de tarjeta)', () => {
      const result = parseStatementLines(lines);
      const descs = result.transactions.map((t) => t.description);
      expect(descs).not.toContain('ABONO SUCURSAL VIRTUAL');
      expect(descs).toContain('TRASLADO SALDO A FAVOR');
    });
  });

  describe('RappiCard (Davivienda)', () => {
    const lines: TextLine[] = [
      line(510.6, 1, [
        [284.8, 'Desde'],
        [316.4, '27 jun 2026'],
      ]),
      line(495.6, 1, [
        [285.7, 'Hasta'],
        [317.4, '30 jul 2026'],
      ]),
      line(743.3, 2, [
        [48.8, 'Tarjeta'],
        [88, 'Fecha'],
        [151, 'Descripción'],
        [240.5, 'Valor'],
        [307.7, 'Capital facturado'],
        [368.5, 'Cuotas'],
        [481.4, 'Tasa M.V'],
      ]),
      line(704.7, 2, [
        [48.8, '-'],
        [88, '2026-06-30'],
        [151, 'PAGOS POR PSE'],
        [234.5, '$-357.032,00'],
        [322.5, 'N/A'],
        [377.1, 'N/A'],
        [432, 'N/A'],
        [489.1, '0%'],
        [514.9, '0,00%'],
      ]),
      line(685.9, 2, [
        [48.8, 'Virtual'],
        [88, '2026-06-30'],
        [151, 'RAPPI'],
        [236, '$357.032,00'],
        [319.9, '$0,00'],
        [377.1, 'N/A'],
        [429.4, '$0,00'],
        [481.2, '0,0000%'],
        [514.9, '0,00%'],
      ]),
      line(667.2, 2, [[151, 'PLUS 12 MONTH']]),
      line(661.2, 2, [
        [48.8, 'Virtual'],
        [88, '2026-07-06'],
        [235.7, '$479.900,00'],
        [319.9, '$0,00'],
        [377.1, 'N/A'],
        [429.4, '$0,00'],
        [514.9, '0,00%'],
      ]),
      line(655.2, 2, [[151, 'FAMILY']]),
      line(636.4, 2, [
        [48.8, 'Virtual'],
        [88, '2026-07-11'],
        [151, 'FAP*GVGMALL'],
        [238, '$107.095,17'],
        [319.9, '$0,00'],
        [377.1, 'N/A'],
        [429.4, '$0,00'],
        [514.9, '0,00%'],
      ]),
      // Texto de otras páginas en rango de descripción: no debe pegarse.
      line(542, 1, [
        [192.5, 'Pago mínimo'],
        [247.6, '$0.00'],
      ]),
      line(760.5, 3, [
        [158, 'Valor sobre el cual se generarán gastos de cobranza'],
      ]),
    ];

    it('detecta el banco y el período desde Desde/Hasta', () => {
      const result = parseStatementLines(lines);
      expect(result.bank).toBe('rappicard');
      expect(result.period).toBe('27 jun 2026 - 30 jul 2026');
    });

    it('parsea pagos como ingreso y compras como gasto', () => {
      const result = parseStatementLines(lines);
      expect(result.transactions).toHaveLength(4);

      const [pago, rappi, family, gv] = result.transactions;

      expect(pago).toMatchObject({
        transaction_date: '2026-06-30',
        description: 'PAGOS POR PSE',
        amount: 357032,
        type: TransactionTypeEnum.INCOME,
      });
      expect(rappi).toMatchObject({
        transaction_date: '2026-06-30',
        description: 'RAPPI PLUS 12 MONTH',
        amount: 357032,
        type: TransactionTypeEnum.EXPENSE,
      });
      expect(family).toMatchObject({
        transaction_date: '2026-07-06',
        description: 'FAMILY',
        amount: 479900,
        type: TransactionTypeEnum.EXPENSE,
      });
      expect(gv).toMatchObject({
        transaction_date: '2026-07-11',
        description: 'FAP*GVGMALL',
        amount: 107095.17,
        type: TransactionTypeEnum.EXPENSE,
      });
    });

    it('ignora texto de otras páginas que intercala el PDF', () => {
      const result = parseStatementLines(lines);
      const descs = result.transactions.map((t) => t.description);
      expect(descs).not.toContain('FAP*GVGMALL Pago mínimo');
      expect(descs.join(' ')).not.toContain('gastos de cobranza');
    });
  });

  describe('Nu Bank', () => {
    const lines: TextLine[] = [
      line(617.9, 1, [
        [152, 'Nu Placa'],
        [266, 'Número de Cuenta'],
        [418, 'Período'],
      ]),
      line(603.7, 1, [
        [152, 'JDG370'],
        [266, '57442710'],
        [418, '01 - 31 JUL 2026'],
      ]),
      line(715.8, 2, [[116, 'Movimientos']]),
      line(673.4, 2, [
        [68, '04 jul'],
        [121, 'Recibiste dinero de un CDT'],
        [462.5, '+$608.657,28'],
      ]),
      line(638.4, 2, [
        [68, '30 jul'],
        [121, 'Recibiste de Jose David Duque Gutierrez'],
        [458.7, '+$750.000,00'],
      ]),
      line(568.4, 2, [
        [121, 'Rendimiento total de tu cuenta'],
        [469.1, '+$96.016,20'],
      ]),
      line(532.4, 2, [[121, 'Los rendimientos se pagan a diario']]),
    ];

    it('detecta el banco e infiere el año del período', () => {
      const result = parseStatementLines(lines);
      expect(result.bank).toBe('nu');
      expect(result.period).toBe('01 - 31 JUL 2026');
    });

    it('parsea movimientos con fecha, descripción y monto con signo', () => {
      const result = parseStatementLines(lines);
      expect(result.transactions).toHaveLength(2);

      const [cdt, recibido] = result.transactions;

      expect(cdt).toMatchObject({
        transaction_date: '2026-07-04',
        description: 'Recibiste dinero de un CDT',
        amount: 608657.28,
        type: TransactionTypeEnum.INCOME,
      });
      expect(recibido).toMatchObject({
        transaction_date: '2026-07-30',
        description: 'Recibiste de Jose David Duque Gutierrez',
        amount: 750000,
        type: TransactionTypeEnum.INCOME,
      });
    });

    it('omite filas resumen sin fecha', () => {
      const result = parseStatementLines(lines);
      expect(result.transactions).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            description: 'Rendimiento total de tu cuenta',
          }),
        ]),
      );
    });
  });

  describe('Parser genérico (sin banco detectado)', () => {
    const lines: TextLine[] = [
      line(610, 1, [
        [0.15, 'FECHA'],
        [0.35, 'DETALLE'],
        [0.55, 'DEBITO'],
        [0.72, 'CREDITO'],
        [0.9, 'SALDO'],
      ]),
      line(590, 1, [
        [0.2, '01/07/2026'],
        [0.35, 'SUPERMERCADO'],
        [0.55, '50.000,00'],
      ]),
    ];

    it('no detecta banco y usa el parser genérico', () => {
      const result = parseStatementLines(lines);
      expect(result.bank).toBeUndefined();
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0]).toMatchObject({
        transaction_date: '2026-07-01',
        description: 'SUPERMERCADO',
        amount: 50000,
        type: TransactionTypeEnum.EXPENSE,
      });
    });
  });

  describe('Detección con entidades configuradas (soporte)', () => {
    const header = [
      [0.15, 'FECHA'],
      [0.35, 'DETALLE'],
      [0.55, 'DEBITO'],
      [0.72, 'CREDITO'],
      [0.9, 'SALDO'],
    ] as [number, string][];

    it('reconoce una entidad personalizada por sus patrones', () => {
      const lines: TextLine[] = [
        line(610, 1, header),
        line(590, 1, [
          [0.2, '01/07/2026'],
          [0.35, 'SUPERMERCADO'],
          [0.55, '50.000,00'],
        ]),
        line(700, 1, [[0.5, 'Daviplata - Movimientos de tu cuenta']]),
      ];
      const entities = [
        { code: 'daviplata', detect_patterns: ['Movimientos de tu cuenta'] },
      ];

      const result = parseStatementLines(lines, undefined, entities);

      expect(result.bank).toBe('daviplata');
      expect(result.transactions).toHaveLength(1);
    });

    it('toma la entidad con más coincidencias', () => {
      const lines: TextLine[] = [
        line(610, 1, header),
        line(590, 1, [
          [0.2, '01/07/2026'],
          [0.35, 'SUPERMERCADO'],
          [0.55, '50.000,00'],
        ]),
        line(700, 1, [
          [0.5, 'Banco Futuro'],
          [0.6, 'Cuenta de ahorros'],
        ]),
        line(680, 1, [[0.5, 'Leyenda bancaria de la entidad']]),
      ];
      const entities = [
        { code: 'bancoa', detect_patterns: ['Banco Futuro'] },
        {
          code: 'bancob',
          detect_patterns: ['Cuenta de ahorros', 'Leyenda bancaria'],
        },
      ];

      const result = parseStatementLines(lines, undefined, entities);

      expect(result.bank).toBe('bancob');
    });

    it('no detecta banco si ningún patrón coincide', () => {
      const lines: TextLine[] = [
        line(610, 1, header),
        line(590, 1, [
          [0.2, '01/07/2026'],
          [0.35, 'SUPERMERCADO'],
          [0.55, '50.000,00'],
        ]),
      ];
      const entities = [
        { code: 'bancoa', detect_patterns: ['Cosa inexistente'] },
      ];

      const result = parseStatementLines(lines, undefined, entities);

      expect(result.bank).toBeUndefined();
      expect(result.transactions).toHaveLength(1);
    });

    it('ignora patrones inválidos (regex mal escrita)', () => {
      const lines: TextLine[] = [
        line(610, 1, header),
        line(590, 1, [
          [0.2, '01/07/2026'],
          [0.35, 'SUPERMERCADO'],
          [0.55, '50.000,00'],
        ]),
        line(700, 1, [[0.5, 'Extracto Daviplata']]),
      ];
      const entities = [
        { code: 'daviplata', detect_patterns: ['[a-', 'Extracto Daviplata'] },
      ];

      const result = parseStatementLines(lines, undefined, entities);

      expect(result.bank).toBe('daviplata');
    });
  });
});
