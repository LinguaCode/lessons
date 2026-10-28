/**
 * The lessons of LinguaCode, from one command to all of them together: CMIL programs in English, with English names
 * and texts, each with an exercise, and the lessons in each language of CMIL, with the names, texts, commands and
 * quotes of the language. course.json and lessons/ hold them; npm run generate makes them a module.
 */
import {check, segmentsOf, translate} from 'cmil';

import {
  EXERCISES,
  ENGLISH,
  GROUPS,
  LESSON_IDS,
  LESSONS,
  SHORT_TOPICS,
  TOPIC_ICON_NAMES,
  TOPICS
} from './course.generated.ts';
import {partsOf} from './parts.ts';
import type {Exercise, Group, Lesson, LessonId, LessonTexts, Topic} from './types.ts';

export {EXERCISES, GROUPS, LESSON_IDS, LESSONS, SHORT_TOPICS, TOPIC_ICON_NAMES, TOPICS, partsOf};
export {checkProgram, runWith, seeded} from './check.ts';
export type {CheckResult, Run} from './check.ts';
export type {Exercise, Group, Lesson, LessonId, LessonTexts, Topic};

//the group of a topic, if it is in one
export const groupOf = (topic: Topic): Group | undefined =>
  (Object.keys(GROUPS) as Group[]).find(group => (GROUPS[group] as readonly Topic[]).includes(topic));

//what holds lessons in the lessons: a topic, or a group of topics
export type Holder = Topic | Group;

//what holds a lesson of a topic, which opens with it: its group, if it is in one, and the topic
export const holdersOf = (topic: Topic): Holder[] => {
  const group = groupOf(topic);
  return group ? [group, topic] : [topic];
};

//all that holds lessons, which are open at first
export const HOLDERS: Holder[] = [...(Object.keys(GROUPS) as Group[]), ...TOPICS];

//a text of a lesson in quotes, with \\ before a quote or a \\ outside its code in braces, which keeps its own texts
const quote = (text: string) => {
  let depth = 0;
  let quoted = '';
  for (const symbol of text) {
    if (symbol === '{') depth++;
    if (symbol === '}') depth = Math.max(depth - 1, 0);
    quoted += !depth && (symbol === '"' || symbol === '\\') ? `\\${symbol}` : symbol;
  }
  return `"${quoted}"`;
};

/** A part of a line of an English lesson: a text, as written between its quotes, a comment after #, or code. */
type Part = {type: 'text' | 'comment' | 'code'; text: string};

/**
 * The parts of a line of an English lesson, whose texts are in "…": the code in the braces of a text stays in the
 * text, like {name} in "Hi, {name}".
 */
export const partsOfLine = (line: string): Part[] => {
  const parts: Part[] = [];
  let code = '';
  let i = 0;
  while (i < line.length) {
    if (line[i] === '#') {
      parts.push({type: 'code', text: code}, {type: 'comment', text: line.slice(i + 1).trim()});
      return parts.filter(({type, text}) => type !== 'code' || text);
    }
    if (line[i] !== '"') {
      code += line[i++];
      continue;
    }
    //a text: up to its closing quote, past the texts in its braces
    let end = i + 1;
    let depth = 0;
    while (end < line.length && !(line[end] === '"' && !depth)) {
      if (line[end] === '\\') end++;
      else if (line[end] === '{') depth++;
      else if (line[end] === '}') depth--;
      else if (line[end] === '"') end = line.indexOf('"', end + 1) < 0 ? line.length : line.indexOf('"', end + 1);
      end++;
    }
    parts.push({type: 'code', text: code}, {type: 'text', text: line.slice(i + 1, end)});
    code = '';
    i = end + 1;
  }
  parts.push({type: 'code', text: code});
  return parts.filter(({type, text}) => type !== 'code' || text);
};

//a comment that is a line of code, like # print("Goodbye!"), which is translated as code
const isCode = (comment: string) => /\S/.test(comment) && check(comment, 'en') === null && /[("=]/.test(comment);

/**
 * The texts and the comments of an English program, what the lessons of a language translate; a comment that is code
 * has the texts of its code.
 */
export const translatablesOf = (code: string): {texts: string[]; comments: string[]} => {
  const each = (line: string): Part[] =>
    partsOfLine(line).flatMap(part => (part.type === 'comment' && isCode(part.text) ? each(part.text) : [part]));
  const parts = code.split('\n').flatMap(each);
  return {
    texts: parts.flatMap(({type, text}) => (type === 'text' ? [text] : [])),
    comments: parts.flatMap(({type, text}) => (type === 'comment' && text ? [text] : []))
  };
};

//the lessons of each language but English, each a module of its own, loaded when the language is chosen; English
//is the template of the others. A bundler finds each module in this map, and makes it a file of its own
const LOADERS: Record<string, () => Promise<{default: LessonTexts}>> = {
  ar: () => import('./i18n/ar.ts'),
  ca: () => import('./i18n/ca.ts'),
  cs: () => import('./i18n/cs.ts'),
  da: () => import('./i18n/da.ts'),
  de: () => import('./i18n/de.ts'),
  el: () => import('./i18n/el.ts'),
  'es-ES': () => import('./i18n/es-ES.ts'),
  fi: () => import('./i18n/fi.ts'),
  fr: () => import('./i18n/fr.ts'),
  he: () => import('./i18n/he.ts'),
  hu: () => import('./i18n/hu.ts'),
  'hy-AM': () => import('./i18n/hy-AM.ts'),
  it: () => import('./i18n/it.ts'),
  ja: () => import('./i18n/ja.ts'),
  ka: () => import('./i18n/ka.ts'),
  ko: () => import('./i18n/ko.ts'),
  nl: () => import('./i18n/nl.ts'),
  no: () => import('./i18n/no.ts'),
  pl: () => import('./i18n/pl.ts'),
  'pt-PT': () => import('./i18n/pt-PT.ts'),
  ro: () => import('./i18n/ro.ts'),
  ru: () => import('./i18n/ru.ts'),
  sk: () => import('./i18n/sk.ts'),
  sl: () => import('./i18n/sl.ts'),
  sq: () => import('./i18n/sq.ts'),
  sr: () => import('./i18n/sr.ts'),
  'sv-SE': () => import('./i18n/sv-SE.ts'),
  th: () => import('./i18n/th.ts'),
  uk: () => import('./i18n/uk.ts'),
  vi: () => import('./i18n/vi.ts'),
  'zh-CN': () => import('./i18n/zh-CN.ts')
};
const LESSON_TEXTS: Record<string, LessonTexts> = {en: ENGLISH};

/** The languages the lessons are in, which are those of CMIL. */
export const LESSON_LANGUAGES: readonly string[] = Object.freeze(['en', ...Object.keys(LOADERS)]);

/**
 * Loads the lessons of a language, before they are shown; English needs no loading.
 */
export const loadLessonTexts = async (language: string): Promise<void> => {
  const load = Object.hasOwn(LOADERS, language) ? LOADERS[language] : undefined;
  if (load && !Object.hasOwn(LESSON_TEXTS, language)) LESSON_TEXTS[language] = (await load()).default;
};

//the lessons of a language that is loaded, else the English ones
export const lessonTextsOf = (language: string): LessonTexts => LESSON_TEXTS[language] ?? ENGLISH;

/**
 * An English program in another language: its names and texts are replaced with those of the language,
 * then translate() gives it the commands and quotes of the language.
 */
export const localize = (
  code: string,
  language: string,
  {names, texts}: Pick<LessonTexts, 'names' | 'texts'>
): string => {
  const translated = code
    .split('\n')
    .map(line =>
      partsOfLine(line)
        .map(({type, text}) => {
          if (type === 'code') return text;
          //a line of code made a comment stays code, in the language too
          if (type === 'comment' && isCode(text)) return `# ${localize(text, language, {names, texts})}`;
          const translation = Object.hasOwn(texts, text) ? texts[text] : text;
          return type === 'text' ? quote(translation) : `# ${translation}`;
        })
        .join('')
    )
    //the names, also those in the braces of texts
    .map(line =>
      segmentsOf(line, 'en')
        .map(({type, text}) => (type === 'name' && Object.hasOwn(names, text) ? names[text] : text))
        .join('')
    )
    .join('\n');

  return translate(translated, 'en', language);
};

export const lessonCode = (lesson: Lesson, language: string): string =>
  localize(lesson.code, language, lessonTextsOf(language));

//answers in a language: an answer that is one of the texts of the lessons is translated
const answersIn = (answers: readonly string[], language: string): string[] => {
  const {texts} = lessonTextsOf(language);
  return answers.map(answer => (Object.hasOwn(texts, answer) ? texts[answer] : answer));
};

//the answers of a lesson's tests in a language
export const lessonInputs = (lesson: Lesson, language: string): string[] => answersIn(lesson.inputs ?? [], language);

/**
 * The exercise of a lesson in a language: its task, its solution, and the sets of answers its check runs with, one
 * set without answers for a program that asks for none.
 */
export const exerciseOf = (lesson: LessonId, language: string) => {
  const texts = lessonTextsOf(language);
  const {solution, answers = [[]]} = EXERCISES[lesson];
  return {
    task: texts.exercises[lesson],
    solution: localize(solution, language, texts),
    answers: answers.map(set => answersIn(set, language))
  };
};

export const lessonById = (id: string | undefined): Lesson | undefined => LESSONS.find(lesson => lesson.id === id);

/**
 * A program in another language: a lesson's own program comes as the lesson is given in that language, with its names
 * and texts too; another is translated by CMIL, and stays as written where it can't be.
 */
export const programIn = (code: string, lesson: LessonId | null, from: string, to: string): string => {
  const current = lessonById(lesson ?? undefined);
  if (current && code === lessonCode(current, from)) return lessonCode(current, to);
  try {
    return translate(code, from, to);
  } catch {
    return code;
  }
};

export const topicOf = (topic: Topic, language: string): string => lessonTextsOf(language).topics[topic];
