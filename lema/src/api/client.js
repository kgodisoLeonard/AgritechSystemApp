import axios from 'axios';

// Two real backends are deployed:
//  - `api`        (Node/Express, VITE_API_URL)        -> farmers, expenses, income,
//                                                        suppliers, products, group orders,
//                                                        recommendations, notifications.
//  - `financeApi` (Spring Boot, VITE_FINANCE_API_URL) -> farmer register/login and the
//                                                        Ollama-backed AI chat assistant.
const env = import.meta.env;

export const api = axios.create({
  baseURL: env.VITE_API_URL || 'http://localhost:3000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 8000,
});

export const financeApi = axios.create({
  baseURL: env.VITE_FINANCE_API_URL || 'http://localhost:8081/api',
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
    const message = err.response?.data?.message || err.message || 'Request failed';
    return { data: null, error: message };
  }
}

/* ---------- Auth (Spring finance API) ---------- */
export const registerFarmer = (body) => call(financeApi.post('/farmers/register', body));
export const loginFarmer = (body) => call(financeApi.post('/farmers/login', body));

/* ---------- AI assistant (Spring finance API + Ollama) ---------- */
export const askAI = (prompt) => call(financeApi.post('/chat', { prompt }, { timeout: 30000 }));

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
export const getNotifications = () => call(api.get('/notifications'));
