import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Category } from '@catalog/entities/category.entity';
import { CreateCategoryDto } from '@catalog/dto/category/create-category.dto';
import { UpdateCategoryDto } from '@catalog/dto/category/update-category.dto';

const PG_UNIQUE_VIOLATION = '23505';

@Injectable()
export class CategoryRepository {
  private readonly logger = new Logger(CategoryRepository.name);

  constructor(
    @InjectRepository(Category)
    private readonly repo: Repository<Category>,
  ) {}

  async create(dto: CreateCategoryDto): Promise<Category> {
    try {
      const category = this.repo.create(dto);
      const saved = await this.repo.save(category);
      this.logger.log(`Categoría creada: ${saved.name} (ID: ${saved.id})`);
      return saved;
    } catch (error) {
      this.handleDbError(error);
    }
  }

  async findAll(): Promise<Category[]> {
    return this.repo.find({ where: { is_active: true }, order: { sort_order: 'ASC', name: 'ASC' }, relations: { subcategories: false } });
  }

  async findById(id: number): Promise<Category> {
    const category = await this.repo.findOne({ where: { id, is_active: true } });
    if (!category) throw new NotFoundException(`Categoría con id ${id} no encontrada.`);
    return category;
  }

  async update(id: number, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.findById(id);
    const updated = this.repo.merge(category, dto);
    const saved = await this.repo.save(updated);
    this.logger.log(`Categoría ID ${id} actualizada.`);
    return saved;
  }

  private handleDbError(error: unknown): never {
    if (error instanceof QueryFailedError && (error as any).code === PG_UNIQUE_VIOLATION) {
      throw new ConflictException('Ya existe una categoría con ese nombre.');
    }
    this.logger.error(`Error de base de datos: ${(error as Error).message}`);
    throw new InternalServerErrorException('Error al procesar la solicitud.');
  }
}
