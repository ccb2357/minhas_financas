import Framework7 from 'framework7/bundle';
import 'framework7/css/bundle';
import 'framework7-icons/css/framework7-icons.css';

const app = new Framework7({
    el: '#app',
    name: 'Minhas Finanças',
    theme: 'ios',
});

app.views.create('.view-main');

document.querySelector('#test-framework').addEventListener('click', () => {
    app.dialog.alert(
        'Framework7 Core funcionando.',
        'Minhas Finanças'
    );
});