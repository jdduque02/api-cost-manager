import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ObjectivePayment } from '@finance/entities/objective-payment.entity';
import { CreateObjectivePaymentDto } from '@finance/dto/objective-payment/create-objective-payment.dto';

@Injectable()
export class ObjectivePaymentRepository {
  private readonly logger = new Logger(ObjectivePaymentRepository.name);

  constructor(
    @InjectRepository(ObjectivePayment)
    private readonly repo: Repository<ObjectivePayment>,
  ) {}

  async create(userId: number, dto: CreateObjectivePaymentDto): Promise<ObjectivePayment> {
    const payment = this.repo.create({ ...dto, user_id: userId });
    const saved = await this.repo.save(payment);
    this.logger.log(`Pago al objetivo ${dto.objective_id} registrado para usuario ID: ${userId}`);
    return saved;
  }

  async findByObjective(objectiveId: number, userId: number): Promise<ObjectivePayment[]> {
    return this.repo.find({
      where: { objective_id: objectiveId, user_id: userId },
      order: { payment_date: 'DESC' },
    });
  }

  async findById(id: number, userId: number): Promise<ObjectivePayment> {
    const payment = await this.repo.findOne({ where: { id, user_id: userId } });
    if (!payment) throw new NotFoundException(`Pago con id ${id} no encontrado.`);
    return payment;
  }

  async remove(id: number, userId: number): Promise<void> {
    const payment = await this.findById(id, userId);
    await this.repo.remove(payment);
    this.logger.log(`Pago ID ${id} eliminado para usuario ID: ${userId}`);
  }
}
