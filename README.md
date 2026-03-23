# Cyber Academy · CREST CPSA Mock Exam Engine

Free, self-hosted mock exam platform for the CREST CPSA certification.  
Built by [Cyber Academy](https://mycyberacademy.co.uk).

---

## What's Inside

- **360 questions** across 3 full 120-question exams
- Harder than the real CREST CPSA exam
- Covers: Windows, Unix, Networking, Web App, Database, Cryptography, Active Directory, Post-Exploitation, Cloud, Wireless, Methodology
- Live scoring, domain breakdown, flag for review, detailed explanations
- Progress auto-saved in browser (localStorage)
- Works completely offline once loaded

---

## Deploy to GitHub Pages (5 minutes)

### Step 1 — Create a GitHub repository

1. Go to [github.com](https://github.com) and sign in
2. Click **+** → **New repository**
3. Name it: `crest-exam` (or anything you like)
4. Set to **Public**
5. Tick **Add a README file**
6. Click **Create repository**

### Step 2 — Upload files

1. Open your new repository
2. Click **Add file** → **Upload files**
3. Drag the entire contents of this folder into the upload area:
   - `index.html`
   - `css/` folder
   - `js/` folder
   - `data/` folder
4. Click **Commit changes**

### Step 3 — Enable GitHub Pages

1. In your repository, click **Settings**
2. Click **Pages** in the left sidebar
3. Under **Source** → select **main** branch → **/ (root)**
4. Click **Save**

Your exam engine is now live at:
```
https://YOUR-USERNAME.github.io/crest-exam
```

---

## Add a Custom Domain (optional)

If you want `exam.mycyberacademy.co.uk`:

### In GitHub Pages settings:
1. Go to **Settings** → **Pages**
2. Type your custom domain in the **Custom domain** box
3. Click **Save**
4. Tick **Enforce HTTPS** once DNS propagates

### At your domain registrar:
Add a **CNAME** DNS record:

| Type  | Name   | Value                          |
|-------|--------|--------------------------------|
| CNAME | exam   | YOUR-USERNAME.github.io        |

DNS propagation takes 10–30 minutes.

---

## File Structure

```
crest-exam/
├── index.html          ← Main HTML shell (all screens)
├── css/
│   └── style.css       ← MCA brand styles
├── js/
│   └── app.js          ← Full exam engine logic
├── data/
│   ├── exam1.js        ← 120 questions: Windows, Unix, Networking
│   ├── exam2.js        ← 120 questions: AD, Web App, Exploitation
│   └── exam3.js        ← 120 questions: Cloud, Wireless, Review
├── CNAME               ← Custom domain (edit if needed)
└── README.md           ← This file
```

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1` `2` `3` `4` | Select answer A B C D |
| `Enter` or `→` | Submit & next |
| `←` | Previous question |
| `F` | Flag / unflag question |
| `E` | Show / hide explanation |

---

## Customising

### Adding questions
Edit `data/exam1.js` (or exam2/exam3). Each question follows this format:

```javascript
{
  id: "1-121",
  domain: "Windows",          // domain label shown in UI
  difficulty: "hard",         // easy | medium | hard
  q: "Question text here",
  opts: ["Option A", "Option B", "Option C", "Option D"],
  ans: 1,                     // index of correct answer (0–3)
  exp: "Explanation text shown after submitting"
}
```

### Changing the pass mark
Edit `js/app.js`, line near the top:
```javascript
const PASS_MARK = 0.75;  // change to 0.70 for 70%, etc.
```

### Changing the time limit
```javascript
const TIME_LIMIT = 7200;  // seconds — 7200 = 2 hours
```

---

## Licence

Content © Cyber Academy. All rights reserved.  
Not for redistribution without permission.

[mycyberacademy.co.uk](https://mycyberacademy.co.uk)
