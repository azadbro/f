const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set, get, push, update, query, orderByChild, equalTo } = require('firebase/database');
const crypto = require('crypto');
require('dotenv').config({ path: './config.env' });

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBfiVtfLXiFOAmV5YJws5WswYqpDgxodXQ",
    authDomain: "project1-f966d.firebaseapp.com",
    databaseURL: "https://project1-f966d-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "project1-f966d",
    storageBucket: "project1-f966d.firebasestorage.app",
    messagingSenderId: "987134748696",
    appId: "1:987134748696:web:7622359ca57ebd69337b6d",
    measurementId: "G-1SFXDRD9W9"
  };

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const database = getDatabase(firebaseApp);

// Test Firebase connection
console.log('Firebase initialized with config:', {
  projectId: firebaseConfig.projectId,
  databaseURL: firebaseConfig.databaseURL,
  authDomain: firebaseConfig.authDomain
});

// Test database connection
const testRef = ref(database, 'test');
set(testRef, { timestamp: Date.now() })
  .then(() => {
    console.log('✅ Firebase database connection successful');
    // Clean up test data
    return set(testRef, null);
  })
  .catch((error) => {
    console.error('❌ Firebase database connection failed:', error);
    console.error('Please check your Firebase configuration and database rules');
  });

// Telegram Web App validation
function validateTelegramWebApp(initData) {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    const data = urlParams.toString().replace(/&hash=[^&]*/, '');
    
    // Create HMAC-SHA256 hash
    const secret = crypto.createHmac('sha256', 'WebAppData').update(process.env.BOT_API_TOKEN).digest();
    const calculatedHash = crypto.createHmac('sha256', secret).update(data).digest('hex');
    
    return calculatedHash === hash;
  } catch (error) {
    console.error('Telegram validation error:', error);
    return false;
  }
}

// Routes

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Server is running!',
    timestamp: new Date().toISOString(),
    firebase: {
      projectId: firebaseConfig.projectId,
      databaseURL: firebaseConfig.databaseURL
    }
  });
});

// Get user data
app.get('/api/user/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    console.log('Fetching user data for Telegram ID:', telegramId);
    
    const userRef = ref(database, `users/${telegramId}`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      console.log('User found:', snapshot.val());
      res.json(snapshot.val());
    } else {
      console.log('Creating new user for Telegram ID:', telegramId);
      // Create new user if doesn't exist
      const newUser = {
        telegramId: parseInt(telegramId),
        balance: 0,
        totalEarned: 0,
        adsWatched: 0,
        referrals: [],
        referralCount: 0,
        referralEarnings: 0,
        lifetimeCommission: 0,
        tasks: [],
        transactions: [],
        withdrawals: [],
        lastAdWatch: 0,
        createdAt: Date.now()
      };
      
      await set(userRef, newUser);
      console.log('New user created successfully');
      res.json(newUser);
    }
  } catch (error) {
    console.error('Error getting/creating user:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message,
      code: error.code
    });
  }
});

// Watch ad and earn TRX
app.post('/api/watch-ad', async (req, res) => {
  try {
    const { telegramId } = req.body;
    const userRef = ref(database, `users/${telegramId}`);
    const snapshot = await get(userRef);
    
    if (!snapshot.exists()) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = snapshot.val();
    const now = Date.now();
    const cooldown = 30000; // 30 seconds
    
    if (now - user.lastAdWatch < cooldown) {
      const timeLeft = Math.ceil((cooldown - (now - user.lastAdWatch)) / 1000);
      return res.status(429).json({ 
        error: 'Cooldown active', 
        timeLeft,
        nextAdTime: user.lastAdWatch + cooldown
      });
    }
    
    // Update user data
    const adReward = 0.005;
    const updates = {
      balance: user.balance + adReward,
      totalEarned: user.totalEarned + adReward,
      adsWatched: user.adsWatched + 1,
      lastAdWatch: now
    };
    
    // Check if user completed 100 ads task
    if (user.adsWatched + 1 === 100) {
      const taskReward = 0.1;
      updates.balance += taskReward;
      updates.totalEarned += taskReward;
      
      // Add task completion
      const taskCompletion = {
        id: `task_100_ads_${Date.now()}`,
        title: 'Watch 100 Ads',
        reward: taskReward,
        completedAt: now,
        status: 'Completed'
      };
      
      if (!updates.tasks) updates.tasks = [];
      updates.tasks.push(taskCompletion);
    }
    
    // Add transaction
    const transaction = {
      id: `ad_${Date.now()}`,
      type: 'ad_watch',
      amount: adReward,
      timestamp: now,
      status: 'completed'
    };
    
    if (!updates.transactions) updates.transactions = [];
    updates.transactions.push(transaction);
    
    await update(userRef, updates);
    
    res.json({ 
      success: true, 
      newBalance: updates.balance,
      reward: adReward,
      nextAdTime: now + cooldown
    });
    
  } catch (error) {
    console.error('Error watching ad:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get referral data
app.get('/api/referrals/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    const userRef = ref(database, `users/${telegramId}`);
    const snapshot = await get(userRef);
    
    if (!snapshot.exists()) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = snapshot.val();
    res.json({
      referralCount: user.referralCount || 0,
      referralEarnings: user.referralEarnings || 0,
      lifetimeCommission: user.lifetimeCommission || 0,
      referrals: user.referrals || []
    });
  } catch (error) {
    console.error('Error getting referrals:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Process referral
app.post('/api/referral', async (req, res) => {
  try {
    const { referrerId, newUserId } = req.body;
    
    if (referrerId === newUserId) {
      return res.status(400).json({ error: 'Cannot refer yourself' });
    }
    
    const referrerRef = ref(database, `users/${referrerId}`);
    const newUserRef = ref(database, `users/${newUserId}`);
    
    const [referrerSnapshot, newUserSnapshot] = await Promise.all([
      get(referrerRef),
      get(newUserRef)
    ]);
    
    if (!referrerSnapshot.exists() || !newUserSnapshot.exists()) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const referrer = referrerSnapshot.val();
    const newUser = newUserSnapshot.val();
    
    // Check if already referred
    if (newUser.referredBy) {
      return res.status(400).json({ error: 'User already referred' });
    }
    
    // Process referral
    const referralReward = 0.05;
    const updates = {};
    
    // Update referrer
    updates[`users/${referrerId}/referralCount`] = (referrer.referralCount || 0) + 1;
    updates[`users/${referrerId}/referralEarnings`] = (referrer.referralEarnings || 0) + referralReward;
    updates[`users/${referrerId}/balance`] = (referrer.balance || 0) + referralReward;
    updates[`users/${referrerId}/totalEarned`] = (referrer.totalEarned || 0) + referralReward;
    
    if (!referrer.referrals) referrer.referrals = [];
    referrer.referrals.push({
      userId: newUserId,
      joinedAt: Date.now(),
      reward: referralReward
    });
    updates[`users/${referrerId}/referrals`] = referrer.referrals;
    
    // Update new user
    updates[`users/${newUserId}/referredBy`] = referrerId;
    
    // Add transactions
    const referrerTransaction = {
      id: `referral_${Date.now()}`,
      type: 'referral',
      amount: referralReward,
      timestamp: Date.now(),
      status: 'completed',
      referredUser: newUserId
    };
    
    if (!referrer.transactions) referrer.transactions = [];
    referrer.transactions.push(referrerTransaction);
    updates[`users/${referrerId}/transactions`] = referrer.transactions;
    
    await update(ref(database), updates);
    
    res.json({ success: true, reward: referralReward });
    
  } catch (error) {
    console.error('Error processing referral:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get tasks
app.get('/api/tasks', async (req, res) => {
  try {
    const tasksRef = ref(database, 'tasks');
    const snapshot = await get(tasksRef);
    
    if (snapshot.exists()) {
      res.json(Object.values(snapshot.val()));
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Error getting tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Complete task
app.post('/api/complete-task', async (req, res) => {
  try {
    const { telegramId, taskId } = req.body;
    const userRef = ref(database, `users/${telegramId}`);
    const taskRef = ref(database, `tasks/${taskId}`);
    
    const [userSnapshot, taskSnapshot] = await Promise.all([
      get(userRef),
      get(taskRef)
    ]);
    
    if (!userSnapshot.exists() || !taskSnapshot.exists()) {
      return res.status(404).json({ error: 'User or task not found' });
    }
    
    const user = userSnapshot.val();
    const task = taskSnapshot.val();
    
    // Check if already completed
    if (user.tasks && user.tasks.find(t => t.taskId === taskId)) {
      return res.status(400).json({ error: 'Task already completed' });
    }
    
    // Update user
    const updates = {
      balance: user.balance + task.reward,
      totalEarned: user.totalEarned + task.reward
    };
    
    if (!updates.tasks) updates.tasks = [];
    updates.tasks.push({
      taskId,
      title: task.title,
      reward: task.reward,
      completedAt: Date.now(),
      status: 'Completed'
    });
    
    // Add transaction
    const transaction = {
      id: `task_${Date.now()}`,
      type: 'task_completion',
      amount: task.reward,
      timestamp: Date.now(),
      status: 'completed',
      taskTitle: task.title
    };
    
    if (!updates.transactions) updates.transactions = [];
    updates.transactions.push(transaction);
    
    await update(userRef, updates);
    
    res.json({ 
      success: true, 
      newBalance: updates.balance,
      reward: task.reward
    });
    
  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Request withdrawal
app.post('/api/withdrawal', async (req, res) => {
  try {
    const { telegramId, amount, binanceUid } = req.body;
    
    if (amount < 1) {
      return res.status(400).json({ error: 'Minimum withdrawal is 1 TRX' });
    }
    
    const userRef = ref(database, `users/${telegramId}`);
    const snapshot = await get(userRef);
    
    if (!snapshot.exists()) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = snapshot.val();
    
    if (user.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    // Create withdrawal request
    const withdrawal = {
      id: `withdrawal_${Date.now()}`,
      telegramId: parseInt(telegramId),
      amount,
      binanceUid,
      status: 'Pending',
      requestedAt: Date.now(),
      currency: 'TRX',
      paymentMethod: 'Binance'
    };
    
    // Add to withdrawals collection
    const withdrawalRef = ref(database, 'withdrawals');
    await push(withdrawalRef, withdrawal);
    
    // Update user balance
    await update(userRef, {
      balance: user.balance - amount
    });
    
    res.json({ success: true, withdrawalId: withdrawal.id });
    
  } catch (error) {
    console.error('Error requesting withdrawal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin routes
app.get('/api/admin/users', async (req, res) => {
  try {
    const usersRef = ref(database, 'users');
    const snapshot = await get(usersRef);
    
    if (snapshot.exists()) {
      res.json(Object.values(snapshot.val()));
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/admin/withdrawals', async (req, res) => {
  try {
    const withdrawalsRef = ref(database, 'withdrawals');
    const snapshot = await get(withdrawalsRef);
    
    if (snapshot.exists()) {
      res.json(Object.values(snapshot.val()));
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Error getting withdrawals:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/admin/withdrawal/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminId } = req.body;
    
    const withdrawalRef = ref(database, `withdrawals/${id}`);
    const snapshot = await get(withdrawalRef);
    
    if (!snapshot.exists()) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }
    
    const withdrawal = snapshot.val();
    
    if (status === 'Rejected') {
      // Refund user if rejected
      const userRef = ref(database, `users/${withdrawal.telegramId}`);
      const userSnapshot = await get(userRef);
      
      if (userSnapshot.exists()) {
        const user = userSnapshot.val();
        await update(userRef, {
          balance: user.balance + withdrawal.amount
        });
      }
    }
    
    // Update withdrawal status
    await update(withdrawalRef, {
      status,
      processedAt: Date.now(),
      processedBy: adminId
    });
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Error updating withdrawal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve the main app
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
