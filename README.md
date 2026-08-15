# Attendance & Grades System — GitHub-backed, Club-styled

Data lives in JSON files in your GitHub repo (no Firebase). Design matches
the Big Data AI Club website exactly (same fonts, colors, header/nav/footer,
auth top bar). All CSS is embedded directly in each HTML file — no external
stylesheet to go missing.

## Files
```
index.html       ← portal picker
teacher.html      ← Instructor Portal (courses, roster, attendance, gradebook)
student.html       ← Student Portal (read-only self-view)
data/
  courses.json     ← [{ code, name }]
  students.json     ← [{ id, name, email, courseCode }]
  attendance.json    ← { courseCode: { date: { studentId: "present"|"absent"|"late" } } }
  grades.json       ← { courseCode: { studentId: { assignmentName: { score, max } } } }
  instructors.json   ← [{ name, email }]  — who is allowed into the Instructor Portal
logo3.png, coai-english-logo.png, favicon.png ← club branding assets
style.css, dashboard.css ← reference copies only (already embedded in the HTML)
```

## One-time setup

1. **Upload everything** to your `Student_ws` repo (or wherever it's hosted),
   keeping the `data/` folder as-is relative to the HTML files.
2. **Create a Google OAuth Client ID** (used for sign-in on both portals):
   - [Google Cloud Console](https://console.cloud.google.com/) → new or
     existing project → **APIs & Services → Credentials → Create Credentials
     → OAuth client ID** → type **Web application**.
   - Under **Authorized JavaScript origins**, add your GitHub Pages URL,
     e.g. `https://jalal0019.github.io`
   - Copy the Client ID (ends in `.apps.googleusercontent.com`).
   - Paste it into **both** `teacher.html` and `student.html`, replacing:
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
  - **Courses & Students tab**: add courses, then enroll students either one
    at a time, or by **pasting rows copied straight from Excel** (Name, ID,
    email columns) into the "Paste from Excel" box — no more typing each
    student by hand.
  - **Attendance tab**: a spreadsheet grid like your Excel sheet — one row
    per student, one column per session date. Click a cell to cycle
    Present → Absent → Late; Present/Absent/% totals update automatically.
    Add new session columns with the date picker.
  - **Gradebook tab**: same idea — one row per student, one column per
    assessment (Quiz 1, Midterm, etc., each with its own max score), type
    scores directly into the grid, Total updates automatically.
  - Each "Save" button commits that file straight to the repo.
- **Student Portal**: enter the repo owner/name, sign in with Google → the
  app looks for your email in `students.json` (added by an instructor when
  enrolling you) and shows your attendance % and grades, read-only. No
  match → a "no record found" message, no data shown.

## Security note
Both the instructor-email check and the student lookup happen entirely in
the browser — they're a UX gate, not real security. Anyone with a GitHub
token to this repo can write to it regardless of what the page shows; anyone
who knows a student's email could, in principle, still fetch the public
`data/*.json` files directly (since the repo is public). If you need
stronger guarantees than "obscurity + a token you control," a small backend
would be required — happy to help design that if it becomes necessary.
