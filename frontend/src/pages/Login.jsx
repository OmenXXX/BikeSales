import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [formData, setFormData] = useState({
        loginName: '',
        password: '',
        center: 'New York' // Default
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const centers = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Miami'];

    // Force remove 'dark' class to ensure light mode
    useEffect(() => {
        document.body.classList.remove('dark');
        document.documentElement.classList.remove('dark');
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (!formData.loginName || !formData.password) {
            setError('Please enter both login name and password.');
            setLoading(false);
            return;
        }

        try {
            await login(formData.loginName, formData.password); // Using AuthContext
            navigate('/home');
        } catch (err) {
            console.error("Login Page Error", err);
            // Handle Firebase Auth Errors nicely
            let msg = "Login failed. Please check your credentials.";
            if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                msg = "Invalid email or password.";
            } else if (err.message) {
                msg = err.message;
            }
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen lg:flex-row bg-white transition-colors duration-500">
            {/* Left Side: Branding & Image */}
            <div className="relative w-full lg:w-[50%] bg-[#5048e5] p-8 md:p-12 flex flex-col justify-center items-center text-center overflow-hidden">
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                    <svg height="100%" width="100%" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern height="40" id="grid" patternUnits="userSpaceOnUse" width="40">
                                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" strokeOpacity="0.3"></path>
                            </pattern>
                        </defs>
                        <rect fill="url(#grid)" height="100%" width="100%"></rect>
                    </svg>
                </div>
                <div className="relative z-10 flex flex-col items-center mb-4">
                    <div className="w-20 h-20 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center mb-10 border border-white/20 shadow-2xl">
                        <span className="material-icons-round text-white text-4xl">precision_manufacturing</span>
                    </div>
                    <h1 className="text-5xl md:text-[64px] font-[900] text-white mb-4 tracking-tight leading-tight">Nexora ERP</h1>
                    <p className="text-white/90 text-lg font-medium max-w-md">Smart Manufacturing & Sales Management Solutions</p>
                </div>
                <div className="mt-8 relative w-full max-w-[440px] hidden md:block group">
                    <div className="absolute -inset-4 bg-white/5 rounded-[2.5rem] blur-2xl group-hover:bg-white/10 transition-all duration-500"></div>
                    <div className="relative p-5 bg-white/10 backdrop-blur-md rounded-[2.5rem] border border-white/20 shadow-2xl">
                        <img
                            alt="Smart Factory"
                            className="rounded-[1.8rem] shadow-inner w-full aspect-square object-cover"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBRr1yUQaM-C0-MSBIfbqrFZd7w31bHfs7VpDwK-cNT4iTIJidAxnXk6BU0Vjh1i2jjESJiLY_zGVXxqsp_L2M_M4YKHjDy4fxA9lCDs-MqC898dNpqr1KrBG227eANn5Dk9rKd8ZT228EESXTMqhG9bqT9gwrOvu4VvGEU4_Bt2WYcU3VDYbXjVsLyMpSROaE26Gl0dHTYG080_uAk2gQf69rZtBA-kPYA6xoBlAhxRnpqlIN8dV7Zpogyh1rk8osGbrv3HPRBx9GP"
                        />
                    </div>
                </div>
            </div>

            {/* Right Side: Login Form */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 bg-[#fcfdfe] relative z-20 transition-colors duration-500">
                <div className="w-full max-w-[460px] bg-white rounded-[2rem] ios-shadow p-10 md:p-14 border border-slate-50">
                    <div className="mb-10 text-left">
                        <h2 className="text-3xl font-[800] text-slate-900 mb-2">Welcome back</h2>
                        <p className="text-slate-400 font-medium text-sm">Please enter your details to sign in</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Login Name -> Email */}
                        <div className="space-y-4">
                            <label htmlFor="email" className="text-[16px] font-[600] text-slate-800 ml-1 pl-[10px]">Email Address</label>
                            <div className="relative group mt-[10px]">
                                <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl group-focus-within:text-primary transition-colors">email</span>
                                <input
                                    id="email"
                                    className="w-full pl-12 pr-4 py-4.5 bg-[#f8fafc] border border-transparent focus:border-primary/20 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-xl transition-all outline-none text-slate-900 placeholder:text-slate-400 font-medium"
                                    placeholder="Enter your email"
                                    type="text"
                                    name="loginName"
                                    autoComplete="username"
                                    value={formData.loginName}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-4">
                            <label htmlFor="password" className="text-[16px] font-[600] text-slate-800 ml-1 pl-[10px]">Password</label>
                            <div className="relative group mt-[10px]">
                                <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl group-focus-within:text-primary transition-colors">lock_outline</span>
                                <input
                                    id="password"
                                    className="w-full pl-12 pr-12 py-4.5 bg-[#f8fafc] border border-transparent focus:border-primary/20 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-xl transition-all outline-none text-slate-900 placeholder:text-slate-400 font-medium"
                                    placeholder="••••••••"
                                    name="password"
                                    autoComplete="current-password"
                                    type={showPassword ? "text" : "password"}
                                    value={formData.password}
                                    onChange={handleChange}
                                />
                                <button
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    <span className="material-icons-round text-xl">{showPassword ? 'visibility' : 'visibility_off'}</span>
                                </button>
                            </div>
                        </div>

                        {/* Center Selection */}
                        <div className="space-y-4">
                            <label className="text-[16px] font-[600] text-slate-800 ml-1 pl-[10px]">Center Selection</label>
                            <div className="relative group mt-[10px]">
                                <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl group-focus-within:text-primary transition-colors">business_center</span>
                                <select
                                    className="w-full pl-12 pr-10 py-4.5 bg-[#f8fafc] border border-transparent focus:border-primary/20 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-xl transition-all outline-none text-slate-900 appearance-none cursor-pointer font-medium"
                                    name="center"
                                    value={formData.center}
                                    onChange={handleChange}
                                >
                                    {centers.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <span className="material-icons-round absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-primary transition-colors">expand_more</span>
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-[13px] font-bold text-center animate-shake">
                                {error}
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            className="w-full py-5 bg-primary text-white font-[800] rounded-2xl shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-[0.98] transition-all flex items-center justify-center space-x-3 disabled:opacity-75 disabled:cursor-not-allowed group"
                            type="submit"
                            disabled={loading}
                        >
                            <span className="text-lg">{loading ? 'Logging in...' : 'Sign In to Nexora'}</span>
                            {!loading && <span className="material-icons-round text-2xl group-hover:translate-x-1 transition-transform">arrow_right_alt</span>}
                        </button>
                    </form>
                </div>

                {/* Footer Links */}
                <div className="mt-12 flex flex-wrap justify-center gap-8 text-[11px] text-slate-400 uppercase-tracking font-[800]">
                    <a className="hover:text-primary transition-colors hover:underline underline-offset-4" href="#">Privacy Policy</a>
                    <a className="hover:text-primary transition-colors hover:underline underline-offset-4" href="#">Terms of Service</a>
                    <a className="hover:text-primary transition-colors hover:underline underline-offset-4" href="#">Help Center</a>
                </div>
            </div>
        </div>
    );
};

export default Login;
