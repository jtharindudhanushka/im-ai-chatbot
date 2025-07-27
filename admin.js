import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Firebase Config (Should be the same as your main app) ---
const firebaseConfig = {
    apiKey: "AIzaSyDPT9lgYfkXyvuYaYPTrycmpEjA1fChYkw",
    authDomain: "mit-ai-chatbot.firebaseapp.com",
    projectId: "mit-ai-chatbot",
    storageBucket: "mit-ai-chatbot.firebasestorage.app",
    messagingSenderId: "562597392469",
    appId: "1:562597392469:web:5719cbb3be771af63e24dc",
    measurementId: "G-KVX5EHHRPC"
};

// --- DOM Elements ---
const loginScreen = document.getElementById('login-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('login-error');
const loadingState = document.getElementById('loading-state');
const tableContainer = document.getElementById('applications-table-container');
const tableBody = document.querySelector('#applications-table tbody');
const noAppsMessage = document.getElementById('no-applications');
const downloadBtn = document.getElementById('download-btn');

// --- App State ---
let db, auth;
let applicationsData = []; // To store data for CSV export

// --- Main Initializer ---
// BUG FIX: Wait for the DOM to be fully loaded before running the script
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded. Initializing admin panel...");
    init();
});

function init() {
    try {
        const app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        setupEventListeners();
        checkAuthState();
    } catch (error) {
        console.error("Firebase initialization failed:", error);
        loginError.textContent = "Failed to initialize application.";
        loginError.classList.remove('hidden');
    }
}

// --- Authentication ---
function checkAuthState() {
    onAuthStateChanged(auth, user => {
        if (user) {
            // User is logged in
            console.log("User is logged in:", user.email);
            loginScreen.classList.add('hidden');
            dashboardScreen.classList.remove('hidden');
            fetchApplications();
        } else {
            // User is logged out
            console.log("User is logged out.");
            loginScreen.classList.remove('hidden');
            dashboardScreen.classList.add('hidden');
        }
    });
}

function handleLogin() {
    console.log("Login button clicked."); // For debugging
    const email = emailInput.value;
    const password = passwordInput.value;
    
    if (!email || !password) {
        loginError.textContent = "Please enter both email and password.";
        loginError.classList.remove('hidden');
        return;
    }

    loginError.classList.add('hidden'); // Hide previous errors

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // Signed in successfully, onAuthStateChanged will handle the UI change.
            console.log("Login successful for:", userCredential.user.email);
        })
        .catch((error) => {
            loginError.textContent = "Invalid email or password.";
            loginError.classList.remove('hidden');
            console.error("Login failed:", error.code, error.message);
        });
}

function handleLogout() {
    signOut(auth).catch(error => console.error("Logout failed:", error));
}

// --- Data Fetching & Display ---
async function fetchApplications() {
    loadingState.classList.remove('hidden');
    tableContainer.classList.add('hidden');
    noAppsMessage.classList.add('hidden');

    try {
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'ai-im-bot-standalone';
        const collectionPath = `/artifacts/${appId}/public/data/applications`;
        const q = query(collection(db, collectionPath), orderBy("submittedAt", "desc"));
        
        const querySnapshot = await getDocs(q);
        applicationsData = []; // Clear previous data
        tableBody.innerHTML = ''; // Clear table

        if (querySnapshot.empty) {
            noAppsMessage.classList.remove('hidden');
        } else {
            querySnapshot.forEach(doc => {
                const data = doc.data();
                applicationsData.push(data); // Save for export
                renderTableRow(data);
            });
            tableContainer.classList.remove('hidden');
        }
    } catch (error) {
        console.error("Error fetching applications: ", error);
        noAppsMessage.textContent = "Error loading applications. Check console and security rules.";
        noAppsMessage.classList.remove('hidden');
    } finally {
        loadingState.classList.add('hidden');
    }
}

function renderTableRow(data) {
    const row = document.createElement('tr');
    row.className = 'bg-gray-800 border-b border-gray-700 hover:bg-gray-600';

    const submittedAt = data.submittedAt ? data.submittedAt.toDate().toLocaleString() : 'N/A';

    row.innerHTML = `
        <td class="px-6 py-4">${submittedAt}</td>
        <td class="px-6 py-4 font-medium text-white whitespace-nowrap">${data.name || 'N/A'}</td>
        <td class="px-6 py-4">${data.studentId || 'N/A'}</td>
        <td class="px-6 py-4">${data.email || 'N/A'}</td>
        <td class="px-6 py-4">${data.whatsapp || 'N/A'}</td>
        <td class="px-6 py-4">${data.q1 || 'N/A'}</td>
        <td class="px-6 py-4">${data.q2 || 'N/A'}</td>
        <td class="px-6 py-4">${data.q3 || 'N/A'}</td>
        <td class="px-6 py-4">${data.q4 || 'N/A'}</td>
        <td class="px-6 py-4">${data.q5 || 'N/A'}</td>
    `;
    tableBody.appendChild(row);
}

// --- Excel (CSV) Export ---
function downloadCSV() {
    if (applicationsData.length === 0) {
        alert("No applications to download.");
        return;
    }

    const headers = [
        "SubmittedAt", "Name", "Gender", "IsStudent", "StudentID", "WhatsApp", "Email",
        "TaughtSelf", "CodeExperience", "AIKnowledge", "AIInterests", "Contribution"
    ];

    const rows = applicationsData.map(app => {
        const submittedAt = app.submittedAt ? `"${app.submittedAt.toDate().toISOString()}"` : '""';
        // Escape commas in user input by wrapping in double quotes
        return [
            submittedAt,
            `"${app.name || ''}"`,
            `"${app.gender || ''}"`,
            `"${app.isStudent || ''}"`,
            `"${app.studentId || ''}"`,
            `"${app.whatsapp || ''}"`,
            `"${app.email || ''}"`,
            `"${(app.q1 || '').replace(/"/g, '""')}"`,
            `"${(app.q2 || '').replace(/"/g, '""')}"`,
            `"${(app.q3 || '').replace(/"/g, '""')}"`,
            `"${(app.q4 || '').replace(/"/g, '""')}"`,
            `"${(app.q5 || '').replace(/"/g, '""')}"`
        ].join(',');
    });

    const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + "\n" + rows.join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "ai_im_applications.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


// --- Event Listeners ---
function setupEventListeners() {
    loginBtn.addEventListener('click', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);
    downloadBtn.addEventListener('click', downloadCSV);
    passwordInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
}
