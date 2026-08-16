# Attendance & Grades System — GitHub-backed, Club-styled

Data lives in JSON files in your GitHub repo (no Firebase). Design matches
the Big Data AI Club website exactly (same fonts, colors, header/nav/footer,
auth top bar). All CSS is embedded directly in each HTML file — no external
stylesheet to go missing.

## Privacy: student data is instructor-only

`student.html` no longer reads or displays any student data — it now shows a
static "records are private, contact your instructor" message. The only way
to see any student's name, email, attendance, or grades is through the
**Instructor Portal**, after signing in with an approved Google account and
entering a valid GitHub token.

For this to actually keep the data private (not just hidden from the page),
**set the `Student_ws` repository to Private** on GitHub:
Repo → Settings → scroll to "Danger Zone" → "Change repository visibility" → Private.

With the repo private, the Instructor Portal keeps working exactly the same
(it already authenticates every request with your token), but nobody else —
no student, no search engine, no random visitor with the URL — can open
`data/students.json` or any other data file directly.

## Files
```
index.html       ← portal picker
teacher.html      ← Instructor Portal (semesters, courses, roster, attendance, gradebook)
profiles.html      ← Student Profiles (search + view any student's full record)
student.html       ← private-records notice (no data, no fetch, no sign-in)
data/
  courses.json     ← [{ code, name, semester }]
  students.json     ← [{ id, name, email, courseCode }]
  attendance.json    ← { courseCode: { date: { studentId: "present"|"absent"|"late" } } }
  grades.json       ← { courseCode: { studentId: { assignmentName: { score, max: 100 } } } }
  instructors.json   ← [{ name, email }]  — who is allowed into the Instructor Portal
logo3.png, coai-english-logo.png, favicon.png ← club branding assets
style.css, dashboard.css ← reference copies only (already embedded in the HTML)
```

## One-time setup

1. **Upload everything** to your `Student_ws` repo (or wherever it's hosted),
   keeping the `data/` folder as-is relative to the HTML files.
2. **Create a Google OAuth Client ID** (used for instructor sign-in):
   - [Google Cloud Console](https://console.cloud.google.com/) → new or
     existing project → **APIs & Services → Credentials → Create Credentials
     → OAuth client ID** → type **Web application**.
   - Under **Authorized JavaScript origins**, add your GitHub Pages URL,
     e.g. `https://jalal0019.github.io`
   - Copy the Client ID (ends in `.apps.googleusercontent.com`) and paste it
     into **both** `teacher.html` and `profiles.html`, replacing:
     ```js
     const GOOGLE_CLIENT_ID = "PUT_YOUR_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com";
     ```
3. **Add instructors** in `data/instructors.json`:
   ```json
   [ { "name": "Dr. Jalal Hameed", "email": "jalal.hameed@uobaghdad.edu.iq" } ]
   ```
4. **Create a GitHub Personal Access Token** for saving from the Instructor
   Portal:
   - GitHub → Settings → Developer settings → Personal access tokens →
     Fine-grained tokens → grant **Contents: Read and write** on this repo only.
   - Never commit this token to the repo — it's entered by hand each session
     and kept only in the browser tab.

## How it works

- **Instructor Portal**: enter the repo owner/name, sign in with Google →
  the app checks your email against `instructors.json`. If approved, enter
  your GitHub token to unlock the dashboard.
  - **Courses & Students tab**: set a semester (e.g. "Fall 2026") before
    creating a course — every new course is tagged with it. Use the
    "Filter everything by semester" dropdown to narrow every course list
    on the page (course table, attendance, gradebook) down to one semester,
    or view all. Enroll students either one at a time, or by **pasting
    rows copied straight from Excel** (Name, ID, email columns) into the
    "Paste from Excel" box.
  - **Attendance tab**: a spreadsheet grid like your Excel sheet — one row
    per student, one column per session date. Click a cell to cycle
    Present → Absent → Late; Present/Absent/% totals update automatically.
    Add new session columns with the date picker, or delete a session with
    the × on its column header.
  - **Gradebook tab**: same idea — one row per student, one column per
    assessment (Quiz 1, Midterm, etc.), every score out of a fixed 0–100
    scale. Type scores directly into the grid (values are clamped to
    0–100), Average updates automatically. Delete a column with the ×
    on its header.
  - Each "Save" button commits that file straight to the repo.
- **Student Profiles page** (`profiles.html`): a separate page, same sign-in
  and instructor check as the Instructor Portal. Search by name, ID, or
  email, optionally filter by course, then click "View" on any student for
  a full profile — attendance history + stats and every grade, in one
  popup. Each row also has a Delete button, which saves immediately.
- **Student Portal**: now a static page — it does not fetch, store, or
  display any student data, and has no sign-in. Students should be directed
  to their instructor for any question about their record.

## Signing in without re-entering anything every time
The first time you connect with a token, your email + name + token are all
saved together in `localStorage` on that browser/device. On future visits
— including opening a *different* page like `profiles.html`, since
`localStorage` is shared across all pages on the same site — you land
straight on the dashboard automatically, with no Google click and no token
prompt. If the saved token has expired or been revoked, it's cleared
automatically and you'll be dropped back to the normal sign-in flow. "Sign
out" (on either `teacher.html` or `profiles.html`) clears the saved session
everywhere immediately. Because this uses `localStorage`, it persists
across browser restarts on that device — don't use this on a shared or
public computer.

## Security note
The instructor-email check happens in the browser — it's a UX gate, not
real security by itself. The actual protection is the GitHub token: only
someone holding a valid token for this repo can read or write `data/*.json`
once the repo is set to Private (see "Privacy" section above). Keep that
token private and don't share it — anyone who has it can read or modify all
student data.
