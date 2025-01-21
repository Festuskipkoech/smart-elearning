import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { API_KEY } from "../api.js";
import { FormattedMessage } from "./format.js";

const genAI = new GoogleGenerativeAI(API_KEY);

export default function Chatbot() {
  const [messages, setMessages] = useState([
    {
      type: "bot",
      content: "Hi, I'm your AI assistant. How can I help you?",
      id: "initial",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesRef = useRef(null);
  const responseIdRef = useRef(0);

  useEffect(() => {
    messagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleResponse = async (userInput) => {
    try {
      if (userInput.toLowerCase().includes("who made you")) {
        return "I was created by Festus, from Martial School of IT.";
      }

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro",
        tools: [
          {
            codeExecution: {},
          },
        ],
        
       });
      
      // Enable streaming
      const response = await model.generateContentStream(userInput);
      
      let fullResponse = "";
      const messageId = `response-${responseIdRef.current++}`;
      
      // Initialize an empty message for streaming
      setMessages(prev => [...prev, { 
        type: "bot", 
        content: "", 
        id: messageId,
        isStreaming: true 
      }]);

      // Process the stream chunks
      for await (const chunk of response.stream) {
        const chunkText = chunk.text();
        fullResponse += chunkText;
        
        // Update the message with accumulated text
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, content: fullResponse }
            : msg
        ));
      }

      // Mark streaming as complete
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, isStreaming: false }
          : msg
      ));

      return fullResponse;
    } catch (error) {
      console.error("Error with Gemini API:", error);
      return "I encountered an error. Please try again.";
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    const messageId = `user-${responseIdRef.current}`;
    
    setMessages(prev => [...prev, { 
      type: "user", 
      content: userMessage,
      id: messageId 
    }]);
    setInput("");
    setIsLoading(true);

    try {
      await handleResponse(userMessage);
    } catch (error) {
      console.error("Error:", error);
      setMessages(prev => [...prev, {
        type: "bot",
        content: "Sorry, I encountered an error. Please try again.",
        id: `error-${responseIdRef.current}`
      }]);
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
        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
          <div className="max-w-3xl mx-auto">
            {messages.map((message) => (
              <div
                key={message.id}
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
                    <>
                      <FormattedMessage content={message.content} />
                      {message.isStreaming && (
                        <span className="inline-block w-2 h-4 ml-1 bg-black animate-pulse" />
                      )}
                    </>
                  ) : (
                    <span>{message.content}</span>
                  )}
                </div>
              </div>
            ))}
            {isLoading && !messages.find(m => m.isStreaming) && (
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
              className="w-full h-20 mt-0 pt-0 p-4 pr-12 rounded-lg border border-gray-300 focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-black"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-black disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={30} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}