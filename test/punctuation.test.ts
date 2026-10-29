//checks that the lessons of every language use its own punctuation, like ՛ and ։ in Armenian
import {languages, quotesOf} from 'cmil';
import {describe, expect, it} from 'vitest';

import {LESSON_LANGUAGES, lessonTextsOf} from '../src/index.ts';
import {loadLessonTexts} from '../src/load.ts';

await Promise.all(LESSON_LANGUAGES.map(loadLessonTexts));

//what a language writes in words, as [where, text]: the topics, groups of topics, titles, descriptions, tasks and
//texts of the lessons; names are words without punctuation
const textsOf = (language: string): [string, string][] => {
  const {topics, groups, lessons, exercises, texts} = lessonTextsOf(language);
  return [
    ...Object.entries(topics).map(([key, text]): [string, string] => [`topics.${key}`, text]),
    ...Object.entries(groups).map(([key, text]): [string, string] => [`groups.${key}`, text]),
    ...Object.entries(lessons).flatMap(([key, [title, description]]): [string, string][] => [
      [`lessons.${key}`, title],
      [`lessons.${key}`, description]
    ]),
    ...Object.entries(exercises).map(([key, text]): [string, string] => [`exercises.${key}`, text]),
    ...Object.entries(texts).map(([key, text]): [string, string] => [`texts.${key}`, text])
  ];
};

//the words of a text, without the program texts it quotes, like «, » in a task, and the {commands} it names
const proseOf = (text: string, language: string) =>
  quotesOf(language)
    .reduce(
      (prose, [open, close]) =>
        prose
          .split(open)
          .map((part, index) => (index ? part.split(close).slice(1).join(close) : part))
          .join('Q'),
      text
    )
    .replace(/\{[^{}]*\}/g, 'X');

//the marks a language doesn't use, with those it uses instead
const FORBIDDEN: Record<string, [RegExp, string][]> = {
  //Armenian: ՛ for an exclamation or an emphasis, ՞ for a question, ։ at the end of a sentence, ՝ or ․ for a colon
  'hy-AM': [
    [/[!?;:]/, '՛ ՞ ։ ՝'],
    [/՜/, '՛'],
    [/\.(\s|$)/, '։']
  ],
  //Greek ends a question with ;
  el: [[/\?/, ';']],
  //Arabic has its own question mark, comma and semicolon
  ar: [[/[?,;]/, '؟ ، ؛']],
  //Chinese and Japanese write their marks full-width
  'zh-CN': [
    [/[!?,:;]/, '！？，：；'],
    [/\.(\s|$)/, '。']
  ],
  ja: [
    [/[!?,:;]/, '！？，：；'],
    [/\.(\s|$)/, '。']
  ]
};

describe('punctuation', () => {
  it.each(languages)('%s uses its own marks', language => {
    const wrong: string[] = [];
    for (const [where, text] of textsOf(language)) {
      const prose = proseOf(text, language);
      const problems = (FORBIDDEN[language] ?? []).filter(([mark]) => mark.test(prose)).map(([, instead]) => instead);
      //no double spaces, and no space before a comma or a full stop
      if (/ {2}| [,.]/.test(prose.trim())) problems.push('spaces');
      //Spanish opens what it ends: ¡…! and ¿…?
      if (
        language === 'es-ES' &&
        (prose.split('!').length !== prose.split('¡').length || prose.split('?').length !== prose.split('¿').length)
      ) {
        problems.push('¡ ¿');
      }
      //French puts a space before ! ? : and ;
      if (language === 'fr' && /[^\s\u00a0\u202f][!?:;]/.test(prose)) problems.push('a space before ! ? : ;');
      if (problems.length) wrong.push(`${where}: ${text} (${problems.join(', ')})`);
    }
    expect(wrong).toEqual([]);
  });
});
