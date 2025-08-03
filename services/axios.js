import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.nadiaradio.com/v1/app', 
  withCredentials: true, 
});

// Response interceptor for error handling
api.interceptors.response.use(
  response => response,
  error => {
    const status = error.response?.status;
    const message = error.response?.data?.message || 'An error occurred';
    
    if ([401, 403, 404].includes(status) || status >= 500) { 
      console.error('API Error:', message);
    }
    
    return Promise.reject(error);
  }
);

export default api;