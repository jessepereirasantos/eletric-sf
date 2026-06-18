// ═══════════════════════════════════════════════════════════════
// nbr5410.ts — Motor de Cálculos Elétricos NBR 5410:2024
// ═══════════════════════════════════════════════════════════════

// Resistividade do cobre a 70°C em Ohm.mm²/m (conforme NBR 5410)
const RESISTIVITY_COPPER = 0.0225;

// ═══════════════════════════════════════════════════════════════
// TABELA 36: Capacidade de condução de corrente (A)
// Condutores de cobre, isolação PVC 70°C
// Método B1 (eletroduto embutido em alvenaria)
// ═══════════════════════════════════════════════════════════════

// 2 condutores carregados (monofásico / bifásico)
const AMPACITY_TABLE_2_LOADED: Record<number, number> = {
  1.5: 17.5,
  2.5: 24,
  4.0: 32,
  6.0: 41,
  10.0: 57,
  16.0: 76,
  25.0: 101,
  35.0: 125,
  50.0: 151,
  70.0: 192,
  95.0: 232,
  120.0: 269,
};

// 3 condutores carregados (trifásico)
const AMPACITY_TABLE_3_LOADED: Record<number, number> = {
  1.5: 15.5,
  2.5: 21,
  4.0: 28,
  6.0: 36,
  10.0: 50,
  16.0: 68,
  25.0: 89,
  35.0: 110,
  50.0: 134,
  70.0: 171,
  95.0: 207,
  120.0: 239,
};

// ═══════════════════════════════════════════════════════════════
// TABELA 42: Fator de agrupamento de circuitos
// (eletroduto embutido em alvenaria)
// ═══════════════════════════════════════════════════════════════
const GROUPING_FACTORS: Record<number, number> = {
  1: 1.0,
  2: 0.80,
  3: 0.70,
  4: 0.65,
  5: 0.60,
  6: 0.57,
  7: 0.54,
  8: 0.52,
  9: 0.50,
  10: 0.48,
  12: 0.45,
  16: 0.41,
  20: 0.38,
};

// ═══════════════════════════════════════════════════════════════
// TABELA 40: Fator de correção por temperatura ambiente
// Base: 30°C para PVC 70°C
// ═══════════════════════════════════════════════════════════════
const TEMPERATURE_CORRECTION: Record<number, number> = {
  20: 1.12,
  25: 1.06,
  30: 1.00,
  35: 0.94,
  40: 0.87,
  45: 0.79,
  50: 0.71,
  55: 0.61,
};

// ═══════════════════════════════════════════════════════════════
// TABELA 54: Fatores de demanda para instalações residenciais
// (Potência ativa de iluminação e tomadas)
// ═══════════════════════════════════════════════════════════════
const DEMAND_FACTOR_RESIDENTIAL: { upTo: number; factor: number }[] = [
  { upTo: 1000, factor: 1.00 },
  { upTo: 2000, factor: 0.86 },
  { upTo: 3000, factor: 0.78 },
  { upTo: 4000, factor: 0.72 },
  { upTo: 5000, factor: 0.66 },
  { upTo: 6000, factor: 0.62 },
  { upTo: 7000, factor: 0.59 },
  { upTo: 8000, factor: 0.56 },
  { upTo: 9000, factor: 0.53 },
  { upTo: 10000, factor: 0.51 },
  { upTo: Infinity, factor: 0.50 },
];

// Disjuntores termomagnéticos comerciais (Corrente nominal In)
const COMMERCIAL_BREAKERS = [10, 16, 20, 25, 32, 40, 50, 63, 70, 80, 100, 125];

// Seções comerciais disponíveis
const COMMERCIAL_SECTIONS = [1.5, 2.5, 4.0, 6.0, 10.0, 16.0, 25.0, 35.0, 50.0, 70.0, 95.0, 120.0];

// ═══════════════════════════════════════════════════════════════
// Tipos de resultado
// ═══════════════════════════════════════════════════════════════

export interface DimensioningResult {
  currentProject: number;      // Ip (A)
  currentCorrected: number;    // Ip' = Ip / (Fg * Ft) (A)
  selectedSection: number;     // Seção comercial adotada (mm²)
  sectionByAmpacity: number;   // Seção mínima exigida por corrente (mm²)
  sectionByVoltageDrop: number;// Seção exigida por queda de tensão (mm²)
  maxAmpacity: number;         // Iz - capacidade máxima do cabo no método (A)
  correctedAmpacity: number;   // Iz' = Iz * Fg * Ft (A)
  voltageDropPercent: number;  // Queda de tensão calculada (%)
  circuitBreaker: number;      // Disjuntor termomagnético selecionado (A)
  fatorAgrupamento: number;    // Fator de agrupamento aplicado
  fatorTemperatura: number;    // Fator de temperatura aplicado
  warnings: string[];          // Alertas de não conformidade
}

export interface DemandResult {
  totalInstalledPower: number;  // Potência total instalada (W)
  demandFactor: number;         // Fator de demanda calculado
  demandPower: number;          // Potência de demanda (W)
  demandCurrent: number;        // Corrente de demanda (A)
  connectionType: 'monofasico' | 'bifasico' | 'trifasico';
  suggestedBreakerGeneral: number; // Disjuntor geral sugerido (A)
  suggestedEntrySection: number;   // Seção do ramal de entrada (mm²)
  warnings: string[];
}

export interface CircuitValidation {
  circuitId: string;
  circuitNumber: number;
  circuitName: string;
  valid: boolean;
  warnings: string[];
  errors: string[];
}

// ═══════════════════════════════════════════════════════════════
// Função principal de dimensionamento de circuito
// ═══════════════════════════════════════════════════════════════

/**
 * Dimensiona um circuito elétrico de acordo com a NBR 5410.
 */
export const dimensionateCircuit = (
  type: 'iluminacao' | 'tug' | 'tue',
  totalPower: number,
  voltage: 127 | 220 | 380,
  distanceMeters: number,
  groupedCircuits: number = 1,
  ambientTemperature: number = 30,
  phases: 'mono' | 'bi' | 'tri' = 'mono'
): DimensioningResult => {
  const warnings: string[] = [];

  // 1. Fator de potência estimado
  const powerFactor = type === 'tug' ? 0.8 : 1.0;

  // 2. Corrente de Projeto
  let currentProject: number;
  if (phases === 'tri') {
    // Trifásico: Ip = P / (√3 × V × fp)
    currentProject = totalPower / (Math.sqrt(3) * voltage * powerFactor);
  } else {
    // Monofásico/Bifásico: Ip = P / (V × fp)
    currentProject = totalPower / (voltage * powerFactor);
  }

  // 3. Fator de Agrupamento (Fg)
  const factorIndex = Math.max(1, Math.min(20, groupedCircuits));
  let fatorAgrupamento = GROUPING_FACTORS[factorIndex];
  if (!fatorAgrupamento) {
    // Interpolar para valores não tabelados
    const keys = Object.keys(GROUPING_FACTORS).map(Number).sort((a, b) => a - b);
    const lower = keys.filter(k => k <= factorIndex).pop() || 1;
    fatorAgrupamento = GROUPING_FACTORS[lower];
  }

  // 4. Fator de Temperatura (Ft) — Tabela 40
  const tempKey = Math.round(ambientTemperature / 5) * 5;
  let fatorTemperatura = TEMPERATURE_CORRECTION[Math.max(20, Math.min(55, tempKey))] || 1.0;

  // Corrente corrigida para dimensionamento térmico
  const currentCorrected = currentProject / (fatorAgrupamento * fatorTemperatura);

  // 5. Escolha da tabela de ampacidade
  const ampacityTable = phases === 'tri' ? AMPACITY_TABLE_3_LOADED : AMPACITY_TABLE_2_LOADED;

  // 6. Bitola por capacidade de condução
  let sectionByAmpacity = 1.5;
  for (const sec of COMMERCIAL_SECTIONS) {
    if ((ampacityTable[sec] || 0) >= currentCorrected) {
      sectionByAmpacity = sec;
      break;
    }
    sectionByAmpacity = sec;
  }

  // Seção mínima normativa
  const sectionMinNormative = type === 'iluminacao' ? 1.5 : 2.5;
  let adoptedSection = Math.max(sectionByAmpacity, sectionMinNormative);

  // 7. Critério de Queda de Tensão (4%)
  let voltageDropPercent = 0;
  let sectionByVoltageDrop = adoptedSection;
  const maxVoltageDrop = 4.0;

  // Fator de condutores para queda de tensão
  const conductorFactor = phases === 'tri' ? Math.sqrt(3) : 2;

  while (true) {
    voltageDropPercent = ((conductorFactor * RESISTIVITY_COPPER * distanceMeters * currentProject) / (adoptedSection * voltage)) * 100;

    if (voltageDropPercent <= maxVoltageDrop) {
      sectionByVoltageDrop = adoptedSection;
      break;
    }

    const currentIndex = COMMERCIAL_SECTIONS.indexOf(adoptedSection);
    if (currentIndex < COMMERCIAL_SECTIONS.length - 1) {
      adoptedSection = COMMERCIAL_SECTIONS[currentIndex + 1];
    } else {
      sectionByVoltageDrop = adoptedSection;
      warnings.push(`⚠️ Queda de tensão de ${voltageDropPercent.toFixed(1)}% excede o limite de 4% mesmo com bitola máxima`);
      break;
    }
  }

  // 8. Capacidades térmicas do cabo adotado
  const maxAmpacity = ampacityTable[adoptedSection] || 0;
  const correctedAmpacity = maxAmpacity * fatorAgrupamento * fatorTemperatura;

  // 9. Dimensionamento do Disjuntor: Ip ≤ In ≤ Iz'
  let selectedBreaker = COMMERCIAL_BREAKERS[0];
  for (const breaker of COMMERCIAL_BREAKERS) {
    if (breaker >= currentProject && breaker <= correctedAmpacity) {
      selectedBreaker = breaker;
      break;
    }
    if (breaker <= correctedAmpacity) {
      selectedBreaker = breaker;
    }
  }

  // 10. Alertas adicionais
  if (currentProject > correctedAmpacity) {
    warnings.push(`⚠️ Corrente de projeto (${currentProject.toFixed(1)}A) excede a capacidade corrigida do cabo (${correctedAmpacity.toFixed(1)}A)`);
  }
  if (voltageDropPercent > 3.5) {
    warnings.push(`⚠️ Queda de tensão (${voltageDropPercent.toFixed(1)}%) próxima do limite de 4%`);
  }

  return {
    currentProject,
    currentCorrected,
    selectedSection: adoptedSection,
    sectionByAmpacity,
    sectionByVoltageDrop,
    maxAmpacity,
    correctedAmpacity,
    voltageDropPercent,
    circuitBreaker: selectedBreaker,
    fatorAgrupamento,
    fatorTemperatura,
    warnings,
  };
};

// ═══════════════════════════════════════════════════════════════
// Cálculo de Demanda — NBR 5410 Seção 10.3
// ═══════════════════════════════════════════════════════════════

export const calculateDemand = (
  totalInstalledPower: number,
  voltage: 127 | 220 | 380,
  phases: 'mono' | 'bi' | 'tri' = 'mono'
): DemandResult => {
  const warnings: string[] = [];

  // Fator de demanda residencial (Tabela 54)
  let demandFactor = 1.0;
  for (const entry of DEMAND_FACTOR_RESIDENTIAL) {
    if (totalInstalledPower <= entry.upTo) {
      demandFactor = entry.factor;
      break;
    }
  }

  const demandPower = totalInstalledPower * demandFactor;

  // Corrente de demanda
  let demandCurrent: number;
  if (phases === 'tri') {
    demandCurrent = demandPower / (Math.sqrt(3) * voltage);
  } else {
    demandCurrent = demandPower / voltage;
  }

  // Tipo de ligação recomendado pela concessionária
  let connectionType: 'monofasico' | 'bifasico' | 'trifasico';
  if (demandPower <= 8000) {
    connectionType = 'monofasico';
  } else if (demandPower <= 25000) {
    connectionType = 'bifasico';
  } else {
    connectionType = 'trifasico';
  }

  // Disjuntor geral sugerido
  let suggestedBreakerGeneral = COMMERCIAL_BREAKERS[0];
  for (const breaker of COMMERCIAL_BREAKERS) {
    if (breaker >= demandCurrent) {
      suggestedBreakerGeneral = breaker;
      break;
    }
    suggestedBreakerGeneral = breaker;
  }

  // Seção do ramal de entrada
  const entryTable = phases === 'tri' ? AMPACITY_TABLE_3_LOADED : AMPACITY_TABLE_2_LOADED;
  let suggestedEntrySection = 6.0;
  for (const sec of COMMERCIAL_SECTIONS) {
    if ((entryTable[sec] || 0) >= demandCurrent) {
      suggestedEntrySection = sec;
      break;
    }
    suggestedEntrySection = sec;
  }

  // Seção mínima do ramal de entrada: 6mm² (NBR 5410 item 6.2.6.1)
  suggestedEntrySection = Math.max(suggestedEntrySection, 6.0);

  // Alertas
  if (connectionType === 'bifasico' && phases === 'mono') {
    warnings.push('⚠️ Potência de demanda sugere ligação BIFÁSICA. Atualize o fornecimento junto à concessionária.');
  }
  if (connectionType === 'trifasico' && phases !== 'tri') {
    warnings.push('⚠️ Potência de demanda sugere ligação TRIFÁSICA. Consulte a concessionária para adequação do padrão de entrada.');
  }
  if (demandPower > 75000) {
    warnings.push('⚠️ Potência de demanda acima de 75kW. Pode ser necessário transformador dedicado.');
  }

  return {
    totalInstalledPower,
    demandFactor,
    demandPower,
    demandCurrent,
    connectionType,
    suggestedBreakerGeneral,
    suggestedEntrySection,
    warnings,
  };
};

// ═══════════════════════════════════════════════════════════════
// Validações de Circuitos — NBR 5410
// ═══════════════════════════════════════════════════════════════

interface CircuitInfo {
  id: string;
  number: number;
  name: string;
  type: 'iluminacao' | 'tug' | 'tue';
  voltage: 127 | 220;
  deviceCount: number;
  totalPower: number;
  deviceTypes: string[];
}

export const validateCircuits = (circuits: CircuitInfo[]): CircuitValidation[] => {
  return circuits.map(c => {
    const warnings: string[] = [];
    const errors: string[] = [];

    // NBR 5410 item 9.3 — Máximo de pontos por circuito de iluminação
    if (c.type === 'iluminacao' && c.deviceCount > 10) {
      errors.push(`Máximo de 10 pontos por circuito de iluminação (encontrados: ${c.deviceCount}). NBR 5410 §9.3`);
    }

    // NBR 5410 item 9.3 — Máximo de 6 TUGs por circuito
    if (c.type === 'tug' && c.deviceCount > 6) {
      warnings.push(`Recomendado máximo de 6 tomadas por circuito TUG (encontradas: ${c.deviceCount}). Considere dividir.`);
    }

    // TUE deve ter circuito exclusivo
    if (c.type === 'tue' && c.deviceCount > 1) {
      errors.push(`TUE deve ter circuito EXCLUSIVO (encontrados ${c.deviceCount} dispositivos). NBR 5410 §9.3`);
    }

    // Potência máxima por circuito TUG (1200W recomendado)
    if (c.type === 'tug' && c.totalPower > 1200) {
      warnings.push(`Potência de ${c.totalPower}W excede o recomendado de 1200W por circuito TUG.`);
    }

    // Verificar se há mix de tipos incompatíveis no mesmo circuito
    const hasTomada = c.deviceTypes.some(t => t.includes('tug') || t.includes('tomada'));
    const hasIluminacao = c.deviceTypes.some(t => 
      t.includes('light') || t.includes('lamp') || t.includes('sconce') || t.includes('fluorescent')
    );
    if (hasTomada && hasIluminacao) {
      errors.push('Circuito mistura iluminação e tomadas. NBR 5410 exige circuitos separados.');
    }

    // Bitola mínima
    if (c.type === 'iluminacao' && c.totalPower > 2500) {
      warnings.push('Potência elevada para iluminação. Considere dividir em múltiplos circuitos.');
    }

    return {
      circuitId: c.id,
      circuitNumber: c.number,
      circuitName: c.name,
      valid: errors.length === 0,
      warnings,
      errors,
    };
  });
};

// ═══════════════════════════════════════════════════════════════
// Cálculo do eletroduto mínimo (taxa de ocupação ≤ 40%)
// ═══════════════════════════════════════════════════════════════

const CONDUIT_INTERNAL_AREA: Record<string, number> = {
  '1/2': 78.5,    // 10mm diâmetro interno → π*(5)² ≈ 78.5 mm²
  '3/4': 132.7,   // 13mm → π*(6.5)² ≈ 132.7
  '1': 201.1,     // 16mm → π*(8)² ≈ 201.1
  '1 1/4': 314.2, // 20mm → π*(10)² ≈ 314.2
  '1 1/2': 490.9, // 25mm → π*(12.5)² ≈ 490.9
  '2': 804.2,     // 32mm → π*(16)² ≈ 804.2
};

const CABLE_SECTION_AREA: Record<number, number> = {
  1.5: 12.6,   // Diâmetro externo ~4mm → π*(2)²
  2.5: 18.1,   // ~4.8mm
  4.0: 24.6,   // ~5.6mm
  6.0: 31.7,   // ~6.4mm
  10.0: 50.3,  // ~8mm
  16.0: 78.5,  // ~10mm
  25.0: 113.1, // ~12mm
  35.0: 153.9, // ~14mm
  50.0: 201.1, // ~16mm
};

export const calculateMinConduitSize = (
  cables: { section: number; quantity: number }[]
): string => {
  const totalCableArea = cables.reduce((sum, cable) => {
    const area = CABLE_SECTION_AREA[cable.section] || 12.6;
    return sum + area * cable.quantity;
  }, 0);

  // Taxa de ocupação máxima: 40% para 3+ cabos (NBR 5410 Tabela 48)
  const maxOccupancy = 0.40;
  const requiredArea = totalCableArea / maxOccupancy;

  const sizes: [string, number][] = Object.entries(CONDUIT_INTERNAL_AREA)
    .sort(([, a], [, b]) => a - b);

  for (const [size, area] of sizes) {
    if (area >= requiredArea) {
      return size;
    }
  }

  return '2'; // Fallback para o maior
};

// ═══════════════════════════════════════════════════════════════
// Dimensionamento do Ramal de Entrada (Concessionária)
// ═══════════════════════════════════════════════════════════════

interface EntryServiceResult {
  connectionType: 'monofasico' | 'bifasico' | 'trifasico';
  entryBreakerA: number;
  entryCableMm2: number;
  meterType: string;
  warnings: string[];
}

export const dimensionateEntryService = (
  demandPowerW: number,
  _voltage: number = 220,
  utilityName: string = 'ENEL'
): EntryServiceResult => {
  const warnings: string[] = [];

  let connectionType: 'monofasico' | 'bifasico' | 'trifasico';
  let effectiveVoltage: number;

  if (demandPowerW <= 8000) {
    connectionType = 'monofasico';
    effectiveVoltage = 127;
  } else if (demandPowerW <= 25000) {
    connectionType = 'bifasico';
    effectiveVoltage = 220;
  } else {
    connectionType = 'trifasico';
    effectiveVoltage = 220;
  }

  const demandCurrent = connectionType === 'trifasico'
    ? demandPowerW / (Math.sqrt(3) * effectiveVoltage)
    : demandPowerW / effectiveVoltage;

  // Disjuntor de entrada
  let entryBreakerA = COMMERCIAL_BREAKERS[0];
  for (const breaker of COMMERCIAL_BREAKERS) {
    if (breaker >= demandCurrent) {
      entryBreakerA = breaker;
      break;
    }
    entryBreakerA = breaker;
  }

  // Cabo de entrada (mínimo 6mm² conforme NBR 5410 §6.2.6.1)
  const table = connectionType === 'trifasico' ? AMPACITY_TABLE_3_LOADED : AMPACITY_TABLE_2_LOADED;
  let entryCableMm2 = 6.0;
  for (const sec of COMMERCIAL_SECTIONS) {
    if ((table[sec] || 0) >= demandCurrent) {
      entryCableMm2 = Math.max(sec, 6.0);
      break;
    }
    entryCableMm2 = sec;
  }

  // Tipo de medidor
  let meterType = 'Monofásico 2 fios';
  if (connectionType === 'bifasico') meterType = 'Bifásico 3 fios';
  if (connectionType === 'trifasico') meterType = 'Trifásico 4 fios';

  if (utilityName.toUpperCase().includes('ENEL') && demandPowerW > 75000) {
    warnings.push('Carga acima de 75kW requer análise especial da ENEL para fornecimento em média tensão.');
  }

  return {
    connectionType,
    entryBreakerA,
    entryCableMm2,
    meterType,
    warnings,
  };
};

