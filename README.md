# Attendance & Grades System — Big Data AI Club edition

This version is restyled to match the club website exactly (same fonts, colors,
header/nav/footer, auth top bar, and access-denied modal), and uses the **same
Firebase project** (`bigdataaiclub`) and the **same `approved-users.js`** role
file already hosted on the club's GitHub Pages site — so instructor access is
managed in one place.

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

1. **Deploy these files** to a GitHub Pages site (can be a new repo, or a
   subfolder of an existing one, e.g. `https://jalal0019.github.io/attendance/`).
2. **Add instructors** by editing `approved-users.js` in the
   `Big_Data_AI_Club_Baghdad` repo (already contains your admin email):
   ```js
   var APPROVED_USERS = {
     "jalal.hameed@uobaghdad.edu.iq": "admin",
     "some.professor@uobaghdad.edu.iq": "professor",
   };
   ```
   This file is shared with the main club website, so adding a professor here
   also gives them whatever the club site already grants that role.
3. **Check Firestore security rules** in the `bigdataaiclub` Firebase project
   (console.firebase.google.com → Firestore → Rules). At minimum you need:
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
   using a Firestore rule that checks a server-side roles collection, since
   client-side role checks (like the ones in `teacher.html`) are only a UI
   convenience, not real security. Let me know if you'd like help writing
   stricter rules.
4. Open `index.html`, choose a portal, and sign in with Google.

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
