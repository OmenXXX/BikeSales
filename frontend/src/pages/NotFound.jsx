import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Home } from 'lucide-react';

const NotFound = () => {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center animate-fade-in">
            <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-full mb-6">
                <AlertCircle size={64} className="text-red-500" />
            </div>
            <h1 className="text-4xl font-bold mb-2 text-gray-900 dark:text-white">404</h1>
            <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">Page Not Found</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">
                The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
            </p>
            <button
                onClick={() => navigate('/home')}
                className="btn btn-primary flex items-center gap-2"
            >
                <Home size={18} />
                Return to Home
            </button>
        </div>
    );
};

export default NotFound;
