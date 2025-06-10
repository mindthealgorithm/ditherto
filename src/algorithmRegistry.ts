/**
 * Registry for dithering algorithms
 * 
 * Provides pluggable algorithm system with built-in algorithms
 */

import type { DitherAlgorithm } from './types.js';

class AlgorithmRegistry {
  private algorithms = new Map<string, DitherAlgorithm>();

  /**
   * Register a new dithering algorithm
   */
  register(algorithm: DitherAlgorithm): void {
    this.algorithms.set(algorithm.name, algorithm);
  }

  /**
   * Get algorithm by name
   */
  get(name: string): DitherAlgorithm | undefined {
    return this.algorithms.get(name);
  }

  /**
   * List all registered algorithm names
   */
  list(): string[] {
    return Array.from(this.algorithms.keys());
  }
}

/** Global algorithm registry instance */
export const algorithms = new AlgorithmRegistry();

// Built-in algorithms will be registered here when implemented