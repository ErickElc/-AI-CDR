// Script de inicialização do MongoDB
// Este script cria unidades e procedimentos iniciais

db = db.getSiblingDB('ai-cdr');

// Criar unidades
db.unidades.insertMany([
  {
    nome: "Centro",
    endereco: "Rua Principal, 123 - Centro",
    ativa: true
  },
  {
    nome: "Zona Sul",
    endereco: "Av. Beira Mar, 456 - Zona Sul",
    ativa: true
  }
]);

// Criar procedimentos (atualizado para match com FAQ - todos 30min)
db.procedimentos.insertMany([
  {
    nome: "Consulta Geral",
    duracaoMinutos: 30
  },
  {
    nome: "Dermatologia",
    duracaoMinutos: 30
  },
  {
    nome: "Limpeza de Pele",
    duracaoMinutos: 30
  },
  {
    nome: "Peeling Químico",
    duracaoMinutos: 30
  },
  {
    nome: "Preenchimento Facial",
    duracaoMinutos: 30
  },
  {
    nome: "Botox",
    duracaoMinutos: 30
  },
  {
    nome: "Tratamento de Acne",
    duracaoMinutos: 30
  },
  {
    nome: "Remoção de Verrugas",
    duracaoMinutos: 30
  }
]);

print("Dados iniciais criados com sucesso!");


