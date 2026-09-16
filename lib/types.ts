export type Opinion = {
  id: number;
  nickname: string;
  content: string;
  createdAt: string;
  updatedAt: string | null;
  canEdit: boolean;
};

export type ApiError = {
  error: {
    code: string;
    message: string;
  };
};

export type ApiSuccess<T> = {
  data: T;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
