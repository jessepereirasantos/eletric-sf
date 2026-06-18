import { useState, useEffect } from 'react';
import { Cad2DView } from './views/Cad2DView';
import { UnifilarView } from './views/UnifilarView';
import { Render3DView } from './views/Render3DView';
import { LoginView } from './views/LoginView';
import { useCadStore } from './store/useCadStore';

function App() {
  const [activeTab, setActiveTab] = useState<'cad2d' | 'render3d' | 'unifilar'>('cad2d');
  const { isAuthenticated, authLoading, loadUserSession } = useCadStore();

  // Verificar se já possui sessão salva no localStorage ao iniciar
  useEffect(() => {
    loadUserSession();
  }, []);

  // Exibe tela de carregamento na validação inicial de token
  if (authLoading && !isAuthenticated) {
    return (
      <div className="login-view-container">
        <div className="login-glow-bg"></div>
        <div className="login-card" style={{ alignItems: 'center', justifyContent: 'center', padding: '60px' }}>
          <div className="login-spinner" style={{ width: '40px', height: '40px', borderWidth: '3px', marginBottom: '16px', borderTopColor: '#d4af37' }}></div>
          <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: '500' }}>Carregando sessão segura...</span>
        </div>
      </div>
    );
  }

  // Se não estiver logado, exibe tela de login
  if (!isAuthenticated) {
    return <LoginView />;
  }

  // Se estiver logado, acessa a aplicação
  return (
    <div className="app-container">
      <main className="app-main">
        {activeTab === 'cad2d' && (
          <Cad2DView
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        )}
        {activeTab === 'render3d' && (
          <Render3DView
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        )}
        {activeTab === 'unifilar' && <UnifilarView />}
      </main>
    </div>
  );
}

export default App;
