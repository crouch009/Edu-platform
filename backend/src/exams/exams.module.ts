import { Module } from '@nestjs/common';
import { ExamsService } from './exams.service';
import { ExamsController } from './exams.controller';
import { StudentPortalController } from './student-portal.controller';
import { AiQuestionGeneratorService } from './ai-question-generator.service';
import { HeuristicQuestionGeneratorService } from './heuristic-question-generator.service';
import { TextExtractionService } from './text-extraction.service';
import { QuestionImportService } from './question-import.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [ExamsController, StudentPortalController],
  providers: [
    ExamsService,
    AiQuestionGeneratorService,
    HeuristicQuestionGeneratorService,
    TextExtractionService,
    QuestionImportService,
  ],
})
export class ExamsModule {}
