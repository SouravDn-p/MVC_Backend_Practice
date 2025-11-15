/**
 * Frontend Authentication Guide for Token-based Authentication
 * 
 * This guide explains how to implement authentication with access and refresh tokens
 * in a TypeScript frontend application.
 */

// 1. Authentication Service Interface
interface AuthResponse {
  success: boolean;
  user: {
    id: string;
    name: string;
    email: string;
  };
  accessToken: string;
  refreshToken: string;
}

interface RefreshResponse {
  success: boolean;
  accessToken: string;
}

// 2. Token Management Class
class TokenManager {
  private static ACCESS_TOKEN_KEY = 'access_token';
  private static REFRESH_TOKEN_KEY = 'refresh_token';
  private static USER_KEY = 'user';

  static setTokens(accessToken: string, refreshToken: string, user: any): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  static getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  static getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  static getUser(): any {
    const user = localStorage.getItem(this.USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  static clearTokens(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }
}

// 3. Authentication Service
class AuthService {
  private baseUrl = 'http://localhost:5000/api/auth'; // Adjust to your API base URL

  /**
   * Register a new user
   */
  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Registration failed');
    }

    return data;
  }

  /**
   * Login user
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Login failed');
    }

    // Store tokens and user data
    TokenManager.setTokens(data.accessToken, data.refreshToken, data.user);

    return data;
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<RefreshResponse> {
    const refreshToken = TokenManager.getRefreshToken();
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${this.baseUrl}/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await response.json();
    
    if (!data.success) {
      // Clear tokens if refresh fails
      TokenManager.clearTokens();
      throw new Error(data.message || 'Token refresh failed');
    }

    // Update access token using the TokenManager's method indirectly
    // We need to preserve the refresh token while updating the access token
    const existingRefreshToken = TokenManager.getRefreshToken();
    const user = TokenManager.getUser();
    if (existingRefreshToken && user) {
      TokenManager.clearTokens();
      TokenManager.setTokens(data.accessToken, existingRefreshToken, user);
    }

    return data;
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    const accessToken = TokenManager.getAccessToken();
    const refreshToken = TokenManager.getRefreshToken();

    if (accessToken && refreshToken) {
      try {
        await fetch(`${this.baseUrl}/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ refreshToken }),
        });
      } catch (error) {
        console.error('Logout request failed:', error);
      }
    }

    // Clear tokens regardless of server response
    TokenManager.clearTokens();
  }
}

// 4. HTTP Client with Automatic Token Refresh
class HttpClient {
  private baseUrl = 'http://localhost:5000'; // Adjust to your API base URL
  private authService = new AuthService();

  async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const accessToken = TokenManager.getAccessToken();
    
    // Add authorization header if token exists
    if (accessToken) {
      options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${accessToken}`,
      };
    }

    // Set default content type
    if (options.method && ['POST', 'PUT', 'PATCH'].includes(options.method)) {
      options.headers = {
        ...options.headers,
        'Content-Type': 'application/json',
      };
    }

    let response = await fetch(`${this.baseUrl}${endpoint}`, options);
    
    // If unauthorized, try to refresh token
    if (response.status === 401) {
      try {
        await this.authService.refreshAccessToken();
        
        // Retry the request with new token
        const newAccessToken = TokenManager.getAccessToken();
        if (newAccessToken) {
          options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${newAccessToken}`,
          };
        }
        
        response = await fetch(`${this.baseUrl}${endpoint}`, options);
      } catch (error) {
        // If refresh fails, redirect to login
        TokenManager.clearTokens();
        window.location.href = '/login';
        throw error;
      }
    }

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Request failed');
    }

    return data;
  }

  get(endpoint: string, options: RequestInit = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint: string, body: any, options: RequestInit = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) });
  }

  put(endpoint: string, body: any, options: RequestInit = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) });
  }

  delete(endpoint: string, options: RequestInit = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

// 5. Usage Examples

// Initialize services
const authService = new AuthService();
const httpClient = new HttpClient();

// Example: User Registration
async function handleRegister(name: string, email: string, password: string) {
  try {
    const response = await authService.register(name, email, password);
    console.log('Registration successful:', response.user);
    // Redirect to dashboard or show success message
  } catch (error: any) {
    console.error('Registration failed:', error.message);
    // Show error to user
  }
}

// Example: User Login
async function handleLogin(email: string, password: string) {
  try {
    const response = await authService.login(email, password);
    console.log('Login successful:', response.user);
    // Redirect to dashboard
  } catch (error: any) {
    console.error('Login failed:', error.message);
    // Show error to user
  }
}

// Example: Making Authenticated API Requests
async function fetchUserProfile() {
  try {
    const response = await httpClient.get('/api/users/profile');
    console.log('User profile:', response.data);
  } catch (error: any) {
    console.error('Failed to fetch profile:', error.message);
  }
}

// Example: Logout
async function handleLogout() {
  try {
    await authService.logout();
    console.log('Logged out successfully');
    // Redirect to login page
  } catch (error: any) {
    console.error('Logout failed:', error.message);
  }
}

// 6. Protected Route Guard (Example for React)
function isAuthenticated(): boolean {
  return !!TokenManager.getAccessToken();
}

// Example usage in a React component
// function ProtectedComponent() {
//   const [user, setUser] = useState(null);
//   
//   useEffect(() => {
//     if (!isAuthenticated()) {
//       // Redirect to login
//       window.location.href = '/login';
//       return;
//     }
//     
//     const currentUser = TokenManager.getUser();
//     setUser(currentUser);
//   }, []);
//   
//   if (!isAuthenticated()) {
//     return null; // or redirect component
//   }
//   
//   return (
//     <div>
//       <h1>Welcome, {user?.name}!</h1>
//       {/* Protected content */}
//     </div>
//   );
// }

// 7. Auto-refresh Token Setup
// You can set up an interval to automatically refresh the access token before it expires
function setupAutoRefresh() {
  // Refresh token every 14 minutes (access token expires in 15 minutes)
  setInterval(async () => {
    try {
      const refreshToken = TokenManager.getRefreshToken();
      if (refreshToken) {
        await authService.refreshAccessToken();
        console.log('Token refreshed automatically');
      }
    } catch (error) {
      console.error('Auto-refresh failed:', error);
    }
  }, 14 * 60 * 1000); // 14 minutes
}

// Call this function when your app initializes
// setupAutoRefresh();

export {
  AuthService,
  HttpClient,
  TokenManager,
  isAuthenticated,
  handleRegister,
  handleLogin,
  handleLogout,
  fetchUserProfile
};