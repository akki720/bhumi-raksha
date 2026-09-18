const express = require('express');
const router = express.Router();
const { createReport, getReports, getReportById, verifyReport } = require('../controllers/reportsController');
const upload = require('../middleware/upload');
const { protect, requireRole } = require('../middleware/auth');

router.post('/', upload.single('image'), createReport);
router.get('/', getReports);
router.get('/:id', getReportById);
router.patch('/:id/verify', protect, requireRole('authority', 'field_officer', 'admin'), verifyReport);

module.exports = router;
