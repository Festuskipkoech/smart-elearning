import React, { useState } from 'react';
import axios from 'axios';
import { LogIn, UserPlus } from 'lucide-react';
import { useUser } from '../store/userStore';


const Auth = () => {
  const { setUser } = useUser();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [subject, setSubject] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const API_BASE_URL = 'http://localhost:8000/api/v1';

    try {
      if (isLogin) {
        // Login endpoint
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);

        const response = await axios.post(
          `${API_BASE_URL}/token`, 
          formData,
          {
            headers: { 
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        );
  
        const { access_token } = response.data;
        localStorage.setItem('token', access_token);
        localStorage.setItem('username', username);
  
        alert('Login Successful!');
        window.location.href = '/';
      } else {
        // Registration endpoint
        const response = await axios.post(`${API_BASE_URL}/register`, {
          username: username,
          email: email,
          password: password,
          subject: subject
        });
        const user =response.data.id
        console.log(user)
        // const user_data = setUser(JSON.stringify(user))
        alert('Registration Successful!');
        setIsLogin(true);
        localStorage.setItem('user', JSON.stringify(user));
        console.log(user)
      }
    } catch (error) {
      console.error('Authentication error:', error.response?.data);
      alert(error.response?.data?.detail || 'An error occurred');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 flex items-center justify-center gap-2">
            {isLogin ? (
              <>
                <LogIn className="text-blue-600" /> Log In
              </>
            ) : (
              <>
                <UserPlus className="text-green-600" /> Sign Up
              </>
            )}
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">
                {isLogin ? 'Username' : 'Username'}
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Username"
              />
            </div>
            {!isLogin && (
              <>
                <div>
                  <label htmlFor="email" className="sr-only">Email</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="Email address"
                  />
                </div>
                <div>
                  <label htmlFor="subject" className="sr-only">Learning Subject</label>
                  <input
                    id="subject"
                    name="subject"
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="Learning Subject (e.g., Python, Math)"
                  />
                </div>
              </>
            )}
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {isLogin ? 'Log In' : 'Sign Up'}
            </button>
          </div>
        </form>

        <div className="text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="mt-2 text-sm text-indigo-600 hover:text-indigo-500"
          >
            {isLogin 
              ? 'Need an account? Sign Up' 
              : 'Already have an account? Log In'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;