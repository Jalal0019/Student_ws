// -------------------------------------------------------------
// 1. FIREBASE CONFIGURATION (student-ws)
// -------------------------------------------------------------
const firebaseConfig = {
    apiKey: "AIzaSyAmkSIIXidW4Fb36RRUkQhI5JzvV0pXGew",
    authDomain: "student-ws.firebaseapp.com",
    projectId: "student-ws",
    storageBucket: "student-ws.firebasestorage.app",
    messagingSenderId: "257401448840",
    appId: "1:257401448840:web:397be7fdd279d76c0c323d"
};

// 🔒 PUT YOUR EXACT GMAIL ADDRESS HERE TO LOCK EVERYONE ELSE OUT
const MY_GMAIL = "jalal.hameed@uobaghdad.edu.iq"; 

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// DOM Elements
const loginContainer = document.getElementById('login-container');
const dashboardContainer = document.getElementById('dashboard-container');
const googleLoginBtn = document.getElementById('google-login-btn');
const logoutBtn = document.getElementById('logout-btn');
const accessDeniedMsg = document.getElementById('access-denied');
const userInfo = document.getElementById('user-info');

const studentForm = document.getElementById('student-form');
const studentList = document.getElementById('student-list');

// -------------------------------------------------------------
// 2. GOOGLE LOGIN SYSTEM
// -------------------------------------------------------------
googleLoginBtn.addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(error => {
        alert("Login Error: " + error.message);
    });
});

logoutBtn.addEventListener('click', () => {
    auth.signOut();
});

// Monitor Auth State
auth.onAuthStateChanged(user => {
    if (user) {
        // Check if logged-in email matches YOUR email
        if (user.email === MY_GMAIL) {
            accessDeniedMsg.style.display = 'none';
            loginContainer.style.display = 'none';
            dashboardContainer.style.display = 'block';
            userInfo.textContent = `Logged in as: ${user.email}`;
            
            // Listen to Firestore for live data updates
            loadStudentsRealtime();
        } else {
            // Reject unauthorized Google logins
            accessDeniedMsg.style.display = 'block';
            auth.signOut();
        }
    } else {
        loginContainer.style.display = 'flex';
        dashboardContainer.style.display = 'none';
    }
});

// -------------------------------------------------------------
// 3. FIRESTORE DATABASE (Cloud Storage)
// -------------------------------------------------------------

// Read students in real-time from cloud
function loadStudentsRealtime() {
    db.collection('students').onSnapshot(snapshot => {
        studentList.innerHTML = '';
        snapshot.forEach(doc => {
            const student = doc.data();
            const id = doc.id; // Document ID in Firestore

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${student.studentId}</td>
                <td><strong>${student.name}</strong></td>
                <td>
                    <button class="btn-status ${student.present ? 'present' : 'absent'}" onclick="toggleAttendance('${id}', ${student.present})">
                        ${student.present ? 'Present' : 'Absent'}
                    </button>
                </td>
                <td>
                    <input type="number" value="${student.grade}" min="0" max="100" style="width: 60px;" onchange="updateGrade('${id}', this.value)">
                </td>
                <td>
                    <button class="btn-delete" onclick="deleteStudent('${id}')">Remove</button>
                </td>
            `;
            studentList.appendChild(tr);
        });
    });
}

// Add student to Firestore
studentForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('student-name').value;
    const studentId = document.getElementById('student-id').value;

    db.collection('students').add({
        name: name,
        studentId: studentId,
        present: true,
        grade: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    studentForm.reset();
});

// Update attendance state in cloud
window.toggleAttendance = (docId, currentStatus) => {
    db.collection('students').doc(docId).update({
        present: !currentStatus
    });
};

// Update grade in cloud
window.updateGrade = (docId, newGrade) => {
    db.collection('students').doc(docId).update({
        grade: Number(newGrade)
    });
};

// Delete student from cloud
window.deleteStudent = (docId) => {
    db.collection('students').doc(docId).delete();
};
