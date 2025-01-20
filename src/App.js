import React from 'react';
import MainComponent from './components/MainComponent';
import Navbar from './components/Navbar';
import Side from './components/Side';
import './App.css';

export default function App() {
  return (
    <div className="app-container">
      {/* <Side /> */}
      <div className="main-content">
        {/* <Navbar /> */}
        <MainComponent />
      </div>
    </div>
  );
}
