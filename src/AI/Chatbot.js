import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, Menu, X, Trash2, ArrowRight } from "lucide-react";
import { Anthropic } from "@anthropic-ai/sdk";
import CircularProgress from "@mui/material/CircularProgress";
import { useNavigate, useLocation } from "react-router-dom";
import { API_KEY } from "../api.js";
import { FormattedMessage } from "./format.js";
const apiKey = API_KEY;
const anthropic = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

export default function Chatbot() {
  // Core states for chat functionality
  const location = useLocation();
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem("currentMessages");
    return saved
      ? JSON.parse(saved)
      : [
          {
            type: "bot",
            content:
              "Hi! I'm your AI Tutor. what would you like to learn today?",
            id: "initial",
          },
        ];
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNextLoading, setIsNextLoading] = useState(false);
  const [assessmentCompleted, setAssessmentCompleted] = useState(false);


  // Curriculum states
  const [curriculum, setCurriculum] = useState(() => {
    const saved = localStorage.getItem("curriculum");
    return saved
      ? JSON.parse(saved)
      : {
          subject: null,
          topics: [],
          subtopics: {},
          currentTopicIndex: 0,
          currentSubtopicIndex: 0,
          hasStarted: false,
        };
  });
  useEffect(() => {
    localStorage.setItem("currentMessages", JSON.stringify(messages));
  }, [messages]);
  
  const chatId = localStorage.getItem("currentChatId");
  // const storedCurriculum = localStorage.getItem(`curriculum-${chatId}`);
  
  // Chat history state
  const [chatHistory, setChatHistory] = useState(() => {
    const saved = localStorage.getItem("chatHistory");
    return saved ? JSON.parse(saved) : [];
  });
  const [currentChatId, setCurrentChatId] = useState(() => {
    const saved = localStorage.getItem("currentChatId");
    return saved || `chat-${Date.now()}`;
  });
  useEffect(() => {
    localStorage.setItem("currentChatId", currentChatId);
  }, [currentChatId]);

  // Assessment state
  const [assessmentPopup, setAssessmentPopup] = useState(null);
  const [newChatPopup, setNewChatPopup] = useState(null);

  const [assessmentData, setAssessmentData] = useState(() => {
    const saved = localStorage.getItem("assessmentData");
    return saved ? JSON.parse(saved) : {};
  });
  useEffect(() => {
    const submitted = localStorage.getItem("assessmentSubmitted");
    if (submitted === "true") {
      setAssessmentPopup(null);
      localStorage.removeItem("assessmentSubmitted");
    }
  }, [messages]);
  
  useEffect(() => {
    if (curriculum && currentChatId) {
      localStorage.setItem(`curriculum-${currentChatId}`, JSON.stringify(curriculum));
    }
  }, [curriculum, currentChatId]);

  useEffect(() => {
    localStorage.setItem("assessmentData", JSON.stringify(assessmentData));
  }, [assessmentData]);

  // Refs
  const messagesRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Save chat history to localStorage
  useEffect(() => {
    localStorage.setItem("chatHistory", JSON.stringify(chatHistory));
  }, [chatHistory]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Check for assessments

  useEffect(() => {
    if (curriculum.hasStarted && !assessmentCompleted) {
      localStorage.removeItem("assessmentCompleted");
      localStorage.removeItem("assessmentPopup");
    }
  }, [curriculum.currentTopicIndex, curriculum.currentSubtopicIndex]);

  useEffect(() => {
    // Skip if curriculum hasn't started or assessment is already completed
    if (!curriculum.hasStarted || assessmentCompleted) return;

    const totalSubtopics = 
      (curriculum.currentTopicIndex * 4) + curriculum.currentSubtopicIndex + 1;
    
    // Only check for assessment if we've completed the current subtopic
    if (messages[messages.length - 1]?.type !== "bot") return;

    let assessmentType = null;
    
    if ([4, 12, 28].includes(totalSubtopics)) {
      assessmentType = "quiz";
    } else if ([8, 16, 24].includes(totalSubtopics)) {
      assessmentType = "exercise";
    } else if ([20, 32].includes(totalSubtopics)) {
      assessmentType = "project";
    }

    if (assessmentType) {
      // Check if this specific assessment hasn't been shown before
      const assessmentKey = `${assessmentType}-${totalSubtopics}`;
      const hasShownAssessment = localStorage.getItem(assessmentKey);
      
      if (!hasShownAssessment) {
        setAssessmentPopup(assessmentType);
        prepareAssessmentData(assessmentType, curriculum);
        localStorage.setItem(assessmentKey, "true");
      }
    }
  }, [curriculum, messages, assessmentCompleted]);
 
  // Parse curriculum from AI response

  const parseCurriculum = (text) => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    const topics = [];
    const subtopics = {};
    let currentTopic = null;
  
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Match topic lines (starting with number)
      if (/^\d+\./.test(line)) {
        // Clean the topic text
        currentTopic = line.replace(/^\d+\.\s*/, '').trim();
        if (currentTopic) {
          topics.push(currentTopic);
          subtopics[currentTopic] = [];
          
          // Look ahead for subtopics
          let j = i + 1;
          while (j < lines.length && /^[a-z]\./.test(lines[j])) {
            const subtopic = lines[j].replace(/^[a-z]\.\s*/, '').trim();
            if (subtopic) {
              subtopics[currentTopic].push(subtopic);
            }
            j++;
          }
        }
      }
    }
  
    // Validate that we have both topics and subtopics
    const isValid = topics.length > 0 && 
                    topics.every(topic => subtopics[topic] && subtopics[topic].length > 0);
    
    if (!isValid) {
      console.error("Invalid curriculum structure:", { topics, subtopics });
      throw new Error("Failed to parse curriculum - invalid structure");
    }
  
    return { topics, subtopics };
  };

  // Generate curriculum
  const generateCurriculum = async (subject) => {
    const prompt = `Generate a comprehensive curriculum for ${subject} with 8 main topics and 4 subtopics each.
     covering only the most essential technical concepts and practical skills. Focus on current industry-relevant topics and hands-on technical content.
     Format each topic as "1. Topic Name" and subtopics as "a. Subtopic Name"`;

    try {
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      });

      const { topics, subtopics } = parseCurriculum(response.content[0].text);

      setCurriculum({
        subject,
        topics,
        subtopics,
        currentTopicIndex: 0,
        currentSubtopicIndex: 0,
        hasStarted: false,
      });
      console.log("Curriculum", curriculum);
      return response.content[0].text;
    } catch (error) {
      console.error("Error generating curriculum:", error);
      throw error;
    }
  };

  // Generate lesson content
  const generateLesson = async (topic, subtopic) => {
    const prompt = `As an expert tutor, create a detailed notes for ${subtopic} within ${topic}. Include:

    1. Clear explanations of different concepts in ${subtopic}
    2. Real-world applications
    3. Make the lesson practical`;

    try {
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      });
      return response.content[0].text;
    } catch (error) {
      console.error("Error generating lesson:", error);
      throw error;
    }
  };

  // Handle get started / next

  const handleNext = async () => {
    setIsNextLoading(true);
  
    try {
      if (!curriculum.hasStarted) {
        setCurriculum((prev) => ({ ...prev, hasStarted: true }));
      } else {
        if (curriculum.currentSubtopicIndex < 3) {
          setCurriculum((prev) => ({
            ...prev,
            currentSubtopicIndex: prev.currentSubtopicIndex + 1,
          }));
        } else if (curriculum.currentTopicIndex < 7) {
          setCurriculum((prev) => ({
            ...prev,
            currentTopicIndex: prev.currentTopicIndex + 1,
            currentSubtopicIndex: 0,
          }));
        } else {
          setMessages((prev) => [
            ...prev,
            {
              type: "bot",
              content: "Congratulations! You've completed the curriculum!",
              id: `bot-${Date.now()}`,
            },
          ]);
          setIsNextLoading(false);
          return;
        }
      }
  
      const topic = curriculum.topics[curriculum.currentTopicIndex];
      const subtopics = curriculum.subtopics[topic];
      
      if (!topic || !subtopics || !subtopics[curriculum.currentSubtopicIndex]) {
        throw new Error(`Invalid curriculum state: ${JSON.stringify({
          topic,
          subtopicsExist: !!subtopics,
          currentIndex: curriculum.currentSubtopicIndex
        })}`);
      }
  
      const subtopic = subtopics[curriculum.currentSubtopicIndex];
      const lessonContent = await generateLesson(topic, subtopic);
      
      setMessages((prev) => [
        ...prev,
        {
          type: "bot",
          content: `${topic} - ${subtopic}\n\n${lessonContent}`,
          id: `bot-${Date.now()}`,
          showControls: true,
        },
      ]);
    } catch (error) {
      console.error("Error in handleNext:", error);
      setMessages((prev) => [
        ...prev,
        {
          type: "bot",
          content: "Sorry, an error occurred. Please try refreshing the page.",
          id: `bot-error-${Date.now()}`,
        },
      ]);
    }
  
    setIsNextLoading(false);
  };
  // Check if question is on topic
  const isQuestionRelated = (question) => {
    if (!curriculum.subject) return true;

    const keywords = [
      curriculum.subject,
      curriculum.topics[curriculum.currentTopicIndex],
      curriculum.subtopics[curriculum.topics[curriculum.currentTopicIndex]][
        curriculum.currentSubtopicIndex
      ],
    ].map((k) => k.toLowerCase());

    return keywords.some((k) => question.toLowerCase().includes(k));
  };

  // Handle message send
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setMessages((prev) => [
      ...prev,
      { type: "user", content: userMessage, id: `user-${Date.now()}` },
    ]);
    setInput("");
    setIsLoading(true);

    try {
      // Check for greetings
      if (/^(hi|hello|hey|greetings|good (morning|afternoon|evening)|sup|yo|howdy|hi there|what('s| is) up|how('s| is) it going|hola|bonjour|namaste)/i.test(userMessage.trim())) {
        setMessages((prev) => [
          ...prev,
          {
            type: "bot",
            content: "Hello! How can I help you with your learning today?",
            id: `bot-${Date.now()}`,
          },
        ]);
        setIsLoading(false);
        return;
      }

      // If no curriculum exists, generate one
      if (!curriculum.subject) {
        const curriculumText = await generateCurriculum(userMessage);
        setMessages((prev) => [
          ...prev,
          {
            type: "bot",
            content: `Here's your curriculum for ${userMessage}:\n\n${curriculumText}\n\nClick "Get Started" to begin learning!`,
            id: `bot-${Date.now()}`,
            showControls: true,
          },
        ]);

        // Update chat history
        const newChat = {
          id: currentChatId,
          title: userMessage,
          timestamp: Date.now(),
        };
        setChatHistory((prev) => [newChat, ...prev]);
      }
      // Handle questions
      else if (userMessage.includes("?")) {
        if (!isQuestionRelated(userMessage)) {
          setNewChatPopup({ question: userMessage });
        } else {
          const response = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 1000,
            messages: [
              {
                role: "user",
                content: `Based on the topic "${
                  curriculum.topics[curriculum.currentTopicIndex]
                }" and subtopic "${
                  curriculum.subtopics[
                    curriculum.topics[curriculum.currentTopicIndex]
                  ][curriculum.currentSubtopicIndex]
                }", answer this question: ${userMessage}`,
              },
            ],
          });
          setMessages((prev) => [
            ...prev,
            {
              type: "bot",
              content: response.content[0].text,
              id: `bot-${Date.now()}`,
            },
          ]);
        }
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          type: "bot",
          content: "Sorry, I encountered an error. Please try again.",
          id: `bot-error-${Date.now()}`,
        },
      ]);
    }

    setIsLoading(false);
  };

  // Chat management functions
  const createNewChat = () => {
    clearChatData();
    const newChatId = `chat-${Date.now()}`;
    setCurrentChatId(newChatId);
    setCurriculum({
      subject: null,
      topics: [],
      subtopics: {},
      currentTopicIndex: 0,
      currentSubtopicIndex: 0,
      hasStarted: false,
    });
    setMessages([
      {
        type: "bot",
        content: "Hi! I'm your AI tutor. What would you like to learn today?",
        id: "initial",
      },
    ]);
    setAssessmentData({});
    setAssessmentCompleted(false);
  };

  // Handle assessment navigation
  const prepareAssessmentData = (type, currentCurriculum) => {
    const coveredTopics = [];
    const coveredSubtopics = {};
  
    for (let i = 0; i <= currentCurriculum.currentTopicIndex; i++) {
      const topic = currentCurriculum.topics[i];
      coveredTopics.push(topic);
      
      // Initialize the array for the current topic
      coveredSubtopics[topic] = [];
  
      // Determine the maximum subtopic index to include
      const maxSubtopicIndex =
        i === currentCurriculum.currentTopicIndex
          ? currentCurriculum.currentSubtopicIndex
          : 3;
  
      // Push each covered subtopic into the array
      for (let j = 0; j <= maxSubtopicIndex; j++) {
        coveredSubtopics[topic].push(currentCurriculum.subtopics[topic][j]);
      }
    }
  
    setAssessmentData({
      type,
      subject: currentCurriculum.subject,
      coveredTopics,
      coveredSubtopics,
      timestamp: Date.now(),
    });
  };
  


  const handleAssessmentConfirm = () => {
    const currentAssessment = assessmentPopup;
    setAssessmentPopup(null);
    
    // Don't set as completed until they actually complete the assessment
    localStorage.setItem("assessmentPopup", "false");
    
    const route = `/quiz?assessmentType=${currentAssessment}`;
    navigate(route, {
      state: {
        assessmentData,
        returnPath: location.pathname,
      },
    });
  };
  const clearChatData = () => {
    localStorage.removeItem("currentMessages");
    localStorage.removeItem("curriculum");
    localStorage.removeItem("currentChatId");
    localStorage.removeItem("assessmentData");
  };

  return (
    <div className="md:flex sm:flex-grow h-screen bg-slate-10 font-lato">
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden fixed top-4 right-4 z-50 p-2 bg-gray-900 text-white rounded-lg"
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Chat history sidebar */}
      <div
        className={`${
          isMobileMenuOpen ? "fixed inset-0 z-40" : "hidden"
        } md:relative md:flex md:w-64 bg-gray-900 p-4 flex-col`}
      >
        <button
          onClick={createNewChat}
          className="text-white bg-black rounded-lg p-3 flex items-center gap-2 w-full hover:bg-black transition-colors mb-4"
        >
          <MessageCircle size={20} />
          <span>New Chat</span>
        </button>

        <div className="flex-1 overflow-y-auto">
          {chatHistory.map((chat) => (
            <div
              key={chat.id}
              className="flex items-center justify-between p-2 text-gray-300 hover:bg-gray-800 rounded-lg"
            >
              <span className="truncate">{chat.title}</span>
              <button
                onClick={() => {
                  setChatHistory((prev) =>
                    prev.filter((c) => c.id !== chat.id)
                  );
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto px-4 py-8">
          <div className="max-w-3xl mx-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`mb-4 ${message.type === "bot" ? "mr-8" : "ml-8"}`}
              >
                <div
                  className={`rounded-2xl p-4 ${
                    message.type === "bot"
                      ? "bg-white shadow-sm"
                      : "bg-gray-500 text-white"
                  }`}
                >
                  <FormattedMessage content={message.content} />
                  {message.showControls && (
                    <button
                      onClick={handleNext}
                      disabled={isNextLoading} // Optionally disable the button while loading
                      className="mt-4 flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800"
                    >
                      {isNextLoading ? (
                        <CircularProgress size={20} color="inherit" />
                      ) : (
                        <>
                          {curriculum.hasStarted ? "Next" : "Get Started"}
                          <ArrowRight />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="mb-4 mr-8">
                <div className="rounded-2xl p-4 bg-white shadow-sm">
                  <CircularProgress size={20} />
                </div>
              </div>
            )}
            <div ref={messagesRef} />
          </div>
        </div>

        {/* Input area */}
        <div className="border-t bg-white p-4">
          <div className="max-w-3xl mx-auto relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type your message..."
              className="w-full p-4 pr-12 rounded-lg border border-gray-300 focus:outline-none focus:border-gray-900"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-blue-600 disabled:opacity-50"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
      {/* Assessment popup */}
      {assessmentPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h2 className="text-xl font-bold mb-4">
              {assessmentPopup === "quiz"
                ? "Quiz Available!"
                : assessmentPopup === "exercise"
                ? "Exercises Available!"
                : "Project Available!"}
            </h2>
            <p className="mb-4">
              You have completed enough topics to start the {assessmentPopup}.
              Click below to proceed.
            </p>
            <div className="flex justify-end">
              <button
                onClick={handleAssessmentConfirm}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New chat popup for off-topic questions */}
      {newChatPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h2 className="text-xl font-bold mb-4">New Subject Detected</h2>
            <p className="mb-4">
              Your question: <em>"{newChatPopup.question}"</em> appears to be on
              a different subject. Would you like to start a new chat for this
              subject?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setNewChatPopup(null)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  createNewChat();
                  setInput(newChatPopup.question);
                  setNewChatPopup(null);
                  handleSend();
                }}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Start New Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
