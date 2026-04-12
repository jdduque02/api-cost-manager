import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { IdentityService } from '@identity/service/identity.service';
import { CreateIdentityDto } from '@identity/dto/create-identity.dto';
import { UpdateIdentityDto } from '@identity/dto/update-identity.dto';

@Controller()
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  @MessagePattern('identity:create')
  create(@Payload() createIdentityDto: CreateIdentityDto) {
    return this.identityService.create(createIdentityDto);
  }

  @MessagePattern('identity:findAll')
  findAll() {
    return this.identityService.findAll();
  }

  @MessagePattern('identity:findOne')
  findOne(@Payload() id: number) {
    return this.identityService.findOne(id);
  }

  @MessagePattern('identity:update')
  update(@Payload() updateIdentityDto: UpdateIdentityDto) {
    return this.identityService.update(updateIdentityDto.id, updateIdentityDto);
  }

  @MessagePattern('identity:remove')
  remove(@Payload() id: number) {
    return this.identityService.remove(id);
  }
}
