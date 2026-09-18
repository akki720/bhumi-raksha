const express = require('express');
const router = express.Router();
const { register, login, logout, me, updateLocation, updateProfile, listPendingAuthorities, updateAuthorityStatus } = require('../controllers/authController');
const { protect, requireRole } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', protect, logout);
router.get('/me', protect, me);
router.get('/authorities/pending', protect, requireRole('admin'), listPendingAuthorities);
router.patch('/authorities/:id/approve', protect, requireRole('admin'), updateAuthorityStatus);
router.patch('/location', protect, updateLocation);
router.patch('/profile', protect, updateProfile);

module.exports = router;
