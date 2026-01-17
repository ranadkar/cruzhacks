import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Loading from './pages/Loading'
import SelectSources from './pages/SelectSources'
import Dashboard from './pages/Dashboard'
import { useAppSelector } from './lib/store'

function AppContent() {
  const theme = useAppSelector((state) => state.theme.mode);

  // Apply theme class to document
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  return (
      <main>
        <Routes>
          <Route path="/" element={<Landing />} />
        <Route path="/loading" element={<Loading />} />
        <Route path="/select-sources" element={<SelectSources />} />
        <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
    </main>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}

export default App
