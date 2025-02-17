import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainComponent from './components/MainComponent';
import Chatbot from './AI/Chatbot';
import QuizSystem from './AI/QuizSystem';
import Auth from './Authentification/Auth';
import ServerDown from './components/serverDown.js';
import Loading from './components/Loading.js';
import './App.css';
import { Anthropic } from "@anthropic-ai/sdk";
import { API_KEY } from "./api.js";

const apiKey = API_KEY;
const anthropic = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

function App() {
  const [billingOkay, setBillingOkay] = useState(null); // Initially null to wait for response

  useEffect(() => {
    const checkAPIStatus = async () => {
      try {
        const prompt = "what is ai"; 
        
        const response = await anthropic.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 2000,
          messages: [{ role: "user", content: prompt }],
        });

        // Check for billing issue or any non-200 status
        if (response.status === 402) {
          setBillingOkay(false); // Billing issue detected
        } else if (response.status !== 200) {
          setBillingOkay(false); // Handle other non-200 responses
        } else {
          setBillingOkay(true); // API is working as expected
        }
      } catch (error) {
        console.error('Error with the API call:', error);
        setBillingOkay(false); // Error with API call
      }
    };

    checkAPIStatus();
    const interval = setInterval(checkAPIStatus, 60000); // Check every 1 minute
    return () => clearInterval(interval); 
  }, []);

  // If billingOkay is null, show loading spinner
  if (billingOkay === null) {
    return <Loading />;
  }

  return (
    <Router>
      <Routes>
        {billingOkay ? (
          <>
            <Route path="/" element={<MainComponent />} />
            <Route path="/chatbot" element={<Chatbot />} />
            <Route path="/quiz" element={<QuizSystem />} />
            <Route path="/auth" element={<Auth />} />
          </>
        ) : (
          <Route path="*" element={<ServerDown />} /> 
        )}
      </Routes>
    </Router>
  );
}

export default App;
