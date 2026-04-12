import { Global, Module } from '@nestjs/common';
import { LoggingService } from './services/logging.service';

@Global()
@Module({
  providers: [LoggingService],
  exports: [LoggingService],
})
export class SharedModule {}
