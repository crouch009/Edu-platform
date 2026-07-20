import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule, JwtModule.register({})],
  controllers: [StudentsController],
  providers: [StudentsService],
})
export class StudentsModule {}
