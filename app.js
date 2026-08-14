// =============================================================
// 2. AUTHENTICATION (WITH LOADING STATE & ERROR HANDLING)
// =============================================================
document.addEventListener('DOMContentLoaded', () => {
    const loginContainer = document.getElementById('login-container');
    const dashboardContainer = document.getElementById('dashboard-container');
    const googleLoginBtn = document.getElementById('google-login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const accessDeniedMsg = document.getElementById('access-denied');
    const userInfo = document.getElementById('user-info');

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
        // Show loading state while checking user session
        if (userInfo) userInfo.textContent = "Connecting to Firebase...";

        auth.onAuthStateChanged(user => {
            if (user) {
                const userEmail = (user.email || "").toLowerCase().trim();
                if (userEmail === ADMIN_EMAIL.toLowerCase().trim()) {
                    if (accessDeniedMsg) accessDeniedMsg.style.display = 'none';
                    if (loginContainer) loginContainer.style.display = 'none';
                    if (dashboardContainer) dashboardContainer.style.display = 'block';
                    if (userInfo) userInfo.textContent = `Admin: ${user.email}`;

                    // Initialize Realtime Listeners to fetch saved data
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

    // Forms
    const courseForm = document.getElementById('course-form');
    if (courseForm) {
        courseForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const courseId = document.getElementById('course-id').value.trim();
            const name = document.getElementById('course-name').value.trim();

            if (db) {
                db.collection('courses').add({ courseId, name })
                  .catch(err => alert("Error saving course: " + err.message));
            }
            courseForm.reset();
        });
    }

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
                db.collection('students').add({ studentId, name, courseId })
                  .catch(err => alert("Error enrolling student: " + err.message));
            }
            studentForm.reset();
        });
    }
});

// Realtime Listener Error Handling
function initDatabaseListeners() {
    if (!db) return;

    db.collection('courses').onSnapshot(
        snapshot => {
            globalCourses = [];
            snapshot.forEach(doc => globalCourses.push({ id: doc.id, ...doc.data() }));
            refreshAllViews();
        },
        error => {
            console.error("Firestore Courses Error:", error);
            alert("Database Error (Courses): " + error.message + "\nCheck Firebase Security Rules.");
        }
    );

    db.collection('students').onSnapshot(
        snapshot => {
            globalStudents = [];
            snapshot.forEach(doc => globalStudents.push({ id: doc.id, ...doc.data() }));
            refreshAllViews();
        },
        error => {
            console.error("Firestore Students Error:", error);
            alert("Database Error (Students): " + error.message + "\nCheck Firebase Security Rules.");
        }
    );
}
