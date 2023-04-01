import { createRouter, createWebHistory } from 'vue-router'
import Login from '@/views/LoginView.vue'
import VirtualizedTable from '@/components/virtualizedTable.vue'
import ElDisplay from "@/views/ElDisplay.vue";

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
    }
  ]
})

export default router
