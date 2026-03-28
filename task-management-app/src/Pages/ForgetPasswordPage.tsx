import { useState } from "react";
import { authService } from "../Services/User.Services";
import toast from "react-hot-toast";
import { useNavigate } from "react-router";
import { routepath } from "../Routes/route";

// Theme colors matching the app
const theme = {
    primary: '#1e3a8a',
    primaryDark: '#0f2a6e',
    primaryLight: '#3b82f6',
    primaryLighter: '#60a5fa',
    primaryUltralight: '#dbeafe',
};

export default function ForgotPassword() {
    const [email, setEmail] = useState<string>("");
    const [error, setError] = useState<string>("");
    const [loader, setLoader] = useState<boolean>(false);
    const [debugOtp, setDebugOtp] = useState<string | null>(null);
    const navigate = useNavigate();
    const isDev = Boolean(import.meta.env.DEV);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!email) {
            setError("Email is required");
            return;
        }

        if (!emailRegex.test(email)) {
            setError("Please enter a valid email address");
            return;
        }

        try {
            setLoader(true);
            const data = await authService.forgetPassword({ email });

            if (isDev) console.log("Response from API:", data);

            if (!data) {
                setError("No response from server. Please try again.");
                setLoader(false);
                return;
            }

            if (data.error === true) {
                setError(data.msg || "Failed to send OTP");
                toast.error(data.msg || "Failed to send OTP");
            } else if (data.success || data.msg) {
                toast.success(data.msg || "OTP sent successfully!");
                setError("");

                if (data.otp) {
                    setDebugOtp(String(data.otp));
                }

                navigate(routepath.verifyOtp, {
                    replace: true,
                    state: { email: email }
                });
            } else {
                setError("Something went wrong. Please try again.");
                toast.error("Something went wrong. Please try again.");
            }

            setLoader(false);

        } catch (error) {
            if (isDev) console.error("Catch block error:", error);
            setError("Network error. Please check your connection.");
            toast.error("Network error. Please check your connection.");
            setLoader(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-3 bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="relative w-full max-w-sm">
                <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
                    {/* Header */}
                    <div className="text-center mb-6">
                        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br from-[${theme.primaryDark}] to-[${theme.primary}] flex items-center justify-center mx-auto mb-3 shadow-sm`}>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="w-5 h-5 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                />
                            </svg>
                        </div>

                        <h1 className="text-xl font-bold text-gray-900 mb-1">
                            Reset Password
                        </h1>
                        <p className="text-xs text-gray-500">
                            Enter your email to receive a verification code
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email Input */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label htmlFor="email" className="block text-xs font-medium text-gray-700">
                                    Email Address
                                </label>
                                <span className="text-[10px] text-gray-400">Required</span>
                            </div>

                            <div>
                                <input
                                    type="email"
                                    id="email"
                                    value={email}
                                    onChange={(event) => {
                                        setEmail(event.target.value);
                                        setError("");
                                    }}
                                    placeholder="you@example.com"
                                    className={`w-full px-3 py-2 bg-white border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all duration-200 placeholder:text-gray-400 ${
                                        error
                                            ? 'border-red-400 focus:ring-red-100 focus:border-red-500'
                                            : `border-gray-200 focus:ring-[${theme.primaryLight}]/20 focus:border-[${theme.primaryLight}]`
                                    }`}
                                    disabled={loader}
                                />
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="flex items-start gap-1.5 text-red-500 text-xs">
                                    <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    <span>{error}</span>
                                </div>
                            )}
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loader}
                            className={`w-full py-2.5 px-4 bg-[${theme.primary}] hover:bg-[${theme.primaryDark}] text-white font-semibold rounded-lg transition-all duration-300 shadow-sm hover:shadow disabled:opacity-70 disabled:cursor-not-allowed text-sm`}
                        >
                            {loader ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Sending Reset Link...</span>
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    <span>Send Reset Link</span>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </span>
                            )}
                        </button>
                    </form>

                    {/* Back to Login */}
                    <div className="mt-6 pt-5 border-t border-gray-100 text-center">
                        <p className="text-xs text-gray-600">
                            Remember your password?{" "}
                            <button
                                onClick={() => navigate(routepath.login)}
                                className="font-semibold text-blue-600 hover:text-blue-800 transition-colors inline-flex items-center gap-1"
                            >
                                Sign in here
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </button>
                        </p>
                    </div>

                    {/* Debug OTP Display */}
                    {debugOtp && (
                        <div className="mt-5 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></div>
                                    <span className="text-[10px] font-semibold text-amber-800 uppercase">Test OTP</span>
                                </div>
                                <span className="text-[10px] text-amber-600">Development Mode</span>
                            </div>
                            <div className="flex items-center justify-center gap-2">
                                <div className="text-lg font-mono font-bold text-amber-900 bg-white/50 px-3 py-1.5 rounded border border-amber-200">
                                    {debugOtp}
                                </div>
                                <button
                                    onClick={() => navigator.clipboard.writeText(debugOtp)}
                                    className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded transition-colors"
                                    title="Copy OTP"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                </button>
                            </div>
                            <p className="text-[10px] text-amber-700 text-center mt-1.5">
                                Use this code if email doesn't arrive
                            </p>
                        </div>
                    )}

                    {/* Footer Note */}
                    <div className="mt-5 text-center">
                        <p className="text-[10px] text-gray-400 flex items-center justify-center gap-1">
                            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                            Your information is securely encrypted
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}