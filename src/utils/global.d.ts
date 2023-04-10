import axios from '@/utils/axios'

declare module 'vue' {
  interface ComponentCustomProperties {
    $http: typeof axios
    $message: typeof import('element-plus/es')['ElMessage']
  }
}
