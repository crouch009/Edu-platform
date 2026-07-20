import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { GradesService } from './grades.service';
import { GradesController } from './grades.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule, JwtModule.register({})],
  controllers: [GradesController],
  providers: [GradesService],
})
export class GradesModule {}
