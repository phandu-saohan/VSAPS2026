import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../App';

type LoginRole = 'Quản trị viên' | 'Thành viên BTC' | 'Tình nguyện viên' | 'Báo cáo viên' | 'Đại biểu' | 'Nhà tài trợ';

const roleRedirects: Record<LoginRole, string> = {
  'Quản trị viên': '/dashboard',
  'Thành viên BTC': '/dashboard',
  'Tình nguyện viên': '/dashboard',
  'Báo cáo viên': '/speakers',
  'Đại biểu': '/submissions',
  'Nhà tài trợ': '/sponsors',
};

const Login: React.FC = () => {
  const { session } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [detectedRole, setDetectedRole] = useState<LoginRole | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError || !data.user) {
        throw signInError || new Error('Đăng nhập thất bại.');
      }

      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      const role = (profileData?.role as LoginRole) || 'Thành viên BTC';
      setDetectedRole(role);

      await supabase
        .from('profiles')
        .update({ last_login: new Date().toISOString() })
        .eq('id', data.user.id);

      navigate(roleRedirects[role], { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Email hoặc mật khẩu không đúng.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center py-12 px-4">
      <div className="w-full max-w-md animate-fade-in-up">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#061D5F] mb-3 tracking-tight uppercase">
            Đăng nhập hệ thống
          </h1>
          <p className="text-gray-500 text-sm md:text-base font-medium">
            Hệ thống sẽ tự động nhận diện vai trò sau khi đăng nhập
          </p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
          {detectedRole && (
            <div className="mb-4 p-3 rounded-lg bg-blue-50 text-blue-800 text-sm font-medium text-center">
              Vai trò tài khoản: {detectedRole}
            </div>
          )}

          {error && <p className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium text-center mb-6">{error}</p>}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="text-sm font-bold text-gray-700 block mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
                placeholder="Nhập email của bạn"
              />
            </div>

            <div>
              <label htmlFor="password" className="text-sm font-bold text-gray-700 block mb-1.5">
                Mật khẩu
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
                placeholder="Nhập mật khẩu của bạn"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm font-medium text-gray-600">
                  Nhớ đăng nhập
                </label>
              </div>
              <a href="#" className="text-sm font-bold text-blue-600 hover:text-blue-800">
                Quên mật khẩu?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-[#061D5F] text-white font-bold rounded-xl hover:bg-blue-900 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:opacity-50 transition-all mt-4"
            >
              {loading ? 'Đang xác thực...' : 'Đăng nhập vào hệ thống'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            Quay lại{' '}
            <Link to="/" className="text-[#061D5F] font-bold hover:underline">
              trang chủ
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        .animate-fade-in-up {
          animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Login;
