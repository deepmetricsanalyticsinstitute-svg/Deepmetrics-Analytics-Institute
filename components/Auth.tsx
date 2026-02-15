import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { View } from '../types';
import { supabase } from '../supabaseClient';

interface AuthProps {
  view: View.LOGIN | View.REGISTER;
  onSwitch: (view: View) => void;
  onAuthSuccess: (name: string, email: string, isAdmin: boolean) => void;
}

export const Auth: React.FC<AuthProps> = ({ view, onSwitch, onAuthSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState(0);

  useEffect(() => {
    if (view === View.REGISTER) {
        let score = 0;
        if (password.length > 0) {
            if (password.length >= 8) score++;
            if (/[A-Z]/.test(password)) score++;
            if (/[0-9]/.test(password)) score++;
            if (/[^A-Za-z0-9]/.test(password)) score++;
        }
        setPasswordStrength(score);
    }
  }, [password, view]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (view === View.LOGIN) {
        // Supabase Login
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.session) {
           const isAdmin = email.toLowerCase() === 'deepmetricsanalyticsinstitute@gmail.com';
           // Try to get name from metadata, fallback to email part
           const userName = data.user.user_metadata?.name || email.split('@')[0];
           onAuthSuccess(userName, email, isAdmin);
        } else {
           setError("Login failed. Please try again.");
        }
      } else {
        // Supabase Register
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name,
            },
          },
        });

        if (error) throw error;

        // Registration Successful
        
        // 1. Prevent Auto-login: If a session was created (e.g. email confirm disabled), sign out immediately.
        if (data.session) {
            await supabase.auth.signOut();
        }

        // 2. Set Success Message
        setSuccessMsg("Your account has been created. Please check your email and verify your address before logging in.");
        
        // 3. Clear password but keep email
        setPassword('');
        
        // 4. Redirect to Login View
        onSwitch(View.LOGIN);
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      let errorMessage = err.message || "An error occurred during authentication.";
      
      // Handle Rate Limit Errors
      if (errorMessage.toLowerCase().includes("rate limit") || errorMessage.toLowerCase().includes("security purposes")) {
          errorMessage = "Too many attempts. Please wait 60 seconds before trying again.";
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="h-12 w-12 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto">
            <span className="text-white font-bold text-2xl">D</span>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {view === View.LOGIN ? 'Sign in to your account' : 'Create your account'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {view === View.LOGIN ? 'Or' : 'Already have an account?'}{' '}
          <button
            onClick={() => {
                setError(null);
                setSuccessMsg(null);
                onSwitch(view === View.LOGIN ? View.REGISTER : View.LOGIN);
            }}
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            {view === View.LOGIN ? 'start a new journey' : 'sign in'}
          </button>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            
            {successMsg && (
                <div className="bg-green-50 p-3 rounded text-sm text-green-700 border border-green-200">
                    {successMsg}
                </div>
            )}

            {error && (
                <div className="bg-red-50 p-3 rounded text-sm text-red-600 border border-red-200">
                    {error}
                </div>
            )}

            {view === View.REGISTER && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <div className="mt-1">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={view === View.LOGIN ? "current-password" : "new-password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

               {/* Password Strength Indicator */}
              {view === View.REGISTER && password.length > 0 && (
                  <div className="mt-2 animate-fade-in">
                    <div className="flex gap-1 h-1">
                       {[1, 2, 3, 4].map((level) => (
                          <div 
                            key={level} 
                            className={`flex-1 rounded-full transition-all duration-300 ${
                                level <= passwordStrength 
                                  ? (passwordStrength <= 2 ? 'bg-red-500' : passwordStrength === 3 ? 'bg-yellow-500' : 'bg-green-500') 
                                  : 'bg-gray-200'
                            }`} 
                          />
                       ))}
                    </div>
                    <div className="flex justify-between items-center mt-2">
                        <p className="text-xs text-gray-400">
                            Min 8 chars, uppercase, number & symbol
                        </p>
                        <p className={`text-xs font-bold transition-colors duration-300 ${
                            passwordStrength <= 2 ? 'text-red-500' : passwordStrength === 3 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                           {passwordStrength <= 1 ? 'Weak' : 
                            passwordStrength === 2 ? 'Fair' : 
                            passwordStrength === 3 ? 'Good' : 'Strong'}
                        </p>
                    </div>
                  </div>
              )}
            </div>

            {view === View.LOGIN && (
                <div className="bg-blue-50 p-3 rounded text-xs text-blue-800">
                   <strong>Tip:</strong> Use <code>deepmetricsanalyticsinstitute@gmail.com</code> to log in as the Institute Owner.
                </div>
            )}

            <div>
              <Button
                type="submit"
                className="w-full"
                isLoading={loading}
              >
                {view === View.LOGIN ? 'Sign in' : 'Register'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};