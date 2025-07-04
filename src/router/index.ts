import { createRouter, createWebHistory } from 'vue-router'
import RegisterView from '@/views/login/register-view.vue'
import LoginView from '@/views/login/login-view.vue'
import ChatView from '@/views/chat/chat-view.vue'
import AnalyzeResultView from '@/views/code/analyze/analyze-result-view.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: ChatView,
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
    {
      path: '/analyze',
      component: AnalyzeResultView,
      props(to) {
        return { path: to.query.path }
      },
    },

    {
      path: '/privacyPolicy',
      component: () => import('@/views/privacyPolicy/index.vue'),
      name: 'privacyPolicy',
      meta: {
        hidden: true,
      },
    },
    {
      path: '/termsService',
      component: () => import('@/views/termsService/index.vue'),
      name: 'termsService',
      meta: {
        hidden: true,
      },
    },
  ],
})

export default router
