import { useCadStore } from '../../../../store/useCadStore';

/** InstructorPanel â€” Exibe instruções dinâmicas para a ferramenta ativa */
export function InstructorPanel() {
  const { activeToolId, activeToolInstructor, activeToolGroup } = useCadStore();

  const toolLabels: Record<string, string> = {
    select:    'Selecionar (Space)',
    line:      'Linha (L)',
    wall:      'Parede',
    rectangle: 'Retângulo (R)',
    circle:    'Círculo (C)',
    eraser:    'Borracha (E)',
    move:      'Mover (M)',
    rotate:    'Rotacionar (Q)',
    scale:     'Escalar (S)',
    push_pull: 'Push/Pull (P)',
    offset:    'Offset (F)',
    measure:   'Fita Métrica (T)',
    device:    'Dispositivo Elétrico',
    conduit:   'Eletroduto',
    area:      'írea',
    dimension: 'Cota',
    text:      'Texto',
  };

  const toolIcon: Record<string, string> = {
    select: 'â†–', line: '/', rectangle: 'â–­', circle: 'â—‹',
    eraser: 'âŒ«', move: 'âœ¥', rotate: 'â†»', scale: 'â¤¢',
    push_pull: 'â¬†', offset: 'âŠŸ', measure: 'ðŸ“',
    wall: 'â–Š', device: 'âš¡', conduit: 'ã€°', area: 'â¬›',
    dimension: 'â†”', text: 'T',
  };

  const steps = activeToolInstructor
    ? activeToolInstructor.split('. ').filter(Boolean)
    : ['Selecione uma ferramenta na barra lateral ou pressione um atalho.'];

  return (
    <div className="su-instructor">
      <div className="su-instructor-title">
        {toolIcon[activeToolId] ?? 'â—†'} {toolLabels[activeToolId] ?? activeToolId}
      </div>
      {steps.map((step, i) => (
        <div key={i} className="su-instructor-step">
          <div className="su-instructor-step-icon">{i + 1}</div>
          <span>{step.trim()}</span>
        </div>
      ))}
      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--su-border-light)', fontSize: 10, color: 'var(--su-text-muted)' }}>
        Grupo: <strong>{activeToolGroup}</strong>
      </div>
    </div>
  );
}

