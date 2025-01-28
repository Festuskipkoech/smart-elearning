import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  Container,
  TextField,
  IconButton,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  AppBar,
  Toolbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Paper,
  CircularProgress
} from "@mui/material";
import {
  Send as SendIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Chat as ChatIcon,
  School as SchoolIcon,
  Assignment as AssignmentIcon,
  Build as BuildIcon,
  QuestionAnswer as QuizIcon
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import { FormattedMessage } from "./format.js";
import axios from "axios";

export default function Chatbot() {
  const theme = useTheme();
  const token = localStorage.getItem('token');
  // Chat states
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState(() => {
    const saved = localStorage.getItem('chatHistory');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentChatId, setCurrentChatId] = useState(() => {
    const saved = localStorage.getItem('currentChatId');
    return saved || `chat-${Date.now()}`;
  });
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem(`messages-${currentChatId}`);
    return saved ? JSON.parse(saved) : [{
      type: "bot",
      content: "Hi! I'm your AI tutor. What would you like to learn today?",
      id: "initial",
    }];
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Assessment states
  const [showAssessmentDialog, setShowAssessmentDialog] = useState(true);
  const [assessmentType, setAssessmentType] = useState();
  const [currentTopic, setCurrentTopic] = useState();
  const [completedSubtopics, setCompletedSubtopics] = useState(0);

  // Refs
  const messagesEndRef = useRef(null);
  const responseIdRef = useRef(0);
  const inputRef = useRef(null);
  // Effects
  useEffect(() => {
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
  }, [chatHistory]);

  useEffect(() => {
    localStorage.setItem('currentChatId', currentChatId);
  }, [currentChatId]);

  useEffect(() => {
    localStorage.setItem(`messages-${currentChatId}`, JSON.stringify(messages));
    scrollToBottom();
  }, [messages, currentChatId]);

  // Scroll handling
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleInputFocus = () => {
    if (window.innerWidth <= 768) {
      setTimeout(() => {
        window.scrollTo(0, document.body.scrollHeight);
      }, 100);
    }
  };

  // Chat management functions
  const createNewChat = () => {
    const newChatId = `chat-${Date.now()}`;
    const newChat = {
      id: newChatId,
      title: "New Chat",
      timestamp: Date.now()
    };
    
    setChatHistory(prev => [newChat, ...prev]);
    setCurrentChatId(newChatId);
    setMessages([{
      type: "bot",
      content: "Hello! I'm your AI tutor. What would you like to learn today?",
      id: "initial",
    }]);
    setCompletedSubtopics(0);
    setIsMobileMenuOpen(false);
  };

  const loadChat = (chatId) => {
    const savedMessages = localStorage.getItem(`messages-${chatId}`);
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
      setCurrentChatId(chatId);
      setIsMobileMenuOpen(false);
    }
  };

  const deleteChat = (chatId, e) => {
    e.stopPropagation();
    setChatHistory(prev => prev.filter(chat => chat.id !== chatId));
    localStorage.removeItem(`messages-${chatId}`);
    
    if (currentChatId === chatId) {
      createNewChat();
    }
  };

  const updateChatTitle = (chatId, userInput) => {
    setChatHistory(prev => prev.map(chat => {
      if (chat.id === chatId) {
        const title = userInput.slice(0, 30) + (userInput.length > 30 ? '...' : '');
        return { ...chat, title };
      }
      return chat;
    }));
  };

  // Assessment handling
// Update the checkAssessmentRequirements function


  const handleAssessmentStart = () => {
    setShowAssessmentDialog(false);
    window.location.href = `/${assessmentType}/${currentChatId}`;
    
  };

  // Message handling
// In Chatbot.js - Update the API call

const checkAssessmentRequirements = async (subtopicCount) => {
  try {
    // Ensure token exists
    if (!token) {
      console.error("No authentication token found");
      return;
    }

    // Ensure subtopicCount is a valid number
    const count = Math.max(0, parseInt(subtopicCount) || 0);

    // Make the API call
    const response = await axios.get(
      `http://localhost:8000/api/check-requirements/${count}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const { quiz, exercise, project } = response.data;

    // Update state based on response
    if (quiz) {
      setAssessmentType('quiz');
      setShowAssessmentDialog(true);
    } else if (exercise) {
      setAssessmentType('exercise');
      setShowAssessmentDialog(true);
    } else if (project) {
      setAssessmentType('project');
      setShowAssessmentDialog(true);
    }

  } catch (error) {
    if (error.response?.status === 401) {
      console.error("Authentication token expired or invalid");
      window.location.href = '/login';
    } else if (error.response?.status === 404) {
      console.error("API endpoint not found. Please check the URL and server status.");
    } else {
      console.error("Error checking assessment requirements:", error);
    }
  }
};

// Update the handleResponse function to properly track subtopics
const handleResponse = async (userInput) => {
  try {
    const response = await axios.post("http://localhost:8000/api/generate-subtopics", {
      topic: userInput
    });

    setCurrentTopic(userInput);
    
    // Show subtopics one by one with a delay
    const subtopics = response.data.subtopics;
    for (let i = 0; i < subtopics.length; i++) {
      const subtopic = subtopics[i];
      const messageId = `response-${responseIdRef.current++}`;
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setMessages(prev => [...prev, {
        type: "bot",
        content: `${i + 1}. ${subtopic.title}\n${subtopic.content}`,
        id: messageId
      }]);
    }

    // Update completed subtopics count and check requirements
    const newCount = completedSubtopics + 1;
    setCompletedSubtopics(newCount);
    await checkAssessmentRequirements(newCount);

  } catch (error) {
    console.error("Error:", error);
    throw new Error("Failed to generate response");
  }
};
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userInput = input.trim();
    setInput("");
    setIsLoading(true);

    try {
      setMessages(prev => [...prev, {
        type: "user",
        content: userInput,
        id: `user-${Date.now()}`
      }]);

      if (messages.length <= 2) {
        updateChatTitle(currentChatId, userInput);
      }

      await handleResponse(userInput);
    } catch (error) {
      setMessages(prev => [...prev, {
        type: "bot",
        content: "Sorry, I encountered an error. Please try again.",
        id: `error-${Date.now()}`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Render functions
  const renderAssessmentIcon = () => {
    switch (assessmentType) {
      case 'quiz':
        return <QuizIcon />;
      case 'exercise':
        return <BuildIcon />;
      case 'project':
        return <AssignmentIcon />;
      default:
        return <SchoolIcon />;
    }
  };

  const getAssessmentTitle = () => {
    switch (assessmentType) {
      case 'quiz':
        return 'Quiz Available';
      case 'exercise':
        return 'Practice Exercise Available';
      case 'project':
        return 'Project Available';
      default:
        return 'Assessment Available';
    }
  };

  const getAssessmentDescription = () => {
    switch (assessmentType) {
      case 'quiz':
        return "You've completed enough topics to take a quiz. Ready to test your knowledge?";
      case 'exercise':
        return "Time for some hands-on practice! Ready to apply what you've learned?";
      case 'project':
        return "You've reached a milestone! Ready to work on a project?";
      default:
        return "Ready to check your progress?";
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* Mobile Menu Button */}
      <AppBar position="fixed" sx={{ width: { sm: `calc(100% - 240px)` }, ml: { sm: '240px' } }}>
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            AI Tutor
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Drawer
        variant={window.innerWidth > 600 ? "permanent" : "temporary"}
        open={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        sx={{
          width: 240,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 240,
            boxSizing: 'border-box',
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            <ListItem disablePadding>
              <ListItemButton onClick={createNewChat}>
                <ListItemIcon>
                  <ChatIcon />
                </ListItemIcon>
                <ListItemText primary="New Chat" />
              </ListItemButton>
            </ListItem>
          </List>
          <List>
            {chatHistory.map((chat) => (
              <ListItem
                key={chat.id}
                disablePadding
                secondaryAction={
                  <IconButton edge="end" onClick={(e) => deleteChat(chat.id, e)}>
                    <DeleteIcon />
                  </IconButton>
                }
              >
                <ListItemButton
                  selected={currentChatId === chat.id}
                  onClick={() => loadChat(chat.id)}
                >
                  <ListItemIcon>
                    <ChatIcon />
                  </ListItemIcon>
                  <ListItemText primary={chat.title} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* Main Chat Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          height: '100vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          pt: { xs: 8, sm: 9 }
        }}
      >
        {/* Messages Container */}
        <Container
          sx={{
            flexGrow: 1,
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            py: 2
          }}
        >
          {messages.map((message) => (
            <Paper
              key={message.id}
              elevation={1}
              sx={{
                p: 2,
                maxWidth: '80%',
                alignSelf: message.type === 'bot' ? 'flex-start' : 'flex-end',
                bgcolor: message.type === 'bot' ? 'background.paper' : 'primary.main',
                color: message.type === 'bot' ? 'text.primary' : 'primary.contrastText'
              }}
            >
              {message.type === 'bot' ? (
                <FormattedMessage content={message.content} />
              ) : (
                <Typography>{message.content}</Typography>
              )}
            </Paper>
          ))}
          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress />
            </Box>
          )}
          <div ref={messagesEndRef} />
        </Container>

        {/* Input Area */}
        <Paper
          elevation={3}
          sx={{
            p: 2,
            borderTop: 1,
            borderColor: 'divider'
          }}
        >
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              multiline
              maxRows={4}
              sx={{ bgcolor: 'background.paper' }}
            />
            <IconButton
              color="primary"
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
            >
              <SendIcon />
            </IconButton>
          </Box>
        </Paper>
      </Box>

      {/* Assessment Dialog */}
      <Dialog
        open={showAssessmentDialog}
        onClose={() => setShowAssessmentDialog(false)}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {renderAssessmentIcon()}
          {getAssessmentTitle()}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {getAssessmentDescription()}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAssessmentDialog(false)}>
            Later
          </Button>
          <Button onClick={handleAssessmentStart} variant="contained">
            Start Now
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}