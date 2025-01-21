import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {API_KEY} from "../../api.js"

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
      const lowerInput = userInput.toLowerCase();
  
      // Check for common greetings
      const greetings = ["hello", "hi", "hey"];
      if (greetings.some((greet) => lowerInput.includes(greet))) {
        const friendlyGreetings = [
          "Hi there! 😊 How can I assist you today?",
          "Hello! 👋 What can I help you with?",
          "Hey! 👋 How's your day going?",
        ];
        return friendlyGreetings[Math.floor(Math.random() * friendlyGreetings.length)];
      }
  
      // Check for specific questions
      if (lowerInput.includes("who made you")) {
        return "I was created by Festus, from Martial School of IT.";
      }
  
      // Handle general queries using the Gemini API
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      
      // Enhanced prompt to encourage better formatting
      const prompt = `
        You are a friendly and helpful study assistant. Please provide a clear, well-structured response to this question: ${userInput}
        
        Format your response using these guidelines:
        - Use "# " for main headings and "## " for subheadings
        - Organize complex information into clear paragraphs
        - Use "-" for bullet points when listing items
        - Use "1." for numbered lists when sequence matters
        - Add empty lines between sections for better readability
        - Bold important terms using **term**
        - If providing examples, label them clearly
        
        Keep the response concise but informative.
      `;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
  
      // Process and format the response
      return response.text()
        .split('\n')
        .map(line => {
          // Preserve markdown headings
          if (line.startsWith('# ')) return `\n${line}\n`;
          if (line.startsWith('## ')) return `\n${line}\n`;
          
          // Format bullet points with proper spacing
          if (line.trim().startsWith('- ')) {
            return `\n${line.trim()}`;
          }
          
          // Format numbered lists with proper spacing
          if (/^\d+\.\s/.test(line.trim())) {
            return `\n${line.trim()}`;
          }
          
          // Preserve bold text
          return line.trim();
        })
        .filter(line => line) // Remove empty lines
        .join('\n');
    } catch (error) {
      console.error("Error with Gemini API:", error);
      return "Oops! Something went wrong. Can you try again?";
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
                {message.type === "bot" ? (
                  <FormattedMessage content={message.content} />
                ) : (
                  <span className="text-gray-800">{message.content}</span>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="message bot loading">
                <span className="loading-dots">Thinking...</span>
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
