#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const repositoryRoot = path.resolve(__dirname, '..');
const checker = path.join(repositoryRoot, 'scripts', 'check-claim-class-contract.js');
const scratchParent = path.join(repositoryRoot, '.codex-local', 'tmp');
const codexLocalRoot = path.dirname(scratchParent);
const scratchParentExisted = fs.existsSync(scratchParent);
const codexLocalRootExisted = fs.existsSync(codexLocalRoot);
const scratchRoot = path.join(scratchParent, `claim-class-regression-${process.pid}`);
const fixtureFiles = [
  'src/appendices/appendix02/index.md',
  'src/chapters/chapter03/index.md',
  'src/chapters/chapter04/index.md',
  'src/chapters/chapter05/index.md',
  'docs/appendices/appendix02/index.md',
  'docs/chapters/chapter03/index.md',
  'docs/chapters/chapter04/index.md',
  'docs/chapters/chapter05/index.md',
];

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
  for (const relative of fixtureFiles) {
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
  return {
    status: result.status,
    output: `${result.stdout || ''}${result.stderr || ''}`,
  };
}

function replaceOnce(file, oldText, newText) {
  const text = fs.readFileSync(file, 'utf8');
  const count = text.split(oldText).length - 1;
  if (count !== 1) throw new Error(`${file}: expected one occurrence, got ${count}: ${oldText}`);
  fs.writeFileSync(file, text.replace(oldText, newText), 'utf8');
}

function pairPaths(root, sourceRelative) {
  return [sourceRelative, sourceRelative.replace(/^src\//, 'docs/')].map((relative) => path.join(root, relative));
}

function replacePair(root, sourceRelative, oldText, newText) {
  for (const file of pairPaths(root, sourceRelative)) replaceOnce(file, oldText, newText);
}

const cases = [
  {
    name: 'missing-section-marker',
    expected: '内容を持つ見出し直下の主張区分がありません',
    mutate(root) {
      replacePair(
        root,
        'src/chapters/chapter03/index.md',
        '### 5.2 予測と検証可能性\n\n> **主張区分**: `数学的・形式的主張` / `思考実験・擬似コード` / `仮説・将来予測` / `編集上の解釈`',
        '### 5.2 予測と検証可能性'
      );
    },
  },
  {
    name: 'unregistered-new-section',
    expected: '内容を持つ見出し直下の主張区分がありません',
    mutate(root) {
      replacePair(root, 'src/chapters/chapter04/index.md', '## 結論：実装可能な未来へ', '### 6.3 新設した評価節\n\nこの段落には分類表示がない。\n\n## 結論：実装可能な未来へ');
    },
  },
  {
    name: 'delayed-section-marker',
    expected: '内容を持つ見出し直下の主張区分がありません',
    mutate(root) {
      replacePair(root, 'src/chapters/chapter04/index.md', '### 1.1 実装可能な評価フレームワーク\n\n> **主張区分**:', '### 1.1 実装可能な評価フレームワーク\n\n分類されていない導入文。\n\n> **主張区分**:');
    },
  },
  {
    name: 'range-not-hypothesis',
    expected: '5.2節は仮説・将来予測に分類',
    mutate(root) {
      replacePair(root, 'src/chapters/chapter03/index.md', ' / `仮説・将来予測` / `編集上の解釈`\n\n「計算量」', ' / `実証済み事実` / `編集上の解釈`\n\n「計算量」');
    },
  },
  {
    name: 'missing-confirmed-date',
    expected: '時点依存情報には直後の確認日が必要',
    mutate(root) {
      replacePair(root, 'src/chapters/chapter03/index.md', '> **確認日**: 2026-07-21\n> **再確認条件**: 参照研究の対象モデル・課題を超える一般化根拠、または新しい推論方式の評価結果が得られたとき', '> **再確認条件**: 参照研究の対象モデル・課題を超える一般化根拠、または新しい推論方式の評価結果が得られたとき');
    },
  },
  {
    name: 'missing-recheck-condition',
    expected: '具体的な再確認条件が必要',
    mutate(root) {
      replacePair(root, 'src/chapters/chapter05/index.md', '> **再確認条件**: EU AI Act本文、適用日程、実施規則、ガイドライン、または対象ユースケースが変わったとき\n', '');
    },
  },
  {
    name: 'stale-realization-label',
    expected: '範囲が曖昧な旧表現',
    mutate(root) {
      replacePair(root, 'src/chapters/chapter03/index.md', '        "method": "候補生成 + 事前定義した人間評価",', '        "method": "候補生成 + 事前定義した人間評価",\n        "validation": "既に部分的に実現",');
    },
  },
  {
    name: 'unclassified-number',
    expected: '数値claimが無分類',
    mutate(root) {
      replacePair(root, 'src/chapters/chapter04/index.md', '## 1. 知性の計算量評価システム\n\n### 1.1', '## 1. 知性の計算量評価システム\n\n評価上限は10^30 FLOPとする。\n\n### 1.1');
    },
  },
  {
    name: 'unclassified-norm',
    expected: '規範claimが無分類',
    mutate(root) {
      replacePair(root, 'src/chapters/chapter04/index.md', '## 1. 知性の計算量評価システム\n\n### 1.1', '## 1. 知性の計算量評価システム\n\n全システムは必ずこの方式を採用すべきである。\n\n### 1.1');
    },
  },
  {
    name: 'unclassified-prediction',
    expected: '予測claimが無分類',
    mutate(root) {
      replacePair(root, 'src/chapters/chapter04/index.md', '## 1. 知性の計算量評価システム\n\n### 1.1', '## 1. 知性の計算量評価システム\n\nこの方式が将来の標準になると予測する。\n\n### 1.1');
    },
  },
  {
    name: 'unclassified-current-status',
    expected: '時点依存claimが無分類',
    mutate(root) {
      replacePair(root, 'src/chapters/chapter04/index.md', '## 1. 知性の計算量評価システム\n\n### 1.1', '## 1. 知性の計算量評価システム\n\n現在、この方式が主流論点である。\n\n### 1.1');
    },
  },
  {
    name: 'missing-class-definition',
    expected: '主張区分の定義がありません',
    mutate(root) {
      replacePair(root, 'src/appendices/appendix02/index.md', '- **仮説・将来予測**: 反証・更新の対象となる概算、シナリオ、将来像。観測済みの事実として扱わない記述。\n', '');
    },
  },
  {
    name: 'generated-docs-drift',
    expected: '生成された本文と一致しません',
    mutate(root) {
      fs.appendFileSync(path.join(root, 'docs/chapters/chapter05/index.md'), '\n<!-- stale -->\n');
    },
  },
  {
    name: 'unknown-class',
    expected: '未定義の主張区分',
    mutate(root) {
      replacePair(root, 'src/chapters/chapter04/index.md', '> **主張区分**: `編集上の解釈`\n\n第1章〜第3章', '> **主張区分**: `確定済み予言`\n\n第1章〜第3章');
    },
  },
  {
    name: 'missing-range-derivation-boundary',
    expected: '計算量・創造性の限定契約が不足',
    mutate(root) {
      replacePair(root, 'src/chapters/chapter03/index.md', '参照文献から導出した推定値ではなく', '参考値であり');
    },
  },
  {
    name: 'missing-appendix-display-contract',
    expected: '表示契約が不足',
    mutate(root) {
      replacePair(root, 'src/appendices/appendix02/index.md', '### 本文での表示契約', '### 本文での分類例');
    },
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

  console.log(`Claim class regression OK: ${negativePassed}/${cases.length} negative, 1/1 positive, ${cliPassed}/2 CLI misuse`);
} finally {
  cleanup();
}
