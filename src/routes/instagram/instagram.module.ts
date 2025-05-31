import { HttpModule } from '@nestjs/axios';
import { forwardRef, Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { InstagramController } from './controllers/instagram.controller';
import { InstagramService } from './services/instagram.service';
import { ReportModule } from 'src/reports/reports.module';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    HttpModule,
    forwardRef(() => ReportModule),
    forwardRef(() => AuthModule),
    UserModule,
  ],
  providers: [InstagramService, PrismaService],
  controllers: [InstagramController],
  exports: [InstagramService],
})
export class InstagramModule {}
