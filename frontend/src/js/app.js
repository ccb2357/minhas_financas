import Framework7 from "framework7/bundle";
import "framework7/css/bundle";
import "framework7-icons/css/framework7-icons.css";
import { use, init } from "echarts/core";
import { BarChart } from "echarts/charts";
import { GridComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { apiRequest, prepareCsrf } from "./api.js";

const app = new Framework7({
    el: "#app",
    name: "Minhas Finanças",
    theme: "ios",
});

app.views.create(".view-main");

document.querySelector("#test-framework").addEventListener("click", () => {
    app.dialog.alert("Framework7 Core funcionando.", "Minhas Finanças");
});

use([BarChart, GridComponent, CanvasRenderer]);

const chartElement = document.querySelector("#test-chart");
const chart = init(chartElement);

chart.setOption({
    grid: {
        left: 55,
        right: 20,
        top: 30,
        bottom: 40,
    },
    xAxis: {
        type: "category",
        data: ["Entradas", "Saídas"],
    },
    yAxis: {
        type: "value",
        name: "R$",
    },
    series: [
        {
            type: "bar",
            barMaxWidth: 70,
            label: {
                show: true,
                position: "top",
            },
            data: [
                { value: 300, itemStyle: { color: "#05944A" } },
                { value: 200, itemStyle: { color: "#E92B3B" } },
            ],
        },
    ],
});

const chartObserver = new ResizeObserver(() => chart.resize());
chartObserver.observe(chartElement);

const loginForm = document.querySelector("#login-form");
const loginSubmit = document.querySelector("#login-submit");
const passwordInput = document.querySelector("#login-password");
const authStatus = document.querySelector("#auth-status");

function showAuthError(error) {
    const fieldErrors = Object.values(error.errors || {}).flat();

    authStatus.textContent = fieldErrors.length
        ? fieldErrors.join(" ")
        : error.message;
}

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (loginSubmit.disabled) return;

    loginSubmit.disabled = true;
    authStatus.textContent = "Entrando...";

    try {
        await prepareCsrf();

        const user = await apiRequest("/auth/login", {
            method: "POST",
            data: {
                email: document.querySelector("#login-email").value.trim(),
                password: passwordInput.value,
                remember: false,
            },
        });

        authStatus.textContent = `Autenticado como ${user.name}.`;
    } catch (error) {
        showAuthError(error);
    } finally {
        passwordInput.value = "";
        loginSubmit.disabled = false;
    }
});

document.querySelector("#check-session").addEventListener("click", async () => {
    try {
        const user = await apiRequest("/me");
        authStatus.textContent = `Sessão ativa: ${user.name}.`;
    } catch (error) {
        showAuthError(error);
    }
});

document.querySelector("#logout-button").addEventListener("click", async () => {
    try {
        await prepareCsrf();
        await apiRequest("/auth/logout", { method: "POST" });
        authStatus.textContent = "Sessão encerrada.";
    } catch (error) {
        showAuthError(error);
    }
});
