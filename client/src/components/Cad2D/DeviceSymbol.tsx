import React from 'react';
import { Circle, Line, Arc, Rect, Text, Group } from 'react-konva';

interface DeviceSymbolProps {
  id: string;
  type: string;
  x: number;
  y: number;
  rotation: number;
  ppm: number;
  zoom: number;
  isSelected?: boolean;
  onClick?: (e: any) => void;
  currentTool?: string;
  wallThickness?: number;
  draggable?: boolean;
  onDragEnd?: (e: any) => void;
  modules?: string[];
  width?: number; // Largura paramétrica
  flip?: boolean;  // Sentido de abertura
  power?: number;  // Potência para iluminação
  circuitNumber?: number | string; // Número do circuito
  commandLetter?: string; // Letra do comando
}

// ─── Cores técnicas NBR (canvas branco) ────────────────────────
const STROKE = '#1a1a1a';      // Preto técnico
const STROKE_SEL = '#0078d7';  // Azul de seleção (Microsoft CAD style)
const FILL_WHITE = '#ffffff';
const SW = 1.5;               // strokeWidth padrão

export const DeviceSymbol: React.FC<DeviceSymbolProps> = ({
  id,
  type,
  x,
  y,
  rotation,
  ppm,
  zoom,
  isSelected = false,
  onClick,
  currentTool = 'select',
  wallThickness,
  draggable = false,
  onDragEnd,
  modules,
  width,
  flip,
  power,
  circuitNumber,
  commandLetter,
}) => {
  // Tamanho base: 0.20m reais no canvas
  const S = 0.20 * ppm;
  const H = S / 2;

  const stroke = isSelected ? STROKE_SEL : STROKE;
  const sw = SW / zoom;

  // Espessura da parede correspondente (ou padrão de 15cm)
  const thickness = (wallThickness ?? 0.15) * ppm;
  const wallOffset = -thickness / 2;

  const handleMouseEnter = (e: any) => {
    if (currentTool === 'select') {
      const stage = e.target.getStage();
      if (stage) stage.container().style.cursor = 'move';
    }
  };
  const handleMouseLeave = (e: any) => {
    if (currentTool === 'select') {
      const stage = e.target.getStage();
      if (stage) stage.container().style.cursor = 'default';
    }
  };

  const commonProps = {
    id,
    onClick,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    draggable,
    onDragEnd,
  };

  // ─── Highlight de seleção ─────────────────────────────────────
  const SelectionRing = ({ cx = 0, cy = 0, r = S * 0.9 }: { cx?: number; cy?: number; r?: number }) =>
    isSelected ? (
      <Circle
        x={cx} y={cy} radius={r}
        stroke={STROKE_SEL} strokeWidth={sw}
        dash={[4 / zoom, 3 / zoom]}
        listening={false}
      />
    ) : null;

  // ─── Suporte para Grudar na Parede (Modelo WOCA) ──────────────────
  const WallMountGroup = ({ children }: { children: React.ReactNode }) => (
    <Group y={wallOffset}>
      <Line points={[-H * 1.3, 0, H * 1.3, 0]} stroke={stroke} strokeWidth={sw * 1.5} />
      {children}
    </Group>
  );

  // ─── Lógica Modular / Conjugada Lado a Lado ───────────────────
  const list = modules || [type];
  if (list.length > 1) {
    const spacing = S * 0.85; // Espaçamento entre tomadas/interruptores na mesma caixa
    return (
      <Group x={x} y={y} rotation={rotation} {...commonProps}>
        {list.map((modType, idx) => {
          const offsetX = (idx - (list.length - 1) / 2) * spacing;
          return (
            <DeviceSymbol
              key={idx}
              id={`${id}_mod_${idx}`}
              type={modType}
              x={offsetX}
              y={0}
              rotation={0}
              ppm={ppm}
              zoom={zoom}
              isSelected={false} // Seleção controlada pelo Group pai
              currentTool={currentTool}
              wallThickness={wallThickness}
              draggable={false} // Drag controlado pelo Group pai
              flip={flip}
            />
          );
        })}
        <SelectionRing cy={wallOffset - H * 0.5} r={spacing * (list.length - 0.3) * 0.6} />
      </Group>
    );
  }

  switch (type) {

    // ─── TOMADA BAIXA (h = 0.30m) — NBR 5444 (Triângulo Vazio) ───
    case 'tug_baixa':
    case 'tomada_baixa':
      return (
        <Group x={x} y={y} rotation={rotation} {...commonProps}>
          <WallMountGroup>
            <Line
              points={[-H, 0, 0, -H * 1.5, H, 0]}
              closed
              fill={FILL_WHITE}
              stroke={stroke}
              strokeWidth={sw}
            />
            <SelectionRing cy={-H * 0.75} r={S * 0.75} />
          </WallMountGroup>
        </Group>
      );

    // ─── TOMADA MÉDIA (h = 1.30m) — NBR 5444 (Triângulo Metade Cheio)
    case 'tug_media':
    case 'tomada_media':
      return (
        <Group x={x} y={y} rotation={rotation} {...commonProps}>
          <WallMountGroup>
            {/* Metade esquerda pintada de preto */}
            <Line
              points={[-H, 0, 0, -H * 1.5, 0, 0]}
              closed
              fill={stroke}
              stroke={stroke}
              strokeWidth={sw}
            />
            {/* Metade direita pintada de branco */}
            <Line
              points={[0, 0, 0, -H * 1.5, H, 0]}
              closed
              fill={FILL_WHITE}
              stroke={stroke}
              strokeWidth={sw}
            />
            <SelectionRing cy={-H * 0.75} r={S * 0.75} />
          </WallMountGroup>
        </Group>
      );

    // ─── TOMADA ALTA (h = 2.00m) — NBR 5444 (Triângulo Totalmente Cheio)
    case 'tug_alta':
    case 'tomada_alta':
      return (
        <Group x={x} y={y} rotation={rotation} {...commonProps}>
          <WallMountGroup>
            <Line
              points={[-H, 0, 0, -H * 1.5, H, 0]}
              closed
              fill={stroke}
              stroke={stroke}
              strokeWidth={sw}
            />
            <SelectionRing cy={-H * 0.75} r={S * 0.75} />
          </WallMountGroup>
        </Group>
      );

    // ─── TUE CHUVEIRO (Tomada alta com indicação CH) ──────────────
    case 'tue_chuveiro':
      return (
        <Group x={x} y={y} rotation={rotation} {...commonProps}>
          <WallMountGroup>
            <Line
              points={[-H, 0, 0, -H * 1.5, H, 0]}
              closed
              fill={stroke}
              stroke={stroke}
              strokeWidth={sw}
            />
            <Text text="CH" x={H * 1.1} y={-H * 1.2} fontSize={S * 0.45} fill={stroke} fontStyle="bold" />
            <SelectionRing cy={-H * 0.75} r={S * 0.85} />
          </WallMountGroup>
        </Group>
      );

    // ─── TUE AR-CONDICIONADO (Tomada alta com indicação AR) ───────
    case 'tue_ar':
      return (
        <Group x={x} y={y} rotation={rotation} {...commonProps}>
          <WallMountGroup>
            <Line
              points={[-H, 0, 0, -H * 1.5, H, 0]}
              closed
              fill={stroke}
              stroke={stroke}
              strokeWidth={sw}
            />
            <Text text="AR" x={H * 1.1} y={-H * 1.2} fontSize={S * 0.45} fill={stroke} fontStyle="bold" />
            <SelectionRing cy={-H * 0.75} r={S * 0.85} />
          </WallMountGroup>
        </Group>
      );

    // ─── TOMADA ESPECÍFICA 220V ──────────────────────────────────
    case 'tomada_220':
      return (
        <Group x={x} y={y} rotation={rotation} {...commonProps}>
          <WallMountGroup>
            <Line
              points={[-H, 0, 0, -H * 1.5, H, 0]}
              closed
              fill={FILL_WHITE}
              stroke={stroke}
              strokeWidth={sw}
            />
            <Line points={[0, 0, 0, -H * 1.5]} stroke={stroke} strokeWidth={sw} />
            <Text text="220" x={H * 1.1} y={-H * 1.2} fontSize={S * 0.4} fill={stroke} fontStyle="bold" />
            <SelectionRing cy={-H * 0.75} r={S * 0.85} />
          </WallMountGroup>
        </Group>
      );

    // ─── INTERRUPTOR SIMPLES (Círculo Vazio na haste) ─────────────
    case 'switch_simple':
    case 'interruptor':
      return (
        <Group x={x} y={y} rotation={rotation} {...commonProps}>
          <WallMountGroup>
            <Line points={[0, 0, 0, -H * 1.5]} stroke={stroke} strokeWidth={sw} />
            <Circle x={0} y={-H * 1.5} radius={H * 0.5} fill={FILL_WHITE} stroke={stroke} strokeWidth={sw} />
            {(commandLetter || circuitNumber) && (
              <Text
                text={`${commandLetter ?? ''}${circuitNumber ?? ''}`}
                x={H * 0.7}
                y={-H * 1.95}
                fontSize={H * 0.65}
                fontStyle="bold"
                fill={stroke}
                listening={false}
              />
            )}
            <SelectionRing cy={-H * 0.75} r={S * 0.75} />
          </WallMountGroup>
        </Group>
      );

    // ─── INTERRUPTOR PARALELO (Círculo Cheio na haste) ────────────
    case 'switch_parallel':
      return (
        <Group x={x} y={y} rotation={rotation} {...commonProps}>
          <WallMountGroup>
            <Line points={[0, 0, 0, -H * 1.5]} stroke={stroke} strokeWidth={sw} />
            <Circle x={0} y={-H * 1.5} radius={H * 0.5} fill={stroke} stroke={stroke} strokeWidth={sw} />
            {(commandLetter || circuitNumber) && (
              <Text
                text={`${commandLetter ?? ''}${circuitNumber ?? ''}`}
                x={H * 0.7}
                y={-H * 1.95}
                fontSize={H * 0.65}
                fontStyle="bold"
                fill={stroke}
                listening={false}
              />
            )}
            <SelectionRing cy={-H * 0.75} r={S * 0.75} />
          </WallMountGroup>
        </Group>
      );

    // ─── INTERRUPTOR INTERMEDIÁRIO (Metade Cheio na haste) ────────
    case 'switch_intermediate':
      return (
        <Group x={x} y={y} rotation={rotation} {...commonProps}>
          <WallMountGroup>
            <Line points={[0, 0, 0, -H * 1.5]} stroke={stroke} strokeWidth={sw} />
            <Circle x={0} y={-H * 1.5} radius={H * 0.5} fill={FILL_WHITE} stroke={stroke} strokeWidth={sw} />
            <Arc
              x={0} y={-H * 1.5}
              innerRadius={0} outerRadius={H * 0.5}
              angle={180} rotation={90}
              fill={stroke} stroke={stroke} strokeWidth={sw}
            />
            {(commandLetter || circuitNumber) && (
              <Text
                text={`${commandLetter ?? ''}${circuitNumber ?? ''}`}
                x={H * 0.7}
                y={-H * 1.95}
                fontSize={H * 0.65}
                fontStyle="bold"
                fill={stroke}
                listening={false}
              />
            )}
            <SelectionRing cy={-H * 0.75} r={S * 0.75} />
          </WallMountGroup>
        </Group>
      );

    // ─── INTERRUPTOR DUPLO ────────────────────────────────────────
    case 'interruptor_duplo':
      return (
        <Group x={x} y={y} rotation={rotation} {...commonProps}>
          <WallMountGroup>
            <Line points={[-H * 0.3, 0, -H * 0.3, -H * 1.5]} stroke={stroke} strokeWidth={sw} />
            <Line points={[ H * 0.3, 0,  H * 0.3, -H * 1.5]} stroke={stroke} strokeWidth={sw} />
            <Circle x={-H * 0.3} y={-H * 1.5} radius={H * 0.4} fill={FILL_WHITE} stroke={stroke} strokeWidth={sw} />
            <Circle x={ H * 0.3} y={-H * 1.5} radius={H * 0.4} fill={FILL_WHITE} stroke={stroke} strokeWidth={sw} />
            {(commandLetter || circuitNumber) && (
              <Text
                text={`${commandLetter ?? ''}${circuitNumber ?? ''}`}
                x={H * 0.9}
                y={-H * 1.95}
                fontSize={H * 0.65}
                fontStyle="bold"
                fill={stroke}
                listening={false}
              />
            )}
            <SelectionRing cy={-H * 0.75} r={S * 0.85} />
          </WallMountGroup>
        </Group>
      );

    // ─── INTERRUPTOR TRIPLO ───────────────────────────────────────
    case 'interruptor_triplo':
      return (
        <Group x={x} y={y} rotation={rotation} {...commonProps}>
          <WallMountGroup>
            {[-H * 0.5, 0, H * 0.5].map((ox, i) => (
              <React.Fragment key={i}>
                <Line points={[ox, 0, ox, -H * 1.5]} stroke={stroke} strokeWidth={sw} />
                <Circle x={ox} y={-H * 1.5} radius={H * 0.35} fill={FILL_WHITE} stroke={stroke} strokeWidth={sw} />
              </React.Fragment>
            ))}
            {(commandLetter || circuitNumber) && (
              <Text
                text={`${commandLetter ?? ''}${circuitNumber ?? ''}`}
                x={H * 1.1}
                y={-H * 1.95}
                fontSize={H * 0.65}
                fontStyle="bold"
                fill={stroke}
                listening={false}
              />
            )}
            <SelectionRing cy={-H * 0.75} r={S * 1.0} />
          </WallMountGroup>
        </Group>
      );

    // ─── TELERUPTORA ──────────────────────────────────────────────
    case 'interruptor_teleruptora':
      return (
        <Group x={x} y={y} rotation={rotation} {...commonProps}>
          <WallMountGroup>
            <Line points={[0, 0, 0, -H * 1.5]} stroke={stroke} strokeWidth={sw} />
            <Circle x={0} y={-H * 1.5} radius={H * 0.5} fill={FILL_WHITE} stroke={stroke} strokeWidth={sw} />
            <Circle x={0} y={-H * 1.5} radius={H * 0.2} fill={stroke} stroke={stroke} strokeWidth={sw} />
            {(commandLetter || circuitNumber) && (
              <Text
                text={`${commandLetter ?? ''}${circuitNumber ?? ''}`}
                x={H * 0.7}
                y={-H * 1.95}
                fontSize={H * 0.65}
                fontStyle="bold"
                fill={stroke}
                listening={false}
              />
            )}
            <SelectionRing cy={-H * 0.75} r={S * 0.75} />
          </WallMountGroup>
        </Group>
      );

    // ─── PONTO DE LUZ NO TETO (Círculo com X) ─────────────────────
    case 'ceiling_light':
    case 'lampada':
      return (
        <Group x={x} y={y} {...commonProps}>
          <Circle x={0} y={0} radius={H} fill={FILL_WHITE} stroke={stroke} strokeWidth={sw} />
          <Line points={[-H * 0.65, -H * 0.65,  H * 0.65,  H * 0.65]} stroke={stroke} strokeWidth={sw} />
          <Line points={[-H * 0.65,  H * 0.65,  H * 0.65, -H * 0.65]} stroke={stroke} strokeWidth={sw} />
          
          <Text
            text={`${power ?? 60}W`}
            x={-H * 1.5}
            y={-H * 0.3}
            width={H * 3}
            fontSize={H * 0.5}
            fontStyle="bold"
            align="center"
            fill={stroke}
            listening={false}
          />
          {circuitNumber && (
            <Text
              text={String(circuitNumber)}
              x={H * 1.1}
              y={-H * 0.35}
              fontSize={H * 0.65}
              fontStyle="bold"
              fill={stroke}
              listening={false}
            />
          )}
          {commandLetter && (
            <Text
              text={commandLetter}
              x={-H * 1.7}
              y={-H * 0.35}
              fontSize={H * 0.65}
              fontStyle="italic"
              fill={stroke}
              listening={false}
            />
          )}
          <SelectionRing r={H * 1.35} />
        </Group>
      );

    // ─── PONTO DE LUZ NA PAREDE (Arandela) ─────────────────────────
    case 'sconce':
    case 'lampada_parede':
      return (
        <Group x={x} y={y} rotation={rotation} {...commonProps}>
          <WallMountGroup>
            <Line points={[-H, 0, H, 0]} stroke={stroke} strokeWidth={sw} />
            <Arc x={0} y={0} innerRadius={0} outerRadius={H} angle={180} rotation={-180} fill={FILL_WHITE} stroke={stroke} strokeWidth={sw} />
            <Line points={[-H * 0.5, -H * 0.5, H * 0.5, H * 0] } stroke={stroke} strokeWidth={sw} />
            
            <Text
              text={`${power ?? 60}W`}
              x={-H * 2}
              y={-H * 1.6}
              width={H * 4}
              fontSize={H * 0.5}
              align="center"
              fill={stroke}
              listening={false}
            />
            {circuitNumber && (
              <Text text={String(circuitNumber)} x={H * 1.2} y={-H * 0.8} fontSize={H * 0.6} fontStyle="bold" fill={stroke} listening={false} />
            )}
            {commandLetter && (
              <Text text={commandLetter} x={-H * 1.8} y={-H * 0.8} fontSize={H * 0.6} fontStyle="italic" fill={stroke} listening={false} />
            )}
            <SelectionRing cy={-H * 0.3} r={S * 0.75} />
          </WallMountGroup>
        </Group>
      );

    // ─── LÂMPADA FLUORESCENTE ─────────────────────────────────────
    case 'fluorescent':
      return (
        <Group x={x} y={y} rotation={rotation} {...commonProps}>
          <Rect
            x={-S * 0.9} y={-H * 0.3}
            width={S * 1.8} height={H * 0.6}
            fill={FILL_WHITE} stroke={stroke} strokeWidth={sw}
          />
          <Line points={[-S * 0.9, -H * 0.3, S * 0.9, H * 0.3]} stroke={stroke} strokeWidth={sw * 0.7} />
          <Line points={[-S * 0.9, H * 0.3, S * 0.9, -H * 0.3]} stroke={stroke} strokeWidth={sw * 0.7} />
          
          <Text
            text={`${power ?? 60}W`}
            x={-S * 0.9}
            y={-H * 1.3}
            width={S * 1.8}
            fontSize={H * 0.5}
            fontStyle="bold"
            align="center"
            fill={stroke}
            listening={false}
          />
          {circuitNumber && (
            <Text
              text={String(circuitNumber)}
              x={S * 0.95}
              y={-H * 0.35}
              fontSize={H * 0.65}
              fontStyle="bold"
              fill={stroke}
              listening={false}
            />
          )}
          {commandLetter && (
            <Text
              text={commandLetter}
              x={-S * 1.3}
              y={-H * 0.35}
              fontSize={H * 0.65}
              fontStyle="italic"
              fill={stroke}
              listening={false}
            />
          )}
          <SelectionRing r={S * 1.1} />
        </Group>
      );

    // ─── QUADRO DE DISTRIBUIÇÃO (QDC) ────────────────────────────
    case 'qdc':
      return (
        <Group x={x} y={y} rotation={rotation} {...commonProps}>
          <Rect x={-S} y={-H} width={S * 2} height={S} fill={FILL_WHITE} stroke={stroke} strokeWidth={sw} />
          {[-0.5, 0, 0.5].map((off, i) => (
            <Line key={i} points={[off * S * 0.9, -H * 0.6, off * S * 0.9, H * 0.6]} stroke={stroke} strokeWidth={sw * 0.7} />
          ))}
          <Text text="QDC" x={-S * 0.55} y={H * 0.65} fontSize={S * 0.4} fill={stroke} fontStyle="bold" />
          <SelectionRing cx={0} cy={0} r={S * 1.1} />
        </Group>
      );

    // ─── POSTE / RAMAL DE ENTRADA ─────────────────────────────────
    case 'poste':
      return (
        <Group x={x} y={y} {...commonProps}>
          <Circle x={0} y={0} radius={H} fill={FILL_WHITE} stroke={stroke} strokeWidth={sw} />
          <Circle x={0} y={0} radius={H * 0.6} fill={FILL_WHITE} stroke={stroke} strokeWidth={sw * 0.7} />
          <Text text="R" x={-H * 0.3} y={-H * 0.45} fontSize={H * 0.9} fill={stroke} fontStyle="bold" />
          <SelectionRing r={H * 1.4} />
        </Group>
      );

    // ─── MEDIDOR / CAIXA DE MEDIÇÃO ───────────────────────────────
    case 'meter':
    case 'medidor':
      return (
        <Group x={x} y={y} rotation={rotation} {...commonProps}>
          <Rect x={-H} y={-H} width={S} height={S} fill={FILL_WHITE} stroke={stroke} strokeWidth={sw} />
          <Circle x={0} y={0} radius={H * 0.45} fill={FILL_WHITE} stroke={stroke} strokeWidth={sw * 0.7} />
          <Text text="kWh" x={-H * 0.7} y={H * 0.5} fontSize={S * 0.3} fill={stroke} fontStyle="bold" />
          <SelectionRing r={H * 1.35} />
        </Group>
      );

    // ─── PORTA DE GIRO (Arquitetura) ──────────────────────────────
    case 'door': {
      const doorW = (width ?? 0.8) * ppm;
      return (
        <Group x={x} y={y} rotation={rotation} {...commonProps}>
          <Group scaleX={flip ? -1 : 1}>
            {/* Hit area invisível para cliques */}
            <Rect x={-doorW * 0.1} y={-doorW} width={doorW * 1.2} height={doorW * 1.1} fill="rgba(0,0,0,0)" />
            <Line points={[0, 0, 0, -doorW]} stroke={stroke} strokeWidth={sw} />
            <Arc
              x={0} y={0}
              innerRadius={doorW} outerRadius={doorW}
              angle={90} rotation={-90}
              stroke={stroke} strokeWidth={sw * 0.7}
              dash={[3, 3]}
              fill="transparent"
            />
            {/* Linha guia de abertura */}
            <Line points={[0, 0, doorW, 0]} stroke={stroke} strokeWidth={sw * 0.8} />
          </Group>
          <SelectionRing cy={-doorW * 0.5} r={doorW * 0.7} />
        </Group>
      );
    }

    // ─── PORTA DE CORRER (Arquitetura) ────────────────────────────
    case 'door_correr': {
      const doorW = (width ?? 0.8) * ppm;
      const halfW = doorW / 2;
      return (
        <Group x={x} y={y} rotation={rotation} {...commonProps}>
          {/* Hit area invisível para cliques */}
          <Rect x={-halfW} y={-thickness / 2} width={doorW} height={thickness} fill="rgba(0,0,0,0)" />
          <Line points={[-halfW, 0, halfW, 0]} stroke={stroke} strokeWidth={sw * 0.5} opacity={0.5} />
          <Rect x={-halfW} y={-thickness * 0.4} width={halfW} height={thickness * 0.3} fill={FILL_WHITE} stroke={stroke} strokeWidth={sw} />
          <Rect x={0} y={thickness * 0.1} width={halfW} height={thickness * 0.3} fill={FILL_WHITE} stroke={stroke} strokeWidth={sw} />
          <SelectionRing r={halfW * 1.1} />
        </Group>
      );
    }

    // ─── PORTA PIVOTANTE (Arquitetura) ────────────────────────────
    case 'door_pivotante': {
      const doorW = (width ?? 0.8) * ppm;
      const pivotOffset = doorW * 0.15; // Pivot a 15% do vão
      return (
        <Group x={x} y={y} rotation={rotation} {...commonProps}>
          <Group scaleX={flip ? -1 : 1}>
            {/* Hit area invisível para cliques */}
            <Rect x={-doorW * 0.1} y={-doorW} width={doorW * 1.2} height={doorW * 1.1} fill="rgba(0,0,0,0)" />
            <Line points={[0, 0, doorW, 0]} stroke={stroke} strokeWidth={sw * 0.5} opacity={0.5} />
            {/* Folha da porta rotacionada (aberta) em torno do pivot */}
            <Line points={[pivotOffset, 0, pivotOffset, -doorW]} stroke={stroke} strokeWidth={sw} />
            {/* Arco de abertura principal */}
            <Arc
              x={pivotOffset} y={0}
              innerRadius={doorW - pivotOffset} outerRadius={doorW - pivotOffset}
              angle={90} rotation={-90}
              stroke={stroke} strokeWidth={sw * 0.7}
              dash={[3, 3]}
              fill="transparent"
            />
            {/* Pequeno arco de abertura traseiro */}
            <Arc
              x={pivotOffset} y={0}
              innerRadius={pivotOffset} outerRadius={pivotOffset}
              angle={90} rotation={90}
              stroke={stroke} strokeWidth={sw * 0.7}
              dash={[3, 3]}
              fill="transparent"
            />
          </Group>
          <SelectionRing cy={-doorW * 0.5} r={doorW * 0.7} />
        </Group>
      );
    }

    // ─── VÃO LIVRE (Arquitetura) ──────────────────────────────────
    case 'open_van': {
      const vanW = (width ?? 1.0) * ppm;
      const halfW = vanW / 2;
      return (
        <Group x={x} y={y} rotation={rotation} {...commonProps}>
          {/* Hit area invisível para cliques */}
          <Rect x={-halfW} y={-thickness / 2} width={vanW} height={thickness} fill="rgba(0,0,0,0)" />
          <Rect
            x={-halfW} y={-thickness / 2}
            width={vanW} height={thickness}
            stroke={stroke} strokeWidth={sw}
            dash={[4, 3]}
            fill="transparent"
          />
          <SelectionRing r={halfW * 1.1} />
        </Group>
      );
    }

    // ─── JANELA (Arquitetura) ─────────────────────────────────────
    case 'window': {
      const winW = (width ?? 1.2) * ppm;
      const halfW = winW / 2;
      return (
        <Group x={x} y={y} rotation={rotation} {...commonProps}>
          {/* Hit area invisível para cliques */}
          <Rect x={-halfW} y={-thickness / 2} width={winW} height={thickness} fill="rgba(0,0,0,0)" />
          <Rect x={-halfW} y={-thickness / 2} width={winW} height={thickness} fill={FILL_WHITE} stroke={stroke} strokeWidth={sw} />
          {/* Linha do vidro no meio */}
          <Line points={[-halfW, 0, halfW, 0]} stroke={stroke} strokeWidth={sw * 0.7} />
          <SelectionRing r={halfW * 1.1} />
        </Group>
      );
    }

    // ─── ESCADA (Arquitetura) ─────────────────────────────────────
    case 'stairs':
      return (
        <Group x={x} y={y} rotation={rotation} {...commonProps}>
          <Rect x={-S} y={-H * 1.5} width={S * 2} height={H * 3} fill={FILL_WHITE} stroke={stroke} strokeWidth={sw} />
          {[-0.8, -0.4, 0, 0.4, 0.8].map((off, i) => (
            <Line key={i} points={[-S, off * H * 1.5, S, off * H * 1.5]} stroke={stroke} strokeWidth={sw * 0.7} />
          ))}
          <Line points={[0, H * 1.2, 0, -H * 1.2]} stroke="#3b82f6" strokeWidth={sw * 1.2} />
          <Line points={[-H * 0.3, -H * 0.9, 0, -H * 1.2, H * 0.3, -H * 0.9]} stroke="#3b82f6" strokeWidth={sw * 1.2} />
          <SelectionRing r={S * 1.3} />
        </Group>
      );

    // ─── TELECOM: RJ45 REDE / DADOS ──────────────────────────────
    case 'tele_rj45':
      return (
        <Group x={x} y={y} rotation={rotation} {...commonProps}>
          <WallMountGroup>
            <Circle x={0} y={0} radius={H * 1.4} fill="rgba(0,0,0,0)" />
            <Line points={[0, -H, -H, H, H, H]} closed fill="transparent" stroke={stroke} strokeWidth={sw} />
            <Line points={[0, -H, -H, H, 0, H]} closed fill={stroke} stroke={stroke} strokeWidth={sw} />
            <Line points={[-H, H, H, H]} stroke={stroke} strokeWidth={sw} />
            <SelectionRing cy={H * 0.2} r={H * 1.4} />
          </WallMountGroup>
        </Group>
      );

    // ─── TELECOM: RJ11 TELEFONE ──────────────────────────────────
    case 'tele_rj11':
      return (
        <Group x={x} y={y} rotation={rotation} {...commonProps}>
          <WallMountGroup>
            <Circle x={0} y={0} radius={H * 1.4} fill="rgba(0,0,0,0)" />
            <Line points={[0, -H, -H, H, H, H]} closed fill="transparent" stroke={stroke} strokeWidth={sw} />
            <Text text="T" x={-H * 0.25} y={-H * 0.15} fontSize={S * 0.55} fill={stroke} fontStyle="bold" />
            <SelectionRing cy={H * 0.2} r={H * 1.4} />
          </WallMountGroup>
        </Group>
      );

    // ─── TELECOM: COAXIAL TV ─────────────────────────────────────
    case 'tele_coaxial':
      return (
        <Group x={x} y={y} rotation={rotation} {...commonProps}>
          <WallMountGroup>
            <Circle x={0} y={0} radius={H * 1.4} fill="rgba(0,0,0,0)" />
            <Line points={[0, -H, -H, H, H, H]} closed fill="transparent" stroke={stroke} strokeWidth={sw} />
            <Text text="TV" x={-H * 0.45} y={-H * 0.15} fontSize={S * 0.45} fill={stroke} fontStyle="bold" />
            <SelectionRing cy={H * 0.2} r={H * 1.4} />
          </WallMountGroup>
        </Group>
      );

    // ─── SEGURANÇA: CÂMERA CFTV ──────────────────────────────────
    case 'cftv_camera':
      return (
        <Group x={x} y={y} rotation={rotation} {...commonProps}>
          <WallMountGroup>
            <Rect x={-H * 0.8} y={-H * 0.4} width={S * 0.8} height={H * 0.6} fill={FILL_WHITE} stroke={stroke} strokeWidth={sw} />
            <Line points={[H * 0.8, -H * 0.3, H * 1.1, -H * 0.5, H * 1.1, -H * 0.1]} closed fill={FILL_WHITE} stroke={stroke} strokeWidth={sw} />
            <Line points={[-H * 0.4, H * 0.2, -H * 0.8, H * 0.7]} stroke={stroke} strokeWidth={sw * 1.5} />
            <Line points={[-H * 1.1, H * 0.7, -H * 0.5, H * 0.7]} stroke={stroke} strokeWidth={sw * 1.5} />
            <SelectionRing r={S * 1.0} />
          </WallMountGroup>
        </Group>
      );

    // ─── SEGURANÇA: SENSOR DE PRESENÇA ───────────────────────────
    case 'sensor_presenca':
      return (
        <Group x={x} y={y} {...commonProps}>
          <Circle x={0} y={0} radius={H} fill={FILL_WHITE} stroke={stroke} strokeWidth={sw} />
          <Text text="S" x={-H * 0.3} y={-H * 0.55} fontSize={H * 1.1} fill={stroke} fontStyle="bold" />
          <SelectionRing r={H * 1.3} />
        </Group>
      );

    // ─── SEGURANÇA: CENTRAL DE ALARME ────────────────────────────
    case 'central_alarme':
      return (
        <Group x={x} y={y} rotation={rotation} {...commonProps}>
          <WallMountGroup>
            <Rect x={-H * 1.2} y={-H * 0.8} width={S * 1.2} height={S * 0.8} fill={FILL_WHITE} stroke={stroke} strokeWidth={sw} />
            <Text text="AL" x={-H * 0.75} y={-H * 0.45} fontSize={S * 0.4} fill={stroke} fontStyle="bold" />
            <SelectionRing r={S * 1.1} />
          </WallMountGroup>
        </Group>
      );

    // ─── CAIXA OCTOGONAL (Teto) ───────────────────────────────────
    case 'box_octogonal':
      return (
        <Group x={x} y={y} {...commonProps}>
          <Line
            points={(() => {
              const pts = [];
              const r = H;
              for (let i = 0; i < 8; i++) {
                const angle = (i * Math.PI) / 4 + Math.PI / 8;
                pts.push(r * Math.cos(angle), r * Math.sin(angle));
              }
              return pts;
            })()}
            closed
            fill={FILL_WHITE}
            stroke={stroke}
            strokeWidth={sw}
          />
          <Line points={[-H * 0.7, -H * 0.7, H * 0.7, H * 0.7]} stroke={stroke} strokeWidth={sw * 0.7} dash={[3, 3]} />
          <Line points={[-H * 0.7, H * 0.7, H * 0.7, -H * 0.7]} stroke={stroke} strokeWidth={sw * 0.7} dash={[3, 3]} />
          <SelectionRing r={H * 1.25} />
        </Group>
      );

    // ─── CAIXA 4x2 (Parede) ───────────────────────────────────────
    case 'box_4x2':
      return (
        <Group x={x} y={y} rotation={rotation} {...commonProps}>
          <WallMountGroup>
            <Rect
              x={-H * 0.8}
              y={-H * 0.4}
              width={S * 0.8}
              height={H * 0.8}
              fill={FILL_WHITE}
              stroke={stroke}
              strokeWidth={sw}
            />
            <Line points={[-H * 0.8, -H * 0.4, H * 0.8, H * 0.4]} stroke={stroke} strokeWidth={sw * 0.7} opacity={0.5} dash={[2, 2]} />
            <Line points={[-H * 0.8, H * 0.4, H * 0.8, -H * 0.4]} stroke={stroke} strokeWidth={sw * 0.7} opacity={0.5} dash={[2, 2]} />
            <SelectionRing cy={0} r={S * 0.7} />
          </WallMountGroup>
        </Group>
      );

    // ─── CAIXA 4x4 (Parede) ───────────────────────────────────────
    case 'box_4x4':
      return (
        <Group x={x} y={y} rotation={rotation} {...commonProps}>
          <WallMountGroup>
            <Rect
              x={-H * 0.8}
              y={-H * 0.8}
              width={S * 0.8}
              height={S * 0.8}
              fill={FILL_WHITE}
              stroke={stroke}
              strokeWidth={sw}
            />
            <Line points={[-H * 0.8, -H * 0.8, H * 0.8, H * 0.8]} stroke={stroke} strokeWidth={sw * 0.7} opacity={0.5} dash={[2, 2]} />
            <Line points={[-H * 0.8, H * 0.8, H * 0.8, -H * 0.8]} stroke={stroke} strokeWidth={sw * 0.7} opacity={0.5} dash={[2, 2]} />
            <SelectionRing cy={0} r={S * 0.9} />
          </WallMountGroup>
        </Group>
      );

    default:
      return (
        <Group x={x} y={y} {...commonProps}>
          <Circle x={0} y={0} radius={H} fill={FILL_WHITE} stroke={stroke} strokeWidth={sw} />
          <Text text="?" x={-H * 0.3} y={-H * 0.5} fontSize={H * 1.0} fill={stroke} />
        </Group>
      );
  }
};
