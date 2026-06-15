import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export function paginate(page: number, limit: number, total: number): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode = 200,
  meta?: PaginationMeta
): Response => {
  const response: ApiResponse<T> = { success: true, data, message, meta };
  return res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 500,
  error?: string
): Response => {
  const response: ApiResponse = { success: false, message, error };
  return res.status(statusCode).json(response);
};

export const sendCreated = <T>(res: Response, data: T, message?: string): Response =>
  sendSuccess(res, data, message, 201);
