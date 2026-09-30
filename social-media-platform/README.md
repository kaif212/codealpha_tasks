# NexusSocial - Social Media Platform

A modern mini social media application built with **Express.js**, **Microsoft SQL Server (MSSQL)** database architecture, and a **Glassmorphism Dark Mode Frontend** (HTML5, CSS3, Vanilla JS).

---

## Features Implemented

- 🔐 **Authentication**:
  - **Signup** with Full Name, Gmail / Email, Password, Profile Icon selection, and Bio.
  - **Login** with JWT Token authorization.
  - **Logout** with client token revocation.
- 👤 **User Profile & Icon**:
  - Profile Icon / Avatar displayed in Navigation header, Feed, and Profile Cards.
  - **Gmail / Account Email** explicitly displayed in user profile view.
  - **Followers & Following counts** updated dynamically.
  - **Follow / Unfollow** creator buttons.
- 📝 **Post Upload & Management**:
  - Create & Upload Posts with **Text**, **Image URLs**, or **Video URLs**.
  - Integrated video player and responsive media cards.
  - **Delete Post**: Only the post owner has permissions to delete their own post.
- ❤️ **Engagement & Social**:
  - **Like / Unlike** system with live counter & heart animation.
  - **Comment Box**: View comment stream and post new comments per post.
  - **Share**: Copy post link to clipboard and increment share counter.
- 🗄️ **Database Integration**:
  - Native **SQL Server (MSSQL)** driver connection (`mssql`).
  - Included T-SQL schema script (`sql/schema.sql`) for creating tables, constraints, foreign keys, and indexes.
  - Zero-config fallback mode included for instant local testing out-of-the-box.

---

## Directory Structure

```
social-media-platform/
├── config/
│   └── db.js                 # SQL Server (MSSQL) database driver & connection pool
├── controllers/
│   ├── authController.js     # Signup, Login, Profile with Gmail display
│   ├── postController.js     # Post upload (text/img/video), feed, delete, likes, shares
│   ├── commentController.js  # Comment box fetch & add
│   └── userController.js     # User profiles & Follow/Unfollow system
├── middleware/
│   └── authMiddleware.js     # JWT token verification
├── routes/
│   ├── authRoutes.js
│   ├── postRoutes.js
│   ├── commentRoutes.js
│   └── userRoutes.js
├── sql/
│   └── schema.sql            # T-SQL Schema for Microsoft SQL Server
├── public/
│   ├── index.html            # SPA interface layout
│   ├── css/
│   │   └── style.css         # Glassmorphic dark design system
│   └── js/
│       └── app.js            # Frontend interactivity & API consumer
├── server.js                 # Express application server
└── package.json
```

---

## Getting Started

### 1. Installation
In the project directory, run:
```bash
npm install
```

### 2. SQL Server Configuration (Optional)
Create a `.env` file in the root folder with your SQL Server credentials:
```env
PORT=3000
DB_USER=sa
DB_PASSWORD=YourPassword123
DB_SERVER=localhost
DB_NAME=SocialMediaDB
DB_ENCRYPT=false
JWT_SECRET=super_secret_social_media_key_2026
```

Execute `sql/schema.sql` inside **SQL Server Management Studio (SSMS)** or `sqlcmd` to create the `SocialMediaDB` database and sample data.

### 3. Run Application
Start the server:
```bash
npm start
```
Open your browser and navigate to:
`http://localhost:3000`

---

## Demo Accounts (Seed Data)
- **Email**: `alex.morgan@gmail.com` | **Password**: `password123`
- **Email**: `sophia.chen@gmail.com` | **Password**: `password123`
