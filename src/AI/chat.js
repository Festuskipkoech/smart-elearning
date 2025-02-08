import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, Menu, X, Trash2, BookOpen } from "lucide-react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {API_KEY} from "../api.js"
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import { FormattedMessage } from "./format.js";
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

export default function Chatbot() {
  // Chat UI states
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('currentMessages');
    return saved ? JSON.parse(saved) : [{
      type: "bot",
      content: "Hi! I'm your AI tutor. What subject would you like to learn?",
      id: "initial",
    }];
  });

 
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Learning states
  const [currentSubject, setCurrentSubject] = useState(() => {
    return localStorage.getItem('currentSubject') || null;
  });
    const [learningState, setLearningState] = useState(() => {
    const saved = localStorage.getItem('learningState');
    return saved ? JSON.parse(saved) : {
      currentTopic: null,
      topics: [],
      subtopics: [],
      currentSubtopicIndex: 0,
      completedSubtopics: 0,
      quizzesTaken: 0,
      exercisesCompleted: 0,
      projectsCompleted: 0,
      lastQuizAt: null,
      lastExerciseAt: null,
      lastProjectAt: null
    };
  });
  useEffect(() => {
    localStorage.setItem('currentMessages', JSON.stringify(messages));
    localStorage.setItem('currentSubject', currentSubject);
    localStorage.setItem('learningState', JSON.stringify(learningState));
  }, [messages, currentSubject, learningState]);
  


  // UI Control states
  const [showQuizPopup, setShowQuizPopup] = useState(true);
  const [showExercisePopup, setShowExercisePopup] = useState(false);
  const [showProjectPopup, setShowProjectPopup] = useState(false);
  const [showSubjectWarning, setShowSubjectWarning] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [currentExercise, setCurrentExercise] = useState(null);
  const [currentProject, setCurrentProject] = useState(null);

  const messagesRef = useRef(null);
  const inputRef = useRef(null);

  // Persist states to localStorage
  useEffect(() => {
    localStorage.setItem('currentMessages', JSON.stringify(messages));
    localStorage.setItem('currentSubject', currentSubject);
    localStorage.setItem('learningState', JSON.stringify(learningState));
  }, [messages, currentSubject, learningState]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Generate curriculum using AI

  const generateCurriculum = async (subject) => {
    const prompt = `Generate a detailed curriculum for ${subject} with the following format:
    1. 8 main topics
    2. 8 subtopics for each main topic
    3. Present it as a JSON object with structure: {
      topics: [{
        name: string,
        subtopics: [{
          title: string,
          content: string
        }]
      }]
    }`;

    try {
      const result = await model.generateContent(prompt);
      const curriculum = JSON.parse(result.response.text());
      
      setLearningState(prev => ({
        ...prev,
        topics: curriculum.topics,
        currentTopic: curriculum.topics[0].name,
        subtopics: curriculum.topics[0].subtopics,
        currentSubtopicIndex: 0
      }));

      // Save curriculum to local storage
      localStorage.setItem(`curriculum_${subject}`, JSON.stringify(curriculum));

      return curriculum;
    } catch (error) {
      console.error("Error generating curriculum:", error);
      return null;
    }
  };

  // Generate quiz using AI

  // Generate quiz using AI with local storage
  const generateQuiz = async () => {
    const currentTopicContent = learningState.subtopics
      .slice(0, learningState.currentSubtopicIndex + 1)
      .map(st => st.content)
      .join(" ");

    const prompt = `Based on this content: "${currentTopicContent}"
    Generate a quiz with 4 multiple choice questions. Format as JSON:
    {
      questions: [{
        question: string,
        options: string[],
        correctIndex: number
      }]
    }`;

    try {
      const result = await model.generateContent(prompt);
      const quiz = JSON.parse(result.response.text());
      const quizWithId = {
        ...quiz,
        id: Date.now(),
        topic: learningState.currentTopic,
        timestamp: new Date().toISOString()
      };
      
      setCurrentQuiz(quizWithId);
      setShowQuizPopup(true);

      // Save quiz to local storage
      const quizzes = JSON.parse(localStorage.getItem(`quizzes_${currentSubject}`) || '[]');
      quizzes.push(quizWithId);
      localStorage.setItem(`quizzes_${currentSubject}`, JSON.stringify(quizzes));

      return quizWithId;
    } catch (error) {
      console.error("Error generating quiz:", error);
      return null;
    }
  };


  // Generate exercise using AI

  const generateExercise = async () => {
    const prompt = `Based on the current topic "${learningState.currentTopic}",
    generate a practical exercise that tests the student's understanding.
    Format as JSON: {
      title: string,
      description: string,
      requirements: string[],
      hints: string[]
    }`;

    try {
      const result = await model.generateContent(prompt);
      const exercise = JSON.parse(result.response.text());
      const exerciseWithId = {
        ...exercise,
        id: Date.now(),
        topic: learningState.currentTopic,
        timestamp: new Date().toISOString()
      };

      setCurrentExercise(exerciseWithId);
      setShowExercisePopup(true);

      // Save exercise to local storage
      const exercises = JSON.parse(localStorage.getItem(`exercises_${currentSubject}`) || '[]');
      exercises.push(exerciseWithId);
      localStorage.setItem(`exercises_${currentSubject}`, JSON.stringify(exercises));

      return exerciseWithId;
    } catch (error) {
      console.error("Error generating exercise:", error);
      return null;
    }
  };

  // Check if prompt is related to current subject

  const checkSubjectRelevance = async (input) => {
    const prompt = `Given the input "${input}" and the current subject "${currentSubject}",
    determine if the input is related to the subject. Return JSON: { isRelated: boolean }`;

    try {
      const result = await model.generateContent(prompt);
      const { isRelated } = JSON.parse(result.response.text());
      return isRelated;
    } catch (error) {
      console.error("Error checking subject relevance:", error);
      return true;
    }
  };

  // Handle user input and generate response
 
// Modified generateTutorResponse function
const generateTutorResponse = async (userInput, context) => {
  const prompt = `You must respond EXCLUSIVELY with a raw JSON object containing ONLY these fields:
  {
      "response": "string (tutoring response)",
      "comprehensionScore": number (0-1),
      "suggestReview": boolean,
      "reviewTopics": string[],
      "readyForNext": boolean
  }

  Important rules:
  1. Use ONLY valid JSON format
  2. No Markdown, code blocks, or extra text
  3. Maintain double quotes for all strings
  4. Never add comments or trailing commas
  5. Your response must be ONLY the JSON object with no other text`;

  try {
      const result = await model.generateContent(prompt);
      let responseText = result.response.text();
      
      // Log the raw response before parsing
      console.debug("Raw AI Response:", responseText);

      // Clean up the response (Remove unwanted Markdown or code block markers)
      responseText = responseText
          .replace(/```(json)?/g, '')  // Remove code block markers
          .replace(/[`\t]/g, '')  // Remove backticks and tabs
          .trim();

      console.debug("Cleaned JSON:", responseText);  // Debugging before parsing

      // Attempt to parse JSON
      return JSON.parse(responseText);

  } catch (error) {
      console.error("Error processing response:", error);
      return {
          response: "I encountered an error while processing. Let's try again.",
          comprehensionScore: 0.5,
          suggestReview: false,
          reviewTopics: [],
          readyForNext: false
      };
  }
};

  const userId=localStorage.getItem('user')

  // Enhanced handleResponse function

  const handleResponse = async (userInput) => {
    try {
      // Check for continue command
      if (userInput.toLowerCase().includes('continue')) {
        const savedProgress = localStorage.getItem(`progress_${currentSubject}`);
        if (savedProgress) {
          const progressData = JSON.parse(savedProgress);
          setLearningState(prev => ({
            ...prev,
            currentTopic: progressData.current_topic,
            currentSubtopicIndex: progressData.current_subtopic
          }));
        }
        
        return "Welcome back! Let's continue from where you left off...";
      }

      // Get tutor response
      const tutorResponse = await generateTutorResponse(userInput, {
        subject: currentSubject,
        currentTopic: learningState.currentTopic,
        currentSubtopic: learningState.subtopics[learningState.currentSubtopicIndex],
        completedSubtopics: learningState.completedSubtopics,
        comprehensionScores: learningState.comprehensionScores
      });

      // Save progress locally
      const progress = {
        subject: currentSubject,
        current_topic: learningState.currentTopic,
        current_subtopic: learningState.currentSubtopicIndex,
        comprehension_score: tutorResponse.comprehensionScore,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(`progress_${currentSubject}`, JSON.stringify(progress));

      // Check if it's time for a project
      const topicIndex = learningState.topics.findIndex(t => t.name === learningState.currentTopic);
      if (topicIndex === Math.floor(learningState.topics.length / 2) || 
          topicIndex === learningState.topics.length - 1) {
        const projectRange = topicIndex === Math.floor(learningState.topics.length / 2) 
          ? [0, topicIndex] 
          : [Math.floor(learningState.topics.length / 2) + 1, topicIndex];
        
        const project = await generateProject(projectRange);
        setCurrentProject(project);
        setShowProjectPopup(true);
      }

      // Update learning state based on response
      if (tutorResponse.readyForNext) {
        setLearningState(prev => ({
          ...prev,
          currentSubtopicIndex: prev.currentSubtopicIndex + 1,
          completedSubtopics: prev.completedSubtopics + 1,
          comprehensionScores: {
            ...prev.comprehensionScores,
            [prev.currentTopic]: tutorResponse.comprehensionScore
          }
        }));
      }

      return tutorResponse.response;
    } catch (error) {
      console.error("Error:", error);
      return "I encountered an error. Please try again.";
    }
  };

  // Generate project with local storage
  const generateProject = async (topicRange) => {
    const prompt = `
    Create a practical project for ${currentSubject} covering topics ${topicRange.join('-')}.
    The project should:
    1. Integrate concepts from all covered topics
    2. Be challenging but achievable
    3. Have clear deliverables and evaluation criteria

    Generate JSON response with:
    {
        "title": string,
        "description": string,
        "requirements": string[],
        "resources": string[],
        "evaluationCriteria": string[],
        "estimatedDuration": string,
        "difficultyLevel": string
    }`;

    try {
        const result = await model.generateContent(prompt);
        let responseText = result.response.text();

        // 🔍 Log the raw AI response for debugging
        console.debug("Raw AI Response:", responseText);

        responseText = responseText
            .replace(/```json/g, '')
            .replace(/```/g, '') 
            .trim();

        console.debug("Cleaned AI Response:", responseText);

        return JSON.parse(responseText);

    } catch (error) {
        console.error("Error processing project response:", error);

        // Return fallback to prevent crashes
        return {
            title: "Project could not be generated",
            description: "Please try again.",
            requirements: [],
            resources: [],
            evaluationCriteria: [],
            estimatedDuration: "N/A",
            difficultyLevel: "Unknown"
        };
    }
};



  // Handle message sending
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { 
      type: "user", 
      content: userMessage,
      id: `user-${Date.now()}` 
    }]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await handleResponse(userMessage);
      setMessages(prev => [...prev, {
        type: "bot",
        content: response,
        id: `bot-${Date.now()}`
      }]);
    } catch (error) {
      console.error("Error:", error);
      setMessages(prev => [...prev, {
        type: "bot",
        content: "Sorry, I encountered an error. Please try again.",
        id: `error-${Date.now()}`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Quiz Popup Component
  const QuizPopup = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
        <h3 className="text-xl font-bold mb-4">Quiz Time!</h3>
        <p className="mb-4">You've completed 4 subtopics. Ready to test your knowledge?</p>
        <div className="flex justify-end space-x-4">
          <button 
            onClick={() => setShowQuizPopup(false)}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Later
          </button>
          <button 
            onClick={() => {
              setShowQuizPopup(false);
              window.location.href = `/quiz`;
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Start Quiz
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="md:flex h-screen bg-slate-50">
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(prev => !prev)}
        className="md:hidden fixed top-4 right-4 z-50 p-2 bg-gray-900 text-white rounded-lg"
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <div className={`
        ${isMobileMenuOpen ? 'fixed inset-0 z-40' : 'hidden'}
        md:relative md:flex md:w-64 bg-gray-900 p-4 flex-col
      `}>
        <div className="flex items-center gap-2 text-white mb-4">
          <BookOpen size={24} />
          <span className="text-lg font-semibold">AI Tutor</span>
        </div>

        {currentSubject && (
          <div className="text-white mb-4">
            <h3 className="font-medium mb-2">Current Progress:</h3>
            <p>Subject: {currentSubject}</p>
            <p>Topic: {learningState.currentTopic}</p>
            <p>Completed: {learningState.completedSubtopics} subtopics</p>
          </div>
        )}
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Progress bar */}
        {currentSubject && (
          <div className="bg-white border-b p-4">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{currentSubject}</span>
                <span>{learningState.completedSubtopics} subtopics completed</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 rounded-full h-2 transition-all duration-300"
                  style={{
                    width: `${(learningState.currentSubtopicIndex / learningState.subtopics.length) * 100}%`
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`${
                  message.type === "bot" ? "mr-8" : "ml-8"
                }`}
              >
                <div
                  className={`rounded-lg p-4 ${
                    message.type === "bot"
                      ? "bg-white shadow-sm"
                      : "bg-gray-700 text-white"
                  }`}
                >
                  <FormattedMessage content={message.content}/>
                  
                </div>
              </div>
            ))}
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
              placeholder={currentSubject 
                ? "Ask questions or say 'continue' to move forward..." 
                : "Enter a subject you'd like to learn..."}
              className="w-full p-4 pr-12 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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

        {/* Popups */}
        {showQuizPopup && <QuizPopup />}

        {showExercisePopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
              <h3 className="text-xl font-bold mb-4">Practice Time!</h3>
              <p className="mb-4">Ready to apply what you've learned?</p>
              <div className="mb-4">
                <h4 className="font-medium mb-2">{currentExercise?.title}</h4>
                <p className="text-gray-600">{currentExercise?.description}</p>
              </div>
              <div className="flex justify-end space-x-4">
                <button 
                  onClick={() => setShowExercisePopup(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Later
                </button>
                <button 
                  onClick={() => {
                    setShowExercisePopup(false);
                    window.location.href = `/quiz`;
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Start Exercise
                </button>
              </div>
            </div>
          </div>
        )}

        {showProjectPopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
              <h3 className="text-xl font-bold mb-4">Project Challenge!</h3>
              <p className="mb-4">Ready to take on a real-world project?</p>
              <div className="mb-4">
                <h4 className="font-medium mb-2">{currentProject?.title}</h4>
                <p className="text-gray-600">{currentProject?.description}</p>
                <ul className="mt-2 space-y-1">
                  {currentProject?.requirements?.map((req, index) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-2">•</span>
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex justify-end space-x-4">
                <button 
                  onClick={() => setShowProjectPopup(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Later
                </button>
                <button 
                  onClick={() => {
                    setShowProjectPopup(false);
                    window.location.href = `/project/${currentProject.id}`;
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Start Project
                </button>
              </div>
            </div>
          </div>
        )}

        {showSubjectWarning && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-900">Different Subject Detected</h3>
                <p className="mt-2 text-gray-600">
                  Your question seems to be about a different subject than {currentSubject}. 
                  Would you like to:
                </p>
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowSubjectWarning(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Stay on {currentSubject}
                </button>
                <button
                  onClick={() => {
                    setShowSubjectWarning(false);
                    setCurrentSubject(null);
                    setLearningState({
                      currentTopic: null,
                      topics: [],
                      subtopics: [],
                      currentSubtopicIndex: 0,
                      completedSubtopics: 0,
                      quizzesTaken: 0,
                      exercisesCompleted: 0,
                      projectsCompleted: 0,
                      lastQuizAt: null,
                      lastExerciseAt: null,
                      lastProjectAt: null
                    });
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Switch Subject
                </button>
              </div>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-white rounded-full shadow-lg px-4 py-2">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-100" />
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-200" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}