import { Global, Module } from '@nestjs/common';
import { TokenValidationService } from '../routes/auth/services/token-validation.service';
import { TokenSchedulerService } from './services/token-scheduler.service';
import { PrismaService } from '../prisma/prisma.service';

@Global()
@Module({
  providers: [
    TokenValidationService,
    TokenSchedulerService,
    PrismaService,
  ],
  exports: [
    TokenValidationService,
    TokenSchedulerService,
  ],
})
export class SharedModule {} 