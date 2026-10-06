import { beforeEach } from "vitest";

/** 브라우저 저장소 대역 — quota를 흉내 내기 위해 최대 크기를 조절할 수 있다. */
class MemoryStorage {
  private map = new Map<string, string>();
  quota = Infinity;
  get length() {
    return this.map.size;
  }
  key(i: number) {
    return Array.from(this.map.keys())[i] ?? null;
  }
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    const size = Array.from(this.map.entries()).reduce((a, [key, val]) => a + (key === k ? 0 : val.length), 0) + v.length;
    if (size > this.quota) throw new DOMException("quota", "QuotaExceededError");
    this.map.set(k, String(v));
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  clear() {
    this.map.clear();
  }
}

const storage = new MemoryStorage();
// Object.keys(localStorage)가 저장된 키를 돌려주도록 Proxy로 감싼다.
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: new Proxy(storage, {
    ownKeys: (t) => Array.from((t as unknown as { map: Map<string, string> }).map.keys()),
    getOwnPropertyDescriptor: (t, k) =>
      typeof k === "string" && (t as unknown as { map: Map<string, string> }).map.has(k)
        ? { enumerable: true, configurable: true, value: t.getItem(k) }
        : undefined,
  }),
});

beforeEach(() => {
  storage.clear();
  storage.quota = Infinity;
});

export { storage };
