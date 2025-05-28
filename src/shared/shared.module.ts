import { Module, Global } from '@nestjs/common';
import { TokenValidationService } from '../routes/auth/services/token-validation.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    TokenValidationService,
  ],
  exports: [
    TokenValidationService,
  ],
})
export class SharedModule {} 