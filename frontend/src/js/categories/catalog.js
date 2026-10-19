export const CATEGORY_ICONS = [
    ['cart', 'Alimentação'], ['car_fill', 'Transporte'], ['house', 'Moradia'],
    ['heart', 'Saúde'], ['film', 'Lazer'], ['book', 'Educação'], ['bag', 'Compras'],
    ['gift', 'Presentes'], ['briefcase', 'Trabalho'], ['money_dollar_circle', 'Dinheiro'],
    ['creditcard', 'Assinaturas'], ['airplane', 'Viagens'], ['paw', 'Animais'],
    ['phone', 'Telefone'], ['wifi', 'Internet'], ['bolt', 'Energia'],
    ['sportscourt', 'Esportes'], ['wrench', 'Serviços'], ['tag', 'Etiqueta'],
    ['ellipsis_circle', 'Outros'],
];

export const CATEGORY_COLORS = [
    '#FF503F', '#F59E0B', '#7950F2', '#05944A', '#A33CFF',
    '#F43F6B', '#1599F8', '#00A58A', '#2463EB', '#64748B',
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
