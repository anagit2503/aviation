# flywithsam Ground School - Complete Setup Guide

## Table of Contents
1. [Quick Start (5 minutes)](#quick-start)
2. [Firebase Setup (India-Friendly)](#firebase-setup)
3. [Deployment to Vercel](#deployment-to-vercel)
4. [Customization Guide](#customization-guide)
5. [Admin Portal Tutorial](#admin-portal-tutorial)
6. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites
You'll need:
- A Google account (for Firebase and Vercel)
- A GitHub account (for Vercel deployment - free)
- The React app file (`aviation-ground-school-app.jsx`)

### What You Get
- ✅ Professional landing page
- ✅ Student login/signup
- ✅ Student dashboard with quizzes, videos, marks
- ✅ Admin portal to upload content
- ✅ All hosted for FREE with Vercel + Firebase
- ✅ No code changes needed to run locally

---

## Firebase Setup (For India)

Firebase is perfect for India because:
- Google has strong infrastructure here
- Fast CDN access
- Easy video/file storage
- No server management needed

### Step 1: Create Firebase Project

1. Go to [firebase.google.com](https://firebase.google.com)
2. Click "Get Started" or "Go to Console"
3. Click "Create a project"
4. Project name: **flywithsam Ground School**
5. Analytics: You can disable this (optional)
6. Click "Create Project"

### Step 2: Enable Authentication

1. In Firebase Console, click "Authentication"
2. Click "Get Started"
3. Enable "Email/Password" method
   - Click on "Email/Password"
   - Toggle "Enable"
   - Save

### Step 3: Create Firestore Database

1. Click "Firestore Database" in left sidebar
2. Click "Create Database"
3. Start in test mode (for now)
4. Select region: **asia-south1** (India - Mumbai) - This is important!
5. Click "Create"

### Step 4: Create Storage Bucket

1. Click "Storage" in left sidebar
2. Click "Get Started"
3. Accept rules and click "Next"
4. Select default location: **asia-south1** (India)
5. Click "Done"

### Step 5: Get Your Firebase Config

1. Click the gear icon (Settings) at top
2. Click "Project Settings"
3. Scroll down to "Your apps"
4. Click the "Web" icon (`</> `)
5. Register app with name "flywithsam"
6. Copy the entire config object that looks like:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "skymaster-xxx.firebaseapp.com",
  projectId: "skymaster-xxx",
  storageBucket: "skymaster-xxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456"
};
```

### Step 6: Update App with Firebase Config

1. Open `aviation-ground-school-app.jsx` in a text editor
2. Find this section at the top:
```javascript
const FIREBASE_CONFIG = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

3. Replace with your actual Firebase config
4. Save the file

---

## Deployment to Vercel

Vercel is completely FREE and perfect for this app.

### Step 1: Create GitHub Repository

1. Go to [github.com](https://github.com) and sign in
2. Click "+" icon → "New repository"
3. Name: **skymaster-ground-school**
4. Description: "Aviation ground school platform"
5. Make it Public
6. Click "Create repository"

### Step 2: Upload Your Code

**Option A: Using GitHub Web Interface (Easier)**
1. In your new GitHub repo, click "Add file" → "Create new file"
2. Paste content from `aviation-ground-school-app.jsx` into the file
3. Name it: `app.jsx`
4. Click "Commit new file"

**Option B: Using Git (If comfortable with terminal)**
```bash
git clone https://github.com/YOUR-USERNAME/skymaster-ground-school.git
cd skymaster-ground-school
cp aviation-ground-school-app.jsx app.jsx
git add app.jsx
git commit -m "Initial commit"
git push
```

### Step 3: Create Vercel Project

1. Go to [vercel.com](https://vercel.com)
2. Click "Sign Up" and choose "Continue with GitHub"
3. Authorize Vercel
4. Click "New Project"
5. Import your GitHub repository
6. Select: **skymaster-ground-school**
7. Click "Import"
8. Framework: Select **React**
9. Click "Deploy"

Wait 2-3 minutes... Done! Your site is live! 🎉

Your URL will be something like: `skymaster-ground-school.vercel.app`

### Step 4: Custom Domain (Optional)

To use your own domain (e.g., skymaster.in):
1. Buy domain from GoDaddy, Namecheap, or Bluehost
2. In Vercel project settings, click "Domains"
3. Add your domain and follow DNS instructions
4. Usually takes 5-10 minutes to work

---

## Customization Guide

### Change App Name & Colors

Edit the app file and search for these:

**App Name:** Search for "flywithsam" and replace with your name
**Colors:**
- Blue (`#1e3a5f`, `#2563eb`) → Change to your colors
- Amber (`#f59e0b`) → Change to your accent color

### Add Your Information

1. **Founder Bio Section:**
   - Find: "With years of flying experience..."
   - Update with actual bio

2. **Pricing:**
   - Find: `₹4,999`
   - Change to your price

3. **Courses/Subjects:**
   - Find: `['Air Law & Procedure', 'Navigation & Meteorology', 'Aircraft Technical Knowledge']`
   - Update with your actual subjects

4. **Demo Login (Important!):**
   - Currently: `your instructor Gmail address`
   - Change this to real admin email/password before launch

### Add YouTube Videos

For each video in the `videos` array:
```javascript
{
  id: 1, 
  title: 'Introduction to Air Law', 
  subject: 'Air Law & Procedure', 
  duration: '45 mins', 
  watched: true,
  youtubeId: "dQw4w9WgXcQ"  // Add YouTube video ID
}
```

Then in the video player:
```javascript
<iframe
  width="100%"
  height="400"
  src={`https://www.youtube.com/embed/${video.youtubeId}`}
  frameBorder="0"
  allowFullScreen
/>
```

---

## Admin Portal Tutorial

### Logging In as Admin

1. Click "Login" on landing page
2. Toggle to "Instructor login"
3. Use: `your instructor Gmail address` / ``
4. **Change these credentials before launch!**

### Dashboard Tab
- See real-time stats
- Student count
- Upload count
- Average progress

### Upload Content Tab

1. **Select Subject** - Choose from your subjects
2. **Content Type** - Video, Notes, Questions, etc.
3. **Title** - What is this content about?
4. **File Upload** - Click to upload or drag-drop
5. **Description** - Add any notes
6. Click **Upload Content**

**Video Upload Tips:**
- Don't upload to Firebase Storage directly (expensive bandwidth)
- Instead: Upload to YouTube (unlisted) and use YouTube embed link
- This keeps costs at ₹0 even with 1000+ students

### Students Tab
- See all enrolled students
- Their progress
- Join dates
- Email addresses

### Analytics Tab
- Student enrollment trends
- Subject performance
- Course completion rates

---

## Advanced Setup (Using Firebase Properly)

The demo app uses mock data. To connect to real Firebase:

### Install Dependencies

```bash
npm install
npm install firebase react-router-dom
npm run dev
```

### Create .env file

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Update App Component

Replace the Firebase initialization with:

```javascript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
```

---

## Troubleshooting

### "Page shows mock data, not real data"
- The demo shows mock data on purpose
- To connect real Firebase, follow "Advanced Setup" section above

### "Can't login as instructor"
- Credentials are: `your instructor Gmail address` / ``
- Make sure you toggle to "Instructor login" first

### "Videos not playing"
- The demo shows placeholder videos
- To add real videos: Upload to YouTube (private/unlisted)
- Copy YouTube video ID and add to videos array

### "Domain not loading"
- Wait 10-15 minutes for DNS to propagate
- Check that DNS records are correct in Vercel
- Clear browser cache (Ctrl+Shift+Delete)

### "Can't see Firebase in console"
- Make sure you selected region: **asia-south1** (India)
- Check that you have active Google account

### "Slow video loading for students"
- Videos on Firebase Storage are slow in India
- Solution: Use YouTube (unlisted) instead
- No bandwidth costs, better performance

---

## Cost Tracker

| Item | Cost | Notes |
|------|------|-------|
| Vercel Hosting | FREE | Auto-scales, no setup |
| Firebase Free Tier | FREE | Covers 100+ students |
| Custom Domain | ~₹500/year | Optional, use .vercel.app for free |
| YouTube Hosting | FREE | Unlimited bandwidth for videos |
| **Total First Year** | **₹500** | Just domain, everything else free |

**When You Scale (500+ students):**
- Firebase: ₹2,000-5,000/month
- Everything else: FREE
- Total: ₹2,000-5,000/month

---

## Next Steps

1. ✅ Set up Firebase (15 minutes)
2. ✅ Deploy to Vercel (5 minutes)
3. ✅ Customize with your info (30 minutes)
4. ✅ Add your YouTube videos (30 minutes)
5. ✅ Create student accounts
6. ✅ Start uploading content!

## Support

If you get stuck:
1. Check this guide's Troubleshooting section
2. Google "Firebase setup India"
3. Vercel has excellent documentation
4. Firebase has great YouTube tutorials

You've got this! 🚀
