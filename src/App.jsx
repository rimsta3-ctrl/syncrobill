import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import Terminal from './components/Terminal';
import { LanguageProvider } from './i18n';
import './Prestige.css';

function App() {
  return (
    <LanguageProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/terminal" element={<Terminal />} />
        </Routes>
      </Router>
    </LanguageProvider>
  );
}

export default App;
