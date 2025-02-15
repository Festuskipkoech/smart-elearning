// Chatbot.jsx
import React, { useState, useRef, useEffect } from "react";
import {
  MessageCircle,
  Send,
  Menu,
  X,
  Trash2,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import { Anthropic } from '@anthropic-ai/sdk';
import CircularProgress from '@mui/material/CircularProgress';
import { API_KEY } from "../api.js"; // Make sure your API_KEY is exported from here
import { FormattedMessage } from "./format.js";
import { useNavigate } from "react-router-dom";

// Initialize the Anthropic client (or any other generative AI client you prefer)
const anthropic = new Anthropic({ apiKey: API_KEY, dangerouslyAllowBrowser: true });

export default function Chatbot() {
  // Chat and UI states
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(() => {
    const saved = localStorage.getItem("currentProgress");
    return saved ? JSON.parse(saved) : null;
  });
  const [chatHistory, setChatHistory] = useState(() => {
    const saved = localStorage.getItem("chatHistory");
    return saved ? JSON.parse(saved) : [];
  });
  const [currentChatId, setCurrentChatId] = useState(() => {
    const saved = localStorage.getItem("currentChatId");
    return saved || `chat-${Date.now()}`;
  });
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem(`messages-${currentChatId}`);
    return saved
      ? JSON.parse(saved)
      : [
          {
            type: "bot",
            content: "Hi! I'm your AI tutor. What would you like to learn today?",
            id: "initial",
          },
        ];
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // For scrolling, input focus, etc.
  const messagesRef = useRef(null);
  const responseIdRef = useRef(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Assessment popup state
  const [assessmentPopup, setAssessmentPopup] = useState(null);
  const [isNextLoading, setIsNextLoading] = useState(false);
  const [isRedoLoading, setIsRedoLoading] = useState(false);

  // NEW: Off-topic question modal state
  const [newChatPopup, setNewChatPopup] = useState(null);

  const [quizzesTaken, setQuizzesTaken] = useState([]);
  const [exercisesTaken, setExercisesTaken] = useState([]);
  const [projectsTaken, setProjectsTaken] = useState([]);


  // ---------------- Persist State to localStorage ----------------
  useEffect(() => {
    if (currentProgress) {
      localStorage.setItem("currentProgress", JSON.stringify(currentProgress));
    }
  }, [currentProgress]);

  useEffect(() => {
    localStorage.setItem("chatHistory", JSON.stringify(chatHistory));
  }, [chatHistory]);

  useEffect(() => {
    localStorage.setItem("currentChatId", currentChatId);
  }, [currentChatId]);

  useEffect(() => {
    localStorage.setItem(`messages-${currentChatId}`, JSON.stringify(messages));
  }, [messages, currentChatId]);

  useEffect(() => {
    messagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ---------------- Input Focus/Blur Handlers ----------------
  const handleInputFocus = () => {
    if (window.innerWidth <= 768) {
      setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 100);
    }
  };
  const handleInputBlur = () => {
    if (window.innerWidth <= 768) {
      inputRef.current?.blur();
    }
  };

  // ---------------- Keyboard Handler ----------------
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  // ---------------- Mobile Menu & Chat History Functions ----------------
  const toggleMobileMenu = () => setIsMobileMenuOpen((prev) => !prev);
  const createNewChat = () => {
    const newChatId = `chat-${Date.now()}`;
    const newChat = { id: newChatId, title: "New Chat", timestamp: Date.now() };
    setChatHistory((prev) => [newChat, ...prev]);
    setCurrentChatId(newChatId);
    setMessages([
      {
        type: "bot",
        content: "Hello! I'm your AI assistant. How can I help you today?",
        id: "initial",
      },
    ]);
    // Reset current progress when starting a new chat
    setCurrentProgress(null);
  };
  const loadChat = (chatId) => {
    const saved = localStorage.getItem(`messages-${chatId}`);
    if (saved) {
      setMessages(JSON.parse(saved));
      setCurrentChatId(chatId);
      setIsMobileMenuOpen(false);
    }
  };
  const deleteChat = (chatId, e) => {
    e.stopPropagation();
    setChatHistory((prev) => prev.filter((chat) => chat.id !== chatId));
    localStorage.removeItem(`messages-${chatId}`);
    if (currentChatId === chatId) createNewChat();
  };
  const updateChatTitle = (chatId) => {
    setChatHistory((prev) =>
      prev.map((chat) => {
        if (chat.id === chatId) {
          const msgs = JSON.parse(localStorage.getItem(`messages-${chatId}`) || "[]");
          const firstUser = msgs.find((m) => m.type === "user");
          const title = firstUser
            ? firstUser.content.slice(0, 30) + (firstUser.content.length > 30 ? "..." : "")
            : "New Chat";
          return { ...chat, title };
        }
        return chat;
      })
    );
  };

  // ---------------- Curriculum Generation ----------------
  // Parse the curriculum text to extract topics and subtopics.
  // Also, if a topic has no subtopics, add a default subtopic "Overview"

  const parseCurriculum = (curriculumText) => {
    const lines = curriculumText.split("\n");
    const topics = [];
    const subtopics = {};
    let currentTopic = null;
    
    lines.forEach((line) => {
      // Look for main topics formatted as "1. Topic Name"
      if (/^\d+\.\s/.test(line)) {
        currentTopic = line.replace(/^\d+\.\s/, "").trim();
        topics.push(currentTopic);
        subtopics[currentTopic] = [];
      } 
      // Look for subtopics formatted as "a. Subtopic" or "1.1 Subtopic"
      else if (currentTopic && (/^[a-h]\.\s/.test(line) || /^\d+\.\d+\s/.test(line))) {
        const subtopic = line.replace(/^[a-h]\.\s|^\d+\.\d+\s/, "").trim();
        subtopics[currentTopic].push(subtopic);
      }
    });
    
    // Ensure every topic has at least one valid subtopic; if not, default to "Overview"
    topics.forEach((topic) => {
      if (!subtopics[topic] || subtopics[topic].length === 0 || !subtopics[topic][0].trim()) {
        subtopics[topic] = ["Overview"];
      }
    });
    
    console.log("Parsed Topics:", topics);
    console.log("Parsed Subtopics:", subtopics);
    return { topics, subtopics };
  };
  
  // Generates a curriculum based on the subject input by the user.

  const [curriculumDetails, setCurriculumDetails] = useState({
    subject: null,
    topics: [],
    subtopics: {},
    currentTopicIndex: 0,
    currentSubtopicIndex: 0,
    completed: [],
  });

  // Modified curriculum generation
  const generateCurriculum = async (subject) => {
    const curriculumPrompt = `Generate a comprehensive and practical curriculum for ${subject} with:
8 main topics that progress logically
4 detailed subtopics for each main topic
Each subtopic should include:
- Detailed explanation
- Real-world examples
- Practical applications
Focus on industry relevance and comprehensive learning`;

    try {
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4000,
        messages: [{ role: "user", content: curriculumPrompt }],
      });

      const curriculumText = response.content[0].text;
      const parsedCurriculum = parseCurriculum(curriculumText);

      const curriculumData = {
        subject,
        topics: parsedCurriculum.topics,
        subtopics: parsedCurriculum.subtopics,
        currentTopicIndex: 0,
        currentSubtopicIndex: 0,
        completed: [],
        timestamp: Date.now(),
      };

      localStorage.setItem(`curriculum-${currentChatId}`, JSON.stringify(curriculumData));
      setCurriculumDetails(curriculumData);
      return curriculumText;
    } catch (error) {
      console.error("Error generating curriculum:", error);
      throw error;
    }
  };

  // Modified assessment logic
  const checkAssessment = () => {
    const totalCompleted = curriculumState.totalSubtopicsCompleted;
    
    // Quiz checks (after 4th, 12th, 20th, and 28th subtopics)
    if ([4, 12, 20, 28].includes(totalCompleted) && !quizzesTaken.includes(totalCompleted)) {
      setAssessmentPopup({
        type: 'quiz',
        subtopicRange: curriculumState.completedSubtopics.slice(-4)
      });
      return true;
    }
    
    // Exercise checks (after 8th, 16th, and 24th subtopics)
    if ([8, 16, 24].includes(totalCompleted) && !exercisesTaken.includes(totalCompleted)) {
      setAssessmentPopup({
        type: 'exercise',
        subtopicRange: curriculumState.completedSubtopics.slice(-4)
      });
      return true;
    }
    
    // Project checks (after 20th and 32nd subtopics)
    if ([20, 32].includes(totalCompleted) && !projectsTaken.includes(totalCompleted)) {
      setAssessmentPopup({
        type: 'project',
        subtopicRange: curriculumState.completedSubtopics.slice(-4)
      });
      return true;
    }
    
    return false;
  };


  // Modified next handler to incorporate assessment logic
 
  const handleNext = async () => {
    setIsNextLoading(true);
    try {
      let { currentTopicIndex, currentSubtopicIndex, topics, subtopics } = curriculumState;
      
      // Calculate next indices
      let newSubtopicIndex = currentSubtopicIndex + 1;
      let newTopicIndex = currentTopicIndex;
      
      if (newSubtopicIndex >= 4) {
        newSubtopicIndex = 0;
        newTopicIndex++;
      }
      
      // Update completed subtopics
      const newCompletedSubtopics = [
        ...curriculumState.completedSubtopics,
        `${currentTopicIndex}-${currentSubtopicIndex}`
      ];
      
      const newTotalCompleted = curriculumState.totalSubtopicsCompleted + 1;
      
      // Update curriculum state
      setCurriculumState(prev => ({
        ...prev,
        currentTopicIndex: newTopicIndex,
        currentSubtopicIndex: newSubtopicIndex,
        completedSubtopics: newCompletedSubtopics,
        totalSubtopicsCompleted: newTotalCompleted
      }));
      
      // Check for assessment before proceeding
      if (checkAssessment()) {
        setIsNextLoading(false);
        return;
      }
      
      // Generate next lesson
      if (newTopicIndex < topics.length) {
        const currentTopic = topics[newTopicIndex];
        const currentSubtopic = subtopics[currentTopic][newSubtopicIndex];
        const lessonContent = await generateLessonContent(currentTopic, currentSubtopic);
        
        setMessages(prev => [...prev, {
          type: "bot",
          content: `Topic: ${currentTopic}\nSubtopic: ${currentSubtopic}\n\n${lessonContent}`,
          id: `bot-${Date.now()}`,
          showControls: true
        }]);
      }
    } catch (error) {
      console.error("Error in handleNext:", error);
    } finally {
      setIsNextLoading(false);
    }
  };


  // ---------------- Lesson Generation ----------------
  // Generates detailed lesson content for a given topic and subtopic.
  const generateLessonContent = async (topic, subtopic) => {
    // If subtopic is undefined, use a default value.
    const safeSubtopic = (subtopic && subtopic.trim().length > 0) ? subtopic : "Overview";
    const lessonPrompt = `You are an expert tutor renowned for delivering insightful and detailed lessons. For the topic "${topic}" specifically about "${safeSubtopic}", create an in-depth lesson that meets the following criteria:

    1. **Define Key Concepts and Terminologies:**  
       - Provide clear, comprehensive definitions for all technical terms.  
       - Explain underlying ideas using vivid real-world analogies and intuitive examples.
    
    2. **Structured Content Breakdown:**  
       Organize the lesson into well-defined sections. Include, at a minimum:
       - **Detailed Notes with Analogies:** Explain each concept with vivid analogies and relatable scenarios.
       - **Step-by-Step Examples:** Present sequential examples that demonstrate how the concept is applied in real-life situations.
       - **Common Pitfalls and Solutions:** Identify frequent mistakes or misconceptions, and offer strategies to overcome them.
       - **Real-World Applications:** Describe how the concept is applied across various industries or daily life scenarios.
    
    3. **Explanatory Depth and Engagement:**  
       - Dive deep into the reasoning behind each concept. Explain not just what a concept is, but why it matters and how it works in practice.
       - Integrate 2-3 reflective questions or mini-quizzes throughout the lesson to encourage the student to engage actively with the material.
       - Where relevant, suggest diagrams, flowcharts, or visual aids that can help clarify complex ideas.
    
    4. **Key Takeaways Summary:**  
       - Conclude with a concise summary that reinforces the most critical points, ensuring that the student can recall the essential information easily.
    
    5. **Practical Application Tips and Further Exploration:**  
       - Provide actionable, step-by-step tips or strategies that the student can implement to master and apply the concept effectively.  
       - Include a brief real-life case study or scenario that demonstrates successful application of the concept.
       - End with a 'Further Exploration' section suggesting additional resources or research questions for students who wish to learn more.
    
    Ensure that your lesson is engaging, logically structured, and tailored to facilitate both theoretical understanding and practical application. Use bullet points or numbered lists where appropriate for clarity.`;
    
    
    
    try {
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 3000,
        messages: [{ role: "user", content: lessonPrompt }],
      });
      return response.content[0].text;
    } catch (error) {
      console.error("Error generating lesson content:", error);
      throw error;
    }
  };

  // ---------------- Navigation Handlers (Redo / Next) ----------------
  // The Redo button regenerates the current lesson with alternate examples.
  const handleRedo = async () => {
    setIsRedoLoading(true);
    if (!currentProgress) return;
    const curriculum = JSON.parse(localStorage.getItem(`curriculum-${currentChatId}`));
    if (!curriculum) return;
    const { currentTopicIndex, currentSubtopicIndex, topics, subtopics } = curriculum;
    const currentTopic = topics[currentTopicIndex];
    const currentSubtopic = subtopics[currentTopic][currentSubtopicIndex] || "Overview";
    try {
      const lessonContent = await generateLessonContent(currentTopic, currentSubtopic);
      setMessages((prev) => [
        ...prev,
        {
          type: "bot",
          content: `Subtopic: ${currentSubtopic}\n(Topic: ${currentTopic})\n\nLet's review with different examples:\n\n${lessonContent}`,
          id: `bot-${Date.now()}`,
          showControls: true,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          type: "bot",
          content: "Sorry, I encountered an error generating the lesson. Please try again.",
          id: `bot-error-${Date.now()}`,
        },
      ]);
    }
    setIsRedoLoading(false);
  };
  
  // The Next button advances to the next subtopic or topic and generates the corresponding lesson.

  // ---------------- Off-Topic Question Check ----------------
  // Checks if a question from the student is off-topic compared to the current curriculum.
  const isQuestionOffTopic = (userInput, curriculum) => {
    if (!userInput.includes("?")) return false; // Not a question
    const subject = curriculum.subject.toLowerCase();
    const currentTopic = curriculum.topics[curriculum.currentTopicIndex].toLowerCase();
    const currentSubtopic =
      curriculum.subtopics[curriculum.topics[curriculum.currentTopicIndex]][curriculum.currentSubtopicIndex];
    const lowerInput = userInput.toLowerCase();
    // If the question does not mention the subject, current topic, or subtopic, consider it off-topic.
    if (
      !lowerInput.includes(subject) &&
      !lowerInput.includes(currentTopic) &&
      !lowerInput.includes(currentSubtopic?.toLowerCase() || "")
    ) {
      return true;
    }
    return false;
  };

  // ---------------- Handle User Response ----------------
  // If no curriculum exists, generate one using the user’s subject input.
  // Otherwise, resume from the saved curriculum or answer a question.
  const handleResponse = async (userInput) => {
    try {
      const existing = localStorage.getItem(`curriculum-${currentChatId}`);
      if (!existing) {
        // Generate a new curriculum based on user input (subject)
        const curriculum = await generateCurriculum(userInput);
        const parsed = parseCurriculum(curriculum);
        setMessages((prev) => [
          ...prev,
          {
            type: "bot",
            content:
              curriculum +
              "\n\nHere are the topics in your curriculum:\n" +
              parsed.topics.join("\n"),
            id: `bot-${Date.now()}`,
            showControls: true,
          },
        ]);
      } else {
        // Resume from an existing curriculum
        const curriculumData = JSON.parse(existing);
        setCurrentProgress(curriculumData);
        // If the input is a follow-up question related to the current lesson, simply answer it.
        // Otherwise, if it is off-topic, the off-topic modal should have already been triggered.
        const currentTopic = curriculumData.topics[curriculumData.currentTopicIndex];
        const currentSubtopic =
          curriculumData.subtopics[currentTopic][curriculumData.currentSubtopicIndex] || "Overview";
        const followUpAnswer = `You asked: "${userInput}"\n\n(Here is an answer based on the current lesson on "${currentSubtopic}" in "${currentTopic}")`;
        setMessages((prev) => [
          ...prev,
          {
            type: "bot",
            content: followUpAnswer,
            id: `bot-${Date.now()}`,
            showControls: true,
          },
        ]);
      }
    } catch (error) {
      console.error("Error handling response:", error);
      setMessages((prev) => [
        ...prev,
        {
          type: "bot",
          content: "I encountered an error. Please try again.",
          id: `bot-error-${Date.now()}`,
        },
      ]);
    }
  };

  // ---------------- Handle Send ----------------
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    const messageId = `user-${responseIdRef.current}`;
    handleInputBlur();
    setMessages((prev) => [
      ...prev,
      { type: "user", content: userMessage, id: messageId },
    ]);
    setInput("");
    
    // If a curriculum exists and the input is a question that is off-topic, show the off-topic modal.
    if (currentProgress && isQuestionOffTopic(userMessage, currentProgress)) {
      setNewChatPopup({ question: userMessage });
      return;
    }
    
    setIsLoading(true);
    try {
      await handleResponse(userMessage);
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          type: "bot",
          content: "Sorry, I encountered an error. Please try again.",
          id: `error-${responseIdRef.current}`,
        },
      ]);
    } finally {
      setIsLoading(false);
      messagesRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Handler for confirming an off-topic question to start a new chat.
  const confirmNewChat = async () => {
    const question = newChatPopup.question;
    setNewChatPopup(null);
    createNewChat();
    // Use the new question as the new subject input.
    await handleResponse(question);
  };

  // ---------------- Automatically Show Assessment Popup ----------------
  useEffect(() => {
    if (currentProgress) {
      // Use currentTopicIndex as a measure for topics completed.
      const topicsCompleted = currentProgress.currentTopicIndex;
      // Thresholds: quiz after 2 topics, exercises after 4 topics, project after 6 topics.
      if (topicsCompleted >= 2 && !localStorage.getItem("quizTaken")) {
        setAssessmentPopup("quiz");
      } else if (topicsCompleted >= 4 && !localStorage.getItem("exercisesTaken")) {
        setAssessmentPopup("exercise");
      } else if (topicsCompleted >= 6 && !localStorage.getItem("projectTaken")) {
        setAssessmentPopup("project");
      } else {
        setAssessmentPopup(null);
      }
    }
  }, [currentProgress]);

  const openQuiz = () => {
    window.open(`/quiz?assessmentType=${assessmentPopup}`, '_self');
  };
  // When the user confirms the popup, mark the assessment as taken and navigate.
 
  const handleAssessmentConfirm = () => {
    const { type, subtopicRange } = assessmentPopup;
    
    switch (type) {
      case 'quiz':
        setQuizzesTaken(prev => [...prev, curriculumState.totalSubtopicsCompleted]);
        break;
      case 'exercise':
        setExercisesTaken(prev => [...prev, curriculumState.totalSubtopicsCompleted]);
        break;
      case 'project':
        setProjectsTaken(prev => [...prev, curriculumState.totalSubtopicsCompleted]);
        break;
    }
    
    // Navigate to assessment with context
    navigate(`/assessment?type=${type}&subtopics=${subtopicRange.join(',')}`);
    setAssessmentPopup(null);
  };


  // ---------------- Render Chat Message ----------------
  const renderMessage = (message) => (
    <div
      key={message.id}
      className={`mb-4 ${message.type === "bot" ? "mr-8 md:mr-12" : "ml-8 md:ml-12"}`}
    >
      <div
        className={`rounded-2xl p-3 md:p-4 ${
          message.type === "bot" ? "bg-white shadow-sm" : "bg-gray-500 text-white-100"
        }`}
      >
        <div>
          <FormattedMessage content={message.content} />
        </div>
        {message.showControls && (
          <div className="mt-4 flex gap-4">
            <button
              onClick={handleNext}
              disabled={isNextLoading}
              className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800"
            >
              {isNextLoading ? <CircularProgress size={20} color="white"/> : <ArrowRight />}
              Next
            </button>
            <button
              onClick={handleRedo}
              disabled={isRedoLoading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              {isRedoLoading ? <CircularProgress size={20}  color="white"/> : <RotateCcw /> }
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // ---------------- Render Component ----------------
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
          isMobileMenuOpen ? "fixed inset-0 z-40" : "hidden"
        } md:relative md:flex md:w-64 bg-gray-900 p-4 flex-col transition-all duration-300 ease-in-out`}
      >
        <div className="mb-4">
          <div className="flex items-center gap-2 text-white mb-2">
            <MessageCircle size={24} />
            <span className="text-lg font-semibold">Chat Assistant</span>
          </div>
        </div>
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
                <button onClick={(e) => deleteChat(chat.id, e)} className="p-1 hover:text-red-500">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 sm:overflow-y-auto sm:px-2 md:px-4 py-6 md:py-8">
          <div className="max-w-3xl mx-auto">
            {messages.map(renderMessage)}
            {isLoading && (
              <div className="mb-4 mr-8 md:mr-12">
                <div className="rounded-2xl p-3 md:p-4 bg-white shadow-sm">
                  <span className="text-gray-600">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesRef} />
          </div>
        </div>

        {/* Input Area */}
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

      {/* Assessment Popup Modal */}
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
              You have completed enough topics to start the {assessmentPopup}. Click below to proceed.
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

      {/* Off-topic New Chat Modal */}
      {newChatPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h2 className="text-xl font-bold mb-4">New Subject Detected</h2>
            <p className="mb-4">
              Your question: <em>"{newChatPopup.question}"</em> appears to be on a different subject. Would you like to start a new chat for this subject?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setNewChatPopup(null)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmNewChat}
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