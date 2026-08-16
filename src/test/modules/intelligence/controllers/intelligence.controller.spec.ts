import { IntelligenceController } from '@intelligence/controller/intelligence.controller';
import { IntelligenceService } from '@intelligence/service/intelligence.service';

const mockService = {
  findFinancialSummary: jest.fn(),
  findFinancialSummaryByPeriod: jest.fn(),
  findTaxSummary: jest.fn(),
};

const currentUser = { sub: 'kc-uuid', userId: 10 };

describe('IntelligenceController', () => {
  let controller: IntelligenceController;

  beforeEach(() => {
    controller = new IntelligenceController(
      mockService as unknown as IntelligenceService,
    );
    jest.clearAllMocks();
  });

  it('obtiene resumen financiero', async () => {
    const summary = { id: 1, user_id: 10 };
    mockService.findFinancialSummary.mockResolvedValue(summary);
    await expect(
      controller.getFinancialSummary(10, currentUser as never),
    ).resolves.toEqual(summary);
    expect(mockService.findFinancialSummary).toHaveBeenCalledWith(10);
  });

  it('obtiene resumen por período', async () => {
    const summary = { id: 1, financial_period_id: 5 };
    mockService.findFinancialSummaryByPeriod.mockResolvedValue(summary);
    await expect(
      controller.getFinancialSummaryByPeriod(10, 5, currentUser as never),
    ).resolves.toEqual(summary);
    expect(mockService.findFinancialSummaryByPeriod).toHaveBeenCalledWith(
      10,
      5,
    );
  });

  it('obtiene resumen fiscal sin año', async () => {
    const summary = { id: 1 };
    mockService.findTaxSummary.mockResolvedValue(summary);
    await expect(
      controller.getTaxSummary(10, currentUser as never),
    ).resolves.toEqual(summary);
    expect(mockService.findTaxSummary).toHaveBeenCalledWith(10, undefined);
  });

  it('obtiene resumen fiscal con año', async () => {
    mockService.findTaxSummary.mockResolvedValue({ id: 1 });
    await controller.getTaxSummary(10, currentUser as never, '2024');
    expect(mockService.findTaxSummary).toHaveBeenCalledWith(10, 2024);
  });
});
