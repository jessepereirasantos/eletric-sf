# Plano de Expansão e Upgrade BIM: Eletric SF

Este documento estabelece as diretrizes arquiteturais, estruturas de dados e abordagens matemáticas para implementar o upgrade de interatividade, parametrização e pranchas de impressão (Paper Space) no editor CAD.

---

## 1. Interatividade e Edição com Konva.js (React-Konva)

### A. Estrutura de Estado (Zustand)
No arquivo [useCadStore.ts](file:///c:/Users/Silvana%20Barbosa/Desktop/eletric-sf/client/src/store/useCadStore.ts), expandiremos o estado para armazenar e rastrear o elemento atualmente selecionado no editor 2D:

```typescript
export interface SelectedEntity {
  id: string;
  type: 'wall' | 'device' | 'conduit';
}

interface CadState {
  // Estado de Seleção
  selectedEntity: SelectedEntity | null;
  setSelectedEntity: (entity: SelectedEntity | null) => void;

  // Ações de Atualização Reativa
  updateDevice: (id: string, updates: Partial<Omit<Device, 'id'>>) => void;
  deleteDevice: (id: string) => void;
  updateWall: (id: string, updates: Partial<Omit<Wall, 'id'>>) => void;
  deleteWall: (id: string) => void;
}
```

### B. Listeners de Eventos no React-Konva
Para cada elemento renderizado (Paredes, Dispositivos e Eletrodutos), anexaremos os seguintes listeners no componente `CadCanvas.tsx`:
- `onClick` / `onTap`:
  - Captura o ID do elemento e seu tipo.
  - Dispara `setSelectedEntity({ id, type })` na Store.
  - Para a propagação do evento (`e.cancelBubble = true`) para evitar que clicar no elemento desmarque a seleção ao clicar no fundo do Stage.

### C. Destaque Visual com `Konva.Transformer`
- Adicionaremos um nó `<Transformer />` reativo no Stage.
- Ao selecionar um dispositivo ou parede, salvaremos a referência do nó Konva correspondente (`useRef`) e a associaremos ao `Transformer` via `transformerRef.current.nodes([node])`.
- O `Transformer` habilitará guias visuais de rotação e redimensionamento, salvando as novas coordenadas e rotações de volta para a store do Zustand no evento `onTransformEnd`.

### D. Sidebar Lateral Dinâmica (`PropertiesPanel.tsx`)
- A Sidebar lerá `selectedEntity` da store.
- **Entidade selecionada = Dispositivo:** Exibirá campos de edição para Potência (W), Tensão (127V/220V), Nome, Angulação e a qual Circuito ele está associado.
- **Entidade selecionada = Parede:** Exibirá campos para ajustar Espessura (cm), Altura (m) e Tipo de Material.
- **Botão Excluir:** Um botão de lixeira vermelha que dispara `deleteDevice(id)` ou `deleteWall(id)`, recalculando imediatamente o orçamento, fiação e bitolas elétricas.

---

## 2. Parametrização e Estilo Arquitetônico

### A. Estilo das Paredes
- Substituiremos a hachura antiga de 45º por preenchimento sólido de cinza suave (`#e2e8f0` para light theme) com contornos externos nítidos e escuros (`#475569`). Isto confere um aspecto de planta técnica limpa e profissional.

### B. Esquadrias Inteligentes (Corte Automático de Parede)
- **Autoajuste de Espessura:** No evento `onDragMove` ou `onDragEnd` do dispositivo (ex: porta ou janela), faremos uma busca por projeção ortogonal em relação aos segmentos de parede próximos. Se o dispositivo estiver a menos de 10px de uma parede, ele fará o snap nela e atualizará sua espessura física para bater 100% com a espessura da parede sob ele (ex: 15cm).
- **Corte Geométrico da Alvenaria:** 
  - Para que a parede pareça "cortada" no local das portas e janelas, cada parede manterá uma lista de "vãos livres" ou "subtrações" em seu estado.
  - Ao renderizar a parede no Konva, desenharemos o polígono da parede utilizando operações de desenho baseadas em caminhos (`Path` ou `Canvas Context`) que pulam/subtraem o trecho intersectado pela porta ou janela.
  - Alternativamente, faremos a renderização da parede em subsegmentos ou usaremos máscaras de composição do Canvas (`globalCompositeOperation = 'destination-out'`) para apagar o preenchimento da parede exatamente na caixa delimitadora da janela ou porta.
- **Novas Esquadrias:** Implementação gráfica dos símbolos técnicos para:
  - *Porta de Giro:* Arco de abertura clássico de 90 graus.
  - *Porta de Correr:* Painéis paralelos sobrepostos com linhas de trilho.
  - *Porta Pivotante:* Eixo de rotação deslocado com abertura em arco menor.
  - *Vão Livre:* Um retângulo tracejado transparente que apenas remove o preenchimento sólido da parede.

---

## 3. Expansão Massiva do Catálogo BIM

Expandiremos o catálogo de símbolos em [types.ts](file:///c:/Users/Silvana%20Barbosa/Desktop/eletric-sf/client/src/types.ts) e a renderização em [DeviceSymbol.tsx](file:///c:/Users/Silvana%20Barbosa/Desktop/eletric-sf/client/src/components/Cad2D/DeviceSymbol.tsx).

### Categorias e Elementos Adicionais:
1. **Telecomunicações e Redes:**
   - Tomada de RJ45 (Rede/Dados) — Símbolo normativo: Triângulo dividido ao meio.
   - Tomada de RJ11 (Telefone) — Símbolo normativo: Triângulo simples com "T".
   - Tomada Coaxial (TV) — Símbolo: Triângulo com "TV".
2. **Segurança Eletrônica e Automação:**
   - Câmera CFTV — Símbolo: Desenho estilizado de câmera de segurança vetorial.
   - Sensor de Presença de Parede/Teto — Símbolo: Círculo com "S" interno.
   - Central de Alarme — Símbolo: Retângulo com "AL".
3. **Elétrica Avançada:**
   - Interruptor Paralelo + Tomada na mesma caixa.
   - Interruptor Intermediário (Four-Way).
   - Caixa de Entrada Trifásica / Padrão de Entrada da concessionária (Poste de entrada com representação de fiação subterrânea ou aérea).
4. **Regras de Lançamento BIM:**
   - Cada novo componente arrastado conterá metadados em sua estrutura (Ex: preço unitário, categoria de material e conexões elétricas/lógicas).
   - O estado global de materiais computará instantaneamente esses itens na tabela de orçamentos e emitirá avisos se a concessionária exigir bifásico/trifásico com base na carga total somada dos novos elementos elétricos instalados.

---

## 4. Pranchas de Impressão (Paper Space)

Adicionaremos a funcionalidade de "Folhas Técnicas de Impressão" com limites normativos ABNT.

### A. Modelagem das Pranchas
Armazenaremos as dimensões das pranchas físicas em escala real no Zustand:
- **A0:** 1189 x 841 mm
- **A1:** 841 x 594 mm
- **A2:** 594 x 420 mm
- **A3:** 420 x 297 mm
- **A4:** 297 x 210 mm

### B. Elementos da Folha (Paper Space)
- **Margens Técnicas:** Linha de borda externa e interna (ex: 25mm na esquerda para encadernação, 10mm nas outras bordas para A0-A3; 5mm para A4).
- **Selo / Carimbo Técnico (Carimbo ABNT):**
  - Renderizado no canto inferior direito da prancha.
  - Conterá campos automáticos e editáveis: Título do Projeto, Nome do Proprietário, Nome do Responsável Técnico (CREA/CAU), Escala de Desenho, Data, Número da Prancha (ex: PR-01/01) e Logo do cliente.
- **Viewport de Encaixe:**
  - O usuário poderá visualizar a folha como fundo na tela e arrastar/ajustar a planta baixa dentro da Viewport da folha.
  - Permitirá alterar a escala de plotagem (Ex: 1:50, 1:100) e ajustar a posição da planta baixa para que caiba perfeitamente antes da geração do PDF de alta resolução.
- **Importação de Plantas Externas:** O usuário pode carregar uma planta técnica em imagem/PDF, desenhar a fiação e os circuitos por cima no Canvas CAD e em seguida plotar tudo diretamente na prancha selecionada com o carimbo preenchido.
