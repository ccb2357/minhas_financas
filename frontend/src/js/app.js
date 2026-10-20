import Framework7 from 'framework7/bundle';
import 'framework7/css/bundle';
import 'framework7-icons/css/framework7-icons.css';
import '../css/tokens.css';
import '../css/app.css';
import '../css/dashboard.css';
import '../css/dashboard-real.css';
import '../css/reports.css';
import '../css/budgets.css';
import '../css/settings.css';
import '../css/categories.css';
import '../css/transactions.css';
import '../css/mobile.css';
import { mountAuth } from './auth.js';
import { createWorkspace } from './workspace.js';

const app = new Framework7({
    el: '#app',
    name: 'Minhas Finanças',
    theme: 'ios',
    darkMode: false,
    dialog: { buttonOk: 'Entendi', buttonCancel: 'Cancelar' },
});

app.views.create('#auth-view', { router: false });
const workspace = createWorkspace(app, {
    logout: () => auth.logout(),
    onSessionExpired: () => auth.expireSession(),
    onPasswordChanged: email => auth.passwordChanged(email),
});
const auth = mountAuth({
    onAuthenticated: user => workspace.show(user),
    onSignedOut: () => workspace.hide(),
});
