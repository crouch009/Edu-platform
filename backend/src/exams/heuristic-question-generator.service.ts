import { Injectable } from '@nestjs/common';

interface GeneratedQuestion {
  type: 'mcq';
  text: string;
  options: string[];
  correctAnswer: string;
}

@Injectable()
export class HeuristicQuestionGeneratorService {
  generate(text: string, count: number): GeneratedQuestion[] {
    const sentences = text
      .replace(/\n+/g, ' ')
      .split(/(?<=[.!؟?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 25 && s.split(' ').length >= 6);

    const picked: GeneratedQuestion[] = [];
    const used = new Set<string>();
    let i = 0;

    while (picked.length < count && i < sentences.length) {
      const s = sentences[i];
      i++;
      if (used.has(s)) continue;
      used.add(s);

      const words = s.split(' ').filter(w => w.length > 3);
      if (words.length < 4) continue;

      const targetWord = words[Math.floor(words.length / 2)];
      const blanked = s.replace(targetWord, '______');
      const distractors = words.filter(w => w !== targetWord).sort(() => 0.5 - Math.random()).slice(0, 3);
      const options = [...distractors, targetWord].sort(() => 0.5 - Math.random());

      picked.push({
        type: 'mcq',
        text: 'اختر الكلمة الصحيحة لإكمال الجملة: ' + blanked,
        options,
        correctAnswer: targetWord,
      });
    }

    return picked;
  }
}
