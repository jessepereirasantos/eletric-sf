#!/bin/bash

echo "=== INICIANDO DEPLOY DIRETO ELETRIC SF ==="
DEPLOYPATH="/home1/hg9a3205/cursoseloha.online"

echo "1. Criando diretorios de destino..."
mkdir -p "$DEPLOYPATH/server"
mkdir -p "$DEPLOYPATH/client"

echo "2. Limpando deploys antigos..."
rm -rf "$DEPLOYPATH/server/dist"
rm -rf "$DEPLOYPATH/client/dist"

echo "3. Copiando build do servidor (Node)..."
cp -R server/dist "$DEPLOYPATH/server/"
cp server/package.json "$DEPLOYPATH/server/"

echo "4. Copiando build do cliente (React)..."
cp -R client/dist "$DEPLOYPATH/client/"

echo "=== DEPLOY CONCLUIDO COM SUCESSO EM CURSOSELOHA.ONLINE ==="
