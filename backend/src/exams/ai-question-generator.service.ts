import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface GeneratedQuestion {
  type: 'mcq' | 'truefalse' | 'short';
  text: string;
  options?: string[];
  correctAnswer: string;
}

const PROMPT_TEMPLATE = (curriculumText: string, count: number, difficulty: string) => `انت معلم خبير. اقرأ نص المنهج التالي وولّد ${count} سؤال تعليمي بمستوى صعوبة "${difficulty}" باللغة العربية.
اجعل الأسئلة متنوعة (اختيار من متعدد، صح وخطأ، سؤال قصير).
رد فقط بصيغة JSON صحيحة (array) بدون أي نص إضافي أو علامات markdown، بالشكل التالي بالضبط:
[{"type":"mcq","text":"نص السؤال","options":["أ","ب","ج","د"],"correctAnswer":"أ"},
 {"type":"truefalse","text":"نص العبارة","options":["صح","خطأ"],"correctAnswer":"صح"},
 {"type":"short","text":"نص السؤال","correctAnswer":"الإجابة النموذجية"}]

نص المنهج:
"""${curriculumText.slice(0, 6000)}"""`;

function extractJsonArray(raw: string): GeneratedQuestion[] {
  const clean = raw.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(clean);
  } catch {
    const match = clean.match(/\[[\s\S]*\]/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { /* fall through */ }
    }
    throw new BadRequestException('تعذر تحليل الأسئلة المولّدة، حاول مرة أخرى');
  }
}

@Injectable()
export class AiQuestionGeneratorService {
  constructor(private config: ConfigService) {}

  async generate(curriculumText: string, count: number, difficulty = 'متوسط'): Promise<GeneratedQuestion[]> {
    const anthropicKey = this.config.get<string>('ANTHROPIC_API_KEY');
    const geminiKey = this.config.get<string>('GEMINI_API_KEY');

    if (anthropicKey) {
      return this.generateWithAnthropic(curriculumText, count, difficulty, anthropicKey);
    }
    if (geminiKey) {
      return this.generateWithGemini(curriculumText, count, difficulty, geminiKey);
    }

    throw new BadRequestException(
      'توليد الأسئلة بالذكاء الاصطناعي غير مفعّل على هذا الخادم. أضف GEMINI_API_KEY (مجاني، من aistudio.google.com) ' +
      'أو ANTHROPIC_API_KEY في إعدادات البيئة، أو استخدم خيار "توليد تلقائي بسيط" بدلًا منه.',
    );
  }

  private async generateWithAnthropic(text: string, count: number, difficulty: string, apiKey: string) {
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
        messages: [{ role: 'user', content: PROMPT_TEMPLATE(text, count, difficulty) }],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new BadRequestException(`حدث خطأ من خدمة Anthropic (${response.status}): ${body.slice(0, 200)}`);
    }

    const data = await response.json();
    const textBlocks = (data.content || [])
      .filter((c: any) => c.type === 'text')
      .map((c: any) => c.text)
      .join('\n');
    return extractJsonArray(textBlocks);
  }

  /** Google Gemini - free tier, no credit card required. Get a key at aistudio.google.com */
  private async generateWithGemini(text: string, count: number, difficulty: string, apiKey: string) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: PROMPT_TEMPLATE(text, count, difficulty) }] }],
        generationConfig: { temperature: 0.7 },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new BadRequestException(`حدث خطأ من خدمة Gemini (${response.status}): ${body.slice(0, 200)}`);
    }

    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('\n') || '';
    return extractJsonArray(raw);
  }
}
