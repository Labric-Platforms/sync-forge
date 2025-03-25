import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import Dashboard from "@/pages/Dashboard"
import Login from "@/pages/Login"
import FileDetails from "@/pages/FileDetails"
import ProtectedRoute from "@/components/ProtectedRoute"

function App() {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/file/:path" element={
            <ProtectedRoute>
              <FileDetails />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    )
  }
  
  export default App
  