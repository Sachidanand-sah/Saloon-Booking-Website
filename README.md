# Salon Booking System

This project consists of three main components: a web application, a customer mobile app, and a backend API.

## Project Structure

- **`beauty-salon-booking/`**: Next.js Web Application (Admin/Main site).
- **`customer-mobile-app/`**: React Native (Expo) Mobile Application for customers.
- **`backend-api/`**: Node.js/Express Backend API handling data and bookings.

## Getting Started

### 1. Backend API
The backend serves data to the mobile app (and potentially the web app).

```bash
cd backend-api
npm install
npm start
```
*Runs on `http://localhost:5000`*

### 2. Customer Mobile App
A simple mobile app for customers to view services and book appointments.

```bash
cd customer-mobile-app
npm install
npm start
```
*Use Expo Go on your phone to scan the QR code, or use an emulator.*
*Note: The app is configured to connect to `http://10.0.2.2:5000` (Android Emulator) or `http://localhost:5000`. Update `API_URL` in `screens/HomeScreen.js` and `screens/BookingScreen.js` if running on a physical device.*

### 3. Web Application
The main salon website.

```bash
cd beauty-salon-booking
npm install
npm run dev
```
*Runs on `http://localhost:3000`*

## Features

- **View Services**: Customers can browse available salon services.
- **Book Appointments**: Simple booking flow sending data to the backend.
- **Backend Storage**: Currently uses in-memory storage (data resets on restart).
