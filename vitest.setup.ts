// Polyfill básico para ResizeObserver requerido por cmdk/radix em testes jsdom
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-ignore
global.ResizeObserver = global.ResizeObserver || ResizeObserverMock as any

// jsdom não implementa scrollIntoView; fornecer stub
// @ts-ignore
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  // @ts-ignore
  Element.prototype.scrollIntoView = function() {}
}
