import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../api/endpoints';

const initialForm = {
  name: '',
  username: '',
  email: '',
  password: '',
  phone: '',
  department: '',
  role: 'user',
};

export default function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('bhumi_token');
    if (token) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = mode === 'login'
        ? { email: form.email, password: form.password }
        : {
            name: form.name,
            username: form.username,
            email: form.email,
            password: form.password,
            phone: form.phone,
            department: form.department,
            role: form.role,
          };

      const response = mode === 'login' ? await api.login(payload) : await api.register(payload);

      if (response?.token) {
        localStorage.removeItem('bhumi_token');
        localStorage.removeItem('bhumi_user');
        localStorage.setItem('bhumi_token', response.token);
        localStorage.setItem('bhumi_user', JSON.stringify(response.user));
      }

      navigate('/', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-8 text-slate-100 sm:px-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.22),transparent_25%),radial-gradient(circle_at_bottom_right,_rgba(52,211,153,0.18),transparent_30%)]" />
      <div className="animate-float absolute -left-16 top-16 h-48 w-48 rounded-full bg-sky-500/20 blur-3xl" />
      <div className="animate-float absolute bottom-10 right-10 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl [animation-delay:1s]" />

      <div className="relative w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/10 bg-slate-900/75 shadow-[0_30px_80px_rgba(8,47,73,0.42)] backdrop-blur-xl">
        <div className="grid items-center lg:grid-cols-[1.1fr_0.9fr]">
          <div className="hidden bg-[linear-gradient(135deg,rgba(14,116,144,0.25),rgba(15,23,42,0.92))] p-8 lg:flex lg:flex-col lg:justify-between">
            <div>
              <div className="inline-flex items-center rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-sky-200">
                Smart monitoring
              </div>
              <h1 className="mt-6 text-4xl font-bold leading-tight text-white">BHUMI RAKSHA</h1>
              <p className="mt-3 max-w-md text-base text-slate-300">AI-driven landslide awareness for fast, safer response in vulnerable communities.</p>
            </div>

            <div className="mt-10 space-y-4">
              <div className="rounded-2xl border border-sky-400/20 bg-slate-950/30 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-sky-300">Live status</p>
                <p className="mt-2 text-2xl font-bold text-emerald-300">Operational</p>
              </div>
              <div className="flex gap-3 text-sm text-slate-300">
                <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1">Risk alerts</span>
                <span className="rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1">Geo monitoring</span>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-8">
            <div className="mb-6 text-center lg:text-left">
              <h2 className="text-2xl font-bold text-white">{mode === 'login' ? 'Welcome back' : 'Create account'}</h2>
              <p className="mt-2 text-sm text-slate-400">{mode === 'login' ? 'Sign in to continue monitoring risk zones.' : 'Register to access the early warning system.'}</p>
            </div>

            <div className="mb-5 flex rounded-2xl border border-white/10 bg-slate-950/60 p-1">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition ${
                  mode === 'login' ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-[0_10px_30px_rgba(14,116,144,0.35)]' : 'text-slate-300'
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition ${
                  mode === 'register' ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-[0_10px_30px_rgba(14,116,144,0.35)]' : 'text-slate-300'
                }`}
              >
                Register
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <>
                  <div>
                    <label className="mb-1 block text-xs uppercase tracking-[0.18em] text-slate-400">Name</label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
                      placeholder="Enter your name"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs uppercase tracking-[0.18em] text-slate-400">Username</label>
                    <input
                      name="username"
                      value={form.username}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
                      placeholder="Enter username"
                      required
                    />
                  </div>
                </>
              )}

              <div>
                <label className="mb-1 block text-xs uppercase tracking-[0.18em] text-slate-400">Email</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
                  placeholder="name@example.com"
                  required
                />
              </div>

              {mode === 'register' && (
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-[0.18em] text-slate-400">Phone</label>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
                    placeholder="Enter phone number"
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs uppercase tracking-[0.18em] text-slate-400">Password</label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
                  placeholder="Enter password"
                  required
                />
              </div>

              {mode === 'register' && (
                <>
                  <div>
                    <label className="mb-1 block text-xs uppercase tracking-[0.18em] text-slate-400">Role</label>
                    <select
                      name="role"
                      value={form.role}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
                    >
                      <option value="user">User</option>
                      <option value="authority">Authority</option>
                      <option value="field_officer">Field Officer</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  {(form.role === 'authority' || form.role === 'field_officer') && (
                    <div>
                      <label className="mb-1 block text-xs uppercase tracking-[0.18em] text-slate-400">Department / Unit</label>
                      <input
                        name="department"
                        value={form.department}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
                        placeholder={form.role === 'authority' ? 'District Disaster Management' : 'Field Operations Unit'}
                      />
                    </div>
                  )}
                </>
              )}

              {error && <p className="text-sm text-rose-300">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(34,211,238,0.30)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create Account'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
