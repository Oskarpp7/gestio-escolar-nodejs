import { createRouter, createWebHistory } from "vue-router";

// Vistas (code-splitting)
const Login = () => import("@/views/Login.vue");
const Dashboard = () => import("@/views/Dashboard.vue");
const PricingManagement = () => import("@/views/admin/PricingManagement.vue");
const FamilyDashboard = () => import("@/views/family/FamilyDashboard.vue");

// Guard simple basado en store (stub)
import { useAuthStore } from "@/stores/auth";

const routes = [
  { path: "/", redirect: "/dashboard" },
  {
    path: "/login",
    name: "login",
    component: Login,
    meta: { public: true, transition: "fade" },
  },
  {
    path: "/dashboard",
    name: "dashboard",
    component: Dashboard,
    meta: { requiresAuth: true, transition: "slide-left" },
  },
  {
    path: "/admin/pricing",
    name: "admin-pricing",
    component: PricingManagement,
    meta: { requiresAuth: true, role: "SUPER_ADMIN", transition: "slide-left" },
  },
  {
    path: "/family",
    name: "family-dashboard",
    component: FamilyDashboard,
    meta: { requiresAuth: true, transition: "slide-left" },
  },
  {
    path: "/:pathMatch(.*)*",
    name: "not-found",
    component: Dashboard,
    meta: { public: true },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (to.meta.public) return true;
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: "login", query: { redirect: to.fullPath } };
  }
  // Chequeo de rol simple
  if (to.meta.role && auth.user && auth.user.role !== to.meta.role) {
    return { name: "dashboard" };
  }
  return true;
});

export default router;
