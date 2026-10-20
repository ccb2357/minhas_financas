export const normalizeEmail = value => value.trim().toLowerCase();
export const emailChanged = (value, original) => normalizeEmail(value) !== original;
export const validPasswordLength = value => Array.from(value).length >= 12;
export const validPasswordBytes = value => new TextEncoder().encode(value).length <= 72 && !value.includes('\0');

export function profilePayload(name, email, currentPassword, originalEmail) {
    const data = { name: name.trim(), email: normalizeEmail(email) };
    if (emailChanged(email, originalEmail)) data.current_password = currentPassword;
    return data;
}
