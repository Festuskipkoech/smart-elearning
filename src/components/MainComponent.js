import React, { useState } from 'react';
import {
  MessageCircle,
  Brain,
  LineChart,
  BookOpen,
  ArrowRight,
  Menu,
  X,
} from 'lucide-react';
import Auth from '../Authentification/Auth';
import Modal from '../Authentification/Modal';

const MainComponent = () => {
  const [isModalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false); // State for mobile menu toggle

  const stats = [
    { label: 'Active Learners', value: '10,000+' },
    { label: 'Questions Answered', value: '1M+' },
    { label: 'Success Rate', value: '94%' },
    { label: 'Subjects Covered', value: '50+' },
  ];

  const features = [
    {
      icon: <Brain className="icon" />,
      title: 'AI-Powered Learning',
      description:
        'Personalized learning experience adapted to your pace and style.',
    },
    {
      icon: <MessageCircle className="icon" />,
      title: '24/7 AI Tutor',
      description: 'Get instant help and explanations whenever you need them.',
    },
    {
      icon: <LineChart className="icon" />,
      title: 'Progress Tracking',
      description: 'Visual insights into your learning journey and improvements.',
    },
  ];

  const subjects = [
    'Mathematics',
    'Deep Learning',
    'Machine Learning',
    'UI & UI',
    'Data Analysis',
    'Generative AI',
  ];

  const handleOpenModal = (content) => {
    setModalContent(content);
    setModalOpen(true);
  };

  return (
    <div className="homepage">
      {/* Navigation */}
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-brand">
            <Brain className="brand-icon" />
            <span className="brand-name">EduAI</span>
          </div>
          <button
            className="hamburger"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="hamburger-icon" /> : <Menu className="hamburger-icon" />}
          </button>
          <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
            <a href="#features" onClick={() => setMenuOpen(false)}>Courses</a>
            <a href="#subjects" onClick={() => setMenuOpen(false)}>Exercises</a>
            <button
              className="btn btn-outline"
              onClick={() => {
                setMenuOpen(false);
                handleOpenModal(<Auth isLogin />);
              }}
            >
              Log In
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                setMenuOpen(false);
                handleOpenModal(<Auth />);
              }}
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)}>
        {modalContent}
      </Modal>

      {/* Rest of the content */}
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <h1 className="hero-title">
            Learn Smarter with
            <span className="highlight">AI-Powered</span>
            <br />
            Personal Tutor
          </h1>
          <p className="hero-subtitle">
            Experience personalized learning with our advanced AI tutor. Get
            instant help, practice problems, and track your progress in
            real-time.
          </p>
          <div className="hero-buttons">
            <button className="btn btn-primary btn-large">
              Start Learning Now
              <ArrowRight className="btn-icon" />
            </button>
            <button className="btn btn-outline btn-large">Watch Demo</button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats">
        <div className="container">
          <div className="stats-grid">
            {stats.map((stat, index) => (
              <div key={index} className="stat-item">
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features">
        <div className="container">
          <h2 className="section-title">
            Why Choose Our AI Learning Platform?
          </h2>
          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Subjects Section */}
      <section id="subjects" className="subjects">
        <div className="container">
          <h2 className="section-title">Available Subjects</h2>
          <div className="subjects-grid">
            {subjects.map((subject, index) => (
              <div key={index} className="subject-card">
                <BookOpen className="subject-icon" />
                <span className="subject-name">{subject}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-column">
              <h3>Platform</h3>
              <ul>
                <li><a href="#">Features</a></li>
                <li><a href="#">Subjects</a></li>
                <li><a href="#">Pricing</a></li>
              </ul>
            </div>
            <div className="footer-column">
              <h3>Resources</h3>
              <ul>
                <li><a href="#">Blog</a></li>
                <li><a href="#">Tutorials</a></li>
                <li><a href="#">FAQs</a></li>
              </ul>
            </div>
            <div className="footer-column">
              <h3>Company</h3>
              <ul>
                <li><a href="#">About</a></li>
                <li><a href="#">Careers</a></li>
                <li><a href="#">Contact</a></li>
              </ul>
            </div>
            <div className="footer-column">
              <h3>Legal</h3>
              <ul>
                <li><a href="#">Privacy</a></li>
                <li><a href="#">Terms</a></li>
                <li><a href="#">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 EduAI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainComponent;
