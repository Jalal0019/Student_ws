# Attendance & Grades System — GitHub-backed, Club-styled

Data lives in JSON files in your GitHub repo (no Firebase, no Google
Sign-In). Design matches the Big Data AI Club website exactly (same fonts,
colors, header/nav/footer). All CSS is embedded directly in each HTML file
— no external stylesheet to go missing.

Access is controlled by a single **GitHub Personal Access Token** — no
sign-in screen, no Google account check. Anyone with a valid token for this
repo can open the Instructor Portal or Profiles page and read/write the
data; anyone without one cannot load any data at all (the repo should be
**Private** — see below).

## Files
```
index.html       ← portal picker (Instructor / Profiles)
teacher.html      ← Instructor Portal (semesters, courses, roster, attendance, gradebook)
profiles.html      ← Student Profiles (search + view any student's full record)
data/
  courses.json     ← [{ code, name, semester }]
  students.json     ← [{ id, name, email, courseCode }]
  attendance.json    ← { courseCode: { date: { studentId: "present"|"absent"|"late" } } }
  grades.json       ← { courseCode: { studentId: { assignmentName: { score, max: 100 } } } }
logo3.png, coai-english-logo.png, favicon.png ← club branding assets
style.css, dashboard.css ← reference copies only (already embedded in the HTML)
```

## Privacy
Set the `Student_ws` repository to **Private** on GitHub — Settings → scroll
to "Danger Zone" → "Change repository visibility" → Private. With the repo
private, only someone holding a valid token can read or write any data
file; a public repo would let anyone fetch `data/students.json` directly by
URL regardless of what the pages show.

## One-time setup

1. **Upload everything** to your `Student_ws` repo (or wherever it's
   hosted), keeping the `data/` folder as-is relative to the HTML files.
2. **Add students** to `data/students.json` and courses to
   `data/courses.json` (or do this from the Instructor Portal once it's
   running).
3. **Create a GitHub Personal Access Token**:
   - GitHub → Settings → Developer settings → Personal access tokens →
     Fine-grained tokens → grant **Contents: Read and write** on this repo
     only.
   - Never commit this token to the repo — it's entered by hand each time
     you use the Instructor Portal or Profiles page, and kept only in the
     browser session (or remembered locally if you choose to stay
     connected — see below).

## How it works

- **Instructor Portal** (`teacher.html`): enter your GitHub token to unlock
  the dashboard.
  - **Courses & Students tab**: set a semester (e.g. "Fall 2026") before
    creating a course — every new course is tagged with it. Use the
    "Filter everything by semester" dropdown to narrow every course list
    on the page (course table, attendance, gradebook) down to one semester,
    or view all. Enroll students either one at a time, or by **pasting
    rows copied straight from Excel** (Name, ID, email columns, in that
    exact order) into the "Paste from Excel" box. A student ID can be
    enrolled in more than one course — the same ID is only blocked if
    it's already enrolled in that *same* course.
  - **Attendance tab**: a spreadsheet grid like your Excel sheet — one row
    per student, one column per session date. Click a cell to cycle
    Present → Absent → Late; Present/Absent/% totals update automatically.
    Add new session columns with the date picker, or delete a session with
    the × on its column header. **Export to Excel (.csv)** downloads the
    currently selected course's full attendance grid as a `.csv` file
    (opens directly in Excel), named after the course code and semester.
  - **Gradebook tab**: same idea — one row per student, one column per
    assessment (Quiz 1, Midterm, etc.), each cell scored 0–100. Type scores
    directly into the grid (values are clamped to 0–100); Total is the sum
    of that student's scores and updates automatically. Delete a column
    with the × on its header. **Export to Excel (.csv)** downloads the
    selected course's gradebook the same way.
  - Each "Save" button commits that file straight to the repo.
- **Student Profiles page** (`profiles.html`): a separate page, same token
  gate as the Instructor Portal. Search by name, ID, or email, optionally
  filter by course, then click "View" on any student for a full profile —
  attendance history + stats and every grade, in one popup. Each row also
  has a Delete button, which saves immediately.

## Staying connected without re-entering your token every time
The first time you connect with a token, it's saved in `localStorage` on
that browser/device. On future visits — including opening a *different*
page like `profiles.html`, since `localStorage` is shared across all pages
on the same site — you land straight on the dashboard automatically, no
token prompt. If the saved token has expired or been revoked, it's cleared
automatically and you'll be dropped back to the token entry screen.
"Disconnect" (on either `teacher.html` or `profiles.html`) clears the saved
token everywhere immediately. Because this uses `localStorage`, it persists
across browser restarts on that device — don't use this on a shared or
public computer.

## Security note
There is no per-person identity check anymore — access is entirely
determined by who holds a valid GitHub token for this repo. Treat the
token like a password: don't share it, and revoke/regenerate it from
GitHub if you ever suspect it's been exposed. Keeping the repository
Private (see above) is what actually protects the data; the token is what
grants access to it.
