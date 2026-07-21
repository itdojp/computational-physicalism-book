#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const SOURCE = 'src/chapters/chapter05/index.md';
const GENERATED = 'docs/chapters/chapter05/index.md';
const CURRICULUM_HEADING = '### 具体的なカリキュラム例';
const NEXT_HEADING = '## 5.3 労働と創造性の未来';
const POSITION_HEADING = '#### 例示の位置づけ';
const COMMON_HEADING = '#### 共通の適用条件とAI利用時の安全策';
const STAGES = [
  '#### 初等段階に相当する例',
  '#### 中等段階に相当する例',
  '#### 高等・専門段階に相当する例',
];
const PLURALISM_HEADING = '#### 哲学的多元性を守る授業契約';
const REQUIRED_FIELDS = [
  '対象層',
  '前提知識',
  '学習目的',
  '評価方法',
  '適用しない条件',
];
const PLACEHOLDER_PATTERN = /(?:未定|未策定|保留|決まっていない|定めていない|後日(?:決め|検討)|今後(?:決め|検討)|検討中|未確認|未設定|未記入|詳細は(?:別途|省略)|TBD|TODO|特になし)/i;
const FIELD_SEMANTIC_PATTERNS = {
  対象層: [{ pattern: /学習者/, label: '対象となる学習者' }],
  前提知識: [{ pattern: /(?:基礎|理解|知識|規則|経験|教材)/, label: '具体的な前提または補完策' }],
  学習目的: [{ pattern: /(?:説明|比較|作る|設計)/, label: '観測可能な学習成果' }],
  評価方法: [{ pattern: /(?:説明|記録|作品|成果物|ルーブリック|口頭試問|試験|実演|評価|採否理由)/, label: '観測可能な評価手段' }],
  適用しない条件: [{ pattern: /(?:場合|とき|条件)/, label: '実施しない判断条件' }],
};
const FIELD_CONTRADICTION_PATTERNS = {
  対象層: [
    /学習者(?:や年齢)?を問わず/,
    /すべての学習者.{0,20}一律/u,
  ],
  前提知識: [
    /前提知識(?:は|が)?不要/,
    /知識を問わない/,
  ],
  学習目的: [
    /学習目的(?:の達成)?(?:は|を)?問わない/,
    /到達目標(?:は|が)?不要/,
  ],
  評価方法: [
    /(?:会話量|流暢さ).{0,30}(?:加点|成績|補助評価|能力評価)/u,
    /AI出力.{0,30}そのまま.{0,20}(?:採点|評価)/u,
    /(?:立場|理論)への同意.{0,30}(?:加点|成績|評価)/u,
  ],
  適用しない条件: [
    /(?:条件を満たさない|確保できない).{0,30}(?:場合|とき)(?:でも|も).{0,30}(?:実施|利用|継続)(?:でき|する|可)/u,
    /適用しない条件(?:は|が)?(?:ない|不要)/,
    /どの条件でも.{0,20}実施/u,
  ],
};
const POSITION_CONTRADICTIONS = [
  /普遍的な推奨標準(?:として|であり|です|にする)/,
  /教育政策案(?:として|であり|です|にする)/,
  /固定年齢(?:帯)?(?:を|として).{0,20}(?:設定|適用|採用)/u,
];
const COMMON_CONTRADICTIONS = [
  /(?:会話量|流暢さ).{0,30}(?:補助評価|参考値|加点対象|成績に反映|能力指標として扱)/u,
  /(?:安全策|監督|検証|非AIの代替).{0,20}(?:なし|不要).{0,20}(?:実施|利用|継続)/u,
  /確保できない場合でも.{0,20}(?:実施|利用|継続)/u,
];
const PLURALISM_CONTRADICTIONS = [
  /(?:計算論的物理主義|物理主義|特定立場).{0,20}(?:への同意|を採用).{0,30}(?:加点|成績|評価対象)/u,
  /名前を挙げるだけで十分/,
  /立場ごとに異なる基準/,
  /反対説.{0,20}(?:扱わない|省略する|不要)/u,
];

function failUsage(message) {
  if (message) console.error(message);
  console.error('Usage: node scripts/check-curriculum-boundaries.js --root <repository-root>');
  process.exit(2);
}

function parseArgs(argv) {
  let root = null;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--root') {
      if (root !== null || index + 1 >= argv.length) failUsage('--root requires one value.');
      root = argv[index + 1];
      index += 1;
      continue;
    }
    failUsage(`Unknown argument: ${arg}`);
  }
  if (root === null) failUsage('--root is required.');
  const resolved = path.resolve(root);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    failUsage(`Repository root is not a directory: ${resolved}`);
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

function stripGeneratedFrontMatter(text) {
  return text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n\r?\n/, '');
}

function section(text, heading, nextHeadings, errors) {
  const lines = text.split(/\r?\n/);
  const matchingIndexes = [];
  lines.forEach((line, index) => {
    if (line === heading) matchingIndexes.push(index);
  });
  if (matchingIndexes.length !== 1) {
    errors.push(`${SOURCE}: 見出しは1件必要です（${matchingIndexes.length}件）: ${heading}`);
    return '';
  }
  const start = matchingIndexes[0];
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (nextHeadings.includes(lines[index])) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join('\n');
}

function meaningful(value) {
  const normalized = value.trim();
  return normalized.length >= 12 && /[\p{L}\p{N}]/u.test(normalized);
}

function requireTokens(scope, tokens, label, errors) {
  for (const token of tokens) {
    if (!scope.includes(token)) errors.push(`${SOURCE}: ${label}が不足しています: ${token}`);
  }
}

function rejectContradictions(scope, patterns, label, errors) {
  for (const pattern of patterns) {
    const match = scope.match(pattern);
    if (match) errors.push(`${SOURCE}: ${label}の意味を逆転させる禁止表現があります: ${match[0]}`);
  }
}

function validateStage(scope, heading, errors) {
  for (const field of REQUIRED_FIELDS) {
    const pattern = new RegExp(`^- \\*\\*${field}\\*\\*：(.*)$`, 'gm');
    const matches = [...scope.matchAll(pattern)];
    if (matches.length !== 1) {
      errors.push(`${SOURCE}: ${heading}の${field}は1件必要です（${matches.length}件）`);
      continue;
    }
    if (!meaningful(matches[0][1])) {
      errors.push(`${SOURCE}: ${heading}の${field}に具体的な内容が必要です`);
      continue;
    }
    const value = matches[0][1].trim();
    if (PLACEHOLDER_PATTERN.test(value)) {
      errors.push(`${SOURCE}: ${heading}の${field}にplaceholderまたは先送り表現があります`);
    }
    for (const requirement of FIELD_SEMANTIC_PATTERNS[field] || []) {
      if (!requirement.pattern.test(value)) {
        errors.push(`${SOURCE}: ${heading}の${field}に${requirement.label}が必要です`);
      }
    }
    rejectContradictions(
      value,
      FIELD_CONTRADICTION_PATTERNS[field] || [],
      `${heading}の${field}`,
      errors,
    );
  }
}

function validateCurriculum(text, errors) {
  const chapterSection = section(text, CURRICULUM_HEADING, [NEXT_HEADING], errors);
  if (!chapterSection) return;

  const expectedOrder = [POSITION_HEADING, COMMON_HEADING, PLURALISM_HEADING, ...STAGES];
  const lines = chapterSection.split(/\r?\n/);
  let previousIndex = -1;
  for (const heading of expectedOrder) {
    const index = lines.indexOf(heading);
    if (index === -1) continue;
    if (index <= previousIndex) {
      errors.push(`${SOURCE}: curriculum見出しの順序が不正です: ${heading}`);
    }
    previousIndex = index;
  }

  const position = section(chapterSection, POSITION_HEADING, [COMMON_HEADING], errors);
  if (position) requireTokens(position, [
    '設計レビュー用の例示',
    '普遍的な推奨標準でも教育政策案でもありません',
    '固定年齢を表すものではなく',
    '仮ラベル',
  ], '例示と政策提案の境界', errors);
  if (position) rejectContradictions(position, POSITION_CONTRADICTIONS, '例示と政策提案の境界', errors);

  const common = section(chapterSection, COMMON_HEADING, [PLURALISM_HEADING], errors);
  if (common) requireTokens(common, [
    '`Curriculum Applicability Record`',
    '国・地域',
    '学校種',
    '専門課程',
    '支援ニーズ',
    '年齢適合',
  ], '制度・対象層のローカライズ条件', errors);

  if (common) requireTokens(common, [
    '人間による監督',
    '個人情報・機密情報を入力しない',
    '出力の検証方法',
    '非AIの代替手段',
    'アクセシビリティ',
    '確保できない場合は、その活動を実施しない',
    '能力の代理指標にしません',
    '前提、手順、根拠、不確実性',
  ], 'AI利用時のsafeguard', errors);
  if (common) rejectContradictions(common, COMMON_CONTRADICTIONS, 'AI利用時のsafeguard', errors);

  const pluralism = section(chapterSection, PLURALISM_HEADING, [STAGES[0]], errors);
  if (pluralism) {
    requireTokens(pluralism, [
      '教えること',
      '採用させること',
      '二元論',
      '現象学的な批判',
      '創発論・非還元的立場',
      '比較対象に含めます',
      '支持理由、反例、説明できる範囲、未解決点',
      '同じルーブリックで扱い',
      '学習者の信条そのものを評価しません',
      '[第1章の主張範囲](../chapter01/)',
      '[第3章6.2節の他理論からの批判](../chapter03/)',
      '[付録Aの機能主義・クオリア・ハードプロブレム](../../appendices/appendix01/)',
    ], '哲学的多元性の契約', errors);
    rejectContradictions(pluralism, PLURALISM_CONTRADICTIONS, '哲学的多元性の契約', errors);
  }

  for (let index = 0; index < STAGES.length; index += 1) {
    const heading = STAGES[index];
    const following = [...STAGES.slice(index + 1), NEXT_HEADING];
    const stageScope = section(chapterSection, heading, following, errors);
    if (stageScope) validateStage(stageScope, heading, errors);
  }

  for (const forbidden of [
    '**初等教育**',
    '**中等教育**',
    '**高等教育**',
    '普遍的な推奨標準です',
    '教育政策案です',
  ]) {
    if (chapterSection.includes(forbidden)) {
      errors.push(`${SOURCE}: 境界のない旧表現または禁止表現が残っています: ${forbidden}`);
    }
  }
}

function main() {
  const root = parseArgs(process.argv.slice(2));
  const errors = [];
  const source = read(root, SOURCE, errors);
  const generated = read(root, GENERATED, errors);

  if (source) validateCurriculum(source, errors);
  if (source && generated && stripGeneratedFrontMatter(generated) !== source) {
    errors.push(`${GENERATED}: ${SOURCE}から生成された本文と一致しません。npm run buildを実行してください`);
  }

  if (errors.length) {
    console.error(`Curriculum boundary contract failed (${errors.length} errors):`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log(`Curriculum boundary contract OK: ${STAGES.length} stages, ${REQUIRED_FIELDS.length} required fields per stage, generated sync verified`);
}

main();
