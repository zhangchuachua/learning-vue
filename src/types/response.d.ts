export interface ExistResponse {
  status: string;
  data: {
    isExist: boolean;
    url?: string;
    chunks?: string[];
    error?: any;
  }
}
