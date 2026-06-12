import React, { useState, useRef, useEffect } from 'react';
import { useCadStore } from '../store/useCadStore';
import { MyProjectsModal } from './MyProjectsModal';

interface HeaderProps {
  projectName: string;
  onProjectNameChange: (name: string) => void;
  onSave: () => void;
  onImportProject: () => void;
  onExportPDF: () => void;
  onImportPlant: () => void;
  onSwitchTo3D: () => void;
  onToggleLegend: () => void;
  onTrash: () => void;
  onUndo: () => void;
  onRedo: () => void;
  activeTab: string;
  onTabChange: (tab: 'cad2d' | 'render3d' | 'unifilar') => void;
}

/* ─── Ícones SVG (18×18, traço 1.7) ───────────────────────── */

const IconOpen = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    <path d="M2 10h20" />
  </svg>
);

const IconSave = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
    <polyline points="17,21 17,13 7,13 7,21" />
    <polyline points="7,3 7,8 15,8" />
  </svg>
);

const IconCloudOpen = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    <path d="M12 11v6m0 0l-3-3m3 3l3-3" />
  </svg>
);

const IconCloudSave = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16.88 9.94A10 10 0 0115 2.5h-1a10 10 0 01-9.88 7.44C1.91 10.36 0 12.95 0 16a8 8 0 008 8h9.6a6.4 6.4 0 006.4-6.4c0-3.32-2.18-6.1-5.12-6.66z" />
    <path d="M12 18v-6m0 0L9 15m3-3l3 3" />
  </svg>
);

const IconPrint = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6,9 6,2 18,2 18,9" />
    <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);

const IconPDF = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14,2 14,8 20,8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

const IconImport = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <polyline points="17,8 12,3 7,8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const Icon3D = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12,2 22,7 22,17 12,22 2,17 2,7" />
    <line x1="12" y1="22" x2="12" y2="12" />
    <line x1="22" y1="7" x2="12" y2="12" />
    <line x1="2" y1="7" x2="12" y2="12" />
  </svg>
);

const IconUnifilar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="9" y1="21" x2="9" y2="9" />
    <circle cx="6" cy="6" r="1" fill="currentColor" />
    <circle cx="15" cy="15" r="1" fill="currentColor" />
  </svg>
);

const IconLegend = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <rect x="3" y="4.5" width="3" height="3" rx="0.5" />
    <rect x="3" y="10.5" width="3" height="3" rx="0.5" />
    <rect x="3" y="16.5" width="3" height="3" rx="0.5" />
  </svg>
);

const IconTrash = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3,6 5,6 21,6" />
    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
  </svg>
);

const IconUndo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1,4 1,10 7,10" />
    <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
  </svg>
);

const IconRedo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23,4 23,10 17,10" />
    <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
  </svg>
);

const IconLogout = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
    <polyline points="16,17 21,12 16,7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

export const Header: React.FC<HeaderProps> = ({
  projectName, onProjectNameChange, onSave, onImportProject, onExportPDF, onImportPlant,
  onSwitchTo3D, onToggleLegend, onTrash, onUndo, onRedo,
  activeTab, onTabChange,
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(projectName);
  const [isModalProjectsOpen, setIsModalProjectsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Zustand
  const { user, logout, saveProjectToDb, currentDbProjectId } = useCadStore();

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    setDraft(projectName);
  }, [projectName]);

  const handleBlur = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== projectName) {
      onProjectNameChange(trimmed);
    } else {
      setDraft(projectName);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { inputRef.current?.blur(); }
    if (e.key === 'Escape') { setDraft(projectName); setEditing(false); }
  };

  const handleCloudSave = async () => {
    const newId = await saveProjectToDb();
    if (newId) {
      alert('Projeto salvo com sucesso no banco de dados da HostGator!');
    } else {
      alert('Erro ao salvar o projeto na nuvem. Verifique sua conexão ou se preencheu o nome.');
    }
  };

  const handleLogout = () => {
    if (confirm('Tem certeza de que deseja sair da sua conta?')) {
      logout();
    }
  };

  return (
    <div className="header-bar">
      {/* ── Esquerda: Nome do Projeto ── */}
      <div className="header-left">
        <div className="header-project-name-wrapper">
          {editing ? (
            <input
              ref={inputRef}
              className="header-title-input"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
            />
          ) : (
            <h1 className="header-title" onClick={() => setEditing(true)} title="Clique para editar o nome do projeto">
              {projectName}
            </h1>
          )}
        </div>
      </div>

      {/* ── Centro: Ícones de Ações de Arquivo ── */}
      <div className="header-center">
        {/* Abrir e Salvar Locais (JSON) */}
        <button className="hdr-icon-btn" onClick={onImportProject} title="Abrir Projeto (.json local)">
          <IconOpen />
        </button>
        <button className="hdr-icon-btn" onClick={onSave} title="Salvar Projeto (.json local)">
          <IconSave />
        </button>

        <div className="hdr-sep" />

        {/* Abrir e Salvar na Nuvem (HostGator MySQL) */}
        <button className="hdr-icon-btn" onClick={() => setIsModalProjectsOpen(true)} title="Abrir do Banco de Dados (Nuvem)">
          <IconCloudOpen />
        </button>
        <button 
          className="hdr-icon-btn" 
          style={{ color: currentDbProjectId ? '#d4af37' : undefined }} 
          onClick={handleCloudSave} 
          title={currentDbProjectId ? "Salvar alterações na Nuvem (Projeto ativo)" : "Salvar como novo projeto na Nuvem"}
        >
          <IconCloudSave />
        </button>

        <div className="hdr-sep" />

        <button className="hdr-icon-btn" onClick={() => window.print()} title="Imprimir">
          <IconPrint />
        </button>
        <button className="hdr-icon-btn hdr-icon-pdf" onClick={onExportPDF} title="Exportar PDF">
          <IconPDF />
        </button>
        <button className="hdr-icon-btn" onClick={onImportPlant} title="Importar Planta (PNG/JPG)">
          <IconImport />
        </button>

        <div className="hdr-sep" />

        <button className="hdr-icon-btn" onClick={onSwitchTo3D} title="Visualizar 3D">
          <Icon3D />
        </button>
        <button className="hdr-icon-btn" onClick={() => onTabChange('unifilar')} title="Diagrama Unifilar">
          <IconUnifilar />
        </button>
        <button className="hdr-icon-btn" onClick={onToggleLegend} title="Legenda">
          <IconLegend />
        </button>
        <span className="hdr-legend-text">LEGENDA</span>

        <div className="hdr-sep" />

        <button className="hdr-icon-btn hdr-icon-danger" onClick={onTrash} title="Limpar Projeto">
          <IconTrash />
        </button>
        <button className="hdr-icon-btn" onClick={onUndo} title="Desfazer (Ctrl+Z)">
          <IconUndo />
        </button>
        <button className="hdr-icon-btn" onClick={onRedo} title="Refazer (Ctrl+Y)">
          <IconRedo />
        </button>
      </div>

      {/* ── Direita: Abas de Navegação e Logout ── */}
      <div className="header-right">
        <button
          className={`hdr-nav-tab ${activeTab === 'cad2d' ? 'active' : ''}`}
          onClick={() => onTabChange('cad2d')}
        >
          Editor 2D
        </button>
        <button
          className={`hdr-nav-tab ${activeTab === 'render3d' ? 'active' : ''}`}
          onClick={() => onTabChange('render3d')}
        >
          3D
        </button>
        <button
          className={`hdr-nav-tab ${activeTab === 'unifilar' ? 'active' : ''}`}
          onClick={() => onTabChange('unifilar')}
        >
          Unifilar
        </button>

        <div className="hdr-sep" />

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#475569', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={user?.name}>
            {user?.name.split(' ')[0]}
          </span>
          <button className="hdr-icon-btn hdr-icon-danger" onClick={handleLogout} title="Fazer Logout / Sair">
            <IconLogout />
          </button>
        </div>
      </div>

      {/* Modal de Projetos na Nuvem */}
      <MyProjectsModal isOpen={isModalProjectsOpen} onClose={() => setIsModalProjectsOpen(false)} />
    </div>
  );
};
