//the lessons of each language as entries of their own, linguacode-lessons/i18n/<language>, which addLessonTexts() adds
import fs from 'node:fs';
import path from 'node:path';

import {describe, expect, it} from 'vitest';

import {LESSON_IDS, LESSON_LANGUAGES, TOPICS, addLessonTexts, lessonTextsOf, type LessonTexts} from '../src/index.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const I18N = path.join(ROOT, 'src', 'i18n');
const OTHERS = LESSON_LANGUAGES.filter(language => language !== 'en');

describe('the lessons of each language', () => {
  it('are an entry for each language but English, its data alone', () => {
    expect(
      fs
        .readdirSync(I18N)
        .map(file => file.replace(/\.ts$/, ''))
        .sort()
    ).toEqual([...OTHERS].sort());
    for (const language of OTHERS) {
      const code = fs.readFileSync(path.join(I18N, `${language}.ts`), 'utf8');
      const imports = code.match(/^import .*$/gm) ?? [];
      expect(
        imports.every(line => line.startsWith('import type ')),
        language
      ).toBe(true);
      expect(code).toMatch(/^export default \{/m);
    }
    const {exports} = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as {
      exports: Record<string, {types: string; default: string}>;
    };
    expect(exports['./i18n/*']).toEqual({types: './dist/i18n/*.d.ts', default: './dist/i18n/*.js'});
  });

  it('are added from their entries, as an app loads them', async () => {
    for (const language of OTHERS) {
      const {default: texts} = (await import(`../src/i18n/${language}.ts`)) as {default: LessonTexts};
      addLessonTexts(language, texts);
      expect(lessonTextsOf(language)).toBe(texts);
    }
  });

  it('are refused for English, for a language the lessons are not in, and without a text of the course', async () => {
    const {default: texts} = (await import('../src/i18n/hy-AM.ts')) as {default: LessonTexts};
    expect(() => addLessonTexts('en', texts)).toThrow('The lessons have their English texts already');
    expect(() => addLessonTexts('tlh', texts)).toThrow('Unknown language of the lessons: tlh');

    //the texts without the first lesson and the first topic
    const [lesson] = LESSON_IDS;
    const without = <T extends object>(record: T, key: string) =>
      Object.fromEntries(Object.entries(record).filter(([id]) => id !== key));
    const lacking = {
      ...texts,
      lessons: without(texts.lessons, lesson),
      topics: without(texts.topics, TOPICS[0])
    } as LessonTexts;
    expect(() => addLessonTexts('hy-AM', lacking)).toThrow(
      `The lessons of hy-AM have no text of the topic ${TOPICS[0]}, the lesson ${lesson}`
    );
    expect(() => addLessonTexts('hy-AM', {...texts, names: {x: 1}} as unknown as LessonTexts)).toThrow(
      'names of texts'
    );
  });
});
