
import React, { useState } from 'react';
import { User } from '../types';
import { loginStandardUser } from '../services/api';
import { loginLiff } from '../services/liff';
import { Trophy, User as UserIcon, Lock, Loader2 } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [loginMethod, setLoginMethod] = useState<'line' | 'standard'>('line');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLineLogin = () => {
    loginLiff();
  };

  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    
    try {
        const user = await loginStandardUser(username, password);
        if (user) {
            onLoginSuccess(user);
        } else {
            setLoginError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        }
    } catch (err) {
        setLoginError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
        setIsLoggingIn(false);
    }
  };

  return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center px-4 font-kanit">
        <div className="max-w-md w-full mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-blue-600 p-6 text-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <Trophy className="w-8 h-8 text-blue-600" />
                </div>
                <h1 className="text-2xl font-bold text-white">CompManager</h1>
                <p className="text-blue-100 text-sm mt-1">เข้าสู่ระบบผู้ดูแล / กรรมการ</p>
            </div>

            <div className="p-6">
                <div className="flex border-b border-gray-200 mb-6">
                    <button 
                        className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${loginMethod === 'line' ? 'border-[#06C755] text-[#06C755]' : 'border-transparent text-gray-500'}`}
                        onClick={() => setLoginMethod('line')}
                    >
                        LINE Login
                    </button>
                    <button 
                        className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${loginMethod === 'standard' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}
                        onClick={() => setLoginMethod('standard')}
                    >
                        เข้าระบบทั่วไป
                    </button>
                </div>

                {loginMethod === 'line' ? (
                    <div className="text-center py-4">
                        <p className="text-gray-500 mb-6 text-sm">เข้าใช้งานสะดวกรวดเร็วผ่านบัญชี LINE ของคุณ</p>
                        <button 
                            onClick={handleLineLogin}
                            className="w-full bg-[#06C755] hover:bg-[#05b34c] text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center transition-colors shadow-sm"
                        >
                            <span className="mr-2 font-bold">Log in with LINE</span>
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleStandardLogin} className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">ชื่อผู้ใช้งาน (Username)</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <UserIcon className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    required
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">รหัสผ่าน (Password)</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        {loginError && (
                            <div className="text-red-500 text-xs text-center">{loginError}</div>
                        )}

                        <button 
                            type="submit"
                            disabled={isLoggingIn}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center transition-colors shadow-sm disabled:opacity-70"
                        >
                            {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : 'เข้าสู่ระบบ'}
                        </button>
                    </form>
                )}
                
                <div className="mt-6 text-center">
                    <button onClick={() => { window.location.hash = '#/dashboard'; }} className="text-sm text-gray-500 hover:underline">
                        กลับหน้าหลัก
                    </button>
                </div>
            </div>
        </div>
      </div>
  );
};

export default LoginScreen;
