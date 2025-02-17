import { Loader } from 'lucide-react';
import React from 'react';

const Loading = () => {
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="flex flex-col items-center">
        <Loader className="animate-spin w-16 h-16 text-green-600" />
        <p className="mt-4 text-xl text-gray-600">System Loading...</p>
      </div>
    </div>
  );
};

export default Loading;
