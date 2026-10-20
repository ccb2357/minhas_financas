import { ICON_CATALOG } from './icon-catalog.js';

export const CATEGORY_ICONS = ICON_CATALOG.map(item => [item.id, item.label]);

export const CATEGORY_COLORS = [
    '#FF503F', '#F43F6B', '#F59E0B', '#EAB308', '#05944A', '#00A58A',
    '#1599F8', '#2463EB', '#7950F2', '#A33CFF', '#EC4899', '#DB2777',
    '#F97316', '#84CC16', '#14B8A6', '#0EA5E9', '#64748B', '#334155',
];

export function safeColor(value) {
    return /^#[0-9a-f]{6}$/i.test(value) ? value.toUpperCase() : '#2463EB';
}

export function safeIcon(value) {
    return CATEGORY_ICONS.some(([name]) => name === value) ? value : 'tag';
}

export function operationMessage(error) {
    if (error.status === 419) return 'A sessão de segurança expirou. Tente novamente.';
    if (error.status === 422) return 'Confira os campos indicados para continuar.';
    if (error.status === 404) return 'Esta categoria não está mais disponível. Atualize a lista.';
    if (error.status === 429) return 'Muitas solicitações. Aguarde um instante e tente novamente.';
    if (error.status >= 500) return 'Não foi possível concluir agora. Tente novamente em instantes.';
    return 'Não foi possível confirmar a operação. Confira sua conexão antes de tentar novamente.';
}
