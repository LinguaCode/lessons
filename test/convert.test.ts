//checks the lessons in the languages a program is converted into: every lesson of every language converts, and every
//English lesson and solution, compiled or run with its answers, prints what it prints in CMIL
import {execFile, execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {promisify} from 'node:util';
import {convert, languages, targets} from 'cmil';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {EXERCISES, LESSONS, lessonCode, runWith} from '../src/index.ts';
import {loadLessonTexts} from '../src/load.ts';

await Promise.all(languages.map(loadLessonTexts));

describe('the lessons converted', () => {
  it.each(targets.map(({id}) => id))('every lesson of every language converts into %s', target => {
    for (const language of languages) {
      for (const lesson of LESSONS) {
        const result = convert(lessonCode(lesson, language), language, target);
        expect('code' in result, `${language} ${lesson.id}: ${JSON.stringify(result)}`).toBe(true);
      }
    }
  });
});

//the English programs that run the same with any random numbers, with the answers they run with
const PROGRAMS = [
  ...LESSONS.map(({id, code, inputs}) => ({name: id, code, answers: inputs ?? []})),
  ...LESSONS.flatMap(({id, inputs}) =>
    (EXERCISES[id].answers ?? [inputs ?? []]).map((answers, index) => ({
      name: `${id}, solution ${index + 1}`,
      code: EXERCISES[id].solution,
      answers
    }))
  )
].filter(({code}) => !/random\(/.test(code));

const runs = (program: string, args: string[]) => {
  try {
    execFileSync(program, args, {stdio: 'ignore'});
    return true;
  } catch {
    return false;
  }
};
const has = (program: string) => runs('which', [program]);

const execute = promisify(execFile);
const outputOf = (program: string, args: string[], answers: string[]) =>
  new Promise<string>(resolve => {
    const child = execFile(program, args, {timeout: 10000}, (_error, stdout) => resolve(stdout.replace(/\n$/, '')));
    child.stdin!.on('error', () => {});
    child.stdin!.end(answers.join('\n') + '\n');
  });

type Runner = {
  tool: string;
  //whether the tool is there, when that needs more than its name on the path
  available?: () => boolean;
  //compiles the programs once, before they run
  build?: (files: string[], dir: string) => Promise<void>;
  run: (file: string, answers: string[]) => Promise<string>;
};

const DOTNET = {...process.env, DOTNET_NOLOGO: '1', DOTNET_CLI_TELEMETRY_OPTOUT: '1'};
const classOf = (file: string) => `P${path.parse(file).name}`;

//a .NET project of the programs in src, in C# or Visual Basic, with its properties; a Visual Basic one imports by
//itself only Microsoft.VisualBasic, which every Visual Basic project and vbc import, so a program has the rest
const dotnetProject = (properties: string[], extension: 'cs' | 'vb') =>
  [
    '<Project Sdk="Microsoft.NET.Sdk">',
    '  <PropertyGroup>',
    ...properties.map(property => `    ${property}`),
    '  </PropertyGroup>',
    '  <ItemGroup>',
    `    <Compile Include="../src/*.${extension}" />`,
    ...(extension === 'vb' ? ['    <Import Include="Microsoft.VisualBasic" />'] : []),
    '  </ItemGroup>',
    '</Project>'
  ].join('\n');

//a build of .NET takes seconds, so the programs are built in one project, each in its own class or namespace. A
//modern C# program builds as dotnet new console builds it, which warns of values that may be null, and runs in Run()
//of its class; a classic one builds with C# 7.3 against .NET Standard 2.0, like .NET Framework, and runs in a project
//of its own, as a Visual Basic one does, whose Dispatch runs the Main of the namespace named
const buildDotnet = (style: 'modern' | 'classic' | 'visualbasic') => async (files: string[], dir: string) => {
  const extension = style === 'visualbasic' ? 'vb' : 'cs';
  const {stdout: version} = await execute('dotnet', ['--version'], {env: DOTNET});
  const framework = `<TargetFramework>net${version.split('.')[0]}.0</TargetFramework>`;
  await fs.mkdir(path.join(dir, 'src'));
  for (const file of files) {
    const lines = (await fs.readFile(file, 'utf8')).split('\n');
    //the lines a program starts with, its usings, or its Option and Imports
    const first = (line: string) => (extension === 'vb' ? /^(Option|Imports) /.test(line) : line.startsWith('using '));
    const usings = lines.filter(first);
    const rest = lines.filter(line => !first(line));
    const wrapped =
      style === 'modern'
        ? [...usings, `static class ${classOf(file)}`, '{', 'public static void Run()', '{', ...rest, '}', '}']
        : style === 'classic'
          ? [...usings, `namespace ${classOf(file)}`, '{', ...rest, '}']
          : [...usings, `Namespace ${classOf(file)}`, ...rest, 'End Namespace'];
    await fs.writeFile(path.join(dir, 'src', `${classOf(file)}.${extension}`), wrapped.join('\n'));
  }
  const projects: Record<string, string[]> =
    style === 'modern'
      ? {
          run: [
            '<OutputType>Exe</OutputType>',
            framework,
            '<Nullable>enable</Nullable>',
            '<ImplicitUsings>disable</ImplicitUsings>',
            '<WarningsAsErrors>nullable</WarningsAsErrors>'
          ]
        }
      : style === 'classic'
        ? {
            check: ['<TargetFramework>netstandard2.0</TargetFramework>', '<LangVersion>7.3</LangVersion>'],
            run: ['<OutputType>Exe</OutputType>', framework, '<StartupObject>Dispatch</StartupObject>']
          }
        : {
            run: [
              '<OutputType>Exe</OutputType>',
              framework,
              '<StartupObject>Dispatch</StartupObject>',
              '<RootNamespace></RootNamespace>',
              '<DisableImplicitNamespaceImports>true</DisableImplicitNamespaceImports>'
            ]
          };
  for (const [name, properties] of Object.entries(projects)) {
    await fs.mkdir(path.join(dir, name));
    await fs.writeFile(path.join(dir, name, `${name}.${extension}proj`), dotnetProject(properties, extension));
  }
  await fs.writeFile(
    path.join(dir, 'run', style === 'modern' ? 'Main.cs' : `Dispatch.${extension}`),
    style === 'visualbasic'
      ? [
          'Module Dispatch',
          '    Sub Main(args As String())',
          '        Dim flags As System.Reflection.BindingFlags = System.Reflection.BindingFlags.Public Or System.Reflection.BindingFlags.Static',
          '        System.Type.GetType(args(0) & ".Program").GetMethod("Main", flags).Invoke(Nothing, Nothing)',
          '    End Sub',
          'End Module'
        ].join('\n')
      : style === 'modern'
        ? [
            'var programs = new System.Collections.Generic.Dictionary<string, System.Action>',
            '{',
            ...files.map(file => `    ["${classOf(file)}"] = ${classOf(file)}.Run,`),
            '};',
            'programs[args[0]]();'
          ].join('\n')
        : [
            'static class Dispatch',
            '{',
            '    static void Main(string[] args)',
            '    {',
            '        var flags = System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Static;',
            '        System.Type.GetType(args[0] + ".Program").GetMethod("Main", flags).Invoke(null, new object[] { new string[0] });',
            '    }',
            '}'
          ].join('\n')
  );
  for (const name of Object.keys(projects)) {
    await execute(
      'nice',
      [
        '-n',
        '19',
        'dotnet',
        'build',
        path.join(dir, name),
        '-c',
        'Release',
        '-nologo',
        '-v',
        'q',
        '-o',
        path.join(dir, name, 'out')
      ],
      {env: DOTNET, maxBuffer: 64 * 1024 * 1024}
    ).catch((error: {stdout?: string}) => {
      //the errors of the compiler, each with its program
      const errors = [...new Set(String(error.stdout ?? error).match(/^.*error (CS|BC).*$/gm) ?? [String(error)])];
      throw new Error(`${name}:\n${errors.join('\n')}`);
    });
  }
};

//runs a C# or Visual Basic program of the project, by its class or namespace
const runDotnet = (file: string, answers: string[]) =>
  outputOf('dotnet', [path.join(path.dirname(file), 'run', 'out', 'run.dll'), classOf(file)], answers);

//javac and java of the JDK in JAVA_HOME, else of the path; the modern shape of Java needs Java 25
const jdk = (tool: string) => (process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', tool) : tool);
const hasJava25 = () => {
  try {
    const version = execFileSync(jdk('javac'), ['-version'], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']});
    return Number(/javac (\d+)/.exec(version)?.[1]) >= 25;
  } catch {
    return false;
  }
};

//builds the Java programs with one javac, since each start of it takes a second: a compact source file names its
//class, and a classic Main gets a package; a classic one builds for Java 8
const javaClassOf = (file: string, style: 'modern' | 'classic') =>
  style === 'modern' ? `P${path.basename(file, '.java')}` : `p${path.basename(file, '.java')}.Main`;
const buildJava = (style: 'modern' | 'classic') => async (files: string[], dir: string) => {
  const sources: string[] = [];
  for (const file of files) {
    const number = path.basename(file, '.java');
    const code = await fs.readFile(file, 'utf8');
    const source =
      style === 'modern' ? path.join(dir, 'src', `P${number}.java`) : path.join(dir, 'src', `p${number}`, 'Main.java');
    await fs.mkdir(path.dirname(source), {recursive: true});
    await fs.writeFile(source, style === 'modern' ? code : `package p${number};\n\n${code}`);
    sources.push(source);
  }
  const options = style === 'modern' ? [] : ['--release', '8', '-Xlint:-options'];
  await execute('nice', ['-n', '19', jdk('javac'), ...options, '-d', path.join(dir, 'out'), ...sources], {
    maxBuffer: 64 * 1024 * 1024
  }).catch((error: {stderr?: string}) => {
    throw new Error(String(error.stderr ?? error));
  });
};
const runJava = (style: 'modern' | 'classic') => (file: string, answers: string[]) =>
  outputOf(jdk('java'), ['-cp', path.join(path.dirname(file), 'out'), javaClassOf(file, style)], answers);

//kotlinc of KOTLIN_HOME, else of the path, which builds the Kotlin programs at once, since it starts slowly, each in
//a package of its own, into a jar with Kotlin's library
const kotlinc = () => (process.env.KOTLIN_HOME ? path.join(process.env.KOTLIN_HOME, 'bin', 'kotlinc') : 'kotlinc');
const buildKotlin = async (files: string[], dir: string) => {
  const sources: string[] = [];
  await fs.mkdir(path.join(dir, 'src'));
  for (const file of files) {
    const number = path.basename(file, '.kt');
    const source = path.join(dir, 'src', `p${number}.kt`);
    await fs.writeFile(source, `package p${number}\n\n${await fs.readFile(file, 'utf8')}`);
    sources.push(source);
  }
  const jar = path.join(dir, 'programs.jar');
  await execute('nice', ['-n', '19', kotlinc(), '-nowarn', '-include-runtime', '-d', jar, ...sources], {
    maxBuffer: 64 * 1024 * 1024
  }).catch((error: {stderr?: string}) => {
    throw new Error(String(error.stderr ?? error));
  });
};
//runs a Kotlin program of the jar, by the class of its file, like p12.P12Kt
const runKotlin = (file: string, answers: string[]) => {
  const number = path.basename(file, '.kt');
  const jar = path.join(path.dirname(file), 'programs.jar');
  return outputOf(jdk('java'), ['-cp', jar, `p${number}.P${number}Kt`], answers);
};

//prompt() of a browser, for the lessons in JavaScript: the next answer, from stdin
const PROMPT =
  "const answers = require('node:fs').readFileSync(0, 'utf8').split('\\n');\nglobalThis.prompt = () => answers.shift() ?? null;\n";

//assembly of the GNU assembler, in either syntax, which gcc builds and links with the C library
const runGnuAssembly = async (file: string, answers: string[]) => {
  const binary = file.replace(/\.s$/, '');
  await execute('nice', ['-n', '19', 'gcc', '-o', binary, file, '-lm']);
  return outputOf(binary, [], answers);
};

const RUNNERS: Record<string, Runner> = {
  cpp: {
    tool: 'g++',
    run: async (file, answers) => {
      await execute('nice', ['-n', '19', 'g++', '-std=c++20', '-o', `${file}.out`, file]);
      return outputOf(`${file}.out`, [], answers);
    }
  },
  python: {tool: 'python3', run: (file, answers) => outputOf('python3', [file], answers)},
  c: {
    tool: 'gcc',
    run: async (file, answers) => {
      await execute('nice', ['-n', '19', 'gcc', '-std=c99', '-pedantic', '-o', `${file}.out`, file, '-lm']);
      return outputOf(`${file}.out`, [], answers);
    }
  },
  csharp: {tool: 'dotnet', build: buildDotnet('modern'), run: runDotnet},
  'csharp-classic': {tool: 'dotnet', build: buildDotnet('classic'), run: runDotnet},
  visualbasic: {tool: 'dotnet', build: buildDotnet('visualbasic'), run: runDotnet},
  javascript: {
    tool: 'node',
    build: async (_files, dir) => fs.writeFile(path.join(dir, 'prompt.cjs'), PROMPT),
    run: (file, answers) =>
      outputOf(process.execPath, ['--require', path.join(path.dirname(file), 'prompt.cjs'), file], answers)
  },
  pascal: {
    tool: 'fpc',
    run: async (file, answers) => {
      const out = `${file}-out`;
      await fs.mkdir(out);
      await execute('nice', ['-n', '19', 'fpc', '-ve', `-FE${out}`, file]);
      return outputOf(path.join(out, path.basename(file, '.pas')), [], answers);
    }
  },
  go: {
    tool: 'go',
    run: async (file, answers) => {
      const binary = file.replace(/\.go$/, '');
      //the code is as gofmt lays it out
      expect((await execute('gofmt', ['-d', file])).stdout).toBe('');
      await execute('nice', ['-n', '19', 'go', 'build', '-o', binary, file]);
      return outputOf(binary, [], answers);
    }
  },
  kotlin: {tool: 'kotlinc', available: () => has(kotlinc()), build: buildKotlin, run: runKotlin},
  php: {tool: 'php', run: (file, answers) => outputOf('php', [file], answers)},
  ruby: {tool: 'ruby', run: (file, answers) => outputOf('ruby', [file], answers)},
  lua: {tool: 'lua5.4', run: (file, answers) => outputOf('lua5.4', [file], answers)},
  tcl: {tool: 'tclsh', run: (file, answers) => outputOf('tclsh', [file], answers)},
  'x86-64': {tool: 'gcc', run: runGnuAssembly},
  'x86-64-att': {tool: 'gcc', run: runGnuAssembly},
  'x86-64-nasm': {
    tool: 'nasm',
    run: async (file, answers) => {
      const binary = file.replace(/\.asm$/, '');
      await execute('nice', ['-n', '19', 'nasm', '-f', 'elf64', '-o', `${binary}.o`, file]);
      await execute('nice', ['-n', '19', 'gcc', '-o', binary, `${binary}.o`, '-lm']);
      return outputOf(binary, [], answers);
    }
  },
  cobol: {
    tool: 'cobc',
    run: async (file, answers) => {
      const binary = file.replace(/\.cob$/, '');
      await execute('nice', ['-n', '19', 'cobc', '-x', '-o', binary, file]);
      return outputOf(binary, [], answers);
    }
  },
  fortran: {
    tool: 'gfortran',
    run: async (file, answers) => {
      const binary = file.replace(/\.f90$/, '');
      await execute('nice', ['-n', '19', 'gfortran', '-o', binary, file]);
      return outputOf(binary, [], answers);
    }
  },
  basic: {
    tool: 'fbc',
    run: async (file, answers) => {
      const binary = file.replace(/\.bas$/, '');
      await execute('nice', ['-n', '19', 'fbc', '-x', binary, file]);
      return outputOf(binary, [], answers);
    }
  },
  rust: {
    tool: 'rustc',
    //rustup puts rustc on the PATH even where it has no toolchain to run, like in a HOME of its own
    available: () => runs('rustc', ['--version']),
    run: async (file, answers) => {
      await execute('nice', ['-n', '19', 'rustc', '--edition', '2021', '-o', `${file}.out`, file]);
      return outputOf(`${file}.out`, [], answers);
    }
  },
  swift: {
    tool: 'swiftc',
    run: async (file, answers) => {
      await execute('nice', ['-n', '19', 'swiftc', '-o', `${file}.out`, file]);
      return outputOf(`${file}.out`, [], answers);
    }
  },
  java: {tool: 'javac', available: hasJava25, build: buildJava('modern'), run: runJava('modern')},
  'java-classic': {tool: 'javac', available: hasJava25, build: buildJava('classic'), run: runJava('classic')}
};

for (const {id, name, extension} of targets) {
  //the workflow on GitHub has every tool, so there a missing one is a failure, not a skip; elsewhere, like in the check
  //of a deploy, the lessons of a target whose tool is missing are skipped
  const available = RUNNERS[id].available ?? (() => has(RUNNERS[id].tool));
  describe.skipIf(!available() && !process.env.GITHUB_ACTIONS)(`the lessons in ${name}`, () => {
    const outputs = new Map<string, string>();
    let dir = '';

    beforeAll(async () => {
      dir = await fs.mkdtemp(path.join(os.tmpdir(), `linguacode-${id}-`));
      const files: {program: (typeof PROGRAMS)[number]; file: string}[] = [];
      for (const [index, program] of PROGRAMS.entries()) {
        const result = convert(program.code, 'en', id);
        if (!('code' in result)) continue;
        const file = path.join(dir, `${index}.${extension}`);
        await fs.writeFile(file, result.code);
        files.push({program, file});
      }
      await RUNNERS[id].build?.(
        files.map(({file}) => file),
        dir
      );
      const queue = [...files];
      const work = async () => {
        for (let next; (next = queue.shift());) {
          outputs.set(next.program.name, await RUNNERS[id].run(next.file, next.program.answers));
        }
      };
      await Promise.all(Array.from({length: Math.max(1, Math.floor(os.availableParallelism() / 2))}, work));
    }, 600_000);

    afterAll(() => fs.rm(dir, {recursive: true, force: true}));

    it.each(PROGRAMS)('$name prints what it prints in CMIL', ({name: program, code, answers}) => {
      const expected = runWith(code, 'en', answers, Math.random).output.join('\n');
      //Python prints True and False, where CMIL prints true and false
      const printed = outputs
        .get(program)
        ?.replace(/\bTrue\b/g, 'true')
        .replace(/\bFalse\b/g, 'false');
      expect(printed).toBe(expected);
    });
  });
}
