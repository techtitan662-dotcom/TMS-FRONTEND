import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { routepath } from "../Routes/route";
import { authService } from "../Services/User.Services";
import toast from "react-hot-toast";
import { Lock, KeyRound, Shield, CheckCircle, ArrowLeft } from "lucide-react";

// Theme colors matching the app
const theme = {
    primary: '#1e3a8a',
    primaryDark: '#0f2a6e',
    primaryLight: '#3b82f6',
    primaryLighter: '#60a5fa',
    primaryUltralight: '#dbeafe',
};

export default function ChangePasswordPage() {
    const [newPass, setNewPass] = useState("");
    const [confirmPass, setConfirmPass] = useState("");
    const [error, setError] = useState("");
    const [loader, setLoader] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        if (!location.state || !location.state.email) {
            navigate(routepath.login, { replace: true });
        }
    }, [location.state, navigate]);

    const handleSubmit = async (e: any) => {
        e.preventDefault();

        if (!newPass || !confirmPass) {
            setError("All fields are required");
            return;
        }

        if (newPass.length < 6) {
            setError("Password must be at least 6 characters long");
            return;
        }

        if (newPass !== confirmPass) {
            setError("Passwords do not match");
            return;
        }

        setError("");
        setLoader(true);

        try {
            const email = location.state?.email;
            const response = await authService.changePassword({
                email,
                newPassword: newPass,
            });

            if (!response) {
                setError("No response from server. Please try again.");
                toast.error("No response from server. Please try again.");
                setLoader(false);
                return;
            }

            if (response.error) {
                const msg = response.msg || "Error changing password";
                setError(msg);
                toast.error(msg);
            } else {
                const msg = response.msg || "Password changed successfully";
                toast.success(msg);
                setError("");
                navigate(routepath.login, { replace: true });
            }
        } catch (err) {
            setError("Something went wrong. Please try again.");
            toast.error("Something went wrong. Please try again.");
        }

        setLoader(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-3">
            <div className="relative w-full max-w-sm">
                {/* Card Container */}
                <div className={`bg-white rounded-lg shadow-md border border-gray-200 p-5 transition-all duration-300`}>
                    {/* Header */}
                    <div className="text-center mb-5">
                        <div className="relative inline-block mb-3">
                            <div className={`w-12 h-12 rounded-lg bg-gradient-to-br from-[${theme.primaryDark}] to-[${theme.primary}] flex items-center justify-center shadow-sm`}>
                                <KeyRound className="w-5 h-5 text-white" />
                            </div>
                        </div>

                        <h2 className="text-lg font-bold text-gray-900 mb-1">
                            Change Password
                        </h2>
                        <p className="text-[11px] text-gray-500">
                            Set a new password for your account
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 flex items-start gap-1.5">
                                <svg className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <span className="text-[11px] text-red-700">{error}</span>
                            </div>
                        )}

                        {/* New Password */}
                        <div>
                            <label className="block text-[11px] font-medium text-gray-700 mb-1">
                                New Password
                            </label>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                    <Lock className="h-3.5 w-3.5" />
                                </div>
                                <input
                                    type={showNewPassword ? "text" : "password"}
                                    value={newPass}
                                    onChange={(e) => setNewPass(e.target.value)}
                                    placeholder="Enter new password"
                                    className="w-full pl-9 pr-9 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showNewPassword ? (
                                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        </svg>
                                    ) : (
                                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-[11px] font-medium text-gray-700 mb-1">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                    <CheckCircle className="h-3.5 w-3.5" />
                                </div>
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={confirmPass}
                                    onChange={(e) => setConfirmPass(e.target.value)}
                                    placeholder="Re-enter password"
                                    className="w-full pl-9 pr-9 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showConfirmPassword ? (
                                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        </svg>
                                    ) : (
                                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Password Hint */}
                        <p className="text-[9px] text-gray-400 mt-1">
                            Password must be at least 6 characters long
                        </p>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loader}
                            className={`w-full py-2 px-4 bg-[${theme.primary}] hover:bg-[${theme.primaryDark}] text-white font-semibold rounded-lg transition-all duration-300 shadow-sm hover:shadow disabled:opacity-70 disabled:cursor-not-allowed text-xs mt-2`}
                        >
                            {loader ? (
                                <span className="flex items-center justify-center gap-1.5">
                                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Updating...</span>
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-1.5">
                                    <Lock className="w-3.5 h-3.5" />
                                    <span>Update Password</span>
                                </span>
                            )}
                        </button>

                        {/* Back to Login Link */}
                        <div className="pt-3 text-center">
                            <button
                                type="button"
                                onClick={() => navigate(routepath.login)}
                                className="inline-flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-700 transition-colors"
                            >
                                <ArrowLeft className="w-3 h-3" />
                                Back to Login
                            </button>
                        </div>
                    </form>

                    {/* Footer Note */}
                    <div className="mt-4 pt-3 border-t border-gray-100 text-center">
                        <p className="text-[9px] text-gray-400 flex items-center justify-center gap-1">
                            <Shield className="w-2.5 h-2.5" />
                            Your password is securely encrypted
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}