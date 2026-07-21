import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ExamsService } from './exams.service';
import { ExamsController } from './exams.controller';
import { StudentPortalController } from './student-portal.controller';
import { AiQuestionGeneratorService } from './ai-question-generator.service';
import { HeuristicQuestionGeneratorService } from './heuristic-question-generator.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule, JwtModule.register({})],
  controllers: [ExamsController, StudentPortalController],
  providers: [ExamsService, AiQuestionGeneratorService, HeuristicQuestionGeneratorService],
})
export class ExamsModule {}
