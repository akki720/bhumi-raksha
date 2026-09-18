const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

const VALID_ROLES = ['user', 'authority', 'field_officer', 'admin'];

const buildUserResponse = (user) => ({
  id: user._id,
  name: user.name,
  username: user.username,
  email: user.email,
  phone: user.phone || '',
  department: user.department || '',
  approvalNote: user.approvalNote || '',
  role: user.role,
  authorityApproved: user.authorityApproved ?? false,
  createdAt: user.createdAt,
});

const listPendingAuthorities = asyncHandler(async (req, res) => {
  const pendingAuthorities = await User.find({ role: 'authority', authorityApproved: false })
    .sort({ createdAt: -1 })
    .select('name username email phone department createdAt');

  res.json({
    success: true,
    total: pendingAuthorities.length,
    pendingAuthorities: pendingAuthorities.map((user) => buildUserResponse(user)),
  });
});

const updateAuthorityStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { approved, reason } = req.body;

  const user = await User.findById(id);
  if (!user) {
    res.status(404);
    throw new Error('Authority account not found');
  }

  if (user.role !== 'authority') {
    res.status(400);
    throw new Error('Only authority accounts can be approved or rejected');
  }

  const isApproved = Boolean(approved);
  user.authorityApproved = isApproved;
  user.department = String(user.department || '').trim() || user.department || '';

  if (reason && typeof reason === 'string' && reason.trim()) {
    user.approvalNote = reason.trim();
  }

  await user.save();

  res.json({
    success: true,
    message: isApproved ? 'Authority approved successfully' : 'Authority approval revoked',
    user: buildUserResponse(user),
  });
});

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, username, email, password, phone, role, department } = req.body;

  if (!name || !username || !email || !password) {
    res.status(400);
    throw new Error('name, username, email and password are required');
  }

  if (password.length < 6) {
    res.status(400);
    throw new Error('Password must be at least 6 characters long');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400);
    throw new Error('Please enter a valid email address');
  }

  const normalizedRole = VALID_ROLES.includes(role) ? role : 'user';
  const normalizedEmail = email.toLowerCase().trim();
  const normalizedUsername = username.toLowerCase().trim();

  const existingEmail = await User.findOne({ email: normalizedEmail });
  if (existingEmail) {
    res.status(409);
    throw new Error('A user with this email already exists');
  }

  const existingUsername = await User.findOne({ username: normalizedUsername });
  if (existingUsername) {
    res.status(409);
    throw new Error('This username is already taken');
  }

  const user = await User.create({
    name: name.trim(),
    username: normalizedUsername,
    email: normalizedEmail,
    password,
    phone: phone ? phone.trim() : '',
    department: department ? String(department).trim() : '',
    role: normalizedRole,
    authorityApproved: normalizedRole === 'authority' ? false : true,
  });

  const token = generateToken(user._id);

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    token,
    user: buildUserResponse(user),
  });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Email and password are required');
  }

  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  if (user.role === 'authority' && !user.authorityApproved) {
    res.status(403);
    throw new Error('Your authority account is pending admin approval');
  }

  const token = generateToken(user._id);

  res.json({
    success: true,
    message: 'Login successful',
    token,
    user: buildUserResponse(user),
  });
});

// POST /api/auth/logout
const logout = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Logout successful' });
});

// GET /api/auth/me
const me = asyncHandler(async (req, res) => {
  res.json({ success: true, user: buildUserResponse(req.user) });
});

// PATCH /api/auth/location
const updateLocation = asyncHandler(async (req, res) => {
  const latitude = Number(req.body.latitude);
  const longitude = Number(req.body.longitude);

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    res.status(400);
    throw new Error('latitude and longitude are required and must be numeric');
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.lastKnownLocation = {
    type: 'Point',
    coordinates: [longitude, latitude],
  };

  await user.save();

  res.json({
    success: true,
    message: 'Location updated successfully',
    user: buildUserResponse(user),
  });
});

// PATCH /api/auth/profile
const updateProfile = asyncHandler(async (req, res) => {
  const { name, username, phone } = req.body;
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (name && name.trim()) user.name = name.trim();
  if (phone !== undefined) user.phone = phone ? String(phone).trim() : '';

  if (username && username.trim()) {
    const normalizedUsername = username.toLowerCase().trim();
    if (normalizedUsername !== user.username) {
      const existingUsername = await User.findOne({ username: normalizedUsername, _id: { $ne: user._id } });
      if (existingUsername) {
        res.status(409);
        throw new Error('This username is already taken');
      }
      user.username = normalizedUsername;
    }
  }

  await user.save();

  res.json({
    success: true,
    message: 'Profile updated successfully',
    user: buildUserResponse(user),
  });
});

module.exports = {
  register,
  login,
  logout,
  me,
  updateLocation,
  updateProfile,
  listPendingAuthorities,
  updateAuthorityStatus,
};
