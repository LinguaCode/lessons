//the types of the lessons, of their exercises, and of their texts in one language
import type {GROUPS, LESSON_IDS, TOPICS} from './course.generated.ts';

/** A topic of the lessons, like print or while, in the order of course.json. */
export type Topic = (typeof TOPICS)[number];

/** A group of topics, like the loops. */
export type Group = keyof typeof GROUPS;

/** The id of a lesson, like hello or forCount. */
export type LessonId = (typeof LESSON_IDS)[number];

/** A lesson: a CMIL program in English, with English names and texts, of a topic. */
export type Lesson = {
  id: LessonId;
  topic: Topic;
  code: string;
  //answers for the tests, in English; every input of a lesson comes after a print that says what to type
  inputs?: string[];
};

/** The exercise of a lesson: a change of its program, checked against a solution, an English program like it. */
export type Exercise = {
  solution: string;
  //the answers each check runs with, in English like those of the lessons; a check runs once for each set, with its
  //own random numbers, and the same ones for the program and the solution
  answers?: string[][];
};

/**
 * The lessons in one language. Titles and descriptions may name commands as {print}, by their ids in CMIL, and they
 * are shown with the words of the language.
 */
export type LessonTexts = {
  topics: Record<Topic, string>;
  //the names of the groups of topics, like the loops
  groups: Record<Group, string>;
  lessons: Record<LessonId, [title: string, description: string]>;
  //the task of the exercise of each lesson, which may name commands like a description
  exercises: Record<LessonId, string>;
  //the names of the English programs in this language: words, never Latin letters outside Latin scripts
  names: Record<string, string>;
  //the texts of the English programs in this language, without their quotes
  texts: Record<string, string>;
};
