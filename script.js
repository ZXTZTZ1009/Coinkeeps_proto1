const BACKEND_URL = "https://script.google.com/macros/s/AKfycbwGX35Aot8tqNuc8sw_oEUcrFrfFpJG_K6nW4T7XXovOaMcZaaZ934apHG2AwajpXI_/exec";

let currentUser = null;
let expenses = [];

// Initialize Page
document.addEventListener("DOMContentLoaded", () => {
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

        fetchExpenses();

    } else {
        showView("view-login");
    }
}

function logout() {
    localStorage.removeItem("coinkeeps_user");
    currentUser = null;
    
    expenses = []; 
    document.getElementById("expenseList").innerHTML = "";
    document.getElementById("resultLabel").textContent = "Result: 0.00";
    document.getElementById("remarksLabel").textContent = "";

    showView("view-login");
}

function showLoading() {
    document.getElementById("loadingOverlay").classList.add("active");
}

function hideLoading() {
    document.getElementById("loadingOverlay").classList.remove("active");
}

// AUTHENTICATION LOGIC
document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    showLoading();

    const payload = {
        action: "login",
        username: document.getElementById("loginUser").value,
        password: document.getElementById("loginPass").value
    };

    try {
        const res = await sendRequest(payload);

        if (res.status === "success") {
            currentUser = {
                userId: res.userId,
                username: res.username,
                fullName: res.fullName
            };

            localStorage.setItem(
                "coinkeeps_user",
                JSON.stringify(currentUser)
            );

            document.getElementById("welcomeUserMsg").textContent =
                `Welcome, ${res.fullName}!`;

            showView("view-info");
            
            fetchExpenses();

        } else {
            alert(res.message);
        }

    } catch (error) {
        console.error("Login error:", error);
        alert("Unable to connect to the server. Please try again.");

    } finally {
        hideLoading();
    }
});

document.getElementById("signupForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    showLoading();

    const payload = {
        action: "signup",
        fullName: document.getElementById("signupName").value,
        username: document.getElementById("signupUser").value,
        password: document.getElementById("signupPass").value
    };

    try {
        const res = await sendRequest(payload);

        if (res.status === "success") {
            alert("Account created successfully!");

            showView("view-login");

        } else {
            alert(res.message);
        }

    } catch (error) {
        console.error("Signup error:", error);
        alert("Unable to connect to the server. Please try again.");

    } finally {
        hideLoading();
    }
});

// CALCULATOR LOGIC
document.getElementById("addExpenseBtn").addEventListener("click", () => {
    const desc = document.getElementById("descriptionField").value;
    const amount = parseFloat(document.getElementById("expenseAmountField").value);
    const category = document.getElementById("categoryCombo").value;
    const frequency = document.getElementById("userFrequency").value;

    if (!desc || isNaN(amount) || frequency === "Select Frequency") {
        alert("Enter valid details and select a frequency!");
        return;
    }

    // Assign a unique ID using Date.now()
    const exp = { id: Date.now(), description: desc, amount: amount, category: category, frequency: frequency };
    expenses.push(exp);
    
    renderExpenseList();

    // Sync Backend
    if (currentUser) {
    sendRequest({
        action: "addExpense",
        userId: currentUser.userId,
        ...exp
        });
    }   
    
    // Clear inputs for the next entry
    document.getElementById("descriptionField").value = "";
    document.getElementById("expenseAmountField").value = "";
    });

document.getElementById("calcButton").addEventListener("click", () => {
    const allowance = parseFloat(document.getElementById("allowanceInput").value) || 0;
    const goalPct = parseFloat(document.getElementById("savingsGoal").value) || 0;
    const currency = document.getElementById("currencyTypeInput").value;

    // 1. Get Dates and Calculate Exact Timeframe
    const fromDateValue = document.getElementById("fromDate").value;
    const toDateValue = document.getElementById("toDate").value;

    if (!fromDateValue || !toDateValue) {
        alert("Please select a valid 'From' and 'To' date.");
        return;
    }

    const [fYear, fMonth, fDay] = fromDateValue.split('-').map(Number);
    const [tYear, tMonth, tDay] = toDateValue.split('-').map(Number);

    const fromDate = new Date(fYear, fMonth - 1, fDay);
    const toDate = new Date(tYear, tMonth - 1, tDay);
    
    fromDate.setHours(0,0,0,0);
    toDate.setHours(0,0,0,0);

    // CALENDAR LOOP
    let totalDays = 0;
    let exactWeekdays = 0;
    
    let currentDate = new Date(fromDate);
    while (currentDate <= toDate) {
        totalDays++;
        
        let dayOfWeek = currentDate.getDay(); 
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            exactWeekdays++; 
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
    }

    if (totalDays < 1) {
        alert("The 'To' date cannot be before the 'From' date.");
        return;
    }

    // 2. Scale Total Allowance
    const allowanceFreq = document.querySelector('input[name="allowanceFreq"]:checked').value;
    let totalAllowance = 0;
    if (allowanceFreq === "Daily") totalAllowance = allowance * totalDays;
    else if (allowanceFreq === "Weekly") totalAllowance = allowance * (totalDays / 7);
    else if (allowanceFreq === "Monthly") totalAllowance = allowance * (totalDays / 30.44);

    // 3. Scale Total Expenses based on frequency
    let totalExp = 0;
    expenses.forEach(e => {
        let multiplier = 1;
        switch(e.frequency) {
            case "Everyday": multiplier = totalDays; break;
            case "Weekdays": multiplier = exactWeekdays; break;
            case "Once": multiplier = 1; break;
            
            case "6 Times a Week": multiplier = (totalDays / 7) * 6; break;
            case "5 Times a Week": multiplier = (totalDays / 7) * 5; break;
            case "4 Times a Week": multiplier = (totalDays / 7) * 4; break;
            case "3 Times a Week": multiplier = (totalDays / 7) * 3; break;
            case "2 Times a Week": multiplier = (totalDays / 7) * 2; break;
            case "Once a Week": multiplier = totalDays / 7; break;
            case "Twice a Month": multiplier = (totalDays / 30.44) * 2; break;
            case "Once a Month": multiplier = totalDays / 30.44; break;
            default: multiplier = 1; break;
        }
        totalExp += e.amount * multiplier;
    });

    // 4. Calculate Final Results
    const remaining = totalAllowance - totalExp;
    const targetSavings = totalAllowance * (goalPct / 100);

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

// FETCH EXPENSES FROM BACKEND
async function fetchExpenses() {
    if (!currentUser || !currentUser.userId) return;

    showLoading();
    try {
        //  GET URL with query parameters
        const url = `${BACKEND_URL}?action=getExpenses&userId=${currentUser.userId}`;
        
        const res = await fetch(url);
        const json = await res.json();

        if (json.status === "success") {
            expenses = json.data; 
            
            renderExpenseList();
        } else {
            console.error("Failed to fetch expenses:", json.message);
        }
    } catch (error) {
        console.error("Error fetching expenses:", error);
    } finally {
        hideLoading();
    }
}

// REDRAW THE EXPENSE LIST UI
function renderExpenseList() {
    const list = document.getElementById("expenseList");
    list.innerHTML = "";
    
    const currency = document.getElementById("currencyTypeInput").value;

    // Global array loop and item list building
    expenses.forEach(exp => {
        const li = document.createElement("li");
        li.style.display = "flex";
        li.style.justifyContent = "space-between";
        li.style.alignItems = "center";
        
        const itemText = document.createElement("span");
        
        itemText.textContent = `${exp.description} - ${currency}${exp.amount} | ${exp.category} (${exp.frequency})`;
        
        const removeBtn = document.createElement("button");
        removeBtn.textContent = "X";
        removeBtn.className = "nav-btn danger";
        removeBtn.style.padding = "2px 8px";
        removeBtn.style.fontSize = "12px";
        
        removeBtn.addEventListener("click", () => {

            expenses = expenses.filter(e => e.id !== exp.id);
            li.remove();
            
            if (currentUser) {
                sendRequest({
                    action: "deleteExpense",
                    userId: currentUser.userId,
                    expenseId: exp.id
                });
            }
        });

        li.appendChild(itemText);
        li.appendChild(removeBtn);
        list.appendChild(li);
    });
}

document.getElementById("clearAllBtn").addEventListener("click", () => {
    if(confirm("Are you sure you want to clear all expenses?")) {
        // Ping backend to delete
        if (currentUser) {
            expenses.forEach(exp => {
                sendRequest({ action: "deleteExpense", userId: currentUser.userId, expenseId: exp.id });
            });
        }

        expenses = [];
        document.getElementById("expenseList").innerHTML = "";
        document.getElementById("resultLabel").textContent = "Result: 0.00";
        document.getElementById("remarksLabel").textContent = "";
    }
});

// SIDEBAR TOGGLE LOGIC
function showLearnTopic(topicId, clickedBtn) {
    // 1. Hide all text content blocks
    document.querySelectorAll('.learn-topic').forEach(topic => {
        topic.style.display = 'none';
    });
    
    // 2. Remove the 'active' (green) style from all sidebar buttons
    document.querySelectorAll('.sidebar-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 3. Show the requested text block and highlight the clicked button
    document.getElementById(topicId).style.display = 'block';
    clickedBtn.classList.add('active');
}


