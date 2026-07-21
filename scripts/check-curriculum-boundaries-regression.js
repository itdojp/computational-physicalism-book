#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const repositoryRoot = path.resolve(__dirname, '..');
const checker = path.join(repositoryRoot, 'scripts', 'check-curriculum-boundaries.js');
const scratchParent = path.join(repositoryRoot, '.codex-local', 'tmp');
const codexLocalRoot = path.dirname(scratchParent);
const scratchParentExisted = fs.existsSync(scratchParent);
const codexLocalRootExisted = fs.existsSync(codexLocalRoot);
const scratchRoot = path.join(scratchParent, `curriculum-boundaries-regression-${process.pid}`);
const sourceRelative = 'src/chapters/chapter05/index.md';
const docsRelative = 'docs/chapters/chapter05/index.md';

const STAGES = [
  '#### 初等段階に相当する例',
  '#### 中等段階に相当する例',
  '#### 高等・専門段階に相当する例',
];
const POSITION_HEADING = '#### 例示の位置づけ';
const COMMON_HEADING = '#### 共通の適用条件とAI利用時の安全策';
const PLURALISM_HEADING = '#### 哲学的多元性を守る授業契約';
const FIELDS = ['対象層', '前提知識', '学習目的', '学習活動例', '評価方法', '適用しない条件'];

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
  for (const relative of [sourceRelative, docsRelative]) {
    const destination = path.join(root, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(repositoryRoot, relative), destination);
  }
  return root;
}

function pair(root) {
  return [sourceRelative, docsRelative].map((relative) => path.join(root, relative));
}

function runChecker(root, extraArgs = []) {
  const result = spawnSync(process.execPath, [checker, '--root', root, ...extraArgs], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  });
  return { status: result.status, output: `${result.stdout || ''}${result.stderr || ''}` };
}

function replaceOnce(file, oldText, newText) {
  const text = fs.readFileSync(file, 'utf8');
  const occurrences = text.split(oldText).length - 1;
  if (occurrences !== 1) {
    throw new Error(`${file}: expected one occurrence, got ${occurrences}: ${oldText}`);
  }
  fs.writeFileSync(file, text.replace(oldText, newText), 'utf8');
}

function replacePair(root, oldText, newText) {
  for (const file of pair(root)) replaceOnce(file, oldText, newText);
}

function sectionBounds(text, heading) {
  const start = text.indexOf(heading);
  if (start === -1) throw new Error(`section not found: ${heading}`);
  const level = heading.match(/^#+/)[0].length;
  const headings = /^(#+) /gm;
  headings.lastIndex = start + heading.length;
  let end = text.length;
  let match;
  while ((match = headings.exec(text)) !== null) {
    if (match[1].length <= level) {
      end = match.index;
      break;
    }
  }
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

function replaceInSection(root, heading, oldText, newText) {
  mutateSectionPair(root, heading, (scope) => {
    const occurrences = scope.split(oldText).length - 1;
    if (occurrences !== 1) {
      throw new Error(`${heading}: expected one occurrence, got ${occurrences}: ${oldText}`);
    }
    return scope.replace(oldText, newText);
  });
}

const cases = [
  {
    name: 'missing-position-heading', expected: `見出しは1件必要です（0件）: ${POSITION_HEADING}`,
    mutate(root) { replacePair(root, POSITION_HEADING, '#### 位置づけメモ'); },
  },
  {
    name: 'missing-common-heading', expected: `見出しは1件必要です（0件）: ${COMMON_HEADING}`,
    mutate(root) { replacePair(root, COMMON_HEADING, '#### 共通メモ'); },
  },
  {
    name: 'missing-pluralism-heading', expected: `見出しは1件必要です（0件）: ${PLURALISM_HEADING}`,
    mutate(root) { replacePair(root, PLURALISM_HEADING, '#### 理論比較メモ'); },
  },
  {
    name: 'heading-phrase-in-prose', expected: `見出しは1件必要です（0件）: ${POSITION_HEADING}`,
    mutate(root) { replacePair(root, POSITION_HEADING, `#### 位置づけメモ\n\n旧見出し名は「${POSITION_HEADING}」です。`); },
  },
  {
    name: 'invalid-heading-order', expected: `curriculum見出しの順序が不正です: ${PLURALISM_HEADING}`,
    mutate(root) {
      for (const file of pair(root)) {
        const text = fs.readFileSync(file, 'utf8');
        const positionStart = text.indexOf(POSITION_HEADING);
        const commonStart = text.indexOf(COMMON_HEADING);
        const pluralismStart = text.indexOf(PLURALISM_HEADING);
        if (!(positionStart < commonStart && commonStart < pluralismStart)) {
          throw new Error(`${file}: expected canonical heading order`);
        }
        const commonBlock = text.slice(commonStart, pluralismStart);
        const pluralismEnd = text.indexOf(STAGES[0], pluralismStart);
        const pluralismBlock = text.slice(pluralismStart, pluralismEnd);
        fs.writeFileSync(
          file,
          text.slice(0, commonStart) + pluralismBlock + commonBlock + text.slice(pluralismEnd),
          'utf8',
        );
      }
    },
  },
  {
    name: 'missing-example-boundary', expected: '設計レビュー用の例示',
    mutate(root) { replacePair(root, '設計レビュー用の例示', 'curriculum案'); },
  },
  {
    name: 'missing-policy-boundary', expected: '普遍的な推奨標準でも教育政策案でもありません',
    mutate(root) { replacePair(root, '普遍的な推奨標準でも教育政策案でもありません', '標準として採用できます'); },
  },
  {
    name: 'missing-fixed-age-boundary', expected: '固定年齢を表すものではなく',
    mutate(root) { replacePair(root, '固定年齢を表すものではなく', '共通の固定年齢を表し'); },
  },
  {
    name: 'additive-fixed-age-downgrade', expected: '例示と政策提案の境界の意味を逆転させる禁止表現',
    mutate(root) { replacePair(root, '実施地域の制度へ対応づけるための仮ラベルです。', '実施地域の制度へ対応づけるための仮ラベルです。初等段階には固定年齢帯を設定します。'); },
  },
  {
    name: 'missing-applicability-record', expected: '`Curriculum Applicability Record`',
    mutate(root) { replacePair(root, '`Curriculum Applicability Record`', '`Curriculum Memo`'); },
  },
  {
    name: 'missing-region', expected: '国・地域',
    mutate(root) { replacePair(root, '国・地域の学習指導要領', '共通の学習指導要領'); },
  },
  {
    name: 'missing-school-type', expected: '学校種',
    mutate(root) { replacePair(root, '学校種', '教育施設'); },
  },
  {
    name: 'missing-specialization', expected: '専門課程',
    mutate(root) {
      replacePair(root, '専門課程との対応', '専攻との対応');
      replacePair(root, '専門課程ごと', '専攻ごと');
      replacePair(root, '専門課程の能力基準', '専攻の能力基準');
    },
  },
  {
    name: 'missing-support-needs', expected: '支援ニーズ',
    mutate(root) { replacePair(root, '障害や支援ニーズ', '学習状況'); },
  },
  {
    name: 'missing-age-appropriateness', expected: '年齢適合',
    mutate(root) {
      replacePair(root, '学校が承認した年齢適合な環境', '学校が承認した共通の環境');
      replacePair(root, '年齢適合な環境、教員の直接監督', '共通の環境、教員の直接監督');
    },
  },
  {
    name: 'missing-human-oversight', expected: '人間による監督',
    mutate(root) { replacePair(root, '人間による監督', '自動監督'); },
  },
  {
    name: 'missing-private-data-boundary', expected: '個人情報・機密情報を入力しない',
    mutate(root) { replacePair(root, '個人情報・機密情報を入力しない', '入力情報を選ぶ'); },
  },
  {
    name: 'missing-output-verification', expected: '出力の検証方法',
    mutate(root) { replacePair(root, '出力の検証方法', '出力の保存方法'); },
  },
  {
    name: 'missing-non-ai-alternative', expected: '非AIの代替手段',
    mutate(root) { replacePair(root, '非AIの代替手段', '別のAI手段'); },
  },
  {
    name: 'missing-accessibility-stop-condition', expected: 'アクセシビリティ',
    mutate(root) { replacePair(root, 'アクセシビリティ', '操作性'); },
  },
  {
    name: 'missing-stop-relation', expected: '確保できない場合は、その活動を実施しない',
    mutate(root) { replacePair(root, '確保できない場合は、その活動を実施しない', '記録できない場合は後で検討する'); },
  },
  {
    name: 'missing-proxy-assessment-boundary', expected: '能力の代理指標にしません',
    mutate(root) { replacePair(root, '能力の代理指標にしません', '能力の参考値として扱います'); },
  },
  {
    name: 'additive-proxy-assessment-downgrade', expected: 'AI利用時のsafeguardの意味を逆転させる禁止表現',
    mutate(root) { replacePair(root, '学習者自身が前提、手順、根拠、不確実性を説明できることを評価します。', '学習者自身が前提、手順、根拠、不確実性を説明できることを評価します。会話量と流暢さは補助評価に使います。'); },
  },
  ...STAGES.map((heading) => ({
    name: `missing-stage-${STAGES.indexOf(heading) + 1}`,
    expected: `見出しは1件必要です（0件）: ${heading}`,
    mutate(root) { replacePair(root, heading, heading.replace('に相当する例', '区分')); },
  })),
  ...STAGES.flatMap((heading, stageIndex) => FIELDS.map((field) => ({
    name: `stage-${stageIndex + 1}-missing-${field}`,
    expected: `${heading}の${field}は1件必要です（0件）`,
    mutate(root) { replaceInSection(root, heading, `- **${field}**：`, `- **${field}メモ**：`); },
  }))),
  {
    name: 'empty-field', expected: `${STAGES[0]}の対象層に具体的な内容が必要です`,
    mutate(root) {
      mutateSectionPair(root, STAGES[0], (scope) => scope.replace(/^- \*\*対象層\*\*：.*$/m, '- **対象層**：'));
    },
  },
  {
    name: 'whitespace-field', expected: `${STAGES[1]}の前提知識に具体的な内容が必要です`,
    mutate(root) {
      mutateSectionPair(root, STAGES[1], (scope) => scope.replace(/^- \*\*前提知識\*\*：.*$/m, '- **前提知識**：     '));
    },
  },
  {
    name: 'punctuation-field', expected: `${STAGES[2]}の評価方法に具体的な内容が必要です`,
    mutate(root) {
      mutateSectionPair(root, STAGES[2], (scope) => scope.replace(/^- \*\*評価方法\*\*：.*$/m, '- **評価方法**：------------'));
    },
  },
  {
    name: 'placeholder-assessment', expected: `${STAGES[0]}の評価方法にplaceholderまたは先送り表現があります`,
    mutate(root) {
      mutateSectionPair(root, STAGES[0], (scope) => scope.replace(/^- \*\*評価方法\*\*：.*$/m, '- **評価方法**：評価方法は未定であり、詳細は後日決める予定です'));
    },
  },
  {
    name: 'target-without-learner', expected: `${STAGES[1]}の対象層に対象となる学習者が必要です`,
    mutate(root) {
      mutateSectionPair(root, STAGES[1], (scope) => scope.replace(/^- \*\*対象層\*\*：.*$/m, '- **対象層**：地域の中等段階に相当する数学・情報・言語科目'));
    },
  },
  {
    name: 'target-universalized-by-addition', expected: `${STAGES[0]}の対象層の意味を逆転させる禁止表現`,
    mutate(root) {
      mutateSectionPair(root, STAGES[0], (scope) => scope.replace(/^- \*\*対象層\*\*：.*$/m, (line) => `${line}。学習者や年齢を問わず一律に適用する`));
    },
  },
  {
    name: 'prerequisite-negated-by-addition', expected: `${STAGES[1]}の前提知識の意味を逆転させる禁止表現`,
    mutate(root) {
      mutateSectionPair(root, STAGES[1], (scope) => scope.replace(/^- \*\*前提知識\*\*：.*$/m, (line) => `${line}。前提知識は不要とする`));
    },
  },
  {
    name: 'objective-negated-by-addition', expected: `${STAGES[2]}の学習目的の意味を逆転させる禁止表現`,
    mutate(root) {
      mutateSectionPair(root, STAGES[2], (scope) => scope.replace(/^- \*\*学習目的\*\*：.*$/m, (line) => `${line}。学習目的の達成は問わない`));
    },
  },
  {
    name: 'assessment-reversed-by-addition', expected: `${STAGES[0]}の評価方法の意味を逆転させる禁止表現`,
    mutate(root) {
      mutateSectionPair(root, STAGES[0], (scope) => scope.replace(/^- \*\*評価方法\*\*：.*$/m, (line) => `${line}。AI出力をそのまま評価する`));
    },
  },
  {
    name: 'exclusion-reversed-by-addition', expected: `${STAGES[1]}の適用しない条件の意味を逆転させる禁止表現`,
    mutate(root) {
      mutateSectionPair(root, STAGES[1], (scope) => scope.replace(/^- \*\*適用しない条件\*\*：.*$/m, (line) => `${line}。条件を満たさない場合でも実施できる`));
    },
  },
  {
    name: 'duplicate-field', expected: `${STAGES[0]}の対象層は1件必要です（2件）`,
    mutate(root) {
      replaceInSection(root, STAGES[0], '- **対象層**：', '- **対象層**：追加対象。\n- **対象層**：');
    },
  },
  {
    name: 'crlf-section-mutation', expected: `${STAGES[0]}の対象層は1件必要です（0件）`,
    mutate(root) {
      for (const file of pair(root)) {
        const text = fs.readFileSync(file, 'utf8');
        fs.writeFileSync(file, text.replace(/\r?\n/g, '\r\n'), 'utf8');
      }
      replaceInSection(root, STAGES[0], '- **対象層**：', '- **対象層メモ**：');
    },
  },
  {
    name: 'missing-teach-adopt-boundary', expected: '採用させること',
    mutate(root) { replacePair(root, '採用させること', '理解させること'); },
  },
  {
    name: 'missing-dualism', expected: '二元論',
    mutate(root) { replacePair(root, '二元論、', '別の立場、'); },
  },
  {
    name: 'missing-phenomenology', expected: '現象学的な批判',
    mutate(root) { replacePair(root, '現象学的な批判', '一般的な批判'); },
  },
  {
    name: 'missing-non-reductive-position', expected: '創発論・非還元的立場',
    mutate(root) { replacePair(root, '創発論・非還元的立場', '別の物理主義'); },
  },
  {
    name: 'pluralism-name-only', expected: '比較対象に含めます',
    mutate(root) { replacePair(root, '比較対象に含めます', '名前を挙げるだけで十分とします'); },
  },
  {
    name: 'pluralism-no-common-rubric', expected: '同じルーブリックで扱い',
    mutate(root) { replacePair(root, '同じルーブリックで扱い', '立場ごとに異なる基準で扱い'); },
  },
  {
    name: 'pluralism-belief-scored-by-addition', expected: '哲学的多元性の契約の意味を逆転させる禁止表現',
    mutate(root) { replacePair(root, '学習者の信条そのものを評価しません。', '学習者の信条そのものを評価しません。計算論的物理主義への同意を加点対象にします。'); },
  },
  {
    name: 'belief-as-grade-boundary-missing', expected: '学習者の信条そのものを評価しません',
    mutate(root) { replacePair(root, '学習者の信条そのものを評価しません', '学習者の立場を採点します'); },
  },
  {
    name: 'criticism-route-missing', expected: '[第3章6.2節の他理論からの批判](../chapter03/)',
    mutate(root) { replacePair(root, '[第3章6.2節の他理論からの批判](../chapter03/)', '第3章を参照'); },
  },
  {
    name: 'legacy-stage-list-restored', expected: '境界のない旧表現または禁止表現が残っています: **初等教育**',
    mutate(root) { replaceInSection(root, STAGES[0], STAGES[0], `${STAGES[0]}\n\n**初等教育**`); },
  },
  {
    name: 'false-universal-standard', expected: '境界のない旧表現または禁止表現が残っています: 普遍的な推奨標準です',
    mutate(root) { replacePair(root, '普遍的な推奨標準でも教育政策案でもありません', '普遍的な推奨標準でも教育政策案でもありません。普遍的な推奨標準です'); },
  },
  {
    name: 'generated-docs-drift', expected: '生成された本文と一致しません',
    mutate(root) { fs.appendFileSync(path.join(root, docsRelative), '\n<!-- stale curriculum copy -->\n'); },
  },
];

let negativePassed = 0;
let positivePassed = 0;
let cliPassed = 0;

try {
  fs.mkdirSync(scratchRoot, { recursive: true });

  const positive = runChecker(createFixture('positive'));
  if (positive.status !== 0) throw new Error(`positive fixture failed:\n${positive.output}`);
  positivePassed += 1;

  const alternateRoot = createFixture('positive-alternate-content');
  replaceInSection(
    alternateRoot,
    STAGES[0],
    '教師が操作する承認済みAIの回答と教科書・観察結果の比較',
    '教師が準備した複数回答と観察記録を比べる活動',
  );
  const alternate = runChecker(alternateRoot);
  if (alternate.status !== 0) throw new Error(`alternate positive fixture failed:\n${alternate.output}`);
  positivePassed += 1;

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

  console.log(`Curriculum boundary regression OK: ${negativePassed}/${cases.length} negative, ${positivePassed}/2 positive, ${cliPassed}/2 CLI misuse`);
} finally {
  cleanup();
}
