import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const QuizSystem = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [studentProgress, setStudentProgress] = useState({
    completedSubtopics: 0,
    totalSubtopics: 0,
    currentTopic: '',
    quizEligible: false,
    exerciseEligible: false,
    projectEligible: false
  });
  const [showRedirectPopup, setShowRedirectPopup] = useState(false);
  const [redirectType, setRedirectType] = useState(null);
  const navigate = useNavigate();

  // Fetch student progress from backend
  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const response = await fetch('localhost:8000/api/student/progress');
        const data = await response.json();
        setStudentProgress(data);
        checkAndShowRedirect(data);
      } catch (error) {
        console.error('Error fetching progress:', error);
      }
    };
    fetchProgress();
  }, []);

  const checkAndShowRedirect = (progress) => {
    if (progress.quizEligible && progress.completedSubtopics % 4 === 0) {
      setRedirectType('quiz');
      setShowRedirectPopup(true);
    } else if (progress.exerciseEligible && progress.completedSubtopics % 3 === 0) {
      setRedirectType('exercise');
      setShowRedirectPopup(true);
    } else if (progress.projectEligible && 
              (progress.completedSubtopics === progress.totalSubtopics / 2 || 
               progress.completedSubtopics === progress.totalSubtopics)) {
      setRedirectType('project');
      setShowRedirectPopup(true);
    }
  };

  const handleRedirect = () => {
    setShowRedirectPopup(false);
    navigate(`/assessments/${redirectType}`);
  };

  const handleSlide = (direction) => {
    if (direction === 'next') {
      setCurrentSlide((prev) => (prev + 1) % 3);
    } else {
      setCurrentSlide((prev) => (prev - 1 + 3) % 3);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Redirect Popup */}
      {showRedirectPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-green-700 capitalize">
                {redirectType} Available
              </h3>
              <button 
                onClick={() => setShowRedirectPopup(false)}
                className="text-black hover:text-green-700"
              >
                <X size={24} />
              </button>
            </div>
            <div className="mb-6 p-4 bg-green-50 rounded-lg">
              <p className="text-black mb-2">
                You've completed {studentProgress.completedSubtopics} subtopics!
              </p>
              <p className="text-green-700">
                {redirectType === 'quiz' && "It's time to test your knowledge with a quiz."}
                {redirectType === 'exercise' && "Ready for some hands-on practice?"}
                {redirectType === 'project' && "Time to work on your project!"}
              </p>
            </div>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowRedirectPopup(false)}
                className="px-4 py-2 text-black hover:text-green-700"
              >
                Later
              </button>
              <button
                onClick={handleRedirect}
                className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800"
              >
                Start Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress Header */}
      <div className="bg-green-700 text-white py-4">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold">Learning Progress</h2>
          <p className="mt-2">
            Topic: {studentProgress.currentTopic}
          </p>
          <div className="mt-2 bg-green-600 rounded-full h-2">
            <div 
              className="bg-white rounded-full h-2 transition-all duration-300"
              style={{ width: `${(studentProgress.completedSubtopics / studentProgress.totalSubtopics) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-green-100">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex space-x-4">
              {['Quiz', 'Exercise', 'Project'].map((tab, index) => (
                <button
                  key={tab}
                  onClick={() => setCurrentSlide(index)}
                  className={`py-4 px-6 font-medium transition-colors relative ${
                    currentSlide === index
                      ? 'text-green-700 border-b-2 border-green-700'
                      : 'text-gray-500 hover:text-green-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handleSlide('prev')}
                className="p-2 rounded-full hover:bg-green-50"
              >
                <ChevronLeft className="w-6 h-6 text-green-700" />
              </button>
              <button
                onClick={() => handleSlide('next')}
                className="p-2 rounded-full hover:bg-green-50"
              >
                <ChevronRight className="w-6 h-6 text-green-700" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Slider */}
      <div className="container mx-auto px-4 py-8">
        <div 
          className="transition-transform duration-300 flex"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {/* Quiz Section */}
          <div className="w-full flex-shrink-0">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold text-green-700 mb-4">Quizzes</h3>
              <p className="text-gray-600 mb-4">
                Complete quizzes to test your knowledge after every 4 subtopics.
              </p>
              <div className="space-y-4">
                {/* Quiz list or current quiz status */}
                {studentProgress.quizEligible ? (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-green-700 font-medium">New quiz available!</p>
                  </div>
                ) : (
                  <p className="text-gray-500">
                    Complete {4 - (studentProgress.completedSubtopics % 4)} more subtopics to unlock the next quiz.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Exercise Section */}
          <div className="w-full flex-shrink-0">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold text-green-700 mb-4">Exercises</h3>
              <p className="text-gray-600 mb-4">
                Practice with hands-on exercises after every 3 subtopics.
              </p>
              <div className="space-y-4">
                {studentProgress.exerciseEligible ? (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-green-700 font-medium">New exercise available!</p>
                  </div>
                ) : (
                  <p className="text-gray-500">
                    Complete {3 - (studentProgress.completedSubtopics % 3)} more subtopics to unlock the next exercise.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Project Section */}
          <div className="w-full flex-shrink-0">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold text-green-700 mb-4">Projects</h3>
              <p className="text-gray-600 mb-4">
                Apply your skills with comprehensive projects.
              </p>
              <div className="space-y-4">
                {studentProgress.projectEligible ? (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-green-700 font-medium">
                      {studentProgress.completedSubtopics === studentProgress.totalSubtopics
                        ? 'Final project available!'
                        : 'Midterm project available!'}
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-500">
                    Complete more subtopics to unlock the next project.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizSystem;