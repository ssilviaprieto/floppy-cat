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

function advanceUntilDistance(engine: GameEngine, distance: number) {
  while (engine.getSnapshot().distanceRan < distance) {
    engine.update(1 / 60);
  }
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
    expect(lateSpeed).toBeLessThanOrEqual(325);
    expect(lateSpeed).toBeCloseTo(325);
  });

  it('uses score progress as a speed floor so advancing makes the run faster', () => {
    const engine = new GameEngine({ random: () => 0.5 });
    engine.setNextSpawnDistanceForTest(999_999);
    engine.setScoreForTest(20);
    engine.jump();
    engine.update(1 / 60);

    expect(engine.getSnapshot().speed).toBeGreaterThanOrEqual(202);
  });

  it('makes jump impulse stronger at higher speed so the arc stays playable', () => {
    const slow = new GameEngine({ random: () => 0.5 });
    slow.jump();

    const fast = new GameEngine({ random: () => 0.5 });
    fast.setSpeedForTest(325);
    fast.jump();

    expect(fast.getSnapshot().cat.vy).toBeLessThan(slow.getSnapshot().cat.vy);
  });

  it('keeps the dreamy night shift occasional instead of constantly pulsing', () => {
    const engine = new GameEngine({ random: () => 0.5 });
    engine.setNextSpawnDistanceForTest(999_999);
    engine.jump();
    const dayMood = engine.getSnapshot().mood;

    advanceUntilDistance(engine, 8000);
    const stillDayMood = engine.getSnapshot().mood;

    advanceUntilDistance(engine, 12_000);
    const fadingMood = engine.getSnapshot().mood;

    advanceUntilDistance(engine, 15_000);
    const nightMood = engine.getSnapshot().mood;

    advanceUntilDistance(engine, 19_000);
    const returnedMood = engine.getSnapshot().mood;

    expect(dayMood).toBeCloseTo(0);
    expect(stillDayMood).toBeLessThan(0.05);
    expect(fadingMood).toBeGreaterThan(0.35);
    expect(nightMood).toBeGreaterThan(0.9);
    expect(returnedMood).toBeLessThan(0.2);
  });

  it('starts with only simple mountains and a shorter first pixel gap', () => {
    const engine = new GameEngine({ random: sequenceRandom([0, 0.5, 0.5, 0]) });
    engine.setNextSpawnDistanceForTest(0);
    engine.jump();
    engine.update(1 / 60);

    const snapshot = engine.getSnapshot();
    expect(snapshot.phase).toBe('early');
    expect(snapshot.obstacles).toHaveLength(1);
    expect(snapshot.obstacles[0].kind).toBe('mountain');
    expect(snapshot.obstacles[0].variant).toBe('smallMountain');
    expect(snapshot.nextSpawnDistancePx).toBeGreaterThanOrEqual(78);
    expect(snapshot.nextSpawnDistancePx).toBeLessThan(145);
  });

  it('varies the spawn lead so mountains do not always enter at the same spot', () => {
    const near = new GameEngine({ random: sequenceRandom([0, 0, 0.5, 0.5, 0.5]) });
    near.setNextSpawnDistanceForTest(0);
    near.jump();
    near.update(1 / 60);

    const far = new GameEngine({ random: sequenceRandom([0, 1, 0.5, 0.5, 0.5]) });
    far.setNextSpawnDistanceForTest(0);
    far.jump();
    far.update(1 / 60);

    expect(near.getSnapshot().obstacles[0].x).toBeLessThan(far.getSnapshot().obstacles[0].x);
    expect(far.getSnapshot().obstacles[0].x - near.getSnapshot().obstacles[0].x).toBeGreaterThanOrEqual(30);
  });

  it('does not spawn a new challenge before the previous challenge and safe gap enter the window', () => {
    const engine = new GameEngine({ random: () => 0.5 });
    engine.setNextSpawnDistanceForTest(0);
    engine.jump();
    engine.update(1 / 60);

    const firstSpawn = engine.getSnapshot();
    expect(firstSpawn.obstacles).toHaveLength(1);

    engine.setNextSpawnDistanceForTest(0);
    engine.update(1 / 60);

    expect(engine.getSnapshot().obstacles).toHaveLength(1);
  });

  it('leaves less reaction time as the run reaches late phase', () => {
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

    const earlySnapshot = early.getSnapshot();
    const lateSnapshot = late.getSnapshot();
    const earlyReactionSeconds = earlySnapshot.nextSpawnDistancePx / earlySnapshot.speed;
    const lateReactionSeconds = lateSnapshot.nextSpawnDistancePx / lateSnapshot.speed;

    expect(lateSnapshot.phase).toBe('late');
    expect(lateReactionSeconds).toBeLessThan(earlyReactionSeconds);
  });

  it('unlocks each difficulty phase much earlier than the old slow pacing', () => {
    const engine = new GameEngine({ random: () => 0.5 });
    expect(engine.getSnapshot().phase).toBe('early');

    engine.setScoreForTest(3);
    expect(engine.getSnapshot().phase).toBe('middle');

    engine.setScoreForTest(7);
    expect(engine.getSnapshot().phase).toBe('bird');

    engine.setScoreForTest(13);
    expect(engine.getSnapshot().phase).toBe('late');
  });

  it('unlocks Dino-style late variety across mountain groups and bird lanes', () => {
    const variants = new Set<ObstacleVariant>();
    for (const pick of [0, 0.1, 0.25, 0.45, 0.65, 0.85]) {
      for (const obstacle of spawnOneLateChallenge(pick)) {
        if (obstacle.variant) {
          variants.add(obstacle.variant);
        }
      }
    }

    expect(variants).toEqual(
      new Set(['smallMountain', 'mediumMountain', 'mountainPair', 'mountainTriple', 'highBird', 'lowBird'])
    );
  });

  it('prevents more than two identical challenge segments in a row', () => {
    const engine = new GameEngine({ random: () => 0 });
    engine.setScoreForTest(18);
    engine.setSpeedForTest(170);
    engine.jump();

    const spawnedVariants: ObstacleVariant[] = [];
    for (let index = 0; index < 3; index += 1) {
      engine.clearObstaclesForTest();
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
