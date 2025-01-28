import React, { useState } from 'react';
import axios from 'axios';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isLogin) {
        // Login endpoint
        const response = await axios.post('http://192.168.100.219:8000/token', 
          new URLSearchParams({
            username: username,
            password: password
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        );
        
        // Store token in localStorage

        const { access_token } = response.data;
        localStorage.setItem('token', access_token);
        window.open('/', '_self');
        alert('Login Successful!');
      } else {
        // Register endpoint
        await axios.post('http://192.168.100.219:8000/register', {
          username,
          email,
          password
        });
        
        alert('Registration Successful!');
        setIsLogin(true);
      }
    } catch (error) {
      alert(error.response?.data?.detail || 'An error occurred');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-center mb-6">
        {isLogin ? 'Log In' : 'Sign Up'}
      </h2>
      <form onSubmit={handleSubmit}>
        {!isLogin && (
          <div className="mb-4">
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Enter your username"
              required
            />
          </div>
        )}
        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            {isLogin ? 'Username' : 'Email'}
          </label>
          <input
            id="email"
            type={isLogin ? 'text' : 'email'}
            value={isLogin ? username : email}
            onChange={(e) => isLogin ? setUsername(e.target.value) : setEmail(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder={isLogin ? "Enter your username" : "Enter your email"}
            required
          />
        </div>
        <div className="mb-4">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="Enter your password"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-green-800 text-white py-2 px-4 rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-indigo-500"
        >
          {isLogin ? 'Log In' : 'Sign Up'}
        </button>
      </form>
      <div className="mt-4 text-center">
        <button 
          onClick={() => setIsLogin(!isLogin)}
          className="text-blue-500 hover:underline"
        >
          {isLogin 
            ? 'Need an account? Sign Up' 
            : 'Already have an account? Log In'}
        </button>
      </div>
    </div>
  );
};

export default Auth;