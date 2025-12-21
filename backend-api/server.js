const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());


app.use((req, res, next) => {
  console.log(`${new Date().toLocaleString()} - ${req.method} ${req.url}`);
  next();
});


const services = [
  { id: 'haircut', name: 'Precision Haircut', price: 35 },
  { id: 'facial', name: 'Glow Facial', price: 55 },
  { id: 'manicure', name: 'Gel Manicure', price: 30 },
  { id: 'massage', name: 'Aromatherapy Massage', price: 70 },
];

const bookings = [];
const users = [
  { id: '1', name: 'John Doe', email: 'hello@example.com', password: 'password' }
]; 

// Routes
app.get('/', (req, res) => {
  res.send('Salon Booking API is running!');
});

// Authentication
app.post('/api/auth/signup', (req, res) => {
  const { name, email, password } = req.body;
  
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'All fields (name, email, password) are required.' });
  }

  // email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Please provide a valid email address.' });
  }

  // Password length validation
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
  }

  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.status(400).json({ message: 'User already exists with this email.' });
  }

  const newUser = { id: Date.now().toString(), name, email, password };
  users.push(newUser);
  console.log('New User Registered:', newUser);
  
  res.status(201).json({ message: 'User registered successfully', user: { id: newUser.id, name: newUser.name, email: newUser.email } });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const user = users.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  console.log('User Logged In:', user);
  res.json({ message: 'Login successful', user: { id: user.id, name: user.name, email: user.email } });
});

app.get('/api/services', (req, res) => {
  res.json(services);
});

app.post('/api/bookings', (req, res) => {
  const { serviceId, name, date } = req.body;
  if (!serviceId || !name || !date) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const service = services.find(s => s.id === serviceId);
  if (!service) {
    return res.status(404).json({ message: 'Service not found' });
  }

  const newBooking = { id: Date.now().toString(), serviceId, serviceName: service.name, name, date };
  bookings.push(newBooking);
  console.log('New Booking Received:', newBooking);

  res.status(201).json({ message: 'Booking confirmed', booking: newBooking });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Point your browser to http://localhost:${PORT} to test.`);
});
