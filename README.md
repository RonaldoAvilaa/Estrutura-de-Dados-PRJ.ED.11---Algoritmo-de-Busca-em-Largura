# PRJ.ED.11 - Sistema de Rotas Aéreas com Busca em Largura (BFS)

## Autores

**Thales Cambraia Dias**
##Ronaldo de Ávila Ribeiro Júnior
**João Paulo Lorena**
Curso: Desenvolvimento de Software Multiplataforma - FATEC Jacareí

---

## Objetivo

Desenvolver um sistema capaz de simular rotas aéreas utilizando uma estrutura de dados do tipo grafo.

As rotas são armazenadas em PostgreSQL com extensão PostGIS e a busca é realizada através do algoritmo de Busca em Largura (Breadth First Search - BFS), retornando o caminho com o menor número de escalas possíveis entre uma origem e um destino.

---

## Tecnologias Utilizadas

### Backend

* Node.js
* TypeScript
* Express
* PostgreSQL
* PostGIS

### Frontend

* TypeScript
* Vite
* Leaflet
* OpenStreetMap

### Infraestrutura

* Docker
* Docker Compose
* Git
* GitHub

---

## Conceitos Aplicados

* Grafos
* Busca em Largura (BFS)
* Estruturas de Dados
* APIs REST
* Banco de Dados Geográfico
* Desenvolvimento Full Stack

---

## Estrutura do Projeto

```txt
prj-ed11-rotas-bfs
│
├── database
│   └── init.sql
│
├── backend
│   ├── src
│   │   ├── server.ts
│   │   ├── database.ts
│   │   └── bfs.ts
│
├── frontend
│   ├── src
│   │   ├── main.ts
│   │   └── style.css
│
└── docker-compose.yml
```

---

## Como Executar o Projeto

### 1. Clonar o repositório

```bash
git clone https://github.com/thalestcd/PRJ-ED11-ROTAS-BFS.git
```

---

### 2. Inicializar o banco de dados

Na raiz do projeto:

```bash
docker compose up -d
```

Verificar se o container está ativo:

```bash
docker ps
```

---

### 3. Executar o Backend

Entrar na pasta:

```bash
cd backend
```

Instalar dependências:

```bash
npm install
```

Executar:

```bash
npm run dev
```

A API estará disponível em:

```txt
http://localhost:3000
```

---

### 4. Executar o Frontend

Abrir outro terminal:

```bash
cd frontend
```

Instalar dependências:

```bash
npm install
```

Executar:

```bash
npm run dev
```

A aplicação estará disponível em:

```txt
http://localhost:5173
```

---

## Endpoints Disponíveis

### Listar aeroportos

```http
GET /airports
```

Exemplo:

```http
http://localhost:3000/airports
```

---

### Buscar rota utilizando BFS

```http
GET /routes/bfs
```

Exemplo:

```http
http://localhost:3000/routes/bfs?origin=GRU&destination=MAO
```

Resultado:

```txt
GRU → BSB → FOR → MAO
```

---

## Exemplo de Funcionamento

Origem:

```txt
GRU
```

Destino:

```txt
MAO
```

Resultado:

```txt
GRU → MAO
```

Conexões:

```txt
1
```

Escalas:

```txt
0
```

Distância:

```txt
2689 km
```

Também são exibidas até 3 rotas alternativas plausíveis para comparação, sem caminhos muito extensos.

---

## Resultado Final

O sistema permite:

* Armazenar aeroportos utilizando coordenadas geográficas reais
* Modelar rotas através de grafos
* Encontrar caminhos utilizando Busca em Largura (BFS)
* Retornar o menor número de escalas
* Calcular distâncias aéreas estimadas utilizando PostGIS
* Exibir as rotas em mapa interativo utilizando Leaflet e OpenStreetMap

---

## Licença

Projeto acadêmico desenvolvido para a disciplina de Estrutura de Dados da FATEC Jacareí.
