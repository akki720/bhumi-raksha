const express = require('express');
const router = express.Router();
const { getCurrent, getForecast } = require('../controllers/weatherController');

router.get('/current', getCurrent);
router.get('/forecast', getForecast);

module.exports = router;
