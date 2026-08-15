# Attendance & Grades System — Big Data AI Club edition

This version is restyled to match the club website exactly (same fonts, colors,
header/nav/footer, auth top bar, and access-denied modal). It uses its **own
dedicated Firebase project** (`student-ws`) for data, while reusing the club
website's `approved-users.js` role file purely to decide who counts as an
instructor — the two are otherwise independent.

**Note:** as of this version, all CSS is embedded directly inside each HTML
file, so the pages have zero external stylesheet dependencies — they'll
render correctly even if `style.css`/`dashboard.css` aren't uploaded. Those
two files are still included for reference/editing only.


## Files
```
index.html      ← portal picker
teacher.html     ← Instructor Portal (courses, roster, attendance, gradebook)
student.html      ← Student Portal (read-only self-view)
style.css        ← the club site's own stylesheet (copied as-is)
dashboard.css     ← extra components (tables, tabs, stat cards) using the same
                     design tokens (--navy, --indigo, --gold, etc.)
logo3.png, coai-english-logo.png, favicon.png ← club branding assets
```

## How access works

- **Instructor Portal**: on sign-in, the app checks the visitor's email against
  `APPROVED_USERS` in `approved-users.js` (loaded live from the club's repo).
  Only emails with role `admin` or `professor` get in. Everyone else sees the
  same "Access Denied" modal used on the club site.
- **Student Portal**: any signed-in Google account can attempt to view a
  record, but the app only shows data if that exact email exists in the
  `students` Firestore collection (added by an instructor when enrolling
  them). No email → "No record found" message, no data shown.

## One-time setup

1. **Deploy these files** to your `Student_ws` GitHub Pages repo, replacing
   the existing content (`https://jalal0019.github.io/Student_ws/`).
2. **Enable Google sign-in on the `student-ws` Firebase project** (this is
   separate from the club's `bigdataaiclub` project, so it must be turned on
   here too):
   - Firebase Console → project `student-ws` → Authentication → Sign-in method
     → enable **Google**.
   - Authentication → Settings → Authorized domains → add `jalal0019.github.io`.
3. **Check Firestore exists and has rules** for `student-ws`:
   - Firebase Console → project `student-ws` → Firestore Database → if not
     created yet, click "Create database".
   - Rules tab, use at minimum:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /courses/{id}   { allow read, write: if request.auth != null; }
       match /students/{id}  { allow read, write: if request.auth != null; }
       match /attendance/{id}{ allow read, write: if request.auth != null; }
       match /grades/{id}    { allow read, write: if request.auth != null; }
     }
   }
   ```
   This lets any signed-in Google user *read* (needed for the student
   self-view) but you may want to tighten `write` to admin/professor-only
   using server-side rules, since the client-side role check in
   `teacher.html` is only a UI convenience, not real security. Let me know if
   you'd like help writing stricter rules.
4. **Add instructors** by editing `approved-users.js` in the
   `Big_Data_AI_Club_Baghdad` repo (already contains your admin email):
   ```js
   var APPROVED_USERS = {
     "jalal.hameed@uobaghdad.edu.iq": "admin",
     "some.professor@uobaghdad.edu.iq": "professor",
   };
   ```
5. Open `index.html`, choose a portal, and sign in with Google.

## Data model (Firestore)
- `courses/{id}`: `{ code, title }`
- `students/{id}`: `{ studentId, name, email, courseId }`
- `attendance/{courseId_date}`: `{ courseId, date, statuses: { studentDocId: "present"|"absent"|"late" } }`
- `grades/{courseId}`: `{ courseId, entries: { studentDocId: { assignmentName: { score, max } } } }`

## Notes
- The Instructor Portal role check happens in the browser, same as the club
  site's pattern — good enough to keep casual visitors out, but a determined
  user could bypass the UI. Real protection is the Firestore rules above.
- If you'd rather instructors only see courses they teach (not all courses),
  I can add a `ownerEmail` field to courses and filter — just ask.
