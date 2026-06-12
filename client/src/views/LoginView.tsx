import React, { useState } from 'react';
import { useCadStore } from '../store/useCadStore';

export const LoginView: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  const { login, register, authLoading, authError } = useCadStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);

    if (!email || !password || (isRegister && !name)) {
      setErrorLocal('Por favor, preencha todos os campos.');
      return;
    }

    if (isRegister) {
      const success = await register(name, email, password);
      if (!success) {
        // O erro global da store authError será exibido
      }
    } else {
      const success = await login(email, password);
      if (!success) {
        // O erro global da store authError será exibido
      }
    }
  };

  return (
    <div className="login-view-container">
      <div className="login-glow-bg"></div>
      
      <div className="login-card">
        <div className="login-logo-area">
          <div className="login-logo-circle">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          <h2>Eletric SF</h2>
          <span className="login-subtitle">PRO CAD ENGINE</span>
        </div>

        <h3 className="login-card-title">
          {isRegister ? 'Criar Nova Conta' : 'Acesse sua Conta'}
        </h3>

        {(authError || errorLocal) && (
          <div className="login-error-box">
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{errorLocal || authError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          {isRegister && (
            <div className="login-form-group">
              <label htmlFor="name-input">Nome Completo</label>
              <input
                id="name-input"
                type="text"
                className="login-input"
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={authLoading}
                required
              />
            </div>
          )}

          <div className="login-form-group">
            <label htmlFor="email-input">E-mail Corporativo</label>
            <input
              id="email-input"
              type="email"
              className="login-input"
              placeholder="exemplo@dominio.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={authLoading}
              required
            />
          </div>

          <div className="login-form-group">
            <label htmlFor="password-input">Senha de Acesso</label>
            <input
              id="password-input"
              type="password"
              className="login-input"
              placeholder="Sua senha secreta"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={authLoading}
              required
            />
          </div>

          <button type="submit" className="login-btn-submit" disabled={authLoading}>
            {authLoading ? (
              <span className="login-spinner"></span>
            ) : isRegister ? (
              'Cadastrar e Entrar'
            ) : (
              'Entrar no Sistema'
            )}
          </button>
        </form>

        <div className="login-footer-switch">
          <span>
            {isRegister ? 'Já possui uma conta?' : 'Ainda não tem acesso?'}
          </span>
          <button
            type="button"
            className="login-switch-btn"
            onClick={() => {
              setIsRegister(!isRegister);
              setErrorLocal(null);
            }}
            disabled={authLoading}
          >
            {isRegister ? 'Fazer Login' : 'Cadastre-se grátis'}
          </button>
        </div>
      </div>
    </div>
  );
};
