import { Check, Clock3, Minus, Minimize2, Pause, Play, RotateCcw, Settings2, TimerReset, X } from 'lucide-react';
import { useCallback, useEffect, useReducer, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { getFocusPanelMessage } from '../focus/focusMessages';
import { createFocusTimer, DEFAULT_TIMER_CONFIG, focusTimerReducer, formatTimerSeconds, getTimerTotalSeconds, type TimerConfig } from '../focus/focusTimer';
import { GameEngine, type GameSnapshot } from '../game/GameEngine';
import { renderGame } from '../game/renderGame';
import { getBestScore, getTimerConfig, normalizeTimerConfig, saveBestScore, saveTimerConfig } from '../lib/storage';

const CANVAS_WIDTH = 404;
const CANVAS_HEIGHT = 60;

export function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timerModeRef = useRef<HTMLDivElement | null>(null);
  const configPanelRef = useRef<HTMLDivElement | null>(null);
  const configButtonRef = useRef<HTMLButtonElement | null>(null);
  const engineRef = useRef(new GameEngine({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }));
  const animationRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const [snapshot, setSnapshot] = useState<GameSnapshot>(() => engineRef.current.getSnapshot());
  const [bestScore, setBestScore] = useState(() => getBestScore());
  const [timer, dispatchTimer] = useReducer(focusTimerReducer, undefined, () => createFocusTimer(getTimerConfig()));
  const [configOpen, setConfigOpen] = useState(false);
  const [configDraft, setConfigDraft] = useState<TimerConfig>(() => getTimerConfig());
  const [messageSeconds, setMessageSeconds] = useState(0);
  const [playSeconds, setPlaySeconds] = useState(0);
  const [timerModeMenuOpen, setTimerModeMenuOpen] = useState(false);
  const bestScoreRef = useRef(bestScore);
  const snapshotRef = useRef(snapshot);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  const draw = useCallback((nextSnapshot: GameSnapshot) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const pixelRatio = window.devicePixelRatio || 1;
    const targetWidth = CANVAS_WIDTH * pixelRatio;
    const targetHeight = CANVAS_HEIGHT * pixelRatio;

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      canvas.style.width = `${CANVAS_WIDTH}px`;
      canvas.style.height = `${CANVAS_HEIGHT}px`;
    }

    ctx.save();
    ctx.scale(pixelRatio, pixelRatio);
    renderGame(ctx, nextSnapshot, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.restore();
  }, []);

  const refreshSnapshot = useCallback(() => {
    const nextSnapshot = engineRef.current.getSnapshot();
    setSnapshot(nextSnapshot);
    draw(nextSnapshot);
  }, [draw]);

  const jump = useCallback(() => {
    engineRef.current.jump();
    refreshSnapshot();
  }, [refreshSnapshot]);

  const reset = useCallback(() => {
    engineRef.current.reset();
    if (timer.mode === 'break' || timer.status === 'prompt') {
      engineRef.current.setCompanionMode(true);
    }
    refreshSnapshot();
  }, [refreshSnapshot, timer.mode, timer.status]);

  const togglePause = useCallback(() => {
    engineRef.current.togglePause();
    refreshSnapshot();
  }, [refreshSnapshot]);

  useEffect(() => {
    const tick = (timestamp: number) => {
      const lastFrame = lastFrameRef.current ?? timestamp;
      lastFrameRef.current = timestamp;

      const nextSnapshot = engineRef.current.update((timestamp - lastFrame) / 1000);
      if (nextSnapshot.score > bestScoreRef.current) {
        const nextBestScore = saveBestScore(nextSnapshot.score);
        bestScoreRef.current = nextBestScore;
        setBestScore(nextBestScore);
      }

      setSnapshot(nextSnapshot);
      draw(nextSnapshot);
      animationRef.current = window.requestAnimationFrame(tick);
    };

    draw(engineRef.current.getSnapshot());
    animationRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (animationRef.current !== null) {
        window.cancelAnimationFrame(animationRef.current);
      }
      lastFrameRef.current = null;
    };
  }, [draw]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      dispatchTimer({ type: 'tick', seconds: 1 });
      setMessageSeconds((currentSeconds) => currentSeconds + 1);
      setPlaySeconds((currentSeconds) => (snapshotRef.current.status === 'running' ? currentSeconds + 1 : 0));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const shouldUseCompanionMode = timer.mode === 'break' || timer.status === 'prompt';
    engineRef.current.setCompanionMode(shouldUseCompanionMode);
    refreshSnapshot();
  }, [refreshSnapshot, timer.mode, timer.status]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Escape') {
        setTimerModeMenuOpen(false);
        setConfigOpen(false);
        void window.floppyCat?.hideTimerModeMenu();
        return;
      }

      if (event.code === 'Space' || event.code === 'ArrowUp') {
        event.preventDefault();
        jump();
      }

      if (event.code === 'ArrowDown') {
        event.preventDefault();
        engineRef.current.setDucking(true);
        refreshSnapshot();
      }

      if (event.code === 'KeyP') {
        event.preventDefault();
        togglePause();
      }

      if (event.code === 'KeyR') {
        event.preventDefault();
        reset();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'ArrowDown') {
        event.preventDefault();
        engineRef.current.setDucking(false);
        refreshSnapshot();
      }
    };

    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [jump, refreshSnapshot, reset, togglePause]);

  useEffect(() => {
    const unsubscribeSelected = window.floppyCat?.onTimerModeSelected((mode) => {
      dispatchTimer({ type: 'setMode', mode });
      setTimerModeMenuOpen(false);
    });
    const unsubscribeClosed = window.floppyCat?.onTimerModeClosed(() => setTimerModeMenuOpen(false));

    return () => {
      unsubscribeSelected?.();
      unsubscribeClosed?.();
      void window.floppyCat?.hideTimerModeMenu();
    };
  }, []);

  useEffect(() => {
    if (!configOpen) {
      return;
    }

    const closeOnOutsidePointer = (event: globalThis.PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        (configPanelRef.current?.contains(target) || configButtonRef.current?.contains(target))
      ) {
        return;
      }

      setConfigOpen(false);
    };

    window.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => window.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [configOpen]);

  const timerProgress = timer.remainingSeconds / getTimerTotalSeconds(timer);
  const focusMessage = getFocusPanelMessage(timer, messageSeconds, playSeconds);
  const timerSelectorValue = timer.mode === 'break' ? 'break' : 'focus';
  const timerTitle =
    timer.mode === 'focus'
      ? 'Focus timer'
      : timer.mode === 'break'
        ? 'Break timer'
        : 'Bonus focus timer';

  const toggleTimerModeMenu = useCallback(() => {
    setConfigOpen(false);

    if (timerModeMenuOpen) {
      setTimerModeMenuOpen(false);
      void window.floppyCat?.hideTimerModeMenu();
      return;
    }

    const rect = timerModeRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    setTimerModeMenuOpen(true);
    void window.floppyCat?.showTimerModeMenu({
      x: window.screenX + rect.left,
      y: window.screenY + rect.top,
      width: rect.width,
      height: rect.height,
      selected: timerSelectorValue
    });
  }, [timerModeMenuOpen, timerSelectorValue]);

  const toggleConfigPanel = useCallback(() => {
    void window.floppyCat?.hideTimerModeMenu();
    setTimerModeMenuOpen(false);
    setConfigDraft(timer.config);
    setConfigOpen((isOpen) => !isOpen);
  }, [timer.config]);

  const setDraftMinutes = useCallback((key: keyof TimerConfig, value: number) => {
    setConfigDraft((currentConfig) => normalizeTimerConfig({ ...currentConfig, [key]: value }));
  }, []);

  const saveTimerSettings = useCallback(() => {
    const savedConfig = saveTimerConfig(configDraft);
    setConfigDraft(savedConfig);
    dispatchTimer({ type: 'configure', config: savedConfig });
    setConfigOpen(false);
  }, [configDraft]);

  const resetTimerSettings = useCallback(() => {
    setConfigDraft(DEFAULT_TIMER_CONFIG);
  }, []);

  const renderMinuteControl = (label: string, key: keyof TimerConfig) => (
    <label className="config-row">
      <span className="config-label">{label}</span>
      <span className="minute-stepper">
        <button className="mini-step" type="button" aria-label={`Decrease ${label}`} onClick={() => setDraftMinutes(key, configDraft[key] - 5)}>
          <Minus size={11} aria-hidden="true" />
        </button>
        <input
          className="minute-input"
          type="number"
          min="1"
          max="180"
          step="1"
          value={configDraft[key]}
          aria-label={`${label} minutes`}
          onChange={(event) => setDraftMinutes(key, Number(event.target.value))}
        />
        <button className="mini-step" type="button" aria-label={`Increase ${label}`} onClick={() => setDraftMinutes(key, configDraft[key] + 5)}>
          +
        </button>
      </span>
    </label>
  );

  return (
    <main className="app-shell" aria-label="Floppy Cat focus game">
      <header className="titlebar">
        <div className="drag-region">
          <span className="cat-dot" aria-hidden="true" />
          <span className="app-title">Floppy Cat</span>
          <span className="score-pill" aria-live="polite">
            {snapshot.score}/{bestScore}
          </span>
        </div>
        <div className="window-actions">
          <button
            ref={configButtonRef}
            className={`icon-button ${configOpen ? 'icon-button-active' : ''}`}
            type="button"
            title="Timer settings"
            aria-label="Timer settings"
            aria-expanded={configOpen}
            onClick={toggleConfigPanel}
          >
            <Settings2 size={12} aria-hidden="true" />
          </button>
          <button className="icon-button" type="button" title="Reset" aria-label="Reset" onClick={reset}>
            <RotateCcw size={12} aria-hidden="true" />
          </button>
          <button
            className="icon-button"
            type="button"
            title={snapshot.status === 'paused' ? 'Resume' : 'Pause'}
            aria-label={snapshot.status === 'paused' ? 'Resume' : 'Pause'}
            onClick={togglePause}
          >
            {snapshot.status === 'paused' ? <Play size={12} aria-hidden="true" /> : <Pause size={12} aria-hidden="true" />}
          </button>
          <button
            className="icon-button"
            type="button"
            title="Minimize"
            aria-label="Minimize"
            onClick={() => void window.floppyCat?.minimize()}
          >
            <Minimize2 size={12} aria-hidden="true" />
          </button>
          <button
            className="icon-button close-button"
            type="button"
            title="Close"
            aria-label="Close"
            onClick={() => void window.floppyCat?.close()}
          >
            <X size={12} aria-hidden="true" />
          </button>
        </div>
      </header>

      {configOpen ? (
        <div ref={configPanelRef} className="config-panel" aria-label="Timer settings">
          <div className="config-grid">
            {renderMinuteControl('Focus', 'focusMinutes')}
            {renderMinuteControl('Rest', 'breakMinutes')}
            {renderMinuteControl('+10', 'bonusMinutes')}
          </div>
          <div className="config-actions">
            <button className="config-action" type="button" title="Reset defaults" aria-label="Reset defaults" onClick={resetTimerSettings}>
              <RotateCcw size={12} aria-hidden="true" />
            </button>
            <button className="config-action config-save" type="button" title="Save timer settings" aria-label="Save timer settings" onClick={saveTimerSettings}>
              <Check size={13} aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}

      <canvas
        ref={canvasRef}
        className="game-canvas"
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        aria-label="Cat jumping over violet mountains and ducking under violet birds"
        role="img"
        onContextMenu={(event) => event.preventDefault()}
        onPointerDown={(event: PointerEvent<HTMLCanvasElement>) => {
          if (event.button === 2) {
            engineRef.current.setDucking(true);
            refreshSnapshot();
            return;
          }
          jump();
        }}
        onPointerUp={() => {
          engineRef.current.setDucking(false);
          refreshSnapshot();
        }}
      />

      <footer
        className={`timer-bar timer-bar-${timer.status}`}
        style={{ '--timer-progress': timerProgress } as CSSProperties}
        aria-live="polite"
      >
        {timer.status === 'prompt' ? (
          <>
            <span className="timer-message">{focusMessage}</span>
            <button className="timer-choice focus-choice" type="button" onClick={() => dispatchTimer({ type: 'startFocus' })}>
              focus
            </button>
            <button className="timer-choice" type="button" onClick={() => dispatchTimer({ type: 'startBreak' })}>
              rest
            </button>
            <button className="timer-choice bonus-choice" type="button" onClick={() => dispatchTimer({ type: 'startBonus' })}>
              +10
            </button>
          </>
        ) : (
          <>
            <div className="timer-combo" ref={timerModeRef}>
              {timer.mode === 'bonus' ? (
                <span className="timer-mode-static">+10</span>
              ) : (
                <button
                  className="timer-mode-toggle"
                  type="button"
                  title="Choose focus or rest"
                  aria-label="Choose timer mode"
                  aria-haspopup="listbox"
                  aria-expanded={timerModeMenuOpen}
                  onClick={toggleTimerModeMenu}
                >
                  <span>{timerSelectorValue === 'break' ? 'Rest' : 'Focus'}</span>
                  <span className="timer-mode-caret" aria-hidden="true">
                    v
                  </span>
                </button>
              )}
              <button
                className="timer-start-button"
                type="button"
                title={`${timerTitle}: click to ${timer.status === 'running' ? 'pause' : 'start'}`}
                aria-label={`${timerTitle} ${formatTimerSeconds(timer.remainingSeconds)}`}
                onClick={() => dispatchTimer({ type: 'toggle' })}
              >
                <Clock3 size={13} aria-hidden="true" />
                <span className="timer-count">{formatTimerSeconds(timer.remainingSeconds)}</span>
              </button>
            </div>
            <span className="timer-message">{focusMessage}</span>
            <button className="timer-reset" type="button" title="Reset timer" aria-label="Reset timer" onClick={() => dispatchTimer({ type: 'reset' })}>
              <TimerReset size={13} aria-hidden="true" />
            </button>
          </>
        )}
      </footer>
    </main>
  );
}
