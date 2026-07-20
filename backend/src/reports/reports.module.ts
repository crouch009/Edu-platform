import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuditModule, AuthModule, JwtModule.register({})],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
