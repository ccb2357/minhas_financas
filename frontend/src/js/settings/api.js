import { apiRequest } from '../api.js';

export const updateProfile = data => apiRequest('/me', { method: 'PATCH', data });
export const updatePassword = data => apiRequest('/me/password', { method: 'PUT', data });
export function settingsError(error) {
    if (error.status === 422) return 'Confira os campos indicados para continuar.';
    if (error.status === 429) return 'Muitas tentativas. Aguarde um minuto antes de tentar novamente.';
    if (error.status === 419) return 'Sua sessão de segurança expirou. Atualize a página antes de tentar novamente.';
    if (error.status >= 500) return 'Não foi possível salvar agora. Tente novamente em instantes.';
    return 'Não foi possível conectar. Confira sua conexão e tente novamente.';
}
