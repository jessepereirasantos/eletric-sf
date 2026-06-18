import { describe, it, expect } from 'vitest';
import { dimensionateCircuit } from './nbr5410';

describe('dimensionateCircuit', () => {
  // ─── Basic current calculation ───────────────────────────────
  describe('currentProject (Ip = P / V)', () => {
    it('calculates current for iluminacao 127V', () => {
      const result = dimensionateCircuit('iluminacao', 500, 127, 10, 1);
      // Ip = 500 / (127 * 1.0) = 3.937...
      expect(result.currentProject).toBeCloseTo(3.94, 1);
    });

    it('calculates current for tug 220V with fp=0.8', () => {
      const result = dimensionateCircuit('tug', 3600, 220, 15, 1);
      // Ip = 3600 / (220 * 0.8) = 20.45...
      expect(result.currentProject).toBeCloseTo(20.45, 1);
    });

    it('calculates current for tue 127V', () => {
      const result = dimensionateCircuit('tue', 1200, 127, 5, 1);
      // Ip = 1200 / (127 * 1.0) = 9.45
      expect(result.currentProject).toBeCloseTo(9.45, 1);
    });
  });

  // ─── Grouping factor ─────────────────────────────────────────
  describe('fatorAgrupamento', () => {
    it('uses factor 1.0 for single circuit', () => {
      const result = dimensionateCircuit('iluminacao', 500, 127, 10, 1);
      expect(result.fatorAgrupamento).toBe(1.0);
    });

    it('uses factor 0.80 for 2 grouped circuits', () => {
      const result = dimensionateCircuit('iluminacao', 500, 127, 10, 2);
      expect(result.fatorAgrupamento).toBe(0.80);
    });

    it('uses factor 0.50 for 9+ grouped circuits', () => {
      const result = dimensionateCircuit('iluminacao', 500, 127, 10, 9);
      expect(result.fatorAgrupamento).toBe(0.50);
    });

    it('clamps groupedCircuits to max 20', () => {
      const result = dimensionateCircuit('iluminacao', 500, 127, 10, 25);
      expect(result.fatorAgrupamento).toBe(0.38);
    });

    it('clamps groupedCircuits to min 1', () => {
      const result = dimensionateCircuit('iluminacao', 500, 127, 10, 0);
      expect(result.fatorAgrupamento).toBe(1.0);
    });

    it('corrected current increases with grouping', () => {
      const r1 = dimensionateCircuit('iluminacao', 500, 127, 10, 1);
      const r3 = dimensionateCircuit('iluminacao', 500, 127, 10, 3);
      // Ip' = Ip / Fg, higher grouping → lower Fg → higher corrected current
      expect(r3.currentCorrected).toBeGreaterThan(r1.currentCorrected);
    });
  });

  // ─── Section selection by ampacity ───────────────────────────
  describe('sectionByAmpacity', () => {
    it('selects minimum 1.5mm² for small iluminacao', () => {
      const result = dimensionateCircuit('iluminacao', 300, 127, 5, 1);
      // Ip ≈ 2.36A → 1.5mm² is sufficient (17.5A capacity)
      expect(result.sectionByAmpacity).toBe(1.5);
    });

    it('selects 2.5mm² minimum for tug (normative minimum)', () => {
      const result = dimensionateCircuit('tug', 100, 220, 5, 1);
      // Ip ≈ 0.57A but normative min for tomadas = 2.5mm²
      expect(result.selectedSection).toBeGreaterThanOrEqual(2.5);
    });

    it('selects larger section for high-power circuits', () => {
      const result = dimensionateCircuit('tug', 5000, 220, 20, 4);
      // Ip = 5000 / (220 * 0.8) = 28.41A, corrected = 28.41/0.65 = 43.71A
      expect(result.selectedSection).toBeGreaterThanOrEqual(6.0);
    });
  });

  // ─── Voltage drop ────────────────────────────────────────────
  describe('voltageDropPercent', () => {
    it('calculates voltage drop within limit for short distance', () => {
      const result = dimensionateCircuit('iluminacao', 500, 127, 5, 1);
      expect(result.voltageDropPercent).toBeLessThanOrEqual(4.0);
    });

    it('increases section when voltage drop exceeds 4%', () => {
      const short = dimensionateCircuit('tug', 3600, 220, 10, 1);
      const long = dimensionateCircuit('tug', 3600, 220, 80, 1);
      // Long distance should require larger section
      expect(long.selectedSection).toBeGreaterThanOrEqual(short.selectedSection);
    });

    it('keeps voltage drop under 4% even for long distances', () => {
      const result = dimensionateCircuit('tug', 3600, 220, 100, 1);
      expect(result.voltageDropPercent).toBeLessThanOrEqual(4.0);
    });
  });

  // ─── Circuit breaker selection ───────────────────────────────
  describe('circuitBreaker', () => {
    it('selects breaker >= currentProject', () => {
      const result = dimensionateCircuit('iluminacao', 500, 127, 10, 1);
      expect(result.circuitBreaker).toBeGreaterThanOrEqual(result.currentProject);
    });

    it('selects standard commercial breaker value', () => {
      const standardBreakers = [10, 16, 20, 25, 32, 40, 50, 63, 70, 80, 100];
      const result = dimensionateCircuit('tug', 3600, 220, 15, 1);
      expect(standardBreakers).toContain(result.circuitBreaker);
    });

    it('does not exceed corrected ampacity', () => {
      const result = dimensionateCircuit('tug', 3600, 220, 15, 1);
      expect(result.circuitBreaker).toBeLessThanOrEqual(result.correctedAmpacity);
    });
  });

  // ─── Consistency checks ─────────────────────────────────────
  describe('result consistency', () => {
    it('correctedAmpacity = maxAmpacity * fatorAgrupamento', () => {
      const result = dimensionateCircuit('iluminacao', 1000, 127, 10, 3);
      expect(result.correctedAmpacity).toBeCloseTo(result.maxAmpacity * result.fatorAgrupamento, 2);
    });

    it('currentCorrected = currentProject / fatorAgrupamento', () => {
      const result = dimensionateCircuit('tug', 2000, 220, 10, 4);
      expect(result.currentCorrected).toBeCloseTo(result.currentProject / result.fatorAgrupamento, 2);
    });

    it('selectedSection >= sectionByAmpacity', () => {
      const result = dimensionateCircuit('iluminacao', 2000, 127, 30, 5);
      expect(result.selectedSection).toBeGreaterThanOrEqual(result.sectionByAmpacity);
    });

    it('selectedSection >= sectionByVoltageDrop', () => {
      const result = dimensionateCircuit('tug', 4000, 220, 50, 2);
      expect(result.selectedSection).toBeGreaterThanOrEqual(result.sectionByVoltageDrop);
    });
  });

  // ─── Edge cases ─────────────────────────────────────────────
  describe('edge cases', () => {
    it('handles zero distance', () => {
      const result = dimensionateCircuit('iluminacao', 500, 127, 0, 1);
      expect(result.voltageDropPercent).toBe(0);
      expect(result.selectedSection).toBeGreaterThanOrEqual(1.5);
    });

    it('handles very high power', () => {
      const result = dimensionateCircuit('tue', 15000, 220, 30, 1);
      expect(result.selectedSection).toBe(16); // limited by ampacity (15000W → 85A → 16mm²)
      expect(result.circuitBreaker).toBe(70); // fallback: last breaker ≤ correctedAmpacity
    });

    it('handles very low power', () => {
      const result = dimensionateCircuit('iluminacao', 50, 127, 3, 1);
      expect(result.selectedSection).toBe(1.5);
      expect(result.circuitBreaker).toBe(10);
    });
  });
});
