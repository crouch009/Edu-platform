import { Injectable, BadRequestException } from '@nestjs/common';

export interface ImportedQuestion {
  type: 'mcq' | 'truefalse' | 'short';
  text: string;
  options?: string[];
  correctAnswer: string;
}

/**
 * Expected file format (plain text, blocks separated by a line of dashes):
 *
 * نوع: mcq
 * سؤال: ما هي عاصمة مصر؟
 * خيارات: القاهرة | الإسكندرية | الأقصر | أسوان
 * الإجابة: القاهرة
 * -----
 * نوع: truefalse
 * سؤال: الأرض كروية الشكل
 * الإجابة: صح
 * -----
 * نوع: short
 * سؤال: عرّف عملية التمثيل الضوئي
 * الإجابة: عملية تحويل الطاقة الضوئية إلى طاقة كيميائية في النباتات
 * -----
 */
@Injectable()
export class QuestionImportService {
  parse(rawText: string): ImportedQuestion[] {
    const blocks = rawText
      .split(/^-{3,}\s*$/m)
      .map(b => b.trim())
      .filter(Boolean);

    if (blocks.length === 0) {
      throw new BadRequestException('لم يتم العثور على أسئلة في الملف. راجع صيغة الملف المطلوبة.');
    }

    const questions: ImportedQuestion[] = [];

    for (const block of blocks) {
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
      const get = (prefix: string) => {
        const line = lines.find(l => l.startsWith(prefix));
        return line ? line.slice(prefix.length).trim() : undefined;
      };

      const typeRaw = get('نوع:');
      const text = get('سؤال:');
      const optionsRaw = get('خيارات:');
      const correctAnswer = get('الإجابة:');

      if (!typeRaw || !text || !correctAnswer) continue; // skip malformed blocks silently

      const type = typeRaw.trim() as 'mcq' | 'truefalse' | 'short';
      if (!['mcq', 'truefalse', 'short'].includes(type)) continue;

      const options = optionsRaw ? optionsRaw.split('|').map(o => o.trim()).filter(Boolean) : undefined;

      questions.push({ type, text, options, correctAnswer });
    }

    if (questions.length === 0) {
      throw new BadRequestException('لم يتم التعرف على أي سؤال صالح في الملف. تأكد من اتباع الصيغة المطلوبة بالضبط.');
    }

    return questions;
  }
}
