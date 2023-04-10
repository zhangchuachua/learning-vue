import axios from 'axios'

const instance = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL
})

// instance.interceptors.response.use(() => {}, () => {},)
// instance.defaults.baseURL = import.meta.env.VITE_BASE_URL;
console.log(instance.defaults.baseURL)

export default instance
