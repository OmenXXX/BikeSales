import React, { useState, useEffect, useMemo } from 'react';
import AdminSidebar from '../components/admin/AdminSidebar';
import AdminEmployees from '../components/admin/AdminEmployees';
import EmployeeDetail from '../components/admin/EmployeeDetail';
import AdminCompany from '../components/admin/AdminCompany';
import { getEmployees } from '../api';
import { useAuth } from '../context/AuthContext';

import { checkPermission, getMockUser } from '../utils/security';
import AdminEmployeeListSidebar from '../components/admin/AdminEmployeeListSidebar';
import AdminStructure from '../components/admin/AdminStructure';
import Tooltip from '../components/common/Tooltip';

const Admin = () => {
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
    const [activeView, setActiveView] = useState('employees'); // 'company', 'employees', 'detail', 'structure'
    const [allEmployees, setAllEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [securityState, setSecurityState] = useState({
        status: 'secure', // 'secure', 'warning', 'danger'
        label: 'Secure Access',
        color: 'bg-emerald-500'
    });

    const { userData } = useAuth();
    const loggedInUser = userData ? { fieldData: userData } : null;

    // Pagination & Filter State
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(12); // Default to 12 for 3-column grid
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState({ field: 'Name_Last', order: 'ascend' });
    const [roleFilter, setRoleFilter] = useState('');

    // Patterns used across components
    const carbonFiberStyle = {
        backgroundImage: `
            linear-gradient(45deg, #ffffff 25%, transparent 25%),
            linear-gradient(-45deg, #ffffff 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #ffffff 75%),
            linear-gradient(-45deg, transparent 75%, #ffffff 75%)
        `,
        backgroundSize: '4px 4px',
        backgroundBlendMode: 'overlay',
        opacity: '0.05'
    };

    const primaryColor = "#7393B3";

    useEffect(() => {
        // Dynamic Security Check
        const isHttps = window.location.protocol === 'https:';
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

        if (!isHttps && !isLocal) {
            setSecurityState({
                status: 'danger',
                label: 'Unsecure Connection',
                color: 'bg-rose-500'
            });
        }
    }, []);

    // Auto-collapse sidebar on view change
    useEffect(() => {
        setIsSidebarExpanded(false);
    }, [activeView]);

    useEffect(() => {
        if (allEmployees.length === 0) {
            fetchEmployees();
        }
    }, []);

    const fetchEmployees = async () => {
        setIsLoading(true);
        try {
            // Fetch all records (high limit for client-side filtering)
            const result = await getEmployees({ limit: 1000 });
            setAllEmployees(result.data);
            if (securityState.status !== 'danger') {
                setSecurityState(prev => ({ ...prev, status: 'secure', label: 'Secure Access', color: 'bg-emerald-500' }));
            }
        } catch (error) {
            console.error('Error fetching employees:', error);
            setSecurityState(prev => ({
                ...prev,
                status: 'warning',
                label: 'Link Interrupted',
                color: 'bg-amber-500'
            }));
        } finally {
            setIsLoading(false);
        }
    };

    // Derived State: Filtering & Sorting
    const filteredEmployees = useMemo(() => {
        let result = [...allEmployees];

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(emp =>
                emp.fieldData.Name_First?.toLowerCase().includes(q) ||
                emp.fieldData.Name_Middle?.toLowerCase().includes(q) ||
                emp.fieldData.Name_Last?.toLowerCase().includes(q) ||
                emp.fieldData.EmailAddress?.toLowerCase().includes(q) ||
                emp.fieldData.PhoneNumber?.includes(q)
            );
        }

        if (roleFilter) {
            result = result.filter(emp => emp.fieldData.Role === roleFilter);
        }

        // Sorting
        result.sort((a, b) => {
            const valA = a.fieldData[sortBy.field] || '';
            const valB = b.fieldData[sortBy.field] || '';
            const modifier = sortBy.order === 'ascend' ? 1 : -1;

            if (valA < valB) return -1 * modifier;
            if (valA > valB) return 1 * modifier;
            return 0;
        });

        return result;
    }, [allEmployees, searchQuery, roleFilter, sortBy]);

    // Derived State: Pagination
    const paginatedEmployees = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredEmployees.slice(start, start + pageSize);
    }, [filteredEmployees, currentPage, pageSize]);

    const handleEmployeeClick = (employee) => {
        setSelectedEmployee(employee);
        setActiveView('detail');
        setIsEditing(false);
    };

    if (!loggedInUser) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#f8fafc]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-[#f8fafc] text-slate-900 font-display overflow-hidden">
            <AdminSidebar
                isSidebarExpanded={isSidebarExpanded}
                setIsSidebarExpanded={setIsSidebarExpanded}
                activeView={activeView}
                setActiveView={setActiveView}
                primaryColor={primaryColor}
                carbonFiberStyle={carbonFiberStyle}
                role={loggedInUser.fieldData.Role || 'Staff'}
            />

            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <header className="h-24 bg-white/40 backdrop-blur-sm px-6 md:px-10 flex items-center justify-between border-b border-slate-100 relative z-40">
                    <div className="flex items-center gap-4">
                        {activeView === 'detail' && (
                            <Tooltip text="Return to Staff List">
                                <button
                                    onClick={() => setActiveView('employees')}
                                    className="flex w-10 h-10 rounded-full bg-slate-50 items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
                                >
                                    <span className="material-icons-round">arrow_back</span>
                                </button>
                            </Tooltip>
                        )}
                        <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight capitalize">
                            {activeView === 'detail' ? 'Employee Profile' : (activeView === 'structure' ? 'System Structure' : `${activeView.replace('-', ' ')} Operations`)}
                        </h2>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* User Context Debug (Optional) */}
                        <div className="hidden lg:flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 border border-slate-200">
                            <span className="material-icons-round text-sm text-slate-400">badge</span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                Logged in as: {loggedInUser.fieldData.Role}
                            </span>
                        </div>

                        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full border border-slate-100 shadow-sm transition-all duration-500">
                            <span className={`w-2 h-2 rounded-full animate-pulse ${securityState.color}`}></span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 hidden sm:inline">
                                {securityState.label}
                            </span>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-hidden relative">
                    {/* Background Detail for all views */}
                    <div className="absolute inset-0 pointer-events-none opacity-[0.02]" style={carbonFiberStyle}></div>

                    <div className="absolute inset-0 overflow-y-auto scroll-smooth">
                        {activeView === 'company' && <div className="p-6 md:p-10"><AdminCompany /></div>}

                        {activeView === 'structure' && <AdminStructure primaryColor={primaryColor} />}

                        {activeView === 'employees' && (
                            <div className="p-6 md:p-10 pb-32">
                                <AdminEmployees
                                    employees={paginatedEmployees}
                                    isLoading={isLoading}
                                    handleEmployeeClick={handleEmployeeClick}
                                    primaryColor={primaryColor}
                                    onRefresh={fetchEmployees}
                                    pagination={{
                                        currentPage,
                                        pageSize,
                                        totalRecords: filteredEmployees.length,
                                        setCurrentPage,
                                        setPageSize
                                    }}
                                    filters={{
                                        searchQuery,
                                        setSearchQuery,
                                        roleFilter,
                                        setRoleFilter,
                                        sortBy,
                                        setSortBy
                                    }}
                                />
                            </div>
                        )}

                        {activeView === 'detail' && selectedEmployee && (
                            <div className="flex h-full">
                                {/* Desktop Sidebar - Mini List */}
                                <div className="hidden lg:block w-80 h-full border-r border-slate-100 bg-white z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
                                    <AdminEmployeeListSidebar
                                        employees={filteredEmployees} // Pass filtered list to maintain context
                                        selectedEmployee={selectedEmployee}
                                        onSelectEmployee={(emp) => {
                                            setSelectedEmployee(emp);
                                            setIsEditing(false);
                                        }}
                                        primaryColor={primaryColor}
                                    />
                                </div>

                                {/* Detail Content */}
                                <div className="flex-1 overflow-y-auto h-full p-4 md:p-6 pb-20">
                                    <EmployeeDetail
                                        employee={selectedEmployee}
                                        isEditing={isEditing}
                                        setIsEditing={setIsEditing}
                                        primaryColor={primaryColor}
                                        carbonFiberStyle={carbonFiberStyle}
                                        canEdit={checkPermission(loggedInUser, selectedEmployee.fieldData.Role || 'Staff', 'Edit')}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Admin;
