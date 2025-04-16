import { Module } from '@nestjs/common';
import { UserService } from './services/user.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  StreamerController,
  AdminController,
  ManagerController,
} from './controllers';
import { RequestService } from '../request/services/request.service';
import { StreamerService } from './services/streamer.service';
import { ReportModule } from 'src/reports/reports.module';

@Module({
  controllers: [StreamerController, AdminController, ManagerController],
  imports: [ReportModule],
  providers: [
    UserService,
    PrismaService,
    RequestService,
    StreamerService,
  ],
  exports: [UserService, StreamerService],
})
export class UserModule {}
