# flywithsam Admin Manual
## Your Daily Operations Guide (For Non-Technical Users)

Hello! This manual explains exactly how to run your ground school website. No technical jargon, just simple steps.

---

## Table of Contents
- [First Time Setup](#first-time-setup)
- [Daily Operations](#daily-operations)
- [Uploading Content](#uploading-content)
- [Managing Students](#managing-students)
- [Viewing Student Progress](#viewing-student-progress)
- [Common Tasks](#common-tasks)

---

## First Time Setup

### Step 1: Get Your Login Link
You'll have a website URL that looks like: `skymaster-ground-school.vercel.app`

### Step 2: First Login
1. Go to your website
2. Click "Login" button
3. Look for a small link that says "Instructor login?" - Click it
4. Use these credentials:
   - Email: `admin@groundschool.com`
   - Password: `admin123`

**IMPORTANT:** Change this password immediately!
1. Click your email at top right
2. Click "Change Password"
3. Create a new, strong password only you know

### Step 3: Customize Your Admin Login
You should change the demo login to your actual email. Ask your tech person to:
- Change `admin@groundschool.com` to your actual email
- Change `admin123` to a strong password
- This ensures only you can access the admin area

---

## Daily Operations

### The Admin Dashboard Sections

Your admin area has 4 main sections (tabs at top):

#### 1. **Dashboard Tab** 📊
This shows you quick statistics:
- **Total Students** - How many people enrolled
- **Total Uploads** - How much content you've uploaded
- **Average Progress** - How far along students are (0-100%)
- **This Month** - How many new students joined

This is like your "health check" - look here first thing each day.

---

#### 2. **Upload Content Tab** 📤
This is where you add new lessons and materials.

### How to Upload Video Lectures

**Important Note About Videos:**
- Don't upload video files directly to the website
- Video files are HUGE (2-4 GB each)
- This will make your website slow and expensive
- **Instead: Use YouTube**

#### If You Already Have Videos:

**Option 1: Upload existing videos to YouTube (BEST)**
1. Go to [youtube.com](https://youtube.com)
2. Sign in with any Google account
3. Click your profile → "Create a channel"
4. Click "Upload" button (camera icon)
5. Upload your video file
6. Title: e.g., "Introduction to Air Law"
7. Description: Add topic details
8. Visibility: Set to "Unlisted" (only people with link can see)
9. Click "Publish"
10. Copy the video ID from URL (e.g., if URL is `youtube.com/watch?v=dQw4w9WgXcQ`, your ID is `dQw4w9WgXcQ`)

**Option 2: Record new videos directly on YouTube**
1. Go to YouTube Studio (youtube.com/studio)
2. Click "Create" → "Go Live"
3. Teach your class while recording
4. Students can watch the recording later

#### Step-by-Step: Upload Content to Website

1. **Open Admin Panel**
   - Go to your website
   - Login as instructor
   - Click "Upload Content" tab

2. **Fill in the form:**
   - **Subject:** Choose from dropdown
     - Air Law & Procedure
     - Navigation & Meteorology
     - Aircraft Technical Knowledge
   
   - **Content Type:** What are you uploading?
     - Video Lecture (YouTube link)
     - Study Notes (PDF)
     - Practice Questions (PDF)
     - Mock Paper (PDF)
   
   - **Title:** Name of the content
     - Example: "Chapter 3: Flight Rules"
   
   - **File Upload:** 
     - For videos: Paste YouTube link (or ID)
     - For notes/papers: Click to upload PDF file
   
   - **Description:** Optional notes
     - Example: "Important exam topic. Read notes first, then watch video"

3. **Click "Upload Content" button**
   - Website processes upload (takes 10-30 seconds)
   - You see success message
   - Content is now live for students

---

#### 3. **Students Tab** 👥
This shows everyone who joined.

**What you see:**
- Name of each student
- Email address
- Date they joined
- Their progress (0-100%)

**What you can do:**
- Check who's active
- See who's not making progress (might need encouragement)
- Copy email addresses if you want to send updates

**How to send an announcement to all students:**
1. Copy all emails from this list
2. Go to Gmail
3. Click "Compose"
4. Paste emails in "To" field
5. Write your message (e.g., "New videos uploaded!")
6. Send

---

#### 4. **Analytics Tab** 📈
Shows charts and trends.

**What it shows:**
- **Student Enrollment Trend** - Graph of how many students join over time
- **Subject Performance** - Which topics students struggle with most
- **Completion Rates** - What percentage of each course is done

**When to check:** Once a month to see if you need to improve certain topics

---

## Uploading Content

### Daily Workflow

**Every Monday (example):**
1. Record a new video lecture
2. Upload to YouTube
3. Go to admin panel
4. Click "Upload Content"
5. Add the YouTube link
6. Students see it immediately

### Video Upload - Step by Step

**Before you start:**
- You should have your video recorded (using phone, camera, or screen recording)
- It doesn't need to be perfect - clear audio is most important

**Steps:**

1. **Upload to YouTube**
   - Go to youtube.com (sign in)
   - Click upload button
   - Select your video file
   - Add title: "Air Law Lesson 5: Flight Plans"
   - Set visibility to "Unlisted"
   - Publish
   - Copy the video ID

2. **Add to Your Website**
   - Go to your admin panel
   - Click "Upload Content" tab
   - Subject: Air Law & Procedure
   - Content Type: Video Lecture
   - Title: Air Law Lesson 5: Flight Plans
   - File: Paste YouTube ID
   - Click Upload

3. **Verify Students Can See It**
   - Logout from admin
   - Login as a student
   - Check if video appears in "Videos" section
   - Click play to test

### PDF Upload - Notes & Practice Papers

**For PDFs (notes, practice papers, etc.):**

1. **Create or get your PDF**
   - Write notes in Word
   - Save as PDF
   - OR: Take photos of handwritten notes → Convert to PDF

2. **Upload to Website**
   - Go to admin panel → Upload Content
   - Subject: Navigation & Meteorology
   - Content Type: Study Notes (or Practice Questions)
   - Title: Chapter 2 Notes - Weather Systems
   - File: Click upload box and select your PDF
   - Click Upload

3. **Students can:**
   - Download the PDF
   - Read it online
   - Print it

---

## Managing Students

### When Students Sign Up

1. They create account on your website
2. Email: Can see immediately in Students tab
3. Progress: Starts at 0%

### Encouraging Inactive Students

If you see a student hasn't progressed in 2 weeks:
1. Copy their email from Students tab
2. Send email: "Hey [name], noticed you haven't started yet. How can I help? Free to chat!"
3. Many students just need a small nudge

### Removing Students

If someone asks for refund or wants to leave:
1. You can delete them from database (ask tech person for this)
2. OR: Just don't worry - inactive students don't cost anything

---

## Viewing Student Progress

### How Students Track Progress

**Students see:**
- Overall completion percentage (0-100%)
- Which subjects they're studying
- Progress in each subject
- Their marks on quizzes
- Which videos they've watched

### How You Track Progress

Go to **Students tab** and you see:
- Each student's overall progress %
- Green bar shows completion

### What to Do With Progress Data

**Monthly review:**
1. Open Students tab
2. Note who's above 80% (doing great!)
3. Note who's below 30% (need help)
4. Email the slower students with encouragement

---

## Common Tasks

### Task 1: Upload Today's Lesson Video

1. Record your class (even with phone is fine)
2. Go to YouTube, upload it, get video ID
3. Admin panel → Upload Content
4. Fill: Subject, Type, Title, Video ID
5. Click Upload
6. Done! Students see it immediately

**Time taken: 15 minutes**

---

### Task 2: Upload Practice Questions PDF

1. Create a PDF with 20 questions
2. Save file as "Quiz 1 - Air Law.pdf"
3. Admin panel → Upload Content
4. Fill: Subject, Type, Title
5. Click upload box, select PDF
6. Click Upload

**Time taken: 5 minutes**

---

### Task 3: Check How Many Students Joined This Week

1. Admin panel → Dashboard
2. Look at "This Month" card
3. Or go to Students tab and count

**Time taken: 1 minute**

---

### Task 4: Send Update to All Students

1. Go to Students tab
2. Copy all emails
3. Open Gmail
4. Compose new email
5. Paste emails
6. Write message: "New videos uploaded! Check Dashboard tab"
7. Send

**Time taken: 5 minutes**

---

### Task 5: Identify Students Who Need Help

1. Admin panel → Students tab
2. Sort by Progress column
3. Students below 30% might need help
4. Send them encouraging email: "How can I help you prepare?"
5. Offer to do 1-on-1 call

**Time taken: 10 minutes**

---

## Things You DON'T Need to Do

❌ Manage servers
❌ Pay hosting fees
❌ Fix technical problems (website handles it)
❌ Manage student passwords
❌ Worry about security

✅ Just focus on:
- Creating great content
- Encouraging students
- Answering questions

---

## Troubleshooting - Quick Fixes

### "Students can't see my uploaded content"
1. Refresh the page (Ctrl + F5)
2. Try another browser
3. Wait 1-2 minutes for website to update

### "Video won't play"
1. Is it on YouTube?
2. Is it "Unlisted" (not Private)?
3. Did you copy the ID correctly?

### "I forgot my admin password"
1. Ask tech person to reset it
2. Or: Use "Forgot password" link on login page

### "Can't login"
1. Check email is correct
2. Check caps lock is off
3. Try pasting password instead of typing

---

## Weekly Checklist

**Every Monday:**
- [ ] Upload 1-2 new video lessons
- [ ] Review student progress
- [ ] Email inactive students
- [ ] Check analytics for trends

**Every Day (5 minutes):**
- [ ] Check dashboard for new enrollments
- [ ] Look for student questions (in comments)
- [ ] Answer any emails

---

## Monthly Tasks

**First of every month:**
1. Review all students' progress
2. See which topics need improvement
3. Record better videos for weak topics
4. Send "month summary" email to all students

---

## Your First Week

### Day 1:
- [ ] Setup Firebase (15 min)
- [ ] Deploy to Vercel (5 min)
- [ ] Test login (5 min)
- [ ] Change admin password (5 min)

### Day 2-3:
- [ ] Record 3 intro videos
- [ ] Upload to YouTube
- [ ] Add to your website via admin panel
- [ ] Test as a student

### Day 4-7:
- [ ] Create 2 PDF practice papers
- [ ] Upload them
- [ ] Create student accounts for friends/family
- [ ] Test the full experience

---

## Getting Help

If something breaks:
1. Try refreshing the page
2. Wait 5 minutes and try again
3. Google "Firebase error: [error message]"
4. Message your tech person with screenshot

---

## That's It!

You now know everything to run your ground school website. Remember:
- The website does 95% of the work
- You just add content
- Students learn themselves
- You handle encouragement & questions

Good luck with your ground school! ✈️
