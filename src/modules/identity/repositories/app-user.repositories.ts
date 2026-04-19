import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger, 
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  DeepPartial,
  FindOptionsWhere,
  IsNull,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { AppUser } from '@identity/entities/app-user.entity';
import { CreateUserDto } from '@identity/dto/user/create-user.dto';
import { UpdateUserDto } from '@identity/dto/user/update-user.dto';
import { UserQueryDto } from '@identity/dto/user/user-query.dto';

const PG_UNIQUE_VIOLATION = '23505';

@Injectable()
export class UserRepository {
  // 2. Instanciar el Logger con el contexto de la clase
  private readonly logger = new Logger(UserRepository.name);

  constructor(
    @InjectRepository(AppUser)
    private readonly repo: Repository<AppUser>,
    private readonly dataSource: DataSource,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────

  async create(dto: Omit<CreateUserDto, 'password'> & DeepPartial<AppUser>): Promise<AppUser> {
    try {
      const user = this.repo.create(dto);
      const savedUser = await this.repo.save(user);
      
      this.logger.log(`Usuario creado exitosamente: ${savedUser.username} (ID: ${savedUser.id})`);
      return savedUser;
    } catch (error) {
      this.logger.error(`Error al crear usuario: ${error.message}`, error.stack);
      this.handleDbError(error, 'crear usuario');
    }
  }

  // ─────────────────────────────────────────────────────────────
  // READ
  // ─────────────────────────────────────────────────────────────

  async findAll(query: UserQueryDto): Promise<{ data: AppUser[]; total: number }> {
    const { search, sortBy = 'created_at', order = 'DESC', page = 1, limit = 20 } = query;

    this.logger.debug(`Buscando usuarios: search="${search}" sortBy=${sortBy} order=${order} página=${page} límite=${limit}`);

    const qb = this.repo
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.financial_profile', 'fp')
      .where('u.is_active = true');

    if (search?.trim()) {
      qb.andWhere(
        '(u.username ILIKE :search OR u.email ILIKE :search)',
        { search: `${search.trim()}%` },
      );
    }

    qb.orderBy(`u.${sortBy}`, order)
      .take(limit)
      .skip((page - 1) * limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findById(id: number): Promise<AppUser> {
    const user = await this.repo.findOne({
      where: { id, deleted_at: IsNull() },
      relations: { financial_profile: true },
    });

    if (!user) {
      this.logger.warn(`Intento fallido de buscar usuario inexistente por ID: ${id}`);
      throw new NotFoundException(`Usuario con id ${id} no encontrado.`);
    }
    return user;
  }

  // ... (otros métodos de búsqueda se mantienen igual, puedes añadir logs debug si lo deseas)

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────

  async update(id: number, updateUserDto: UpdateUserDto): Promise<AppUser> {
    const user = await this.findById(id);

    try {
      const updated = this.repo.merge(user, updateUserDto);
      const result = await this.repo.save(updated);
      
      this.logger.log(`Usuario actualizado: ${result.username} (ID: ${id})`);
      return result;
    } catch (error) {
      this.handleDbError(error, `actualizar usuario ID: ${id}`);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────────────────────

  async softDelete(id: number): Promise<void> {
    const user = await this.findById(id);
    await this.repo.softRemove(user);
    this.logger.log(`Soft delete ejecutado para usuario ID: ${id}`);
  }

  async restore(id: number): Promise<AppUser> {
    try {
        const user = await this.repo.findOne({
        where: { id } as FindOptionsWhere<AppUser>,
        withDeleted: true,
        });

        if (!user) throw new NotFoundException(`Usuario con id ${id} no encontrado.`);
        
        if (!user.deleted_at) {
        this.logger.warn(`Intento de restaurar usuario no eliminado ID: ${id}`);
        throw new ConflictException(`El usuario con id ${id} no está eliminado.`);
        }

        await this.repo.restore(id);
        this.logger.log(`Usuario restaurado exitosamente ID: ${id}`);
        return this.findById(id);
    } catch (error) {
        this.handleDbError(error, `restaurar usuario ID: ${id}`);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────

  /**
   * Manejo centralizado de errores con Log detallado.
   */
  private handleDbError(error: unknown, contextAction: string): never {
    if (error instanceof QueryFailedError) {
      const pg = error as any;

      if (pg.code === PG_UNIQUE_VIOLATION) {
        this.logger.warn(`Conflicto de unicidad al ${contextAction}: ${pg.detail}`);
        throw new ConflictException('Ya existe un usuario con ese email o username.');
      }
    }

    // Registro del error completo para el desarrollador en consola/logs de servidor
    this.logger.error(`Error crítico al ${contextAction}:`, error instanceof Error ? error.stack : error);

    throw new InternalServerErrorException('Error inesperado en la base de datos.');
  }
}