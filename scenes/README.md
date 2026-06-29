# Smart Madrasa — Teacher Scene Animations
Self-contained HTML scenes for the teacher module, used as keyframes for the
hyperframe explainer video. Each scene mirrors the live app's UI, styles,
icons and motion language. Open any `.html` file in a modern browser to
preview; use the **Replay** button to re-trigger the animation.

## Folder map
```
scenes/
├── styles.css         # design tokens, components, animations (mirrors Tailwind v4 in app)
├── icons.js           # inline lucide-react SVG path library
├── _frame.js          # shared phone shell, top bar, toast, sheet utilities
├── 00-logo.html       # cold open / brand mark
├── 01-login.html      # teacher login
├── 02-dashboard.html  # hero card + 10 quick actions
├── 03-attendance.html # mark attendance (P/A/L/S) + save
├── 04-present.html    # present students list
├── 05-absent.html     # absent students list
├── 06-homework.html   # assign drawer + submissions
├── 07-homework-list.html
├── 08-diary.html      # serif daily diary
├── 09-ibadah.html     # 5-prayer grid + quran + deeds
├── 10-exams.html      # exam list
├── 11-class-test.html # mark-entry grid
├── 12-class-report.html
├── 13-performance.html
├── 14-best-performance.html
├── 15-fees.html       # payment + receipt modal
├── 16-notifications.html
├── 17-checkin.html    # teacher check-in/out
├── 18-leave-requests.html
├── 19-profile.html
└── 20-close.html      # end card / tagline
```

## Design language (mirrored from `app/teacher/*`)
- **Primary** `#059669` (emerald-600) → **Deep** `#047857` (emerald-700) → **Accent** `#0d9488` (teal-600)
- **Hero gradient** `linear-gradient(90deg, #047857, #16a34a)` (matches `app/teacher/page.tsx:61`)
- **Logo gradient** `linear-gradient(135deg, #10b981, #059669 50%, #0d9488)` (matches `components/DashboardLayout.tsx:117`)
- **Geometry** rounded-2xl (16) → rounded-3xl (24) → rounded-xl (12); 8-pt grid.
- **Motion** fade+translateY(-8→0) 300 ms · stagger 40 ms · scale 0.95→1 modals · persistent `animate-pulse` dots.

## Recording
Open scenes in a 1080×1920 browser window (or use the `--frame` option in your
screen recorder) to capture at 9:16. Pair multiple scenes in a 16:9 timeline
with a phone-mock stage around them.

## Replay
Each scene has a small **↻ Replay** button in the top-right that re-runs the
keyframes (re-fires `animation`). Use it between takes.
