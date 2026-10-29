/**
 * Loads the lessons of each language when it is chosen, the entry linguacode-lessons/load. It's apart from the main
 * entry, since a bundler makes a file of each language this module may load, whether or not a page loads it, so a
 * page or an app that adds the languages its own way, with addLessonTexts(), has none of these files.
 */
import {addLessonTexts, LESSON_LANGUAGES} from './index.ts';
import type {LessonTexts} from './types.ts';

//the lessons of each language but English, each a module of its own; English is the template of the others. A
//bundler finds each module in this map, and makes it a file of its own
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
const loaded = new Set<string>(['en']);

/**
 * Loads the lessons of a language, before they are shown, and adds them with addLessonTexts(); English needs no
 * loading, and a language that isn't one of LESSON_LANGUAGES loads nothing.
 *
 * @example
 * await loadLessonTexts('hy-AM');
 * lessonTextsOf('hy-AM').lessons.hello; // [title, description]
 */
export const loadLessonTexts = async (language: string): Promise<void> => {
  if (loaded.has(language) || !LESSON_LANGUAGES.includes(language)) return;
  addLessonTexts(language, (await LOADERS[language]()).default);
  loaded.add(language);
};
