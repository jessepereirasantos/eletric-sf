import type { Conduit, Circuit } from '../store/useCadStore';
import type { Device } from '../store/useCadStore';

export interface ConduitWires {
  circuitNumber: number;
  circuitType: 'iluminacao' | 'tug' | 'tue';
  voltage: 127 | 220;
  phase: number;   // quantidade de fios fase
  neutral: number; // quantidade de fios neutro
  ground: number;  // quantidade de fios terra
  ret: number;     // quantidade de fios retorno (ret é abreviação de retorno para evitar conflito com palavra reservada)
}

export type RoutingResult = Record<string, ConduitWires[]>;

/**
 * Encontra o menor caminho em um grafo de dispositivos e conduítes usando Busca em Largura (BFS).
 * Retorna uma lista de IDs de conduítes que formam o caminho do início ao fim.
 */
const findShortestPath = (
  startId: string,
  endId: string,
  devices: Device[],
  conduits: Conduit[]
): string[] | null => {
  if (startId === endId) return [];

  // Constrói lista de adjacências
  const adj: Record<string, Array<{ to: string; conduitId: string }>> = {};
  devices.forEach(d => {
    adj[d.id] = [];
  });
  
  conduits.forEach(c => {
    if (adj[c.fromDeviceId] && adj[c.toDeviceId]) {
      adj[c.fromDeviceId].push({ to: c.toDeviceId, conduitId: c.id });
      adj[c.toDeviceId].push({ to: c.fromDeviceId, conduitId: c.id });
    }
  });

  const queue: string[] = [startId];
  const visited = new Set<string>([startId]);
  
  // Rastreamento dos pais para reconstruir o caminho: nodeId -> { parentNodeId, conduitId }
  const parentMap: Record<string, { parent: string; conduitId: string }> = {};

  let found = false;
  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (curr === endId) {
      found = true;
      break;
    }

    const neighbors = adj[curr] || [];
    for (const edge of neighbors) {
      if (!visited.has(edge.to)) {
        visited.add(edge.to);
        parentMap[edge.to] = { parent: curr, conduitId: edge.conduitId };
        queue.push(edge.to);
      }
    }
  }

  if (!found) return null;

  // Reconstrói o caminho de conduítes de trás para frente
  const path: string[] = [];
  let temp = endId;
  while (temp !== startId) {
    const edge = parentMap[temp];
    if (!edge) break;
    path.push(edge.conduitId);
    temp = edge.parent;
  }

  return path.reverse();
};

/**
 * Calcula a fiação normatizada (Fase, Neutro, Terra, Retorno) que passa em cada conduíte.
 * Retorna um objeto mapeando o Conduit ID para a lista de fios dos respectivos circuitos.
 */
export const calculateWiringRouting = (
  devices: Device[],
  conduits: Conduit[],
  circuits: Circuit[]
): RoutingResult => {
  const result: RoutingResult = {};
  
  // Helpers para identificar tipos de dispositivos
  const isLampType = (type: string) => {
    return type === 'lampada' ||
           type === 'ceiling_light' ||
           type === 'sconce' ||
           type === 'fluorescent' ||
           type === 'lampada_parede';
  };

  const isSwitchType = (type: string) => {
    return type.startsWith('switch_') || type.startsWith('interruptor');
  };

  const isLoadType = (type: string) => {
    return type.startsWith('tomada') ||
           type.startsWith('tug_') ||
           type.startsWith('tue_') ||
           type === 'tomada_220' ||
           isLampType(type);
  };

  // Inicializa o resultado para cada conduíte
  conduits.forEach(c => {
    if (c.isManualWiring && c.manualWires) {
      // Mapeia fios manuais para o formato ConduitWires
      result[c.id] = c.manualWires.map(mw => {
        const circ = circuits.find(circItem => circItem.id === mw.circuitId);
        return {
          circuitNumber: circ ? circ.number : 1,
          circuitType: circ ? circ.type : 'tug',
          voltage: circ ? circ.voltage : 127,
          phase: mw.phase,
          neutral: mw.neutral,
          ground: mw.ground,
          ret: mw.ret
        };
      }).filter(wires => wires.phase > 0 || wires.neutral > 0 || wires.ground > 0 || wires.ret > 0);
    } else {
      result[c.id] = [];
    }
  });

  const qdc = devices.find(d => d.type === 'qdc');
  if (!qdc) return result; // Sem QDC, impossível fazer o roteamento do barramento geral

  // Processa cada circuito de forma independente
  circuits.forEach(circ => {
    const circuitDevices = devices.filter(d => d.circuitId === circ.id);
    if (circuitDevices.length === 0) return;

    // Auxiliar para registrar condutores em um conduíte para este circuito (apenas se for fiação automática)
    const addWires = (conduitId: string, wires: Partial<ConduitWires>) => {
      const cond = conduits.find(c => c.id === conduitId);
      if (cond?.isManualWiring) return; // ignora conduíte com fiação manual

      const list = result[conduitId];
      if (!list) return;

      let wireEntry = list.find(w => w.circuitNumber === circ.number);
      if (!wireEntry) {
        wireEntry = {
          circuitNumber: circ.number,
          circuitType: circ.type,
          voltage: circ.voltage,
          phase: 0,
          neutral: 0,
          ground: 0,
          ret: 0
        };
        list.push(wireEntry);
      }

      if (wires.phase) wireEntry.phase += wires.phase;
      if (wires.neutral) wireEntry.neutral += wires.neutral;
      if (wires.ground) wireEntry.ground += wires.ground;
      if (wires.ret) wireEntry.ret += wires.ret;
    };

    // 1. Roteamento de Cargas (Tomadas e Lâmpadas)
    const loadDevices = circuitDevices.filter(d => isLoadType(d.type));

    loadDevices.forEach(load => {
      const path = findShortestPath(qdc.id, load.id, devices, conduits);
      if (!path) return; // Dispositivo isolado da malha de eletrodutos

      path.forEach(conduitId => {
        if (circ.type === 'iluminacao' || circ.voltage === 127) {
          // Monofásico 127V: Fase, Neutro, Terra
          addWires(conduitId, { phase: 1, neutral: 1, ground: 1 });
        } else {
          // Bifásico 220V (TUGs/TUEs): Fase, Fase, Terra
          addWires(conduitId, { phase: 2, ground: 1 });
        }
      });
    });

    // 2. Roteamento de Interruptores (Comandos de Iluminação)
    const switches = circuitDevices.filter(d => isSwitchType(d.type));
    switches.forEach(sw => {
      // O interruptor precisa receber a Fase do QDC
      const pathQdcToSw = findShortestPath(qdc.id, sw.id, devices, conduits);
      if (pathQdcToSw) {
        pathQdcToSw.forEach(conduitId => {
          addWires(conduitId, { phase: 1 });
        });
      }

      // O interruptor precisa mandar o Retorno para a lâmpada com mesma commandLetter no mesmo circuito
      const swLetter = sw.commandLetter?.trim().toLowerCase();
      const lamps = circuitDevices.filter(d => {
        if (!isLampType(d.type)) return false;
        if (!swLetter) return true; // se o interruptor não tem comando cadastrado, liga a qualquer lâmpada do circuito
        return d.commandLetter?.trim().toLowerCase() === swLetter;
      });

      let minLength = Infinity;
      let shortestLampPath: string[] | null = null;

      for (const lamp of lamps) {
        const path = findShortestPath(sw.id, lamp.id, devices, conduits);
        if (path && path.length < minLength) {
          minLength = path.length;
          shortestLampPath = path;
        }
      }

      if (shortestLampPath) {
        for (const conduitId of shortestLampPath) {
          addWires(conduitId, { ret: 1 });
        }
      }
    });
  });

  // Limpa entradas vazias ou duplicadas por conduíte
  Object.keys(result).forEach(conduitId => {
    const cond = conduits.find(c => c.id === conduitId);
    if (cond?.isManualWiring) return; // ignora ajuste automático para conduítes manuais

    result[conduitId] = result[conduitId].map(wires => {
      // Garante limites físicos lógicos (máximo 2 fase, 1 neutro, 1 terra por circuito por eletroduto)
      return {
        ...wires,
        phase: Math.min(2, wires.phase),
        neutral: Math.min(1, wires.neutral),
        ground: Math.min(1, wires.ground),
        ret: Math.min(3, wires.ret) // suporta interruptores double/triple
      };
    }).filter(wires => wires.phase > 0 || wires.neutral > 0 || wires.ground > 0 || wires.ret > 0);
  });

  return result;
};
