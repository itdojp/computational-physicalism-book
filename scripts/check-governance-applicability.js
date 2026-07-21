#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const SOURCE_FILE = 'src/chapters/chapter05/index.md';
const DOCS_FILE = 'docs/chapters/chapter05/index.md';
const APPENDIX_SOURCE_FILE = 'src/appendices/appendix02/index.md';
const APPENDIX_DOCS_FILE = 'docs/appendices/appendix02/index.md';
const REQUIRED_SECTIONS = [
  '## 5.5 実務ガバナンス（規制・標準）と運用への接続',
  '### 5.5.1 EU AI Act：拘束的な法規制',
  '### 5.5.2 NIST AI RMF：任意risk management framework',
  '### 5.5.3 ISO/IEC 42001：management system standard',
  '### 5.5.4 法的義務のapplicability checklist',
  '### 5.5.5 任意risk managementのtailoring checklist',
  '### 5.5.6 AIMSの採用・認証準備checklist',
  '### 5.5.7 共通artifactへのcrosswalk',
  '### 5.5.8 Source Notes：版・確認日・再確認条件',
];
const SOURCE_NOTE_CONTRACTS = [
  {
    label: '**EU legal text**',
    urls: ['https://eur-lex.europa.eu/eli/reg/2024/1689/oj/eng'],
  },
  {
    label: '**European Commission implementation page**',
    urls: ['https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai'],
  },
  {
    label: '**NIST AI RMF publication**',
    urls: ['https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-ai-rmf-10'],
  },
  {
    label: '**NIST AI RMF status / Core**',
    urls: [
      'https://www.nist.gov/itl/ai-risk-management-framework',
      'https://airc.nist.gov/airmf-resources/airmf/5-sec-core/',
    ],
  },
  {
    label: '**ISO/IEC 42001**',
    urls: ['https://www.iso.org/standard/42001'],
  },
];

function usage(message) {
  if (message) console.error(message);
  console.error('Usage: node scripts/check-governance-applicability.js --root <repository-root>');
  process.exit(2);
}

function parseArgs(argv) {
  let root = null;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--root') {
      if (root !== null || index + 1 >= argv.length) usage('--root requires one value.');
      root = argv[index + 1];
      index += 1;
    } else {
      usage(`Unknown argument: ${argv[index]}`);
    }
  }
  if (root === null) usage('--root is required.');
  const resolved = path.resolve(root);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    usage(`Repository root is not a directory: ${resolved}`);
  }
  return resolved;
}

function read(root, relative, errors) {
  try {
    return fs.readFileSync(path.join(root, relative), 'utf8');
  } catch (error) {
    errors.push(`${relative}: 読み込めません: ${error.message}`);
    return '';
  }
}

function section(text, heading) {
  const start = text.indexOf(heading);
  if (start === -1) return '';
  const level = heading.match(/^#+/)[0].length;
  const lines = text.slice(start).split(/\r?\n/);
  let end = lines.length;
  for (let index = 1; index < lines.length; index += 1) {
    const match = lines[index].match(/^(#+) /);
    if (match && match[1].length <= level) {
      end = index;
      break;
    }
  }
  return lines.slice(0, end).join('\n');
}

function requireTokens(scope, label, tokens, errors) {
  for (const token of tokens) {
    if (!scope.includes(token)) errors.push(`${label}: 必須契約がありません: ${token}`);
  }
}

const DATE_PATTERN = String.raw`\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])`;

function isCalendarDate(value) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year === 0) return false;
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= daysInMonth[month - 1];
}

function requireConfirmedDate(scope, label, errors) {
  const confirmedDate = new RegExp(`^> \\*\\*確認日\\*\\*: (${DATE_PATTERN})$`, 'm');
  const match = scope.match(confirmedDate);
  if (!match) {
    errors.push(`${label}: 確認日はYYYY-MM-DD形式で記録してください`);
  } else if (!isCalendarDate(match[1])) {
    errors.push(`${label}: 確認日は実在する暦日で記録してください: ${match[1]}`);
  }
}

function validateFrameworkCard(text, heading, specificTokens, errors) {
  const scope = section(text, heading);
  if (!scope) return;
  requireTokens(scope, heading, [
    '**Category**',
    '**Status / version**',
    '**Jurisdiction**',
    '**対象actor / system**',
    '**Intended use**',
    '**境界**',
    ...specificTokens,
  ], errors);
  requireConfirmedDate(scope, heading, errors);
}

function validateChecklist(text, heading, recordName, minimumItems, errors) {
  const scope = section(text, heading);
  if (!scope) return;
  requireTokens(scope, heading, [recordName, '> **再確認条件**:'], errors);
  requireConfirmedDate(scope, heading, errors);
  const items = (scope.match(/^- \[ \] /gm) || []).length;
  if (items < minimumItems) {
    errors.push(`${heading}: checklist項目が不足しています: expected >= ${minimumItems}, got ${items}`);
  }
}

function stripGeneratedFrontMatter(text) {
  return text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n\r?\n/, '');
}

function main() {
  const root = parseArgs(process.argv.slice(2));
  const errors = [];
  const source = read(root, SOURCE_FILE, errors);
  const docs = read(root, DOCS_FILE, errors);
  const appendixSource = read(root, APPENDIX_SOURCE_FILE, errors);
  const appendixDocs = read(root, APPENDIX_DOCS_FILE, errors);
  if (!source || !docs || !appendixSource || !appendixDocs) {
    report(errors);
    return;
  }

  for (const heading of REQUIRED_SECTIONS) {
    if (!source.includes(heading)) errors.push(`${SOURCE_FILE}: 必須見出しがありません: ${heading}`);
  }

  validateFrameworkCard(source, REQUIRED_SECTIONS[1], [
    'Regulation (EU) 2024/1689という拘束的なEU法',
    'Article 113',
    '一般適用日を2026年8月2日',
    'Article 2の域外適用',
    'Legal Applicability Record',
    '政治合意やpolicy pageを施行済みの改正法と同一視してはいけません',
    'Official JournalとEUR-Lex',
    'pending changeを別欄',
  ], errors);

  validateFrameworkCard(source, REQUIRED_SECTIONS[2], [
    '法律ではなく、任意利用のrisk management framework',
    'NIST AI 100-1',
    'AI RMF 1.0',
    '1.0を改訂中',
    'AI Risk Profile',
    'Coreのactionは順序付きchecklistではなく',
    '法令準拠や第三者認証を証明しない',
  ], errors);

  validateFrameworkCard(source, REQUIRED_SECTIONS[3], [
    'ISO/IEC 42001:2023',
    'Edition 1',
    '2023年12月公開',
    'stage 60.60（International Standard published）',
    'それ自体に法令のterritorial scopeはない',
    'AIMS Scope and Readiness Record',
    '認証取得、個別法令準拠、個別systemの安全性が証明されるわけではない',
  ], errors);

  validateChecklist(source, REQUIRED_SECTIONS[4], '`Legal Applicability Record`', 7, errors);
  validateChecklist(source, REQUIRED_SECTIONS[5], '`AI Risk Profile`', 6, errors);
  validateChecklist(source, REQUIRED_SECTIONS[6], '`AIMS Scope and Readiness Record`', 7, errors);

  const crosswalk = section(source, REQUIRED_SECTIONS[7]);
  requireTokens(crosswalk, REQUIRED_SECTIONS[7], [
    '| 共通artifact | EU AI Actでの利用例 | NIST AI RMFでの利用例 | ISO/IEC 42001での利用例 |',
    '法令準拠、framework適用、認証を相互に推定しない',
    '他categoryの要求を満たしたとは判断しません',
  ], errors);

  const notes = section(source, REQUIRED_SECTIONS[8]);
  const noteLines = notes.split(/\r?\n/).filter((line) => line.startsWith('- **'));
  if (noteLines.length !== 5) errors.push(`${REQUIRED_SECTIONS[8]}: Source Noteは5件必要です: got ${noteLines.length}`);
  const sourceNoteMetadata = new RegExp(
    `^(.+)。確認日：(${DATE_PATTERN})。再確認：([^。\\r\\n]+)。((?:https?://\\S+)(?: / https?://\\S+)*)$`,
    'u',
  );
  for (const contract of SOURCE_NOTE_CONTRACTS) {
    const prefix = `- ${contract.label}：`;
    const matches = noteLines.filter((line) => line.startsWith(prefix));
    if (matches.length !== 1) {
      errors.push(`${REQUIRED_SECTIONS[8]}: Source Noteはラベルごとに1件必要です: ${contract.label}, got ${matches.length}`);
      continue;
    }
    const [line] = matches;
    const metadata = line.slice(prefix.length).match(sourceNoteMetadata);
    const recheckCondition = metadata ? metadata[3].trim() : '';
    if (!metadata || recheckCondition.length < 4 || !/[\p{L}\p{N}]/u.test(recheckCondition)) {
      errors.push(`${REQUIRED_SECTIONS[8]}: 確認日または再確認条件が不足しています: ${line}`);
      continue;
    }
    if (!isCalendarDate(metadata[2])) {
      errors.push(`${REQUIRED_SECTIONS[8]}: 確認日は実在する暦日で記録してください: ${metadata[2]}`);
    }
    const actualUrls = metadata[4].split(' / ');
    if (actualUrls.length !== contract.urls.length || actualUrls.some((url, index) => url !== contract.urls[index])) {
      errors.push(
        `${REQUIRED_SECTIONS[8]}: ${contract.label}のURL fieldが期待値と一致しません: `
        + `expected ${contract.urls.join(' / ')}, got ${actualUrls.join(' / ')}`,
      );
    }
  }

  requireTokens(source, SOURCE_FILE, [
    '法的助言、適合性評価、認証判断を提供しません',
    '法的義務は一次法令と資格を持つ専門家',
    'category別の成果物を作る',
  ], errors);

  const forbidden = [
    '### 5.5.4 運用チェックリスト（最小）',
    'NIST AI RMFは法的義務である',
    'ISO/IEC 42001はEU域内で直接適用される法令である',
    '政治合意により改正法は施行済みである',
    '3つの枠組みは同一の義務を定める',
  ];
  for (const phrase of forbidden) {
    if (source.includes(phrase)) errors.push(`${SOURCE_FILE}: categoryを混同する禁止表現です: ${phrase}`);
  }

  if (stripGeneratedFrontMatter(docs) !== source) {
    errors.push(`${DOCS_FILE}: ${SOURCE_FILE}から生成された本文と一致しません。npm run buildを実行してください`);
  }

  requireTokens(appendixSource, APPENDIX_SOURCE_FILE, [
    'https://eur-lex.europa.eu/eli/reg/2024/1689/oj',
    'https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai',
    'https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-ai-rmf-10',
    'https://www.nist.gov/itl/ai-risk-management-framework',
    'https://airc.nist.gov/airmf-resources/airmf/5-sec-core/',
    'https://www.iso.org/standard/42001',
  ], errors);
  if (stripGeneratedFrontMatter(appendixDocs) !== appendixSource) {
    errors.push(`${APPENDIX_DOCS_FILE}: ${APPENDIX_SOURCE_FILE}から生成された本文と一致しません。npm run buildを実行してください`);
  }

  report(errors);
}

function report(errors) {
  if (errors.length) {
    console.error(`Governance applicability contract failed (${errors.length} errors):`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('Governance applicability contract OK: 3 categories, 3 checklists, 5 source notes, generated sync verified');
}

main();
