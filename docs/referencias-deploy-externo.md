# Referencias para despliegue externo

La documentación oficial consultada confirma que Vercel permite agregar dominios desde Settings → Domains. Para un dominio raíz se configura un registro A y para un subdominio un CNAME; Vercel también puede mostrar un valor de nameserver según la configuración. Vercel documenta además el despliegue de Express como una única función serverless y advierte que `express.static()` no sirve los archivos estáticos allí, por lo que el proyecto debe conservar su estrategia de build y servir assets de la forma compatible.

Netlify documenta que un dominio propio se administra desde Domain management y ofrece las rutas Bring your own domain, Netlify DNS o DNS externo. Su guía para Express lo transforma en Netlify Functions y requiere una adaptación mediante `@netlify/functions`, `serverless-http`, `netlify.toml` y redirects para `/api/*`. También advierte que Express en Netlify se ejecuta como funciones serverless y que no es la opción recomendada para funciones background o programadas.

| Fuente | URL | Fecha consultada |
| --- | --- | --- |
| Vercel, Adding & Configuring a Custom Domain | https://vercel.com/docs/domains/working-with-domains/add-a-domain | 31-08-2026 |
| Vercel, Express on Vercel | https://vercel.com/docs/frameworks/backend/express | 31-08-2026 |
| Netlify, Get started with domains | https://docs.netlify.com/manage/domains/get-started-with-domains/ | 31-08-2026 |
| Netlify, Express on Netlify | https://docs.netlify.com/build/frameworks/framework-setup-guides/express/ | 31-08-2026 |
