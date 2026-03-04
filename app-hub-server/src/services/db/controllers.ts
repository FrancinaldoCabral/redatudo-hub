// controllers.ts
// Singleton para compartilhar no app todo

const controllers = new Map<string, AbortController>();
export default controllers;