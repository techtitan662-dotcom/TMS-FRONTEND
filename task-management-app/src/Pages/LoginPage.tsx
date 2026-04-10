import { Link, useNavigate } from "react-router";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { authService } from "../Services/User.Services";
import { routepath } from "../Routes/route";
import { Eye, EyeOff, Mail, Lock, LogIn } from "lucide-react";
import { useAppDispatch } from "../Store/hooks";
import { tasksReset } from "../Store/tasksSlice";
import { linkPushDeviceToUser, registerPushDevice } from "../utils/fcm";
import { fetchTasks } from "../Store/tasksSlice";

// Theme colors matching the app
const theme = {
    primary: '#1e3a8a',
    primaryDark: '#0f2a6e',
    primaryLight: '#3b82f6',
    primaryLighter: '#60a5fa',
    primaryUltralight: '#dbeafe',
};

export default function AuthPage() {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const [showPassword, setShowPassword] = useState(false);

    const isDev = Boolean(import.meta.env.DEV);

    const [loginData, setLoginData] = useState({
        email: "",
        password: "",
    });

    const [errors, setErrors] = useState({
        email: "",
        password: "",
    });

    const [apiError, setApiError] = useState<string>("");
    const [loader, setLoader] = useState<boolean>(false);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            navigate(routepath.dashboard, { replace: true });
        }
    }, [navigate]);

    const validateLogin = () => {
        let valid = true;
        let newErrors: any = { email: "", password: "" };

        if (!loginData.email.trim()) {
            newErrors.email = "Email is required";
            valid = false;
        } else if (!/\S+@\S+\.\S+/.test(loginData.email)) {
            newErrors.email = "Invalid email address";
            valid = false;
        }

        if (!loginData.password.trim()) {
            newErrors.password = "Password is required";
            valid = false;
        } else if (loginData.password.length < 6) {
            newErrors.password = "Password must be at least 6 characters";
            valid = false;
        }

        setErrors(newErrors);
        return valid;
    };

    const handleLoginChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        setLoginData((prev) => ({ ...prev, [name]: value }));

        if (apiError) setApiError("");
        setErrors((prev) => ({ ...prev, [name]: "" }));
    };

    const handleLoginSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!validateLogin()) {
            toast.error("Please fill all the fields correctly");
            return;
        }

        setLoader(true);

        try {
            try {
                await registerPushDevice({ prompt: true, userEmail: loginData.email });
            } catch (e) {
                console.error('Push device register failed:', e);
            }

            const trimmedPayload = {
                email: loginData.email.trim(),
                password: loginData.password.trim(),
            };

            if (isDev) console.log("📤 Login attempt for:", trimmedPayload.email);

            const data = await authService.loginUser(trimmedPayload as any);

            if (isDev) console.log("📥 Full API response:", data);

            if (!data.error && data.result?.token) {
                toast.success(data.msg || "Login successful!");

                localStorage.setItem("token", data.result.token);

                if (data.result.user) {
                    const apiUser = data.result.user;
                    const userName = apiUser.name ||
                        apiUser.username ||
                        apiUser.fullName ||
                        apiUser.userName ||
                        trimmedPayload.email.split('@')[0];

                    const userData = {
                        id: apiUser.id || apiUser._id || 'user-' + Date.now(),
                        name: userName,
                        email: apiUser.email || apiUser.userEmail || trimmedPayload.email,
                        role: apiUser.role || data.result.role
                    };

                    if (isDev) console.log("💾 Saving user data:", userData);
                    localStorage.setItem("currentUser", JSON.stringify(userData));
                }

                dispatch(tasksReset());
                // Pre-fetch tasks instantly so Dashboard loads fast without skeleton wait
                dispatch(fetchTasks({ force: true }));

                linkPushDeviceToUser({}).catch(e => {
                    console.error('Push device link failed:', e);
                });

                navigate(routepath.dashboard, { replace: true });

            } else {
                const errorMsg = data.msg || "Invalid credentials";
                setApiError(errorMsg);
                toast.error(errorMsg);
            }
        } catch (err) {
            console.error("🚨 Login error:", err);
            toast.error("Something went wrong. Please try again.");
        }

        setLoader(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex justify-center items-center px-3 py-6">
            <div className={`bg-white w-full max-w-md rounded-lg shadow-lg border border-gray-200 overflow-hidden`}>
                {/* Logo Header - Compact */}
                <div className={`w-full bg-gradient-to-r from-[${theme.primaryDark}] to-[${theme.primary}] flex justify-center items-center py-6`}>
                    <div className="w-full flex justify-center items-center">
                        <img
                            src="/logo.jpg"
                            alt="Company Logo"
                            className="h-20 w-auto max-w-[70%] object-contain"
                            style={{
                                filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
                            }}
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const fallback = document.createElement('div');
                                fallback.className = 'text-white text-xl font-bold text-center';
                                fallback.textContent = 'HM SQUARE SOLUTIONS LLP';
                                e.currentTarget.parentNode?.appendChild(fallback);
                            }}
                        />
                    </div>
                </div>

                {/* Form Content - Compact */}
                <div className="px-5 py-5">
                    <form className="space-y-4" onSubmit={handleLoginSubmit}>
                        {/* Email Field */}
                        <div className="space-y-1.5">
                            <label className="text-gray-700 font-medium text-xs ml-1 block">Email</label>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                    <Mail size={16} />
                                </div>
                                <input
                                    type="email"
                                    name="email"
                                    value={loginData.email}
                                    onChange={handleLoginChange}
                                    placeholder="Enter your email"
                                    className={`w-full pl-9 pr-3 py-2 rounded-lg border text-xs ${errors.email ? "border-red-500 bg-red-50" : "border-gray-200 bg-gray-50"
                                        } focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all duration-200 text-gray-800 placeholder:text-gray-400`}
                                />
                            </div>
                            {errors.email && (
                                <p className="text-red-500 text-[10px] font-medium ml-2 flex items-center gap-1">
                                    <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                    {errors.email}
                                </p>
                            )}
                        </div>

                        {/* Password Field */}
                        <div className="space-y-1.5">
                            <label className="text-gray-700 font-medium text-xs ml-1 block">Password</label>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                    <Lock size={16} />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={loginData.password}
                                    onChange={handleLoginChange}
                                    placeholder="Enter your password"
                                    className={`w-full pl-9 pr-9 py-2 rounded-lg border text-xs ${errors.password ? "border-red-500 bg-red-50" : "border-gray-200 bg-gray-50"
                                        } focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all duration-200 text-gray-800 placeholder:text-gray-400`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="text-red-500 text-[10px] font-medium ml-2 flex items-center gap-1">
                                    <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                    {errors.password}
                                </p>
                            )}
                        </div>

                        {/* API Error Message */}
                        {apiError && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 flex items-start gap-2">
                                <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <div>
                                    <p className="text-red-700 font-medium text-[11px]">Login Failed</p>
                                    <p className="text-red-600 text-[10px] mt-0.5">{apiError}</p>
                                </div>
                            </div>
                        )}

                        {/* Login Button - Compact */}
                        <button
                            type="submit"
                            disabled={loader}
                            className={`w-full bg-[${theme.primary}] hover:bg-[${theme.primaryDark}] 
                                text-white font-semibold py-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow 
                                disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 
                                mt-2 text-xs`}
                        >
                            {loader ? (
                                <>
                                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    <LogIn className="w-3.5 h-3.5" />
                                    Login
                                </>
                            )}
                        </button>

                        {/* Forgot Password & Links - Compact */}
                        <div className="pt-3 border-t border-gray-200 mt-4">
                            <div className="flex justify-center">
                                <Link
                                    to={routepath.forgetPassword}
                                    className="text-blue-600 hover:text-blue-800 font-medium text-[10px] flex items-center gap-1.5 transition-colors"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                    </svg>
                                    Forgot Password?
                                </Link>
                            </div>
                            <div className="mt-3 text-[9px] text-gray-500 text-center flex flex-col gap-0.5">
                                <span>
                                    By logging in you agree to our
                                </span>
                                <div className="flex flex-wrap items-center justify-center gap-1.5">
                                    <Link
                                        to={routepath.termsAndConditions}
                                        className="text-blue-600 hover:text-blue-800 font-medium underline-offset-2 hover:underline text-[9px]"
                                    >
                                        Terms & Conditions
                                    </Link>
                                    <span className="text-gray-400">•</span>
                                    <Link
                                        to={routepath.privacyPolicy}
                                        className="text-blue-600 hover:text-blue-800 font-medium underline-offset-2 hover:underline text-[9px]"
                                    >
                                        Privacy Policy
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}