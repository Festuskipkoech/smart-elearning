import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainComponent from './components/MainComponent';
import Chatbot from './AI/Chatbot';
import './App.css';
import QuizSystem from './AI/QuizSystem';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainComponent />} />
        <Route path="/chatbot" element={<Chatbot />} />
        <Route path="/quiz" element={<QuizSystem/>} />
      </Routes>
    </Router>
  );
}

export default App;