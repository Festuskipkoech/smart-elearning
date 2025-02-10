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
import { Anthropic } from "@anthropic-ai/sdk";
import CircularProgress from "@mui/material/CircularProgress";
import { API_KEY } from "../api.js"; // Ensure your API_KEY is exported from here
import { FormattedMessage } from "./format.js";
import { useNavigate } from "react-router-dom";

// Initialize the Anthropic client
const anthropic = new Anthropic({ apiKey: API_KEY, dangerouslyAllowBrowser: true });

export default function Chatbot() {
  // Chat and UI states
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(null); // holds curriculum and progress (not stored locally)
  const [chatHistory, setChatHistory] = useState(() => {
    const saved = localStorage.getItem("chatHistory");
    return saved ? JSON.parse(saved) : [];
  });
  const [currentChatId, setCurrentChatId] = useState(() => {
    const saved = localStorage.getItem("currentChatId");
    return saved || `chat-${Date.now()}`;
  });
  const [assessmentQueue, setAssessmentQueue] = useState([]); 
  const [isTyping, setIsTyping] = useState(false);
  const [currentChunk, setCurrentChunk] = useState("");
  const typingSpeed = 10;
  
  // Determine if a message is just a greeting.
  const isGreeting = (message) => {
    const greetings = [
      "hi", "hello", "hey", "good morning", "good afternoon",
      "good evening", "howdy", "hi there", "hello there", "greetings",
      "hola", "bonjour", "sup", "what's up", "yo", "morning", "evening",
    ];
    const lowercaseMessage = message.toLowerCase().trim();
    return greetings.some(
      (greeting) =>
        lowercaseMessage === greeting ||
        lowercaseMessage.startsWith(`${greeting} `) ||
        lowercaseMessage.endsWith(` ${greeting}`)
    );
  };

  // Generate a greeting response.
  const generateGreetingResponse = () => {
    const hours = new Date().getHours();
    let timeBasedGreeting;
    if (hours < 12) {
      timeBasedGreeting = "Good morning";
    } else if (hours < 17) {
      timeBasedGreeting = "Good afternoon";
    } else {
      timeBasedGreeting = "Good evening";
    }
    return `${timeBasedGreeting}! I'm your AI tutor. I can help you learn about any subject you're interested in. What would you like to learn about today?`;
  };

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

  // Refs and navigation
  const messagesRef = useRef(null);
  const responseIdRef = useRef(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // ---------------- Persist Chat-Related State ----------------
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

  // ---------------- Input Focus/Blur ----------------
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
    // Reset curriculum progress when starting a new chat
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

  // ---------------- Update Chat Title ----------------
  const updateChatTitle = (chatId) => {
    setChatHistory((prev) =>
      prev.map((chat) => {
        if (chat.id === chatId) {
          const msgs = JSON.parse(localStorage.getItem(`messages-${chatId}`) || "[]");
          const firstNonGreetingUser = msgs.find(
            (m) => m.type === "user" && !isGreeting(m.content)
          );
          const title = firstNonGreetingUser
            ? firstNonGreetingUser.content.slice(0, 30) +
              (firstNonGreetingUser.content.length > 30 ? "..." : "")
            : "New Chat";
          return { ...chat, title };
        }
        return chat;
      })
    );
  };

  // ---------------- Curriculum Generation ----------------
  const parseCurriculum = (curriculumText) => {
    const lines = curriculumText.split("\n");
    const topics = [];
    const subtopics = {};
    let currentTopic = null;

    lines.forEach((line) => {
      // Look for topics formatted as "1. Topic Name"
      if (/^\d+\.\s/.test(line)) {
        currentTopic = line.replace(/^\d+\.\s/, "").trim();
        topics.push(currentTopic);
        subtopics[currentTopic] = [];
      }
      // Look for subtopics formatted as "a. Subtopic" or "1.1 Subtopic"
      else if (currentTopic && (/^[a-d]\.\s/.test(line) || /^\d+\.\d+\s/.test(line))) {
        const subtopic = line.replace(/^[a-d]\.\s|^\d+\.\d+\s/, "").trim();
        subtopics[currentTopic].push(subtopic);
      }
    });

    topics.forEach((topic) => {
      if (!subtopics[topic] || subtopics[topic].length === 0 || !subtopics[topic][0].trim()) {
        subtopics[topic] = ["Overview"];
      }
    });

    console.log("Parsed Topics:", topics);
    console.log("Parsed Subtopics:", subtopics);
    return { topics, subtopics };
  };



  // Modify curriculum generation to create 8 topics with 4 subtopics each

  const [curriculumStructure, setCurriculumStructure] = useState({
    topics: [],
    subtopics: {},
    currentTopicIndex: 0,
    currentSubtopicIndex: 0,
    completed: []
  });
  const [assessmentPopup, setAssessmentPopup] = useState(null);

  const [curriculumDetails, setCurriculumDetails] = useState({
    topics: [],
    subtopics: {},
    currentTopicIndex: 0,
    currentSubtopicIndex: 0,
    completed: []
  });

  const generateCurriculum = async (subject) => {
    const curriculumPrompt = `Generate a comprehensive curriculum for ${subject} with:
- 8 main topics 
- 4 subtopics for each main topic
- Ensure logical progression and depth
- Include practical applications and industry relevance

Format:
1. [Topic 1]
  a. [Subtopic 1.1]
  b. [Subtopic 1.2]
  c. [Subtopic 1.3]
  d. [Subtopic 1.4]
2. [Topic 2]
  ...and so on for 8 topics`;

    try {
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 3000,
        messages: [{ role: "user", content: curriculumPrompt }],
      });

      const curriculumText = response.content[0].text;
      const { topics, subtopics } = parseCurriculum(curriculumText);

      const curriculumData = {
        subject,
        content: curriculumText,
        topics,
        subtopics,
        currentTopicIndex: 0,
        currentSubtopicIndex: 0,
        completed: [],
        timestamp: Date.now(),
      };

      localStorage.setItem(`curriculum-${currentChatId}`, JSON.stringify(curriculumData));
      setCurriculumStructure(curriculumData);
      return curriculumText;
    } catch (error) {
      console.error("Error generating curriculum:", error);
      throw error;
    }
  };

  // Modify assessment logic
  useEffect(() => {
    if (curriculumStructure) {
      const { currentTopicIndex, currentSubtopicIndex } = curriculumStructure;
      const totalSubtopicIndex = (currentTopicIndex * 4) + currentSubtopicIndex;

      // Assessment triggers
      if (totalSubtopicIndex === 3 && !localStorage.getItem("quiz1Taken")) {
        setAssessmentPopup("quiz");
      } else if (totalSubtopicIndex === 11 && !localStorage.getItem("quiz2Taken")) {
        setAssessmentPopup("quiz");
      } else if (totalSubtopicIndex === 19 && !localStorage.getItem("quiz3Taken")) {
        setAssessmentPopup("quiz");
      } else if (totalSubtopicIndex === 27 && !localStorage.getItem("quiz4Taken")) {
        setAssessmentPopup("quiz");
      } 
      // Exercise triggers
      else if (totalSubtopicIndex === 7 && !localStorage.getItem("exercise1Taken")) {
        setAssessmentPopup("exercise");
      } else if (totalSubtopicIndex === 15 && !localStorage.getItem("exercise2Taken")) {
        setAssessmentPopup("exercise");
      } else if (totalSubtopicIndex === 23 && !localStorage.getItem("exercise3Taken")) {
        setAssessmentPopup("exercise");
      }
      // Project trigger
      else if (totalSubtopicIndex === 15 && !localStorage.getItem("projectTaken")) {
        setAssessmentPopup("project");
      } else if (totalSubtopicIndex === 31 && !localStorage.getItem("finalProjectTaken")) {
        setAssessmentPopup("project");
      } else {
        setAssessmentPopup(null);
      }
    }
  }, [curriculumStructure]);

  // Modify handleAssessmentConfirm to use different storage keys



  // ---------------- Lesson Generation ----------------
  const generateLessonContent = async (topic, subtopic) => {
    const safeSubtopic = subtopic && subtopic.trim().length > 0 ? subtopic : "Overview";
    const lessonPrompt = `You are an expert tutor renowned for delivering insightful and detailed lessons. For the topic "${topic}" specifically about "${safeSubtopic}", create an in-depth lesson that includes:
1. Clear definitions of key concepts.
2. Step-by-step examples.
3. Real-world applications.
4. Common pitfalls and how to avoid them.
5. A summary of key takeaways.
Ensure the lesson is well-structured and engaging. Use bullet points or numbered lists where appropriate.`;

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

  // ---------------- Advance to Next Lesson ----------------
  const advanceLesson = async () => {
    if (!currentProgress) return;
    let { currentTopicIndex, currentSubtopicIndex, topics, subtopics } = currentProgress;
    const currentTopic = topics[currentTopicIndex];
    // Determine next lesson indices:
    if (currentSubtopicIndex < subtopics[currentTopic].length - 1) {
      currentSubtopicIndex++;
    } else if (currentTopicIndex < topics.length - 1) {
      currentTopicIndex++;
      currentSubtopicIndex = 0;
    } else {
      setMessages((prev) => [
        ...prev,
        {
          type: "bot",
          content:
            "Congratulations! You've completed the entire curriculum! Would you like to review topics or start a new subject?",
          id: `bot-${Date.now()}`,
        },
      ]);
      return;
    }
    const updatedProgress = {
      ...currentProgress,
      currentTopicIndex,
      currentSubtopicIndex,
      completed: [...currentProgress.completed, `${currentTopicIndex}-${currentSubtopicIndex}`],
    };
    setCurrentProgress(updatedProgress);
    const nextTopic = topics[currentTopicIndex];
    const nextSubtopic = subtopics[nextTopic][currentSubtopicIndex] || "Overview";
    try {
      const lessonContent = await generateLessonContent(nextTopic, nextSubtopic);
      setMessages((prev) => [
        ...prev,
        {
          type: "bot",
          content: `Topic: ${nextTopic}\nSubtopic: ${nextSubtopic}\n\n${lessonContent}`,
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
  };

  // ---------------- Assessment Trigger Check ----------------
  // Based on the lesson just completed (using the current indices before advancing),
  // decide which assessment(s) to trigger.


  const checkAssessment = (topicIndex, subtopicIndex) => {
    const totalSubtopicsPassed = (topicIndex * 4) + subtopicIndex + 1;
    
    if (totalSubtopicsPassed === 16 && !localStorage.getItem("exercisesTaken")) {
      setAssessmentPopup("exercise");
      return true;
    }
    
    if ([4, 12, 20, 28].includes(totalSubtopicsPassed) && !localStorage.getItem("quizTaken")) {
      setAssessmentPopup("quiz");
      return true;
    }
    
    if (totalSubtopicsPassed === 16 && localStorage.getItem("exercisesTaken") && !localStorage.getItem("projectTaken")) {
      setAssessmentPopup("project");
      return true;
    }
    
    return false;
  };

  // Modified next handler to incorporate assessment logic
  const handleNext = async () => {
    const { topics, subtopics, currentTopicIndex, currentSubtopicIndex } = curriculumDetails;
    
    let newTopicIndex = currentTopicIndex;
    let newSubtopicIndex = currentSubtopicIndex;
    
    // Advance subtopic or topic
    if (currentSubtopicIndex < 3) {
      newSubtopicIndex++;
    } else if (currentTopicIndex < 7) {
      newTopicIndex++;
      newSubtopicIndex = 0;
    } else {
      // Curriculum complete
      setMessages(prev => [...prev, {
        type: "bot",
        content: "Congratulations! You've completed the entire curriculum!",
        id: `bot-${Date.now()}`
      }]);
      return;
    }
    
    // Check for assessment before generating next lesson
    const needsAssessment = checkAssessment(newTopicIndex, newSubtopicIndex);
    if (needsAssessment) return;
    
    const nextTopic = topics[newTopicIndex];
    const nextSubtopic = subtopics[nextTopic][newSubtopicIndex];
    
    try {
      const lessonContent = await generateLessonContent(nextTopic, nextSubtopic);
      
      const updatedCurriculum = {
        ...curriculumDetails,
        currentTopicIndex: newTopicIndex,
        currentSubtopicIndex: newSubtopicIndex,
        completed: [...curriculumDetails.completed, `${newTopicIndex}-${newSubtopicIndex}`]
      };
      
      setCurriculumDetails(updatedCurriculum);
      localStorage.setItem(`curriculum-${currentChatId}`, JSON.stringify(updatedCurriculum));
      
      setMessages(prev => [...prev, {
        type: "bot",
        content: `Topic: ${nextTopic}\nSubtopic: ${nextSubtopic}\n\n${lessonContent}`,
        id: `bot-${Date.now()}`,
        showControls: true
      }]);
    } catch (error) {
      console.error("Lesson generation error:", error);
    }
  };


  // ---------------- Assessment Modal Confirm Handler ----------------
  const handleAssessmentConfirm = () => {
    if (assessmentQueue.length === 0) return;
    const currentAssessment = assessmentQueue[0];
    openAssessment(currentAssessment);
    // Remove the first assessment from the queue.
    const newQueue = assessmentQueue.slice(1);
    setAssessmentQueue(newQueue);
    // Once all assessments are handled, advance to the next lesson.
    if (newQueue.length === 0) {
      advanceLesson();
    }
  };

  // ---------------- Unified Assessment Route Opener ----------------
  const openAssessment = (assessmentType) => {
    if (assessmentType === "quiz") {
      window.open(`/quiz?assessmentType=quiz`, "_self");
    } else if (assessmentType === "exercise") {
      window.open(`/exercise?assessmentType=exercise`, "_self");
    } else if (assessmentType === "project") {
      window.open(`/project?assessmentType=project`, "_self");
    }
  };

  // ---------------- Handling Responses ----------------

  // Split text into chunks for smoother display.
  const chunkResponse = (text) => {
    const isTopicResponse = text.includes("Topic:") || text.includes("Subtopic:");
    if (isTopicResponse) {
      return [text];
    }
    let chunks = text.split(/\n\n+/);
    chunks = chunks.flatMap((chunk) => {
      if (chunk.length > 500) {
        return chunk.split(/(?<=[.!?])\s+/).reduce((acc, sentence) => {
          if (!acc.length) return [sentence];
          let lastChunk = acc[acc.length - 1];
          if (lastChunk.length + sentence.length < 500) {
            acc[acc.length - 1] = lastChunk + " " + sentence;
          } else {
            acc.push(sentence);
          }
          return acc;
        }, []);
      }
      return [chunk];
    });
    return chunks.filter((chunk) => chunk.trim().length > 0);
  };

  // Type out and display response chunks.
  const sendResponseChunks = async (chunks, disableControls = false) => {
    let fullContent = "";
    setIsTyping(true);
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      for (let char of chunk) {
        fullContent += char;
        setCurrentChunk(fullContent);
        await new Promise((resolve) => setTimeout(resolve, typingSpeed));
      }
      if (i < chunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
    setIsTyping(false);
    setCurrentChunk("");
    setMessages((prev) => [
      ...prev,
      {
        type: "bot",
        content: fullContent,
        id: `bot-${Date.now()}`,
        showControls: !disableControls,
      },
    ]);
  };

  // Handle a user response.
  const handleResponse = async (userInput) => {
    try {
      if (isGreeting(userInput)) {
        const greetingResponse = generateGreetingResponse();
        const chunks = chunkResponse(greetingResponse);
        await sendResponseChunks(chunks, true);
        return;
      }
      // If no curriculum exists yet, generate one using the user’s subject.
      if (!currentProgress) {
        const curriculum = await generateCurriculum(userInput);
        const chunks = chunkResponse(curriculum);
        await sendResponseChunks(chunks);
      } else {
        // Use the existing curriculum to provide context for the answer.
        const { topics, subtopics } = currentProgress;
        const currentTopic = topics[currentProgress.currentTopicIndex];
        const currentSubtopic =
          subtopics[currentTopic][currentProgress.currentSubtopicIndex] || "Overview";
        try {
          const response = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 2000,
            messages: [
              {
                role: "user",
                content: `Context: We are discussing ${currentTopic}, specifically ${currentSubtopic}.\n\nQuestion: ${userInput}\n\nProvide a clear, well-structured answer with natural breaks between points.`,
              },
            ],
          });
          const chunks = chunkResponse(response.content[0].text);
          await sendResponseChunks(chunks);
        } catch (error) {
          console.error("Error generating response:", error);
          setMessages((prev) => [
            ...prev,
            {
              type: "bot",
              content: "I encountered an error generating a response. Please try again.",
              id: `bot-error-${Date.now()}`,
            },
          ]);
        }
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
    
    if (!isGreeting(userMessage)) {
      updateChatTitle(currentChatId);
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

  // ---------------- Render Chat Message ----------------
  const renderMessage = (message) => (
    <div
      key={message.id}
      className={`mb-4 ${message.type === "bot" ? "mr-8 md:mr-12" : "ml-8 md:ml-12"}`}
    >
      <div
        className={`rounded-2xl p-4 ${
          message.type === "bot"
            ? "bg-white shadow-lg text-white" 
            : "bg-gray-100 text-white"
        }`}
      >
        <div className="text-base">
          <FormattedMessage content={message.content} />
        </div>
        {message.showControls && (
          <div className="mt-6 flex gap-4">
            <button
              onClick={handleNext}
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-2.5 bg-black text-white rounded-lg hover:bg-white hover:text-black transition-colors duration-200 shadow-md disabled:opacity-50"
            >
              {isLoading ? <CircularProgress size={20} className="text-white"/> : <ArrowRight className="w-5 h-5" />}
              Next
            </button>
            <button
              onClick={async () => {
                // Redo the current lesson
                try {
                  const { topics, subtopics } = currentProgress;
                  const currentTopic = topics[currentProgress.currentTopicIndex];
                  const currentSubtopic =
                    subtopics[currentTopic][currentProgress.currentSubtopicIndex] || "Overview";
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
              }}
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-2.5 bg-white text-black rounded-lg hover:bg-black hover:text-white transition-colors duration-200 shadow-md disabled:opacity-50"
            >
              <RotateCcw className="w-5 h-5" />
              Redo
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // Typing indicator component
  const renderTypingIndicator = () => (
    isTyping && (
      <div className="mb-4 mr-8 md:mr-12">
        <div className="rounded-2xl p-4 bg-white shadow-lg text-black">
          <div className="text-base">
            {currentChunk}
            <span className="inline-block w-2 h-4 ml-1 bg-black animate-pulse" />
          </div>
        </div>
      </div>
    )
  );

  // ---------------- Render Component ----------------
  return (
    <div className="md:flex sm:flex-grow h-screen bg-white font-lato">
      <button
        onClick={toggleMobileMenu}
        className="md:hidden fixed top-4 right-4 z-50 p-2 bg-black text-white rounded-lg"
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar with Chat History */}
      <div
        className={`${
          isMobileMenuOpen ? "fixed inset-0 z-40" : "hidden"
        } md:relative md:flex md:w-64 bg-gray-700 p-4 flex-col transition-all duration-300 ease-in-out`}
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
          className="text-white bg-black rounded-lg p-3 flex items-center gap-2 w-full hover:bg-white hover:text-black transition-colors mb-4"
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
                    ? "bg-white text-black"
                    : "bg-black text-white hover:bg-white hover:text-black"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <MessageCircle size={16} />
                  <span className="truncate">{chat.title}</span>
                </div>
                <button onClick={(e) => deleteChat(chat.id, e)} className="p-1 hover:text-black">
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
            {renderTypingIndicator()}
            {isLoading && (
              <div className="mb-4 mr-8 md:mr-12">
                <div className="rounded-2xl p-3 md:p-4 bg-white shadow-sm text-black">
                  <span>Thinking...</span>
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
              className="w-full p-3 md:p-4 pr-12 rounded-lg border border-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black text-sm md:text-base text-black"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-black hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Assessment Modal (displayed if there is at least one pending assessment) */}
      {assessmentQueue.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-green bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            {(() => {
              const currentAssessment = assessmentQueue[0];
              return (
                <>
                  <h2 className="text-xl font-bold mb-4">
                    {currentAssessment === "quiz"
                      ? "Quiz Available!"
                      : currentAssessment === "exercise"
                      ? "Exercises Available!"
                      : "Project Available!"}
                  </h2>
                  <p className="mb-4">
                    You have just completed the required lesson steps.
                    Please click below to proceed to your {currentAssessment}.
                  </p>
                  <div className="flex justify-end">
                    <button
                      onClick={handleAssessmentConfirm}
                      className="px-4 py-2 bg-green text-white rounded hover:bg-white hover:text-black"
                    >
                      Proceed
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Off-topic New Chat Modal */}
      {/*
          If the user's question appears off-topic relative to the current curriculum,
          a modal will offer to start a new chat.
      */}
      {/* Off-topic modal remains unchanged */}
      {/*
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
                className="px-4 py-2 bg-white text-black border border-black rounded hover:bg-black hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={confirmNewChat}
                className="px-4 py-2 bg-black text-white rounded hover:bg-white hover:text-black"
              >
                Start New Chat
              </button>
            </div>
          </div>
        </div>
      )}
      */}
    </div>
  );
}
