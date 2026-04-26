# Block Blast — Yandex Games

Puzzle game for the [Yandex Games](https://yandex.ru/games) platform.

## Game Description

Block Blast is an addictive grid-based puzzle game. Place shapes on the 8x8 grid to fill complete rows or columns and clear them for points. The game gets progressively harder as your score increases.

## Features

- 8x8 grid with 30+ unique shapes
- Progressive difficulty
- Combo system for clearing multiple lines
- High score saving (Yandex cloud + localStorage fallback)
- Leaderboard integration
- Interstitial ads between games
- Russian & English localization (auto-detected via SDK)
- Desktop & mobile support (click or drag-and-drop)
- Fullscreen mode on mobile
- Sound/gameplay pause on tab switch
- No external dependencies

## Yandex Games SDK Integration

- `YaGames.init()` — SDK initialization
- `LoadingAPI.ready()` — game ready signal
- `GameplayAPI.start() / stop()` — gameplay markup
- `adv.showFullscreenAdv()` — interstitial ads
- `leaderboards.setScore()` — leaderboard submission
- `getPlayer() / setData() / getData()` — cloud saves
- `environment.i18n.lang` — auto language detection
- Visibility API — pause on tab switch

## Technical Requirements Compliance

| Requirement | Status |
|---|---|
| 1.1 SDK integrated | Done |
| 1.2 No third-party auth | Done |
| 1.3 Sound stops on minimize | Done |
| 1.6.1 Mobile: fullscreen, touch, no context menu | Done |
| 1.6.2 Desktop: responsive, keyboard/mouse | Done |
| 1.9 Progress saving | Done |
| 1.10 Responsive display | Done |
| 1.12 Ad monetization | Done |
| 1.19 SDK methods used correctly | Done |
| 1.22 index.html in root | Done |
| 2.8 Increasing difficulty | Done |
| 2.9 10+ minutes gameplay | Done |
| 2.10 Localization | Done (ru/en) |
| 2.14 Auto language detection | Done |

## Local Development

```bash
python3 -m http.server 8080
# Open http://localhost:8080
```

## Deployment

1. Zip the project files (index.html, style.css, game.js)
2. Upload to [Yandex Games Console](https://games.yandex.ru/console)
3. Create a leaderboard named `score` in the console
4. Enable monetization
5. Submit for moderation
