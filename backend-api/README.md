# Salon Booking Backend API

A simple and lightweight Node.js/Express backend that provides the core logic for the Salon Booking application, including user authentication and appointment management.

## 🚀 Features
- **User Authentication**: Secure Sign Up and Login flow.
- **Service Management**: Provides a list of available salon services.
- **Appointment Booking**: Handles booking requests from Web and Mobile clients.
- **In-Memory Data**: Uses an in-memory storage (reset on server restart) for quick prototyping.

## 🛠️ Prerequisites
- [Node.js](https://nodejs.org/) (v14 or later)
- npm (comes with Node.js)

## 📦 Setup & Installation
1. Navigate to the backend directory:
   ```bash
   cd backend-api
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```
   The server will be running at `http://localhost:5000`.

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/signup` | Register a new user (`name`, `email`, `password`) |
| `POST` | `/api/auth/login` | Log in with credentials (`email`, `password`) |

### Services & Bookings
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/services` | Retrieve all available services |
| `POST` | `/api/bookings` | Create a new booking (`serviceId`, `name`, `date`) |

### Health Check
- `GET /`: Returns a confirmation that the API is running.

## 📝 Demo Credentials
For testing purposes, a default user is pre-populated:
- **Email**: `hello@example.com`
- **Password**: `password`

## 🐳 Integration
This API serves both the **Next.js Web Frontend** and the **Expo Mobile App**. Ensure this server is running before attempting to use authentication or booking features on either client.
