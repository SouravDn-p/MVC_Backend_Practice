export interface RegisterDto {
    name: string;
    email: string;
    password: string;
  }
  
  export interface LoginDto {
    email: string;
    password: string;
  }
  
  export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
  }
  
  export interface SafeUser {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: Date;
  }