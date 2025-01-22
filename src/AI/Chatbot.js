import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, Menu, X, Trash2 } from "lucide-react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { API_KEY } from "../api.js";
import { FormattedMessage } from "./format.js";

const genAI = new GoogleGenerativeAI(API_KEY);

export default function Chatbot() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Chat history state
  const [chatHistory, setChatHistory] = useState(() => {
    const saved = localStorage.getItem('chatHistory');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Current chat ID state
  const [currentChatId, setCurrentChatId] = useState(() => {
    const saved = localStorage.getItem('currentChatId');
    return saved || `chat-${Date.now()}`;
  });

  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem(`messages-${currentChatId}`);
    return saved ? JSON.parse(saved) : [{
      type: "bot",
      content: "Hello! I'm your AI assistant. How can I help you today?",
      id: "initial",
    }];
  });

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesRef = useRef(null);
  const responseIdRef = useRef(0);
  const inputRef = useRef(null);

  // Save states to localStorage
  useEffect(() => {
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
  }, [chatHistory]);

  useEffect(() => {
    localStorage.setItem('currentChatId', currentChatId);
  }, [currentChatId]);

  useEffect(() => {
    localStorage.setItem(`messages-${currentChatId}`, JSON.stringify(messages));
  }, [messages, currentChatId]);

  useEffect(() => {
    messagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Function to handle input blur and focus
  const handleInputFocus = () => {
    // On mobile, scroll to bottom when input is focused
    if (window.innerWidth <= 768) {
      setTimeout(() => {
        window.scrollTo(0, document.body.scrollHeight);
      }, 100);
    }
  };

  const handleInputBlur = () => {
    // On mobile, blur input after sending message
    if (window.innerWidth <= 768) {
      inputRef.current?.blur();
    }
  };

  // Handle keyboard events
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault(); // Prevent default to avoid unwanted line breaks
      handleSend();
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(prev => !prev);
  };

  const createNewChat = () => {
    const newChatId = `chat-${Date.now()}`;
    const newChat = {
      id: newChatId,
      title: "New Chat",
      timestamp: Date.now()
    };
    
    setChatHistory(prev => [newChat, ...prev]);
    setCurrentChatId(newChatId);
    setMessages([{
      type: "bot",
      content: "Hello! I'm your AI assistant. How can I help you today?",
      id: "initial",
    }]);
  };

  const loadChat = (chatId) => {
    const savedMessages = localStorage.getItem(`messages-${chatId}`);
    
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
      setCurrentChatId(chatId);
      setIsMobileMenuOpen(false);
    }
  };

  const deleteChat = (chatId, e) => {
    e.stopPropagation();
    setChatHistory(prev => prev.filter(chat => chat.id !== chatId));
    localStorage.removeItem(`messages-${chatId}`);
    
    if (currentChatId === chatId) {
      createNewChat();
    }
  };

  const updateChatTitle = (chatId) => {
    setChatHistory(prev => prev.map(chat => {
      if (chat.id === chatId) {
        const messages = JSON.parse(localStorage.getItem(`messages-${chatId}`) || '[]');
        const firstUserMessage = messages.find(m => m.type === 'user');
        const title = firstUserMessage 
          ? firstUserMessage.content.slice(0, 30) + (firstUserMessage.content.length > 30 ? '...' : '')
          : 'New Chat';
        return { ...chat, title };
      }
      return chat;
    }));
  };

  const handleResponse = async (userInput) => {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      
      const response = await model.generateContentStream(userInput);
      
      let fullResponse = "";
      const messageId = `response-${responseIdRef.current++}`;
      
      setMessages(prev => [...prev, { 
        type: "bot", 
        content: "", 
        id: messageId,
        isStreaming: true 
      }]);

      for await (const chunk of response.stream) {
        const chunkText = chunk.text();
        fullResponse += chunkText;
        
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, content: fullResponse }
            : msg
        ));
      }

      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, isStreaming: false }
          : msg
      ));

      // Update chat title after first user message
      if (messages.length <= 2) {
        updateChatTitle(currentChatId);
      }

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
    
    // Blur input field immediately after sending
    handleInputBlur();
    
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
      // Reset scroll position after response
      messagesRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="md:flex sm:flex-grow h-screen bg-slate-10 font-lato">
      <button
        onClick={toggleMobileMenu}
        className="md:hidden fixed top-4 right-4 z-50 p-2 bg-gray-900 text-white rounded-lg"
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar with Chat History */}
      <div
        className={`${
          isMobileMenuOpen ? 'fixed inset-0 z-40' : 'hidden'
        } md:relative md:flex md:w-64 bg-gray-900 p-4 flex-col transition-all duration-300 ease-in-out`}
      >
        <div className="flex items-center gap-2 text-white mb-4">
          <MessageCircle size={24} />
          <span className="text-lg font-semibold">Chat Assistant</span>
        </div>
        
        {/* New Chat Button */}
        <button
          onClick={() => {
            createNewChat();
            setIsMobileMenuOpen(false);
          }}
          className="text-white bg-black rounded-lg p-3 flex items-center gap-2 w-full hover:bg-black transition-colors mb-4"
        >
          <MessageCircle size={20} />
          <span>New Chat</span>
        </button>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto -mx-4 px-4">
          <div className="space-y-2">
            {chatHistory.map((chat) => (
              <div
                key={chat.id}
                onClick={() => loadChat(chat.id)}
                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer ${
                  currentChatId === chat.id
                    ? "bg-gray-700 text-white"
                    : "text-gray-300 hover:bg-gray-800"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <MessageCircle size={16} />
                  <span className="truncate">{chat.title}</span>
                </div>
                <button
                  onClick={(e) => deleteChat(chat.id, e)}
                  className="p-1 hover:text-red-500"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 sm:overflow-y-auto sm:p-2 px-2 md:px-4 py-6 md:py-8">
          <div className="max-w-3xl mx-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`mb-4 ${
                  message.type === "bot" ? "mr-8 md:mr-12" : "ml-8 md:ml-12"
                }`}
              >
                <div
                  className={`rounded-2xl p-3 md:p-4 ${
                    message.type === "bot"
                      ? "bg-white shadow-sm"
                      : "bg-gray-900 text-white"
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
              <div className="mb-4 mr-8 md:mr-12">
                <div className="rounded-2xl p-3 md:p-4 bg-white shadow-sm">
                  <span className="text-gray-600">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesRef} />
          </div>
        </div>

        {/* Input area */}
        <div className="sm:sticky sm:bottom-0 border-t bg-white p-2 md:p-4">
          <div className="max-w-3xl mx-auto relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={handleInputFocus}
              placeholder="Type your message..."
              className="w-full p-3 md:p-4 pr-12 rounded-lg border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 text-sm md:text-base"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}