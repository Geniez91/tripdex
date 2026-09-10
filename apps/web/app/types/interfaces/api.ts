export type ApiOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: BodyInit | Record<string, unknown>;
  headers?: HeadersInit;
};

export interface TripdexApi {
  get<T>(path: string, options?: ApiOptions): Promise<T>;
  post<T>(path: string, options?: ApiOptions): Promise<T>;
  put<T>(path: string, options?: ApiOptions): Promise<T>;
  delete<T>(path: string, options?: ApiOptions): Promise<T>;
}
