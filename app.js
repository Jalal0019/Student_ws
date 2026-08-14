// -------------------------------------------------------------
// 1. FIREBASE CONFIGURATION
// -------------------------------------------------------------
const firebaseConfig = {
    apiKey: "AIzaSyAmkSIIXidW4Fb36RRUkQhI5JzvV0pXGew",
    authDomain: "student-ws.firebaseapp.com",
    projectId: "student-ws",
    storageBucket: "student-ws.firebasestorage.app",
    messagingSenderId: "257401448840",
    appId: "1:257401448840:web:397be7fdd279d76c0c323d"
};

// 🔒 RESTRICTED TO YOUR GMAIL ADDRESS
const MY_GMAIL = "jalal.hameed@uobaghdad.edu.iq"; 

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Global Caches
let globalStudents = [];
let globalCourses = [];
let activeTab = 'grades';

// DOM Elements
const loginContainer = document.getElementById('login-container');
const dashboardContainer = document.getElementById('dashboard-container');
const googleLoginBtn = document.getElementById('google-login-btn');
const logoutBtn = document.getElementById('logout-btn');
const accessDeniedMsg = document.getElementById('access-denied');
const userInfo = document.getElementById('user-info');

// Selects & Inputs
const studentForm = document.getElementById('student-form');
const courseForm = document.getElementById('course-form');
const gradeCourseSelect = document.getElementById('grade-course-select');
const attendanceCourseSelect = document.getElementById('attendance-course-select');
const globalSearch = document.getElementById('global-search');

// Stat Elements
const statStudents = document.getElementById('stat-total-students');
const statCourses = document.getElementById('stat-total-courses');
const statSchoolAvg = document.getElementById('stat-school-avg');
const statAttendanceRate = document.getElementById('stat-attendance-rate');

// -------------------------------------------------------------
// 2. AUTHENTICATION & NAVIGATION
// -------------------------------------------------------------
googleLoginBtn.addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(e => alert("Login Error: " + e.message));
});

logoutBtn.addEventListener('click', () => auth.signOut());

auth.onAuthStateChanged(user => {
    if (user) {
        if (user.email === MY_GMAIL) {
            accessDeniedMsg.style.display = 'none';
            loginContainer.style.display = 'none';
            dashboardContainer.style.display = 'block';
            userInfo.textContent = `Authorized Admin: ${user.email}`;
            
            initDatabaseListeners();
        } else {
            accessDeniedMsg.style.display = 'block';
            auth.signOut();
        }
    } else {
        loginContainer.style.display = 'flex';
        dashboardContainer.style.display = 'none';
    }
});

window.switchTab = (tab) => {
    activeTab = tab;
    const grdSys = document.getElementById('system-grades');
    const attSys = document.getElementById('system-attendance');
    const btnGrd = document.getElementById('tab-btn-grades');
    const btnAtt = document.getElementById('tab-btn-attendance');

    if (tab === 'grades') {
        grdSys.style.display = 'block';
        attSys.style.display = 'none';
        btnGrd.classList.add('active');
        btnAtt.classList.remove('active');
    } else {
        grdSys.style.display = 'none';
        attSys.style.display = 'block';
        btnGrd.classList.remove('active');
        btnAtt.classList.add('active');
    }
};

window.triggerGlobalSearch = () => {
    renderGradebookGrid();
    renderAttendanceGrid();
};

// -------------------------------------------------------------
// 3. LISTENERS & ANALYTICS
// -------------------------------------------------------------
function initDatabaseListeners() {
    db.collection('students').onSnapshot(snapshot => {
        globalStudents = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            data.id = doc.id;
            globalStudents.push(data);
        });

        statStudents.textContent = globalStudents.length;
        computeGlobalAnalytics();
        renderGradebookGrid();
        renderAttendanceGrid();
    });

    db.collection('courses').onSnapshot(snapshot => {
        globalCourses = [];
        gradeCourseSelect.innerHTML = '';
        attendanceCourseSelect.innerHTML = '';

        snapshot.forEach(doc => {
            const data = doc.data();
            data.id = doc.id;
            globalCourses.push(data);

            const opt1 = document.createElement('option');
            opt1.value = data.id;
            opt1.textContent = `${data.courseId}: ${data.name}`;
            gradeCourseSelect.appendChild(opt1);

            const opt2 = document.createElement('option');
            opt2.value = data.id;
            opt2.textContent = `${data.courseId}: ${data.name}`;
            attendanceCourseSelect.appendChild(opt2);
        });

        statCourses.textContent = globalCourses.length;
        renderGradebookGrid();
        renderAttendanceGrid();
    });
}

function computeGlobalAnalytics() {
    db.collection('grades').get().then(snapshot => {
        if (snapshot.empty) {
            statSchoolAvg.textContent = "--%";
            return;
        }
        let totalSum = 0, count = 0;
        snapshot.forEach(doc => {
            const d = doc.data();
            const total = Number(d.q1||0)+Number(d.q2||0)+Number(d.a1||0)+Number(d.a2||0)+Number(d.project||0)+Number(d.report||0)+Number(d.midterm||0)+Number(d.final||0);
            totalSum += total;
            count++;
        });
        const avg = count > 0 ? (totalSum / count).toFixed(1) : 0;
        statSchoolAvg.textContent = `${avg}%`;
    });

    const todayStr = new Date().toISOString().split('T')[0];
    db.collection('attendance').where('date', '==', todayStr).get().then(snapshot => {
        if (snapshot.empty || globalStudents.length === 0) {
            statAttendanceRate.textContent = "--%";
            return;
        }
        let presentCount = 0;
        snapshot.forEach(doc => {
            if (doc.data().present) presentCount++;
        });
        const rate = ((presentCount / globalStudents.length) * 100).toFixed(0);
        statAttendanceRate.textContent = `${rate}%`;
    });
}

// -------------------------------------------------------------
// 4. GRADEBOOK GRID (QUIZZES, ASSIGNMENTS, MIDTERM, FINAL)
// -------------------------------------------------------------
window.renderGradebookGrid = () => {
    const courseId = gradeCourseSelect.value;
    const filter = globalSearch.value.toLowerCase().trim();
    const tbody = document.getElementById('grade-table-body');
    const summary = document.getElementById('gradebook-summary');
    tbody.innerHTML = '';

    if (!courseId || globalStudents.length === 0) {
        summary.textContent = "Please add students and courses first.";
        return;
    }

    db.collection('grades')
        .where('courseId', '==', courseId)
        .get()
        .then(snapshot => {
            const gradesMap = {};
            snapshot.forEach(doc => gradesMap[doc.data().studentId] = { docId: doc.id, ...doc.data() });

            let courseTotalSum = 0;
            let studentCount = 0;

            globalStudents.forEach(student => {
                if (filter && !student.name.toLowerCase().includes(filter) && !student.studentId.toLowerCase().includes(filter)) {
                    return;
                }

                const entry = gradesMap[student.id] || {};
                const q1 = Number(entry.q1 || 0);
                const q2 = Number(entry.q2 || 0);
                const a1 = Number(entry.a1 || 0);
                const a2 = Number(entry.a2 || 0);
                const proj = Number(entry.project || 0);
                const rep = Number(entry.report || 0);
                const mid = Number(entry.midterm || 0);
                const fin = Number(entry.final || 0);

                const totalScore = q1 + q2 + a1 + a2 + proj + rep + mid + fin;
                courseTotalSum += totalScore;
                studentCount++;

                const letter = getLetterGrade(totalScore);

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="sticky-col"><span class="code-tag">${student.studentId}</span></td>
                    <td class="sticky-col-2"><strong>${student.name}</strong></td>
                    <td><input type="number" min="0" max="5" class="cell-input" value="${q1}" onchange="updateGradeField('${student.id}', '${courseId}', 'q1', this.value, '${entry.docId||''}')"></td>
                    <td><input type="number" min="0" max="5" class="cell-input" value="${q2}" onchange="updateGradeField('${student.id}', '${courseId}', 'q2', this.value, '${entry.docId||''}')"></td>
                    <td><input type="number" min="0" max="5" class="cell-input" value="${a1}" onchange="updateGradeField('${student.id}', '${courseId}', 'a1', this.value, '${entry.docId||''}')"></td>
                    <td><input type="number" min="0" max="5" class="cell-input" value="${a2}" onchange="updateGradeField('${student.id}', '${courseId}', 'a2', this.value, '${entry.docId||''}')"></td>
                    <td><input type="number" min="0" max="10" class="cell-input" value="${proj}" onchange="updateGradeField('${student.id}', '${courseId}', 'project', this.value, '${entry.docId||''}')"></td>
                    <td><input type="number" min="0" max="10" class="cell-input" value="${rep}" onchange="updateGradeField('${student.id}', '${courseId}', 'report', this.value, '${entry.docId||''}')"></td>
                    <td><input type="number" min="0" max="10" class="cell-input" value="${mid}" onchange="updateGradeField('${student.id}', '${courseId}', 'midterm', this.value, '${entry.docId||''}')"></td>
                    <td><input type="number" min="0" max="50" class="cell-input" value="${fin}" onchange="updateGradeField('${student.id}', '${courseId}', 'final', this.value, '${entry.docId||''}')"></td>
                    <td><strong class="total-score">${totalScore}</strong></td>
                    <td><span class="letter-badge grade-${letter}">${letter}</span></td>
                    <td><button class="btn-delete" onclick="deleteStudent('${student.id}')">Remove</button></td>
                `;
                tbody.appendChild(tr);
            });

            const avg = studentCount > 0 ? (courseTotalSum / studentCount).toFixed(1) : 0;
            summary.textContent = `Course Average Total: ${avg} / 100 (${getLetterGrade(avg)})`;
        });
};

window.updateGradeField = (studentId, courseId, field, value, docId) => {
    const numVal = Number(value);
    if (docId) {
        db.collection('grades').doc(docId).update({ [field]: numVal }).then(() => {
            renderGradebookGrid();
            computeGlobalAnalytics();
        });
    } else {
        db.collection('grades').add({ studentId, courseId, [field]: numVal }).then(() => {
            renderGradebookGrid();
            computeGlobalAnalytics();
        });
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
// 5. ATTENDANCE SPREADSHEET (ALL DATES HORIZONTALLY)
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
        summary.textContent = "Please add students and courses first.";
        return;
    }

    db.collection('attendance')
        .where('courseId', '==', courseId)
        .get()
        .then(snapshot => {
            const dateSet = new Set();
            const attendanceMap = {}; // { date: { studentId: { docId, present } } }

            snapshot.forEach(doc => {
                const data = doc.data();
                dateSet.add(data.date);
                if (!attendanceMap[data.date]) attendanceMap[data.date] = {};
                attendanceMap[data.date][data.studentId] = { docId: doc.id, present: data.present };
            });

            const sortedDates = Array.from(dateSet).sort();

            // Build Header Row
            let headerHTML = `<tr><th class="sticky-col">Student ID</th><th class="sticky-col-2">Student Name</th>`;
            sortedDates.forEach(date => {
                headerHTML += `<th>${date}</th>`;
            });
            headerHTML += `<th>Manage</th></tr>`;
            thead.innerHTML = headerHTML;

            // Build Student Rows
            globalStudents.forEach(student => {
                if (filter && !student.name.toLowerCase().includes(filter) && !student.studentId.toLowerCase().includes(filter)) {
                    return;
                }

                let rowHTML = `<tr>
                    <td class="sticky-col"><span class="code-tag">${student.studentId}</span></td>
                    <td class="sticky-col-2"><strong>${student.name}</strong></td>`;

                sortedDates.forEach(date => {
                    const record = attendanceMap[date] ? attendanceMap[date][student.id] : null;
                    const isPresent = record ? record.present : false;
                    const docId = record ? record.docId : '';

                    rowHTML += `
                        <td>
                            <button class="btn-grid-status ${isPresent ? 'present' : 'absent'}"
                                onclick="toggleGridAttendance('${courseId}', '${date}', '${student.id}', ${!isPresent}, '${docId}')">
                                ${isPresent ? 'P' : 'A'}
                            </button>
                        </td>`;
                });

                rowHTML += `<td><button class="btn-delete" onclick="deleteStudent('${student.id}')">Remove</button></td></tr>`;
                tbody.innerHTML += rowHTML;
            });

            summary.textContent = `Total Session Dates: ${sortedDates.length}`;
        });
};

window.toggleGridAttendance = (courseId, date, studentId, status, docId) => {
    if (docId) {
        db.collection('attendance').doc(docId).update({ present: status }).then(() => renderAttendanceGrid());
    } else {
        db.collection('attendance').add({ courseId, date, studentId, present: status }).then(() => renderAttendanceGrid());
    }
};

window.addNewAttendanceDate = () => {
    const courseId = attendanceCourseSelect.value;
    if (!courseId) return alert("Select a course first!");

    const selectedDate = prompt("Enter Session Date (YYYY-MM-DD):", new Date().toISOString().split('T')[0]);
    if (selectedDate) {
        // Initialize 1 record to create the date column in database
        db.collection('attendance').add({
            courseId: courseId,
            date: selectedDate,
            studentId: globalStudents[0] ? globalStudents[0].id : 'dummy',
            present: true
        }).then(() => renderAttendanceGrid());
    }
};

// -------------------------------------------------------------
// 6. CSV SHEET EXPORT & DELETIONS
// -------------------------------------------------------------
window.exportActiveTableToCSV = () => {
    const tableId = activeTab === 'grades' ? 'grades-table' : 'attendance-table';
    const filename = `AI_Club_Spreadsheet_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
    const table = document.getElementById(tableId);

    let csv = [];
    for (let i = 0; i < table.rows.length; i++) {
        let row = [];
        let cols = table.rows[i].querySelectorAll("td, th");
        
        for (let j = 0; j < cols.length - 1; j++) {
            let text = cols[j].innerText.replace(/(\r\n|\n|\r)/gm, "").trim();
            const input = cols[j].querySelector('input');
            if (input) text = input.value;
            
            text = text.replace(/"/g, '""');
            row.push('"' + text + '"');
        }
        csv.push(row.join(","));
    }

    const csvBlob = new Blob([csv.join("\n")], { type: "text/csv" });
    const downloadLink = document.createElement("a");
    downloadLink.download = filename;
    downloadLink.href = window.URL.createObjectURL(csvBlob);
    downloadLink.style.display = "none";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
};

studentForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const studentId = document.getElementById('student-id').value;
    const name = document.getElementById('student-name').value;

    db.collection('students').add({ studentId, name });
    studentForm.reset();
});

courseForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const courseId = document.getElementById('course-id').value;
    const name = document.getElementById('course-name').value;

    db.collection('courses').add({ courseId, name });
    courseForm.reset();
});

window.deleteStudent = (id) => {
    if (confirm("Delete student from database?")) db.collection('students').doc(id).delete();
};

window.deleteCourse = (id) => {
    if (confirm("Delete course module from database?")) db.collection('courses').doc(id).delete();
};
