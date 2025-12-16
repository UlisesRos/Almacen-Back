const express = require('express');
const router = express.Router();
const { register, login, getMe, updateProfile, googleAuth, forgotPassword, resetPassword } = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth.middleware');

// Rutas públicas
router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

// Rutas protegidas
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

module.exports = router;