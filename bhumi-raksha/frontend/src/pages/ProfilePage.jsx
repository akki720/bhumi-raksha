import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import * as api from '../api/endpoints';
import { Save, ShieldCheck, ShieldAlert, LogOut, UserCircle2 } from 'lucide-react';

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('bhumi_user') || '{}');
  } catch {
    return {};
  }
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(getStoredUser());
  const [form, setForm] = useState({
    name: getStoredUser().name || '',
    username: getStoredUser().username || '',
    phone: getStoredUser().phone || '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const { user: currentUser } = await api.getMe();
        setUser(currentUser);
        setForm({
          name: currentUser.name || '',
          username: currentUser.username || '',
          phone: currentUser.phone || '',
        });
        localStorage.setItem('bhumi_user', JSON.stringify(currentUser));
      } catch (err) {
        console.error('Failed to load user profile:', err.message);
      }
    };

    loadCurrentUser();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { user: updatedUser } = await api.updateProfile({
        name: form.name,
        username: form.username,
        phone: form.phone,
      });

      setUser(updatedUser);
      localStorage.setItem('bhumi_user', JSON.stringify(updatedUser));
      setMessage('Profile saved successfully.');
    } catch (err) {
      setMessage(err?.response?.data?.message || err?.message || 'Unable to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (err) {
      console.error('Logout error:', err.message);
    } finally {
      localStorage.removeItem('bhumi_token');
      localStorage.removeItem('bhumi_user');
      navigate('/auth', { replace: true });
    }
  };

  return (
    <div className="flex flex-col">
      <Topbar title="Profile" />
      <div className="p-6 max-w-5xl grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">
        <div className="rounded-xl border border-surface-border bg-surface-panel p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sky-500/15 text-sky-300">
              <UserCircle2 size={34} />
            </div>
            <div>
              <p className="text-xl font-semibold text-slate-100">{user.name || 'User Name'}</p>
              <p className="text-sm text-slate-400">@{user.username || 'username'}</p>
            </div>
          </div>

          <div className="mt-5 space-y-3 text-sm text-slate-300">
            <div className="rounded-lg border border-surface-border bg-slate-900/50 p-3">
              <p className="text-slate-400">Role</p>
              <p className="mt-1 font-medium text-sky-300 uppercase">{user.role || 'user'}</p>
            </div>
            <div className="rounded-lg border border-surface-border bg-slate-900/50 p-3">
              <p className="text-slate-400">Status</p>
              <div className="mt-1 flex items-center gap-2 text-emerald-300">
                {user.authorityApproved ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
                <span>{user.role === 'authority' && !user.authorityApproved ? 'Pending approval' : 'Approved'}</span>
              </div>
            </div>
            <div className="rounded-lg border border-surface-border bg-slate-900/50 p-3">
              <p className="text-slate-400">Email</p>
              <p className="mt-1 text-slate-100">{user.email || '—'}</p>
            </div>
            <div className="rounded-lg border border-surface-border bg-slate-900/50 p-3">
              <p className="text-slate-400">Phone</p>
              <p className="mt-1 text-slate-100">{user.phone || 'Not provided'}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-200 transition hover:bg-red-500/15"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>

        <form onSubmit={handleSave} className="rounded-xl border border-surface-border bg-surface-panel p-5">
          <h2 className="mb-4 text-lg font-semibold text-slate-200">Edit profile</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Full name</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Username</label>
              <input
                name="username"
                value={form.username}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-sky-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Phone number</label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {message && (
            <p className="mt-4 text-sm text-sky-300">{message}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:opacity-60"
          >
            <Save size={16} /> {loading ? 'Saving...' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
