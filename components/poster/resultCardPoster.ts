export type StudentInfo = {
  name: string;
  gender?: string | null;
  regNo: string;
  className: string;
  /** Real avatar URL. When empty/null, an initials placeholder is generated. */
  avatarUrl?: string | null;
  rank?: string | null;
};

export type SubjectResult = {
  name: string;
  subtitle?: string;
  marks: number;
  maxMarks: number;
  grade: string;
  passed?: boolean;
};

export type ResultSummary = {
  totalMarks?: number;
  totalMaxMarks?: number;
  percentage?: number;
  passed?: boolean;
  statusText?: string;
};

export type InstitutionInfo = {
  name: string;
  examSubtitle: string;
  logoUrl?: string;
};

export type ResultCardTheme = {
  bgOuter?: string;
  paperWhite?: string;
  textPrimary?: string;
  brandPrimary?: string;
  brandSoft?: string;
  accentAmberBg?: string;
  accentAmberText?: string;
};

export type ResultCardParams = {
  badgeText?: string;
  student: StudentInfo;
  subjects: SubjectResult[];
  summary?: ResultSummary;
  institution: InstitutionInfo;
  theme?: ResultCardTheme;
};

const escapeHTML = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Initials avatar used only when the student has no uploaded photo. */
const getFallbackAvatar = (name: string, gender?: string | null): string => {
  const initial = encodeURIComponent((name || 'S').trim().charAt(0).toUpperCase() || 'S');
  const fill = gender === 'FEMALE' ? '%23be185d' : '%2308984e';
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220' viewBox='0 0 220 220'%3E%3Crect width='220' height='220' fill='${fill}'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='central' text-anchor='middle' font-family='sans-serif' font-weight='700' font-size='110' fill='%23FFFFFF'%3E${initial}%3C/text%3E%3C/svg%3E`;
};

const getGradePillClass = (grade = ''): string => {
  const normalized = grade.trim().toUpperCase();
  if (normalized.startsWith('A')) return 'grade-pill--a';
  if (normalized.startsWith('F') || normalized === 'D') return 'grade-pill--fail';
  return 'grade-pill--b';
};

export function generateResultCardHTML(data: ResultCardParams): string {
  const {
    badgeText = 'Result Card',
    student,
    subjects = [],
    summary = {},
    institution,
    theme = {},
  } = data;

  const calcTotalMarks = subjects.reduce((acc, s) => acc + Number(s.marks || 0), 0);
  const calcTotalMax = subjects.reduce((acc, s) => acc + Number(s.maxMarks || 0), 0);

  const totalMarks = summary.totalMarks ?? calcTotalMarks;
  const totalMaxMarks = summary.totalMaxMarks ?? calcTotalMax;
  const percentage = Math.round(
    summary.percentage ??
      (totalMaxMarks > 0 ? (totalMarks / totalMaxMarks) * 100 : 0),
  );

  const allSubjectsPassed = subjects.every((s) => s.passed !== false);
  const isPassed = summary.passed ?? allSubjectsPassed;
  const statusText = summary.statusText ?? (isPassed ? 'Passed' : 'Failed');

  const firstLetter = escapeHTML((institution.name || 'D').trim().charAt(0).toUpperCase());
  const defaultLogo = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' rx='18' fill='%231D4ED8'/%3E%3Ctext x='50%25' y='54%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-weight='800' font-size='38' fill='%23FFFFFF'%3E${firstLetter}%3C/text%3E%3C/svg%3E`;

  // Prefer the student's uploaded avatar; only fall back to initials when absent.
  const avatarUrl = student.avatarUrl?.trim()
    ? student.avatarUrl
    : getFallbackAvatar(student.name, student.gender);

  const subjectRowsHTML = subjects
    .map((sub) => {
      const pct =
        sub.maxMarks > 0 ? Math.round((Number(sub.marks) / Number(sub.maxMarks)) * 100) : 0;
      const passed = sub.passed !== false;

      const statusIcon = passed
        ? `<svg class="check-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-label="Passed">
             <polyline points="4 10.5 8 14.5 16 6.5"></polyline>
           </svg>`
        : `<svg class="fail-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-label="Failed">
             <line x1="5" y1="5" x2="15" y2="15"></line>
             <line x1="15" y1="5" x2="5" y2="15"></line>
           </svg>`;

      return `
        <tr>
          <td>
            <span class="subject-title">${escapeHTML(sub.name)}</span>
            ${sub.subtitle ? `<span class="subject-sub">${escapeHTML(sub.subtitle)}</span>` : ''}
          </td>
          <td class="marks-text">${escapeHTML(sub.marks)}<span>/${escapeHTML(sub.maxMarks)}</span></td>
          <td>
            <div class="mini-radial" style="--pct: ${pct};">
              <span>${pct}%</span>
            </div>
          </td>
          <td><span class="grade-pill ${getGradePillClass(sub.grade)}">${escapeHTML(sub.grade)}</span></td>
          <td>${statusIcon}</td>
        </tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHTML(institution.name)} — ${escapeHTML(student.name)} Result Card</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-outer: ${theme.bgOuter ?? '#F3F4F6'};
      --paper-white: ${theme.paperWhite ?? '#FFFFFF'};
      --surface-subtle: #F9FAFB;
      --text-primary: ${theme.textPrimary ?? '#111827'};
      --text-secondary: #4B5563;
      --text-muted: #6B7280;
      --brand-primary: ${theme.brandPrimary ?? '#08984e'};
      --brand-soft: ${theme.brandSoft ?? '#EFF6FF'};
      --accent-amber-bg: ${theme.accentAmberBg ?? '#FEF3C7'};
      --accent-amber-text: ${theme.accentAmberText ?? '#92400E'};
      --status-green: #16A34A;
      --status-green-bg: #DCFCE7;
      --status-green-text: #166534;
      --status-red: #DC2626;
      --status-red-bg: #FEE2E2;
      --status-red-text: #991B1B;
      --border-light: #E5E7EB;
      --border-row: #F1F5F9;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    @page {
      size: A4 portrait;
      margin: 0;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: var(--bg-outer);
      color: var(--text-primary);
      display: flex;
      justify-content: center;
      align-items: flex-start;
      min-height: 100vh;
      padding: 24px;
      -webkit-font-smoothing: antialiased;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .a4-page {
      width: 210mm;
      height: 297mm;
      background-color: var(--paper-white);
      border: 1px solid var(--border-light);
      box-shadow: 0 12px 36px rgba(17, 24, 39, 0.07);
      padding: 16mm 20mm;
      display: flex;
      flex-direction: column;
      position: relative;
      gap: 36px;
      background-image:
        linear-gradient(to right, rgba(15, 23, 42, 0.06) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(15, 23, 42, 0.05) 1px, transparent 1px);
      background-size: 10mm 10mm;
    }

    .top-header {
      display: flex;
      justify-content: center;
      align-items: center;
      padding-bottom: 14px;
      margin-top: auto;
    }

    .brand-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand-logo {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      object-fit: cover;
      display: block;
    }

    .institution-name {
      font-size: 16px;
      font-weight: 800;
      color: var(--text-primary);
      letter-spacing: -0.01em;
    }

    .exam-subtitle {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .doc-badge {
      font-size: 16px;
      font-weight: 700;
      text-transform: uppercase;
      position: absolute;
      top: 0;
      left: 50px;
      letter-spacing: 0.08em;
      background-color: var(--accent-amber-text);
      color: var(--brand-soft);
      padding: 6px 14px;
      width: fit-content;
      border-bottom-left-radius: 10px;
      border-bottom-right-radius: 10px;
    }

    .student-center {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      margin: 65px auto 30px;
    }

    .portrait-1-2-wrap {
      position: relative;
       height: 220px;
      margin-bottom: 16px;
    }

    .portrait-1-2-box {
      width: 100%;
      height: 100%;
      border-radius: 55px;
      background: linear-gradient(180deg, #EFF6FF 0%, #DBEAFE 100%);
      overflow: hidden;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }

    .portrait-1-2-box img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: top center;
      display: block;
    }

    .rank-tag {
      position: absolute;
      bottom: 8px;
      right: -18px;
      background-color: var(--accent-amber-bg);
      color: var(--accent-amber-text);
      font-size: 12px;
      font-weight: 800;
      padding: 5px 12px;
      border-radius: 999px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      letter-spacing: 0.02em;
      white-space: nowrap;
    }

    .student-name {
      font-size: 24px;
      font-weight: 800;
      color: var(--text-primary);
      letter-spacing: -0.02em;
      margin-bottom: 6px;
    }

    .student-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 13px;
      color: var(--text-secondary);
      font-weight: 500;
    }

    .student-meta strong {
      color: var(--text-primary);
      font-weight: 700;
    }

    .center-content {
      width: 100%;
      max-width: 155mm;
      margin: 0 auto;
    }

    .table-wrap {
      border-radius: 8px;
      overflow: hidden;
      background-color: var(--paper-white);
    }

    .marks-table {
      width: 100%;
      border-collapse: collapse;
    }

    .marks-table thead th {
      background-color: var(--brand-primary);
      color: white;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 13px 16px;
      border-bottom: 1px solid var(--border-light);
      text-align: center;
    }

    .marks-table thead th:first-child {
      text-align: left;
      padding-left: 22px;
    }

    .marks-table thead th:last-child {
      padding-right: 22px;
    }

    .marks-table tbody tr {
      border-bottom: 1px solid var(--border-row);
    }

    .marks-table tbody tr:last-child {
      border-bottom: none;
    }

    .marks-table tbody tr:nth-child(even) {
      background-color: #FCFCFD;
    }

    .marks-table tbody td {
      padding: 14px 16px;
      text-align: center;
      vertical-align: middle;
      font-size: 14px;
    }

    .marks-table tbody td:first-child {
      text-align: left;
      padding-left: 22px;
    }

    .marks-table tbody td:last-child {
      padding-right: 22px;
    }

    .subject-title {
      font-weight: 700;
      color: var(--text-primary);
      display: block;
    }

    .subject-sub {
      font-size: 11.5px;
      color: var(--text-muted);
      display: block;
      margin-top: 2px;
    }

    .marks-text {
      font-variant-numeric: tabular-nums;
      font-weight: 700;
      color: var(--text-primary);
    }

    .marks-text span {
      font-weight: 500;
      color: var(--text-muted);
      font-size: 12.5px;
    }

    .mini-radial {
      --size: 38px;
      --thickness: 3.5px;
      width: var(--size);
      height: var(--size);
      border-radius: 50%;
      background: conic-gradient(
        var(--brand-primary) calc(var(--pct) * 1%),
        #E5E7EB 0
      );
      display: inline-flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    .mini-radial::before {
      content: "";
      position: absolute;
      inset: var(--thickness);
      border-radius: 50%;
      background-color: var(--paper-white);
    }

    .mini-radial span {
      position: relative;
      z-index: 1;
      font-size: 10.5px;
      font-weight: 800;
      color: var(--text-primary);
      font-variant-numeric: tabular-nums;
    }

    .grade-pill {
      display: inline-block;
      min-width: 34px;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 800;
    }

    .grade-pill--a {
      background-color: var(--brand-soft);
      color: var(--brand-primary);
    }

    .grade-pill--b {
      background-color: var(--accent-amber-bg);
      color: var(--accent-amber-text);
    }

    .grade-pill--fail {
      background-color: var(--status-red-bg);
      color: var(--status-red-text);
    }

    .check-icon {
      width: 18px;
      height: 18px;
      color: var(--status-green);
      vertical-align: middle;
    }

    .fail-icon {
      width: 18px;
      height: 18px;
      color: var(--status-red);
      vertical-align: middle;
    }

    .summary-strip {
      margin-top: 16px;
      padding: 16px 22px;
      background: linear-gradient(60deg, rgb(240, 248, 240), white);
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .summary-left {
      display: flex;
      align-items: center;
      gap: 28px;
    }

    .metric-group {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .metric-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
    }

    .metric-value {
      font-size: 20px;
      font-weight: 800;
      color: var(--text-primary);
      font-variant-numeric: tabular-nums;
    }

    .metric-value small {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-muted);
    }

    .status-pill {
      display: inline-block;
      background-color: var(--status-green-bg);
      color: var(--status-green-text);
      font-size: 12px;
      font-weight: 800;
      padding: 5px 14px;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .status-pill--fail {
      background-color: var(--status-red-bg);
      color: var(--status-red-text);
    }

    .radial-progress {
      --size: 72px;
      --thickness: 7px;
      width: var(--size);
      height: var(--size);
      border-radius: 50%;
      background: conic-gradient(
        var(--brand-primary) calc(var(--pct) * 1%),
        #E5E7EB 0
      );
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      flex-shrink: 0;
    }

    .radial-progress::before {
      content: "";
      position: absolute;
      inset: var(--thickness);
      border-radius: 50%;
      background-color: var(--paper-white);
    }

    .radial-center {
      position: relative;
      z-index: 1;
      text-align: center;
      line-height: 1.1;
    }

    .radial-value {
      font-size: 15px;
      font-weight: 800;
      color: var(--text-primary);
      display: block;
    }

    @media print {
      body {
        background: none;
        padding: 0;
      }
      .a4-page {
        border: none;
        box-shadow: none;
        margin: 0;
      }
    }
  </style>
</head>
<body>

  <main class="a4-page">
    <span class="doc-badge">${escapeHTML(badgeText)}</span>

    <section class="student-center">
      <div class="portrait-1-2-wrap">
        <div class="portrait-1-2-box">
          <img
            src="${escapeHTML(avatarUrl)}"
            alt="${escapeHTML(student.name)}"
            crossorigin="anonymous"
          />
        </div>
        ${student.rank ? `<span class="rank-tag">${escapeHTML(student.rank)}</span>` : ''}
      </div>

      <h1 class="student-name">${escapeHTML(student.name)}</h1>
      <div class="student-meta">
        <span>Reg: <strong>${escapeHTML(student.regNo)}</strong></span>
        <span>&bull;</span>
        <span>Class: <strong>${escapeHTML(student.className)}</strong></span>
      </div>
    </section>

    <section class="center-content">
      <div class="table-wrap">
        <table class="marks-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Marks</th>
              <th>Progress</th>
              <th>Grade</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${subjectRowsHTML}
          </tbody>
        </table>
      </div>

      <div class="summary-strip">
        <div class="summary-left">
          <div class="metric-group">
            <span class="metric-label">Total Marks</span>
            <span class="metric-value">${escapeHTML(totalMarks)} <small>/ ${escapeHTML(totalMaxMarks)}</small></span>
          </div>
          <div class="metric-group">
            <span class="metric-label">Result</span>
            <div><span class="status-pill ${isPassed ? '' : 'status-pill--fail'}">${escapeHTML(statusText)}</span></div>
          </div>
        </div>

        <div class="radial-progress" style="--pct: ${percentage};" role="progressbar" aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100">
          <div class="radial-center">
            <span class="radial-value">${percentage}</span>
          </div>
        </div>
      </div>
    </section>

    <footer class="top-header">
      <div class="brand-group">
        <img
          class="brand-logo"
          src="${escapeHTML(institution.logoUrl ?? defaultLogo)}"
          alt="${escapeHTML(institution.name)} Logo"
          crossorigin="anonymous"
        />
        <div>
          <div class="institution-name">${escapeHTML(institution.name)}</div>
          <div class="exam-subtitle">${escapeHTML(institution.examSubtitle)}</div>
        </div>
      </div>
    </footer>
  </main>

</body>
</html>`;
}