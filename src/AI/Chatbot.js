import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {API_KEY} from "../api.js"

// Initialize the Gemini model with API key from environment variables
const genAI = new GoogleGenerativeAI(API_KEY);
const FormattedMessage = ({ content }) => {
    // Helper function to process inline formatting
    const formatInlineText = (text) => {
      return text
        // Bold text
        .replace(/\*\*(.+?)\*\*/g, (_, boldText) => (
          `<span class="font-bold">${boldText}</span>`
        ))
        // Italic text
        .replace(/\*(.+?)\*/g, (_, italicText) => (
          `<span class="italic">${italicText}</span>`
        ))
        // Inline code
        .replace(/`(.+?)`/g, (_, codeText) => (
          `<code class="bg-gray-100 px-1 rounded font-mono text-sm">${codeText}</code>`
        ));
    };
  
    const formatContent = (text) => {
      const sections = text.split('\n');
      let currentSection = null;
      const formattedSections = [];
      
      sections.forEach((line, index) => {
        // Strip trailing whitespace but preserve leading whitespace for nested lists
        const trimmedLine = line.replace(/\s+$/, '');
        
        // Main title (# Title)
        if (trimmedLine.match(/^#\s+[^#]/)) {
          formattedSections.push(
            <h1 
              key={`title-${index}`} 
              className="text-2xl font-extrabold text-gray-900 mt-6 mb-4 font-heading"
              dangerouslySetInnerHTML={{ 
                __html: formatInlineText(trimmedLine.replace(/^#\s*/, ''))
              }}
            />
          );
        }
        
        // Subtitle (## Subtitle)
        else if (trimmedLine.match(/^##\s+/)) {
          formattedSections.push(
            <h2 
              key={`subtitle-${index}`} 
              className="text-xl font-bold text-gray-800 mt-5 mb-3 font-heading"
              dangerouslySetInnerHTML={{ 
                __html: formatInlineText(trimmedLine.replace(/^##\s*/, ''))
              }}
            />
          );
        }
        
        // Section heading (### Heading)
        else if (trimmedLine.match(/^###\s+/)) {
          formattedSections.push(
            <h3 
              key={`heading-${index}`} 
              className="text-lg font-semibold text-gray-700 mt-4 mb-2 font-heading"
              dangerouslySetInnerHTML={{ 
                __html: formatInlineText(trimmedLine.replace(/^###\s*/, ''))
              }}
            />
          );
        }
        
        // Unordered list item
        else if (trimmedLine.match(/^\s*[-•]\s/)) {
          if (!currentSection || currentSection.type !== 'unordered-list') {
            currentSection = {
              type: 'unordered-list',
              items: []
            };
            formattedSections.push(currentSection);
          }
          
          // Calculate nesting level based on leading spaces
          const nestLevel = (trimmedLine.match(/^\s*/) || [''])[0].length / 2;
          
          currentSection.items.push(
            <li 
              key={`ul-item-${index}`} 
              className={`ml-${nestLevel * 4} mb-2 text-gray-700`}
              dangerouslySetInnerHTML={{ 
                __html: formatInlineText(trimmedLine.replace(/^\s*[-•]\s/, ''))
              }}
            />
          );
        }
        
        // Numbered list item
        else if (trimmedLine.match(/^\s*\d+\.\s/)) {
          if (!currentSection || currentSection.type !== 'ordered-list') {
            currentSection = {
              type: 'ordered-list',
              items: []
            };
            formattedSections.push(currentSection);
          }
          
          const nestLevel = (trimmedLine.match(/^\s*/) || [''])[0].length / 2;
          
          currentSection.items.push(
            <li 
              key={`ol-item-${index}`} 
              className={`ml-${nestLevel * 4} mb-2 text-gray-700`}
              dangerouslySetInnerHTML={{ 
                __html: formatInlineText(trimmedLine.replace(/^\s*\d+\.\s/, ''))
              }}
            />
          );
        }
        
        // Code block
        else if (trimmedLine.startsWith('```')) {
          if (!currentSection || currentSection.type !== 'code') {
            currentSection = {
              type: 'code',
              content: []
            };
            formattedSections.push(currentSection);
          } else {
            formattedSections.push(
              <pre key={`code-${index}`} className="bg-gray-50 p-4 rounded-lg my-3 font-mono text-sm overflow-x-auto">
                <code>{currentSection.content.join('\n')}</code>
              </pre>
            );
            currentSection = null;
          }
        }
        else if (currentSection?.type === 'code') {
          currentSection.content.push(trimmedLine);
        }
        
        // Regular paragraph text
        else if (trimmedLine.trim()) {
          if (currentSection?.type === 'paragraph') {
            currentSection.content.push(trimmedLine);
          } else {
            currentSection = {
              type: 'paragraph',
              content: [trimmedLine]
            };
            formattedSections.push(currentSection);
          }
        }
        // Empty line - close current section
        else if (trimmedLine === '') {
          if (currentSection?.type === 'paragraph') {
            formattedSections.push(
              <p 
                key={`p-${index}`} 
                className="text-gray-600 mb-4 leading-relaxed"
                dangerouslySetInnerHTML={{ 
                  __html: formatInlineText(currentSection.content.join(' '))
                }}
              />
            );
          }
          currentSection = null;
        }
      });
  
      // Map sections back to JSX
      return formattedSections.map((section, index) => {
        if (section?.type === 'unordered-list') {
          return (
            <ul key={`ul-${index}`} className="my-3 pl-6 list-disc list-outside space-y-1">
              {section.items}
            </ul>
          );
        }
        if (section?.type === 'ordered-list') {
          return (
            <ol key={`ol-${index}`} className="my-3 pl-6 list-decimal list-outside space-y-1">
              {section.items}
            </ol>
          );
        }
        if (section?.type === 'paragraph') {
          return (
            <p 
              key={`p-${index}`} 
              className="text-gray-600 mb-4 leading-relaxed"
              dangerouslySetInnerHTML={{ 
                __html: formatInlineText(section.content.join(' '))
              }}
            />
          );
        }
        return section;
      });
    };
  
    return (
      <div className="formatted-message font-sans">
        {formatContent(content)}
      </div>
    );
  };
  


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
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent(userInput);
        const response = await result.response;
        return response.text();
      } catch (error) {
        console.error("Error with Gemini API:", error);
        return "I encountered an error. Please try again.";
      }
    };
  
    const handleSend = async () => {
      if (!input.trim() || isLoading) return;
  
      const userMessage = input.trim();
      setMessages(prev => [...prev, { type: "user", content: userMessage }]);
      setInput("");
      setIsLoading(true);
  
      try {
        const response = await handleResponse(userMessage);
        setMessages(prev => [...prev, { type: "bot", content: response }]);
      } catch (error) {
        console.error("Error:", error);
        setMessages(prev => [
          ...prev,
          { type: "bot", content: "Sorry, I encountered an error. Please try again." },
        ]);
      } finally {
        setIsLoading(false);
      }
    };
  
    return (
      <div className="flex h-screen bg-gray-100">
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
          <div className="border-t bg-white p-4 md:p-6">
            <div className="max-w-3xl mx-auto relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Message..."
                className="w-full p-4 pr-12 rounded-lg border border-gray-300 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
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
  