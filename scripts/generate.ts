//writes src/course.generated.ts from course.json and the files of lessons/, which it checks first: each lesson of a
//topic has its program, its solution and its texts in the folder of its topic, and the folders have nothing else.
//The module has the lessons themselves, so a page or an app that imports them needs no files of its own
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUTPUT = path.join(ROOT, 'src', 'course.generated.ts');

//a topic and a group each have the icon of their subject, by its name in Font Awesome's solid style, like list-ol
type Course = {
  topics: {id: string; title: string; short?: string; icon: string; lessons: string[]}[];
  groups: {id: string; title: string; icon: string; topics: string[]}[];
};
type Meta = {
  title: string;
  description: string;
  inputs?: string[];
  exercise: {task: string; answers?: string[][]};
};

const problems: string[] = [];
const problem = (text: string) => problems.push(text);

const isTexts = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(item => typeof item === 'string');
const ID = /^[a-z][A-Za-z0-9]*$/;
const ICON = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const course = JSON.parse(fs.readFileSync(path.join(ROOT, 'course.json'), 'utf8')) as Course;
const topics = course.topics.map(({id}) => id);
const ids = course.topics.flatMap(({lessons}) => lessons);

for (const [kind, list] of [
  ['topic', topics],
  ['lesson', ids],
  ['group', course.groups.map(({id}) => id)]
] as const) {
  list.filter((id, index) => list.indexOf(id) !== index).forEach(id => problem(`course.json: the ${kind} ${id} twice`));
  list.filter(id => !ID.test(id)).forEach(id => problem(`course.json: ${id} isn't an id in camelCase`));
}
for (const {id, title, lessons} of course.topics) {
  if (typeof title !== 'string' || !title.trim()) problem(`course.json: the topic ${id} has no title`);
  if (!lessons.length) problem(`course.json: the topic ${id} has no lessons`);
}
for (const {id, icon} of [...course.topics, ...course.groups]) {
  if (typeof icon !== 'string' || !ICON.test(icon)) problem(`course.json: ${id} has no icon named like list-ol`);
}
//a group holds topics that follow each other
for (const group of course.groups) {
  const at = topics.indexOf(group.topics[0]);
  if (!group.title?.trim()) problem(`course.json: the group ${group.id} has no title`);
  if (group.topics.some((topic, index) => topics[at + index] !== topic)) {
    problem(`course.json: the topics of the group ${group.id} aren't topics that follow each other`);
  }
}

//the files of the folder of each topic, and those that belong to no lesson
const lessonsFolder = path.join(ROOT, 'lessons');
const folders = fs.readdirSync(lessonsFolder);
folders.filter(folder => !topics.includes(folder)).forEach(folder => problem(`lessons/${folder}: no topic`));

const read = (file: string): string | null => {
  try {
    return fs.readFileSync(path.join(lessonsFolder, file), 'utf8');
  } catch {
    problem(`lessons/${file}: missing`);
    return null;
  }
};
//a program, without the line end of the file's last line
const program = (file: string) => read(file)?.replace(/\n$/, '') ?? '';

const lessons = course.topics.flatMap(({id: topic, lessons}) => {
  const expected = new Set(lessons.flatMap(id => [`${id}.cmil`, `${id}.solution.cmil`, `${id}.json`]));
  if (folders.includes(topic)) {
    fs.readdirSync(path.join(lessonsFolder, topic))
      .filter(file => !expected.has(file))
      .forEach(file => problem(`lessons/${topic}/${file}: no lesson of ${topic}`));
  }
  return lessons.map(id => {
    const code = program(`${topic}/${id}.cmil`);
    const solution = program(`${topic}/${id}.solution.cmil`);
    const text = read(`${topic}/${id}.json`);
    const meta = (text ? JSON.parse(text) : {exercise: {}}) as Meta;
    const where = `lessons/${topic}/${id}.json`;
    if (typeof meta.title !== 'string' || !meta.title.trim()) problem(`${where}: no title`);
    if (typeof meta.description !== 'string' || !meta.description.trim()) problem(`${where}: no description`);
    if (meta.inputs !== undefined && !isTexts(meta.inputs)) problem(`${where}: inputs aren't texts`);
    if (typeof meta.exercise?.task !== 'string' || !meta.exercise.task.trim()) problem(`${where}: no task`);
    const {answers} = meta.exercise ?? {};
    if (answers !== undefined && !(Array.isArray(answers) && answers.every(isTexts))) {
      problem(`${where}: the answers of the exercise aren't lists of texts`);
    }
    const unknown = Object.keys(meta).filter(key => !['title', 'description', 'inputs', 'exercise'].includes(key));
    unknown.forEach(key => problem(`${where}: ${key} isn't a field of a lesson`));
    return {id, topic, code, solution, meta};
  });
});

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}

const json = (value: unknown) => JSON.stringify(value);
const lines = [
  '//written by npm run generate from course.json and lessons/: change those, not this file',
  "import type {Exercise, Lesson, LessonTexts} from './types.ts';",
  '',
  `export const TOPICS = ${json(topics)} as const;`,
  '',
  `export const GROUPS = ${json(Object.fromEntries(course.groups.map(({id, topics}) => [id, topics])))} as const;`,
  '',
  `export const SHORT_TOPICS: Partial<Record<(typeof TOPICS)[number], string>> = ${json(
    Object.fromEntries(course.topics.flatMap(({id, short}) => (short ? [[id, short]] : [])))
  )};`,
  '',
  `export const LESSON_IDS = ${json(ids)} as const;`,
  '',
  '//the icon of each topic and group, by its name in the solid style of Font Awesome',
  `export const TOPIC_ICON_NAMES: Readonly<Record<(typeof TOPICS)[number] | keyof typeof GROUPS, string>> = ${json(
    Object.fromEntries([...course.groups, ...course.topics].map(({id, icon}) => [id, icon]))
  )};`,
  '',
  'export const LESSONS: readonly Lesson[] = [',
  ...lessons.map(
    ({id, topic, code, meta}) =>
      `  {id: ${json(id)}, topic: ${json(topic)}, code: ${json(code)}${meta.inputs ? `, inputs: ${json(meta.inputs)}` : ''}},`
  ),
  '];',
  '',
  'export const EXERCISES: Readonly<Record<(typeof LESSON_IDS)[number], Exercise>> = {',
  ...lessons.map(
    ({id, solution, meta}) =>
      `  ${id}: {solution: ${json(solution)}${meta.exercise.answers ? `, answers: ${json(meta.exercise.answers)}` : ''}},`
  ),
  '};',
  '',
  '//the lessons in English, whose programs are already in English, so they have no names or texts to replace',
  'export const ENGLISH: LessonTexts = {',
  `  topics: ${json(Object.fromEntries(course.topics.map(({id, title}) => [id, title])))},`,
  `  groups: ${json(Object.fromEntries(course.groups.map(({id, title}) => [id, title])))},`,
  `  lessons: ${json(Object.fromEntries(lessons.map(({id, meta}) => [id, [meta.title, meta.description]])))},`,
  `  exercises: ${json(Object.fromEntries(lessons.map(({id, meta}) => [id, meta.exercise.task])))},`,
  '  names: {},',
  '  texts: {}',
  '};',
  ''
];

const written = lines.join('\n');
if (!fs.existsSync(OUTPUT) || fs.readFileSync(OUTPUT, 'utf8') !== written) fs.writeFileSync(OUTPUT, written);
