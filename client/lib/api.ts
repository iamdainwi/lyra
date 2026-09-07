import axios from 'axios';
import { supabase } from './supabase';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  if (data?.session?.access_token) {
    config.headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await supabase.auth.signOut();
      // Dispatch a custom event that the layout can listen to
      // (avoids direct window.location usage which Next.js warns about)
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("lyra:unauthorized"));
        // Small timeout to let supabase finish, then hard redirect as fallback
        setTimeout(() => { window.location.replace("/login"); }, 100);
      }
    }
    return Promise.reject(error);
  }
);

export const researchApi = {
  startSession: async (query: string, maxDebateRounds: number = 2) => {
    const response = await api.post('/research/', {
      query,
      max_debate_rounds: maxDebateRounds,
    });
    return response.data; // { session_id, status }
  },
  
  getSession: async (sessionId: string) => {
    const response = await api.get(`/research/${sessionId}`);
    return response.data;
  },
  
  getSources: async (sessionId: string) => {
    const response = await api.get(`/research/${sessionId}/sources`);
    return response.data;
  },
  
  getDebate: async (sessionId: string) => {
    const response = await api.get(`/research/${sessionId}/debate`);
    return response.data;
  },
  
  getAnswer: async (sessionId: string) => {
    const response = await api.get(`/research/${sessionId}/answer`);
    return response.data;
  },

  // Combined endpoint — replaces getSources + getDebate + getAnswer (3 round trips → 1)
  getResults: async (sessionId: string) => {
    const response = await api.get(`/research/${sessionId}/results`);
    return response.data as { sources: unknown[]; debate: unknown[]; answer: unknown };
  },

  // SSE stream URL - uses env variable
  getStreamUrl: (sessionId: string) => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    return `${base}/api/research/${sessionId}/stream`;
  },
  
  getAuthToken: async () => {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || '';
  }
};

export default api;
