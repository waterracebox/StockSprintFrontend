import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css'; // Vite 提供的基本樣式

// 從環境變數讀取後端 API 的 URL
// Vite 使用 import.meta.env
const API_URL = import.meta.env.VITE_BACKEND_URL;

interface User {
  id: number;
  email: string;
  name: string | null;
  createdAt: string;
}

function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 1. 載入時取得使用者列表
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/users`);
      setUsers(response.data);
      setLoading(false);
    } catch (err) {
      setError('無法載入使用者');
      setLoading(false);
    }
  };

  // 2. 處理建立使用者
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault(); // 防止表單重新整理頁面
    if (!email) {
      setError('Email 是必要的');
      return;
    }

    try {
      setError('');
      const response = await axios.post(`${API_URL}/users`, { email, name });
      // 新增成功後，將新使用者加到列表最前面
      setUsers([response.data, ...users]);
      // 清空輸入框
      setEmail('');
      setName('');
    } catch (err) {
      setError('建立使用者失敗');
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>使用者管理</h1>

        {/* 建立使用者表單 */}
        <form onSubmit={handleCreateUser}>
          <h3>建立新使用者</h3>
          <input
            type="email"
            placeholder="Email (必填)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Name (選填)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button type="submit">Create User</button>
        </form>

        {error && <p style={{ color: 'red' }}>{error}</p>}

        <hr />

        {/* 使用者列表 */}
        <h2>User 列表</h2>
        {loading ? (
          <p>載入中...</p>
        ) : (
          <ul>
            {users.map((user) => (
              <li key={user.id}>
                <strong>{user.name || 'N/A'}</strong> ({user.email})
              </li>
            ))}
          </ul>
        )}
      </header>
    </div>
  );
}

export default App;