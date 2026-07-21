#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const repositoryRoot = path.resolve(__dirname, '..');
const checker = path.join(repositoryRoot, 'scripts', 'check-governance-applicability.js');
const scratchParent = path.join(repositoryRoot, '.codex-local', 'tmp');
const codexLocalRoot = path.dirname(scratchParent);
const scratchParentExisted = fs.existsSync(scratchParent);
const codexLocalRootExisted = fs.existsSync(codexLocalRoot);
const scratchRoot = path.join(scratchParent, `governance-applicability-regression-${process.pid}`);
const sourceRelative = 'src/chapters/chapter05/index.md';
const docsRelative = 'docs/chapters/chapter05/index.md';
const appendixSourceRelative = 'src/appendices/appendix02/index.md';
const appendixDocsRelative = 'docs/appendices/appendix02/index.md';

function cleanup() {
  fs.rmSync(scratchRoot, { recursive: true, force: true });
  const createdDirectories = [];
  if (!scratchParentExisted) createdDirectories.push(scratchParent);
  if (!codexLocalRootExisted) createdDirectories.push(codexLocalRoot);
  for (const candidate of createdDirectories) {
    try {
      fs.rmdirSync(candidate);
    } catch (error) {
      if (!['ENOENT', 'ENOTEMPTY'].includes(error.code)) throw error;
    }
  }
}

function createFixture(name) {
  const root = path.join(scratchRoot, name);
  for (const relative of [sourceRelative, docsRelative, appendixSourceRelative, appendixDocsRelative]) {
    const destination = path.join(root, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(repositoryRoot, relative), destination);
  }
  return root;
}

function runChecker(root, extraArgs = []) {
  const result = spawnSync(process.execPath, [checker, '--root', root, ...extraArgs], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  });
  return { status: result.status, output: `${result.stdout || ''}${result.stderr || ''}` };
}

function pair(root) {
  return [sourceRelative, docsRelative].map((relative) => path.join(root, relative));
}

function appendixPair(root) {
  return [appendixSourceRelative, appendixDocsRelative].map((relative) => path.join(root, relative));
}

function replaceOnce(file, oldText, newText) {
  const text = fs.readFileSync(file, 'utf8');
  const count = text.split(oldText).length - 1;
  if (count !== 1) throw new Error(`${file}: expected one occurrence, got ${count}: ${oldText}`);
  fs.writeFileSync(file, text.replace(oldText, newText), 'utf8');
}

function replacePair(root, oldText, newText) {
  for (const file of pair(root)) replaceOnce(file, oldText, newText);
}

function sectionBounds(text, heading) {
  const start = text.indexOf(heading);
  if (start === -1) throw new Error(`section not found: ${heading}`);
  const level = heading.match(/^#+/)[0].length;
  const rest = text.slice(start).split(/\r?\n/);
  let lineOffset = text.slice(0, start).split(/\r?\n/).length - 1;
  let endLine = rest.length;
  for (let index = 1; index < rest.length; index += 1) {
    const match = rest[index].match(/^(#+) /);
    if (match && match[1].length <= level) {
      endLine = index;
      break;
    }
  }
  const allLines = text.split(/\r?\n/);
  const end = allLines.slice(0, lineOffset + endLine).join('\n').length;
  return { start, end };
}

function mutateSectionPair(root, heading, mutate) {
  for (const file of pair(root)) {
    const text = fs.readFileSync(file, 'utf8');
    const { start, end } = sectionBounds(text, heading);
    const original = text.slice(start, end);
    const changed = mutate(original);
    if (changed === original) throw new Error(`${file}: section mutation made no change: ${heading}`);
    fs.writeFileSync(file, text.slice(0, start) + changed + text.slice(end), 'utf8');
  }
}

function sectionReplace(root, heading, oldText, newText) {
  mutateSectionPair(root, heading, (scope) => {
    const count = scope.split(oldText).length - 1;
    if (count !== 1) throw new Error(`${heading}: expected one occurrence, got ${count}: ${oldText}`);
    return scope.replace(oldText, newText);
  });
}

const EU = '### 5.5.1 EU AI Act：拘束的な法規制';
const NIST = '### 5.5.2 NIST AI RMF：任意risk management framework';
const ISO = '### 5.5.3 ISO/IEC 42001：management system standard';
const LEGAL = '### 5.5.4 法的義務のapplicability checklist';
const NIST_LIST = '### 5.5.5 任意risk managementのtailoring checklist';
const ISO_LIST = '### 5.5.6 AIMSの採用・認証準備checklist';
const CROSSWALK = '### 5.5.7 共通artifactへのcrosswalk';
const NOTES = '### 5.5.8 Source Notes：版・確認日・再確認条件';

const cases = [
  {
    name: 'missing-eu-category', expected: '**Category**',
    mutate(root) { sectionReplace(root, EU, '**Category**', '**分類未記録**'); },
  },
  {
    name: 'missing-eu-jurisdiction', expected: '**Jurisdiction**',
    mutate(root) { sectionReplace(root, EU, '**Jurisdiction**', '**地域メモ**'); },
  },
  {
    name: 'missing-nist-actor', expected: '**対象actor / system**',
    mutate(root) { sectionReplace(root, NIST, '**対象actor / system**', '**対象未分類**'); },
  },
  {
    name: 'missing-iso-intended-use', expected: '**Intended use**',
    mutate(root) { sectionReplace(root, ISO, '**Intended use**', '**用途未分類**'); },
  },
  {
    name: 'missing-eu-confirmed-date', expected: '2026-07-21',
    mutate(root) { sectionReplace(root, EU, '> **確認日**: 2026-07-21', '> **確認日**: 未確認'); },
  },
  {
    name: 'missing-article-113-status', expected: '一般適用日を2026年8月2日',
    mutate(root) { sectionReplace(root, EU, '一般適用日を2026年8月2日', '適用日は別途確認'); },
  },
  {
    name: 'political-agreement-treated-as-law', expected: 'categoryを混同する禁止表現',
    mutate(root) { sectionReplace(root, EU, '政治合意やpolicy pageを施行済みの改正法と同一視してはいけません。', '政治合意により改正法は施行済みである。'); },
  },
  {
    name: 'nist-not-voluntary', expected: '法律ではなく、任意利用のrisk management framework',
    mutate(root) { sectionReplace(root, NIST, '法律ではなく、任意利用のrisk management framework', '法的義務と同等のframework'); },
  },
  {
    name: 'nist-revision-status-missing', expected: '1.0を改訂中',
    mutate(root) { sectionReplace(root, NIST, '1.0を改訂中', '版の更新状況は未確認'); },
  },
  {
    name: 'nist-checklist-boundary-missing', expected: 'Coreのactionは順序付きchecklistではなく',
    mutate(root) { sectionReplace(root, NIST, 'Coreのactionは順序付きchecklistではなく', 'Coreは順番に完了するchecklistであり'); },
  },
  {
    name: 'iso-edition-missing', expected: 'Edition 1',
    mutate(root) { sectionReplace(root, ISO, 'Edition 1', 'Edition未確認'); },
  },
  {
    name: 'iso-stage-missing', expected: 'stage 60.60（International Standard published）',
    mutate(root) { sectionReplace(root, ISO, 'stage 60.60（International Standard published）', 'current stage未確認'); },
  },
  {
    name: 'iso-jurisdiction-boundary-missing', expected: 'それ自体に法令のterritorial scopeはない',
    mutate(root) { sectionReplace(root, ISO, 'それ自体に法令のterritorial scopeはない', 'EU全域で直接適用される'); },
  },
  {
    name: 'legal-checklist-heading-missing', expected: LEGAL,
    mutate(root) { replacePair(root, LEGAL, '### 5.5.4 統合checklist'); },
  },
  {
    name: 'nist-checklist-heading-missing', expected: NIST_LIST,
    mutate(root) { replacePair(root, NIST_LIST, '### 5.5.5 共通checklist'); },
  },
  {
    name: 'source-url-missing', expected: 'https://eur-lex.europa.eu/eli/reg/2024/1689/oj/eng',
    mutate(root) { sectionReplace(root, NOTES, 'https://eur-lex.europa.eu/eli/reg/2024/1689/oj/eng', 'URL未確認'); },
  },
  {
    name: 'appendix-source-url-missing', expected: 'https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-ai-rmf-10',
    mutate(root) {
      for (const file of appendixPair(root)) {
        replaceOnce(file, 'https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-ai-rmf-10', 'URL未確認');
      }
    },
  },
  {
    name: 'source-recheck-missing', expected: '確認日または再確認条件が不足',
    mutate(root) { sectionReplace(root, NOTES, '再確認：改訂版、errata、Profile、Playbookが公開されたとき。', '更新状況は未記録。'); },
  },
  {
    name: 'generated-docs-drift', expected: '生成された本文と一致しません',
    mutate(root) { fs.appendFileSync(path.join(root, docsRelative), '\n<!-- stale governance copy -->\n'); },
  },
  {
    name: 'generated-appendix-drift', expected: '生成された本文と一致しません',
    mutate(root) { fs.appendFileSync(path.join(root, appendixDocsRelative), '\n<!-- stale governance source list -->\n'); },
  },
  {
    name: 'false-nist-legal-equivalence', expected: 'categoryを混同する禁止表現',
    mutate(root) { sectionReplace(root, NIST, '- **Category**：法律ではなく、任意利用のrisk management framework', '- **Category**：法律ではなく、任意利用のrisk management framework\n\nNIST AI RMFは法的義務である'); },
  },
  {
    name: 'false-iso-direct-law', expected: 'categoryを混同する禁止表現',
    mutate(root) { sectionReplace(root, ISO, '- **Category**：組織のAI management system（AIMS）に対する国際management system standard', '- **Category**：組織のAI management system（AIMS）に対する国際management system standard\n\nISO/IEC 42001はEU域内で直接適用される法令である'); },
  },
  {
    name: 'professional-boundary-missing', expected: '法的助言、適合性評価、認証判断を提供しません',
    mutate(root) { replacePair(root, '本節は法的助言、適合性評価、認証判断を提供しません。', '本節だけで最終判断できます。'); },
  },
  {
    name: 'legal-checklist-too-short', expected: 'checklist項目が不足',
    mutate(root) { mutateSectionPair(root, LEGAL, (scope) => scope.replace(/^- \[ \] /gm, '- ')); },
  },
  {
    name: 'crosswalk-equivalence-boundary-missing', expected: '法令準拠、framework適用、認証を相互に推定しない',
    mutate(root) { sectionReplace(root, CROSSWALK, '法令準拠、framework適用、認証を相互に推定しない', '3つのcategoryを同等と扱う'); },
  },
  {
    name: 'iso-checklist-record-missing', expected: '`AIMS Scope and Readiness Record`',
    mutate(root) { sectionReplace(root, ISO_LIST, '`AIMS Scope and Readiness Record`', '`統合記録`'); },
  },
];

let negativePassed = 0;
let cliPassed = 0;
try {
  fs.mkdirSync(scratchRoot, { recursive: true });
  const positiveRoot = createFixture('positive');
  const positive = runChecker(positiveRoot);
  if (positive.status !== 0) throw new Error(`positive fixture failed:\n${positive.output}`);

  for (const testCase of cases) {
    const root = createFixture(testCase.name);
    testCase.mutate(root);
    const result = runChecker(root);
    if (result.status === 0) throw new Error(`${testCase.name}: checker unexpectedly passed`);
    if (!result.output.includes(testCase.expected)) {
      throw new Error(`${testCase.name}: expected ${JSON.stringify(testCase.expected)}:\n${result.output}`);
    }
    negativePassed += 1;
  }

  for (const args of [[], ['--unknown']]) {
    const result = spawnSync(process.execPath, [checker, ...args], {
      cwd: repositoryRoot,
      encoding: 'utf8',
    });
    const output = `${result.stdout || ''}${result.stderr || ''}`;
    if (result.status === 0 || !output.includes('Usage:')) {
      throw new Error(`CLI misuse was not rejected: ${args.join(' ') || '(missing --root)'}\n${output}`);
    }
    cliPassed += 1;
  }

  console.log(`Governance applicability regression OK: ${negativePassed}/${cases.length} negative, 1/1 positive, ${cliPassed}/2 CLI misuse`);
} finally {
  cleanup();
}
