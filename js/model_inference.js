let intentModel = null;

async function loadIntentModel() {
  const response = await fetch("./models/intent_model_web.json");

  if (!response.ok) {
    throw new Error("No se pudo cargar el modelo web.");
  }

  intentModel = await response.json();
  return intentModel;
}

function normalizeText(text) {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text) {
  const normalized = normalizeText(text);

  if (!normalized) {
    return [];
  }

  return normalized.split(" ");
}

function generateNgrams(tokens, minN, maxN) {
  const ngrams = [];

  for (let n = minN; n <= maxN; n++) {
    for (let i = 0; i <= tokens.length - n; i++) {
      ngrams.push(tokens.slice(i, i + n).join(" "));
    }
  }

  return ngrams;
}

function buildTfidfVector(text, model) {
  const tokens = tokenize(text);

  const ngramRange = model.ngram_range || model.ngramRange || [1, 2];

  const terms = generateNgrams(
    tokens,
    ngramRange[0],
    ngramRange[1]
  );

  const termCounts = {};

  for (const term of terms) {
    if (model.vocabulary[term] !== undefined) {
      termCounts[term] = (termCounts[term] || 0) + 1;
    }
  }

  const vectorSize = Object.keys(model.vocabulary).length;
  const vector = new Array(vectorSize).fill(0);

  for (const [term, count] of Object.entries(termCounts)) {
    const index = model.vocabulary[term];

    // sublinear_tf=True en Python equivale aproximadamente a 1 + log(tf)
    const tf = 1 + Math.log(count);

    vector[index] = tf * model.idf[index];
  }

  // Normalización L2 como hace TfidfVectorizer por defecto.
  const norm = Math.sqrt(
    vector.reduce((sum, value) => sum + value * value, 0)
  );

  if (norm > 0) {
    for (let i = 0; i < vector.length; i++) {
      vector[i] = vector[i] / norm;
    }
  }

  return vector;
}

function dotProduct(vector, coefficients) {
  let result = 0;

  for (let i = 0; i < vector.length; i++) {
    result += vector[i] * coefficients[i];
  }

  return result;
}

function softmax(scores) {
  const maxScore = Math.max(...scores);

  const expScores = scores.map((score) => Math.exp(score - maxScore));

  const total = expScores.reduce((sum, value) => sum + value, 0);

  return expScores.map((value) => value / total);
}

function predictIntent(question) {
  if (!intentModel) {
    throw new Error("El modelo todavía no está cargado.");
  }

  const vector = buildTfidfVector(question, intentModel);

  const scores = intentModel.coefficients.map((classCoefficients, index) => {
    return dotProduct(vector, classCoefficients) + intentModel.intercept[index];
  });

  const probabilities = softmax(scores);

  let bestIndex = 0;

  for (let i = 1; i < probabilities.length; i++) {
    if (probabilities[i] > probabilities[bestIndex]) {
      bestIndex = i;
    }
  }

  return {
    intent: intentModel.classes[bestIndex],
    confidence: probabilities[bestIndex],
    probabilities: probabilities
  };
}