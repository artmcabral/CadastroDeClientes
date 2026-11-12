const endpointInput = document.getElementById('endpoint');
const formulario = document.getElementById('form-cliente');
const lista = document.getElementById('lista-clientes');
const mensagem = document.getElementById('mensagem');
const estadoLista = document.getElementById('estado-lista');
const quantidade = document.getElementById('quantidade');
const botaoCadastrar = document.getElementById('botao-cadastrar');
const botaoAtualizar = document.getElementById('atualizar');
const botaoConectar = document.getElementById('salvar-endpoint');

const CHAVE_ENDPOINT = 'crudcrud_endpoint_clientes';
let urlApi = '';

function mostrarMensagem(texto, tipo = '') {
  mensagem.textContent = texto;
  mensagem.className = `mensagem ${tipo}`;
}

function validarEndpoint(valor) {
  try {
    const url = new URL(valor.trim());
    const partes = url.pathname.replace(/\/$/, '').split('/').filter(Boolean);
    if (url.protocol !== 'https:' || !['crudcrud.com', 'www.crudcrud.com'].includes(url.hostname) || partes.length !== 2 || partes[0] !== 'api' || !/^[a-zA-Z0-9]+$/.test(partes[1])) {
      return null;
    }
    return `${url.origin}/api/${partes[1]}/clientes`;
  } catch {
    return null;
  }
}

async function requisicao(url, opcoes = {}) {
  const resposta = await fetch(url, opcoes);
  if (!resposta.ok) {
    if ([401, 403, 404, 410].includes(resposta.status)) {
      throw new Error(`API indisponível (${resposta.status}). Confira se seu endpoint está correto e ativo.`);
    }
    throw new Error(`Erro na API: HTTP ${resposta.status}.`);
  }
  return resposta;
}

function exibirClientes(clientes) {
  lista.replaceChildren();
  quantidade.textContent = clientes.length;
  estadoLista.textContent = clientes.length ? '' : 'Nenhum cliente cadastrado ainda.';

  clientes.forEach(cliente => {
    const item = document.createElement('li');
    item.className = 'cliente';

    const dados = document.createElement('div');
    const nome = document.createElement('strong');
    nome.textContent = cliente.nome || '(sem nome)';
    const email = document.createElement('span');
    email.textContent = cliente.email || '(sem e-mail)';
    dados.append(nome, email);

    const excluir = document.createElement('button');
    excluir.type = 'button';
    excluir.className = 'danger';
    excluir.textContent = 'Excluir';
    excluir.setAttribute('aria-label', `Excluir ${cliente.nome || 'cliente'}`);
    excluir.addEventListener('click', () => excluirCliente(cliente._id, excluir));

    item.append(dados, excluir);
    lista.appendChild(item);
  });
}

// GET: lista todos os clientes armazenados na API.
async function listarClientes() {
  if (!urlApi) {
    estadoLista.textContent = 'Primeiro, configure seu endpoint do CrudCrud.';
    return;
  }

  botaoAtualizar.disabled = true;
  estadoLista.textContent = 'Carregando clientes...';
  try {
    const resposta = await requisicao(urlApi);
    const clientes = await resposta.json();
    if (!Array.isArray(clientes)) throw new Error('Resposta inesperada da API.');
    console.log('Clientes recebidos (GET):', clientes);
    exibirClientes(clientes);
  } catch (erro) {
    console.error('Erro ao listar clientes:', erro);
    lista.replaceChildren();
    quantidade.textContent = '0';
    estadoLista.textContent = erro.message || 'Não foi possível carregar os clientes.';
  } finally {
    botaoAtualizar.disabled = false;
  }
}

// POST: envia o novo cliente no formato JSON.
formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  if (!urlApi) {
    mostrarMensagem('Conecte seu endpoint antes de cadastrar.', 'erro');
    return;
  }

  const nome = document.getElementById('nome').value.trim();
  const email = document.getElementById('email').value.trim();
  if (!nome || !email) {
    mostrarMensagem('Preencha nome e e-mail.', 'erro');
    return;
  }

  botaoCadastrar.disabled = true;
  mostrarMensagem('Salvando cliente...');
  try {
    await requisicao(urlApi, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email })
    });
    console.log('Cliente cadastrado (POST):', { nome, email });
    formulario.reset();
    mostrarMensagem('Cliente cadastrado com sucesso!', 'sucesso');
    await listarClientes();
  } catch (erro) {
    console.error('Erro ao cadastrar cliente:', erro);
    mostrarMensagem(erro.message || 'Não foi possível cadastrar.', 'erro');
  } finally {
    botaoCadastrar.disabled = false;
  }
});

// DELETE: remove um cliente usando o _id criado pelo CrudCrud.
async function excluirCliente(id, botao) {
  if (!id || !urlApi) return;
  if (!window.confirm('Deseja excluir este cliente?')) return;
  botao.disabled = true;
  try {
    await requisicao(`${urlApi}/${encodeURIComponent(id)}`, { method: 'DELETE' });
    console.log('Cliente excluído (DELETE):', id);
    mostrarMensagem('Cliente excluído com sucesso!', 'sucesso');
    await listarClientes();
  } catch (erro) {
    console.error('Erro ao excluir cliente:', erro);
    mostrarMensagem(erro.message || 'Não foi possível excluir.', 'erro');
    botao.disabled = false;
  }
}

botaoConectar.addEventListener('click', () => {
  const url = validarEndpoint(endpointInput.value);
  if (!url) {
    mostrarMensagem('Informe uma URL válida: https://crudcrud.com/api/SEU_IDENTIFICADOR', 'erro');
    return;
  }
  urlApi = url;
  localStorage.setItem(CHAVE_ENDPOINT, endpointInput.value.trim().replace(/\/$/, ''));
  mostrarMensagem('Endpoint configurado! Buscando os clientes...', 'sucesso');
  listarClientes();
});

botaoAtualizar.addEventListener('click', listarClientes);

const endpointSalvo = localStorage.getItem(CHAVE_ENDPOINT);
if (endpointSalvo) {
  endpointInput.value = endpointSalvo;
  urlApi = validarEndpoint(endpointSalvo) || '';
  if (urlApi) listarClientes();
}
