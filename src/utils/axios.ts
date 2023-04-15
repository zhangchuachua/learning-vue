import type { AxiosRequestConfig } from 'axios'
import axios from 'axios'

const instance = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL
})

// instance.interceptors.response.use(() => {}, () => {},)
// instance.defaults.baseURL = import.meta.env.VITE_BASE_URL;
console.log(instance.defaults.baseURL)

interface UploadResponse {
  status: 0
  path: string | string[] | undefined
}

export const upload = (url: string, data: FormData) => {
  return instance.post<UploadResponse>(url, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export default instance
