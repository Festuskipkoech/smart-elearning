import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {API_KEY} from "../api.js"
import { FormattedMessage} from './format.js'

// Initialize the Gemini model with API key from environment variables
const genAI = new GoogleGenerativeAI(API_KEY);

export default function Chatbot() {
    const [messages, setMessages] = useState([
      {
        type: "bot",
        content: "Hi, I'm your AI assistant. How can I help you?",
      },
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesRef = useRef(null);
  
    useEffect(() => {
      messagesRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);
  
    const handleResponse = async (userInput) => {
        try {
          if (userInput.toLowerCase().includes("who made you")) {
            return "I was created by Festus, from Martial School of IT.";
          }
          const model = genAI.getGenerativeModel({ model: "gemini-pro" });
          const result = await model.generateContent(userInput);
          const response = await result.response;
          
          // Clean up the response text to remove any potential duplicates
          const cleanedText = response.text().trim();
          return cleanedText;
        } catch (error) {
          console.error("Error with Gemini API:", error);
          return "I encountered an error. Please try again.";
        }
      };
  
    const handleSend = async () => {
        if (!input.trim() || isLoading) return;
      
        const userMessage = input.trim();
        setMessages((prev) => [...prev, { type: "user", content: userMessage }]);
        setInput("");
        setIsLoading(true);
      
        try {
          const response = await handleResponse(userMessage);
      
          // Prevent duplicate responses
          setMessages((prev) => {
            const lastBotMessage = prev
              .slice()
              .reverse()
              .find((msg) => msg.type === "bot");
      
            if (lastBotMessage && lastBotMessage.content === response) {
              return prev; // Do not add duplicate response
            }
      
            return [...prev, { type: "bot", content: response }];
          });
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
      <div className="flex h-screen bg-slate-10 font-lato">
        {/* Sidebar */}
        <div className="hidden md:flex md:w-64 bg-gray-900 p-4 flex-col">
          <button className="text-white bg-gray-800 rounded-lg p-3 flex items-center gap-2 w-full hover:bg-gray-700 transition-colors">
            <MessageCircle size={20} />
            <span>New Chat</span>
          </button>
          <div className="mt-4 flex-1 overflow-y-auto">
            {/* Chat history could go here */}
          </div>
        </div>
  
        {/* Main chat area */}
        <div className="flex-1 flex flex-col">
          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
            <div className="max-w-3xl mx-auto">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`mb-6 ${
                    message.type === "bot" ? "mr-12" : "ml-12"
                  }`}
                >
                  <div
                    className={`rounded-2xl p-4 ${
                      message.type === "bot"
                        ? "bg-white shadow-sm"
                        : "bg-black text-white"
                    }`}
                  >
                    {message.type === "bot" ? (
                      <FormattedMessage content={message.content} />
                    ) : (
                      <span>{message.content}</span>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="mb-6 mr-12">
                  <div className="rounded-2xl p-4 bg-white shadow-sm">
                    <span className="text-gray-600">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesRef} />
            </div>
          </div>
  
          {/* Input area */}
          <div className="border-t mt-0 bg-white pt-0 p-4 md:p-6">
            <div className="max-w-3xl mx-auto relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Message..."
                className="w-full h-20 mt-0 pt-0 p-4 pr-12 rounded-lg border border-gray-300 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-black disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  