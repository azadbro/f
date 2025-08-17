# TRX Earn Bux - Telegram Mini App

A complete Telegram Mini App for earning TRX through watching ads, referrals, and completing tasks. Built with Node.js, Express, and Firebase Realtime Database.

## Features

### 🎯 Earn Section
- Watch reward interstitial/video ads to earn 0.005 TRX per ad
- 30-second cooldown between ads with countdown timer
- Automatic balance updates in Firebase Database
- Special bonus for completing 100 ads (0.1 TRX reward)

### 🔗 Refer Section
- Unique referral links in format: `https://t.me/trxearnbux?start=userid`
- Earn 0.05 TRX per referral
- 5% lifetime commission from referrals' earnings
- Referral dashboard with statistics
- Quick share options for Telegram and WhatsApp

### 💰 Wallet Section
- Current TRX balance display
- Earnings breakdown (Ads, Referrals, Tasks)
- Complete transaction history
- Withdrawal system with minimum 1 TRX limit
- Binance UID withdrawal method
- Admin approval system for withdrawals

### 📋 Tasks Section
- Complete tasks to earn TRX
- Task categories: Telegram channels, bots, website visits
- Auto-verification and manual admin approval options
- Progress tracking and completion status

### ⚙️ Admin Panel
- User management (search, view, edit, ban)
- Earnings breakdown analysis
- Withdrawal request approval/rejection
- Task management (add, edit, delete)
- Reward rate configuration
- Security measures against fraud

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **Database**: Firebase Realtime Database
- **Ad Platform**: Monetag SDK
- **Deployment**: Vercel-ready
- **Authentication**: Telegram Web App initData

## Prerequisites

- Node.js (v16 or higher)
- Firebase project with Realtime Database
- Telegram Bot API token
- Monetag ad account

## Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd trx-earn-bux
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   - Copy `config.env.example` to `config.env`
   - Fill in your Firebase and Telegram credentials

4. **Set up Firebase**
   - Create a Firebase project
   - Enable Realtime Database
   - Update the database rules for security

5. **Configure Telegram Bot**
   - Set up your bot with @BotFather
   - Configure the Mini App
   - Update the bot token in config.env

## Configuration

### Environment Variables (`config.env`)

```env
# Firebase Configuration
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
FIREBASE_MEASUREMENT_ID=your_measurement_id

# Telegram Bot Configuration
BOT_API_TOKEN=your_bot_token
BOT_USERNAME=your_bot_username

# Monetag Ad SDK
MONETAG_ZONE_ID=your_zone_id

# App Configuration
PORT=8080
NODE_ENV=production
```

### Firebase Database Rules

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid || root.child('admins').child(auth.uid).exists()",
        ".write": "$uid === auth.uid || root.child('admins').child(auth.uid).exists()"
      }
    },
    "withdrawals": {
      ".read": "root.child('admins').child(auth.uid).exists()",
      ".write": "root.child('admins').child(auth.uid).exists()"
    },
    "tasks": {
      ".read": true,
      ".write": "root.child('admins').child(auth.uid).exists()"
    },
    "admins": {
      ".read": "auth.uid === $uid",
      ".write": false
    }
  }
}
```

## Usage

### Development

```bash
# Start development server
npm run dev
```

### Production

```bash
# Build the project
npm run build

# Start production server
npm start
```

### Vercel Deployment

1. **Connect to Vercel**
   ```bash
   npm i -g vercel
   vercel login
   ```

2. **Deploy**
   ```bash
   vercel --prod
   ```

3. **Environment Variables**
   - Add all environment variables in Vercel dashboard
   - Ensure `NODE_ENV=production`

## API Endpoints

### User Management
- `GET /api/user/:telegramId` - Get or create user
- `POST /api/watch-ad` - Watch ad and earn TRX
- `GET /api/referrals/:telegramId` - Get referral data
- `POST /api/referral` - Process referral

### Tasks
- `GET /api/tasks` - Get available tasks
- `POST /api/complete-task` - Complete a task

### Withdrawals
- `POST /api/withdrawal` - Request withdrawal

### Admin (Protected)
- `GET /api/admin/users` - Get all users
- `GET /api/admin/withdrawals` - Get withdrawal requests
- `POST /api/admin/withdrawal/:id` - Approve/reject withdrawal

## Security Features

- Telegram Web App validation using HMAC-SHA256
- Firebase security rules
- Admin-only access to sensitive operations
- Input validation and sanitization
- Rate limiting for ad watching

## Customization

### Adding New Tasks

1. Use the admin panel to add tasks
2. Set task type, reward, and verification method
3. Configure auto-verification if applicable

### Modifying Reward Rates

1. Update the reward values in `server.js`
2. Modify the cooldown timer if needed
3. Update the UI to reflect new rates

### Adding New Earning Methods

1. Create new API endpoints in `server.js`
2. Add corresponding UI sections
3. Update the wallet breakdown

## Troubleshooting

### Common Issues

1. **Telegram validation fails**
   - Check bot token configuration
   - Ensure proper initData handling

2. **Firebase connection issues**
   - Verify API keys and project ID
   - Check database rules and permissions

3. **Ads not loading**
   - Verify Monetag zone ID
   - Check ad SDK integration

4. **Deployment issues on Vercel**
   - Ensure all environment variables are set
   - Check build logs for errors

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
DEBUG=true
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## Changelog

### v1.0.0
- Initial release
- Core earning functionality
- Referral system
- Admin panel
- Task management
- Withdrawal system

## Roadmap

- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] Mobile app version
- [ ] Additional payment methods
- [ ] Social features
- [ ] Achievement system

---

**Note**: This app is designed for educational and legitimate earning purposes. Ensure compliance with local regulations and Telegram's terms of service.
