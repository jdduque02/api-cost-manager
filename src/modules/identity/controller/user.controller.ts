import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { Unprotected, Roles, AuthenticatedUser } from 'nest-keycloak-connect';
import { UserService } from '../service/user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // Esta ruta está protegida por defecto debido al AuthGuard global
  // Se requiere un token válido (Bearer) en los Headers
  @Get(':id')
  @Roles({ roles: ['user', 'admin'] }) // Opcional: Requiere rol específico de Keycloak
  async getUser(@Param('id', ParseIntPipe) id: number, @AuthenticatedUser() user: any) {
    console.log('Keycloak Token Info:', user);
    return this.userService.findUser(id);
  }

  // Esta ruta es pública, ignora el escrutinio de Keycloak
  @Get('public/status')
  @Unprotected()
  getPublicStatus() {
    return { status: 'Identity Module is Running', authentication: 'Bypassed' };
  }
}
