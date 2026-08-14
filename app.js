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

// 🔒 SET YOUR GMAIL ADDRESS HERE
const MY_GMAIL = "jalal.hameed@uobaghdad.edu.iq"; 

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Global Cache
let globalStudents = [];
let globalCourses = [];

// DOM Elements
const loginContainer = document.getElementById('login-container');
const dashboardContainer = document.getElementById('dashboard-container');
const googleLoginBtn = document.getElementById('google-login-btn');
const logoutBtn = document.getElementById('logout-btn');
const accessDeniedMsg = document.getElementById('access-denied');
const userInfo = document.getElementById('user-info');

// Form Elements
const studentForm = document.getElementById('student-form');
const courseForm = document.getElementById('course-form');
const attendanceCourseSelect = document.getElementById('attendance-course-select');
const gradeStudentSelect = document.getElementById('grade-student-select');
const attendanceDate = document.getElementById('attendance-date');

// Set today's date in date picker
attendanceDate.value = new Date().toISOString().split('T')[0];

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
            userInfo.textContent = `Database Admin: ${user.email}`;
            
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
    const attSys = document.getElementById('system-attendance');
    const grdSys = document.getElementById('system-grades');
    const btnAtt = document.getElementById('tab-btn-attendance');
    const btnGrd = document.getElementById('tab-btn-grades');

    if (tab === 'attendance') {
        attSys.style.display = 'block';
        grdSys.style.display = 'none';
        btnAtt.classList.add('active');
        btnGrd.classList.remove('active');
    } else {
        attSys.style.display = 'none';
        grdSys.style.display = 'block';
        btnAtt.classList.remove('active');
        btnGrd.classList.add('active');
    }
};

// -------------------------------------------------------------
// 3. DATABASE LISTENERS
// -------------------------------------------------------------
function initDatabaseListeners() {
    // Listen to Students
    db.collection('students').onSnapshot(snapshot => {
        globalStudents = [];
        gradeStudentSelect.innerHTML = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            data.id = doc.id;
            globalStudents.push(data);

            const option = document.createElement('option');
            option.value = data.id;
            option.textContent = `${data.studentId} - ${data.name}`;
            gradeStudentSelect.appendChild(option);
        });

        renderAttendanceTable();
        renderStudentGradeCard();
    });

    // Listen to Courses
    db.collection('courses').onSnapshot(snapshot => {
        globalCourses = [];
        attendanceCourseSelect.innerHTML = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            data.id = doc.id;
            globalCourses.push(data);

            const option = document.createElement('option');
            option.value = data.id;
            option.textContent = `${data.courseId}: ${data.name}`;
            attendanceCourseSelect.appendChild(option);
        });

        renderAttendanceTable();
        renderStudentGradeCard();
    });
}

// -------------------------------------------------------------
// 4. ATTENDANCE SYSTEM (BY COURSE)
// -------------------------------------------------------------
window.renderAttendanceTable = () => {
    const courseId = attendanceCourseSelect.value;
    const date = attendanceDate.value;
    const tbody = document.getElementById('attendance-table-body');
    const summary = document.getElementById('attendance-summary');
    tbody.innerHTML = '';

    if (!courseId || !date || globalStudents.length === 0) {
        summary.textContent = "Please add students and courses first.";
        return;
    }

    db.collection('attendance')
        .where('courseId', '==', courseId)
        .where('date', '==', date)
        .get()
        .then(snapshot => {
            const records = {};
            snapshot.forEach(doc => records[doc.data().studentId] = { docId: doc.id, present: doc.data().present });

            let presentCount = 0;

            globalStudents.forEach(student => {
                const record = records[student.id];
                const isPresent = record ? record.present : false;
                if (isPresent) presentCount++;

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${student.studentId}</td>
                    <td><strong>${student.name}</strong></td>
                    <td>
                        <button class="btn-status ${isPresent ? 'present' : 'absent'}" 
                            onclick="setAttendance('${courseId}', '${date}', '${student.id}', ${!isPresent}, '${record ? record.docId : ''}')">
                            ${isPresent ? 'Present' : 'Absent'}
                        </button>
                    </td>
                    <td>
                        <button class="btn-delete" onclick="deleteStudent('${student.id}')">Delete Student</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            summary.textContent = `Present: ${presentCount} / ${globalStudents.length}`;
        });
};

window.setAttendance = (courseId, date, studentId, status, docId) => {
    if (docId) {
        db.collection('attendance').doc(docId).update({ present: status }).then(() => renderAttendanceTable());
    } else {
        db.collection('attendance').add({ courseId, date, studentId, present: status }).then(() => renderAttendanceTable());
    }
};

// -------------------------------------------------------------
// 5. GRADES SYSTEM (BY STUDENT)
// -------------------------------------------------------------
window.renderStudentGradeCard = () => {
    const studentId = gradeStudentSelect.value;
    const tbody = document.getElementById('grade-table-body');
    const gpaBadge = document.getElementById('overall-gpa');
    tbody.innerHTML = '';

    if (!studentId || globalCourses.length === 0) {
        gpaBadge.textContent = "Overall Average: N/A";
        return;
    }

    db.collection('grades')
        .where('studentId', '==', studentId)
        .get()
        .then(snapshot => {
            const gradesMap = {};
            snapshot.forEach(doc => gradesMap[doc.data().courseId] = { docId: doc.id, score: doc.data().score });

            let totalScore = 0;
            let courseCount = 0;

            globalCourses.forEach(course => {
                const gradeEntry = gradesMap[course.id];
                const score = gradeEntry ? gradeEntry.score : 0;
                totalScore += score;
                courseCount++;

                const letter = getLetterGrade(score);

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${course.courseId}</strong></td>
                    <td>${course.name}</td>
                    <td>
                        <input type="number" min="0" max="100" class="grade-input" value="${score}" 
                            onchange="saveGrade('${studentId}', '${course.id}', this.value, '${gradeEntry ? gradeEntry.docId : ''}')"> %
                    </td>
                    <td><span class="letter-badge grade-${letter}">${letter}</span></td>
                    <td>
                        <button class="btn-delete" onclick="deleteCourse('${course.id}')">Delete Course</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            const avg = courseCount > 0 ? (totalScore / courseCount).toFixed(1) : 0;
            gpaBadge.textContent = `Overall Average: ${avg}% (${getLetterGrade(avg)})`;
        });
};

window.saveGrade = (studentId, courseId, score, docId) => {
    const numScore = Number(score);
    if (docId) {
        db.collection('grades').doc(docId).update({ score: numScore }).then(() => renderStudentGradeCard());
    } else {
        db.collection('grades').add({ studentId, courseId, score: numScore }).then(() => renderStudentGradeCard());
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
// 6. ADD / DELETE HANDLERS
// -------------------------------------------------------------
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
    if (confirm("Remove student from database?")) db.collection('students').doc(id).delete();
};

window.deleteCourse = (id) => {
    if (confirm("Remove course from database?")) db.collection('courses').doc(id).delete();
};
