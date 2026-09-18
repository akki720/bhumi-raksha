import apiClient from './client';

export const getCurrentWeather = (lat, lon) =>
  apiClient.get('/weather/current', { params: { lat, lon } }).then((r) => r.data);

export const getForecast = (lat, lon) =>
  apiClient.get('/weather/forecast', { params: { lat, lon } }).then((r) => r.data);

export const getNearbyRisk = (lat, lon) =>
  apiClient.get('/risk/nearby', { params: { lat, lon } }).then((r) => r.data);

export const getRiskGeoJSON = () => apiClient.get('/risk/geojson').then((r) => r.data);

export const getHistoricalLandslides = (lat, lon, radiusKm) =>
  apiClient.get('/risk/historical', { params: { lat, lon, radiusKm } }).then((r) => r.data);

export const getAlerts = () => apiClient.get('/alerts').then((r) => r.data);

export const getNearbyAlerts = (lat, lon, radiusKm) =>
  apiClient.get('/alerts/nearby', { params: { lat, lon, radiusKm } }).then((r) => r.data);

export const acknowledgeAlert = (id) => apiClient.patch(`/alerts/${id}/acknowledge`).then((r) => r.data);

export const getNearbySafePlaces = (lat, lon, radiusKm) =>
  apiClient.get('/safe-places/nearby', { params: { lat, lon, radiusKm } }).then((r) => r.data);

export const getDashboardStats = () => apiClient.get('/dashboard/stats').then((r) => r.data);

export const getPendingAuthorities = () => apiClient.get('/auth/authorities/pending').then((r) => r.data);

export const updateAuthorityApproval = (id, approved, reason = '') =>
  apiClient.patch(`/auth/authorities/${id}/approve`, { approved, reason }).then((r) => r.data);

export const getFieldReports = (params = {}) => apiClient.get('/reports', { params }).then((r) => r.data);

export const submitFieldReport = (formData) =>
  apiClient
    .post('/reports', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then((r) => r.data);

export const verifyFieldReport = (id, status) =>
  apiClient.patch(`/reports/${id}/verify`, { status }).then((r) => r.data);

export const sendSOS = (payload) => apiClient.post('/sos', payload).then((r) => r.data);

export const getSafeRoute = (lat, lon) =>
  apiClient.get('/risk/safe-route', { params: { lat, lon } }).then((r) => r.data);

export const queueOfflineReport = (report) => apiClient.post('/offline/queue-report', { report }).then((r) => r.data);

export const login = (payload) => apiClient.post('/auth/login', payload).then((r) => r.data);

export const register = (payload) => apiClient.post('/auth/register', payload).then((r) => r.data);

export const logout = () => apiClient.post('/auth/logout').then((r) => r.data);

export const getMe = () => apiClient.get('/auth/me').then((r) => r.data);

export const updateUserLocation = (lat, lon) =>
  apiClient.patch('/auth/location', { latitude: lat, longitude: lon }).then((r) => r.data);

export const updateProfile = (payload) => apiClient.patch('/auth/profile', payload).then((r) => r.data);
