import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 6000,
});

// Each call falls back to local demo data if the Spring Boot API is offline.
const safe = async (call, fallback) => {
  try { return (await call()).data; } catch { return fallback; }
};

export const logEntry = (entry) => safe(() => client.post('/expenses', entry), entry);
export const getGroups = (fallback) => safe(() => client.get('/groups/active'), fallback);
export const joinGroup = (id, farmerId) => safe(() => client.post(`/groups/${id}/join`, { farmerId }), null);
export const getSuppliers = (fallback) => safe(() => client.get('/suppliers'), fallback);
export default client;
