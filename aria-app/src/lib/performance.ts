/**
 * Performance monitoring utility
 * Tracks render times, API calls, and memory usage
 */

interface PerformanceMark {
  name: string;
  timestamp: number;
}

interface PerformanceMeasure {
  name: string;
  startMark: string;
  endMark: string;
  duration: number;
  timestamp: number;
}

class PerformanceMonitor {
  private marks: Map<string, PerformanceMark> = new Map();
  private measures: PerformanceMeasure[] = [];
  private renderCounts: Map<string, number> = new Map();

  /**
   * Create a performance mark
   */
  mark(name: string) {
    const mark: PerformanceMark = {
      name,
      timestamp: Date.now(),
    };

    this.marks.set(name, mark);

    if (__DEV__) {
      console.log(`[Performance] Mark: ${name}`);
    }
  }

  /**
   * Measure time between two marks
   */
  measure(name: string, startMark: string, endMark: string) {
    const start = this.marks.get(startMark);
    const end = this.marks.get(endMark);

    if (!start || !end) {
      console.warn(`[Performance] Missing marks for measure: ${name}`);
      return null;
    }

    const duration = end.timestamp - start.timestamp;
    const measure: PerformanceMeasure = {
      name,
      startMark,
      endMark,
      duration,
      timestamp: Date.now(),
    };

    this.measures.push(measure);

    if (__DEV__) {
      console.log(`[Performance] ${name}: ${duration}ms`);
    }

    return duration;
  }

  /**
   * Convenience method: mark start and auto-measure on end
   */
  async trackAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const startMark = `${name}_start`;
    const endMark = `${name}_end`;

    this.mark(startMark);

    try {
      const result = await fn();
      this.mark(endMark);
      this.measure(name, startMark, endMark);
      return result;
    } catch (error) {
      this.mark(endMark);
      this.measure(`${name}_error`, startMark, endMark);
      throw error;
    }
  }

  /**
   * Track synchronous function execution time
   */
  trackSync<T>(name: string, fn: () => T): T {
    const startMark = `${name}_start`;
    const endMark = `${name}_end`;

    this.mark(startMark);

    try {
      const result = fn();
      this.mark(endMark);
      this.measure(name, startMark, endMark);
      return result;
    } catch (error) {
      this.mark(endMark);
      this.measure(`${name}_error`, startMark, endMark);
      throw error;
    }
  }

  /**
   * Track component render
   */
  trackRender(componentName: string) {
    const count = (this.renderCounts.get(componentName) || 0) + 1;
    this.renderCounts.set(componentName, count);

    if (__DEV__ && count > 10) {
      console.warn(`[Performance] ${componentName} has rendered ${count} times`);
    }
  }

  /**
   * Get all measures
   */
  getMeasures(): PerformanceMeasure[] {
    return [...this.measures];
  }

  /**
   * Get measures by name pattern
   */
  getMeasuresByPattern(pattern: RegExp): PerformanceMeasure[] {
    return this.measures.filter((measure) => pattern.test(measure.name));
  }

  /**
   * Get average duration for a measure name
   */
  getAverageDuration(measureName: string): number {
    const measures = this.measures.filter((m) => m.name === measureName);
    if (measures.length === 0) return 0;

    const total = measures.reduce((sum, m) => sum + m.duration, 0);
    return total / measures.length;
  }

  /**
   * Get performance summary
   */
  getSummary() {
    const apiCalls = this.getMeasuresByPattern(/^api_/);
    const screenLoads = this.getMeasuresByPattern(/^screen_/);

    return {
      totalMarks: this.marks.size,
      totalMeasures: this.measures.length,
      apiCalls: {
        count: apiCalls.length,
        averageDuration: apiCalls.length > 0
          ? apiCalls.reduce((sum, m) => sum + m.duration, 0) / apiCalls.length
          : 0,
      },
      screenLoads: {
        count: screenLoads.length,
        averageDuration: screenLoads.length > 0
          ? screenLoads.reduce((sum, m) => sum + m.duration, 0) / screenLoads.length
          : 0,
      },
      renderCounts: Object.fromEntries(this.renderCounts),
    };
  }

  /**
   * Clear all performance data
   */
  clear() {
    this.marks.clear();
    this.measures = [];
    this.renderCounts.clear();
  }

  /**
   * Export performance data as JSON
   */
  export() {
    return {
      marks: Array.from(this.marks.entries()).map(([name, mark]) => ({ name, ...mark })),
      measures: this.measures,
      renderCounts: Object.fromEntries(this.renderCounts),
      summary: this.getSummary(),
    };
  }
}

// Global performance monitor instance
const performanceMonitor = new PerformanceMonitor();

// Export performance monitor
export { performanceMonitor };

// React hooks for performance tracking
import { useEffect, useRef } from 'react';

/**
 * Track component render count
 */
export function useRenderCount(componentName: string) {
  useEffect(() => {
    performanceMonitor.trackRender(componentName);
  });
}

/**
 * Track component mount/unmount time
 */
export function useComponentLifetime(componentName: string) {
  const mountTime = useRef(Date.now());

  useEffect(() => {
    performanceMonitor.mark(`${componentName}_mount`);

    return () => {
      performanceMonitor.mark(`${componentName}_unmount`);
      performanceMonitor.measure(
        `${componentName}_lifetime`,
        `${componentName}_mount`,
        `${componentName}_unmount`
      );

      const lifetime = Date.now() - mountTime.current;
      if (__DEV__) {
        console.log(`[Performance] ${componentName} lifetime: ${lifetime}ms`);
      }
    };
  }, [componentName]);
}

/**
 * Track effect execution time
 */
export function useTrackedEffect(
  effect: () => void | (() => void),
  deps: React.DependencyList,
  effectName: string
) {
  useEffect(() => {
    const startMark = `${effectName}_start`;
    const endMark = `${effectName}_end`;

    performanceMonitor.mark(startMark);
    const cleanup = effect();
    performanceMonitor.mark(endMark);
    performanceMonitor.measure(effectName, startMark, endMark);

    return cleanup;
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}

// Convenience functions for common performance tracking
export const Performance = {
  /**
   * Track API call
   */
  trackAPI: async <T,>(endpoint: string, fn: () => Promise<T>): Promise<T> => {
    return performanceMonitor.trackAsync(`api_${endpoint}`, fn);
  },

  /**
   * Track screen load
   */
  trackScreenLoad: async <T,>(screen: string, fn: () => Promise<T>): Promise<T> => {
    return performanceMonitor.trackAsync(`screen_${screen}`, fn);
  },

  /**
   * Track data transformation
   */
  trackTransform: <T,>(name: string, fn: () => T): T => {
    return performanceMonitor.trackSync(`transform_${name}`, fn);
  },

  /**
   * Get performance report
   */
  getReport: () => performanceMonitor.export(),

  /**
   * Log performance summary to console
   */
  logSummary: () => {
    const summary = performanceMonitor.getSummary();
    console.log('[Performance Summary]', summary);
  },
};

// Monitor memory usage (React Native specific)
export const MemoryMonitor = {
  /**
   * Get current memory usage (if available)
   */
  getCurrentUsage: (): number | null => {
    // In React Native, we can use performance.memory if available
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return null;
  },

  /**
   * Log memory usage
   */
  logUsage: () => {
    const usage = MemoryMonitor.getCurrentUsage();
    if (usage !== null) {
      const mb = (usage / 1024 / 1024).toFixed(2);
      console.log(`[Memory] Current usage: ${mb} MB`);
    }
  },
};

// Auto-log performance summary every 5 minutes in dev mode
if (__DEV__) {
  setInterval(() => {
    Performance.logSummary();
    MemoryMonitor.logUsage();
  }, 5 * 60 * 1000);
}
