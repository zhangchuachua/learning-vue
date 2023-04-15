import axios from '@/utils/axios'

declare module 'vue' {
  interface ComponentCustomProperties {
    $http: typeof axios
  }
}
