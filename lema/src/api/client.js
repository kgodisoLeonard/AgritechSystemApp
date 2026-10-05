import axios from 'axios';

// Two real backends are deployed:
//  - `api`        (Node/Express, VITE_API_URL)        -> farmers, expenses, income,
//                                                        suppliers, products, group orders,
//                                                        recommendations, notifications.
//  - `financeApi` (Spring Boot, VITE_FINANCE_API_URL) -> farmer register/login and the
//                                                        Ollama-backed AI chat assistant.
const env = import.meta.env || {};

export const api = axios.create({
  baseURL: env.VITE_API_URL || '/node/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 8000,
});

export const financeApi = axios.create({
  baseURL: env.VITE_FINANCE_API_URL || '/fin/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 8000,
});

// Every exported call resolves to { data, error } instead of throwing, so
// callers can show a real error message rather than have a request fail silently.
async function call(promise) {
  try {
    const { data } = await promise;
    return { data, error: null };
  } catch (err) {
    const message = err.response?.data?.message || err.response?.data?.detail
      || err.message || 'Request failed';
    return { data: null, error: message };
  }
}

/* ---------- Auth (Spring finance API) ---------- */
export const registerFarmer = (body) => call(financeApi.post('/farmers/register', body));
export const loginFarmer = (body) => call(financeApi.post('/farmers/login', body));

/* ---------- AI assistant (Spring finance API + Ollama) ---------- */
export async function askAI(prompt, context) {
  const result = await call(financeApi.post('/chat', { prompt, context }, { timeout: 250000 }));
  if (!result.error && (typeof result.data?.response !== 'string' || !result.data.response.trim())) {
    return { data: null, error: 'The AI service returned an empty reply. Please try again.' };
  }
  return result;
}

/* ---------- Farmers (Node api) ---------- */
export const getFarmer = (id) => call(api.get(`/farmers/${id}`));

/* ---------- Ledger: expenses + income (Node api) ---------- */
export const getExpenses = (farmerId) => call(api.get(`/farmers/${farmerId}/expenses`));
export const addExpense = (farmerId, body) => call(api.post(`/farmers/${farmerId}/expenses`, body));
export const getIncome = (farmerId) => call(api.get(`/farmers/${farmerId}/income`));
export const addIncome = (farmerId, body) => call(api.post(`/farmers/${farmerId}/income`, body));

/* ---------- Marketplace (Node api) ---------- */
export const getSuppliers = () => call(api.get('/suppliers'));
export const getProducts = () => call(api.get('/products'));
export const getGroupOrders = () => call(api.get('/group-orders'));
export const joinGroupOrder = (id, body) => call(api.post(`/group-orders/${id}/join`, body));

/* ---------- AI recommendations + supplier notifications (Node api) ---------- */
export const getRecommendations = (farmerId) => call(api.get(`/farmers/${farmerId}/recommendations`));
export const refreshRecommendations = () => call(api.post('/ai/recommendations/refresh'));
export const getLoanReadiness = (farmerId) => call(api.get(`/farmers/${farmerId}/loan-readiness`));
export const getNotifications = () => call(api.get('/notifications'));

/* ---------- Machine-learning analytics (Spring finance API) ---------- */
export const getFarmerClusters = (k = 3) => call(financeApi.get(`/ai/farmer-clusters?k=${k}`));
export const getNearestFarmers = (farmerId, limit = 5) => call(financeApi.get(`/ai/farmers/${farmerId}/nearest?limit=${limit}`));
export const getFarmerAnomalies = (farmerId) => call(financeApi.get(`/ai/farmers/${farmerId}/anomalies`));
