export class MeasurementsEngine {
  private static instance: MeasurementsEngine;
  private inputRef: HTMLInputElement | null = null;
  private onCommitCallback: ((value: string) => void) | null = null;

  private constructor() {
    this.handleGlobalKeyDown = this.handleGlobalKeyDown.bind(this);
  }

  public static getInstance(): MeasurementsEngine {
    if (!MeasurementsEngine.instance) {
      MeasurementsEngine.instance = new MeasurementsEngine();
    }
    return MeasurementsEngine.instance;
  }

  public attachInput(ref: HTMLInputElement) {
    this.inputRef = ref;
  }

  public detachInput() {
    this.inputRef = null;
  }

  public onCommit(callback: (value: string) => void) {
    this.onCommitCallback = callback;
  }

  public init() {
    window.addEventListener('keydown', this.handleGlobalKeyDown);
  }

  public destroy() {
    window.removeEventListener('keydown', this.handleGlobalKeyDown);
  }

  private handleGlobalKeyDown(e: KeyboardEvent) {
    // Ignorar se já estamos digitando num input/textarea, EXCETO se for a nossa própria Measurements Box
    const target = e.target as HTMLElement;
    if (
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') &&
      target !== this.inputRef
    ) {
      return;
    }

    // Se estivermos dentro da Measurements Box e apertar Enter
    if (e.key === 'Enter') {
      if (this.inputRef && this.inputRef.value.trim() !== '') {
        const val = this.inputRef.value;
        if (this.onCommitCallback) {
          this.onCommitCallback(val);
        }
        // Limpar
        this.inputRef.value = '';
        this.inputRef.blur(); // Tira o foco
        e.preventDefault();
      }
      return;
    }

    // Teclas numéricas válidas para começar a digitar medidas (e focar no input)
    const isValidChar = /^[0-9.,;x*/+-]$/.test(e.key);
    
    // Se digitou número/simbolo e não tá focado, vamos focar a caixa
    if (isValidChar && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (this.inputRef && document.activeElement !== this.inputRef) {
        this.inputRef.focus();
        // O caractere vai pro input automaticamente pelo navegador porque demos focus antes do preventDefault.
        // Contudo, as vezes precisa injetar manualmente se o evento foi capturado antes.
        // O focus em keydown geralmente permite que o keypress posterior coloque o caractere.
      }
    }
  }
}

export const measurementsEngine = MeasurementsEngine.getInstance();
