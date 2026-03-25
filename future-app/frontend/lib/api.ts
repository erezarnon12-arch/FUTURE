import axios from "axios";
import type {
  Client, Asset, Liability, Goal, NetWorthSnapshot,
  DashboardData, AIAnalysis,
  RetirementReadiness, RebalanceData, FeeDragData,
  DebtPayoffData, MonteCarloData,
} from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const api = axios.create({ baseURL: API_URL });

// ── Clients ────────────────────────────────────────────────────────────────────
export const getClients = () =>
  api.get<Client[]>("/clients").then((r) => r.data);
export const getClient = (id: number) =>
  api.get<Client>(`/clients/${id}`).then((r) => r.data);
export const createClient = (data: Omit<Client, "id" | "created_at" | "updated_at">) =>
  api.post<Client>("/clients", data).then((r) => r.data);
export const updateClient = (id: number, data: Partial<Client>) =>
  api.patch<Client>(`/clients/${id}`, data).then((r) => r.data);
export const deleteClient = (id: number) =>
  api.delete(`/clients/${id}`);

// ── Assets ─────────────────────────────────────────────────────────────────────
export const getAssets = (clientId: number, ring?: string) =>
  api.get<Asset[]>(`/clients/${clientId}/assets`, { params: ring ? { ring } : {} }).then((r) => r.data);
export const createAsset = (clientId: number, data: Omit<Asset, "id" | "client_id">) =>
  api.post<Asset>(`/clients/${clientId}/assets`, data).then((r) => r.data);
export const updateAsset = (assetId: number, data: Partial<Asset>) =>
  api.patch<Asset>(`/assets/${assetId}`, data).then((r) => r.data);
export const deleteAsset = (assetId: number) =>
  api.delete(`/assets/${assetId}`);

// ── Liabilities ────────────────────────────────────────────────────────────────
export const getLiabilities = (clientId: number) =>
  api.get<Liability[]>(`/clients/${clientId}/liabilities`).then((r) => r.data);
export const createLiability = (clientId: number, data: Omit<Liability, "id" | "client_id">) =>
  api.post<Liability>(`/clients/${clientId}/liabilities`, data).then((r) => r.data);
export const updateLiability = (liabilityId: number, data: Partial<Liability>) =>
  api.patch<Liability>(`/liabilities/${liabilityId}`, data).then((r) => r.data);
export const deleteLiability = (liabilityId: number) =>
  api.delete(`/liabilities/${liabilityId}`);

// ── Goals ──────────────────────────────────────────────────────────────────────
export const getGoals = (clientId: number) =>
  api.get<Goal[]>(`/clients/${clientId}/goals`).then((r) => r.data);
export const createGoal = (clientId: number, data: Omit<Goal, "id" | "client_id" | "progress_pct">) =>
  api.post<Goal>(`/clients/${clientId}/goals`, data).then((r) => r.data);
export const updateGoal = (goalId: number, data: Partial<Goal>) =>
  api.patch<Goal>(`/goals/${goalId}`, data).then((r) => r.data);
export const deleteGoal = (goalId: number) =>
  api.delete(`/goals/${goalId}`);

// ── Dashboard ──────────────────────────────────────────────────────────────────
export const getDashboard = (clientId: number) =>
  api.get<DashboardData>(`/clients/${clientId}/dashboard`).then((r) => r.data);

// ── Snapshots ──────────────────────────────────────────────────────────────────
export const getSnapshots = (clientId: number) =>
  api.get<NetWorthSnapshot[]>(`/clients/${clientId}/snapshots`).then((r) => r.data);
export const createSnapshot = (clientId: number, notes?: string) =>
  api.post<NetWorthSnapshot>(`/clients/${clientId}/snapshots`, { notes }).then((r) => r.data);

// ── AI Analysis ────────────────────────────────────────────────────────────────
export const runAnalysis = (clientId: number) =>
  api.post<AIAnalysis>(`/clients/${clientId}/analyze`).then((r) => r.data);
export const getAnalyses = (clientId: number) =>
  api.get(`/clients/${clientId}/analyses`).then((r) => r.data);

// ── Analytics endpoints ────────────────────────────────────────────────────────
export const getRetirementReadiness = (clientId: number) =>
  api.get<RetirementReadiness>(`/clients/${clientId}/retirement-readiness`).then((r) => r.data);
export const getRebalancing = (clientId: number) =>
  api.get<RebalanceData>(`/clients/${clientId}/rebalance`).then((r) => r.data);
export const getFeesReport = (clientId: number, years = 30) =>
  api.get<FeeDragData>(`/clients/${clientId}/fees-report`, { params: { years } }).then((r) => r.data);
export const getDebtPayoff = (clientId: number, extraMonthly = 0) =>
  api.get<DebtPayoffData>(`/clients/${clientId}/debt-payoff`, {
    params: { extra_monthly: extraMonthly },
  }).then((r) => r.data);
export const getMonteCarlo = (clientId: number, scenario = "average", nPaths = 1000) =>
  api.get<MonteCarloData>(`/clients/${clientId}/monte-carlo`, {
    params: { scenario, n_paths: nPaths },
  }).then((r) => r.data);
export const getProjections = (clientId: number, scenario = "average") =>
  api.get(`/clients/${clientId}/projections`, { params: { scenario } }).then((r) => r.data);

// ── Chat ───────────────────────────────────────────────────────────────────────
export const sendChatMessage = (clientId: number, message: string) =>
  api.post<{ response: string; role: string }>(`/clients/${clientId}/chat`, { message }).then((r) => r.data);
export const getChatHistory = (clientId: number) =>
  api.get(`/clients/${clientId}/chat/history`).then((r) => r.data);
export const clearChatHistory = (clientId: number) =>
  api.delete(`/clients/${clientId}/chat/history`);
export const getChatStreamUrl = (clientId: number) =>
  `${API_URL}/clients/${clientId}/chat/stream`;

// ── Seed ───────────────────────────────────────────────────────────────────────
export const seedDemo = () => api.post("/seed").then((r) => r.data);

// ── Owner (protected — real clients only) ─────────────────────────────────────
const ownerApi = (key: string) =>
  axios.create({ baseURL: API_URL, headers: { "X-Owner-Key": key } });

export const verifyOwnerKey = (key: string) =>
  ownerApi(key).get<Client[]>("/owner/clients").then((r) => r.data);
export const getOwnerClients = (key: string) =>
  ownerApi(key).get<Client[]>("/owner/clients").then((r) => r.data);
export const createOwnerClient = (key: string, data: Omit<Client, "id" | "created_at" | "updated_at">) =>
  ownerApi(key).post<Client>("/owner/clients", data).then((r) => r.data);
export const deleteOwnerClient = (key: string, id: number) =>
  ownerApi(key).delete(`/owner/clients/${id}`);

export default api;
