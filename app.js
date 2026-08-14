// =============================================================
// 1. CONFIGURATION & AUTHORIZATION
// =============================================================
const ADMIN_EMAIL = "jalal.hameed@uobaghdad.edu.iq";

const firebaseConfig = {
    apiKey: "AIzaSyAmkSIIXidW4Fb36RRUkQhI5JzvV0pXGew",
    authDomain: "student-ws.firebaseapp.com",
    projectId: "student-ws",
    storageBucket: "student-ws.firebasestorage.app",
    messagingSenderId: "257401448840",
    appId: "1:257401448840:web:397be7fdd279d76c0c323d"
};

let db = null;
let auth = null;

if (typeof firebase !== 'undefined') {
    try {
        firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();
    } catch (e) {
        console.warn("Firebase initialization warning:", e);
    }
}

let globalStudents = [];
let globalCourses = [];
let currentPage = 'admin';

// =============================================================
// 2. AUTHENTICATION (STRICT GOOGLE AUTH)
// =============================================================
document.addEventListener('DOMContentLoaded', () => {
    const loginContainer = document.getElementById('login-container');
    const dashboardContainer = document.getElementById('dashboard-container');
    const googleLoginBtn = document.getElementById('google-login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const accessDeniedMsg = document.getElementById('access-denied');
    const userInfo = document.getElementById('user-info');

    // Warning for running via local file explorer
    if (window.location.protocol === 'file:') {
        if (accessDeniedMsg) {
            accessDeniedMsg.style.display = 'block';
            accessDeniedMsg.innerHTML = `⚠️ <strong>Local File Protocol Detected</strong><br>Google Sign-In will not open on <code>file://</code>. Please run this page using a local web server (e.g., VS Code Live Server).`;
        }
    }

    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (!auth) {
                alert("Firebase Auth SDK not initialized.");
                return;
            }
            const provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithPopup(provider).catch(error => {
                if (accessDeniedMsg) {
                    accessDeniedMsg.style.display = 'block';
                    accessDeniedMsg.innerHTML = `⚠️ Auth Error: ${error.message}`;
                }
            });
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (auth) auth.signOut().then(() => location.reload());
        });
    }

    if (auth) {
        auth.onAuthStateChanged(user => {
            if (user) {
                const userEmail = (user.email || "").toLowerCase().trim();
                if (userEmail === ADMIN_EMAIL.toLowerCase().trim()) {
                    if (accessDeniedMsg) accessDeniedMsg.style.display = 'none';
                    if (loginContainer) loginContainer.style.display = 'none';
                    if (dashboardContainer) dashboardContainer.style.display = 'block';
                    if (userInfo) userInfo.textContent = `Admin: ${user.email}`;
                    initDatabaseListeners();
                } else {
                    auth.signOut();
                    if (accessDeniedMsg) {
                        accessDeniedMsg.style.display = 'block';
                        accessDeniedMsg.innerHTML = `⛔ <strong>Access Denied (${user.email})</strong><br>Only <code>${ADMIN_EMAIL}</code> has Admin privileges.`;
                    }
                }
            } else {
                if (loginContainer) loginContainer.style.display = 'flex';
                if (dashboardContainer) dashboardContainer.style.display = 'none';
            }
        });
    }

    // Add Course Form Listener
    const courseForm = document.getElementById('course-form');
    if (courseForm) {
        courseForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const courseId = document.getElementById('course-id').value.trim();
            const name = document.getElementById('course-name').value.trim();

            if (db) {
                db.collection('courses').add({ courseId, name });
            }
            courseForm.reset();
        });
    }

    // Enroll Student Form Listener
    const studentForm = document.getElementById('student-form');
    if (studentForm) {
        studentForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const studentId = document.getElementById('student-id').value.trim();
            const name = document.getElementById('student-name').value.trim();
            const courseId = document.getElementById('student-course-assign').value;

            if (!courseId) {
                alert("Please select a course to enroll the student into.");
                return;
            }

            if (db) {
                db.collection('students').add({ studentId, name, courseId });
            }
            studentForm.reset();
        });
    }
});

// =============================================================
// 3. PAGE NAVIGATION
// =============================================================
window.switchPage = (page) => {
    currentPage = page;

    document.querySelectorAll('.page-view').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    const activePage = document.getElementById(`page-${page}`);
    const activeNav = document.getElementById(`nav-btn-${page}`);

    if (activePage) activePage.style.display = 'block';
    if (activeNav) activeNav.classList.add('active');

    if (page === 'attendance') renderAttendanceGrid();
    if (page === 'grades') renderGradebookGrid();
    if (page === 'admin') renderAdminLists();
};

// =============================================================
// 4. DATABASE REALTIME SYNC
// =============================================================
function initDatabaseListeners() {
    if (!db) return;

    db.collection('courses').onSnapshot(snapshot => {
        globalCourses = [];
        snapshot.forEach(doc => globalCourses.push({ id: doc.id, ...doc.data() }));
        refreshAllViews();
    });

    db.collection('students').onSnapshot(snapshot => {
        globalStudents = [];
        snapshot.forEach(doc => globalStudents.push({ id: doc.id, ...doc.data() }));
        refreshAllViews();
    });
}

function refreshAllViews() {
    updateDropdowns();
    renderAdminLists();
    renderAttendanceGrid();
    renderGradebookGrid();
}

function updateDropdowns() {
    const courseAssignSelect = document.getElementById('student-course-assign');
    const attSelect = document.getElementById('attendance-course-select');
    const gradeSelect = document.getElementById('grade-course-select');

    const statCourses = document.getElementById('stat-total-courses');
    const statStudents = document.getElementById('stat-total-students');

    if (statCourses) statCourses.textContent = globalCourses.length;
    if (statStudents) statStudents.textContent = globalStudents.length;

    [courseAssignSelect, attSelect, gradeSelect].forEach(sel => {
        if (!sel) return;
        const currentVal = sel.value;
        sel.innerHTML = '';
        globalCourses.forEach(c => {
            const opt = new Option(`${c.courseId}: ${c.name}`, c.id);
            sel.add(opt);
        });
        if (currentVal) sel.value = currentVal;
    });
}

// =============================================================
// 5. ADMIN & ROSTER MANAGEMENT
// =============================================================
function renderAdminLists() {
    const coursesBody = document.getElementById('courses-admin-list');
    const studentsBody = document.getElementById('students-admin-list');

    if (coursesBody) {
        coursesBody.innerHTML = '';
        globalCourses.forEach((c, idx) => {
            coursesBody.innerHTML += `
                <tr>
                    <td><strong>${idx + 1}</strong></td>
                    <td><span class="code-tag">${c.courseId}</span></td>
                    <td><strong>${c.name}</strong></td>
                    <td><button class="btn-delete" onclick="deleteCourse('${c.id}')">✕ Delete</button></td>
                </tr>`;
        });
    }

    if (studentsBody) {
        studentsBody.innerHTML = '';
        globalStudents.forEach((s, idx) => {
            const courseObj = globalCourses.find(c => c.id === s.courseId);
            const courseLabel = courseObj ? `${courseObj.courseId} - ${courseObj.name}` : 'Unassigned';

            studentsBody.innerHTML += `
                <tr>
                    <td><strong>${idx + 1}</strong></td>
                    <td><span class="code-tag">${s.studentId}</span></td>
                    <td><strong>${s.name}</strong></td>
                    <td><small>${courseLabel}</small></td>
                    <td><button class="btn-delete" onclick="deleteStudent('${s.id}')">✕ Remove</button></td>
                </tr>`;
        });
    }
}

// =============================================================
// 6. ATTENDANCE MATRIX (UNLIMITED SESSIONS: LEC, LAB, TUT)
// =============================================================
window.renderAttendanceGrid = () => {
    const attSelect = document.getElementById('attendance-course-select');
    const thead = document.getElementById('attendance-table-head');
    const tbody = document.getElementById('attendance-table-body');
    const summary = document.getElementById('attendance-summary');

    if (!attSelect || !thead || !tbody) return;
    const courseId = attSelect.value;

    thead.innerHTML = '';
    tbody.innerHTML = '';

    if (!courseId) {
        if (summary) summary.textContent = "No active course selected";
        return;
    }

    const courseStudents = globalStudents.filter(s => s.courseId === courseId);

    if (db) {
        db.collection('attendance').where('courseId', '==', courseId).get().then(snapshot => {
            const dateSet = new Set();
            const map = {};

            snapshot.forEach(doc => {
                const d = doc.data();
                if (d.date) {
                    dateSet.add(d.date);
                    if (!map[d.date]) map[d.date] = {};
                    map[d.date][d.studentId] = { docId: doc.id, present: d.present };
                }
            });

            const sortedDates = Array.from(dateSet).sort();
            buildAttendanceHeader(thead, sortedDates);

            let overallScoreSum = 0, count = 0;

            courseStudents.forEach((student, idx) => {
                let presentCount = 0;
                let rowHTML = `<tr>
                    <td><strong>${idx + 1}</strong></td>
                    <td class="sticky-col"><span class="code-tag">${student.studentId}</span></td>
                    <td class="sticky-col-2"><strong>${student.name}</strong></td>`;

                sortedDates.forEach(date => {
                    const rec = map[date] ? map[date][student.id] : null;
                    const present = rec ? rec.present : false;
                    const docId = rec ? rec.docId : '';
                    if (present) presentCount++;

                    rowHTML += `
                        <td>
                            <button class="btn-grid-status ${present ? 'present' : 'absent'}"
                                onclick="toggleFirebaseAttendance('${courseId}', '${date}', '${student.id}', ${!present}, '${docId}')">
                                ${present ? 'P' : 'A'}
                            </button>
                        </td>`;
                });

                const totalSessions = sortedDates.length;
                const attScore = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;
                overallScoreSum += attScore;
                count++;

                rowHTML += `
                    <td><strong>${presentCount}</strong></td>
                    <td><strong>${totalSessions}</strong></td>
                    <td><strong class="total-score">${attScore} / 100</strong></td>
                    <td><button class="btn-delete" onclick="deleteStudent('${student.id}')">✕</button></td>
                </tr>`;

                tbody.innerHTML += rowHTML;
            });

            const overallAvg = count > 0 ? Math.round(overallScoreSum / count) : 0;
            if (summary) summary.textContent = `Course Attendance Score: ${overallAvg} / 100 (${sortedDates.length} Sessions | ${courseStudents.length} Students)`;
        });
    }
};

function buildAttendanceHeader(thead, dates) {
    let headerHTML = `<tr>
        <th>#</th>
        <th class="sticky-col">Student ID</th>
        <th class="sticky-col-2">Student Name</th>`;

    dates.forEach(d => { headerHTML += `<th>${d}</th>`; });

    headerHTML += `
        <th>Present</th>
        <th>Sessions</th>
        <th>Score (/100)</th>
        <th>Action</th>
    </tr>`;

    thead.innerHTML = headerHTML;
}

window.toggleFirebaseAttendance = (courseId, date, studentId, status, docId) => {
    if (!db) return;
    if (docId) {
        db.collection('attendance').doc(docId).update({ present: status }).then(() => renderAttendanceGrid());
    } else {
        db.collection('attendance').add({ courseId, date, studentId, present: status }).then(() => renderAttendanceGrid());
    }
};

window.addNewAttendanceDate = () => {
    const defaultLabel = new Date().toISOString().split('T')[0];
    const sessionLabel = prompt("Enter Session Tag or Date (e.g., '2026-08-14', 'W1-Lec', 'W1-Lab', 'W1-Tut'):", defaultLabel);
    if (!sessionLabel) return;

    if (db) {
        const attSelect = document.getElementById('attendance-course-select');
        const courseId = attSelect ? attSelect.value : '';
        if (!courseId) {
            alert("Please select a course module first.");
            return;
        }
        db.collection('attendance').add({
            courseId,
            date: sessionLabel.trim(),
            studentId: 'dummy_init',
            present: false
        }).then(() => renderAttendanceGrid());
    }
};

// =============================================================
// 7. GRADEBOOK GRID MANAGEMENT
// =============================================================
window.renderGradebookGrid = () => {
    const gradeSelect = document.getElementById('grade-course-select');
    const tbody = document.getElementById('grade-table-body');
    const summary = document.getElementById('gradebook-summary');

    if (!gradeSelect || !tbody) return;
    const courseId = gradeSelect.value;
    tbody.innerHTML = '';

    if (!courseId) {
        if (summary) summary.textContent = "No active course selected";
        return;
    }

    const courseStudents = globalStudents.filter(s => s.courseId === courseId);

    if (db) {
        db.collection('grades').where('courseId', '==', courseId).get().then(snapshot => {
            const gradesMap = {};
            snapshot.forEach(doc => gradesMap[doc.data().studentId] = { docId: doc.id, ...doc.data() });

            let totalSum = 0, count = 0;
            courseStudents.forEach((student, idx) => {
                const entry = gradesMap[student.id] || {};
                const g = {
                    q1: Number(entry.q1 || 0), q2: Number(entry.q2 || 0),
                    a1: Number(entry.a1 || 0), a2: Number(entry.a2 || 0),
                    project: Number(entry.project || 0), report: Number(entry.report || 0),
                    midterm: Number(entry.midterm || 0), final: Number(entry.final || 0)
                };
                const total = g.q1 + g.q2 + g.a1 + g.a2 + g.project + g.report + g.midterm + g.final;
                totalSum += total; 
                count++;
                appendGradeRow(tbody, student, idx + 1, courseId, g, total, entry.docId);
            });
            const avg = count > 0 ? (totalSum / count).toFixed(1) : "0.0";
            if (summary) summary.textContent = `Course Average: ${avg} / 100 (${courseStudents.length} Students)`;
        });
    }
};

function appendGradeRow(tbody, student, rowNum, courseId, g, total, docId) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><strong>${rowNum}</strong></td>
        <td class="sticky-col"><span class="code-tag">${student.studentId}</span></td>
        <td class="sticky-col-2"><strong>${student.name}</strong></td>
        <td><input type="number" min="0" max="5" class="cell-input" value="${g.q1}" onchange="updateGrade('${student.id}', '${courseId}', 'q1', this.value, '${docId||''}')"></td>
        <td><input type="number" min="0" max="5" class="cell-input" value="${g.q2}" onchange="updateGrade('${student.id}', '${courseId}', 'q2', this.value, '${docId||''}')"></td>
        <td><input type="number" min="0" max="5" class="cell-input" value="${g.a1}" onchange="updateGrade('${student.id}', '${courseId}', 'a1', this.value, '${docId||''}')"></td>
        <td><input type="number" min="0" max="5" class="cell-input" value="${g.a2}" onchange="updateGrade('${student.id}', '${courseId}', 'a2', this.value, '${docId||''}')"></td>
        <td><input type="number" min="0" max="10" class="cell-input" value="${g.project}" onchange="updateGrade('${student.id}', '${courseId}', 'project', this.value, '${docId||''}')"></td>
        <td><input type="number" min="0" max="10" class="cell-input" value="${g.report}" onchange="updateGrade('${student.id}', '${courseId}', 'report', this.value, '${docId||''}')"></td>
        <td><input type="number" min="0" max="10" class="cell-input" value="${g.midterm}" onchange="updateGrade('${student.id}', '${courseId}', 'midterm', this.value, '${docId||''}')"></td>
        <td><input type="number" min="0" max="50" class="cell-input" value="${g.final}" onchange="updateGrade('${student.id}', '${courseId}', 'final', this.value, '${docId||''}')"></td>
        <td><strong class="total-score">${total} / 100</strong></td>
        <td><button class="btn-delete" onclick="deleteStudent('${student.id}')">✕</button></td>
    `;
    tbody.appendChild(tr);
}

window.updateGrade = (studentId, courseId, field, val, docId) => {
    const num = Number(val);
    if (db) {
        if (docId) {
            db.collection('grades').doc(docId).update({ [field]: num }).then(() => renderGradebookGrid());
        } else {
            db.collection('grades').add({ studentId, courseId, [field]: num }).then(() => renderGradebookGrid());
        }
    }
};

// =============================================================
// 8. DELETIONS & CSV EXPORT
// =============================================================
window.deleteCourse = (id) => {
    if (!confirm("Are you sure you want to delete this course module?")) return;
    if (db) {
        db.collection('courses').doc(id).delete();
    }
};

window.deleteStudent = (id) => {
    if (!confirm("Are you sure you want to remove this student?")) return;
    if (db) {
        db.collection('students').doc(id).delete();
    }
};

window.exportTableToCSV = (tableId, filename) => {
    const table = document.getElementById(tableId);
    if (!table) return;

    let csv = [];
    for (let i = 0; i < table.rows.length; i++) {
        let row = [];
        let cols = table.rows[i].querySelectorAll("td, th");
        for (let j = 0; j < cols.length - 1; j++) {
            let txt = cols[j].innerText.replace(/\n/g, " ").trim();
            const input = cols[j].querySelector('input');
            if (input) txt = input.value;
            row.push(`"${txt.replace(/"/g, '""')}"`);
        }
        csv.push(row.join(","));
    }

    const blob = new Blob([csv.join("\n")], { type: "text/csv" });
    const link = document.createElement("a");
    link.download = `${filename}_Export_${new Date().toISOString().split('T')[0]}.csv`;
    link.href = URL.createObjectURL(blob);
    link.click();
};
