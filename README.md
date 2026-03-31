# VI Connects 🚀

VI Connects is a modern, high-performance video conferencing and real-time collaboration platform. Built with the MERN stack and Socket.io, it offers seamless video meetings, instant messaging, and a premium user experience.

![VI Connects Banner](https://images.unsplash.com/photo-1588196749597-9ff075ee6b5b?q=80&w=1000&auto=format&fit=crop)

## ✨ Key Features

- **High-Quality Video Meetings**: Real-time video and audio communication powered by WebRTC and Socket.io.
- **Secure Authentication**: Robust user authentication system using JWT (JSON Web Tokens) and bcrypt.
- **Instant Messaging**: Real-time chat functionality within meeting rooms.
- **Meeting Management**: Create and join meetings with unique IDs.
- **Premium UI/UX**: Modern, responsive interface built with Tailwind CSS, Framer Motion, and Material UI.
- **Guest Access**: Seamless experience for guest users joining meetings.
- **Security First**: Implementation of Helmet, CORS, and Rate Limiting for enhanced protection.

## 🛠️ Tech Stack

### Frontend
- **Framework**: React (v19)
- **Build Tool**: Vite
- **Styling**: Tailwind CSS, Material UI (MUI)
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Networking**: Axios, Socket.io-client
- **Routing**: React Router (v7)

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (via Mongoose)
- **Real-time**: Socket.io
- **Security**: JWT, Bcrypt, Helmet, Express Rate Limit
- **Validation**: Express Validator

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [MongoDB](https://www.mongodb.com/) (Local or Atlas)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Student-vansh-S/VI-Connects.git
   cd VI-Connects
   ```

2. **Backend Setup**
   ```bash
   cd Backend
   npm install
   ```
   Create a `.env` file in the `Backend` directory and add the environment variables listed below.

3. **Frontend Setup**
   ```bash
   cd ../Frontend
   npm install
   ```

### Running Locally

1. **Start Backend Server**
   ```bash
   cd Backend
   npm run dev
   ```

2. **Start Frontend Development Server**
   ```bash
   cd Frontend
   npm run dev
   ```

---

## 🔑 Environment Variables

### Backend (`/Backend/.env`)
| Variable | Description |
| :--- | :--- |
| `MONGODB_URL` | MongoDB connection string |
| `PORT` | Backend server port (default: 8000) |
| `JWT_SECRET` | Secret key for JWT signing |
| `JWT_ACCESS_EXPIRY` | Access token expiration (e.g., 15m) |
| `JWT_REFRESH_EXPIRY` | Refresh token expiration (e.g., 7d) |
| `CLIENT_URL` | Frontend application URL (for CORS) |
| `NODE_ENV` | Environment (development/production) |

---

## 📂 Project Structure

```text
VI Connects/
├── Backend/
│   ├── src/
│   │   ├── config/         # App configuration
│   │   ├── controllers/    # Route controllers & Socket logic
│   │   ├── middleware/     # Auth & Error middlewares
│   │   ├── models/         # Mongoose models
│   │   ├── routes/         # Express routes
│   │   └── app.js          # Entry point
│   └── .env                # Environment variables
├── Frontend/
│   ├── src/
│   │   ├── components/     # UI Components
│   │   ├── pages/          # Application pages
│   │   ├── context/        # State management
│   │   └── App.jsx         # Main React component
│   └── tailwind.config.js  # Styling configuration
└── README.md
```

## 🛡️ Security

VI Connects implements several security best practices:
- **Rate Limiting**: Prevents brute-force attacks on auth routes.
- **Security Headers**: Uses Helmet to secure Express apps by setting various HTTP headers.
- **CORS Configuration**: Restricts access to trusted origins only.
- **Data Sanitization**: Prevents NoSQL injection and XSS.

---

## 👤 Author

**Vansh Saini**
- GitHub: [@Student-vansh-S](https://github.com/Student-vansh-S)

## 📄 License

This project is [ISC](https://opensource.org/licenses/ISC) licensed.
