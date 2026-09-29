import axios from 'axios';

// One connection per API. Each address comes from .env, so every API can live on its own server.
const make = (baseURL) =>
  axios.create({ baseURL, headers: { 'Content-Type': 'application/json' }, timeout: 6000 });

const env = import.meta.env;
export const farmerApi = make(env.VITE_FARMER_API_URL || 'http://localhost:8081/api');
export const financeApi = make(env.VITE_FINANCE_API_URL || 'http://localhost:8082/api');
export const groupOrderApi = make(env.VITE_GROUPORDER_API_URL || 'http://localhost:8083/api');
export const notificationApi = make(env.VITE_NOTIFICATION_API_URL || 'http://localhost:8084/api');
export const recommendationApi = make(env.VITE_RECOMMENDATION_API_URL || 'http://localhost:8085/api');
export const supplierApi = make(env.VITE_SUPPLIER_API_URL || 'http://localhost:8086/api');

// If an API is offline, return the fallback so the app keeps working with demo data.
const safe = async (call, fallback) => {
  try { return (await call()).data; } catch { return fallback; }
};

// Finance API
export const logEntry = (entry) => safe(() => financeApi.post('/expenses', entry), entry);
export const getEntries = (farmerId, fallback = []) => safe(() => financeApi.get(`/expenses/farmer/${farmerId}`), fallback);

// Group order API
export const getGroups = (fallback) => safe(() => groupOrderApi.get('/groups/active'), fallback);
export const joinGroup = (id, farmerId) => safe(() => groupOrderApi.post(`/groups/${id}/join`, { farmerId }), null);

// Supplier API
export const getSuppliers = (fallback) => safe(() => supplierApi.get('/suppliers'), fallback);

// Farmer API
export const registerFarmer = (farmer) => safe(() => farmerApi.post('/farmers', farmer), farmer);
export const getFarmer = (id, fallback = null) => safe(() => farmerApi.get(`/farmers/${id}`), fallback);

// Notification API
export const getNotifications = (farmerId, fallback = []) => safe(() => notificationApi.get(`/notifications/farmer/${farmerId}`), fallback);

// Recommendation API
export const getRecommendations = (farmerId, fallback = []) => safe(() => recommendationApi.get(`/recommendations/farmer/${farmerId}`), fallback);
