#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = process.cwd();

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    const detail = options.capture
      ? `\n${result.stdout || ''}${result.stderr || ''}`
      : '';
    throw new Error(`${command} ${args.join(' ')} failed (${result.status})${detail}`);
  }
  return options.capture ? result.stdout : '';
}

function gitStatus(pathspec) {
  const args = ['status', '--porcelain=v1', '--untracked-files=all'];
  if (pathspec) {
    args.push('--', pathspec);
  }
  return run('git', args, { capture: true });
}

function generatedFiles() {
  const tracked = run('git', ['ls-files', '-z', '--', 'docs'], { capture: true });
  const untracked = run(
    'git',
    ['ls-files', '-z', '--others', '--exclude-standard', '--', 'docs'],
    { capture: true }
  );

  return [...new Set((tracked + untracked).split('\0').filter(Boolean))].sort();
}

function hashGeneratedTree() {
  const treeHash = crypto.createHash('sha256');
  for (const relativePath of generatedFiles()) {
    const fileHash = crypto
      .createHash('sha256')
      .update(fs.readFileSync(path.join(root, relativePath)))
      .digest('hex');
    treeHash.update(relativePath);
    treeHash.update('\0');
    treeHash.update(fileHash);
    treeHash.update('\n');
  }
  return treeHash.digest('hex');
}

function assertUnchanged(label, baselineStatus) {
  const docsStatus = gitStatus('docs');
  if (docsStatus) {
    throw new Error(`${label}: docs/ drift detected:\n${docsStatus}`);
  }

  const currentStatus = gitStatus();
  if (currentStatus !== baselineStatus) {
    throw new Error(
      `${label}: build changed the worktree.\n` +
      `Before:\n${baselineStatus || '(clean)\n'}` +
      `After:\n${currentStatus || '(clean)\n'}`
    );
  }
}

function main() {
  const initialDocsStatus = gitStatus('docs');
  if (initialDocsStatus) {
    throw new Error(`preflight: docs/ must match the checked-out revision:\n${initialDocsStatus}`);
  }
  const baselineStatus = gitStatus();

  run('npm', ['run', 'build']);
  assertUnchanged('first build', baselineStatus);
  const firstHash = hashGeneratedTree();

  run('npm', ['run', 'build']);
  assertUnchanged('second build', baselineStatus);
  const secondHash = hashGeneratedTree();

  if (firstHash !== secondHash) {
    throw new Error(`generated tree hash mismatch: ${firstHash} != ${secondHash}`);
  }

  console.log(`Build determinism check passed: ${firstHash}`);
}

try {
  main();
} catch (error) {
  console.error(`Build determinism check failed: ${error.message}`);
  process.exit(1);
}
