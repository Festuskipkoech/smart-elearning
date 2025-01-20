import React, { useState } from 'react';
import { Search, X } from 'lucide-react';

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      <nav className="flex items-center px-4 py-2 bg-white shadow-sm fixed w-full top-0 z-50">
        {/* Pinterest Logo */}
        <div className="flex items-center mr-4">
          <svg className="w-8 h-8 text-red-600" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0a12 12 0 0 0-4.83 23c-.03-.9-.05-2.27.02-3.26.1-.9.53-4.34.53-4.34s-.13-.27-.13-.67c0-.63.36-1.1.82-1.1.39 0 .57.3.57.65 0 .4-.25 1-.39 1.55-.11.46.23.84.7.84.84 0 1.49-.89 1.49-2.17 0-1.14-.77-1.94-1.87-1.94-1.27 0-2.02.96-2.02 1.95 0 .39.14.8.32 1.03.03.04.04.08.03.12l-.12.5c-.02.08-.07.1-.16.06-.6-.28-1.8-1.14-1.8-2.59 0-1.51 1.08-2.89 3.13-2.89 1.64 0 2.92 1.17 2.92 2.73 0 1.63-1.03 2.94-2.46 2.94-.48 0-.93-.25-1.09-.54 0 0-.24.91-.3 1.13-.11.41-.4.92-.6 1.23A12 12 0 1 0 12 0z"/>
          </svg>
        </div>

        {/* Navigation Items - Desktop */}
        <div className="hidden md:flex space-x-2">
          <button className="px-4 py-2 font-semibold hover:bg-gray-100 rounded-full">
            Home
          </button>
          <button className="px-4 py-2 font-semibold hover:bg-gray-100 rounded-full">
            Courses
          </button>
          <button className="px-4 py-2 font-semibold hover:bg-gray-100 rounded-full">
            Exercises
          </button>
        </div>

        {/* Search Bar */}
        <div className="flex-1 mx-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search for courses..."
              className="w-full px-4 py-2 bg-gray-100 rounded-full pl-10 focus:outline-none focus:bg-gray-200"
            />
            <Search className="absolute left-3 top-2.5 text-gray-500 w-5 h-5" />
          </div>
        </div>

        {/* Auth Buttons - Desktop */}
        <div className="hidden md:flex items-center space-x-2">
          <button className="px-4 py-2 font-semibold hover:bg-gray-100 rounded-full">
            Log in
          </button>
          <button className="px-4 py-2 font-semibold bg-gray-900 text-white rounded-full hover:bg-gray-800">
            Sign up
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 hover:bg-gray-100 rounded-full md:hidden"
        >
          {isMobileMenuOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-white md:hidden" style={{ top: '56px' }}>
          <div className="flex flex-col p-4 space-y-4">
            <button className="w-full text-left px-4 py-2 font-semibold hover:bg-gray-100 rounded-lg">
              Home
            </button>
            <button className="w-full text-left px-4 py-2 font-semibold hover:bg-gray-100 rounded-lg">
              Courses
            </button>
            <button className="w-full text-left px-4 py-2 font-semibold hover:bg-gray-100 rounded-lg">
              Exercises
            </button>
            <div className="border-t border-gray-200 pt-4">
              <button className="w-full px-4 py-2 font-semibold hover:bg-gray-100 rounded-lg">
                Log in
              </button>
              <button className="w-full mt-2 px-4 py-2 font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-800">
                Sign up
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;