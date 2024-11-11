// routes/auth.js
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/user.js';

const router = express.Router();

// JWT Secret Key from environment
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key'; // Ensure this is set correctly

// Login route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      console.error('User not found for email:', email);
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Compare provided password with hashed password in DB
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.error('Password does not match for user:', email);
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token if password is valid
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1h' });
    const refreshToken = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' }); // Generate a refresh token

    console.log('Login successful for user:', email);
    console.log('Generated Token:', token);
    console.log('Generated Refresh Token:', refreshToken);

    // Respond with token, refresh token, and user info (exclude password)
    res.status(200).json({
      message: 'Login successful',
      token, // Include the token in the response
      refreshToken, // Send the refresh token
      user: { username: user.username, email: user.email },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error logging in' });
  }
});

// Refresh token route
router.post('/refresh-token', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(403).json({ message: 'Refresh token is required.' });
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET);
    const newToken = jwt.sign({ id: decoded.id }, JWT_SECRET, { expiresIn: '1h' }); // New access token
    res.json({ token: newToken });
  } catch (error) {
    res.status(403).json({ message: 'Invalid refresh token.' });
  }
});

export default router;
