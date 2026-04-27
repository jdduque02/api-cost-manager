import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialProfile } from '@identity/entities/financial-profile.entity';
import { CreateFinancialProfileDto } from '@identity/dto/financial-profile/create-financial-profile.dto';
import { UpdateFinancialProfileDto } from '@identity/dto/financial-profile/update-financial-profile.dto';

@Injectable()
export class FinancialProfileRepository {
  private readonly logger = new Logger(FinancialProfileRepository.name);

  constructor(
    @InjectRepository(FinancialProfile)
    private readonly repo: Repository<FinancialProfile>,
  ) {}

  async create(userId: string, dto: Omit<CreateFinancialProfileDto, 'user_id'>): Promise<FinancialProfile> {
    const existing = await this.repo.findOne({ where: { user_id: userId } });
    if (existing) {
      throw new ConflictException(`El usuario ${userId} ya tiene un perfil financiero.`);
    }

    const profile = this.repo.create({ ...dto, user_id: userId });
    const saved = await this.repo.save(profile);
    this.logger.log(`Perfil financiero creado para usuario ID: ${userId}`);
    return saved;
  }

  async findByUserId(userId: string): Promise<FinancialProfile> {
    const profile = await this.repo.findOne({ where: { user_id: userId } });
    if (!profile) {
      throw new NotFoundException(`El usuario ${userId} no tiene perfil financiero.`);
    }
    return profile;
  }

  async update(userId: string, dto: UpdateFinancialProfileDto): Promise<FinancialProfile> {
    const profile = await this.findByUserId(userId);
    const updated = this.repo.merge(profile, dto);
    const result = await this.repo.save(updated);
    this.logger.log(`Perfil financiero actualizado para usuario ID: ${userId}`);
    return result;
  }

  async remove(userId: string): Promise<void> {
    const profile = await this.findByUserId(userId);
    await this.repo.remove(profile);
    this.logger.log(`Perfil financiero eliminado para usuario ID: ${userId}`);
  }
}
