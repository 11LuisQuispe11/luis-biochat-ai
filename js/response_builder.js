let knowledgeBase = null;

async function loadKnowledgeBase() {
  const response = await fetch("./data/knowledge_base.json");

  if (!response.ok) {
    throw new Error("No se pudo cargar la base de conocimiento.");
  }

  knowledgeBase = await response.json();
  return knowledgeBase;
}

function buildResponse(prediction) {
  if (!knowledgeBase) {
    throw new Error("La base de conocimiento todavía no está cargada.");
  }

  const minConfidence = 0.10;

  let selectedIntent = prediction.intent;

  if (prediction.confidence < minConfidence) {
    selectedIntent = "fallback";
  }

  const item = knowledgeBase[selectedIntent] || knowledgeBase["fallback"];

  return {
    title: item.titulo,
    answer: item.respuesta,
    intent: selectedIntent,
    confidence: prediction.confidence
  };
}