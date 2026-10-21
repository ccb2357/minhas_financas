import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const digest = value => createHash('sha256').update(value).digest('hex');

// No new build dependency. Vite owns hashing/bundling; this plugin lists only public assets.
export function minhasFinancasPwa() {
    let config;
    return {
        name:'minhas-financas-pwa', apply:'build', enforce:'post',
        configResolved(value) {
            config = value;
            if (config.base !== '/') throw new Error('Minhas Finanças PWA currently requires base /');
        },
        writeBundle: {
            order:'post',
            handler(output, bundle) {
                // Hash final bytes on disk, after Vite finishes rewriting module preload imports.
                const directory = resolve(output.dir || resolve(config.root, config.build.outDir));
                const template = readFileSync(new URL('./service-worker.js', import.meta.url), 'utf8');
                const htmlFile = resolve(directory,'index.html');
                const html = readFileSync(htmlFile,'utf8');
                const resources = Object.keys(bundle)
                    .filter(name => name.startsWith('assets/') && !name.endsWith('.map'))
                    .map(name => ({ url:'/' + name, digest:digest(readFileSync(resolve(directory,name))) }));
                const manifest = JSON.parse(readFileSync(resolve(config.publicDir,'manifest.webmanifest'), 'utf8'));
                const staticPaths = ['manifest.webmanifest','offline.html','offline.css','offline.js','icons/apple-touch-icon.png','icons/favicon-32.png',...manifest.icons.map(icon => icon.src.slice(1))];
                for (const path of new Set(staticPaths)) {
                    if (!/^(icons\/[a-z0-9-]+\.png|manifest\.webmanifest|offline\.(html|css|js))$/.test(path)) throw new Error('PWA: unexpected public resource');
                    resources.push({ url:'/' + path, digest:digest(readFileSync(resolve(directory,path))) });
                }
                resources.sort((a,b) => a.url.localeCompare(b.url));
                const version = digest(template + html + JSON.stringify(resources)).slice(0,32);
                writeFileSync(htmlFile,html.replace('</head>',`<meta name="mf-build" content="${version}"></head>`));
                writeFileSync(resolve(directory,'sw.js'),template.replace('__MF_VERSION__',JSON.stringify(version)).replace('__MF_RESOURCES__',JSON.stringify(resources)));
            },
        },
        configurePreviewServer(server) {
            server.middlewares.use((req,res,next) => {
                if (req.url?.split('?')[0] === '/sw.js') res.setHeader('Cache-Control','no-store');
                next();
            });
        },
    };
}
