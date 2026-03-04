// API Host configuration
// Em produção, o nginx faz proxy de /api para o backend
// Em desenvolvimento local, aponta para localhost:5000
const getApiHost = () => {
  // Se API_URL foi injetada em build time (Coolify/Docker)
  if (typeof (window as any).__API_URL__ !== 'undefined') {
    return (window as any).__API_URL__
  }
  
  // Se está rodando em produção (mesmo domínio), usa URL relativa
  if (window.location.hostname !== 'localhost') {
    return '' // URL relativa - nginx faz proxy
  }
  
  // Desenvolvimento local
  return 'http://localhost:5000'
}

export default {
    stripePublicKey: 'pk_test_51Jgd9jGNYtsG7QwKKugAEoZFvrEx5dMkHUPUPyAn8GNnxGGqHRI2w8HujTCZeGOdtSgWbDHv8ZqiC5Bgnocey4ht0096uR9lH0',
    apiHost: getApiHost()
}