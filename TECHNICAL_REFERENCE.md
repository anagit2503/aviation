# Technical Reference Guide
## For Developers/Tech Person

This guide is for whoever helps deploy and maintain the website.

---

## Project Overview

**Project:** flywithsam Ground School  
**Tech Stack:** React 18 + Vite + Firebase + Vercel  
**Location:** India (asia-south1 region)  
**Users:** CPL ground school students + instructor

### Architecture
```
┌─────────────────────────────────────────────────┐
│ Frontend (React + Vite)                         │
│ - Deployed on Vercel (Free tier)                │
│ - Static site, no server needed                 │
└──────────┬──────────────────────────────────────┘
           │ API calls via Firebase SDK
           ↓
┌─────────────────────────────────────────────────┐
│ Backend (Firebase)                              │
│ - Firestore Database (asia-south1)              │
│ - Authentication                                │
│ - Storage (for PDFs, images)                    │
│ - Functions (optional for advanced features)    │
└─────────────────────────────────────────────────┘
```

---

## Initial Setup (First Time)

### Prerequisites
- Node.js 16+ installed
- npm or yarn
- Firebase account
- Vercel account
- GitHub account

### Step 1: Local Development Setup

```bash
# Clone or create project
mkdir skymaster-ground-school
cd skymaster-ground-school

# Initialize Vite React project
npm create vite@latest . -- --template react

# Install dependencies
npm install firebase react-router-dom

# Copy the app component
# Place aviation-ground-school-app.jsx in src/ folder
```

### Step 2: Firebase Setup

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Create Firebase project (via console is easier)
# Go to firebase.google.com → Create project

# Init Firebase in your project
firebase init
# Select: Firestore, Storage, Hosting
# Region: asia-south1 (IMPORTANT for India)
```

### Step 3: Environment Variables

Create `.env.local`:
```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123def456
```

### Step 4: Test Locally

```bash
npm run dev
# Opens at http://localhost:5173
```

### Step 5: Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Follow prompts
# Select project name: skymaster-ground-school
# Framework: Vite
# Output directory: dist
```

---

## Firebase Configuration (India-Specific)

### Firestore Database Structure

```
firestore/
├── users/
│   ├── {userId}
│   │   ├── email: string
│   │   ├── name: string
│   │   ├── role: "student" | "admin"
│   │   ├── joinDate: timestamp
│   │   └── progress: number (0-100)
│
├── subjects/
│   ├── {subjectId}
│   │   ├── name: string
│   │   ├── description: string
│   │   └── order: number
│
├── content/
│   ├── {contentId}
│   │   ├── title: string
│   │   ├── type: "video" | "notes" | "quiz" | "mock"
│   │   ├── subjectId: reference
│   │   ├── youtubeId: string (for videos)
│   │   ├── fileUrl: string (for PDFs)
│   │   ├── uploadedBy: reference
│   │   ├── uploadedDate: timestamp
│   │   └── description: string
│
├── quizzes/
│   ├── {quizId}
│   │   ├── title: string
│   │   ├── subjectId: reference
│   │   ├── totalMarks: number
│   │   └── questions: array
│
├── results/
│   ├── {resultId}
│   │   ├── userId: reference
│   │   ├── quizId: reference
│   │   ├── marksObtained: number
│   │   ├── totalMarks: number
│   │   └── completedDate: timestamp
```

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection
    match /users/{userId} {
      allow read: if request.auth.uid == userId;
      allow write: if request.auth.uid == userId;
    }
    
    // Content (public read, admin write)
    match /content/{contentId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid in get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Results (own results only)
    match /results/{resultId} {
      allow read: if request.auth.uid == resource.data.userId;
      allow write: if request.auth.uid == resource.data.userId;
    }
    
    // Admin only
    match /analytics/{document=**} {
      allow read, write: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

### Storage Security Rules

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    
    // PDFs and notes (public read, admin write)
    match /content/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid in get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // User uploads (own files only)
    match /uploads/{userId}/{allPaths=**} {
      allow read, write: if request.auth.uid == userId;
    }
  }
}
```

---

## Firebase Authentication Setup

### Enable Email/Password

In Firebase Console:
1. Go to Authentication
2. Sign-in method tab
3. Enable "Email/Password"
4. Set password policy (min 6 chars for testing, 8+ for production)

### Custom Claims (For Admin Role)

```javascript
// In Firebase Cloud Functions or admin SDK
const admin = require('firebase-admin');

admin.auth().setCustomUserClaims(uid, { role: 'admin' })
  .then(() => {
    console.log('Set admin role for', uid);
  });
```

---

## Deployment Configuration

### Vercel Environment Variables

In Vercel Dashboard → Project Settings → Environment Variables:

```
VITE_FIREBASE_API_KEY = [your_key]
VITE_FIREBASE_AUTH_DOMAIN = [your_domain]
VITE_FIREBASE_PROJECT_ID = [your_project]
VITE_FIREBASE_STORAGE_BUCKET = [your_bucket]
VITE_FIREBASE_MESSAGING_SENDER_ID = [your_id]
VITE_FIREBASE_APP_ID = [your_app_id]
```

### Vercel Build Settings

- **Framework:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

### GitHub Integration

Vercel auto-deploys on push to main branch. `.gitignore`:

```
node_modules/
.env.local
.env
dist/
.vite/
```

---

## Cost Monitoring (India)

### Firebase Pricing (India region - asia-south1)

**Firestore:**
- Read: ₹0.18 per 100K reads
- Write: ₹0.54 per 100K writes
- Delete: ₹0.54 per 100K deletes
- Storage: ₹0.22/GB/month

**Storage:**
- Download: ₹1.22/GB (India)
- Storage: ₹0.022/GB/month

**Alerts to set up:**

```javascript
// In Firebase Console → Billing → Budget alerts
Budget limit: ₹5,000/month
Alert threshold: 50%, 75%, 100%
```

### Monitor Usage

```bash
# Via Firebase Console
# Firestore → Metrics → Usage
# Track reads/writes/storage

# Via CLI
firebase functions:log
firebase billing
```

---

## Common Development Tasks

### Add New Subject

```javascript
// In Firestore console or via code
db.collection('subjects').add({
  name: 'Aircraft Systems',
  description: 'Complete aircraft systems overview',
  order: 4
});
```

### Upload Content via Code

```javascript
import { storage } from './firebase-config';
import { ref, uploadBytes } from 'firebase/storage';

async function uploadPDF(file, subject) {
  const storageRef = ref(storage, `content/${subject}/${file.name}`);
  const snapshot = await uploadBytes(storageRef, file);
  return snapshot.ref.getDownloadURL();
}
```

### Create Quiz

```javascript
db.collection('quizzes').add({
  title: 'Quiz 1: Air Law Basics',
  subjectId: 'air-law-id',
  totalMarks: 50,
  questions: [
    { q: 'Question 1?', options: [], correct: 0 },
    // ...
  ]
});
```

### Fetch Student Progress

```javascript
async function getStudentProgress(userId) {
  const results = await db.collection('results')
    .where('userId', '==', userId)
    .get();
  
  const totalMarks = results.docs.reduce((sum, doc) => 
    sum + doc.data().marksObtained, 0
  );
  
  return {
    quizzes: results.size,
    totalMarks: totalMarks,
    percentage: (totalMarks / (results.size * 50)) * 100
  };
}
```

---

## Deployment Checklist

Before going live:

- [ ] Firebase config set correctly
- [ ] Environment variables in Vercel
- [ ] Security rules configured
- [ ] Admin role set for instructor
- [ ] Test authentication flow
- [ ] Test file uploads
- [ ] Verify India region selected (asia-south1)
- [ ] Set up billing alerts
- [ ] Domain configured (if using custom domain)
- [ ] SSL certificate enabled
- [ ] Tested on mobile (responsive)
- [ ] Videos load properly

---

## Monitoring & Maintenance

### Daily Checks
```bash
# Check deployment status
vercel projects

# Monitor Firebase
firebase emulators:start  # Test locally

# Check logs
vercel logs [project-name]
```

### Weekly
- Check Firebase usage (Firestore reads/writes)
- Monitor cost vs. budget
- Check error logs in Vercel
- Verify backups

### Monthly
- Review analytics
- Optimize slow queries
- Update dependencies: `npm audit fix`
- Check security updates

---

## Scaling Considerations

### When You Hit Free Tier Limits

**Firestore:**
- Free: 50K reads/day
- Growth: Add index for common queries
- Optimization: Cache frequently accessed data

**Storage:**
- Free: 5GB/month download
- Solution: Use YouTube for videos (saves ₹1.22/GB)
- Alternative: CloudFlare caching

### Database Scaling

At 500+ students, consider:
1. Implement pagination (limit queries to 100 docs)
2. Add Firestore indexes for common queries
3. Use Cloud Functions for batch operations
4. Consider migration to Cloud SQL if needed

### Performance Optimization

```javascript
// Use collection group queries wisely
const q = query(collection(db, 'results'),
  where('userId', '==', userId),
  orderBy('completedDate', 'desc'),
  limit(10)
);

// Implement offline persistence
import { enableIndexedDbPersistence } from 'firebase/firestore';
enableIndexedDbPersistence(db);
```

---

## Troubleshooting

### "Firebase not initializing"
```javascript
// Check config in .env.local
// Ensure VITE_ prefix for Vite
// Verify Firebase API key is active
```

### "Storage upload fails"
```
Error: Storage bucket not found
→ Check Firebase Console → Storage bucket exists
→ Check region is set correctly
```

### "Slow queries"
```
→ Add Firestore indexes (console suggests automatically)
→ Use pagination with limit(100)
→ Avoid reading entire collections
```

### "Users can't upload files"
```
→ Check Storage security rules
→ Verify authentication working
→ Check file size limits (max 5MB for PDFs)
```

---

## Rollback Procedure

### If deployment breaks:

```bash
# Revert to previous version
vercel --prod  # Deploy current local code again

# OR Revert via Vercel dashboard:
# Deployments tab → Click previous version → Promote to production
```

### If Firebase data breaks:

```bash
# Firestore has automatic backups
# Go to: Firestore → Manage backups → Restore
# Can restore to any point in last 35 days
```

---

## Support Resources

- **Firebase Docs:** firebase.google.com/docs
- **Vercel Docs:** vercel.com/docs
- **React Docs:** react.dev
- **Vite Docs:** vitejs.dev

---

## Contacts

**For This Project:**
- Firebase: firebase@google.com (support)
- Vercel: support@vercel.com
- React: github.com/facebook/react/issues

---

That's everything! You've got a complete, scalable platform. 🚀
