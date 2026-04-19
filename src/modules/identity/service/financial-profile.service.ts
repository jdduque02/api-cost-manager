import { Injectable } from '@nestjs/common';
import { FinancialProfileRepository } from '@identity/repositories/financial-profile.repositorie';
import { CreateFinancialProfileDto } from '@identity/dto/financial-profile/create-financial-profile.dto';
import { UpdateFinancialProfileDto } from '@identity/dto/financial-profile/update-financial-profile.dto';

@Injectable()
export class FinancialProfileService {
  constructor(private readonly financialProfileRepository: FinancialProfileRepository) {}

  create(userId: number, createFinancialProfileDto: Omit<CreateFinancialProfileDto, 'user_id'>) {
    return this.financialProfileRepository.create(userId, createFinancialProfileDto);
  }

  findByUserId(userId: number) {
    return this.financialProfileRepository.findByUserId(userId);
  }

  update(userId: number, updateFinancialProfileDto: UpdateFinancialProfileDto) {
    return this.financialProfileRepository.update(userId, updateFinancialProfileDto);
  }

  remove(userId: number) {
    return this.financialProfileRepository.remove(userId);
  }
}
