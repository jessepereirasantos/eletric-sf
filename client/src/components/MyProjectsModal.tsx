import React, { useEffect } from 'react';
import { useCadStore } from '../store/useCadStore';

interface MyProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MyProjectsModal: React.FC<MyProjectsModalProps> = ({ isOpen, onClose }) => {
  const { dbProjects, loadProjectsFromDb, loadProjectByIdFromDb, deleteProjectFromDb, currentDbProjectId } = useCadStore();

  useEffect(() => {
    if (isOpen) {
      loadProjectsFromDb();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOpenProject = async (id: number) => {
    if (confirm('Deseja abrir este projeto? Alterações não salvas no projeto atual serão perdidas.')) {
      await loadProjectByIdFromDb(id);
      onClose();
    }
  };

  const handleDeleteProject = async (e: React.MouseEvent, id: number, name: string) => {
    e.stopPropagation();
    if (confirm(`Tem certeza de que deseja excluir o projeto "${name}" permanentemente da nuvem?`)) {
      await deleteProjectFromDb(id);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container" style={{ maxWidth: '650px' }}>
        <div className="modal-header">
          <h3>Projetos na Nuvem (HostGator)</h3>
          <button className="btn-close-modal" onClick={onClose}>&times;</button>
        </div>
        
        <div className="modal-body" style={{ padding: '20px' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Abaixo estão os projetos salvos no seu banco de dados. Você pode abri-los ou excluí-los a qualquer momento.
          </p>

          {dbProjects.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', backgroundColor: 'var(--bg-primary)', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" style={{ marginBottom: '8px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h4 style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                Nenhum projeto salvo na nuvem
              </h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Desenhe na tela e clique no ícone de nuvem no topo para salvar seu primeiro projeto!
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '380px', overflowY: 'auto' }}>
              {dbProjects.map((project) => {
                const isCurrent = project.id === currentDbProjectId;
                return (
                  <div
                    key={project.id}
                    onClick={() => handleOpenProject(project.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      backgroundColor: isCurrent ? 'rgba(212, 175, 55, 0.05)' : 'var(--bg-primary)',
                      border: isCurrent 
                        ? '1px solid rgba(212, 175, 55, 0.4)' 
                        : '1px solid var(--border-color)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = isCurrent ? 'rgba(212, 175, 55, 0.6)' : 'var(--text-secondary)';
                      e.currentTarget.style.backgroundColor = isCurrent ? 'rgba(212, 175, 55, 0.08)' : 'rgba(0, 0, 0, 0.02)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = isCurrent ? 'rgba(212, 175, 55, 0.4)' : 'var(--border-color)';
                      e.currentTarget.style.backgroundColor = isCurrent ? 'rgba(212, 175, 55, 0.05)' : 'var(--bg-primary)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        color: isCurrent ? '#d4af37' : 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        {isCurrent ? (
                          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.5 2.5a.75.75 0 001.137-.089l4-5.6z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <div style={{
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          color: 'var(--text-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          {project.name}
                          {isCurrent && (
                            <span style={{
                              fontSize: '0.65rem',
                              backgroundColor: '#d4af37',
                              color: '#05070a',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              fontWeight: '700'
                            }}>
                              Aberto
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          Atualizado em: {new Date(project.updated_at).toLocaleString('pt-BR')}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleDeleteProject(e, project.id, project.name)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        padding: '6px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.1s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#ef4444';
                        e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--text-secondary)';
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      title="Excluir da Nuvem"
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
