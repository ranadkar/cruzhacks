import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import Landing from './pages/Landing'
import SearchResults from './pages/SearchResults'
import Nav from './components/nav'

function AppContent() {
  const location = useLocation();
  const isLandingPage = location.pathname === '/';
  return (
    <>
      {!isLandingPage && <Nav />}
      <main>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/search-results" element={<SearchResults />} />
        </Routes>
      </main>
    </>
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
