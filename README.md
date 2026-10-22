# The Tail End — Sua vida em semanas

Uma aplicação **mobile first**, inteiramente estática e em português, para visualizar **80 anos como 4.160 quadradinhos**: 52 por linha, um para cada semana representada.

Inspirada nos textos de Tim Urban, **[Your Life in Weeks](https://waitbutwhy.com/2014/05/life-weeks.html)** (2014) e **[The Tail End](https://waitbutwhy.com/2015/12/the-tail-end.html)** (2015), publicados no *Wait But Why*.

## Acesse

Depois que o GitHub Pages estiver ativado, a URL esperada é:

**https://marcianolima.github.io/the-tail-end/**

## Funcionalidades

- Calendário de 80 linhas × 52 quadrados em tema escuro, com verde-neon para semanas vividas e destaque da semana atual.
- Entrada de **dia, mês e ano de nascimento**, com cálculo pela data local atual.
- Indicadores: semanas totais, concluídas, ainda não concluídas, idade e progresso percentual.
- Estimativas em **semanas equivalentes** já gastas dormindo e trabalhando.
- Controles para horas de sono por dia, horas de trabalho por semana e intervalo etário de trabalho.
- Atualização ao retornar à guia e a cada hora caso a página permaneça aberta.
- Exemplo ilustrativo de 30 anos antes de informar uma data de nascimento.
- Preferências salvas **somente no navegador**, sem backend, conta, cookie analítico ou envio de dados.
- Design responsivo, navegação por teclado, rótulos de acessibilidade e respeito à preferência de movimento reduzido.
- Seção "Sobre" com a origem da ideia e links para os textos de Tim Urban.

## Como funciona a contagem

A visualização utiliza **52 células por ano de vida** para manter o modelo da imagem de referência.

O início de cada linha corresponde a um aniversário. Como um ano real tem 365 ou 366 dias e não apenas 364, cada célula é **1/52 do ano entre dois aniversários**, e não exatamente sete dias corridos. No caso de pessoas nascidas em 29 de fevereiro, o aniversário de referência cai em **1º de março** nos anos não bissextos.

- **Concluídas:** células de semanas integralmente transcorridas segundo essa aproximação.
- **Semana atual:** célula do período em curso, com destaque próprio.
- **Restantes:** 4.160 menos as semanas concluídas; inclui a semana atual.
- **Progresso:** fração contínua do horizonte ilustrativo de 80 anos; não é uma previsão de vida.

Se a pessoa já completou 80 anos, todo o calendário fica preenchido e as semanas restantes são zero, mas sua idade real permanece visível.

## Estimativas de tempo

- Sono: semanas de vida transcorridas × (horas médias dormindo por dia / 24).
- Trabalho: anos transcorridos dentro do intervalo de idade selecionado × 52 × (horas de trabalho por semana / 168).

Os números são **semanas equivalentes**, não semanas inteiras reservadas a cada atividade. O modelo não desconta férias, licenças, feriados ou mudanças de rotina e não estima dados individuais sem que sejam informados.

## Execução local

Não há etapa de build nem dependências. Faça clone do repositório e abra index.html diretamente, ou execute o servidor:

    python3 -m http.server 8000

Abra http://localhost:8000/.

## Publicação (GitHub Pages)

O workflow .github/workflows/pages.yml publica diretamente via GitHub Actions a cada push em main, além de disponibilizar execução manual.

**Configuração única, caso o Pages ainda não esteja ativado:**

1. Entre no repositório e abra **Settings → Pages**.
2. Em **Build and deployment → Source**, selecione **GitHub Actions**.
3. Vá em **Actions**, escolha **Publicar The Tail End** e execute **Run workflow**.

Depois da primeira publicação bem-sucedida, o endereço será https://marcianolima.github.io/the-tail-end/.

## Estrutura

- index.html — conteúdo, seções e indicadores.
- styles.css — identidade escura e responsividade.
- app.js — cálculo e renderização das 4.160 células, estimativas e preferências.
- favicon.svg — ícone.
- .github/workflows/pages.yml — publicação automatizada.

## Origem e crédito

Uma adaptação independente inspirada na proposta de Tim Urban. Não é um projeto oficial, patrocinado nem afiliado ao autor ou ao site *Wait But Why*. A referência dos 80 anos é um horizonte visual escolhido para esta versão, não expectativa de vida individual.
