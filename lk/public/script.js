// Global variables
let telegram = null;
let currentUser = null;
let cooldownTimer = null;
let tasks = [];

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    initializeTelegram();
    setupEventListeners();
    checkReferral();
});

// Initialize Telegram Web App
function initializeTelegram() {
    try {
        if (window.Telegram && window.Telegram.WebApp) {
            telegram = window.Telegram.WebApp;
            telegram.ready();
            telegram.expand();
            
            // Set theme
            if (telegram.colorScheme === 'dark') {
                document.body.classList.add('dark-theme');
            }
            
            // Get user data from initData
            const initData = telegram.initData;
            if (initData) {
                const urlParams = new URLSearchParams(initData);
                const user = urlParams.get('user');
                if (user) {
                    const userData = JSON.parse(decodeURIComponent(user));
                    if (userData.id) {
                        loadUserData(userData.id);
                        return;
                    }
                }
            }
            
            // Fallback: try to get user from start parameter
            const startParam = new URLSearchParams(window.location.search).get('start');
            if (startParam) {
                loadUserData(startParam);
            } else {
                showMessage('Please open this app from Telegram', 'error');
            }
        } else {
            console.log('Telegram Web App not available');
            // For testing purposes, you can set a default user ID
            // loadUserData('123456789');
        }
    } catch (error) {
        console.error('Error initializing Telegram:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Navigation tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.section));
    });
    
    // Admin tabs
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', () => switchAdminTab(tab.dataset.adminSection));
    });
    
    // Watch ad button
    document.getElementById('watchAdBtn').addEventListener('click', watchAd);
    
    // Copy referral link
    document.getElementById('copyLinkBtn').addEventListener('click', copyReferralLink);
    
    // Withdrawal form
    document.getElementById('withdrawalForm').addEventListener('submit', requestWithdrawal);
    
    // Task modal
    const taskModal = document.getElementById('taskModal');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const closeBtn = taskModal.querySelector('.close');
    
    addTaskBtn.addEventListener('click', () => taskModal.style.display = 'block');
    closeBtn.addEventListener('click', () => taskModal.style.display = 'none');
    
    window.addEventListener('click', (e) => {
        if (e.target === taskModal) {
            taskModal.style.display = 'none';
        }
    });
    
    // Task form
    document.getElementById('taskForm').addEventListener('submit', saveTask);
    
    // User search
    document.getElementById('userSearch').addEventListener('input', searchUsers);
}

// Switch between main tabs
function switchTab(sectionName) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionName).classList.add('active');
    
    // Add active class to selected tab
    document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');
    
    // Load section-specific data
    switch(sectionName) {
        case 'refer':
            loadReferralData();
            break;
        case 'wallet':
            loadWalletData();
            break;
        case 'tasks':
            loadTasks();
            break;
        case 'admin':
            if (currentUser && currentUser.isAdmin) {
                loadAdminData();
            }
            break;
    }
}

// Switch between admin tabs
function switchAdminTab(sectionName) {
    // Hide all admin sections
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all admin tabs
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(`admin${sectionName.charAt(0).toUpperCase() + sectionName.slice(1)}`).classList.add('active');
    
    // Add active class to selected tab
    document.querySelector(`[data-admin-section="${sectionName}"]`).classList.add('active');
}

// Load user data
async function loadUserData(telegramId) {
    try {
        const response = await fetch(`/api/user/${telegramId}`);
        if (response.ok) {
            currentUser = await response.json();
            updateUI();
            
            // Check if user is admin (you can set this in Firebase)
            if (currentUser.telegramId === 123456789) { // Replace with actual admin ID
                currentUser.isAdmin = true;
                document.getElementById('adminTab').style.display = 'block';
            }
        } else {
            throw new Error('Failed to load user data');
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        showMessage('Failed to load user data', 'error');
    }
}

// Update UI with user data
function updateUI() {
    if (!currentUser) return;
    
    // Update header balance
    document.getElementById('userBalance').textContent = currentUser.balance.toFixed(3);
    
    // Update earn section
    document.getElementById('adsWatched').textContent = currentUser.adsWatched || 0;
    document.getElementById('totalEarned').textContent = (currentUser.totalEarned || 0).toFixed(3) + ' TRX';
    
    // Update referral section
    document.getElementById('referralCount').textContent = currentUser.referralCount || 0;
    document.getElementById('referralEarnings').textContent = (currentUser.referralEarnings || 0).toFixed(3);
    document.getElementById('lifetimeCommission').textContent = (currentUser.lifetimeCommission || 0).toFixed(3);
    
    // Update referral link
    const referralLink = `https://t.me/trxearnbux?start=${currentUser.telegramId}`;
    document.getElementById('referralLink').value = referralLink;
    
    // Check cooldown
    checkCooldown();
}

// Check cooldown timer
function checkCooldown() {
    if (!currentUser || !currentUser.lastAdWatch) return;
    
    const now = Date.now();
    const cooldown = 30000; // 30 seconds
    const timeLeft = cooldown - (now - currentUser.lastAdWatch);
    
    if (timeLeft > 0) {
        startCooldownTimer(timeLeft);
    }
}

// Start cooldown timer
function startCooldownTimer(duration) {
    const timerElement = document.getElementById('cooldownTimer');
    const timerText = document.getElementById('timerText');
    const watchAdBtn = document.getElementById('watchAdBtn');
    
    timerElement.style.display = 'inline-block';
    watchAdBtn.disabled = true;
    
    if (cooldownTimer) clearInterval(cooldownTimer);
    
    cooldownTimer = setInterval(() => {
        duration -= 1000;
        const seconds = Math.ceil(duration / 1000);
        
        if (seconds <= 0) {
            clearInterval(cooldownTimer);
            timerElement.style.display = 'none';
            watchAdBtn.disabled = false;
            return;
        }
        
        timerText.textContent = seconds + 's';
    }, 1000);
}

// Watch ad function
async function watchAd() {
    if (!currentUser) {
        showMessage('Please login first', 'error');
        return;
    }
    
    try {
        // Show Monetag ad
        if (typeof show_9723717 === 'function') {
            show_9723717().then(() => {
                // Ad completed, process reward
                processAdReward();
            }).catch(error => {
                console.error('Ad error:', error);
                showMessage('Ad failed to load', 'error');
            });
        } else {
            // Fallback for testing
            processAdReward();
        }
    } catch (error) {
        console.error('Error watching ad:', error);
        showMessage('Failed to load ad', 'error');
    }
}

// Process ad reward
async function processAdReward() {
    try {
        const response = await fetch('/api/watch-ad', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                telegramId: currentUser.telegramId
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            
            // Update user data
            currentUser.balance = result.newBalance;
            currentUser.adsWatched = (currentUser.adsWatched || 0) + 1;
            currentUser.totalEarned = (currentUser.totalEarned || 0) + result.reward;
            currentUser.lastAdWatch = Date.now();
            
            // Update UI
            updateUI();
            startCooldownTimer(30000);
            
            showMessage(`Earned ${result.reward} TRX!`, 'success');
            
            // Check if 100 ads milestone reached
            if (currentUser.adsWatched === 100) {
                showMessage('Congratulations! You completed 100 ads and earned a bonus!', 'success');
            }
        } else {
            const error = await response.json();
            if (error.error === 'Cooldown active') {
                startCooldownTimer(error.timeLeft * 1000);
                showMessage(`Please wait ${error.timeLeft} seconds before watching another ad`, 'info');
            } else {
                showMessage(error.error || 'Failed to process reward', 'error');
            }
        }
    } catch (error) {
        console.error('Error processing ad reward:', error);
        showMessage('Failed to process reward', 'error');
    }
}

// Load referral data
async function loadReferralData() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`/api/referrals/${currentUser.telegramId}`);
        if (response.ok) {
            const data = await response.json();
            updateReferralUI(data);
        }
    } catch (error) {
        console.error('Error loading referral data:', error);
    }
}

// Update referral UI
function updateReferralUI(data) {
    document.getElementById('referralCount').textContent = data.referralCount;
    document.getElementById('referralEarnings').textContent = data.referralEarnings.toFixed(3);
    document.getElementById('lifetimeCommission').textContent = data.lifetimeCommission.toFixed(3);
    
    // Update referrals list
    const referralsList = document.getElementById('referralsList');
    referralsList.innerHTML = '';
    
    if (data.referrals && data.referrals.length > 0) {
        data.referrals.forEach(referral => {
            const referralItem = document.createElement('div');
            referralItem.className = 'referral-item';
            referralItem.innerHTML = `
                <div class="referral-header">
                    <span class="referral-id">User ${referral.userId}</span>
                    <span class="referral-date">${new Date(referral.joinedAt).toLocaleDateString()}</span>
                </div>
                <div class="referral-reward">+${referral.reward} TRX</div>
            `;
            referralsList.appendChild(referralItem);
        });
    } else {
        referralsList.innerHTML = '<p style="text-align: center; color: #6c757d;">No referrals yet</p>';
    }
}

// Copy referral link
function copyReferralLink() {
    const referralLink = document.getElementById('referralLink');
    referralLink.select();
    document.execCommand('copy');
    
    showMessage('Referral link copied!', 'success');
}

// Share to Telegram
function shareToTelegram() {
    const referralLink = document.getElementById('referralLink').value;
    const text = `Join TRX Earn Bux and start earning TRX! Use my referral link: ${referralLink}`;
    const url = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
}

// Share to WhatsApp
function shareToWhatsApp() {
    const referralLink = document.getElementById('referralLink').value;
    const text = `Join TRX Earn Bux and start earning TRX! Use my referral link: ${referralLink}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
}

// Load wallet data
async function loadWalletData() {
    if (!currentUser) return;
    
    // Update balance
    document.getElementById('walletBalance').textContent = currentUser.balance.toFixed(3) + ' TRX';
    
    // Calculate earnings breakdown
    const adsEarnings = (currentUser.totalEarned || 0) - (currentUser.referralEarnings || 0) - (currentUser.taskEarnings || 0);
    const referralsEarnings = currentUser.referralEarnings || 0;
    const tasksEarnings = currentUser.taskEarnings || 0;
    
    document.getElementById('adsEarnings').textContent = adsEarnings.toFixed(3) + ' TRX';
    document.getElementById('referralsEarnings').textContent = referralsEarnings.toFixed(3) + ' TRX';
    document.getElementById('tasksEarnings').textContent = tasksEarnings.toFixed(3) + ' TRX';
    
    // Load transactions
    loadTransactions();
}

// Load transactions
function loadTransactions() {
    if (!currentUser.transactions) return;
    
    const transactionsList = document.getElementById('transactionsList');
    transactionsList.innerHTML = '';
    
    const sortedTransactions = currentUser.transactions.sort((a, b) => b.timestamp - a.timestamp);
    
    sortedTransactions.forEach(transaction => {
        const transactionItem = document.createElement('div');
        transactionItem.className = 'transaction-item';
        
        const type = transaction.type.replace('_', ' ');
        const amount = transaction.amount > 0 ? '+' + transaction.amount : transaction.amount;
        const date = new Date(transaction.timestamp).toLocaleDateString();
        
        transactionItem.innerHTML = `
            <div class="transaction-header">
                <span class="transaction-type">${type}</span>
                <span class="transaction-amount">${amount} TRX</span>
            </div>
            <div class="transaction-date">${date}</div>
            <span class="transaction-status ${transaction.status}">${transaction.status}</span>
        `;
        
        transactionsList.appendChild(transactionItem);
    });
}

// Request withdrawal
async function requestWithdrawal(event) {
    event.preventDefault();
    
    if (!currentUser) {
        showMessage('Please login first', 'error');
        return;
    }
    
    const amount = parseFloat(document.getElementById('withdrawalAmount').value);
    const binanceUid = document.getElementById('binanceUid').value;
    
    if (amount < 1) {
        showMessage('Minimum withdrawal is 1 TRX', 'error');
        return;
    }
    
    if (amount > currentUser.balance) {
        showMessage('Insufficient balance', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/withdrawal', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                telegramId: currentUser.telegramId,
                amount,
                binanceUid
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            
            // Update user balance
            currentUser.balance -= amount;
            updateUI();
            
            // Reset form
            document.getElementById('withdrawalForm').reset();
            
            showMessage('Withdrawal request submitted successfully!', 'success');
        } else {
            const error = await response.json();
            showMessage(error.error || 'Failed to submit withdrawal', 'error');
        }
    } catch (error) {
        console.error('Error requesting withdrawal:', error);
        showMessage('Failed to submit withdrawal', 'error');
    }
}

// Load tasks
async function loadTasks() {
    try {
        const response = await fetch('/api/tasks');
        if (response.ok) {
            tasks = await response.json();
            displayTasks();
        }
    } catch (error) {
        console.error('Error loading tasks:', error);
    }
}

// Display tasks
function displayTasks() {
    const tasksList = document.getElementById('tasksList');
    tasksList.innerHTML = '';
    
    if (tasks.length === 0) {
        tasksList.innerHTML = '<p style="text-align: center; color: #6c757d;">No tasks available</p>';
        return;
    }
    
    tasks.forEach(task => {
        const taskItem = document.createElement('div');
        taskItem.className = 'task-item';
        
        const isCompleted = currentUser.tasks && currentUser.tasks.find(t => t.taskId === task.id);
        
        taskItem.innerHTML = `
            <div class="task-header">
                <span class="task-title">${task.title}</span>
                <span class="task-reward">${task.reward} TRX</span>
            </div>
            <div class="task-description">
                <a href="${task.link}" target="_blank" style="color: #667eea; text-decoration: none;">
                    ${task.category === 'telegram' ? 'Join Channel' : 
                      task.category === 'bot' ? 'Start Bot' : 'Visit Website'}
                </a>
            </div>
            <div class="task-actions">
                ${isCompleted ? 
                    '<button class="task-btn secondary" disabled>Completed</button>' :
                    `<button class="task-btn primary" onclick="completeTask('${task.id}')">Complete Task</button>`
                }
            </div>
        `;
        
        tasksList.appendChild(taskItem);
    });
}

// Complete task
async function completeTask(taskId) {
    if (!currentUser) {
        showMessage('Please login first', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/complete-task', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                telegramId: currentUser.telegramId,
                taskId
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            
            // Update user data
            currentUser.balance = result.newBalance;
            currentUser.totalEarned = (currentUser.totalEarned || 0) + result.reward;
            if (!currentUser.tasks) currentUser.tasks = [];
            currentUser.tasks.push({
                taskId,
                title: tasks.find(t => t.id === taskId)?.title,
                reward: result.reward,
                completedAt: Date.now(),
                status: 'Completed'
            });
            
            // Update UI
            updateUI();
            displayTasks();
            
            showMessage(`Task completed! Earned ${result.reward} TRX`, 'success');
        } else {
            const error = await response.json();
            showMessage(error.error || 'Failed to complete task', 'error');
        }
    } catch (error) {
        console.error('Error completing task:', error);
        showMessage('Failed to complete task', 'error');
    }
}

// Load admin data
async function loadAdminData() {
    if (!currentUser || !currentUser.isAdmin) return;
    
    loadAdminUsers();
    loadAdminWithdrawals();
    loadAdminTasks();
}

// Load admin users
async function loadAdminUsers() {
    try {
        const response = await fetch('/api/admin/users');
        if (response.ok) {
            const users = await response.json();
            displayAdminUsers(users);
        }
    } catch (error) {
        console.error('Error loading admin users:', error);
    }
}

// Display admin users
function displayAdminUsers(users) {
    const usersList = document.getElementById('adminUsersList');
    usersList.innerHTML = '';
    
    users.forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = 'admin-user-item';
        
        userItem.innerHTML = `
            <div class="user-info">
                <strong>User ID:</strong> ${user.telegramId}<br>
                <strong>Balance:</strong> ${user.balance.toFixed(3)} TRX<br>
                <strong>Total Earned:</strong> ${user.totalEarned.toFixed(3)} TRX<br>
                <strong>Ads Watched:</strong> ${user.adsWatched || 0}
            </div>
            <div class="user-actions">
                <button class="admin-btn edit" onclick="editUser(${user.telegramId})">Edit</button>
                <button class="admin-btn delete" onclick="deleteUser(${user.telegramId})">Delete</button>
            </div>
        `;
        
        usersList.appendChild(userItem);
    });
}

// Load admin withdrawals
async function loadAdminWithdrawals() {
    try {
        const response = await fetch('/api/admin/withdrawals');
        if (response.ok) {
            const withdrawals = await response.json();
            displayAdminWithdrawals(withdrawals);
        }
    } catch (error) {
        console.error('Error loading admin withdrawals:', error);
    }
}

// Display admin withdrawals
function displayAdminWithdrawals(withdrawals) {
    const withdrawalsList = document.getElementById('adminWithdrawalsList');
    withdrawalsList.innerHTML = '';
    
    withdrawals.forEach(withdrawal => {
        const withdrawalItem = document.createElement('div');
        withdrawalItem.className = 'admin-withdrawal-item';
        
        withdrawalItem.innerHTML = `
            <div class="withdrawal-info">
                <strong>User ID:</strong> ${withdrawal.telegramId}<br>
                <strong>Amount:</strong> ${withdrawal.amount} TRX<br>
                <strong>Binance UID:</strong> ${withdrawal.binanceUid}<br>
                <strong>Status:</strong> ${withdrawal.status}<br>
                <strong>Date:</strong> ${new Date(withdrawal.requestedAt).toLocaleDateString()}
            </div>
            <div class="withdrawal-actions">
                ${withdrawal.status === 'Pending' ? `
                    <button class="admin-btn approve" onclick="approveWithdrawal('${withdrawal.id}')">Approve</button>
                    <button class="admin-btn reject" onclick="rejectWithdrawal('${withdrawal.id}')">Reject</button>
                ` : ''}
            </div>
        `;
        
        withdrawalsList.appendChild(withdrawalItem);
    });
}

// Approve withdrawal
async function approveWithdrawal(withdrawalId) {
    try {
        const response = await fetch(`/api/admin/withdrawal/${withdrawalId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: 'Approved',
                adminId: currentUser.telegramId
            })
        });
        
        if (response.ok) {
            showMessage('Withdrawal approved', 'success');
            loadAdminWithdrawals();
        } else {
            showMessage('Failed to approve withdrawal', 'error');
        }
    } catch (error) {
        console.error('Error approving withdrawal:', error);
        showMessage('Failed to approve withdrawal', 'error');
    }
}

// Reject withdrawal
async function rejectWithdrawal(withdrawalId) {
    try {
        const response = await fetch(`/api/admin/withdrawal/${withdrawalId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: 'Rejected',
                adminId: currentUser.telegramId
            })
        });
        
        if (response.ok) {
            showMessage('Withdrawal rejected', 'success');
            loadAdminWithdrawals();
        } else {
            showMessage('Failed to reject withdrawal', 'error');
        }
    } catch (error) {
        console.error('Error rejecting withdrawal:', error);
        showMessage('Failed to reject withdrawal', 'error');
    }
}

// Load admin tasks
async function loadAdminTasks() {
    try {
        const response = await fetch('/api/tasks');
        if (response.ok) {
            const adminTasks = await response.json();
            displayAdminTasks(adminTasks);
        }
    } catch (error) {
        console.error('Error loading admin tasks:', error);
    }
}

// Display admin tasks
function displayAdminTasks(adminTasks) {
    const tasksList = document.getElementById('adminTasksList');
    tasksList.innerHTML = '';
    
    adminTasks.forEach(task => {
        const taskItem = document.createElement('div');
        taskItem.className = 'admin-task-item';
        
        taskItem.innerHTML = `
            <div class="task-info">
                <strong>Title:</strong> ${task.title}<br>
                <strong>Reward:</strong> ${task.reward} TRX<br>
                <strong>Category:</strong> ${task.category}<br>
                <strong>Verification:</strong> ${task.verificationType}
            </div>
            <div class="task-actions">
                <button class="admin-btn edit" onclick="editTask('${task.id}')">Edit</button>
                <button class="admin-btn delete" onclick="deleteTask('${task.id}')">Delete</button>
            </div>
        `;
        
        tasksList.appendChild(taskItem);
    });
}

// Save task (admin)
async function saveTask(event) {
    event.preventDefault();
    
    const taskData = {
        title: document.getElementById('taskTitle').value,
        link: document.getElementById('taskLink').value,
        reward: parseFloat(document.getElementById('taskReward').value),
        category: document.getElementById('taskCategory').value,
        verificationType: document.getElementById('verificationType').value
    };
    
    try {
        // This would be implemented in the backend
        showMessage('Task saved successfully!', 'success');
        document.getElementById('taskModal').style.display = 'none';
        document.getElementById('taskForm').reset();
        loadAdminTasks();
    } catch (error) {
        console.error('Error saving task:', error);
        showMessage('Failed to save task', 'error');
    }
}

// Search users (admin)
function searchUsers(event) {
    const searchTerm = event.target.value.toLowerCase();
    const userItems = document.querySelectorAll('.admin-user-item');
    
    userItems.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(searchTerm) ? 'block' : 'none';
    });
}

// Check referral from URL
function checkReferral() {
    const startParam = new URLSearchParams(window.location.search).get('start');
    if (startParam && currentUser && currentUser.telegramId !== parseInt(startParam)) {
        // Process referral
        processReferral(startParam);
    }
}

// Process referral
async function processReferral(referrerId) {
    try {
        const response = await fetch('/api/referral', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                referrerId: parseInt(referrerId),
                newUserId: currentUser.telegramId
            })
        });
        
        if (response.ok) {
            showMessage('Referral bonus applied!', 'success');
            // Reload user data to get updated referral info
            loadUserData(currentUser.telegramId);
        }
    } catch (error) {
        console.error('Error processing referral:', error);
    }
}

// Show message
function showMessage(message, type = 'info') {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());
    
    // Create new message
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    messageElement.textContent = message;
    
    // Insert at the top of main content
    const mainContent = document.querySelector('.main-content');
    mainContent.insertBefore(messageElement, mainContent.firstChild);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (messageElement.parentNode) {
            messageElement.remove();
        }
    }, 5000);
}

// Placeholder functions for admin actions
function editUser(userId) {
    showMessage('Edit user functionality coming soon', 'info');
}

function deleteUser(userId) {
    if (confirm('Are you sure you want to delete this user?')) {
        showMessage('Delete user functionality coming soon', 'info');
    }
}

function editTask(taskId) {
    showMessage('Edit task functionality coming soon', 'info');
}

function deleteTask(taskId) {
    if (confirm('Are you sure you want to delete this task?')) {
        showMessage('Delete task functionality coming soon', 'info');
    }
}
