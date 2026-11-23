
document.addEventListener("DOMContentLoaded", async function () {
    const grade = document.getElementById("dominiosGrid");

    if (!grade) return;

    grade.textContent = "Carregando domínios...";

    try {
        const resposta = await fetch("/php/listar-dominios.php", {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store"
        });

        const dominios = await resposta.json();

        if (!resposta.ok || !Array.isArray(dominios)) {
            throw new Error("Não foi possível carregar os domínios.");
        }

        grade.replaceChildren();

        if (dominios.length === 0) {
            grade.textContent = "Nenhum domínio publicado no momento.";
            return;
        }

        dominios.forEach(function (dominio) {
            const card = document.createElement("a");
            card.className = "tcc-card";
            card.href = dominio.endereco;
            card.target = "_blank";
            card.rel = "noopener noreferrer";

            const areaLogo = document.createElement("div");
            areaLogo.className = "tcc-logo-area";

            if (dominio.logo) {
                const imagem = document.createElement("img");
                imagem.src = "/" + dominio.logo.replace(/^\/+/, "");
                imagem.alt = `Logo de ${dominio.titulo || "Sistema"}`;
                imagem.className = "tcc-logo";

                imagem.onerror = function () {
                    imagem.hidden = true;
                };

                areaLogo.appendChild(imagem);
            } else {
                const placeholder = document.createElement("div");
                placeholder.className = "tcc-logo-placeholder";

                const icone = document.createElement("i");
                icone.className = "fa-solid fa-globe";

                const texto = document.createElement("span");
                texto.textContent = "Sistema";

                placeholder.append(icone, texto);
                areaLogo.appendChild(placeholder);
            }

            const conteudo = document.createElement("div");
            conteudo.className = "tcc-card-conteudo";

            const titulo = document.createElement("h3");
            titulo.textContent = dominio.titulo || "Sistema";

            const descricao = document.createElement("p");
            descricao.textContent = dominio.descricao || "";

            conteudo.append(titulo, descricao);

            const acao = document.createElement("div");
            acao.className = "tcc-card-acao";

            const linkIcone = document.createElement("span");
            linkIcone.className = "tcc-acao-icone";

            const icone = document.createElement("i");
            icone.className = "fa-solid fa-arrow-up-right-from-square";

            linkIcone.appendChild(icone);

            const linkTexto = document.createElement("span");
            linkTexto.className = "tcc-acao-texto";
            linkTexto.textContent = "ACESSAR PROJETO";

            acao.append(linkIcone, linkTexto);

            card.append(areaLogo, conteudo, acao);
            grade.appendChild(card);
        });

    } catch (erro) {
        console.error("Erro ao carregar domínios:", erro);
        grade.textContent = "Não foi possível carregar os domínios. Tente novamente.";
    }
});
