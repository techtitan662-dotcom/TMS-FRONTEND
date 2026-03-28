import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import { routepath } from "../Routes/route";
import { authService } from "../Services/User.Services";
import type { OtpverifyPayload } from "../Types/Types";
import toast from "react-hot-toast";
import { Mail, Clock, RefreshCw, Shield, KeyRound } from "lucide-react";

// Theme colors matching the app
const theme = {
    primary: '#1e3a8a',
    primaryDark: '#0f2a6e',
    primaryLight: '#3b82f6',
    primaryLighter: '#60a5fa',
    primaryUltralight: '#dbeafe',
};

export default function OtpVerifyPage() {
    const [email, setEmail] = useState<string>("");
    const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
    const [timer, setTimer] = useState<number>(120);
    const [error, setError] = useState<string>("");
    const [loader, setLoader] = useState<boolean>(false);

    const inputRefs = useRef<HTMLInputElement[]>([]);

    const isDev = Boolean(import.meta.env.DEV);

    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        if (!location.state || !location.state.email) {
            navigate(routepath.login, { replace: true });
            return;
        }
        setEmail(location.state.email);
    }, [location.state, navigate]);

    useEffect(() => {
        if (timer <= 0) return;

        const t = setInterval(() => {
            setTimer(prev => prev - 1);
        }, 1000);

        return () => clearInterval(t);
    }, [timer]);

    const formatTimer = (sec: number) => {
        const mins = Math.floor(sec / 60);
        const secs = sec % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleOtpChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;

        const copy = [...otp];
        copy[index] = value;
        setOtp(copy);
        setError("");

        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").slice(0, 6);

        if (!/^\d+$/.test(pasted)) return;

        const digits = pasted.split("");
        setOtp(digits);

        inputRefs.current[Math.min(digits.length, 5)]?.focus();
    };

    const handleResend = async (e: any) => {
        e.preventDefault();
        try {
            const data = await authService.forgetPassword({ email });
            if (!data.error) {
                toast.success(data.msg);
                setTimer(120);
                setError("");
            } else {
                setError(data.msg);
            }
        } catch (error) {
            if (isDev) console.log("something went wrong");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const otpString = otp.join("");

        if (otpString.length !== 6) {
            setError("Please enter a valid 6-digit OTP");
            return;
        }
        const payload: OtpverifyPayload = {
            email: email,
            OTP: otpString
        }
        try {
            setLoader(true);
            const data = await authService.otpVerify(payload);

            if (!data.error) {
                toast.success(data.msg || "OTP verified successfully");
                navigate(routepath.changePassword, {
                    replace: true,
                    state: { email }
                });
            } else {
                setError(data.msg || "Invalid OTP");
                toast.error(data.msg || "Invalid OTP");
            }
        } catch (error) {
            toast.error("Something went wrong. Try again!");
        }

        setLoader(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-3">
            <div className="relative w-full max-w-sm">
                <div className={`bg-white rounded-lg shadow-md border border-gray-200 p-5 transition-all duration-300`}>
                    {/* Header */}
                    <div className="flex flex-col items-center text-center mb-5">
                        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br from-[${theme.primaryDark}] to-[${theme.primary}] flex items-center justify-center shadow-sm mb-3`}>
                            <KeyRound className="w-5 h-5 text-white" />
                        </div>

                        <h2 className="text-lg font-bold text-gray-900 mb-1">
                            Verify Your OTP
                        </h2>
                        <p className="text-[11px] text-gray-500">
                            A 6-digit code has been sent to your email
                        </p>
                        <div className="flex items-center gap-1.5 mt-2 text-[10px] text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
                            <Mail className="w-3 h-3" />
                            <span className="truncate max-w-[180px]">{email}</span>
                        </div>
                    </div>

                    <form className="space-y-4" onSubmit={handleSubmit}>
                        {/* OTP Input Fields */}
                        <div className="flex justify-center gap-2">
                            {otp.map((digit, index) => (
                                <input
                                    key={index}
                                    value={digit}
                                    ref={(el) => {
                                        if (el) inputRefs.current[index] = el;
                                    }}
                                    type="text"
                                    maxLength={1}
                                    inputMode="numeric"
                                    onChange={(e) => handleOtpChange(index, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(index, e)}
                                    onPaste={index === 0 ? handlePaste : undefined}
                                    className={`w-10 h-10 text-center text-sm font-semibold border-b-2 
                                    focus:border-[${theme.primaryLight}] focus:outline-none transition-all
                                    ${error ? 'border-red-500' : 'border-gray-200 hover:border-gray-300'}`}
                                />
                            ))}
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-2 flex items-start gap-1.5">
                                <svg className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <span className="text-[11px] text-red-700">{error}</span>
                            </div>
                        )}

                        {/* Timer and Resend */}
                        <div className="text-center space-y-2 pt-2">
                            <div className="flex items-center justify-center gap-2 text-[11px] text-gray-600">
                                <Clock className="w-3 h-3 text-gray-400" />
                                <span>OTP expires in</span>
                                <span className={`font-semibold ${timer < 30 ? 'text-red-500' : 'text-blue-600'}`}>
                                    {formatTimer(timer)}
                                </span>
                            </div>

                            <div className="flex items-center justify-center gap-2">
                                <span className="text-[11px] text-gray-500">Didn't receive the code?</span>
                                {timer === 0 ? (
                                    <button
                                        type="button"
                                        onClick={handleResend}
                                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                                    >
                                        <RefreshCw className="w-3 h-3" />
                                        Resend OTP
                                    </button>
                                ) : (
                                    <span className="text-[11px] text-gray-400">
                                        Wait {formatTimer(timer)}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loader}
                            className={`w-full py-2 px-4 bg-[${theme.primary}] hover:bg-[${theme.primaryDark}] text-white font-semibold rounded-lg transition-all duration-300 shadow-sm hover:shadow disabled:opacity-70 disabled:cursor-not-allowed text-xs mt-3`}
                        >
                            {loader ? (
                                <span className="flex items-center justify-center gap-1.5">
                                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Verifying...</span>
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-1.5">
                                    <KeyRound className="w-3.5 h-3.5" />
                                    Verify OTP
                                </span>
                            )}
                        </button>

                        {/* Back to Login */}
                        <div className="pt-2 text-center">
                            <button
                                type="button"
                                onClick={() => navigate(routepath.login)}
                                className="text-[10px] text-gray-500 hover:text-gray-700 transition-colors"
                            >
                                ← Back to Login
                            </button>
                        </div>
                    </form>

                    {/* Footer Note */}
                    <div className="mt-4 pt-3 border-t border-gray-100 text-center">
                        <p className="text-[9px] text-gray-400 flex items-center justify-center gap-1">
                            <Shield className="w-2.5 h-2.5" />
                            This code is valid for 2 minutes
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}