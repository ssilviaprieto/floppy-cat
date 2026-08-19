# Floppy Cat

Floppy Cat is a tiny always-on-top Linux desktop focus app built for KDE. It opens as a small movable window with a calm pink canvas, a floppy cat runner game, Pomodoro-style timing, and cute focus nudges for boring tasks or short waiting periods.

![Floppy Cat screenshot](docs/floppy-cat-screenshot.png)

The app icon is a transparent kitty-only PNG at [`assets/floppy-cat.png`](assets/floppy-cat.png), so it can be pinned cleanly to a KDE panel.

## Features

- Always-on-top frameless Electron window for KDE/Linux.
- Small movable horizontal layout designed to stay beside real work.
- Canvas runner game with a cute cat, soft pink background, mountains, birds, jumping, ducking, score, and best score.
- Pomodoro timer with Focus, Rest, and Bonus modes.
- Configurable timer lengths from the titlebar settings button.
- Gentle rotating encouragement and task-prioritizing nudges.
- Optional KDE launcher and login autostart entries.

## Controls

- Click the canvas, press Space, or press ArrowUp to hop.
- Hold ArrowDown or right-click hold on the canvas to duck under flying violet birds.
- Click the `Focus 40:00` timer pill to start or pause focus time.
- Use the mode inside the timer pill to switch between `Focus` and `Rest`.
- Use the tiny settings button in the titlebar to configure Focus, Rest, and Bonus minutes.
- The bottom timer shows focus/rest time, short encouragement, and tiny task-prioritizing nudges.
- Use the tiny timer-reset button to reset back to a 40 minute focus block.

## Commands

```bash
npm install
npm start
npm run dev
npm run launch
npm run test
npm run build
npm run install-launcher
npm run install-autostart
```

## App launcher

Install the KDE app launcher so Floppy Cat can be pinned to your app panel:

```bash
npm run install-launcher
```

Remove it:

```bash
npm run uninstall-launcher
```

## Autostart

Install the login launcher:

```bash
npm run install-autostart
```

Remove it:

```bash
npm run uninstall-autostart
```

Preview the desktop entry without writing it:

```bash
npm run install-autostart -- --dry-run
```
