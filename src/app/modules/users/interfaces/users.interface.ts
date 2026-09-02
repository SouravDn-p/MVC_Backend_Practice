export interface UpdateUserDto {
  name?: string;
  photo?: string | null;
  location?: string | null;
}

export interface UpdateUserStatusDto {
  isActive: boolean;
}
