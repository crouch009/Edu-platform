import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface GeneratedQuestion {
  type: 'mcq' | 'truefalse' | 'short';
  text: string;
  options?: string[];
  correctAnswer: string;
}

@Injectable()
export class AiQuestionGeneratorService {
  constructor(private config: ConfigService) {}

  async generate(curriculumText: string, count: number, difficulty = 'متوسط'): Promise<GeneratedQuestion[]> {
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) {
      throw new BadRequestException(
        'توليد الأسئلة بالذكاء الاصطناعي غير مفعّل على هذا الخادم. أضف ANTHROPIC_API_KEY في إعدادات البيئة، أو أضف الأسئلة يدويًا.',
      );
    }

    const prompt = `انت معلم خبير. اقرأ نص المنهج التالي وولّد ${count} سؤال تعليمي بمستوى صعوبة "${difficulty}" باللغة العربية.
اجعل الأسئلة متنوعة (اختيار من متعدد، صح وخطأ، سؤال قصير).
رد فقط بصيغة JSON صحيحة (array) بدون أي نص إضافي أو علامات markdown، بالشكل التالي بالضبط:
[{"type":"mcq","text":"نص السؤال","options":["أ","ب","ج","د"],"correctAnswer":"أ"},
 {"type":"truefalse","text":"نص العبارة","options":["صح","خطأ"],"correctAnswer":"صح"},
 {"type":"short","text":"نص السؤال","correctAnswer":"الإجابة النموذجية"}]

نص المنهج:
"""${curriculumText.slice(0, 6000)}"""`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new BadRequestException('حدث خطأ أثناء الاتصال بخدمة الذكاء الاصطناعي');
    }

    const data = await response.json();
    const textBlocks = (data.content || [])
      .filter((c: any) => c.type === 'text')
      .map((c: any) => c.text)
      .join('\n');
    const clean = textBlocks.replace(/```json|```/g, '').trim();

    try {
      return JSON.parse(clean);
    } catch {
      throw new BadRequestException('تعذر تحليل الأسئلة المولّدة، حاول مرة أخرى');
    }
  }
}
