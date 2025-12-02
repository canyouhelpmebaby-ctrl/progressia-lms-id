import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import LessonView from "./pages/LessonView";
import QuizPage from "./pages/QuizPage";
import Notifications from "./pages/Notifications";
import Goals from "./pages/Goals";
import LearningTimer from "./pages/LearningTimer";
import LearningRecords from "./pages/LearningRecords";
import Materials from "./pages/Materials";
import Rewards from "./pages/Rewards";
import Profile from "./pages/Profile";
import AdminUsers from "./pages/AdminUsers";
import AdminUserDetail from "./pages/AdminUserDetail";
import AdminCourses from "./pages/AdminCourses";
import AdminModules from "./pages/AdminModules";
import AdminLessons from "./pages/AdminLessons";
import AdminQuizManagement from "./pages/AdminQuizManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses"
              element={
                <ProtectedRoute>
                  <Courses />
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses/:courseId"
              element={
                <ProtectedRoute>
                  <CourseDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses/:courseId/lessons/:lessonId"
              element={
                <ProtectedRoute>
                  <LessonView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses/:courseId/quizzes/:quizId"
              element={
                <ProtectedRoute>
                  <QuizPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <Notifications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/goals"
              element={
                <ProtectedRoute>
                  <Goals />
                </ProtectedRoute>
              }
            />
            <Route
              path="/timer"
              element={
                <ProtectedRoute>
                  <LearningTimer />
                </ProtectedRoute>
              }
            />
            <Route
              path="/records"
              element={
                <ProtectedRoute>
                  <LearningRecords />
                </ProtectedRoute>
              }
            />
            <Route
              path="/materials"
              element={
                <ProtectedRoute>
                  <Materials />
                </ProtectedRoute>
              }
            />
            <Route
              path="/rewards"
              element={
                <ProtectedRoute>
                  <Rewards />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminUsers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users/:userId"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminUserDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/courses"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminCourses />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/courses/:courseId/modules"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminModules />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/modules/:moduleId/lessons"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminLessons />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/quizzes/:quizId"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminQuizManagement />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
