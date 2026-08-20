export type GameStatus = 'ready' | 'running' | 'paused' | 'gameOver';

export type CatState = {
  x: number;
  y: number;
  vy: number;
  width: number;
  height: number;
  onGround: boolean;
  ducking: boolean;
};

export type ObstacleKind = 'mountain' | 'bird';

export type ObstacleVariant = 'smallMountain' | 'mediumMountain' | 'mountainPair' | 'mountainTriple' | 'lowBird' | 'highBird';

export type DifficultyPhase = 'early' | 'middle' | 'bird' | 'late';
type ChallengeAction = 'jump' | 'duck' | 'none';

export type Obstacle = {
  id: number;
  kind: ObstacleKind;
  x: number;
  width: number;
  height: number;
  y?: number;
  scored: boolean;
  variant?: ObstacleVariant;
  speedOffset?: number;
};

export type GameSnapshot = {
  status: GameStatus;
  elapsed: number;
  score: number;
  speed: number;
  difficulty: number;
  phase: DifficultyPhase;
  distanceRan: number;
  nextSpawnDistancePx: number;
  companionMode: boolean;
  groundY: number;
  cat: CatState;
  obstacles: Obstacle[];
};

export type GameEngineOptions = {
  width?: number;
  height?: number;
  random?: () => number;
};

type ChallengeDefinition = {
  variant: ObstacleVariant;
  kind: ObstacleKind;
  action: ChallengeAction;
  minScore: number;
  minSpeed: number;
  baseGap: number;
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
  groupSize: number;
  innerGap?: number;
  y?: number;
  birdSpeedOffset?: number;
  weights: Record<DifficultyPhase, number>;
};

const WORLD_WIDTH = 360;
const WORLD_HEIGHT = 52;
const GROUND_Y = 41;
const CAT_WIDTH = 23;
const CAT_HEIGHT = 20;
const CAT_X = 46;
const GRAVITY = 920;
const JUMP_IMPULSE = -238;
const BASE_SPEED = 118;
const MAX_SPEED = 325;
const SPEED_ACCELERATION = 2.15;
const SCORE_SPEED_STEP = 4.2;
const INITIAL_SPAWN_DISTANCE = 104;
const MIN_SPAWN_X_OFFSET = 10;
const MAX_SPAWN_X_OFFSET = 44;
const MAX_GAP_COEFFICIENT = 1.42;
const MAX_DUPLICATE_CHALLENGES = 2;
const COYOTE_SECONDS = 0.1;
const JUMP_BUFFER_SECONDS = 0.09;

const CHALLENGES: ChallengeDefinition[] = [
  {
    variant: 'smallMountain',
    kind: 'mountain',
    action: 'jump',
    minScore: 0,
    minSpeed: 0,
    baseGap: 106,
    minWidth: 13,
    maxWidth: 20,
    minHeight: 8,
    maxHeight: 13,
    groupSize: 1,
    weights: { early: 9, middle: 4, bird: 2, late: 1 }
  },
  {
    variant: 'mediumMountain',
    kind: 'mountain',
    action: 'jump',
    minScore: 3,
    minSpeed: 126,
    baseGap: 102,
    minWidth: 18,
    maxWidth: 28,
    minHeight: 12,
    maxHeight: 18,
    groupSize: 1,
    weights: { early: 0, middle: 7, bird: 4, late: 2 }
  },
  {
    variant: 'mountainPair',
    kind: 'mountain',
    action: 'jump',
    minScore: 4,
    minSpeed: 132,
    baseGap: 104,
    minWidth: 13,
    maxWidth: 19,
    minHeight: 9,
    maxHeight: 15,
    groupSize: 2,
    innerGap: 6,
    weights: { early: 0, middle: 5, bird: 5, late: 4 }
  },
  {
    variant: 'mountainTriple',
    kind: 'mountain',
    action: 'jump',
    minScore: 13,
    minSpeed: 166,
    baseGap: 100,
    minWidth: 12,
    maxWidth: 18,
    minHeight: 8,
    maxHeight: 15,
    groupSize: 3,
    innerGap: 5,
    weights: { early: 0, middle: 0, bird: 0, late: 5 }
  },
  {
    variant: 'highBird',
    kind: 'bird',
    action: 'none',
    minScore: 7,
    minSpeed: 146,
    baseGap: 112,
    minWidth: 22,
    maxWidth: 27,
    minHeight: 12,
    maxHeight: 12,
    groupSize: 1,
    y: 8,
    birdSpeedOffset: 16,
    weights: { early: 0, middle: 0, bird: 3, late: 4 }
  },
  {
    variant: 'lowBird',
    kind: 'bird',
    action: 'duck',
    minScore: 8,
    minSpeed: 152,
    baseGap: 116,
    minWidth: 22,
    maxWidth: 27,
    minHeight: 12,
    maxHeight: 12,
    groupSize: 1,
    y: 23,
    birdSpeedOffset: 18,
    weights: { early: 0, middle: 0, bird: 3, late: 6 }
  }
];

export class GameEngine {
  readonly width: number;
  readonly height: number;
  readonly groundY = GROUND_Y;

  private readonly random: () => number;
  private status: GameStatus = 'ready';
  private elapsed = 0;
  private score = 0;
  private speed = BASE_SPEED;
  private distanceRan = 0;
  private distanceUntilNextObstacle = INITIAL_SPAWN_DISTANCE;
  private gapAfterLastChallenge = INITIAL_SPAWN_DISTANCE;
  private nextObstacleId = 1;
  private companionMode = false;
  private cat: CatState = this.createCat();
  private obstacles: Obstacle[] = [];
  private recentChallengeVariants: ObstacleVariant[] = [];
  private coyoteTimer = 0;
  private jumpBufferTimer = 0;

  constructor(options: GameEngineOptions = {}) {
    this.width = options.width ?? WORLD_WIDTH;
    this.height = options.height ?? WORLD_HEIGHT;
    this.random = options.random ?? Math.random;
  }

  reset() {
    this.resetRunState();
    this.companionMode = false;
  }

  setCompanionMode(active: boolean) {
    if (this.companionMode === active) {
      return;
    }

    this.companionMode = active;

    if (active) {
      this.resetRunState();
    }
  }

  jump() {
    if (this.companionMode) {
      return;
    }

    if (this.status === 'gameOver') {
      this.resetRunState();
    }

    if (this.status === 'ready') {
      this.status = 'running';
    }

    if (this.status !== 'running') {
      return;
    }

    if (!this.cat.onGround && this.coyoteTimer <= 0) {
      this.jumpBufferTimer = JUMP_BUFFER_SECONDS;
      return;
    }

    this.performJump();
  }

  setDucking(ducking: boolean) {
    this.cat.ducking = ducking && this.cat.onGround && this.status === 'running' && !this.companionMode;
  }

  togglePause() {
    if (this.companionMode) {
      return;
    }

    if (this.status === 'running') {
      this.status = 'paused';
      return;
    }

    if (this.status === 'paused') {
      this.status = 'running';
    }
  }

  update(deltaSeconds: number) {
    const dt = Math.min(Math.max(deltaSeconds, 0), 0.05);

    if (this.status === 'ready' || this.status === 'paused' || this.status === 'gameOver') {
      this.elapsed += dt;
      return this.getSnapshot();
    }

    if (this.status !== 'running') {
      return this.getSnapshot();
    }

    this.elapsed += dt;
    this.speed = this.calculateNextSpeed(dt);

    this.updateCat(dt);
    this.updateObstacles(dt);
    this.consumeBufferedJump(dt);

    if (this.hasCollision()) {
      this.status = 'gameOver';
      this.obstacles = [];
      this.cat.ducking = false;
    }

    return this.getSnapshot();
  }

  getSnapshot(): GameSnapshot {
    return {
      status: this.status,
      elapsed: this.elapsed,
      score: this.score,
      speed: this.speed,
      difficulty: this.calculateDifficulty(),
      phase: this.getPhase(),
      distanceRan: this.distanceRan,
      nextSpawnDistancePx: Math.max(0, this.distanceUntilNextObstacle),
      companionMode: this.companionMode,
      groundY: this.groundY,
      cat: { ...this.cat },
      obstacles: this.obstacles.map((obstacle) => ({ ...obstacle }))
    };
  }

  addObstacleForTest(obstacle: Omit<Obstacle, 'id' | 'scored'> & Partial<Pick<Obstacle, 'scored'>>) {
    this.obstacles.push({
      id: this.nextObstacleId++,
      scored: obstacle.scored ?? false,
      ...obstacle
    });
  }

  addMountainForTest(mountain: Omit<Obstacle, 'id' | 'scored' | 'kind'> & Partial<Pick<Obstacle, 'scored'>>) {
    this.addObstacleForTest({ kind: 'mountain', ...mountain });
  }

  setScoreForTest(score: number) {
    this.score = score;
  }

  setSpeedForTest(speed: number) {
    this.speed = speed;
  }

  setNextSpawnDistanceForTest(distance: number) {
    this.distanceUntilNextObstacle = distance;
  }

  clearObstaclesForTest() {
    this.obstacles = [];
  }

  getRecentChallengeVariantsForTest() {
    return [...this.recentChallengeVariants];
  }

  private resetRunState() {
    this.status = 'ready';
    this.elapsed = 0;
    this.score = 0;
    this.speed = BASE_SPEED;
    this.distanceRan = 0;
    this.distanceUntilNextObstacle = INITIAL_SPAWN_DISTANCE;
    this.gapAfterLastChallenge = INITIAL_SPAWN_DISTANCE;
    this.nextObstacleId = 1;
    this.cat = this.createCat();
    this.obstacles = [];
    this.recentChallengeVariants = [];
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
  }

  private createCat(): CatState {
    return {
      x: CAT_X,
      y: GROUND_Y - CAT_HEIGHT,
      vy: 0,
      width: CAT_WIDTH,
      height: CAT_HEIGHT,
      onGround: true,
      ducking: false
    };
  }

  private updateCat(dt: number) {
    this.cat.vy += GRAVITY * dt;
    this.cat.y += this.cat.vy * dt;

    const groundTop = this.groundY - this.cat.height;
    if (this.cat.y >= groundTop) {
      this.cat.y = groundTop;
      this.cat.vy = 0;
      this.cat.onGround = true;
      this.coyoteTimer = COYOTE_SECONDS;
      return;
    }

    this.cat.ducking = false;
    this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
  }

  private performJump() {
    this.cat.ducking = false;
    this.cat.vy = JUMP_IMPULSE;
    this.cat.onGround = false;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
  }

  private consumeBufferedJump(dt: number) {
    if (this.jumpBufferTimer <= 0) {
      return;
    }

    this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);

    if (this.cat.onGround) {
      this.performJump();
    }
  }

  private updateObstacles(dt: number) {
    const traveled = this.speed * dt;
    this.distanceRan += traveled;

    if (this.obstacles.length === 0) {
      this.distanceUntilNextObstacle -= traveled;
    }

    for (const obstacle of this.obstacles) {
      obstacle.x -= (this.speed + (obstacle.speedOffset ?? 0)) * dt;
      if (!obstacle.scored && obstacle.x + obstacle.width < this.cat.x) {
        obstacle.scored = true;
        this.score += 1;
      }
    }

    this.obstacles = this.obstacles.filter((obstacle) => obstacle.x + obstacle.width > -24);

    if (this.obstacles.length > 0) {
      this.distanceUntilNextObstacle = this.calculateDistanceUntilNextLogicalSpawn();
    }

    if (this.distanceUntilNextObstacle <= 0) {
      const challenge = this.chooseChallenge();
      const spawnedWidth = this.spawnChallenge(challenge);
      this.gapAfterLastChallenge = this.calculateGap(challenge, spawnedWidth);
      this.distanceUntilNextObstacle = this.calculateDistanceUntilNextLogicalSpawn();
      this.rememberChallenge(challenge.variant);
    }
  }

  private chooseChallenge() {
    const phase = this.getPhase();
    const available = CHALLENGES.filter((challenge) => {
      return this.score >= challenge.minScore && this.speed >= challenge.minSpeed && challenge.weights[phase] > 0;
    });

    const withoutDuplicates = available.filter((challenge) => !this.wouldDuplicateChallenge(challenge.variant));
    const pool = withoutDuplicates.length > 0 ? withoutDuplicates : available;
    return this.weightedChoice(pool, phase) ?? CHALLENGES[0];
  }

  private spawnChallenge(challenge: ChallengeDefinition) {
    if (challenge.kind === 'bird') {
      return this.spawnBird(challenge);
    }

    let xOffset = 0;
    let totalWidth = 0;
    const spawnLead = this.randomInteger(MIN_SPAWN_X_OFFSET, MAX_SPAWN_X_OFFSET);

    for (let index = 0; index < challenge.groupSize; index += 1) {
      const width = this.randomInteger(challenge.minWidth, challenge.maxWidth);
      const height = this.randomInteger(challenge.minHeight, challenge.maxHeight);
      const x = this.width + spawnLead + xOffset;

      this.obstacles.push({
        id: this.nextObstacleId++,
        kind: 'mountain',
        variant: challenge.variant,
        x,
        width,
        height,
        scored: false
      });

      totalWidth = xOffset + width;
      xOffset += width + (challenge.innerGap ?? 0) + this.randomInteger(0, 3);
    }

    return totalWidth;
  }

  private spawnBird(challenge: ChallengeDefinition) {
    const speedDirection = this.random() > 0.5 ? 1 : -1;
    const spawnLead = this.randomInteger(MIN_SPAWN_X_OFFSET, MAX_SPAWN_X_OFFSET);
    const width = this.randomInteger(challenge.minWidth, challenge.maxWidth);

    this.obstacles.push({
      id: this.nextObstacleId++,
      kind: 'bird',
      variant: challenge.variant,
      x: this.width + spawnLead,
      y: challenge.y,
      width,
      height: challenge.minHeight,
      scored: false,
      speedOffset: speedDirection * (challenge.birdSpeedOffset ?? 0)
    });

    return width;
  }

  private calculateGap(challenge: ChallengeDefinition, spawnedWidth: number) {
    const phase = this.getPhase();
    const speedScale = this.speed / BASE_SPEED;
    const phaseGapReduction: Record<DifficultyPhase, number> = {
      early: 0.92,
      middle: 0.84,
      bird: 0.76,
      late: 0.66
    };
    const recoverySeconds: Record<DifficultyPhase, Record<ChallengeAction, number>> = {
      early: { jump: 0.72, duck: 0.5, none: 0.34 },
      middle: { jump: 0.64, duck: 0.44, none: 0.3 },
      bird: { jump: 0.58, duck: 0.4, none: 0.27 },
      late: { jump: 0.52, duck: 0.36, none: 0.24 }
    };
    const jitter = this.randomInteger(-18, 18);
    const patternGap = Math.round((spawnedWidth * speedScale + challenge.baseGap + jitter) * phaseGapReduction[phase]);
    const recoveryGap = Math.round(this.speed * recoverySeconds[phase][challenge.action]);
    const minGap = Math.max(78, patternGap, recoveryGap);
    const maxGap = Math.round(minGap * MAX_GAP_COEFFICIENT);
    return this.randomInteger(minGap, maxGap);
  }

  private calculateNextSpeed(dt: number) {
    const speedFromTime = this.speed + SPEED_ACCELERATION * dt;
    const speedFromScore = BASE_SPEED + this.score * SCORE_SPEED_STEP;
    return Math.min(MAX_SPEED, Math.max(speedFromTime, speedFromScore));
  }

  private calculateDistanceUntilNextLogicalSpawn() {
    const rightmostEdge = this.obstacles.reduce((rightEdge, obstacle) => {
      return Math.max(rightEdge, obstacle.x + obstacle.width);
    }, 0);
    return Math.max(0, rightmostEdge + this.gapAfterLastChallenge - this.width);
  }

  private getPhase(): DifficultyPhase {
    if (this.score >= 13) {
      return 'late';
    }

    if (this.score >= 7) {
      return 'bird';
    }

    if (this.score >= 3) {
      return 'middle';
    }

    return 'early';
  }

  private calculateDifficulty() {
    const speedProgress = (this.speed - BASE_SPEED) / (MAX_SPEED - BASE_SPEED);
    const scoreProgress = this.score / 28;
    return Math.min(1, speedProgress * 0.58 + scoreProgress * 0.42);
  }

  private weightedChoice(challenges: ChallengeDefinition[], phase: DifficultyPhase) {
    const totalWeight = challenges.reduce((total, challenge) => total + challenge.weights[phase], 0);
    if (totalWeight <= 0) {
      return undefined;
    }

    let pick = this.random() * totalWeight;
    for (const challenge of challenges) {
      pick -= challenge.weights[phase];
      if (pick <= 0) {
        return challenge;
      }
    }

    return challenges[challenges.length - 1];
  }

  private wouldDuplicateChallenge(variant: ObstacleVariant) {
    if (this.recentChallengeVariants.length < MAX_DUPLICATE_CHALLENGES) {
      return false;
    }

    return this.recentChallengeVariants.slice(0, MAX_DUPLICATE_CHALLENGES).every((recentVariant) => recentVariant === variant);
  }

  private rememberChallenge(variant: ObstacleVariant) {
    this.recentChallengeVariants.unshift(variant);
    this.recentChallengeVariants = this.recentChallengeVariants.slice(0, MAX_DUPLICATE_CHALLENGES);
  }

  private randomInteger(min: number, max: number) {
    return Math.round(min + this.random() * (max - min));
  }

  private hasCollision() {
    const catHeight = this.cat.ducking ? this.cat.height * 0.58 : this.cat.height;
    const catTop = this.cat.y + (this.cat.height - catHeight);
    const catBox = {
      left: this.cat.x + 7,
      right: this.cat.x + this.cat.width - 7,
      top: catTop + 5,
      bottom: this.cat.y + this.cat.height - 3
    };

    return this.obstacles.some((obstacle) => {
      const obstacleTop = obstacle.kind === 'bird' ? obstacle.y ?? 0 : this.groundY - obstacle.height;
      const obstacleBottom = obstacle.kind === 'bird' ? obstacleTop + obstacle.height : this.groundY;
      const obstacleBox = {
        left: obstacle.x + 4,
        right: obstacle.x + obstacle.width - 4,
        top: obstacleTop + 3,
        bottom: obstacleBottom - 2
      };

      return (
        catBox.left < obstacleBox.right &&
        catBox.right > obstacleBox.left &&
        catBox.top < obstacleBox.bottom &&
        catBox.bottom > obstacleBox.top
      );
    });
  }
}
