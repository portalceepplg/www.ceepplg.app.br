document.addEventListener("DOMContentLoaded", carregarCorpoDocente);

const configuracaoAreas = {
    "Linguagens": {
        icone: "fa-language",
        descricao: "Professores que atuam na área de Linguagens."
    },
    "Matemática": {
        icone: "fa-calculator",
        descricao: "Professores que atuam na área de Matemática."
    },
    "Natureza": {
        icone: "fa-flask",
        descricao: "Professores que atuam na área de Natureza."
    },
    "Humanas": {
        icone: "fa-landmark",
        descricao: "Professores que atuam na área de Humanas."
    },
    "Base Técnica": {
        icone: "fa-gears",
        descricao: "Professores que atuam na Base Técnica."
    },
    "Administração": {
        icone: "fa-user-tie",
        descricao: "Equipe administrativa do CEEPPLG."
    },
    "Educação Especial": {
        icone: "fa-universal-access",
        descricao: "Profissionais que atuam na área de Educação Especial."
    }
};

async function carregarCorpoDocente() {
    const container = document.getElementById("docentesContainer");

    if (!container) {
        console.error(
            "Corpo Docente: elemento #docentesContainer não encontrado."
        );
        return;
    }

    try {
        const resposta = await fetch(
            "../php/corpodocente-publico.php",
            {
                headers: {
                    Accept: "application/json"
                },
                cache: "no-store"
            }
        );

        if (!resposta.ok) {
            throw new Error(
                `Erro HTTP ${resposta.status} ao consultar o corpo docente.`
            );
        }

        const dados = await resposta.json();

        console.log("Dados recebidos do PHP:", dados);

        if (!dados.sucesso) {
            throw new Error(
                dados.mensagem || "O PHP não conseguiu carregar os professores."
            );
        }

        if (!Array.isArray(dados.professores)) {
            throw new Error(
                "A resposta do PHP não contém uma lista válida de professores."
            );
        }

        renderizarCorpoDocente(container, dados.professores);

        console.log(
            `Corpo docente carregado: ${dados.professores.length} professor(es).`
        );
    } catch (erro) {
        console.error("Erro ao carregar o corpo docente:", erro);

        container.replaceChildren();

        const mensagem = document.createElement("p");
        mensagem.textContent =
            "Não foi possível carregar o corpo docente no momento.";

        container.appendChild(mensagem);
    }
}

function renderizarCorpoDocente(container, professores) {
    container.replaceChildren();

    Object.entries(configuracaoAreas).forEach(([nomeArea, config]) => {
        const professoresDaArea = professores.filter(
            professor =>
                normalizarTexto(professor.nome_area) ===
                normalizarTexto(nomeArea)
        );

        const detalhes = document.createElement("details");
        detalhes.className = "docente-area";

        const resumo = document.createElement("summary");

        const infoArea = document.createElement("div");
        infoArea.className = "docente-area-info";

        const iconeArea = document.createElement("div");
        iconeArea.className = "docente-icon";

        const icone = document.createElement("i");
        icone.className = `fa-solid ${config.icone}`;

        iconeArea.appendChild(icone);

        const textoArea = document.createElement("div");
        textoArea.className = "docente-text";

        const etiqueta = document.createElement("span");
        etiqueta.className = "docente-label";
        etiqueta.textContent = "ÁREA";

        const titulo = document.createElement("h3");
        titulo.textContent = nomeArea;

        const descricao = document.createElement("p");
        descricao.textContent = config.descricao;

        textoArea.append(etiqueta, titulo, descricao);
        infoArea.append(iconeArea, textoArea);

        const seta = document.createElement("i");
        seta.className = "fa-solid fa-chevron-down docente-seta";

        resumo.append(infoArea, seta);

        const lista = document.createElement("div");
        lista.className = "professores";

        if (professoresDaArea.length === 0) {
            const vazio = document.createElement("p");
            vazio.textContent =
                "Nenhum professor cadastrado nesta área.";

            lista.appendChild(vazio);
        }

        professoresDaArea.forEach(professor => {
            const item = document.createElement("div");
            item.className = "professor";

            const avatar = document.createElement("div");
            avatar.className = "professor-avatar";

            const iconeUsuario = document.createElement("i");
            iconeUsuario.className = "fa-solid fa-user";

            avatar.appendChild(iconeUsuario);

            const informacoes = document.createElement("div");

            const nome = document.createElement("h4");
            nome.textContent = professor.nome || "Nome não informado";

            const disciplinas = document.createElement("span");
            disciplinas.textContent =
                professor.disciplinas || nomeArea;

            informacoes.append(nome, disciplinas);
            item.append(avatar, informacoes);

            lista.appendChild(item);
        });

        detalhes.append(resumo, lista);
        container.appendChild(detalhes);
    });
}

function normalizarTexto(texto) {
    return String(texto || "")
        .trim()
        .normalize("NFC")
        .toLocaleLowerCase("pt-BR");
}