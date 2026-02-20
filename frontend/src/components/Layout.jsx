import React from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = ({ children }) => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
    const [darkMode, setDarkMode] = React.useState(false); // Default to light mode now
    const location = useLocation();

    // Auto-collapse sidebar on navigation
    React.useEffect(() => {
        setIsSidebarCollapsed(true);
    }, [location.pathname]);

    // Routes where sidebar AND global header should NOT appear
    // Login and Home have their own dedicated layouts/headers in the design.
    // Sidebar/Header is mainly for "Module" views.

    // We can check if path starts with /module
    const isModulePage = location.pathname.startsWith('/module');

    const showSidebar = isModulePage;
    const showHeader = isModulePage;

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200 overflow-hidden">
            {showSidebar && (
                <Sidebar
                    isCollapsed={isSidebarCollapsed}
                    toggleCollapsed={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                />
            )}

            <div className="flex-1 flex flex-col h-full relative overflow-hidden">
                {showHeader && (
                    <Header />
                )}
                <main className="flex-1 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;
