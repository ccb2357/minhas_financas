import Framework7 from 'framework7/bundle';
import 'framework7/css/bundle';
import 'framework7-icons/css/framework7-icons.css';
import '../css/tokens.css';
import '../css/app.css';
import '../css/dashboard.css';
import '../css/dashboard-real.css';
import '../css/reports.css';
import '../css/budgets.css';
import '../css/goals.css';
import '../css/settings.css';
import '../css/categories.css';
import '../css/transactions.css';
import '../css/cycles.css';
import '../css/mobile.css';
import '../css/smart-select.css';
import '../css/date-picker.css';
import '../css/dialogs.css';
import '../css/icon-picker.css';
import '../css/notifications.css';
import '../css/theme.css';
import { createUpdater } from './shared/updates.js';
import { createInstaller } from './shared/install.js';
import { installTheme } from './shared/theme.js';
import { installDialogs } from './shared/dialogs.js';
import { mountAuth } from './auth.js';
import { createWorkspace } from './workspace.js';

const app = new Framework7({
    el: '#app',
    name: 'Minhas Finanças',
    theme: 'ios',
    darkMode: document.documentElement.classList.contains('dark'),
    dialog: { buttonOk: 'Entendi', buttonCancel: 'Cancelar' },
});

const theme = installTheme(app);
installDialogs(app);
const installer = createInstaller(app);
const updates = createUpdater(app);

app.views.create('#auth-view', { router: false });
const workspace = createWorkspace(app, {
    theme, installer, updates,
    logout: () => auth.logout(),
    onSessionExpired: () => auth.expireSession(),
    onPasswordChanged: email => auth.passwordChanged(email),
});
const auth = mountAuth({
    onAuthenticated: user => workspace.show(user),
    onSignedOut: () => workspace.hide(),
});
