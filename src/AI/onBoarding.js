import { useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:8000/api/v1";

export default function Onboarding({ setUser, setCurriculum }) {
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    if (!subject.trim()) return alert("Please enter a subject!");
    
    setLoading(true);
    try {
      // Generate curriculum
      const res = await axios.post(`${API_URL}/generate`, { subject }, { headers: { "Content-Type": "application/json" } });
      setCurriculum(res.data.topics);
      
      // Register user
      const userRes = await axios.post(`${API_URL}/register`, {
        email: "testuser@example.com",
        name: "Test User",
        password: "password123",
        subject
      });

      setUser(userRes.data);
    } catch (error) {
      console.error("Error generating curriculum", error);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <h1 className="text-3xl font-bold">Welcome to Smart Tutor</h1>
      <p className="mt-2">Enter a subject you want to learn:</p>
      <input
        type="text"
        className="mt-4 p-2 border rounded w-80"
        placeholder="E.g., Python Programming"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
      />
      <button
        onClick={handleStart}
        className="mt-4 bg-blue-500 text-white px-6 py-2 rounded"
        disabled={loading}
      >
        {loading ? "Loading..." : "Start Learning"}
      </button>
    </div>
  );
}
