//checks every lesson in every language: its texts, its names and quotes, and that it runs to its end
import {Session, check, commandsOf, languages, quotesOf, segmentsOf} from 'cmil';
import {describe, expect, it} from 'vitest';

import {
  EXERCISES,
  GROUPS,
  LESSON_LANGUAGES,
  LESSONS,
  TOPICS,
  checkProgram,
  exerciseOf,
  lessonCode,
  lessonInputs,
  lessonTextsOf,
  loadLessonTexts,
  partsOf,
  runWith,
  seeded,
  translatablesOf
} from '../src/index.ts';

//languages that aren't written in Latin letters, whose names have none
const NOT_LATIN = ['ar', 'el', 'he', 'hy-AM', 'ja', 'ka', 'ko', 'ru', 'sr', 'th', 'uk', 'zh-CN'];
const NAME = /^[\p{L}\p{M}_][\p{L}\p{M}\p{N}_]*$/u;

await Promise.all(LESSON_LANGUAGES.map(loadLessonTexts));
const LESSON_TEXTS = Object.fromEntries(LESSON_LANGUAGES.map(language => [language, lessonTextsOf(language)]));

const placeholdersOf = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();

//the names and texts of the English lessons and of the solutions of their exercises
const PROGRAMS = [...LESSONS.map(({code}) => code), ...Object.values(EXERCISES).map(({solution}) => solution)];
//the names, also those in the braces of texts, and the texts and comments, as written, with the code in their braces
const NAMES = new Set(
  PROGRAMS.flatMap(code =>
    code.split('\n').flatMap(line =>
      segmentsOf(line, 'en')
        .filter(({type}) => type === 'name')
        .map(({text}) => text)
    )
  )
);
const ALL_TEXTS = new Set(
  PROGRAMS.flatMap(code => {
    const {texts, comments} = translatablesOf(code);
    return [...texts, ...comments];
  })
);
//a text with letters only in the code of its braces has nothing to translate, though a language may give one its
//own marks, like 、 for ", "
const TEXTS = new Set([...ALL_TEXTS].filter(text => /\p{L}/u.test(text.replace(/\{[^{}]*\}/g, ''))));

//the code in the braces of a text, like age + 1 in "Next year {age + 1}"
const codeOf = (text: string) => [...text.matchAll(/\{([^{}]*)\}/g)].map(([, code]) => code).sort();

//every word of the commands of a language, and each word of the commands of two words
const commandWords = (language: string) =>
  new Set(
    commandsOf(language).flatMap(({words}) =>
      words.flatMap(word => [word.toLowerCase(), ...word.toLowerCase().split(/\s+/)])
    )
  );

//runs a program with its answers to its end, and returns its output and whether it printed something before every
//input, to say what to type
const run = (code: string, language: string, inputs: string[]) => {
  const session = new Session(code, language);
  let step = session.run();
  const output = [...step.output];
  let told = true;
  for (let answer = 0; step.state === 'input'; answer++) {
    if (!step.output.length) told = false;
    if (answer >= inputs.length) throw new Error(`no answer for the input after: ${output.join(' | ')}`);
    step = session.input(inputs[answer]);
    output.push(...step.output);
  }
  return {output, told, error: step.error};
};

describe('lessons', () => {
  it('every lesson has a unique id and a topic, and every topic has lessons', () => {
    expect(new Set(LESSONS.map(({id}) => id)).size).toBe(LESSONS.length);
    TOPICS.forEach(topic =>
      expect(
        LESSONS.some(lesson => lesson.topic === topic),
        topic
      ).toBe(true)
    );
  });

  it('every language of CMIL has its lessons', () => {
    expect(Object.keys(LESSON_TEXTS).sort()).toEqual([...languages].sort());
  });

  it('shows the commands of titles and descriptions in the words of the language', () => {
    expect(partsOf('{print} shows a text.', 'hy-AM')).toEqual([
      {text: 'արտածել', command: 'print'},
      {text: ' shows a text.'}
    ]);
    expect(partsOf('{nothing}', 'en')).toEqual([{text: '{nothing}'}]);
  });
});

describe.each(Object.keys(LESSON_TEXTS))('lessons in %s', language => {
  const lessonTexts = LESSON_TEXTS[language];
  const english = LESSON_TEXTS.en;
  const words = new Set([...commandWords(language), ...commandWords('en')]);
  const [[open, close]] = quotesOf(language);
  const QUOTE_CHARACTERS = new Set(quotesOf(language).flat());

  it('has every topic, title and description, with the commands of the English ones', () => {
    expect(Object.keys(lessonTexts.topics).sort()).toEqual([...TOPICS].sort());
    expect(Object.keys(lessonTexts.groups).sort()).toEqual(Object.keys(GROUPS).sort());
    Object.values(lessonTexts.groups).forEach(name => expect(name.trim()).not.toBe(''));
    expect(Object.keys(lessonTexts.lessons).sort()).toEqual(LESSONS.map(({id}) => id).sort());

    TOPICS.forEach(topic => {
      expect(lessonTexts.topics[topic].trim(), topic).not.toBe('');
      expect(placeholdersOf(lessonTexts.topics[topic]), topic).toEqual(placeholdersOf(english.topics[topic]));
    });
    LESSONS.forEach(({id}) => {
      lessonTexts.lessons[id].forEach((text, index) => {
        expect(text.trim(), id).not.toBe('');
        expect(placeholdersOf(text), id).toEqual(placeholdersOf(english.lessons[id][index]));
      });
    });
  });

  it('has the task of every exercise, with the commands of the English one', () => {
    expect(Object.keys(lessonTexts.exercises).sort()).toEqual(LESSONS.map(({id}) => id).sort());
    LESSONS.forEach(({id}) => {
      expect(lessonTexts.exercises[id].trim(), id).not.toBe('');
      expect(placeholdersOf(lessonTexts.exercises[id]), id).toEqual(placeholdersOf(english.exercises[id]));
    });
  });

  it.skipIf(language === 'en')('has a name for every name and a text for every text of the lessons', () => {
    expect([...NAMES].filter(name => !Object.hasOwn(lessonTexts.names, name))).toEqual([]);
    expect([...TEXTS].filter(text => !Object.hasOwn(lessonTexts.texts, text))).toEqual([]);
    expect(Object.keys(lessonTexts.names).filter(name => !NAMES.has(name))).toEqual([]);
    expect(Object.keys(lessonTexts.texts).filter(text => !ALL_TEXTS.has(text))).toEqual([]);
    //a text keeps the English code in its braces, whose names the lessons of the language give their words
    for (const [english, text] of Object.entries(lessonTexts.texts))
      expect(codeOf(text), text).toEqual(codeOf(english));
  });

  it('has names that are words, and not commands', () => {
    Object.values(lessonTexts.names).forEach(name => {
      expect(name, name).toMatch(NAME);
      expect(words.has(name.toLowerCase()), `${name} is a command`).toBe(false);
      if (NOT_LATIN.includes(language)) expect(name, name).not.toMatch(/[A-Za-z]/);
    });
  });

  it.each(LESSONS.map(lesson => [lesson.id, lesson] as const))('runs %s to its end', (_, lesson) => {
    const code = lessonCode(lesson, language);
    expect(check(code, language), code).toBeNull();

    const segments = code.split('\n').flatMap(line => segmentsOf(line, language));
    const names = [...new Set(segments.filter(({type}) => type === 'name').map(({text}) => text.toLowerCase()))];
    const englishNames = new Set(
      lesson.code.split('\n').flatMap(line =>
        segmentsOf(line, 'en')
          .filter(({type}) => type === 'name')
          .map(({text}) => text.toLowerCase())
      )
    );
    //each name of the lesson has its own word
    expect(names.length, code).toBe(englishNames.size);
    if (NOT_LATIN.includes(language)) expect(names.join(' '), code).not.toMatch(/[A-Za-z]/);

    //a text, or a part of a text with code in braces, starts and ends with the quotes of the language
    segments
      .filter(({type, text}) => type === 'string' && /\p{L}/u.test(text))
      .forEach(({text}) => {
        if (QUOTE_CHARACTERS.has(text[0])) expect(text[0], text).toBe(open);
        if (QUOTE_CHARACTERS.has(text.at(-1)!)) expect(text.at(-1), text).toBe(close);
        if (NOT_LATIN.includes(language)) expect(text, text).not.toMatch(/[A-Za-z]{2}/);
      });

    const {output, told, error} = run(code, language, lessonInputs(lesson, language));
    expect(error, `${code}\n\n${output.join('\n')}`).toBeUndefined();
    expect(told, code).toBe(true);
  });

  it.each(LESSONS.map(lesson => [lesson.id, lesson] as const))('checks the exercise of %s', (id, lesson) => {
    const {solution, answers} = exerciseOf(id, language);
    expect(check(solution, language), solution).toBeNull();
    //every set of answers runs the solution to its end, the same way each time
    answers.forEach((set, index) => {
      const first = runWith(solution, language, set, seeded(index + 1));
      expect(first.error, `${solution}\n\n${first.output.join('\n')}`).toBeUndefined();
      expect(first.needsAnswers, solution).toBeUndefined();
      expect(runWith(solution, language, set, seeded(index + 1))).toEqual(first);
    });
    expect(checkProgram(solution, solution, language, answers)).toEqual({passed: true});
    //the program of the lesson, as it is, isn't a solution: the task asks for a change
    expect(checkProgram(lessonCode(lesson, language), solution, language, answers).passed, solution).toBe(false);
    //its texts are in the quotes of the language
    solution
      .split('\n')
      .flatMap(line => segmentsOf(line, language))
      .filter(({type, text}) => type === 'string' && /\p{L}/u.test(text))
      .forEach(({text}) => {
        if (QUOTE_CHARACTERS.has(text[0])) expect(text[0], text).toBe(open);
        if (QUOTE_CHARACTERS.has(text.at(-1)!)) expect(text.at(-1), text).toBe(close);
      });
  });
});

describe('checks', () => {
  const program = 'print("Your name?")\nname = input()\nprint("Hi " + name)';

  it('pass a program that prints what the solution prints, with every set of answers', () => {
    expect(checkProgram(program, program, 'en', [['Ani'], ['Sam']])).toEqual({passed: true});
  });

  it('give the first line that is different, missing or too much, with the answers and the output', () => {
    expect(
      checkProgram('print("Your name?")\nname = input()\nprint("Hello " + name)', program, 'en', [['Ani']])
    ).toEqual({
      passed: false,
      answers: ['Ani'],
      output: ['Your name?', 'Hello Ani'],
      line: 2,
      expected: 'Hi Ani',
      actual: 'Hello Ani'
    });
    expect(checkProgram('print("Your name?")\nname = input()', program, 'en', [['Ani']])).toMatchObject({
      line: 2,
      expected: 'Hi Ani',
      actual: undefined
    });
    expect(checkProgram(`${program}\nprint(1)`, program, 'en', [['Ani']])).toMatchObject({
      line: 3,
      expected: undefined,
      actual: '1'
    });
  });

  it('give the error of a program, and say when it waits for more answers than the check has', () => {
    expect(checkProgram('print(x)', program, 'en', [['Ani']])).toMatchObject({
      passed: false,
      error: {id: 'undefinedVariable', line: 1}
    });
    expect(checkProgram(`${program}\nagain = input()`, program, 'en', [['Ani']])).toMatchObject({
      passed: false,
      needsAnswers: true
    });
    expect(checkProgram('while true\n    x = 1', program, 'en', [['Ani']])).toMatchObject({
      passed: false,
      error: {id: 'timeout'}
    });
  });

  it('run a program and its solution with the same random numbers', () => {
    const dice = 'print(random(1, 6) + " " + random(1, 6) + " " + random(1, 6))';
    expect(runWith(dice, 'en', [], seeded(1))).toEqual(runWith(dice, 'en', [], seeded(1)));
    expect(runWith(dice, 'en', [], seeded(1))).not.toEqual(runWith(dice, 'en', [], seeded(2)));
    expect(checkProgram(dice, dice, 'en', [[], [], []])).toEqual({passed: true});
  });
});
