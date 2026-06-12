// Resistividade do cobre a 70°C em Ohm.mm²/m (conforme NBR 5410)
const RESISTIVITY_COPPER = 0.0225;

// Tabela 36: Capacidade de condução de corrente (A) para condutores de cobre
// Método de instalação B1 (condutores isolados em eletroduto embutido em alvenaria)
// Para 2 condutores carregados (fase-neutro ou fase-fase)
const AMPACITY_TABLE_2_LOADED: Record<number, number> = {
  1.5: 17.5,
  2.5: 24,
  4.0: 32,
  6.0: 41,
  10.0: 57,
  16.0: 76,
  25.0: 101,
  35.0: 125,
  50.0: 151
};

// Tabela 42: Fator de agrupamento de circuitos (para eletroduto embutido)
const GROUPING_FACTORS: Record<number, number> = {
  1: 1.0,
  2: 0.80,
  3: 0.70,
  4: 0.65,
  5: 0.60,
  6: 0.57,
  7: 0.54,
  8: 0.52,
  9: 0.50
};

// Disjuntores termomagnéticos bipolares/monopolares comerciais comuns (Corrente nominal In)
const COMMERCIAL_BREAKERS = [10, 16, 20, 25, 32, 40, 50, 63, 70, 80, 100];

export interface DimensioningResult {
  currentProject: number;      // Ip (A)
  currentCorrected: number;    // Ip' = Ip / Fg (A)
  selectedSection: number;     // Seção comercial adotada (mm²)
  sectionByAmpacity: number;   // Seção mínima exigida por corrente (mm²)
  sectionByVoltageDrop: number;// Seção exigida por queda de tensão (mm²)
  maxAmpacity: number;         // Iz - capacidade máxima do cabo no método (A)
  correctedAmpacity: number;   // Iz' = Iz * Fg (A)
  voltageDropPercent: number;  // Queda de tensão calculada (%)
  circuitBreaker: number;      // Disjuntor termomagnético selecionado (A)
  fatorAgrupamento: number;    // Fator aplicado
}

/**
 * Dimensiona um circuito elétrico residencial/predial de acordo com a NBR 5410.
 * 
 * @param type Tipo de circuito ('iluminacao' | 'tug' | 'tue')
 * @param totalPower Potência ativa total (W ou VA)
 * @param voltage Tensão nominal (127 ou 220 V)
 * @param distanceMeters Distância geométrica entre o QDC e o ponto mais distante (metros)
 * @param groupedCircuits Quantidade de circuitos agrupados no mesmo eletroduto (mínimo 1)
 */
export const dimensionateCircuit = (
  type: 'iluminacao' | 'tug' | 'tue',
  totalPower: number,
  voltage: 127 | 220,
  distanceMeters: number,
  groupedCircuits: number = 1
): DimensioningResult => {
  // 1. Calcula fator de potência estimado
  // Iluminação e TUEs comumente resistivos (fp = 1.0). TUGs com fp = 0.8 (NBR 5410 para perdas)
  const powerFactor = type === 'tug' ? 0.8 : 1.0;
  
  // 2. Corrente de Projeto (Ip = P / V)
  const currentProject = totalPower / (voltage * powerFactor);
  
  // 3. Fator de Agrupamento (Fg)
  const factorIndex = Math.max(1, Math.min(9, groupedCircuits));
  const fatorAgrupamento = GROUPING_FACTORS[factorIndex];
  
  // Corrente corrigida para dimensionamento térmico (Ip' = Ip / Fg)
  const currentCorrected = currentProject / fatorAgrupamento;

  // 4. Bitola Mínima Normativa por Capacidade de Condução (Tabela 36 - Cobre B1)
  let sectionByAmpacity = 1.5;
  const sections = Object.keys(AMPACITY_TABLE_2_LOADED)
    .map(Number)
    .sort((a, b) => a - b);

  for (const sec of sections) {
    if (AMPACITY_TABLE_2_LOADED[sec] >= currentCorrected) {
      sectionByAmpacity = sec;
      break;
    }
    // Fallback para bitola máxima se estourar tabela
    sectionByAmpacity = sec;
  }

  // Seção mínima regulamentada (Iluminação = 1.5mm², Tomadas = 2.5mm²)
  const sectionMinNormative = type === 'iluminacao' ? 1.5 : 2.5;
  let adoptedSection = Math.max(sectionByAmpacity, sectionMinNormative);
  
  // Salva a bitola prévia antes do critério de queda de tensão
  const initialSectionByAmpacity = adoptedSection;

  // 5. Critério de Queda de Tensão (Limite máximo admissível = 4% para tomadas/iluminação)
  // Delta V% = (2 * rho * L * Ip) / (S * V) * 100
  let voltageDropPercent = 0;
  let sectionByVoltageDrop = adoptedSection;
  const maxVoltageDrop = 4.0; // 4%

  while (true) {
    // Cálculo da queda de tensão para circuito monofásico/bifásico (2 condutores)
    voltageDropPercent = ((2 * RESISTIVITY_COPPER * distanceMeters * currentProject) / (adoptedSection * voltage)) * 100;
    
    if (voltageDropPercent <= maxVoltageDrop) {
      sectionByVoltageDrop = adoptedSection;
      break;
    }

    // Se a queda de tensão estourar 4%, incrementamos a bitola para a próxima seção comercial
    const currentIndex = sections.indexOf(adoptedSection);
    if (currentIndex < sections.length - 1) {
      adoptedSection = sections[currentIndex + 1];
    } else {
      // Já estamos na maior bitola (50mm²)
      sectionByVoltageDrop = adoptedSection;
      break;
    }
  }

  // 6. Capacidades térmicas do cabo adotado
  const maxAmpacity = AMPACITY_TABLE_2_LOADED[adoptedSection];
  const correctedAmpacity = maxAmpacity * fatorAgrupamento; // Iz' = Iz * Fg

  // 7. Dimensionamento do Disjuntor (Ip <= In <= Iz')
  let selectedBreaker = COMMERCIAL_BREAKERS[0];
  for (const breaker of COMMERCIAL_BREAKERS) {
    if (breaker >= currentProject && breaker <= correctedAmpacity) {
      selectedBreaker = breaker;
      break;
    }
    // Caso de sobrecarga (corrente corrigida menor que corrente do disjuntor ideal)
    // Selecionamos o disjuntor mais próximo que proteja o cabo
    if (breaker <= correctedAmpacity) {
      selectedBreaker = breaker;
    }
  }

  return {
    currentProject,
    currentCorrected,
    selectedSection: adoptedSection,
    sectionByAmpacity: initialSectionByAmpacity,
    sectionByVoltageDrop,
    maxAmpacity,
    correctedAmpacity,
    voltageDropPercent,
    circuitBreaker: selectedBreaker,
    fatorAgrupamento
  };
};
