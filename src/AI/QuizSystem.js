import React, { useState, useEffect } from 'react';
import { Brain, ArrowRight, Check, X } from 'lucide-react';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import axios from 'axios';

const QuizSystem = ({ studentId }) => {
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState({});
  const [difficulty, setDifficulty] = useState('medium');
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(true);

  // Predefined list of topics
  const availableTopics = [
    'Machine Learning',
    'Deep Learning',
    'Node JS',
    'Generative Ai',
    'RAG Apps',
    'AI agents'
  ];

  useEffect(() => {
    if (selectedTopic) {
      generateQuiz();
    }
  }, [selectedTopic]);

  const generateQuiz = async () => {
    setLoading(true);
    try {
      const quizResponse = await axios.post('http://192.168.100.219:8000/generate-quiz', {
        student_id: studentId,
        topic: selectedTopic,
        difficulty: 'hard',
        numQuestions: 5
      });
      setQuestions(quizResponse.data.questions);

      if (quizResponse.data.questions || quizResponse.data.questions.length > 0) {
        setQuestions(quizResponse.data.questions);
      } else {
        console.error("No questions returned");
      }
      setLoading(false);
    } catch (error) {
      console.error('Quiz generation failed:', error);
      setLoading(false);
    }
  };

  const handleTopicSelect = (topic) => {
    setSelectedTopic(topic);
    setIsTopicModalOpen(false);
  };

  const handleAnswer = (questionId, answer) => {
    setAnswers({
      ...answers,
      [questionId]: answer
    });
  };

  const submitQuiz = async () => {
    try {
      const response = await axios.post('http://localhost:8000/submit-quiz', {
        student_id: studentId,
        topic: selectedTopic,
        answers
      });
      setScore(response.data.score);
    } catch (error) {
      console.error('Failed to submit quiz:', error);
    }
  };

  // Topic Selection Modal
  const TopicSelectionModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl transform transition-all duration-300 scale-95 hover:scale-100">
        <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">Select a Topic to Study</h2>
        <div className="grid grid-cols-2 gap-4">
          {availableTopics.map((topic) => (
            <button
              key={topic}
              onClick={() => handleTopicSelect(topic)}
              className="p-4 bg-gradient-to-r from-green-400 to-blue-400 hover:from-green-500 hover:to-blue-500 rounded-lg text-center font-medium text-white transition-all duration-300 transform hover:scale-105"
            >
              {topic}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="quiz-container max-w-3xl mx-auto p-4 relative">
      {/* Topic Selection Modal */}
      {isTopicModalOpen && <TopicSelectionModal />}

      {selectedTopic && (
        <>
          {/* Quiz Card */}
          <Card className="mb-6 shadow-lg rounded-xl overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">
                  {selectedTopic} Quiz (Difficulty: {difficulty})
                </h2>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Generating personalized questions...</p>
                </div>
              ) : (
                <>
                  {questions.map((question, index) => (
                    <div
                      key={index}
                      className={`p-6 rounded-xl mb-4 transition-all duration-300 ${
                        currentQuestion === index ? 'bg-gradient-to-r from-green-50 to-blue-50 shadow-md' : 'bg-gray-50'
                      }`}
                    >
                      <p className="font-medium mb-4 text-gray-700">{question.text}</p>
                      <div className="grid gap-3">
                        {question.options.map((option, optIndex) => (
                          <button
                            key={optIndex}
                            onClick={() => handleAnswer(question.id, option)}
                            className={`p-3 rounded-lg text-left transition-all duration-200 ${
                              answers[question.id] === option
                                ? 'bg-gradient-to-r from-green-600 to-blue-600 text-white shadow-lg'
                                : 'bg-white hover:bg-green-50 hover:shadow-md'
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between mt-6">
                    <button
                      onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                      className="btn btn-outline bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-lg transition-all duration-200"
                      disabled={currentQuestion === 0}
                    >
                      Previous
                    </button>
                    {currentQuestion === questions.length - 1 ? (
                      <button
                        onClick={submitQuiz}
                        className="btn btn-primary bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white px-6 py-2 rounded-lg transition-all duration-200"
                      >
                        Submit Quiz
                        <Check className="ml-2 w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setCurrentQuestion(currentQuestion + 1)}
                        className="btn btn-primary bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white px-6 py-2 rounded-lg transition-all duration-200"
                      >
                        Next
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Quiz Results */}
          {score !== 0 && (
            <Card className="shadow-lg rounded-xl overflow-hidden">
              <CardContent className="text-center py-8">
                <h3 className="text-2xl font-bold mb-4 text-gray-800">Quiz Results</h3>
                <p className="text-4xl font-bold text-green-600 mb-6">{score}%</p>
                <button
                  onClick={() => {
                    setIsTopicModalOpen(true);
                    setScore(0);
                    setQuestions([]);
                    setAnswers({});
                  }}
                  className="btn btn-primary bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white px-6 py-2 rounded-lg transition-all duration-200"
                >
                  Choose New Topic
                </button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default QuizSystem;