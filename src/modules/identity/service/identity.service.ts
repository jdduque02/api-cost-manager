import { Injectable } from '@nestjs/common';
import { CreateIdentityDto } from '../dto/create-identity.dto';
import { UpdateIdentityDto } from '../dto/update-identity.dto';

@Injectable()
export class IdentityService {
  create(createIdentityDto: CreateIdentityDto) {
    return 'This action adds a new identity';
  }

  findAll() {
    return `This action returns all identity`;
  }

  findOne(id: number) {
    return `This action returns a #${id} identity`;
  }

  update(id: number, updateIdentityDto: UpdateIdentityDto) {
    return `This action updates a #${id} identity`;
  }

  remove(id: number) {
    return `This action removes a #${id} identity`;
  }
}
