import { Test, TestingModule } from '@nestjs/testing';
import { SupportRequestService } from '@support/service/support-request.service';
import { SupportRequestRepository } from '@support/repositories/support-request.repository';
import { SupportRequestStatusEnum } from '@support/entities/support-request.entity';

const mockRepo = {
  create: jest.fn(),
  findByUser: jest.fn(),
  findByIdAndUser: jest.fn(),
  softDelete: jest.fn(),
  findAllAdmin: jest.fn(),
  updateAdmin: jest.fn(),
};

describe('SupportRequestService', () => {
  let service: SupportRequestService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportRequestService,
        { provide: SupportRequestRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<SupportRequestService>(SupportRequestService);
    jest.clearAllMocks();
  });

  it('crea la solicitud para el usuario', async () => {
    const dto = { subject: 'Asunto', description: 'Descripción del problema' };
    mockRepo.create.mockResolvedValue({ id: 1, ...dto });

    const result = await service.create(10, dto);

    expect(mockRepo.create).toHaveBeenCalledWith(10, dto);
    expect(result.id).toBe(1);
  });

  it('consulta las solicitudes propias y las de admin', async () => {
    await service.findAll(10);
    expect(mockRepo.findByUser).toHaveBeenCalledWith(10);

    await service.findAllAdmin();
    expect(mockRepo.findAllAdmin).toHaveBeenCalled();
  });

  it('actualiza una solicitud como admin', async () => {
    mockRepo.updateAdmin.mockResolvedValue({
      status: SupportRequestStatusEnum.RESOLVED,
    });

    const result = await service.updateAdmin(1, {
      status: SupportRequestStatusEnum.RESOLVED,
    });

    expect(mockRepo.updateAdmin).toHaveBeenCalledWith(1, {
      status: SupportRequestStatusEnum.RESOLVED,
    });
    expect(result.status).toBe(SupportRequestStatusEnum.RESOLVED);
  });
});
