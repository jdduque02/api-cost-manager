import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UserController } from '@identity/controller/user.controller';
import { UserService } from '@identity/service/user.service';
import { CreateUserDto } from '@identity/dto/user/create-user.dto';
import { UpdateUserDto } from '@identity/dto/user/update-user.dto';

const mockUserService = {
  createUser: jest.fn(),
  findAllUsers: jest.fn(),
  findUser: jest.fn(),
  updateUser: jest.fn(),
};

describe('UserController', () => {
  let controller: UserController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: mockUserService }],
    }).compile();

    controller = module.get<UserController>(UserController);
    jest.clearAllMocks();
  });

  it('debe crear usuario delegando al servicio', async () => {
    const dto: CreateUserDto = {
      username: 'juan',
      email: 'juan@test.com',
      password: 'Pass123!@#',
    };
    const created = { id: 1, username: 'juan', email: 'juan@test.com' };
    mockUserService.createUser.mockResolvedValue(created);

    const result = await controller.createUser(dto);
    expect(mockUserService.createUser).toHaveBeenCalledWith(dto);
    expect(result).toEqual(created);
  });

  it('debe listar usuarios paginados y limitar a 100', async () => {
    const payload = { data: [], total: 0 };
    mockUserService.findAllUsers.mockResolvedValue(payload);

    const result = await controller.findAll(1, 200);
    expect(mockUserService.findAllUsers).toHaveBeenCalledWith({ page: 1, limit: 100 });
    expect(result).toEqual(payload);
  });

  it('debe listar usuarios respetando límite menor a 100', async () => {
    const payload = { data: [{ id: 1 }], total: 1 };
    mockUserService.findAllUsers.mockResolvedValue(payload);

    const result = await controller.findAll(2, 20);
    expect(mockUserService.findAllUsers).toHaveBeenCalledWith({ page: 2, limit: 20 });
    expect(result).toEqual(payload);
  });

  it('debe obtener usuario por id', async () => {
    const user = { id: 3, username: 'ana' };
    mockUserService.findUser.mockResolvedValue(user);

    const result = await controller.getUser(3);
    expect(mockUserService.findUser).toHaveBeenCalledWith(3);
    expect(result).toEqual(user);
  });

  it('debe actualizar usuario por id', async () => {
    const dto: UpdateUserDto = { timezone: 'America/Bogota' };
    const updated = { id: 3, timezone: 'America/Bogota' };
    mockUserService.updateUser.mockResolvedValue(updated);

    const result = await controller.updateUser(3, dto);
    expect(mockUserService.updateUser).toHaveBeenCalledWith(3, dto);
    expect(result).toEqual(updated);
  });

  it('debe propagar NotFoundException del servicio', async () => {
    mockUserService.findUser.mockRejectedValue(new NotFoundException());
    await expect(controller.getUser(999)).rejects.toThrow(NotFoundException);
  });

  it('debe retornar estado público del módulo', () => {
    const result = controller.getPublicStatus();
    expect(result).toEqual({
      status: 'Identity Module is Running',
      authentication: 'Bypassed',
    });
  });
});
