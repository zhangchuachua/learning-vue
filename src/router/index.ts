import { createRouter, createWebHistory } from 'vue-router'
import Login from '@/views/LoginView.vue'
import VirtualizedTable from '@/components/virtualizedTable.vue'
import ElDisplay from "@/views/ElDisplay.vue";
import UploadFiles from "@/views/UploadFiles.vue";
import DownloadFiles from '@/views/DownloadFiles.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Login
    },
    {
      path: '/virtualized-table',
      name: 'virtualized-table',
      component: VirtualizedTable
    },
    {
      path: '/el-virtualized',
      name: 'el-virtualized',
      component: ElDisplay
    },
    {
      path: '/upload-files',
      name: 'upload-files',
      component: UploadFiles
    },
    {
      path: '/download-files',
      name: 'download-files',
      component: DownloadFiles
    }
  ]
})

export default router
