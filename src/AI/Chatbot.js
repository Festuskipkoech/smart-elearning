import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {API_KEY} from "../api.js"

// Initialize the Gemini model with API key from environment variables
const genAI = new GoogleGenerativeAI(API_KEY);

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      type: "bot",
      content: "Hi, I'm your AI assistant, made by Martial School of IT. How can I help you?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesRef = useRef(null);

  const scrollToBottom = () => {
    messagesRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleResponse = async (userInput) => {
    try {
      if (userInput.toLowerCase().includes("who made you")) {
        return "I was created by Festus, from Martial School of IT.";
      }
  
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const prompt = `You are a helpful study assistant. Please help with this question: ${userInput}. Keep your response clear and well-structured, but avoid using markdown symbols like **, *, or -.`;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      
      // Format the response text while maintaining structure
      let formattedText = response.text()
        .replace(/\*\*/g, '')  // Remove bold
        .replace(/\*/g, '')    // Remove italics
        .replace(/`/g, '')     // Remove code formatting
        .replace(/^\s*[-•]\s*/gm, '• ') // Standardize bullet points
        .split('\n')           // Split into lines
        .map(line => line.trim()) // Trim each line
        .filter(line => line)  // Remove empty lines
        .join('\n');          // Rejoin with newlines
  
      return formattedText;
    } catch (error) {
      console.error("Error with Gemini API:", error);
      throw error;
    }
  };
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    setMessages((prev) => [...prev, { type: "user", content: input.trim() }]);
    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);

    try {
      const response = await handleResponse(userMessage);
      setMessages((prev) => [...prev, { type: "bot", content: response }]);
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        { type: "bot", content: "Sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        className="chat-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle Chat"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
      {isOpen && (
        <div className="chat-window">
          <div className="chat-header">
            <h3>AI Student Assistant</h3>
            <p className="chat-subtitle">Made by MSI</p>
          </div>
          <div className="chat-messages">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`message ${message.type === "bot" ? "bot" : "user"}`}
              >
                {message.content}
              </div>
            ))}
            {isLoading && (
              <div className="message bot loading">
                <span className="loading-bots">Thinking...</span>
              </div>
            )}
            <div ref={messagesRef} />
          </div>
          <div className="chat-input">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type your question"
              disabled={isLoading}
            />
            <button onClick={handleSend} disabled={isLoading || !input.trim()}>
              <Send size={20} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
