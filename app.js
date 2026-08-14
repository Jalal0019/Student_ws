// -------------------------------------------------------------
// 1. CONFIGURATION & AUTHORIZATION
// -------------------------------------------------------------
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

// Safe Firebase Initialization
if (typeof firebase !== 'undefined') {
    try {
        firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();
    } catch (e) {
        console.warn("Firebase config error:", e);
    }
} else {
    console.warn("Firebase SDK not loaded or blocked.");
}

// Global Application State
let isDemoMode = false;
let globalStudents = [];
let globalCourses = [];
let activeTab = 'grades';

// Offline / Demo Memory Store
let demoStudents = [
    { id: "s1", studentId: "AI-2026-01", name: "Ahmadi Hassan" },
    { id: "s2", studentId: "AI-2026-02", name: "Zahra Ali" },
    { id: "s3", studentId: "AI-2026-03", name: "Omar Mustafa" }
];

let demoCourses = [
    { id: "c1", courseId: "BIGDATA-101", name: "Big Data Systems" },
    { id: "c2", courseId: "AI-402", name: "Deep Learning" }
];

let demoGrades = {
    "c1_s1": { q1: 5, q2: 4, a1: 5, a2: 5, project: 9, report: 10, midterm: 9, final: 45 },
    "c1_s2": { q1: 4, q2: 3, a1: 4, a2: 4, project: 8, report: 8, midterm: 7, final: 38 }
};

let demoAttendanceDates = ["2026-02-01", "2026-02-08", "2026-02-15"];
let demoAttendance = {
    "2026-02-01_s1": true, "2026-02-01_s2": true, "2026-02-01_s3": false,
    "2026-02-08_s1": true, "2026-02-08_s2": false, "2026-02-08_s3": true
};

// -------------------------------------------------------------
// 2. DOM INITIALIZATION & AUTH CHECK
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    const loginContainer = document.getElementById('login-container');
    const dashboardContainer = document.getElementById('dashboard-container');
    const googleLoginBtn = document.getElementById('google-login-btn');
    const demoLoginBtn = document.getElementById('demo-login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const accessDeniedMsg = document.getElementById('access-denied');
    const userInfo = document.getElementById('user-info');

    // Google Sign-In Click Handler
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (!auth) {
                alert("Firebase Auth is unavailable. Using Demo Mode instead.");
                enableDemoMode();
                return;
            }
            const provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithPopup(provider)
                .catch(error => {
                    console.error("Auth Error:", error);
                    if (accessDeniedMsg) {
                        accessDeniedMsg.style.display = 'block';
                        accessDeniedMsg.innerHTML = `⚠️ Sign-In Error: ${error.message}`;
                    }
                });
        });
    }

    // Bypass / Demo Access Click Handler
    if (demoLoginBtn) {
        demoLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            enableDemoMode();
        });
    }

    // Logout Click Handler
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (isDemoMode) {
                location.reload();
            } else if (auth) {
                auth.signOut().then(() => location.reload());
            }
        });
    }

    // Strict Auth Verification
    if (auth) {
        auth.onAuthStateChanged(user => {
            if (user) {
                const userEmail = (user.email || "").toLowerCase().trim();
                const targetAdmin = ADMIN_EMAIL.toLowerCase().trim();

                if (userEmail === targetAdmin) {
                    // AUTHORIZED ADMIN
                    isDemoMode = false;
                    if (accessDeniedMsg) accessDeniedMsg.style.display = 'none';
                    if (loginContainer) loginContainer.style.display = 'none';
                    if (dashboardContainer) dashboardContainer.style.display = 'block';
                    if (userInfo) userInfo.textContent = `Admin: ${user.email} (College of AI)`;
                    initDatabaseListeners();
                } else {
                    // UNAUTHORIZED EMAIL -> DENY ACCESS
                    auth.signOut();
                    if (accessDeniedMsg) {
                        accessDeniedMsg.style.display = 'block';
                        accessDeniedMsg.innerHTML = `⛔ <strong>Access Denied (${user.email})</strong><br>Only authorized account <code>${ADMIN_EMAIL}</code> can access this database.`;
                    }
                }
            } else if (!isDemoMode) {
                if (loginContainer) loginContainer.style.display = 'flex';
                if (dashboardContainer) dashboardContainer.style.display = 'none';
            }
        });
    }

    // Form Event Listeners
    const studentForm = document.getElementById('student-form');
    if (studentForm) {
        studentForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const studentId = document.getElementById('student-id').value;
            const name = document.getElementById('student-name').value;

            if (isDemoMode) {
                demoStudents.push({ id: 's' + (demoStudents.length + 1), studentId, name });
                loadDemoData();
            } else if (db) {
                db.collection('students').add({ studentId, name });
            }
            studentForm.reset();
        });
    }

    const courseForm = document.getElementById('course-form');
    if (courseForm) {
        courseForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const courseId = document.getElementById('course-id').value;
            const name = document.getElementById('course-name').value;

            if (isDemoMode) {
                demoCourses.push({ id: 'c' + (demoCourses.length + 1), courseId, name });
                loadDemoData();
            } else if (db) {
                db.collection('courses').add({ courseId, name });
            }
            courseForm.reset();
        });
    }
});

// Switch to offline/demo preview
function enableDemoMode() {
    isDemoMode = true;
    const loginContainer = document.getElementById('login-container');
    const dashboardContainer = document.getElementById('dashboard-container');
    const userInfo = document.getElementById('user-info');

    if (loginContainer) loginContainer.style.display = 'none';
    if (dashboardContainer) dashboardContainer.style.display = 'block';
    if (userInfo) userInfo.textContent = "Mode: Demo / Preview Access";

    loadDemoData();
}

// -------------------------------------------------------------
// 3. TAB NAVIGATION & GLOBAL SEARCH
// -------------------------------------------------------------
window.switchTab = (tab) => {
    activeTab = tab;
    const gradesSec = document.getElementById('system-grades');
    const attSec = document.getElementById('system-attendance');
    const btnGrades = document.getElementById('tab-btn-grades');
    const btnAtt = document.getElementById('tab-btn-attendance');

    if (gradesSec) gradesSec.style.display = tab === 'grades' ? 'block' : 'none';
    if (attSec) attSec.style.display = tab === 'attendance' ? 'block' : 'none';
    if (btnGrades) btnGrades.classList.toggle('active', tab === 'grades');
    if (btnAtt) btnAtt.classList.toggle('active', tab === 'attendance');
};

window.triggerGlobalSearch = () => {
    renderGradebookGrid();
    renderAttendanceGrid();
};

// -------------------------------------------------------------
// 4. DATA RENDER ENGINE
// -------------------------------------------------------------
function loadDemoData() {
    globalStudents = [...demoStudents];
    globalCourses = [...demoCourses];
    updateCourseDropdowns();
    renderGradebookGrid();
    renderAttendanceGrid();
}

function initDatabaseListeners() {
    if (!db) return;
    db.collection('students').onSnapshot(snapshot => {
        globalStudents = [];
        snapshot.forEach(doc => globalStudents.push({ id: doc.id, ...doc.data() }));
        renderGradebookGrid();
        renderAttendanceGrid();
    });

    db.collection('courses').onSnapshot(snapshot => {
        globalCourses = [];
        snapshot.forEach(doc => globalCourses.push({ id: doc.id, ...doc.data() }));
        updateCourseDropdowns();
        renderGradebookGrid();
        renderAttendanceGrid();
    });
}

function updateCourseDropdowns() {
    const gradeSelect = document.getElementById('grade-course-select');
    const attSelect = document.getElementById('attendance-course-select');
    const statStudents = document.getElementById('stat-total-students');
    const statCourses = document.getElementById('stat-total-courses');

    if (statStudents) statStudents.textContent = globalStudents.length;
    if (statCourses) statCourses.textContent = globalCourses.length;

    if (gradeSelect) gradeSelect.innerHTML = '';
    if (attSelect) attSelect.innerHTML = '';

    globalCourses.forEach(c => {
        const opt1 = new Option(`${c.courseId}: ${c.name}`, c.id);
        const opt2 = new Option(`${c.courseId}: ${c.name}`, c.id);
        if (gradeSelect) gradeSelect.add(opt1);
        if (attSelect) attSelect.add(opt2);
    });
}

// -------------------------------------------------------------
// 5. GRADEBOOK SPREADSHEET MATRIX
// -------------------------------------------------------------
window.renderGradebookGrid = () => {
    const gradeSelect = document.getElementById('grade-course-select');
    const globalSearch = document.getElementById('global-search');
    const tbody = document.getElementById('grade-table-body');
    const summary = document.getElementById('gradebook-summary');

    if (!gradeSelect || !tbody) return;
    const courseId = gradeSelect.value;
    const filter = globalSearch ? globalSearch.value.toLowerCase().trim() : '';
    tbody.innerHTML = '';

    if (!courseId || globalStudents.length === 0) {
        if (summary) summary.textContent = "No data available";
        return;
    }

    if (isDemoMode) {
        let totalSum = 0, count = 0;
        globalStudents.forEach(student => {
            if (filter && !student.name.toLowerCase().includes(filter) && !student.studentId.toLowerCase().includes(filter)) return;
            const key = `${courseId}_${student.id}`;
            const g = demoGrades[key] || { q1:0, q2:0, a1:0, a2:0, project:0, report:0, midterm:0, final:0 };
            const total = Number(g.q1)+Number(g.q2)+Number(g.a1)+Number(g.a2)+Number(g.project)+Number(g.report)+Number(g.midterm)+Number(g.final);
            totalSum += total; count++;
            appendGradeRow(tbody, student, courseId, g, total, null);
        });
        const avg = count > 0 ? (totalSum / count).toFixed(1) : 0;
        if (summary) summary.textContent = `Course Avg: ${avg} / 100 (${getLetterGrade(avg)})`;
    } else if (db) {
        db.collection('grades').where('courseId', '==', courseId).get().then(snapshot => {
            const gradesMap = {};
            snapshot.forEach(doc => gradesMap[doc.data().studentId] = { docId: doc.id, ...doc.data() });

            let totalSum = 0, count = 0;
            globalStudents.forEach(student => {
                if (filter && !student.name.toLowerCase().includes(filter) && !student.studentId.toLowerCase().includes(filter)) return;
                const entry = gradesMap[student.id] || {};
                const g = {
                    q1: Number(entry.q1 || 0), q2: Number(entry.q2 || 0),
                    a1: Number(entry.a1 || 0), a2: Number(entry.a2 || 0),
                    project: Number(entry.project || 0), report: Number(entry.report || 0),
                    midterm: Number(entry.midterm || 0), final: Number(entry.final || 0)
                };
                const total = g.q1 + g.q2 + g.a1 + g.a2 + g.project + g.report + g.midterm + g.final;
                totalSum += total; count++;
                appendGradeRow(tbody, student, courseId, g, total, entry.docId);
            });
            const avg = count > 0 ? (totalSum / count).toFixed(1) : 0;
            if (summary) summary.textContent = `Course Avg: ${avg} / 100 (${getLetterGrade(avg)})`;
        });
    }
};

function appendGradeRow(tbody, student, courseId, g, total, docId) {
    const letter = getLetterGrade(total);
    const tr = document.createElement('tr');
    tr.innerHTML = `
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
        <td><strong class="total-score">${total}</strong></td>
        <td><span class="letter-badge grade-${letter}">${letter}</span></td>
        <td><button class="btn-delete" onclick="deleteStudent('${student.id}')">✕</button></td>
    `;
    tbody.appendChild(tr);
}

window.updateGrade = (studentId, courseId, field, val, docId) => {
    const num = Number(val);
    if (isDemoMode) {
        const key = `${courseId}_${studentId}`;
        if (!demoGrades[key]) demoGrades[key] = { q1:0, q2:0, a1:0, a2:0, project:0, report:0, midterm:0, final:0 };
        demoGrades[key][field] = num;
        renderGradebookGrid();
    } else if (db) {
        if (docId) {
            db.collection('grades').doc(docId).update({ [field]: num }).then(() => renderGradebookGrid());
        } else {
            db.collection('grades').add({ studentId, courseId, [field]: num }).then(() => renderGradebookGrid());
        }
    }
};

function getLetterGrade(s) {
    if (s >= 90) return 'A';
    if (s >= 80) return 'B';
    if (s >= 70) return 'C';
    if (s >= 60) return 'D';
    return 'F';
}

// -------------------------------------------------------------
// 6. ATTENDANCE MATRIX
// -------------------------------------------------------------
window.renderAttendanceGrid = () => {
    const attSelect = document.getElementById('attendance-course-select');
    const globalSearch = document.getElementById('global-search');
    const thead = document.getElementById('attendance-table-head');
    const tbody = document.getElementById('attendance-table-body');
    const summary = document.getElementById('attendance-summary');

    if (!attSelect || !thead || !tbody) return;
    const courseId = attSelect.value;
    const filter = globalSearch ? globalSearch.value.toLowerCase().trim() : '';

    thead.innerHTML = '';
    tbody.innerHTML = '';

    if (!courseId || globalStudents.length === 0) {
        if (summary) summary.textContent = "No data available";
        return;
    }

    if (isDemoMode) {
        const dates = demoAttendanceDates;
        buildAttendanceHeader(thead, dates);

        globalStudents.forEach(student => {
            if (filter && !student.name.toLowerCase().includes(filter) && !student.studentId.toLowerCase().includes(filter)) return;
            let rowHTML = `<tr>
                <td class="sticky-col"><span class="code-tag">${student.studentId}</span></td>
                <td class="sticky-col-2"><strong>${student.name}</strong></td>`;

            dates.forEach(date => {
                const key = `${date}_${student.id}`;
                const present = demoAttendance[key] || false;
                rowHTML += `
                    <td>
                        <button class="btn-grid-status ${present ? 'present' : 'absent'}"
                            onclick="toggleDemoAttendance('${date}', '${student.id}')">
                            ${present ? 'P' : 'A'}
                        </button>
                    </td>`;
            });

            rowHTML += `<td><button class="btn-delete" onclick="deleteStudent('${student.id}')">✕</button></td></tr>`;
            tbody.innerHTML += rowHTML;
        });

        if (summary) summary.textContent = `Total Sessions: ${dates.length}`;
    } else if (db) {
        db.collection('attendance').where('courseId', '==', courseId).get().then(snapshot => {
            const dateSet = new Set();
            const map = {};

            snapshot.forEach(doc => {
                const d = doc.data();
                dateSet.add(d.date);
                if (!map[d.date]) map[d.date] = {};
                map[d.date][d.studentId] = { docId: doc.id, present: d.present };
            });

            const sortedDates = Array.from(dateSet).sort();
            buildAttendanceHeader(thead, sortedDates);

            globalStudents.forEach(student => {
                if (filter && !student.name.toLowerCase().includes(filter) && !student.studentId.toLowerCase().includes(filter)) return;
                let rowHTML = `<tr>
                    <td class="sticky-col"><span class="code-tag">${student.studentId}</span></td>
                    <td class="sticky-col-2"><strong>${student.name}</strong></td>`;

                sortedDates.forEach(date => {
                    const rec = map[date] ? map[date][student.id] : null;
                    const present = rec ? rec.present : false;
                    const docId = rec ? rec.docId : '';

                    rowHTML += `
                        <td>
                            <button class="btn-grid-status ${present ? 'present' : 'absent'}"
                                onclick="toggleFirebaseAttendance('${courseId}', '${date}', '${student.id}', ${!present}, '${docId}')">
                                ${present ? 'P' : 'A'}
                            </button>
                        </td>`;
                });

                rowHTML += `<td><button class="btn-delete" onclick="deleteStudent('${student.id}')">✕</button></td></tr>`;
                tbody.innerHTML += rowHTML;
            });

            if (summary) summary.textContent = `Total Sessions: ${sortedDates.length}`;
        });
    }
};

function buildAttendanceHeader(thead, dates) {
    let headerHTML = `<tr><th class="sticky-col">Student ID</th><th class="sticky-col-2">Student Name</th>`;
    dates.forEach(d => { headerHTML += `<th>${d}</th>`; });
    headerHTML += `<th>Action</th></tr>`;
    thead.innerHTML = headerHTML;
}

window.toggleDemoAttendance = (date, studentId) => {
    const key = `${date}_${studentId}`;
    demoAttendance[key] = !demoAttendance[key];
    renderAttendanceGrid();
};

window.toggleFirebaseAttendance = (courseId, date, studentId, status, docId) => {
    if (!db) return;
    if (docId) {
        db.collection('attendance').doc(docId).update({ present: status }).then(() => renderAttendanceGrid());
    } else {
        db.collection('attendance').add({ courseId, date, studentId, present: status }).then(() => renderAttendanceGrid());
    }
};

window.addNewAttendanceDate = () => {
    const d = prompt("Enter Session Date (YYYY-MM-DD):", new Date().toISOString().split('T')[0]);
    if (!d) return;

    if (isDemoMode) {
        if (!demoAttendanceDates.includes(d)) demoAttendanceDates.push(d);
        renderAttendanceGrid();
    } else if (db) {
        const attSelect = document.getElementById('attendance-course-select');
        const courseId = attSelect ? attSelect.value : '';
        db.collection('attendance').add({
            courseId, date: d,
            studentId: globalStudents[0] ? globalStudents[0].id : 'dummy',
            present: true
        }).then(() => renderAttendanceGrid());
    }
};

// -------------------------------------------------------------
// 7. EXPORT & DELETE HANDLERS
// -------------------------------------------------------------
window.exportActiveTableToCSV = () => {
    const tableId = activeTab === 'grades' ? 'grades-table' : 'attendance-table';
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
    link.download = `AI_Club_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
    link.href = URL.createObjectURL(blob);
    link.click();
};

window.deleteStudent = (id) => {
    if (!confirm("Remove student from database?")) return;
    if (isDemoMode) {
        demoStudents = demoStudents.filter(s => s.id !== id);
        loadDemoData();
    } else if (db) {
        db.collection('students').doc(id).delete();
    }
};
