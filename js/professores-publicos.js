
document.addEventListener("DOMContentLoaded", async function () {
    const secoes = document.querySelectorAll(
        ".docente-area"
    );

    const endpoint = "../php/professores-publicos.php";

    function normalizar(texto) {
        return texto
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toLowerCase();
    }

    function criarElemento(tag, classe, texto) {
        const elemento = document.createElement(tag);

        if (classe) {
            elemento.className = classe;
        }

        elemento.textContent = texto;

        return elemento;
    }

    try {
        const resposta = await fetch(endpoint, {
            cache: "no-store"
        });

        if (!resposta.ok) {
            throw new Error("Falha ao consultar os professores.");
        }

        const resultado = await resposta.json();

        if (!resultado.sucesso || !Array.isArray(resultado.professores)) {
            throw new Error("Resposta inválida do servidor.");
        }

        const professoresPorArea = new Map();

        resultado.professores.forEach(function (professor) {
            const area = normalizar(professor.nome_area);

            if (!professoresPorArea.has(area)) {
                professoresPorArea.set(area, []);
            }

            professoresPorArea.get(area).push(professor);
        });

        secoes.forEach(function (secao) {
            const titulo = secao.querySelector("summary h3");
            const lista = secao.querySelector(".professores");

            if (!titulo || !lista) return;

            const nomeArea = normalizar(titulo.textContent);
            const professores = professoresPorArea.get(nomeArea) || [];

            // Substitui os cartões fixos pelos dados do banco.
            lista.replaceChildren();

            if (professores.length === 0) {
                lista.appendChild(
                    criarElemento(
                        "p",
                        "",
                        "Nenhum professor cadastrado nesta área."
                    )
                );

                return;
            }

            professores.forEach(function (professor) {
                const cartao = document.createElement("div");
                cartao.className = "professor";

                const avatar = document.createElement("div");
                avatar.className = "professor-avatar";

                const icone = document.createElement("i");
                icone.className =
                    nomeArea === "administracao"
                        ? "fa-solid fa-user-tie"
                        : "fa-solid fa-user";

                avatar.appendChild(icone);

                const informacoes = document.createElement("div");

                informacoes.appendChild(
                    criarElemento("h4", "", professor.nome)
                );

                informacoes.appendChild(
                    criarElemento(
                        "span",
                        "",
                        professor.disciplinas || "Área de atuação não informada"
                    )
                );

                cartao.appendChild(avatar);
                cartao.appendChild(informacoes);

                lista.appendChild(cartao);
            });
        });
    } catch (erro) {
        console.error(
            "Erro ao carregar os professores:",
            erro
        );
    }
});
