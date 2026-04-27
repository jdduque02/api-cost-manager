import { Global, Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { redisConfig } from '@config/redis.config';
import { LoggingService } from './services/logging.service';

@Global()
@Module({
  imports: [CacheModule.registerAsync(redisConfig)],
  providers: [LoggingService],
  exports: [CacheModule, LoggingService],
})
export class SharedModule {}
