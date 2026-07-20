import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule, JwtModule.register({})],
  controllers: [FilesController],
  providers: [FilesService],
})
export class FilesModule {}
