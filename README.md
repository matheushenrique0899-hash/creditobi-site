# CréditoBI — Projeto pronto para deploy

Este é o site da CréditoBI já configurado como projeto React (Vite),
pronto para subir no Vercel.

## O que mudou em relação ao artifact

Nada na lógica ou no visual. Só a "embalagem": agora é uma pasta de projeto
de verdade, com `package.json`, em vez de um componente solto dentro do
Claude.ai. Isso é o que permite hospedar em qualquer lugar.

---

## Passo 1 — Testar localmente (opcional, mas recomendado)

Se você tiver o Node.js instalado no seu computador (baixe em nodejs.org,
versão LTS), rode dentro desta pasta:

```bash
npm install
npm run dev
```

Isso abre o site em `http://localhost:5173`. Aqui a consulta de CNPJ via
BrasilAPI já funciona normalmente — sem o bloqueio que existia no preview
do Claude.ai.

---

## Passo 2 — Subir pro GitHub

O Vercel faz deploy a partir de um repositório do GitHub. Se você ainda não
tem conta no GitHub, crie em github.com (grátis).

1. Crie um repositório novo no GitHub (ex: `creditobi-site`), vazio, sem
   README nem .gitignore (a gente já tem os nossos).
2. Dentro desta pasta, rode:

```bash
git init
git add .
git commit -m "Primeira versão do site CréditoBI"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/creditobi-site.git
git push -u origin main
```

(Troque `SEU_USUARIO` pelo seu usuário do GitHub.)

---

## Passo 3 — Conectar no Vercel

1. Crie uma conta em vercel.com (pode entrar direto com sua conta do GitHub).
2. Clique em **"Add New Project"**.
3. Selecione o repositório `creditobi-site` que você acabou de subir.
4. O Vercel detecta automaticamente que é um projeto Vite — não precisa
   mudar nenhuma configuração. Clique em **"Deploy"**.
5. Em ~1 minuto, você recebe um link público, algo como
   `creditobi-site.vercel.app`.

Esse link já é um site real, acessível por qualquer pessoa, com a consulta
de CNPJ funcionando de verdade.

---

## Passo 4 — Domínio próprio (opcional, quando quiser)

Se quiser usar algo como `creditobi.com.br`:

1. Compre o domínio em qualquer registrador (Registro.br para `.com.br`,
   ou Namecheap/GoDaddy para outros).
2. No painel do Vercel, vá em **Settings → Domains** do seu projeto e
   adicione o domínio.
3. O Vercel mostra exatamente quais registros DNS configurar no
   registrador. É copiar e colar.

---

## Sobre a consulta de CNPJ

A consulta usa a BrasilAPI (gratuita, pública, sem necessidade de cadastro
ou chave de API). Ela só não funcionava dentro do preview do Claude.ai
porque aquele ambiente bloqueia chamadas de rede para domínios externos —
no Vercel isso não existe, e a consulta funciona normalmente.

---

## Próximos passos sugeridos (quando o volume de solicitações crescer)

Hoje, cada solicitação só existe enquanto a pessoa está com a aba aberta,
e o único registro que sobra é a mensagem de WhatsApp. Isso é suficiente
para validar a ideia, mas quando o volume crescer, vale considerar:

- Salvar cada solicitação automaticamente em um banco de dados (Supabase
  é uma opção gratuita e simples para começar) para você ter um histórico
  centralizado, mesmo que o documento continue sendo enviado por WhatsApp.
- Um painel simples para você visualizar e marcar o status de cada
  solicitação (em análise, aprovado, recusado), sem depender só da
  memória das conversas de WhatsApp.

Nenhum desses passos é urgente agora — fazem sentido quando o WhatsApp
sozinho começar a ficar difícil de administrar.
