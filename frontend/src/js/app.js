import Framework7 from "framework7/bundle";
import "framework7/css/bundle";
import "framework7-icons/css/framework7-icons.css";
import "../css/tokens.css";
import "../css/app.css";
import { mountAuth } from "./auth.js";

const app = new Framework7({
    el: "#app",
    name: "Minhas Finanças",
    theme: "ios",
    darkMode: false,
});

app.views.create(".view-main");
mountAuth();
