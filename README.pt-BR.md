# Dual Captions for Streaming

Idioma: [English](README.md) | [Español](README.es.md) | Português | [Deutsch](README.de.md)

Este fork é uma extensão Chrome Manifest V3, sem build, para mostrar legendas duplas traduzidas no Disney+ e na Netflix.

A extensão ativa fica em `extension/`. Carregue essa pasta diretamente no Chrome. Este fork não usa o fluxo de build arquivado do projeto original.

## O Que Ela Faz

- Mostra duas linhas de legendas traduzidas ao mesmo tempo.
- Usa alemão e português brasileiro como saídas padrão.
- Usa a tradução integrada do Chrome quando a API experimental Translator está disponível.
- Suporta Disney+ capturando segmentos WebVTT de requisições de rede.
- Suporta Netflix lendo o texto visível das legendas nativas da Netflix.
- Oculta visualmente a camada nativa de legendas da Netflix, mas mantém essa camada ativa como texto fonte.
- Mantém o overlay traduzido visível em tela cheia.
- Permite mover o overlay e ajustar tamanho do texto, cor do texto, cor de fundo e opacidade.

## Instalação

1. Abra `chrome://extensions` no Chrome.
2. Ative o `Modo do desenvolvedor`.
3. Clique em `Carregar sem compactação`.
4. Selecione a pasta `extension/` deste repositório.
5. Abra Disney+ ou Netflix e inicie um vídeo.

Notas mais detalhadas sobre Chrome AI estão em [`extension/README.md`](extension/README.md).

## Ativar Tradução Com Chrome AI

![Flags do Chrome Prompt API ativadas](extension/screenshots/chrome%20prompt%20api%20enable.png)

1. Abra `chrome://flags`.
2. Defina `Prompt API for Gemini Nano` como `Enabled Multilingual`.
3. Defina `Prompt API for Gemini Nano with Multimodal Input` como `Enabled`.
4. Se aparecer `Translation API streaming split by sentence`, deixe como `Default`; ela é relacionada, mas não é a opção obrigatória.
5. Reinicie o Chrome, recarregue a extensão unpacked e atualize Disney+ ou Netflix.

## Guia Para Netflix

1. Inicie um vídeo na Netflix.
2. Abra o menu de legendas da Netflix.
3. Selecione legendas em `English`. Não selecione `None`.
4. A extensão lê esse texto em inglês, oculta as legendas nativas da Netflix e mostra o overlay traduzido.

### Passo 1: Selecione Legendas Em Inglês Na Netflix

![Selecionar legendas em inglês na Netflix](extension/screenshots/netflix%20choosing%20eng%20sub%20so%20it%20works.png)

### Passo 2: Use O Overlay Traduzido

![Overlay traduzido funcionando na Netflix](extension/screenshots/netflix%20working%20well.png)

## Guia Para Disney+

1. Inicie um vídeo no Disney+.
2. Ative as legendas fonte, de preferência em inglês.
3. Se as legendas ficarem fora de sincronia por causa da linha do tempo com anúncios, digite o tempo visível do episódio no campo de sync.
4. Clique em `Sync`.

### Overlay Do Disney+ Funcionando

![Overlay traduzido funcionando no Disney+](extension/screenshots/disney%20working%20well.png)

### Se As Legendas Do Disney+ Estiverem Fora De Sincronia

![Legendas do Disney+ fora de sincronia](extension/screenshots/disney%20out%20of%20sync.png)

### Depois Da Sincronização Manual

![Sincronização manual do Disney+ corrigida](extension/screenshots/disney%20sync.png)

## Limitações Atuais

- As legendas nativas da Netflix precisam continuar ativadas porque o parser de legendas de rede da Netflix ainda não foi implementado.
- Camadas de legenda baseadas em imagem na Netflix não são legíveis neste MVP.
- A tradução integrada do Chrome depende de APIs experimentais e da disponibilidade do modelo local.
- O Disney+ pode alterar hosts ou formatos de legenda, o que pode exigir atualizações no parser.
- O sistema de build antigo e os diretórios legados vêm do projeto original e não são o caminho ativo desta extensão.

## Estrutura Do Projeto

- `extension/`: extensão MV3 ativa.
- `extension/src/content.js`: overlay, configurações, detecção de fonte, sync e coordenação da tradução.
- `extension/src/background.js`: captura de requisições do Disney+ e carregamento de segmentos de legenda.
- `extension/src/page-translation-bridge.js`: ponte no mundo principal para as APIs integradas do Chrome AI.
- `extension/src/disneyplus/`: parser WebVTT e armazenamento de legendas.
- `extension/screenshots/`: screenshots para o README.

## Atribuição

Este repositório é um fork do projeto original `dual-captions` de Mike Steele. O projeto original foi arquivado upstream em 2022; este fork atualmente foca em um fluxo MV3 separado para Disney+ e Netflix.

## Licença

MIT
