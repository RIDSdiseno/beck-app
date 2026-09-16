let revision = 0;
const listeners = new Set<() => void>();

export function getFirematInventoryRevision() {
  return revision;
}

export function markFirematInventoryChanged() {
  revision += 1;
  listeners.forEach((listener) => listener());
}

export function subscribeFirematInventoryChanges(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
