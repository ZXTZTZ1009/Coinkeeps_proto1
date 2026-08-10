// Paste your Google Apps Script Deployment URL below
const BACKEND_URL = "https://script.google.com/macros/s/AKfycbx01sMfwRDxBB62SuqBuBnZK59AOXqIR093niNnA7r--k3isRXLsUHcWzpsV03kcCK1/exec";

let currentUser = null;
let expenses = [];

// Initialize Page
document.addEventListener("DOMContentLoaded", () => {
    populateDateDropdowns();
    checkSession();
});

// Navigation Controller
function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    
    const nav = document.getElementById('navbar');
    if (viewId === 'view-login' || viewId === 'view-signup') {
        nav.style.display = 'none';
    } else {
        nav.style.display = 'flex';
    }
}

// Session Check
function checkSession() {
    const savedUser = localStorage.getItem("coinkeeps_user");
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        document.getElementById("welcomeUserMsg").textContent = `Welcome back, ${currentUser.fullName}!`;
        showView("view-info");
    } else {
        showView("view-login");
    }
}

function logout() {
    localStorage.removeItem("coinkeeps_user");
    currentUser = null;
    showView("view-login");
}

// AUTHENTICATION LOGIC
document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
        action: "login",
        username: document.getElementById("loginUser").value,
        password: document.getElementById("loginPass").value
    };
    
    const res = await sendRequest(payload);
    if (res.status === "success") {
        currentUser = { username: res.username, fullName: res.fullName };
        localStorage.setItem("coinkeeps_user", JSON.stringify(currentUser));
        document.getElementById("welcomeUserMsg").textContent = `Welcome, ${res.fullName}!`;
        showView("view-info");
    } else {
        alert(res.message);
    }
});

document.getElementById("signupForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
        action: "signup",
        fullName: document.getElementById("signupName").value,
        username: document.getElementById("signupUser").value,
        password: document.getElementById("signupPass").value
    };

    const res = await sendRequest(payload);
    if (res.status === "success") {
        alert("Account created! Please log in.");
        showView("view-login");
    } else {
        alert(res.message);
    }
});

// CALCULATOR LOGIC
document.getElementById("addExpenseBtn").addEventListener("click", () => {
    const desc = document.getElementById("descriptionField").value;
    const amount = parseFloat(document.getElementById("expenseAmountField").value);
    const category = document.getElementById("categoryCombo").value;
    const frequency = document.getElementById("userFrequency").value;

    if (!desc || isNaN(amount)) {
        alert("Enter valid details!");
        return;
    }

    const exp = { description: desc, amount: amount, category: category, frequency: frequency };
    expenses.push(exp);
    
    // Update UI
    const li = document.createElement("li");
    const currency = document.getElementById("currencyTypeInput").value;
    li.textContent = `${desc} - ${currency}${amount} (${category})`;
    document.getElementById("expenseList").appendChild(li);

    // Sync Backend
    if (currentUser) {
        sendRequest({
            action: "addExpense",
            username: currentUser.username,
            ...exp
        });
    }
});

document.getElementById("calcButton").addEventListener("click", () => {
    const allowance = parseFloat(document.getElementById("allowanceInput").value) || 0;
    const goalPct = parseFloat(document.getElementById("savingsGoal").value) || 0;
    const currency = document.getElementById("currencyTypeInput").value;

    const totalExp = expenses.reduce((sum, e) => sum + e.amount, 0);
    const remaining = allowance - totalExp;
    const targetSavings = allowance * (goalPct / 100);

    document.getElementById("resultLabel").textContent = `Remaining: ${currency}${remaining.toFixed(2)}`;
    
    const remarks = document.getElementById("remarksLabel");
    if (remaining >= targetSavings) {
        remarks.textContent = "Great job! Savings target met.";
        remarks.style.color = "green";
    } else if (remaining >= 0) {
        remarks.textContent = "Budget kept, but missed savings goal.";
        remarks.style.color = "orange";
    } else {
        remarks.textContent = "Warning: Over budget!";
        remarks.style.color = "red";
    }
});

// UTILITIES
async function sendRequest(data) {
    if (BACKEND_URL === "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE") {
        alert("Please configure your Google Apps Script URL in script.js!");
        return { status: "error" };
    }
    const res = await fetch(BACKEND_URL, {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "text/plain;charset=utf-8" }
    });
    return await res.json();
}

function populateDateDropdowns() {
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    ["fromMonth", "toMonth"].forEach(id => {
        const el = document.getElementById(id);
        months.forEach(m => el.appendChild(new Option(m, m)));
    });

    ["fromDay", "toDay"].forEach(id => {
        const el = document.getElementById(id);
        for(let i=1; i<=31; i++) el.appendChild(new Option(i, i));
    });

    ["fromYear", "toYear"].forEach(id => {
        const el = document.getElementById(id);
        for(let y=2025; y<=2050; y++) el.appendChild(new Option(y, y));
    });
}