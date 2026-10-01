# 🚀 How to Run Taskboard Project

## 📋 Prerequisites (Kya install hona chahiye)
Aapke computer par **Node.js** install hona chahiye:
- Download & Install: [Node.js Official Website](https://nodejs.org/) (LTS Version recommended)
- Check karne ke liye terminal me type karein:
  ```bash
  node -v
  npm -v
  ```

---

## 🛠️ Step-by-Step Setup Guide

### 1. Folder Open Karein
Project folder ko extract (unzip) karein aur us folder ke andar Terminal ya Command Prompt (CMD / PowerShell / VS Code Terminal) kholein.

### 2. Check `.env` File
Ensure karein ki project ke root folder me `.env` file maujood hai.
Agar `.env` file na dikhe, to `.env.example` file ki copy banakar uska naam `.env` rakh dein.

Usme yeh keys honi chahiye:
```env
SUPABASE_PROJECT_ID="afqbvuypkzzkoieebpme"
SUPABASE_PUBLISHABLE_KEY="sb_publishable_kGVruRT1kHuBjWdWTos4XA_R2A7JY4w"
SUPABASE_URL="https://afqbvuypkzzkoieebpme.supabase.co"
VITE_SUPABASE_PROJECT_ID="afqbvuypkzzkoieebpme"
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_kGVruRT1kHuBjWdWTos4XA_R2A7JY4w"
VITE_SUPABASE_URL="https://afqbvuypkzzkoieebpme.supabase.co"
```

### 3. Dependencies Install Karein
Terminal me run karein:
```bash
npm install
```
*(Yeh saare required node packages download kar dega)*

### 4. Project Run Karein
Terminal me run karein:
```bash
npm run dev
```

### 5. Browser Me Open Karein
Terminal me aapko local URL dikhayi dega (normally `http://localhost:3000` ya `http://localhost:5173`).
Use apne browser (Chrome/Edge) me open karein.

---

## 🔐 Sign Up / Login Note:
1. **Password Rule**: Password kam se kam 6 characters ka hona chahiye aur easy password (jaise `123456`) avoid karein.
2. **Email Verification**: Agar Supabase me email verification on hai, to sign up ke baad aapke email par confirmation link aayega. Link par click karne ke baad hi log in karein (ya UI me 'Resend confirmation' use karein).
