const API_BASE = "/api/v1";

export class ApiError extends Error {
    constructor(status, data) {
        super(data.message || "Não foi possível concluir a solicitação.");
        this.name = "ApiError";
        this.status = status;
        this.errors = data.errors || {};
    }
}

async function readResponse(response) {
    const data = response.status === 204 ? null : await response.json();

    if (!response.ok) {
        throw new ApiError(response.status, data || {});
    }

    return data;
}

export async function prepareCsrf() {
    const response = await fetch("/sanctum/csrf-cookie", {
        credentials: "same-origin",
        headers: {
            Accept: "application/json",
        },
    });

    await readResponse(response);
}

export async function apiRequest(path, { method = "GET", data } = {}) {
    const headers = {
        Accept: "application/json",
    };

    if (method !== "GET") {
        const csrfCookie = document.cookie
            .split("; ")
            .find((cookie) => cookie.startsWith("XSRF-TOKEN="));

        if (!csrfCookie) {
            throw new Error("Sessão de segurança ausente. Atualize a página.");
        }

        headers["X-XSRF-TOKEN"] = decodeURIComponent(
            csrfCookie.substring("XSRF-TOKEN=".length),
        );
    }

    if (data !== undefined) {
        headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${API_BASE}${path}`, {
        method,
        credentials: "same-origin",
        headers,
        body: data === undefined ? undefined : JSON.stringify(data),
    });

    return readResponse(response);
}
