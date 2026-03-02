#!/usr/bin/env node

/*
  Minimal benchmark: MCTS (test-time compute proxy = simulations per move) vs Random.
  No external dependencies.
*/

const { performance } = require('node:perf_hooks');

function parseArgs(argv) {
  const args = {
    games: 100,
    sims: [100],
    seed: 1,
    mctsPlayer: 'X', // X starts
    exploration: 1.41,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--games') args.games = Number(argv[++i]);
    else if (a === '--sims') args.sims = String(argv[++i]).split(',').map((s) => Number(s.trim()));
    else if (a === '--seed') args.seed = Number(argv[++i]);
    else if (a === '--mcts-player') args.mctsPlayer = String(argv[++i]).toUpperCase();
    else if (a === '--exploration') args.exploration = Number(argv[++i]);
  }

  if (!Number.isFinite(args.games) || args.games <= 0) throw new Error('--games must be a positive number');
  if (!Array.isArray(args.sims) || args.sims.length === 0) throw new Error('--sims must be a number or comma-separated list');
  if (!['X', 'O'].includes(args.mctsPlayer)) throw new Error('--mcts-player must be X or O');
  // Validate sims: each value must be a finite positive integer.
  for (const s of args.sims) {
    if (!Number.isFinite(s) || !Number.isInteger(s) || s <= 0) {
      throw new Error('--sims values must be finite positive integers');
    }
  }
  // Validate seed: must be a finite number (will be converted to uint32 internally).
  if (!Number.isFinite(args.seed)) {
    throw new Error('--seed must be a finite number');
  }
  // Validate exploration: must be finite and non-negative.
  if (!Number.isFinite(args.exploration) || args.exploration < 0) {
    throw new Error('--exploration must be a finite number >= 0');
  }

  return args;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rng, n) {
  return Math.floor(rng() * n);
}

function emptyBoard() {
  return Array(9).fill(0);
}

function availableMoves(board) {
  const moves = [];
  for (let i = 0; i < 9; i++) if (board[i] === 0) moves.push(i);
  return moves;
}

function checkWinner(board) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];
  for (const [a, b, c] of lines) {
    const v = board[a];
    if (v !== 0 && v === board[b] && v === board[c]) return v;
  }
  return null;
}

function isTerminal(board) {
  if (checkWinner(board) !== null) return true;
  return board.every((v) => v !== 0);
}

function applyMove(board, idx, player) {
  const next = board.slice();
  next[idx] = player;
  return next;
}

class Node {
  constructor(board, playerToMove, parent = null, move = null) {
    this.board = board;
    this.playerToMove = playerToMove;
    // Player who made the move that led to this node (null for root).
    this.playerJustMoved = parent ? -playerToMove : null;
    this.parent = parent;
    this.move = move;
    this.children = [];
    this.untriedMoves = availableMoves(board);
    this.visits = 0;
    this.value = 0;
  }
}

function uctScore(parentVisits, child, exploration) {
  // child.value is from the perspective of child.playerJustMoved (the player choosing the move).
  const exploit = child.value / (child.visits || 1);
  const explore = Math.sqrt(Math.log(parentVisits + 1) / (child.visits + 1));
  return exploit + exploration * explore;
}

function selectChild(node, exploration) {
  let best = null;
  let bestScore = -Infinity;
  for (const c of node.children) {
    const s = uctScore(node.visits, c, exploration);
    if (s > bestScore) {
      bestScore = s;
      best = c;
    }
  }
  return best;
}

function rollout(board, playerToMove, rootPlayer, rng) {
  let b = board.slice();
  let p = playerToMove;
  while (!isTerminal(b)) {
    const moves = availableMoves(b);
    const m = moves[randInt(rng, moves.length)];
    b = applyMove(b, m, p);
    p = -p;
  }
  const w = checkWinner(b);
  if (w === null) return 0; // draw
  return w === rootPlayer ? 1 : -1;
}

function mctsChooseMove(board, playerToMove, sims, rng, exploration) {
  const rootPlayer = playerToMove;
  const root = new Node(board.slice(), playerToMove);

  for (let i = 0; i < sims; i++) {
    // Selection
    let node = root;
    while (node.untriedMoves.length === 0 && node.children.length > 0) {
      node = selectChild(node, exploration);
    }

    // Expansion
    if (node.untriedMoves.length > 0) {
      const mi = randInt(rng, node.untriedMoves.length);
      const move = node.untriedMoves.splice(mi, 1)[0];
      const nextBoard = applyMove(node.board, move, node.playerToMove);
      const child = new Node(nextBoard, -node.playerToMove, node, move);
      node.children.push(child);
      node = child;
    }

    // Simulation
    const outcome = rollout(node.board, node.playerToMove, rootPlayer, rng);

    // Backpropagation
    while (node) {
      node.visits += 1;
      if (node.playerJustMoved !== null) {
        // Store value from the perspective of the player who chose the move into this node.
        node.value += (node.playerJustMoved === rootPlayer) ? outcome : -outcome;
      }
      node = node.parent;
    }
  }

  // Pick the most visited child for stability.
  let best = null;
  let bestVisits = -1;
  for (const c of root.children) {
    if (c.visits > bestVisits) {
      bestVisits = c.visits;
      best = c;
    }
  }
  return best ? best.move : availableMoves(board)[0];
}

function randomMove(board, rng) {
  const moves = availableMoves(board);
  return moves[randInt(rng, moves.length)];
}

function playGame({ simsPerMove, seed, mctsIsX, exploration }) {
  // Use separate RNG streams so opponent randomness is independent of MCTS compute.
  const rngMcts = mulberry32(seed);
  const rngOpponent = mulberry32((seed ^ 0x9e3779b9) >>> 0);
  let board = emptyBoard();
  let player = 1; // X=1, O=-1

  while (!isTerminal(board)) {
    const isMctsTurn = mctsIsX ? player === 1 : player === -1;
    const move = isMctsTurn
      ? mctsChooseMove(board, player, simsPerMove, rngMcts, exploration)
      : randomMove(board, rngOpponent);
    board = applyMove(board, move, player);
    player = -player;
  }

  const w = checkWinner(board);
  if (w === null) return 'draw';
  const mctsPlayer = mctsIsX ? 1 : -1;
  return w === mctsPlayer ? 'win' : 'loss';
}

function runTournament({ games, simsPerMove, seed, mctsPlayer, exploration }) {
  const mctsIsX = mctsPlayer === 'X';
  const t0 = performance.now();
  const counts = { win: 0, draw: 0, loss: 0 };
  for (let i = 0; i < games; i++) {
    const result = playGame({
      simsPerMove,
      seed: seed + i,
      mctsIsX,
      exploration,
    });
    counts[result] += 1;
  }
  const t1 = performance.now();
  return { counts, ms: t1 - t0 };
}

function formatRate(n, total) {
  return (n / total).toFixed(3);
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log('Benchmark: MCTS vs Random (Tic-Tac-Toe)');
  console.log(`games=${args.games} sims=${args.sims.join(',')} seed=${args.seed} mctsPlayer=${args.mctsPlayer} exploration=${args.exploration}`);
  console.log('');

  for (const simsPerMove of args.sims) {
    const { counts, ms } = runTournament({
      games: args.games,
      simsPerMove,
      seed: args.seed,
      mctsPlayer: args.mctsPlayer,
      exploration: args.exploration,
    });

    console.log(`simsPerMove=${simsPerMove}`);
    console.log(`  win=${counts.win} (${formatRate(counts.win, args.games)})`);
    console.log(`  draw=${counts.draw} (${formatRate(counts.draw, args.games)})`);
    console.log(`  loss=${counts.loss} (${formatRate(counts.loss, args.games)})`);
    console.log(`  elapsedMs=${ms.toFixed(1)} (avg ${(ms / args.games).toFixed(1)} ms/game)`);
    console.log('');
  }
}

if (require.main === module) {
  try {
    main();
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
}
