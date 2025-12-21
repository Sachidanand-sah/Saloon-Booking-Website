# 🌸 Lovely Glow - Premium Beauty Salon Booking Platform

**Lovely Glow** is a modern, full-stack salon booking web application built with **Next.js 16 (App Router)** and **Tailwind CSS v4**. It features a high-end, responsive design, a seamless multi-step booking wizard, and a secure admin dashboard for managing appointments.

![Project Status](https://img.shields.io/badge/Status-Completed-success)
![Next.js](https://img.shields.io/badge/Next.js-16.0-black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-cyan)

## ✨ Key Features

### 🎨 User Interface (Client)
- **Premium Aesthetic**: Glassmorphism effects, custom "fade-in" animations, and a sophisticated Pink/Rose color palette.
- **Responsive Design**: Fully mobile-optimized with a custom Hamburger Menu and adaptive grid layouts.
- **Interactive Landing Page**:
    - **Hero Section**: Immersive full-screen visual with call-to-actions.
    - **Floating Features**: Glass-effect cards highlighting key selling points.
    - **Popular Services**: Dynamic grid showcasing top treatments.
    - **Testimonials**: "Client Stories" section with star ratings.
- **Multi-Step Booking Wizard**:
    - **Step 1**: Custom **Visual Calendar** for date selection + Time Slot selector.
    - **Step 2**: Client Details Form (Name, Email, Phone).
    - **Confirmation**: Instant booking feedback with a summary card.

### 🛡️ Admin Dashboard
- **Secure Access**: Simple password-protected entry key (`admin123`).
- **Appointment Management**: View all incoming bookings in a sorted list.
- **Status Control**: Real-time status updates (Pending, Confirmed, Completed, Cancelled).
- **Data Persistence**: Uses local storage simulation for persistence (demo mode).

---

## 🛠️ Technology Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (React 19, Turbopack)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) (using `@tailwindcss/postcss`)
- **Language**: TypeScript
- **State Management**: React Hooks (`useState`, `useEffect`, `useMemo`)
- **Icons**: Custom SVG Icons
- **Fonts**: Custom Display Fonts architecture

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed on your machine.

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd beauty-salon-booking
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the application.

4. **Build for Production**
   ```bash
   npm run build
   npm start
   ```

---

## 📖 Usage Guide

### 1. Booking an Appointment (User)
1. Navigate to the **Home Page** or click **"Book Online"**.
2. Browse the **Services Menu** and click **"Book"** on a desired treatment.
3. **Select a Date** using the visual calendar.
4. **Choose a Time Slot** from the available list.
5. Click **"Continue"** and enter your personal details.
6. Click **"Confirm Booking"** to finalize.

### 2. Managing Appointments (Admin)
1. Navigate to `/admin`.
2. Enter the secure password: **`admin123`**.
3. **Dashboard View**: See a list of all appointments sorted by date/time.
4. **Actions**:
    - **Confirm**: Mark an appointment as confirmed.
    - **Complete**: Mark as done after service.
    - **Cancel**: Cancel a booking.
    - **Delete**: Permanently remove a record.

---

## 📂 Project Structure

```bash
├── app/
│   ├── admin/          # Admin login and dashboard
│   ├── book/           # Booking flow (Service selection & Form)
│   ├── services/       # Services listing page
│   ├── login/          # Client login page
│   ├── globals.css     # Global styles & Tailwind imports
│   └── layout.tsx      # Root layout (Navbar, Footer)
├── components/
│   ├── ui/             # Reusable UI (Button, Input)
│   ├── BookingForm.tsx # Multi-step booking wizard logic
│   ├── Calendar.tsx    # Custom visual calendar component
│   └── Navbar.tsx      # Responsive navigation with Mobile Menu
├── lib/
│   └── storage.ts      # LocalStorage simulation for data persistence
└── public/             # Static assets (images, icons)
```

---

## 📝 Demo Credentials

| Role | Username / Access | Password |
| :--- | :--- | :--- |
| **Admin** | Access via `/admin` | `admin123` |
| **Client** | `user@example.com` | `password123` |

---

*Built with ❤️ by the Lovely Glow Development Team.*
