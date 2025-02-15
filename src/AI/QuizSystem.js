import React, { useState, useEffect } from "react";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { CheckCircle2, XCircle,Loader2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { API_KEY } from "../api";
import { FormattedMessage } from "./format";
import { Anthropic } from '@anthropic-ai/sdk';
import CircularProgress from '@mui/material/CircularProgress';

const anthropic = new Anthropic({ apiKey: API_KEY , dangerouslyAllowBrowser: true});

// const GOOGLE_API_KEY = API_KEY;
// const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);

// ====================
// PARSER FUNCTIONS
// ====================

const parseQuizResponse = (text) => {
  try {
    return JSON.parse(text);
  } catch (e) {
    const questions = [];
    let currentQuestion = null;

    const lines = text.split('\n').map(line => line.trim()).filter(line => line);

    for (const line of lines) {
      if (line.match(/^Q\d+|Question \d+:|^\d+\./)) {
        if (currentQuestion) {
          questions.push(currentQuestion);
        }
        currentQuestion = {
          question: line.replace(/^Q\d+\.|Question \d+:|^\d+\./, '').trim(),
          options: [],
          correct: '',
          explanation: ''
        };
      } else if (line.match(/^[a-d]\)/) && currentQuestion) {
        currentQuestion.options.push(line.trim());
        if (line.includes('(correct)')) {
          currentQuestion.correct = line[0];
          currentQuestion.options[currentQuestion.options.length - 1] =
            line.replace('(correct)', '').trim();
        }
      } else if (line.match(/^Explanation:|^Answer:|^Why:/) && currentQuestion) {
        currentQuestion.explanation = line.replace(/^Explanation:|^Answer:|^Why:/, '').trim();
      }
    }

    if (currentQuestion) {
      questions.push(currentQuestion);
    }

    return { questions };
  }
};

const parseExerciseResponse = (text) => {
  const cleanText = (text) => text.replace(/^#\s*/, '').trim();

  try {
    return JSON.parse(text);
  } catch (e) {
    const exercises = [];
    let currentExercise = null;
    let currentSection = null;

    const lines = text.replace(/```python|```/g, '')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line);

    for (const line of lines) {
      if (line.match(/^#?\s*Exercise \d+:/)) {
        if (currentExercise) {
          exercises.push(currentExercise);
        }
        currentExercise = {
          title: cleanText(line),
          description: cleanText(line),
          hints: [],
          testCases: [],
          sampleSolution: ''
        };
        currentSection = null;
      } else if (line.startsWith('Description:')) {
        currentSection = 'description';
        if (currentExercise) {
          currentExercise.description = cleanText(line.replace('Description:', ''));
        }
      } else if (line.startsWith('Hint:')) {
        currentSection = 'hints';
        if (currentExercise) {
          currentExercise.hints.push(cleanText(line.replace('Hint:', '')));
        }
      } else if (line.startsWith('Test Case:')) {
        currentSection = 'testCases';
        if (currentExercise) {
          currentExercise.testCases.push(cleanText(line.replace('Test Case:', '')));
        }
      } else if (line.startsWith('Solution:')) {
        currentSection = 'solution';
        if (currentExercise) {
          currentExercise.sampleSolution = '';
        }
      } else if (currentExercise && currentSection) {
        switch (currentSection) {
          case 'description':
            if (!line.startsWith('Hint:') && !line.startsWith('Test Case:') && !line.startsWith('Solution:')) {
              currentExercise.description += ' ' + cleanText(line);
            }
            break;
          case 'solution':
            currentExercise.sampleSolution += cleanText(line) + '\n';
            break;
        }
      }
    }

    if (currentExercise) {
      exercises.push(currentExercise);
    }

    console.log("Parsed exercises:", exercises);
    return { exercises };
  }
};

const parseProjectResponse = (text) => {
  try {
    return JSON.parse(text);
  } catch (e) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    const project = {
      title: '',
      description: '',
      requirements: [],
      steps: [],
      deliverables: [],
      resources: []
    };

    let currentSection = null;

    for (const line of lines) {
      if (line.startsWith('Title:')) {
        project.title = line.replace('Title:', '').trim();
      } else if (line.startsWith('Description:')) {
        project.description = line.replace('Description:', '').trim();
      } else if (line.match(/^Requirements?:/i)) {
        currentSection = 'requirements';
      } else if (line.match(/^Steps?:/i)) {
        currentSection = 'steps';
      } else if (line.match(/^Deliverables?:/i)) {
        currentSection = 'deliverables';
      } else if (line.match(/^Resources?:/i)) {
        currentSection = 'resources';
      } else if (line.match(/^[-•*]\s/) && currentSection) {
        project[currentSection].push(line.replace(/^[-•*]\s/, '').trim());
      }
    }

    return { project };
  }
};

// ====================
// TAB PANEL COMPONENT
// ====================

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

// ====================
// MAIN COMPONENT
// ====================

export default function Quiz() {
  // State management
  const [searchParams] = useSearchParams();
  const assessmentType = searchParams.get("assessmentType") || "quiz";
  const [currentTab, setCurrentTab] = useState(assessmentType);
  const [assessment, setAssessment] = useState(null);
  const [userAnswers, setUserAnswers] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const[quizLoading, setQuizLoading] = useState(false)
  const[exerciseLoading, setExcersiseLoading] = useState(false)
  const[projectLoading, setProjectLoading] = useState(false)


  // New state for user-entered solutions and AI feedback:
  const [exerciseUserSolutions, setExerciseUserSolutions] = useState({});
  const [exerciseFeedback, setExerciseFeedback] = useState({});
  const [projectUserSolution, setProjectUserSolution] = useState("");
  const [projectFeedback, setProjectFeedback] = useState("");

  // Retrieve curriculum from localStorage (for context in the prompt)
  const getCurriculumData = () => {
    const chatId = localStorage.getItem("currentChatId");
    const storedCurriculum = localStorage.getItem(`curriculum-${chatId}`);
    return storedCurriculum ? JSON.parse(storedCurriculum) : null;
  };


  useEffect(() => {
    // Clear assessment popup state in localStorage when component mounts
    localStorage.setItem("assessmentPopup", "false");
    
    // Cleanup when component unmounts
    return () => {
      localStorage.setItem("assessmentPopup", "false");
      localStorage.setItem("assessmentCompleted", "true");
    };
  }, []);


  // Generate assessment based on the current tab
  const generateAssessment = async () => {
    setLoading(true);
    setError(null);

    const currentProgress = getCurriculumData();
    if (!currentProgress?.topics) {
      setError("No curriculum found");
      setLoading(false);
      return;
    }

    const completedTopics = currentProgress.topics
      .slice(0, currentProgress.currentTopicIndex)
      .map(topic => topic.replace(/\*\*/g, ''));
    console.log("topics", completedTopics);

    let prompt = "";

    switch (currentTab) {case "quiz":
      // Gather subtopics that have been covered so far:
      let coveredSubtopics = [];
      currentProgress.topics.forEach((topic, idx) => {
        if (idx < currentProgress.currentTopicIndex) {
          // All subtopics from topics that are fully completed:
          coveredSubtopics.push(...currentProgress.subtopics[topic]);
        } else if (idx === currentProgress.currentTopicIndex) {
          // Only include subtopics up to the current subtopic index (inclusive)
          coveredSubtopics.push(...currentProgress.subtopics[topic].slice(0, currentProgress.currentSubtopicIndex + 1));
        }
      });
      // Remove any falsy values (if any)
      coveredSubtopics = coveredSubtopics.filter(Boolean);
    
      prompt = `Create a multiple choice quiz with 5 questions covering these subtopics: ${coveredSubtopics.join(", ")}.
    Format each question like this:
    Q1. Question text
    a) Option 1
    b) Option 2 (correct)
    c) Option 3
    d) Option 4
    Explanation: Explanation text
    
    Continue for all 5 questions.`;
      break;
    
      case "exercise":
        prompt = `Create 3 real world problem-practical exercises based on ${completedTopics.join(", ")}.
Format each exercise like this:
Exercise 1: Title
Description: Exercise description
Hint: First hint
Hint: Second hint
Test Case: First test case
Test Case: Second test case
Solution: Sample solution code

Continue for all 3 exercises.`;
        break;
      case "project":
        prompt = `Create a real world problem-practical project covering these topics: ${completedTopics.join(", ")}.
Format the response like this:
Title: Project title
Description: Detailed project description
Requirements:
- Requirement 1
- Requirement 2
Steps:
- Step 1
- Step 2
Deliverables:
- Deliverable 1
- Deliverable 2
Resources:
- Resource 1
- Resource 2`;
        break;
      default:
        setError("Invalid assessment type");
        setLoading(false);
        return;
    }

    try {
      // const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      // console.log("Sending prompt to AI:", prompt);
      // const result = await model.generateContent(prompt);
      // const textResponse = await result.response.text();
      const result = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }]
      });
      const textResponse = result.content[0].text;
        
      console.log("response", textResponse);

      let content;
      switch (currentTab) {
        case "quiz":
          content = parseQuizResponse(textResponse);
          break;
        case "exercise":
          content = parseExerciseResponse(textResponse);
          break;
        case "project":
          content = parseProjectResponse(textResponse);
          break;
      }

      if (!content) {
        throw new Error("Failed to parse response");
      }

      setAssessment(content);
    } catch (error) {
      console.error("Error generating assessment:", error);
      setError("Failed to generate assessment. Please try again.");
      setAssessment(null);
    } finally {
      setLoading(false);
    }
  };

  // Reset state whenever the current tab changes
  useEffect(() => {
    generateAssessment();
    setIsSubmitted(false);
    setUserAnswers({});
    setScore(null);
    setError(null);
    setExerciseUserSolutions({});
    setExerciseFeedback({});
    setProjectUserSolution("");
    setProjectFeedback("");
  }, [currentTab]);

  // Event handlers
  const handleAnswer = (questionIdx, answer) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionIdx]: answer
    }));
  };

  // ====================
  // EVALUATION FUNCTIONS
  // ====================

  // Evaluate each exercise solution by sending a prompt to the AI.
  const evaluateExerciseSolutions = async () => {
    const feedback = {};
    if (!assessment?.exercises) return feedback;

    for (let i = 0; i < assessment.exercises.length; i++) {
      const exercise = assessment.exercises[i];
      const userSolution = exerciseUserSolutions[i] || "";
      const prompt = `Evaluate the following solution for the exercise.
Exercise Title: ${exercise.title}
Description: ${exercise.description}
Test Cases: ${exercise.testCases.join(", ")}
Student's Solution:
${userSolution}

Provide a detailed explanation, mark out of 100, and a full correct solution.`;
      try {
        // const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
        // const result = await model.generateContent(prompt);
        const response = await anthropic.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 2000,
          messages: [{ 
            role: "user", 
            content: prompt 
          }]
        });
        const textResponse = response.content[0].text; 
        feedback[i] = textResponse;
        setExcersiseLoading(false)
      } catch (err) {
        feedback[i] = "Error evaluating solution.";
      }
    }
    return feedback;
  };

  // Evaluate the project solution
  const evaluateProjectSolution = async () => {
    if (!assessment?.project) return "";
    const prompt = `Evaluate the following project solution.
Project Title: ${assessment.project.title}
Description: ${assessment.project.description}
Requirements: ${assessment.project.requirements.join(", ")}
Student's Solution:
${projectUserSolution}

Provide a detailed explanation, mark out of 100, and a full correct solution.`;
    try {
      // const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      // const result = await model.generateContent(prompt);
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2000,
        messages: [{ 
          role: "user", 
          content: prompt 
        }]
      });
      const textResponse = response.content[0].text;
      setProjectLoading(false)
      return textResponse;
    } catch (err) {
      return "Error evaluating solution.";
    }
  };

  // Submit handler now calls different evaluation functions based on the current tab.
  const handleSubmit = async () => {
    if (currentTab === "quiz" && assessment?.questions) {
      const totalQuestions = assessment.questions.length;
      const correctAnswers = assessment.questions.filter(
        (q, idx) => q.correct === userAnswers[idx]
      ).length;
      setScore((correctAnswers / totalQuestions) * 100);
      setIsSubmitted(true);
      localStorage.setItem("assessmentSubmitted", "true");


    } else if (currentTab === "exercise") {
      setExcersiseLoading(true);

      // Evaluate each exercise solution
      const feedback = await evaluateExerciseSolutions();
      setExerciseFeedback(feedback);

      // Optionally store submission flag in localStorage
      localStorage.setItem("exercisesTaken", "true");
      setIsSubmitted(true);
      setExcersiseLoading(false)
      
    } else if (currentTab === "project") {
      setProjectLoading(true)

      // Evaluate the project solution
      const feedback = await evaluateProjectSolution();
      setProjectFeedback(feedback);
      localStorage.setItem("projectTaken", "true");
      setIsSubmitted(true);
      setProjectLoading(false)
    }
  };

  const handleRetry = () => {
    generateAssessment();
  };

  // ====================
  // RENDER FUNCTIONS
  // ====================

  // Render Quiz Tab
  const renderQuiz = () => {
    if (!assessment?.questions || !Array.isArray(assessment.questions)) {
      return (
        <Card sx={{ p: 2, backgroundColor: "#fff" }}>
          <CardContent>
            <div style={{ textAlign: "center", color: "black" }}>
              No quiz questions available. Please try again.
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {assessment.questions.map((q, idx) => (
          <Card key={idx} sx={{ p: 2, backgroundColor: "#fff" }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: "bold", color: "black", marginBottom: 2 }}>
                {q.question}
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {q.options?.map((option, optIdx) => (
                  <button
                    key={optIdx}
                    onClick={() => handleAnswer(idx, option[0])}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "12px",
                      borderRadius: "8px",
                      border: userAnswers[idx] === option[0] ? "2px solid #2e7d32" : "1px solid #ccc",
                      backgroundColor: userAnswers[idx] === option[0] ? "#e8f5e9" : "#fff",
                      color: "black",
                      cursor: isSubmitted ? "default" : "pointer"
                    }}
                    disabled={isSubmitted}
                  >
                    {option}
                    {isSubmitted && (
                      <span style={{ float: "right" }}>
                        {option[0] === q.correct ? (
                          <CheckCircle2 style={{ color: "#2e7d32" }} size={20} />
                        ) : option[0] === userAnswers[idx] ? (
                          <XCircle style={{ color: "red" }} size={20} />
                        ) : null}
                      </span>
                    )}
                  </button>
                ))}
              </Box>
              {isSubmitted && (
                <Typography variant="body2" sx={{ marginTop: 2, color: "black" }}>
                  {q.explanation}
                </Typography>
              )}
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  };

  // Render Exercises Tab with textareas for student solutions and feedback after evaluation.
  const renderExercise = () => {
    if (!assessment?.exercises || !Array.isArray(assessment.exercises)) {
      return (
        <Card sx={{ p: 2, backgroundColor: "#fff" }}>
          <CardContent>
            <div style={{ textAlign: "center", color: "black" }}>
              No exercises available. Please try again.
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {assessment.exercises.map((exercise, idx) => (
          <Card key={idx} sx={{ p: 2, backgroundColor: "#fff" }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: "bold", color: "black", marginBottom: 2 }}>
                <FormattedMessage content={exercise.title} />
              </Typography>
              <Typography variant="body1" sx={{ color: "black" }}>
                Description: {exercise.description}
              </Typography>
              <Box sx={{ marginTop: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: "bold", color: "black" }}>
                  Hints:
                </Typography>
                <ul style={{ marginLeft: "20px", color: "black" }}>
                  {exercise.hints?.map((hint, hintIdx) => (
                    <li key={hintIdx}>
                      <FormattedMessage content={hint} />
                    </li>
                  ))}
                </ul>
              </Box>
              <Box sx={{ marginTop: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: "bold", color: "black" }}>
                  Test Cases:
                </Typography>
                <ul style={{ marginLeft: "20px", color: "black" }}>
                  {exercise.testCases?.map((test, testIdx) => (
                    <li key={testIdx}>{test}</li>
                  ))}
                </ul>
              </Box>
              <Box sx={{ marginTop: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: "bold", color: "black" }}>
                  Your Solution:
                </Typography>
                <TextField
                  multiline
                  minRows={4}
                  fullWidth
                  variant="outlined"
                  placeholder="Type your solution here..."
                  value={exerciseUserSolutions[idx] || ""}
                  onChange={(e) =>
                    setExerciseUserSolutions((prev) => ({
                      ...prev,
                      [idx]: e.target.value
                    }))
                  }
                  disabled={isSubmitted}
                  InputProps={{
                    style: { backgroundColor: "#fff", color: "black" }
                  }}
                />
              </Box>
              {isSubmitted && exerciseFeedback[idx] && (
                <Box sx={{ marginTop: 2, padding: 2, backgroundColor: "#e8f5e9", borderRadius: "8px" }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: "bold", color: "#2e7d32" }}>
                    Feedback:
                  </Typography>
                  <Typography variant="body2" sx={{ color: "black" }}>
                  <FormattedMessage content={exerciseFeedback[idx]} />
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  };

  // Render Project Tab with a textarea for the solution and AI feedback after evaluation.
  const renderProject = () => {
    if (!assessment?.project) {
      return (
        <Card sx={{ p: 2, backgroundColor: "#fff" }}>
          <CardContent>
            <div style={{ textAlign: "center", color: "black" }}>
              No project available. Please try again.
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card sx={{ p: 2, backgroundColor: "#fff" }}>
        <CardContent>
          <Typography variant="h5" sx={{ fontWeight: "bold", color: "black", marginBottom: 2 }}>
            {assessment.project.title}
          </Typography>
          <Box sx={{ marginBottom: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: "bold", color: "black" }}>
              Description:
            </Typography>
            <Typography variant="body1" sx={{ color: "black" }}>
              {assessment.project.description}
            </Typography>
          </Box>
          <Box sx={{ marginBottom: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: "bold", color: "black" }}>
              Requirements:
            </Typography>
            <ul style={{ marginLeft: "20px", color: "black" }}>
              {assessment.project.requirements?.map((req, idx) => (
                <li key={idx}>{req}</li>
              ))}
            </ul>
          </Box>
          <Box sx={{ marginTop: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: "bold", color: "black" }}>
              Your Project Solution:
            </Typography>
            <TextField
              multiline
              minRows={6}
              fullWidth
              variant="outlined"
              placeholder="Type your project solution here..."
              value={projectUserSolution}
              onChange={(e) => setProjectUserSolution(e.target.value)}
              disabled={isSubmitted}
              InputProps={{
                style: { backgroundColor: "#fff", color: "black" }
              }}
            />
          </Box>
          {isSubmitted && projectFeedback && (
            <Box sx={{ marginTop: 2, padding: 2, backgroundColor: "#e8f5e9", borderRadius: "8px" }}>
              <Typography variant="subtitle1" sx={{ fontWeight: "bold", color: "#2e7d32" }}>
                Feedback:
              </Typography>
              <Typography variant="body2" sx={{ color: "black" }}>
              <FormattedMessage content={projectFeedback} />
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  // ====================
  // MAIN RENDER
  // ====================
  return (
    <Box sx={{ maxWidth: "1024px", mx: "auto", p: 2, backgroundColor: "#fff" }}>
      {/* Stylish Title Above Tabs */}
      <Box sx={{ textAlign: "center", mb: 3 }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontWeight: "bold",
            color: "#2e7d32",
            textShadow: "2px 2px 4px rgba(0,0,0,0.2)"
          }}
        >
          Assessment Portal
        </Typography>
        <Typography variant="subtitle1" sx={{ color: "black" }}>
          Test your knowledge with our interactive assessments!
        </Typography>
      </Box>

      <Tabs
        value={currentTab}
        onChange={(event, newValue) => setCurrentTab(newValue)}
        aria-label="Assessment Tabs"
        variant="fullWidth"
        textColor="inherit"
        indicatorColor="secondary"
        sx={{
          backgroundColor: "#2e7d32",
          color: "#fff",
          ".Mui-selected": { color: "#fff" }
        }}
      >
        <Tab label="Quiz" value="quiz" />
        <Tab label="Exercises" value="exercise" />
        <Tab label="Project" value="project" />
      </Tabs>

      {error ? (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography variant="body1" sx={{ color: "red", marginBottom: 2 }}>
            {error}
          </Typography>
          <button
            onClick={handleRetry}
            style={{
              padding: "10px 20px",
              backgroundColor: "#2e7d32",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer"
            }}
          >
            Try Again
          </button>
        </Box>
      ) : (
        <>
          {loading ? (
            <Box sx={{ textAlign: "center", py: 8 }}>
              <div
                style={{
                  margin: "0 auto 16px",
                  border: "4px solid #2e7d32",
                  borderTop: "4px solid #fff",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  animation: "spin 1s linear infinite"
                }}
              ></div>
              <Typography variant="body1" sx={{ color: "black" }}>
                Loading {currentTab}...
              </Typography>
            </Box>
          ) : (
            <Box sx={{ mt: 4 }}>
              {currentTab === "quiz" && (
                <>
                  {renderQuiz()}
                  {!isSubmitted && assessment?.questions?.length > 0 && (
                    <button
                      onClick={handleSubmit}
                      style={{
                        marginTop: "24px",
                        width: "100%",
                        padding: "12px",
                        backgroundColor: "#2e7d32",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer"
                      }}
                      disabled={Object.keys(userAnswers).length < (assessment?.questions?.length || 0)}
                    >
                      Submit Quiz
                    </button>
                  )}
                  {isSubmitted && score !== null && (
                    <Box sx={{ marginTop: "24px", textAlign: "center" }}>
                      <Typography variant="h5" sx={{ fontWeight: "bold", color: "black" }}>
                        Your Score: {score.toFixed(1)}%
                      </Typography>
                      <button
                        onClick={handleRetry}
                        style={{
                          marginTop: "16px",
                          padding: "10px 20px",
                          backgroundColor: "#2e7d32",
                          color: "#fff",
                          border: "none",
                          borderRadius: "8px",
                          cursor: "pointer"
                        }}
                      >
                        Try Another Quiz
                      </button>
                    </Box>
                  )}
                </>
              )}
              {currentTab === "exercise" && (
                <>
                  {renderExercise()}
                  {!isSubmitted && (
                    <button
                      onClick={handleSubmit}
                      disabled={exerciseLoading}
                      style={{
                        marginTop: "24px",
                        width: "100%",
                        padding: "12px",
                        backgroundColor: "#2e7d32",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer"
                      }}
                    >
                      {exerciseLoading ? <CircularProgress size={20}  color="white"/>: "Submit Excersies"}
                      </button>
                  )}
                  {isSubmitted && (
                    <Box sx={{ marginTop: "24px", textAlign: "center" }}>
                      <Typography variant="h5" sx={{ fontWeight: "bold", color: "black" }}>
                        Exercises Submitted Successfully!
                      </Typography>
                      <button
                        onClick={handleRetry}
                        style={{
                          marginTop: "16px",
                          padding: "10px 20px",
                          backgroundColor: "#2e7d32",
                          color: "#fff",
                          border: "none",
                          borderRadius: "8px",
                          cursor: "pointer"
                        }}
                      >
                        Try New Exercises
                      </button>
                    </Box>
                  )}
                </>
              )}
              {currentTab === "project" && (
                <>
                  {renderProject()}
                  {!isSubmitted && (
                    <button
                      onClick={handleSubmit}
                      disabled={projectLoading}
                      style={{
                        marginTop: "24px",
                        width: "100%",
                        padding: "12px",
                        backgroundColor: "#2e7d32",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer"
                      }}
                    >
                      {projectLoading ? <CircularProgress size={20}  color="white"/>: "Submit Project"}
                      
                    </button>
                  )}
                  {isSubmitted && (
                    <Box sx={{ marginTop: "24px", textAlign: "center" }}>
                      <Typography variant="h5" sx={{ fontWeight: "bold", color: "black" }}>
                        Project Submitted Successfully!
                      </Typography>
                      <button
                        onClick={handleRetry}
                        style={{
                          marginTop: "16px",
                          padding: "10px 20px",
                          backgroundColor: "#2e7d32",
                          color: "#fff",
                          border: "none",
                          borderRadius: "8px",
                          cursor: "pointer"
                        }}
                      >
                        Try New Project
                      </button>
                    </Box>
                  )}
                </>
              )}
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
