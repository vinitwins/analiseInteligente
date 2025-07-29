document.addEventListener('DOMContentLoaded', () => {
  const messageInput = document.getElementById('messageInput');
  const analyzeButton = document.getElementById('analyzeButton');
  const resultSection = document.getElementById('resultSection');
  const classificationSpan = document.getElementById('classification');
  const churnScoreSpan = document.getElementById('churnScore');
  const responseSuggestionSpan = document.getElementById('responseSuggestion');
  const justificationSpan = document.getElementById('justification');
  const copyResponseButton = document.getElementById('copyResponseButton');
  const insightsList = document.getElementById('insightsList');

  // Configuração do classificador de sentimentos
  const natural = window.natural;
  const classifier = new natural.SentimentAnalyzer('Portuguese', natural.PorterStemmer, 'afinn');
  const keywords = {
    negative: ['cancelar', 'reclamar', 'problema', 'erro', 'frustração', 'atraso', 'não funciona'],
    positive: ['satisfeito', 'ótimo', 'excelente', 'resolveu', 'rápido'],
    categories: {
      'erro tributário': ['imposto', 'declaração', 'tributário', 'irpf'],
      'dificuldade no app': ['app', 'aplicativo', 'travou', 'lento'],
      'prazo de restituição': ['restituição', 'prazo', 'demora']
    }
  };

  let insights = {
    'erro tributário': { count: 0, sentiment: 0 },
    'dificuldade no app': { count: 0, sentiment: 0 },
    'prazo de restituição': { count: 0, sentiment: 0 }
  };

  // Função para analisar mensagem
  function analyzeMessage(message) {
    if (!message.trim()) return null;

    // Análise de sentimento
    const tokens = message.toLowerCase().split(/\s+/);
    const sentimentScore = classifier.getSentiment(tokens);
    const normalizedScore = Math.min(Math.max((sentimentScore + 1) / 2, 0), 1); // Normaliza para 0-1
    const churnScore = Math.round((1 - normalizedScore) * 100); // Inverte para score de atrito

    // Classificação emocional
    let classification = 'Neutro';
    let justification = ['Análise baseada no tom geral da mensagem.'];
    if (sentimentScore < -0.3) {
      classification = 'Cliente insatisfeito com alto risco de atrito';
      if (tokens.some(word => keywords.negative.includes(word))) {
        justification.push('Palavras-chave negativas detectadas: ' + tokens.filter(word => keywords.negative.includes(word)).join(', '));
      }
    } else if (sentimentScore > 0.3) {
      classification = 'Cliente satisfeito';
      if (tokens.some(word => keywords.positive.includes(word))) {
        justification.push('Palavras-chave positivas detectadas: ' + tokens.filter(word => keywords.positive.includes(word)).join(', '));
      }
    }

    // Identificação de categoria
    let category = 'Outros';
    for (const [cat, words] of Object.entries(keywords.categories)) {
      if (tokens.some(word => words.includes(word))) {
        category = cat;
        justification.push(`Categoria identificada: ${cat}`);
        insights[cat].count += 1;
        insights[cat].sentiment = (insights[cat].sentiment * (insights[cat].count - 1) + sentimentScore) / insights[cat].count;
        break;
      }
    }

    // Geração de resposta
    let response = 'Olá, agradecemos pelo seu contato.';
    if (sentimentScore < -0.3) {
      response = `Olá, sentimos muito pela experiência relatada. Já estamos atuando para resolver seu problema o mais rápido possível. Você se importa de nos dar mais detalhes para que possamos garantir que isso não se repita?`;
    } else if (sentimentScore > 0.3) {
      response = `Olá, ficamos felizes em saber que você está satisfeito! Estamos à disposição para qualquer necessidade.`;
    }

    return {
      classification,
      churnScore,
      response,
      justification: justification.join(' ')
    };
  }

  // Função para atualizar insights
  function updateInsights() {
    insightsList.innerHTML = '';
    Object.entries(insights).forEach(([category, data]) => {
      if (data.count > 0) {
        const sentiment = data.sentiment < -0.3 ? 'Negativo' : data.sentiment > 0.3 ? 'Positivo' : 'Neutro';
        const li = document.createElement('li');
        li.textContent = `${category}: ${data.count} mensagens, Sentimento médio: ${sentiment}`;
        insightsList.appendChild(li);
      }
    });
  }

  // Evento de análise
  analyzeButton.addEventListener('click', () => {
    const message = messageInput.value;
    const result = analyzeMessage(message);
    if (result) {
      resultSection.classList.remove('hidden');
      classificationSpan.textContent = result.classification;
      churnScoreSpan.textContent = result.churnScore;
      responseSuggestionSpan.textContent = result.response;
      justificationSpan.textContent = result.justification;
      copyResponseButton.classList.remove('hidden');
      updateInsights();
    }
  });

  // Evento para copiar resposta
  copyResponseButton.addEventListener('click', () => {
    navigator.clipboard.writeText(responseSuggestionSpan.textContent);
    alert('Resposta copiada para a área de transferência!');
  });

  // Evento para analisar ao pressionar Enter
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      analyzeButton.click();
    }
  });
});