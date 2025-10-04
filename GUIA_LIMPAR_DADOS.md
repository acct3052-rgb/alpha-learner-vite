# 🗑️ Guia para Limpar Banco de Dados Supabase

## 📋 Passo a Passo

### Opção 1: Via SQL Editor do Supabase (RECOMENDADO)

1. **Acesse o Supabase**
   - Vá para: https://supabase.com/dashboard
   - Faça login na sua conta
   - Selecione seu projeto

2. **Abra o SQL Editor**
   - No menu lateral, clique em **SQL Editor**
   - Clique em **New query**

3. **Execute o Script de Limpeza**
   - Copie todo o conteúdo do arquivo `LIMPAR_BANCO.sql`
   - Cole no editor SQL
   - Clique em **RUN** ou pressione `Ctrl + Enter`

4. **Verifique os Resultados**
   - Você verá uma tabela mostrando 0 registros em cada tabela
   - Confirmação: "Banco de dados limpo com sucesso!"

---

### Opção 2: Via Interface do Supabase (Table Editor)

Se preferir limpar manualmente:

1. **Table Editor → signals**
   - Vá em **Table Editor** no menu lateral
   - Selecione a tabela `signals`
   - Clique nos três pontos (⋮) no topo
   - Selecione **Truncate table**
   - Confirme

2. **Table Editor → audit_logs**
   - Repita o processo para `audit_logs`
   - **Truncate table** → Confirme

3. **Verificação**
   - Ambas as tabelas devem estar vazias
   - Verifique se "0 rows" aparece em cada tabela

---

### Opção 3: Via JavaScript (Console do Navegador)

Se quiser automatizar pelo código:

```javascript
// Abra o Console do navegador (F12) na aplicação
// Cole e execute este código:

async function limparBancoDados() {
    console.log('🗑️ Iniciando limpeza do banco de dados...');
    
    try {
        // Limpar signals
        const { error: signalsError } = await window.supabase
            .from('signals')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
        
        if (signalsError) throw signalsError;
        console.log('✅ Tabela signals limpa');
        
        // Limpar audit_logs
        const { error: auditError } = await window.supabase
            .from('audit_logs')
            .delete()
            .neq('signal_id', '00000000-0000-0000-0000-000000000000'); // Delete all
        
        if (auditError) throw auditError;
        console.log('✅ Tabela audit_logs limpa');
        
        console.log('✅ Banco de dados limpo com sucesso!');
        alert('✅ Banco de dados limpo! Recarregue a página (F5)');
        
    } catch (error) {
        console.error('❌ Erro ao limpar banco:', error);
        alert('❌ Erro: ' + error.message);
    }
}

// Executar
limparBancoDados();
```

---

## 🔄 Após Limpar o Banco

### 1. **Limpar Cache Local**
Execute no console do navegador:
```javascript
// Limpar localStorage
localStorage.clear();

// Limpar sessionStorage
sessionStorage.clear();

console.log('✅ Cache local limpo!');
```

### 2. **Recarregar a Aplicação**
- Pressione `F5` ou `Ctrl + R`
- Ou feche e abra o navegador novamente

### 3. **Verificar Sistema Limpo**
- Vá em **Auditoria** → Deve estar vazio
- Vá em **Performance** → Deve mostrar 0 sinais
- Vá em **Dashboard** → Deve mostrar "Aguardando sinais"

---

## ⚠️ IMPORTANTE - O QUE NÃO SERÁ DELETADO

Por padrão, o script **NÃO** deleta:
- ✅ Conexões de API (`api_connections`)
- ✅ Configurações do Telegram (`telegram_config`)

**Se quiser deletar tudo:**
- Edite o arquivo `LIMPAR_BANCO.sql`
- Descomente (remova `--` de) as linhas:
  ```sql
  -- DELETE FROM api_connections;
  -- DELETE FROM telegram_config;
  ```

---

## 🎯 Resumo Rápido

1. Abra Supabase SQL Editor
2. Cole o script `LIMPAR_BANCO.sql`
3. Execute (RUN)
4. Limpe cache local (console → `localStorage.clear()`)
5. Recarregue a página (F5)
6. Comece com dados frescos! 🚀

---

## 📊 Verificar se Funcionou

Depois de limpar, execute no console:
```javascript
async function verificarLimpeza() {
    const { data: signals } = await window.supabase.from('signals').select('*');
    const { data: logs } = await window.supabase.from('audit_logs').select('*');
    
    console.log('Signals:', signals?.length || 0);
    console.log('Audit Logs:', logs?.length || 0);
    
    if ((signals?.length || 0) === 0 && (logs?.length || 0) === 0) {
        console.log('✅ Banco de dados está limpo!');
    } else {
        console.log('⚠️ Ainda há dados no banco');
    }
}

verificarLimpeza();
```

---

## 🆘 Problemas?

Se encontrar algum erro:
1. Verifique se está logado no Supabase
2. Verifique as permissões das tabelas
3. Tente usar a Opção 2 (Table Editor)
4. Verifique o console para erros

