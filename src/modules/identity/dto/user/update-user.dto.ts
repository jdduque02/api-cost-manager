import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from '@identity/dto/user/create-user.dto';

/**
 * DTO para la actualización parcial de un usuario.
 * Todos los campos de CreateUserDto se vuelven opcionales.
 */
export class UpdateUserDto extends PartialType(CreateUserDto) {}
