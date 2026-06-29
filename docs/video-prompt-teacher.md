# Hyperframe Explainer — Teacher Module
**Product:** Smart Madrasa (multi-tenant SaaS, PWA)
**Module:** Teacher Portal
**Length:** 90–110 s · 16:9 (1920×1080) + 9:16 (1080×1920) cut
**Style:** Hyperframe — kinetic frame-by-frame UI choreography, no talking head, motion-graphics driven.

---

## 1 · Brand & Visual System (pulled from `app/teacher/*` + `components/*`)

### Color tokens
| Role | Tailwind | Hex | Use |
|---|---|---|---|
| Primary | `emerald-600` | `#059669` | CTAs, brand mark, active state |
| Primary deep | `emerald-700` | `#047857` | Header gradient start, icons |
| Accent | `teal-600` | `#0d9488` | Gradient end, secondary brand |
| Surface | `white` / `gray-50` | `#ffffff` / `#f9fafb` | Card background |
| Border | `gray-100/200` | `#f3f4f6` / `#e5e7eb` | Hairlines, dividers |
| Text | `gray-900` / `gray-500` | `#111827` / `#6b7280` | Headings / meta |
| Success | `emerald-500` | `#10b981` | Present, Paid, Checked |
| Warn | `amber-500` | `#f59e0b` | Leave, Late, Pending HW |
| Danger | `red-500/600` | `#ef4444` | Absent, Overdue, Delete |
| Info | `blue-500/600` | `#3b82f6` | Sick, info chips |

**Signature gradient:** `from-emerald-700 to-green-600` (teacher dashboard hero) and `from-emerald-500 via-emerald-600 to-teal-600` (logo, avatars).

### Typography
- **UI / captions:** Inter (300, 400, 500, 600, 700, 800, 900)
- **Diary / heritage moments:** EB Garamond (serif)
- **Malayalam copy:** Noto Sans/Serif Malayalam (one bilingual frame at 0:45)
- Numerals: tabular, weight 800 for stat tiles.

### Geometry
- Corner radius ladder: `rounded-2xl` (16px) for cards, `rounded-3xl` (24px) for hero blocks, `rounded-xl` (12px) for inputs/buttons, `rounded-full` for chips/avatars.
- Shadows: `shadow-sm` resting → `shadow-lg` hover → `shadow-2xl` modal.
- Spacing: 8-pt grid, generous 16-24 px gutter inside cards.

### Iconography — **lucide-react, 1.5 px stroke**
Always render in `emerald-600` on a `emerald-50` square (10×10 / 11×11 with rounded-xl), or white on solid emerald.
| Feature | Icon |
|---|---|
| Attendance | `ClipboardList` |
| Present / Students | `Users` |
| Absent | `TrendingUp` |
| Homework | `BookOpen` |
| HW Overview | `FileText` |
| Ibadah | `Moon` |
| Exams | `GraduationCap` |
| Performance | `Star` |
| Diary | `FileText` |
| Notifications | `Bell` |
| Check-in | `LogIn` |
| Fees | `Receipt` / `Wallet` |
| Save / Confirm | `CheckCircle2` / `Save` |
| Delete / Overdue | `Trash2` / `AlertTriangle` |

### Motion language (mirrors framer-motion config in code)
- **Entrance:** fade + translateY(-8 → 0), 300 ms, easeOut.
- **Stagger:** children 40 ms delay each (matches `actions.map((a, i) => … transition: { delay: i * 0.04 })`).
- **Modal:** scale 0.95 → 1, opacity 0 → 1, 220 ms.
- **Tap feedback:** `active:scale-[0.97]` on primary buttons.
- **Pulse:** one persistent amber/emerald `animate-pulse` dot for live state (HW overdue, check-in live, election live).

---

## 2 · Frame-by-Frame Script (16:9, 100 s)

> Format: `[MM:SS]  SCENE_TITLE  —  duration  —  on-screen + VO`
> "VO" is read in a calm, warm South-Asian-English female voice; warmth > corporate.

### COLD OPEN · 0:00 – 0:05
- Black → soft emerald radial wipe.
- Logo: rounded-3xl emerald→teal gradient square, white mosque-dome glyph (custom mark).
- Title card: **Smart Madrasa** / sub: *Teacher Portal* / `EN · ML`.
- VO: "Every madrasa runs on a teacher's day. Let's compress that day into ninety seconds."

### ACT 1 · LOGIN · 0:05 – 0:12
- Phone-shaped frame slides in from right; route `/m/:slug/teacher/login`.
- White card on `emerald-50` background, emerald-600 16-px icon at top.
- Typing sequence: identifier → password → language toggle EN ⇄ ML.
- Button: emerald-600, "Sign in", loader spinner 0.6 s, success check.
- VO: "One sign-in — for every madrasa you teach at. The language follows you."

### ACT 2 · DASHBOARD · 0:12 – 0:22
- Hero card: `bg-gradient-to-r from-emerald-700 to-green-600`, rounded-3xl, white text.
  - "As-salāmu ʿalaikum, Ustadha Ayesha" / weekday + date.
  - 3 stat tiles fade-up, 40 ms stagger: **HW Active: 7** · **Att. Rate: 94%** · **Unread: 3**.
- 10-tile quick-action grid (2 cols on mobile, 4 cols on desktop reveal).
  - Icons pop one-by-one: `ClipboardList`, `Users`, `TrendingUp`, `BookOpen`, `FileText`, `Moon`, `GraduationCap`, `Star`, `FileText`, `Bell`.
  - Each tile: rounded-2xl, `bg-white`, `shadow-sm` → `shadow-lg` on hover, emerald-600 icon in emerald-50 square.
- VO: "Your day, at a glance. Ten taps to every part of it."

### ACT 3 · MARK ATTENDANCE · 0:22 – 0:35
- Transition: dashboard tile → `/teacher/attendance`.
- Class chips at top (rounded-xl, active=emerald-600 white, inactive=white border).
- Date pill: "Today · Mon 29 Jun" with amber "Today" badge.
- Roster: 30 students, each row a rounded-xl card.
  - Avatar: emerald-100 square with initials (girls = `bg-pink-100`).
  - Four status pills: **P · A · L · S** (emerald / red / amber / blue).
  - Cursor clicks P for 5, A for 1, L for 1 — rows recolor live.
- Bottom CTA: sticky emerald-600 bar, "Save Attendance" with `Save` icon.
- Success: "Saved ✓" toast (sonner) slides up.
- VO: "Thirty seconds to take attendance for the whole class. One tap per child."

### ACT 4 · HOMEWORK · 0:35 – 0:48
- Tap "Homework" tile → `BookOpen` icon screen.
- Right-side `Drawer` slides in (Radix Dialog, 420 ms slide).
- Form: title, description, subject dropdown, class picker, due date, attach (optional).
- Submit → new HW card appears, animated `bg-emerald-50` border pulse.
- Cut to `/teacher/homework-list`:
  - Class chips, 4 stat tiles (Total, Upcoming, Pending, Checked).
  - HW list rows with progress bar (`bg-emerald-500` fill, `bg-gray-100` track) and 3 status chips.
  - One row pulses red — overdue, with `AlertTriangle` icon.
- Bilingual flash: row title EN → ML (`Noto Sans Malayalam`).
- VO: "Assign in seconds, track in one glance. Parents get notified the moment it's due."

### ACT 5 · DIARY + IBADAH · 0:48 – 1:02
- Tap "Diary" → rich-text editor in EB Garamond serif.
  - Toolbar: `Bold`, `Italic`, `Underline`, `List`, `Image`.
  - Date header serif, emerald-50 bg, "Mon · 29 Jun 2026".
  - Body fades in word-by-word, ink-pen feel.
- Cross-dissolve → "Ibadah Tracker" (`Moon` icon).
  - Class chips at top, then a 30-row × 5-column grid: **Fajr · Dhuhr · ʿAsr · Maghrib · ʿIshā** + Quran pages + custom deeds.
  - Green check-marks fill in like a wave (stagger 20 ms).
  - Legend pill bottom: "All prayers".
- VO: "Your daily diary, in the handwriting of care. And every prayer your students offer, recorded."

### ACT 6 · EXAMS + PERFORMANCE · 1:02 – 1:15
- Tap "Exams" → `GraduationCap`.
  - Exam list (rounded-2xl cards), status badge (Configured / In Progress / Published).
  - Tap → Class Test entry grid; teacher types marks 0–40, percentage auto-calc, PASSED badge turns emerald.
  - "Class Report" preview slides up: emerald-900 hero, white serif title, "Powered by Smart Madrasa" footer, ranked list with `Star` for top 3.
- Cut to "Performance" → bar chart (Recharts) animates in:
  - Weekly vs Monthly toggle.
  - Two donut cards: "Best Boy" and "Best Girl" with crown SVG.
- VO: "Marks in, ranks out. The whole class — in one chart."

### ACT 7 · FEES + NOTIFICATIONS + CHECK-IN · 1:15 – 1:28
- Rapid montage, 4 s each, on the same mobile-frame stage:
  1. **Fees** — green "PAID" + amber "UNPAID" split bar, tap record payment → emerald success.
  2. **Notifications** — bell badge "3", list slides, one item expands with `ClipboardList` icon (ATTENDANCE_ALERT emerald).
  3. **Check-in** — radial timer pulses, "CHECKED IN 07:42" emerald, location pin animates.
  4. **Leave Requests** — pending card, approve → green check slides across.
- VO: "Fees, alerts, your own check-in, your own leave — all the loops, closed."

### ACT 8 · CLOSE · 1:28 – 1:38
- 10-tile dashboard returns, but tiles softly blur as a soft emerald circle lens opens.
- Inside the lens: phone with the dashboard rotating slightly, white `bg-white/15` stat tiles glowing.
- Tagline types in: **"Teach the deen. We handle the data."**
- URL bar: `madrasa.app/m/your-slug/teacher`
- Sub: *Bilingual · PWA · Works offline · Built for Kerala, ready for the world.*
- Final beat: emerald→teal logo holds, low pad swell.
- VO: "Smart Madrasa. Built for the teacher who changes a life every period."

### END CARD · 1:38 – 1:45
- Black, white text, three logos: App Store / Play / Web PWA install icon.
- QR code animates in bottom-right.

---

## 3 · Hyperframe Engineering Notes

- **Frame chunks:** 24 fps. Every "page" transition = one master frame; sub-tweens (chip hover, status tap, counter increment) = 6–12 in-between frames.
- **Page composition:** always a centered 9:16 phone-mock (iPhone 14 Pro ratio, rounded-[48px], dynamic-island notch) inside the 16:9 canvas. Desktop reveals pan out of the phone into a 1280-px browser frame at 0:30 and 0:50.
- **Status color flash:** all four attendance states cycle once (P→A→L→S) in 4 frames so the audience learns the legend in <1 s.
- **Recharts moment:** use the *actual* Recharts easing — bar grow 600 ms ease-out, donut stroke-dashoffset reveal.
- **Bilingual frame:** swap one row's text from EN to ML mid-cut (no fade), 8 frames — shows the live i18n flip from `useLanguageStore`.

---

## 4 · Asset Checklist (what to render / record)

| Asset | Source | Use |
|---|---|---|
| Logo (gradient square + dome) | export from `components/DashboardLayout.tsx` brand mark | cold open, end card |
| Mobile frame mockup | Figma template (iPhone 14 Pro) | all teacher scenes |
| Desktop frame mockup | Figma template (1280 browser) | dashboard zoom-out, reports |
| UI screens | screen-record at 60 fps from running dev server (`npm run dev`) | 90 % of frames |
| Recharts animations | screen-record from `/teacher/performance` | exam + perf scenes |
| Mosque dome glyph | one-line SVG, emerald→teal linear gradient | logo |
| Sound design | sonner "ding" (present), subtle "swipe" (drawer), soft click (toggle) | SFX |
| Music | warm lo-fi keys + tabla hits at scene beats, no vocals | bed |

---

## 5 · AI Video Tool Prompt (drop into Runway / Pika / Kling / Sora)

```
Hyperframe SaaS explainer, 100s, 16:9 cinematic, framer-motion
choreography, kinetic UI walkthrough of a teacher management
mobile + web app called "Smart Madrasa".

Style: emerald (#059669) and teal (#0d9488) primary palette, white
surfaces, soft 16-24 px rounded corners, subtle drop shadows,
lucide-react outline icons, Inter typeface, EB Garamond serif
for the diary moment, Noto Sans Malayalam for one bilingual
flash. No human on screen. All motion is UI-driven: fades,
slides, stagger, scale-95 modals.

Scenes (timestamps from the attached script):
00:00 cold open logo + title "Smart Madrasa · Teacher Portal"
00:05 login screen on iPhone mock, EN/ML toggle
00:12 dashboard with emerald→green hero card, 3 stat tiles,
      10 quick-action tiles stagger in
00:22 attendance: 30 students, tap P/A/L/S, save toast
00:35 homework: assign drawer, progress bars, overdue pulse,
      English→Malayalam text swap
00:48 diary in serif font, then Ibadah 5-prayer grid filling
01:02 exam marks entry, class report preview, Recharts donut
01:15 fees + notifications + check-in + leave montage
01:28 lens-blur back to dashboard, tagline "Teach the deen.
      We handle the data." + URL

No voiceover in the prompt — voice added in post. Use the
attached 16 PNG keyframes as the scene anchors and interpolate
the in-betweens with motion-model.
```

---

## 6 · Voiceover Script (EN, 195 words)

> Read at ~115 wpm, warm female, slight Indian-English cadence.

0:00 — "Every madrasa runs on a teacher's day. Let's compress that day into ninety seconds."
0:05 — "One sign-in — for every madrasa you teach at. The language follows you."
0:12 — "Your day, at a glance. Ten taps to every part of it."
0:22 — "Thirty seconds to take attendance for the whole class. One tap per child."
0:35 — "Assign in seconds, track in one glance. Parents get notified the moment homework is due."
0:48 — "Your daily diary, in the handwriting of care. And every prayer your students offer, recorded."
1:02 — "Marks in, ranks out. The whole class — in one chart."
1:15 — "Fees, alerts, your own check-in, your own leave — all the loops, closed."
1:28 — "Smart Madrasa. Built for the teacher who changes a life every period."

---

## 7 · Output Specs

- Master: ProRes 422 HQ, 1920×1080, 24 fps, Rec.709.
- Social cuts: 1080×1920 (9:16 Reels/Shorts, 60 s), 1080×1080 (square, 45 s).
- Captions: burned-in English top, optional Malayalam bottom-third (Noto Sans Malayalam).
- Deliver: `dist/video/teacher-explainer-{16x9,9x16,1x1}.mp4` + `dist/video/teacher-explainer.srt`.
