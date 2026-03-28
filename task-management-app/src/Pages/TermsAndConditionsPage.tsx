import { Link } from "react-router";
import { routepath } from "../Routes/route";
import { FileText, Home, Shield, LogIn, Calendar, AlertCircle, Scale, Clock } from "lucide-react";

// Theme colors matching the app
const theme = {
    primary: '#1e3a8a',
    primaryDark: '#0f2a6e',
    primaryLight: '#3b82f6',
    primaryLighter: '#60a5fa',
    primaryUltralight: '#dbeafe',
};

export default function TermsAndConditionsPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="mx-auto max-w-3xl px-3 py-8">
                <div className={`rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden`}>
                    {/* Header Section - Compact */}
                    <div className={`border-b border-gray-200 px-5 py-4 bg-[${theme.primaryUltralight}]`}>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2">
                                <div className={`p-1.5 bg-[${theme.primary}] rounded-lg`}>
                                    <FileText className="h-4 w-4 text-white" />
                                </div>
                                <h1 className="text-lg font-bold tracking-tight text-gray-900">
                                    Terms & Conditions
                                </h1>
                            </div>
                            <p className="text-[11px] text-gray-500">
                                Effective date: {new Date().getFullYear()}
                            </p>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                            <Link
                                to={routepath.home}
                                className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                            >
                                <Home className="h-3 w-3 mr-1.5" />
                                Home
                            </Link>
                            <Link
                                to={routepath.privacyPolicy}
                                className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                            >
                                <Shield className="h-3 w-3 mr-1.5" />
                                Privacy
                            </Link>
                            <Link
                                to={routepath.login}
                                className={`inline-flex items-center justify-center rounded-lg bg-[${theme.primary}] px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition-colors hover:bg-[${theme.primaryDark}]`}
                            >
                                <LogIn className="h-3 w-3 mr-1.5" />
                                Login
                            </Link>
                        </div>
                    </div>

                    {/* Content Section - Compact */}
                    <div className="space-y-5 px-5 py-5 text-[11px] leading-relaxed text-gray-700">
                        <section className="space-y-1.5">
                            <h2 className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
                                <Scale className="h-3.5 w-3.5 text-blue-600" />
                                Acceptance
                            </h2>
                            <p className="text-[11px] text-gray-600">
                                By accessing or using this Task Management System (the "App"), you agree to
                                these Terms & Conditions. If you do not agree, do not use the App.
                            </p>
                        </section>

                        <section className="space-y-1.5">
                            <h2 className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
                                <Shield className="h-3.5 w-3.5 text-blue-600" />
                                Account
                            </h2>
                            <p className="text-[11px] text-gray-600">
                                You are responsible for maintaining the confidentiality of your account and
                                for all activities under your account.
                            </p>
                        </section>

                        <section className="space-y-1.5">
                            <h2 className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
                                <AlertCircle className="h-3.5 w-3.5 text-blue-600" />
                                Permitted use
                            </h2>
                            <p className="text-[11px] text-gray-600">You agree not to:</p>
                            <ul className="list-disc pl-5 text-[11px] text-gray-600 space-y-0.5">
                                <li>Use the App for unlawful activities</li>
                                <li>Attempt to gain unauthorized access to systems or data</li>
                                <li>Interfere with the security or performance of the App</li>
                            </ul>
                        </section>

                        <section className="space-y-1.5">
                            <h2 className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-blue-600" />
                                Google integrations
                            </h2>
                            <p className="text-[11px] text-gray-600">
                                If you connect Google services, you authorize the App to access Google
                                Calendar and Google Tasks data as needed to provide the features you request.
                                You can revoke access at any time from your Google Account permissions.
                            </p>
                        </section>

                        <section className="space-y-1.5">
                            <h2 className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-blue-600" />
                                Availability
                            </h2>
                            <p className="text-[11px] text-gray-600">
                                We may modify, suspend, or discontinue the App (in whole or in part) at any
                                time without notice.
                            </p>
                        </section>

                        <section className="space-y-1.5">
                            <h2 className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
                                <AlertCircle className="h-3.5 w-3.5 text-blue-600" />
                                Disclaimer of warranties
                            </h2>
                            <p className="text-[11px] text-gray-600">
                                The App is provided "as is" and "as available" without warranties of any kind.
                            </p>
                        </section>

                        <section className="space-y-1.5">
                            <h2 className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
                                <Scale className="h-3.5 w-3.5 text-blue-600" />
                                Limitation of liability
                            </h2>
                            <p className="text-[11px] text-gray-600">
                                To the maximum extent permitted by law, we are not liable for any indirect,
                                incidental, special, or consequential damages arising from your use of the App.
                            </p>
                        </section>

                        <section className="space-y-1.5">
                            <h2 className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-blue-600" />
                                Changes
                            </h2>
                            <p className="text-[11px] text-gray-600">
                                We may update these Terms from time to time. Continued use of the App after
                                changes become effective constitutes acceptance of the updated Terms.
                            </p>
                        </section>

                        <section className="space-y-1.5">
                            <h2 className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
                                <Shield className="h-3.5 w-3.5 text-blue-600" />
                                Contact
                            </h2>
                            <p className="text-[11px] text-gray-600">
                                If you have questions about these Terms, contact the app administrator.
                            </p>
                        </section>
                    </div>

                    {/* Footer Note - Compact */}
                    <div className={`px-5 py-3 border-t border-gray-100 bg-[${theme.primaryUltralight}]`}>
                        <p className="text-[9px] text-gray-500 text-center">
                            Last updated: {new Date().toLocaleDateString()}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}