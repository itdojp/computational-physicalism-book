#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ALLOWED_CLASSES = [
  '実証済み事実',
  '数学的・形式的主張',
  '哲学的立場',
  '思考実験・擬似コード',
  '編集上の解釈',
  '仮説・将来予測',
  '時点依存情報',
];

const TARGETS = {
  'src/chapters/chapter03/index.md': [
    '## はじめに',
    '### 1.1 古典的計算主義（Computational Theory of Mind）',
    '### 1.2 コネクショニズム',
    '### 2.1 統合情報理論（IIT）',
    '### 2.2 グローバルワークスペース理論（GWT）',
    '### 3.1 渡辺正峰：意識のアルゴリズム説',
    '### 3.2 前野隆司：受動意識仮説',
    '### 3.3 石黒浩：人間とロボットの境界',
    '### 4.1 Transformerとスケーリング則（学習時計算量）',
    '### 4.2 創発的能力（Emergent Abilities）',
    '### 4.3 推論時（test-time）計算量スケーリング',
    '### 5.1 統一的フレームワーク',
    '### 5.2 予測と検証可能性',
    '### 6.1 本理論の限界',
    '### 6.2 他理論からの予想される批判',
    '## 結論',
  ],
  'src/chapters/chapter04/index.md': [
    '## はじめに',
    '## 本章のコードについて（重要）',
    '### 1.1 実装可能な評価フレームワーク',
    '### 1.2 ベンチマークスイート',
    '### 1.3 指標の選び方（`actual_steps` の限界と代替）',
    '### 1.4 最小実装＋評価ハーネス（動く実験）',
    '### 2.1 制約によるランダム性の導入',
    '### 2.2 評価関数の動的生成',
    '### 3.1 マルチレベル処理システム',
    '### 3.2 計算資源の動的配分',
    '### 4.1 相互学習フレームワーク',
    '### 4.2 価値アラインメント機構',
    '## 5. 実装ロードマップ（例示）',
    '### 5.1 短期（1〜3年）：基盤技術の確立',
    '### 5.2 中期（3〜10年）：人間レベルへの接近',
    '### 5.3 長期（10〜30年）：共進化の実現',
    '### 6.1 リファレンス実装',
    '### 6.2 コミュニティプロジェクト',
    '## 結論：実装可能な未来へ',
  ],
  'src/chapters/chapter05/index.md': [
    '## はじめに',
    '## 5.1 人間の尊厳と価値の再定義',
    '### 計算的存在としての尊厳',
    '### 多様性の価値',
    '## 5.2 教育システムへの影響',
    '### 従来の教育の限界',
    '### 新しい教育の方向性',
    '### 具体的なカリキュラム例',
    '## 5.3 労働と創造性の未来',
    '### 労働の計算的理解',
    '### 創造性の民主化',
    '### 新たな職業の展望',
    '## 5.4 民主主義と意思決定',
    '### 集合知としての民主主義',
    '### 意思決定の拡張',
    '### 新たな社会契約',
    '## 5.5 実務ガバナンス（規制・標準）と運用への接続',
    '### 5.5.1 EU AI Act（概要）',
    '### 5.5.2 NIST AI RMF（リスク管理の骨格）',
    '### 5.5.3 ISO/IEC 42001（AIマネジメントシステム）',
    '### 5.5.4 運用チェックリスト（最小）',
    '## 5.6 エネルギー・電力制約（物理制約）を運用に落とす',
    '## 結論：尊厳ある共存へ',
  ],
};

const RISK_RULES = [
  {
    name: '数値',
    pattern: /(?:10\^\d+|\b\d+(?:\.\d+)?(?:\s*[〜~–-]\s*\d+(?:\.\d+)?)?\s*(?:FLOP(?:\/s|\/req|\/token)?|年|%|回|GB|TB|ms|秒|分|時間|req|token))/i,
    accepts: () => true,
    requirement: 'いずれかの主張区分',
  },
  {
    name: '規範',
    pattern: /(?:すべき|必要(?:です|が|に|とな|とする|な)|求められ|推奨(?:します|する)|重要(?:です|なの|とな)|しなければ|必ず|用意する)/,
    accepts: (classes) => classes.has('編集上の解釈') || classes.has('哲学的立場'),
    requirement: '編集上の解釈または哲学的立場',
  },
  {
    name: '予測',
    pattern: /(?:予測|将来|今後|だろう|見込ま|未来|シナリオ|かもしれない|実現可能|実現する)/,
    accepts: (classes) => classes.has('仮説・将来予測'),
    requirement: '仮説・将来予測',
  },
  {
    name: '時点依存',
    pattern: /(?:現在|現時点|近年|既に|最新|増えている|主流論点|202[0-9]年)/,
    accepts: (classes) => classes.has('時点依存情報'),
    requirement: '時点依存情報、確認日、再確認条件',
  },
];

function failUsage(message) {
  if (message) console.error(message);
  console.error('Usage: node scripts/check-claim-class-contract.js --root <repository-root>');
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
  const absolute = path.join(root, relative);
  try {
    return fs.readFileSync(absolute, 'utf8');
  } catch (error) {
    errors.push(`${relative}: 読み込めません: ${error.message}`);
    return '';
  }
}

function parseMarker(lines, index, file, errors) {
  const classMatches = [...lines[index].matchAll(/`([^`]+)`/g)].map((match) => match[1]);
  if (!classMatches.length) {
    errors.push(`${file}:${index + 1}: 主張区分をバッククォート付きで1件以上指定してください`);
  }

  const classes = new Set(classMatches);
  for (const claimClass of classes) {
    if (!ALLOWED_CLASSES.includes(claimClass)) {
      errors.push(`${file}:${index + 1}: 未定義の主張区分です: ${claimClass}`);
    }
  }

  const confirmedLine = lines[index + 1] || '';
  const recheckLine = lines[index + 2] || '';
  const confirmed = confirmedLine.match(/^> \*\*確認日\*\*: (\d{4}-\d{2}-\d{2})$/);
  const recheck = recheckLine.match(/^> \*\*再確認条件\*\*: (.+)$/);

  if (classes.has('時点依存情報')) {
    if (!confirmed) errors.push(`${file}:${index + 1}: 時点依存情報には直後の確認日が必要です`);
    if (!recheck || recheck[1].trim().length < 10) {
      errors.push(`${file}:${index + 1}: 時点依存情報には具体的な再確認条件が必要です`);
    }
  } else if (confirmed || recheck) {
    errors.push(`${file}:${index + 1}: 確認日・再確認条件を記す場合は時点依存情報を含めてください`);
  }

  return { classes, hasConfirmed: Boolean(confirmed), hasRecheck: Boolean(recheck) };
}

function lineIsContent(line) {
  const trimmed = line.trim();
  return trimmed &&
    !trimmed.startsWith('#') &&
    !trimmed.startsWith('> **主張区分**:') &&
    !trimmed.startsWith('> **確認日**:') &&
    !trimmed.startsWith('> **再確認条件**:') &&
    trimmed !== '---';
}

function validateChapter(root, file, expectedHeadings, errors) {
  const text = read(root, file, errors);
  if (!text) return;
  const lines = text.split(/\r?\n/);
  const headings = new Map();
  lines.forEach((line, index) => {
    if (/^#{2,3} /.test(line)) {
      if (headings.has(line)) errors.push(`${file}:${index + 1}: 見出しが重複しています: ${line}`);
      headings.set(line, index);
    }
  });

  for (const heading of expectedHeadings) {
    const headingIndex = headings.get(heading);
    if (headingIndex === undefined) {
      errors.push(`${file}: 必須見出しがありません: ${heading}`);
      continue;
    }
  }

  // Fail closed for future section additions and heading changes. Every level 2/3
  // section that owns content must start with a marker; grouping headings whose
  // next nonblank line is another heading may omit one.
  for (let headingIndex = 0; headingIndex < lines.length; headingIndex += 1) {
    const heading = lines[headingIndex];
    if (!/^#{2,3} /.test(heading)) continue;
    let firstNonblank = headingIndex + 1;
    while (firstNonblank < lines.length && !lines[firstNonblank].trim()) firstNonblank += 1;
    if (firstNonblank >= lines.length || /^#{1,3} /.test(lines[firstNonblank])) continue;
    if (!lines[firstNonblank].startsWith('> **主張区分**:')) {
      errors.push(`${file}:${headingIndex + 1}: 内容を持つ見出し直下の主張区分がありません: ${heading}`);
    }
  }

  let inFence = false;
  let activeMarker = null;
  let activeHeading = '# (章先頭)';
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (/^#{1,6} /.test(line)) {
      activeHeading = line;
      activeMarker = null;
      continue;
    }
    if (line.startsWith('> **主張区分**:')) {
      activeMarker = parseMarker(lines, index, file, errors);
      continue;
    }
    if (!lineIsContent(line)) continue;

    for (const rule of RISK_RULES) {
      if (!rule.pattern.test(line)) continue;
      if (!activeMarker) {
        errors.push(`${file}:${index + 1}: ${rule.name}claimが無分類です（${activeHeading}）: ${line.trim()}`);
        continue;
      }
      if (!rule.accepts(activeMarker.classes)) {
        errors.push(`${file}:${index + 1}: ${rule.name}claimには${rule.requirement}が必要です: ${line.trim()}`);
      }
      if (rule.name === '時点依存' && (!activeMarker.hasConfirmed || !activeMarker.hasRecheck)) {
        errors.push(`${file}:${index + 1}: 時点依存claimの確認日または再確認条件が不足しています`);
      }
    }
  }
  if (inFence) errors.push(`${file}: code fenceが閉じていません`);
}

function stripGeneratedFrontMatter(text) {
  return text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n\r?\n/, '');
}

function validateGeneratedSync(root, sourceFile, errors) {
  const docsFile = sourceFile.replace(/^src\//, 'docs/');
  const source = read(root, sourceFile, errors);
  const generated = read(root, docsFile, errors);
  if (!source || !generated) return;
  if (stripGeneratedFrontMatter(generated) !== source) {
    errors.push(`${docsFile}: ${sourceFile}から生成された本文と一致しません。npm run buildを実行してください`);
  }
}

function validateAppendix(root, errors) {
  const file = 'src/appendices/appendix02/index.md';
  const text = read(root, file, errors);
  if (!text) return;
  for (const claimClass of ALLOWED_CLASSES) {
    const definition = `- **${claimClass}**:`;
    if (!text.includes(definition)) errors.push(`${file}: 主張区分の定義がありません: ${claimClass}`);
  }
  for (const required of [
    '### 本文での表示契約',
    '> **主張区分**:',
    '> **確認日**:',
    '> **再確認条件**:',
    '数値レンジは、出典または導出経路を示します',
  ]) {
    if (!text.includes(required)) errors.push(`${file}: 表示契約が不足しています: ${required}`);
  }
}

function validateDirectContracts(root, errors) {
  const file = 'src/chapters/chapter03/index.md';
  const text = read(root, file, errors);
  for (const required of [
    '10^25〜10^30 FLOP',
    '参照文献から導出した推定値ではなく',
    '意思決定根拠には使用しません',
    '対象タスク、評価指標、モデル、データ、アルゴリズムを固定した再現可能な見積り',
    '芸術的創造一般の価値や最適解を定義できるとは主張しない',
  ]) {
    if (!text.includes(required)) errors.push(`${file}: 計算量・創造性の限定契約が不足しています: ${required}`);
  }
  for (const forbidden of [
    '既に部分的に実現',
    '近年の主流論点',
    '芸術的創造もA/Bテストで最適化可能',
  ]) {
    if (text.includes(forbidden)) errors.push(`${file}: 範囲が曖昧な旧表現が残っています: ${forbidden}`);
  }

  const heading = '### 5.2 予測と検証可能性';
  const start = text.indexOf(heading);
  const end = text.indexOf('\n## ', start + heading.length);
  const section = text.slice(start, end === -1 ? text.length : end);
  const markerLine = section.split(/\r?\n/).find((line) => line.startsWith('> **主張区分**:')) || '';
  if (!markerLine.includes('`仮説・将来予測`')) {
    errors.push(`${file}: 10^25〜10^30 FLOPを含む5.2節は仮説・将来予測に分類してください`);
  }
}

function main() {
  const root = parseArgs(process.argv.slice(2));
  const errors = [];
  validateAppendix(root, errors);
  for (const [file, headings] of Object.entries(TARGETS)) {
    validateChapter(root, file, headings, errors);
    validateGeneratedSync(root, file, errors);
  }
  validateGeneratedSync(root, 'src/appendices/appendix02/index.md', errors);
  validateDirectContracts(root, errors);

  if (errors.length) {
    console.error(`Claim class contract failed (${errors.length} errors):`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  const headingCount = Object.values(TARGETS).reduce((sum, headings) => sum + headings.length, 0);
  console.log(`Claim class contract OK: ${Object.keys(TARGETS).length} chapters, ${headingCount} classified sections, generated sync verified`);
}

main();
