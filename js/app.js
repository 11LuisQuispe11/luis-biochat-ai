const chatMessages = document.getElementById("chatMessages");
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const robotAvatar = document.getElementById("robotAvatar");
const robotStatus = document.getElementById("robotStatus");
const exampleButtons = document.querySelectorAll(".example-btn");
const accordionItems = document.querySelectorAll("[data-accordion-item]");
const accordionTriggers = document.querySelectorAll("[data-accordion-trigger]");

let typingMessageElement = null;
let readingTimer = null;

function setRobotState(state, text) {
  robotAvatar.classList.remove("robot-idle", "robot-reading", "robot-typing");
  robotAvatar.classList.add(state);

  if (text) {
    robotStatus.textContent = text;
  }
}

function addMessage(content, sender = "bot") {
  const message = document.createElement("div");

  message.className = `message ${sender}`;
  message.innerHTML = content;

  chatMessages.appendChild(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  return message;
}

function addTypingMessage() {
  typingMessageElement = addMessage(
    `
    <span class="typing-message">
      Robot escribiendo
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    </span>
    `,
    "bot"
  );
}

function removeTypingMessage() {
  if (typingMessageElement) {
    typingMessageElement.remove();
    typingMessageElement = null;
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function setupAccordion() {
  accordionTriggers.forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const currentItem = trigger.closest("[data-accordion-item]");
      const isAlreadyActive = currentItem.classList.contains("active");

      accordionItems.forEach((item) => {
        item.classList.remove("active");
      });

      if (!isAlreadyActive) {
        currentItem.classList.add("active");
      }
    });
  });
}

async function initializeApp() {
  setupAccordion();

  setRobotState("robot-typing", "Cargando modelo NLP y base biográfica...");

  try {
    await Promise.all([
      loadIntentModel(),
      loadKnowledgeBase()
    ]);

    setRobotState("robot-idle", "Robot listo para conversar.");
  } catch (error) {
    console.error(error);
    setRobotState("robot-idle", "Error al cargar recursos.");
    addMessage("No pude cargar el modelo o la base biográfica. Revisa las rutas de los archivos.", "bot");
  }
}

function processQuestion(question) {
  addMessage(escapeHtml(question), "user");

  setRobotState("robot-typing", "Robot analizando y escribiendo respuesta...");
  addTypingMessage();

  setTimeout(() => {
    try {
      const prediction = predictIntent(question);
      const response = buildResponse(prediction);

      removeTypingMessage();

      addMessage(
        `
        <strong>${escapeHtml(response.title)}</strong><br>
        ${escapeHtml(response.answer)}
        <small>
          Intención detectada: ${escapeHtml(response.intent)}
          · Confianza: ${(response.confidence * 100).toFixed(1)}%
        </small>
        `,
        "bot"
      );

      setRobotState("robot-idle", "Robot listo para una nueva pregunta.");
    } catch (error) {
      console.error(error);
      removeTypingMessage();
      setRobotState("robot-idle", "Ocurrió un error al responder.");
      addMessage("Ocurrió un error procesando la pregunta.", "bot");
    }
  }, 650);
}

chatForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const question = userInput.value.trim();

  if (!question) {
    return;
  }

  userInput.value = "";
  processQuestion(question);
});

userInput.addEventListener("input", function () {
  const hasText = userInput.value.trim().length > 0;

  clearTimeout(readingTimer);

  if (hasText) {
    setRobotState("robot-reading", "Robot leyendo lo que escribes...");
  } else {
    setRobotState("robot-idle", "Robot listo para conversar.");
    return;
  }

  readingTimer = setTimeout(() => {
    if (userInput.value.trim().length > 0) {
      setRobotState("robot-reading", "Robot atento a tu pregunta.");
    }
  }, 900);
});

exampleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const question = button.dataset.question;

    userInput.value = question;
    userInput.focus();

    setRobotState("robot-reading", "Robot leyendo ejemplo seleccionado...");
  });
});

initializeApp();