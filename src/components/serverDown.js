import React from 'react';

const ServerDown = () => {
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="text-center p-6 bg-white rounded-lg shadow-lg max-w-lg w-full">
        <h2 className="text-3xl font-bold text-green-600 mb-4">Service Unavailable !!</h2>
        <p className="text-lg text-gray-700 mb-6">
          Our AI service is temporarily unavailable due to server maintainance. Please try again later.
        </p>
        {/* <div className="mt-4">
          <button className="bg-red-600 text-white px-6 py-3 rounded-full hover:bg-red-700 transition duration-200">
            Go Back
          </button>
        </div> */}
      </div>
    </div>
  );
};

export default ServerDown;
