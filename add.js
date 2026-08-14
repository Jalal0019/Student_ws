// -------------------------------------------------------------
// SET YOUR CREDENTIALS HERE
// -------------------------------------------------------------
const ADMIN_USER = "teacher";
const ADMIN_PASS = "admin123";

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const loginContainer = document.getElementById('login-container');
    const dashboardContainer = document.getElementById('dashboard-container');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const logoutBtn = document.getElementById('logout-btn');

    const studentForm = document.getElementById('student-form');
    const studentList = document.getElementById('student-list');

    // Check session on load
    if (localStorage.getItem('isLoggedIn') === 'true') {
        showDashboard();
    }

    // Handle Login
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const userInput = document.getElementById('username').value;
        const passInput = document.getElementById('password').value;

        if (userInput === ADMIN_USER && passInput === ADMIN_PASS) {
            localStorage.setItem('isLoggedIn', 'true');
            loginError.style.display = 'none';
            showDashboard();
        } else {
            loginError.style.display = 'block';
        }
    });

    // Handle Logout
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('isLoggedIn');
        loginContainer.style.display = 'flex';
        dashboardContainer.style.display = 'none';
    });

    function showDashboard() {
        loginContainer.style.display = 'none';
        dashboardContainer.style.display = 'block';
        render();
    }

    // -------------------------------------------------------------
    // STUDENT SYSTEM LOGIC
    // -------------------------------------------------------------
    let students = JSON.parse(localStorage.getItem('students')) || [];

    function saveAndRender() {
        localStorage.setItem('students', JSON.stringify(students));
        render();
    }

    function render() {
        studentList.innerHTML = '';
        students.forEach((student, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${student.id}</td>
                <td><strong>${student.name}</strong></td>
                <td>
                    <button class="btn-status ${student.present ? 'present' : 'absent'}" onclick="toggleAttendance(${index})">
                        ${student.present ? 'Present' : 'Absent'}
                    </button>
                </td>
                <td>
                    <input type="number" value="${student.grade}" min="0" max="100" style="width: 60px;" onchange="updateGrade(${index}, this.value)">
                </td>
                <td>
                    <button class="btn-delete" onclick="deleteStudent(${index})">Remove</button>
                </td>
            `;
            studentList.appendChild(tr);
        });
    }

    studentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('student-name').value;
        const id = document.getElementById('student-id').value;

        students.push({ id, name, present: true, grade: 0 });
        studentForm.reset();
        saveAndRender();
    });

    window.toggleAttendance = (index) => {
        students[index].present = !students[index].present;
        saveAndRender();
    };

    window.updateGrade = (index, value) => {
        students[index].grade = Number(value);
        saveAndRender();
    };

    window.deleteStudent = (index) => {
        students.splice(index, 1);
        saveAndRender();
    };
});
