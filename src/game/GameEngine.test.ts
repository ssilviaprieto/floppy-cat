import { describe, expect, it } from 'vitest';
import { GameEngine, type ObstacleVariant } from './GameEngine';

function sequenceRandom(values: number[]) {
  let index = 0;
  return () => {
    const value = values[index] ?? values[values.length - 1] ?? 0.5;
    index += 1;
    return value;
  };
}

function spawnOneLateChallenge(weightPick: number) {
  const engine = new GameEngine({ random: sequenceRandom([weightPick, 0.5, 0.5, 0.5, 0.5]) });
  engine.setScoreForTest(18);
  engine.setSpeedForTest(170);
  engine.setNextSpawnDistanceForTest(0);
  engine.jump();
  engine.update(1 / 60);
  return engine.getSnapshot().obstacles;
}

describe('GameEngine', () => {
  it('starts ready and jumps into running state', () => {
    const engine = new GameEngine({ random: () => 0.5 });

    expect(engine.getSnapshot().status).toBe('ready');

    engine.jump();
    const snapshot = engine.getSnapshot();

    expect(snapshot.status).toBe('running');
    expect(snapshot.cat.vy).toBeLessThan(0);
    expect(snapshot.cat.onGround).toBe(false);
  });

  it('applies gravity and lands the cat back on the ground', () => {
    const engine = new GameEngine({ random: () => 0.5 });
    engine.jump();

    for (let index = 0; index < 80; index += 1) {
      engine.update(1 / 60);
    }

    const snapshot = engine.getSnapshot();
    expect(snapshot.cat.onGround).toBe(true);
    expect(snapshot.cat.y + snapshot.cat.height).toBe(engine.groundY);
  });

  it('scores when a mountain moves behind the cat', () => {
    const engine = new GameEngine({ random: () => 0.5 });
    engine.addMountainForTest({ x: 18, width: 16, height: 12 });
    engine.jump();
    engine.update(1 / 60);

    expect(engine.getSnapshot().score).toBe(1);
  });

  it('recycles mountains that leave the scene', () => {
    const engine = new GameEngine({ random: () => 0.5 });
    engine.addMountainForTest({ x: -50, width: 20, height: 30 });
    engine.jump();

    engine.update(1 / 60);

    expect(engine.getSnapshot().obstacles).toHaveLength(0);
  });

  it('detects a collision with a violet mountain and clears the idle crash overlap', () => {
    const engine = new GameEngine({ random: () => 0.5 });
    engine.addMountainForTest({ x: 74, width: 40, height: 44 });
    engine.jump();

    for (let index = 0; index < 70; index += 1) {
      engine.update(1 / 60);
    }

    const snapshot = engine.getSnapshot();
    expect(snapshot.status).toBe('gameOver');
    expect(snapshot.obstacles).toHaveLength(0);
  });

  it('pauses and resumes without moving the game state', () => {
    const engine = new GameEngine({ random: () => 0.5 });
    engine.jump();
    engine.update(0.1);
    engine.togglePause();

    const paused = engine.getSnapshot();
    engine.update(0.5);

    const afterPausedUpdate = engine.getSnapshot();
    expect(afterPausedUpdate.status).toBe(paused.status);
    expect(afterPausedUpdate.score).toBe(paused.score);
    expect(afterPausedUpdate.cat).toEqual(paused.cat);
    expect(afterPausedUpdate.obstacles).toEqual(paused.obstacles);
    expect(afterPausedUpdate.elapsed).toBeGreaterThan(paused.elapsed);

    engine.togglePause();
    engine.update(0.1);
    expect(engine.getSnapshot().elapsed).toBeGreaterThan(paused.elapsed);
  });

  it('keeps idle animation time moving before play starts', () => {
    const engine = new GameEngine({ random: () => 0.5 });
    const ready = engine.getSnapshot();

    engine.update(0.2);

    const animatedReady = engine.getSnapshot();
    expect(animatedReady.status).toBe('ready');
    expect(animatedReady.elapsed).toBeGreaterThan(ready.elapsed);
    expect(animatedReady.cat).toEqual(ready.cat);
    expect(animatedReady.obstacles).toEqual([]);
  });

  it('makes low birds require ducking while preserving the forgiving duck collision', () => {
    const standing = new GameEngine({ random: () => 0.5 });
    standing.jump();

    for (let index = 0; index < 80; index += 1) {
      standing.update(1 / 60);
    }

    standing.addObstacleForTest({ kind: 'bird', variant: 'lowBird', x: 50, y: 23, width: 23, height: 12 });
    standing.update(1 / 60);
    expect(standing.getSnapshot().status).toBe('gameOver');

    const ducking = new GameEngine({ random: () => 0.5 });
    ducking.jump();

    for (let index = 0; index < 80; index += 1) {
      ducking.update(1 / 60);
    }

    ducking.addObstacleForTest({ kind: 'bird', variant: 'lowBird', x: 50, y: 23, width: 23, height: 12 });
    ducking.setDucking(true);
    ducking.update(1 / 60);
    expect(ducking.getSnapshot().status).toBe('running');
  });

  it('ramps speed continuously and caps it', () => {
    const engine = new GameEngine({ random: () => 0.5 });
    engine.setNextSpawnDistanceForTest(999_999);
    engine.jump();
    const earlySpeed = engine.getSnapshot().speed;

    for (let index = 0; index < 12_000; index += 1) {
      engine.update(1 / 20);
    }

    const lateSpeed = engine.getSnapshot().speed;
    expect(lateSpeed).toBeGreaterThan(earlySpeed);
    expect(lateSpeed).toBeLessThanOrEqual(245);
    expect(lateSpeed).toBeCloseTo(245);
  });

  it('starts with only simple mountains and a long first pixel gap', () => {
    const engine = new GameEngine({ random: sequenceRandom([0, 0.5, 0.5, 0]) });
    engine.setNextSpawnDistanceForTest(0);
    engine.jump();
    engine.update(1 / 60);

    const snapshot = engine.getSnapshot();
    expect(snapshot.phase).toBe('early');
    expect(snapshot.obstacles).toHaveLength(1);
    expect(snapshot.obstacles[0].kind).toBe('mountain');
    expect(snapshot.obstacles[0].variant).toBe('smallMountain');
    expect(snapshot.nextSpawnDistancePx).toBeGreaterThanOrEqual(145);
  });

  it('uses smaller effective gaps as the run reaches late phase', () => {
    const early = new GameEngine({ random: sequenceRandom([0, 0.5, 0.5, 0]) });
    early.setNextSpawnDistanceForTest(0);
    early.jump();
    early.update(1 / 60);

    const late = new GameEngine({ random: sequenceRandom([0, 0.5, 0.5, 0]) });
    late.setScoreForTest(18);
    late.setSpeedForTest(200);
    late.setNextSpawnDistanceForTest(0);
    late.jump();
    late.update(1 / 60);

    expect(late.getSnapshot().phase).toBe('late');
    expect(late.getSnapshot().nextSpawnDistancePx).toBeLessThan(early.getSnapshot().nextSpawnDistancePx);
  });

  it('unlocks Dino-style late variety across mountain groups and bird lanes', () => {
    const variants = new Set<ObstacleVariant>();
    for (const pick of [0, 0.3, 0.55, 0.7, 0.82]) {
      for (const obstacle of spawnOneLateChallenge(pick)) {
        if (obstacle.variant) {
          variants.add(obstacle.variant);
        }
      }
    }

    expect(variants).toEqual(new Set(['smallMountain', 'mountainPair', 'mountainTriple', 'highBird', 'lowBird']));
  });

  it('prevents more than two identical challenge segments in a row', () => {
    const engine = new GameEngine({ random: () => 0 });
    engine.setScoreForTest(18);
    engine.setSpeedForTest(170);
    engine.jump();

    const spawnedVariants: ObstacleVariant[] = [];
    for (let index = 0; index < 3; index += 1) {
      engine.setNextSpawnDistanceForTest(0);
      engine.update(1 / 60);
      const latest = engine.getSnapshot().obstacles.at(-1);
      if (latest?.variant) {
        spawnedVariants.push(latest.variant);
      }
    }

    expect(spawnedVariants).toEqual(['smallMountain', 'smallMountain', 'mediumMountain']);
    expect(engine.getRecentChallengeVariantsForTest()).toEqual(['mediumMountain', 'smallMountain']);
  });

  it('clears hazards and blocks game input in companion mode', () => {
    const engine = new GameEngine({ random: () => 0.5 });
    engine.addObstacleForTest({ kind: 'bird', variant: 'lowBird', x: 50, y: 23, width: 23, height: 12 });

    engine.setCompanionMode(true);
    engine.jump();
    engine.update(1);

    const snapshot = engine.getSnapshot();
    expect(snapshot.companionMode).toBe(true);
    expect(snapshot.status).toBe('ready');
    expect(snapshot.score).toBe(0);
    expect(snapshot.obstacles).toHaveLength(0);
  });
});
