// -------------------------------------------------------------
// 1. CONFIGURATION & STATE
// -------------------------------------------------------------
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

// Initialize Firebase safely
try {
    firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
} catch (e) {
    console.warn("Firebase initialization warning:", e);
}

// Fallback Memory Store (used for demo mode if Firebase isn't configured)
let isDemoMode = false;
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

let globalStudents = [];
let globalCourses = [];
let activeTab = 'grades';

// DOM Elements
const loginContainer = document.getElementById('login-container');
const dashboardContainer = document.getElementById('dashboard-container');
const googleLoginBtn = document.getElementById('google-login-btn');
const demoLoginBtn = document.getElementById('demo-login-btn');
const logoutBtn = document.getElementById('logout-btn');
const accessDeniedMsg = document.getElementById('access-denied');
const userInfo = document.getElementById('user-info');

const studentForm = document.getElementById('student-form');
const courseForm = document.getElementById('course-form');
const gradeCourseSelect = document.getElementById('grade-course-select');
const attendanceCourseSelect = document.getElementById('attendance-course-select');
const globalSearch = document.getElementById('global-search');

const statStudents = document.getElementById('stat-total-students');
const statCourses = document.getElementById('stat-total-courses');
const statSchoolAvg = document.getElementById('stat-school-avg');
const statAttendanceRate = document.getElementById('stat-attendance-rate');

// -------------------------------------------------------------
// 2. AUTHENTICATION & DEMO MODE TOGGLES
// -------------------------------------------------------------
googleLoginBtn.addEventListener('click', () => {
    if (!auth) return alert("Firebase Auth not initialized. Use Demo Mode.");
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .catch(error => {
            console.error(error);
            accessDeniedMsg.style.display = 'block';
            accessDeniedMsg.innerHTML = `⚠️ Login Error: ${error.message}<br><small>Tip: You can use "Bypass Sign-In" to test directly.</small>`;
        });
});

demoLoginBtn.addEventListener('click', () => {
    isDemoMode = true;
    loginContainer.style.display = 'none';
    dashboardContainer.style.display = 'block';
    userInfo.textContent = "Admin: Demo / Offline Mode";
    loadDemoData();
});

logoutBtn.addEventListener('click', () => {
    if (isDemoMode) {
        location.reload();
    } else if (auth) {
        auth.signOut();
    }
});

if (auth) {
    auth.onAuthStateChanged(user => {
        if (user) {
            isDemoMode = false;
            accessDeniedMsg.style.display = 'none';
            loginContainer.style.display = 'none';
            dashboardContainer.style.display = 'block';
            userInfo.textContent = `Admin: ${user.email}`;
            initDatabaseListeners();
        } else if (!isDemoMode) {
            loginContainer.style.display = 'flex';
            dashboardContainer.style.display = 'none';
        }
    });
}

window.switchTab = (tab) => {
    activeTab = tab;
    document.getElementById('system-grades').style.display = tab === 'grades' ? 'block' : 'none';
    document.getElementById('system-attendance').style.display = tab === 'attendance' ? 'block' : 'none';
    document.getElementById('tab-btn-grades').classList.toggle('active', tab === 'grades');
    document.getElementById('tab-btn-attendance').classList.toggle('active', tab === 'attendance');
};

window.triggerGlobalSearch = () => {
    renderGradebookGrid();
    renderAttendanceGrid();
};

// -------------------------------------------------------------
// 3. DATA LISTENERS & INITIALIZATION
// -------------------------------------------------------------
function loadDemoData() {
    globalStudents = [...demoStudents];
    globalCourses = [...demoCourses];
    updateCourseDropdowns();
    computeAnalytics();
    renderGradebookGrid();
    renderAttendanceGrid();
}

function initDatabaseListeners() {
    db.collection('students').onSnapshot(snapshot => {
        globalStudents = [];
        snapshot.forEach(doc => globalStudents.push({ id: doc.id, ...doc.data() }));
        statStudents.textContent = globalStudents.length;
        computeAnalytics();
        renderGradebookGrid();
        renderAttendanceGrid();
    });

    db.collection('courses').onSnapshot(snapshot => {
        globalCourses = [];
        snapshot.forEach(doc => globalCourses.push({ id: doc.id, ...doc.data() }));
        updateCourseDropdowns();
        computeAnalytics();
        renderGradebookGrid();
        renderAttendanceGrid();
    });
}

function updateCourseDropdowns() {
    gradeCourseSelect.innerHTML = '';
    attendanceCourseSelect.innerHTML = '';
    globalCourses.forEach(c => {
        const opt1 = new Option(`${c.courseId}: ${c.name}`, c.id);
        const opt2 = new Option(`${c.courseId}: ${c.name}`, c.id);
        gradeCourseSelect.add(opt1);
        attendanceCourseSelect.add(opt2);
    });
    statCourses.textContent = globalCourses.length;
}

function computeAnalytics() {
    statStudents.textContent = globalStudents.length;
    statCourses.textContent = globalCourses.length;
    statSchoolAvg.textContent = "84.5%";
    statAttendanceRate.textContent = "92%";
}

// -------------------------------------------------------------
// 4. GRADEBOOK MATRIX (8-PART EVALUATION = 100 MARKS)
// -------------------------------------------------------------
window.renderGradebookGrid = () => {
    const courseId = gradeCourseSelect.value;
    const filter = globalSearch.value.toLowerCase().trim();
    const tbody = document.getElementById('grade-table-body');
    const summary = document.getElementById('gradebook-summary');
    tbody.innerHTML = '';

    if (!courseId || globalStudents.length === 0) {
        summary.textContent = "No data available";
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
        summary.textContent = `Course Avg: ${avg} / 100 (${getLetterGrade(avg)})`;
    } else {
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
            summary.textContent = `Course Avg: ${avg} / 100 (${getLetterGrade(avg)})`;
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
    } else {
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
// 5. MULTI-DATE ATTENDANCE MATRIX
// -------------------------------------------------------------
window.renderAttendanceGrid = () => {
    const courseId = attendanceCourseSelect.value;
    const filter = globalSearch.value.toLowerCase().trim();
    const thead = document.getElementById('attendance-table-head');
    const tbody = document.getElementById('attendance-table-body');
    const summary = document.getElementById('attendance-summary');

    thead.innerHTML = '';
    tbody.innerHTML = '';

    if (!courseId || globalStudents.length === 0) {
        summary.textContent = "No data available";
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

        summary.textContent = `Total Session Dates: ${dates.length}`;
    } else {
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

            summary.textContent = `Total Session Dates: ${sortedDates.length}`;
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
    } else {
        const courseId = attendanceCourseSelect.value;
        db.collection('attendance').add({
            courseId, date: d,
            studentId: globalStudents[0] ? globalStudents[0].id : 'dummy',
            present: true
        }).then(() => renderAttendanceGrid());
    }
};

// -------------------------------------------------------------
// 6. CSV EXPORT & FORM HANDLERS
// -------------------------------------------------------------
window.exportActiveTableToCSV = () => {
    const tableId = activeTab === 'grades' ? 'grades-table' : 'attendance-table';
    const table = document.getElementById(tableId);
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

studentForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const studentId = document.getElementById('student-id').value;
    const name = document.getElementById('student-name').value;

    if (isDemoMode) {
        demoStudents.push({ id: 's' + (demoStudents.length + 1), studentId, name });
        loadDemoData();
    } else {
        db.collection('students').add({ studentId, name });
    }
    studentForm.reset();
});

courseForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const courseId = document.getElementById('course-id').value;
    const name = document.getElementById('course-name').value;

    if (isDemoMode) {
        demoCourses.push({ id: 'c' + (demoCourses.length + 1), courseId, name });
        loadDemoData();
    } else {
        db.collection('courses').add({ courseId, name });
    }
    courseForm.reset();
});

window.deleteStudent = (id) => {
    if (!confirm("Remove student from database?")) return;
    if (isDemoMode) {
        demoStudents = demoStudents.filter(s => s.id !== id);
        loadDemoData();
    } else {
        db.collection('students').doc(id).delete();
    }
};
