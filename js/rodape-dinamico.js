
document.addEventListener("DOMContentLoaded", async () => {
    const rodape = document.querySelector(".footer");

    if (!rodape) return;

    const caminhoPHP = window.location.pathname.includes("/php/")
    ? "configuracoes-publicas.php"
    : window.location.pathname.includes("/paginas/")
        ? "../php/configuracoes-publicas.php"
        : "php/configuracoes-publicas.php";
        
    try {
        const resposta = await fetch(caminhoPHP, {
            cache: "no-store"
        });

        if (!resposta.ok) {
            throw new Error("Erro HTTP " + resposta.status);
        }

        const resultado = await resposta.json();

        if (!resultado.sucesso || !resultado.dados) {
            throw new Error("Configurações não encontradas.");
        }

        const dados = resultado.dados;

        // Instituição
        const titulo = rodape.querySelector(".footer-title b");

        if (titulo && dados.instituicao) {
            titulo.textContent = dados.instituicao;
        }

        // Endereço: mantém o texto e as quebras de linha originais.
        const endereco = rodape.querySelector(
            '.info-item a[href*="google.com/maps"]'
        );

        if (endereco && dados.endereco) {
            endereco.href =
                "https://www.google.com/maps/search/?api=1&query=" +
                encodeURIComponent(dados.endereco);
        }

        // Telefone
        const telefone = rodape.querySelector('a[href^="tel:"]');

        if (telefone && dados.telefone) {
            telefone.href =
                "tel:" + dados.telefone.replace(/\D/g, "");

            const texto = telefone.querySelector("u");

            if (texto) {
                texto.textContent = dados.telefone;
            }
        }

        // Horário: atualiza somente o texto anterior à quebra de linha.
        const itens = rodape.querySelectorAll(
            ".footer-container > .footer-info > .info-item"
        );

        const horario = Array.from(itens).find(item =>
            item.querySelector(".fa-clock")
        );

        if (horario && dados.horario) {
            const quebra = horario.querySelector("br");

            if (quebra && quebra.previousSibling) {
                quebra.previousSibling.textContent = dados.horario;
            }
        }

        // E-mail
        const email = rodape.querySelector('a[href^="mailto:"]');

        if (email && dados.email) {
            email.href = "mailto:" + dados.email;

            const texto = email.querySelector("u");

            if (texto) {
                texto.textContent = dados.email;
            }
        }

        // Redes sociais: altera apenas os links.
        const redes = {
            Instagram: dados.instagram,
            Facebook: dados.facebook,
            YouTube: dados.youtube,
            LinkedIn: dados.linkedin,
            Whatsapp: dados.whatsapp
        };

        rodape.querySelectorAll(".social a").forEach(link => {
            const imagem = link.querySelector("img");
            const destino = imagem && redes[imagem.alt];

            if (destino) {
                link.href = destino;
            }
        });

        // Copyright: mantém os elementos e os créditos dos alunos.
        const copyright = rodape.querySelector(".copyright");

        if (copyright && dados.copyright) {
            const primeiroTexto = Array.from(
                copyright.childNodes
            ).find(no =>
                no.nodeType === Node.TEXT_NODE &&
                no.textContent.trim() !== ""
            );

            if (primeiroTexto) {
                primeiroTexto.nodeValue =
                    "\n            " + dados.copyright +
                    "\n\n            ";
            }
        }

    } catch (erro) {
        console.error(
            "Erro ao atualizar informações do rodapé:",
            erro
        );
    }
});
