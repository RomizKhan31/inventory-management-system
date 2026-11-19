/**
 * Asynchronous Keyed Mutex Utility
 * Serializes concurrent execution per specific key (e.g. product barcode)
 * to prevent race conditions during warehouse intake operations.
 */
export class KeyedMutex {
  private activeChains = new Map<string, Promise<any>>();

  async runExclusive<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const formattedKey = key.trim().toUpperCase();
    const previousPromise = this.activeChains.get(formattedKey) || Promise.resolve();

    let release: () => void;
    const currentPromise = new Promise<void>((resolve) => {
      release = resolve;
    });

    // Chain the next task onto the previous promise
    this.activeChains.set(
      formattedKey,
      previousPromise
        .catch(() => {}) // Ignore errors from previous operation in chain
        .then(() => currentPromise)
    );

    try {
      await previousPromise;
      return await fn();
    } finally {
      release!();
      if (this.activeChains.get(formattedKey) === previousPromise.then(() => currentPromise)) {
        this.activeChains.delete(formattedKey);
      }
    }
  }
}

export const barcodeMutex = new KeyedMutex();
