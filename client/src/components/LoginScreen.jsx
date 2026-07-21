import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Shield } from 'lucide-react';
import { config } from '../config/environment';
import './LoginScreen.css';

const LoginScreen = ({ onAuthSuccess }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Введите пароль');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(config.getApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (data.success) {
        // Store authentication in localStorage
        localStorage.setItem('seedbox_authenticated', 'true');
        localStorage.setItem('seedbox_auth_timestamp', Date.now().toString());
        
        console.log('Авторизация успешна');
        onAuthSuccess();
      } else {
        setError(data.error || 'Не удалось войти');
        setPassword(''); // Clear password on failure
      }
    } catch (err) {
      console.error('Ошибка авторизации:', err);
      setError('Ошибка соединения. Проверьте, запущен ли сервер.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-background">
        <div className="login-container">
          <div className="login-header">
            <Shield size={48} className="login-icon" />
            <h1>Вход в SeedBox</h1>
            <p>Введите пароль для доступа к медиатеке</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="password-input-container">
              <Lock size={20} className="input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль"
                className="password-input"
                disabled={loading}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="toggle-password"
                disabled={loading}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {error && (
              <div className="error-message">
                <span>{error}</span>
              </div>
            )}

            <button 
              type="submit" 
              className="login-button"
              disabled={loading || !password.trim()}
            >
              {loading ? (
                <div className="loading-spinner" />
              ) : (
                <>
                  <Lock size={18} />
                  Войти
                </>
              )}
            </button>
          </form>

          <div className="login-footer">
            <p>Сессия сохранится на этом устройстве</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
