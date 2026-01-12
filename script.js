// ====== Configuration ======
const SECONDS_PER_QUESTION = 15;
const NEGATIVE_MARK = 0.25;
const SHUFFLE_OPTIONS = true;

// ====== Question Data ======
const QUESTIONS = [
  {
    question: "Which HTML element is used to define important text with strong emphasis?",
    options: ["<em>", "<strong>", "<b>", "<mark>"],
    correctAnswer: "<strong>",
  },
  {
    question: "In CSS, which property controls the space outside an element’s border?",
    options: ["padding", "margin", "outline", "gap"],
    correctAnswer: "margin",
  },
  {
    question: "Which method attaches an event handler to an element in JavaScript?",
    options: ["element.attach()", "element.addEvent()", "element.addEventListener()", "element.on()"],
    correctAnswer: "element.addEventListener()",
  },
  {
    question: "Which array method returns a new array with elements that pass a test?",
    options: ["map()", "reduce()", "filter()", "forEach()"],
    correctAnswer: "filter()",
  },
  {
    question: "Which CSS unit scales based on the root font size?",
    options: ["em", "rem", "vh", "ch"],
    correctAnswer: "rem",
  },
  {
    question: "Which JavaScript keyword creates a block-scoped variable?",
    options: ["var", "let", "const", "static"],
    correctAnswer: "let",
  },
  {
    question: "What does the CSS property 'backdrop-filter' do?",
    options: [
      "Applies graphical effects like blur to the area behind an element",
      "Adds a shadow behind the element",
      "Clips the element content",
      "Filters children only"
    ],
    correctAnswer: "Applies graphical effects like blur to the area behind an element",
  },
  {
    question: "Which HTTP status code indicates a successful request?",
    options: ["200", "301", "404", "500"],
    correctAnswer: "200",
  },
];

// ====== State ======
let currentIndex = 0;
let timerId = null;
let timeLeft = SECONDS_PER_QUESTION;
let score = 0;
let correctCount = 0;
let incorrectCount = 0;
let skippedCount = 0;

/**
 * For review:
 * Array of { question, options, correctAnswer, userAnswer }
 */
const reviewData = [];

// ====== DOM ======
const welcomePanel = document.getElementById("welcome");
const quizPanel = document.getElementById("quiz");
const resultPanel = document.getElementById("result");
const reviewPanel = document.getElementById("review");

const questionTextEl = document.getElementById("questionText");
const optionsContainer = document.querySelector(".options");
const timeEl = document.getElementById("time");
const nextBtn = document.getElementById("nextBtn");
const progressIndicatorEl = document.getElementById("progressIndicator");
const progressCountEl = document.getElementById("progressCount");
const totalCountEl = document.getElementById("totalCount");

const finalScoreEl = document.getElementById("finalScore");
const correctCountEl = document.getElementById("correctCount");
const incorrectCountEl = document.getElementById("incorrectCount");
const skippedCountEl = document.getElementById("skippedCount");
const reviewBtn = document.getElementById("reviewBtn");
const restartBtn = document.getElementById("restartBtn");
const restartBtn2 = document.getElementById("restartBtn2");
const backToResultsBtn = document.getElementById("backToResultsBtn");
const reviewListEl = document.getElementById("reviewList");

// ====== Init ======
document.addEventListener("DOMContentLoaded", () => {
  totalCountEl.textContent = QUESTIONS.length.toString();
  attachEvents();
});

// ====== Events ======
function attachEvents() {
  const startBtn = document.getElementById("startBtn");
  if (startBtn) {
    startBtn.addEventListener("click", () => {
      switchPanel("quiz");
      startQuiz();
    });
  }

  nextBtn.addEventListener("click", () => {
    if (!isQuestionAnswered(currentIndex)) {
      skippedCount++;
      pushReview(null);
    }
    goNext();
  });

  reviewBtn.addEventListener("click", () => {
    switchPanel("review");
    renderReview();
  });

  restartBtn.addEventListener("click", restartQuiz);
  restartBtn2.addEventListener("click", restartQuiz);

  backToResultsBtn.addEventListener("click", () => {
    switchPanel("result");
  });
}

// ====== Quiz Flow ======
function startQuiz() {
  resetState();
  switchPanel("quiz");
  renderQuestion();
  startTimer();
}

function resetState() {
  currentIndex = 0;
  score = 0;
  correctCount = 0;
  incorrectCount = 0;
  skippedCount = 0;
  reviewData.length = 0;

  updateProgressUI();
  clearTimer();
  timeLeft = SECONDS_PER_QUESTION;
  timeEl.textContent = pad(timeLeft);
  nextBtn.disabled = false;
}

function goNext() {
  clearTimer();
  currentIndex++;
  if (currentIndex >= QUESTIONS.length) {
    finishQuiz();
    return;
  }
  renderQuestion();
  startTimer();
}

function finishQuiz() {
  finalScoreEl.textContent = roundTo(score, 2).toString();
  correctCountEl.textContent = correctCount.toString();
  incorrectCountEl.textContent = incorrectCount.toString();
  skippedCountEl.textContent = skippedCount.toString();

  switchPanel("result");
}

// ====== Timer ======
function startTimer() {
  timeLeft = SECONDS_PER_QUESTION;
  updateTimerUI();

  timerId = setInterval(() => {
    timeLeft--;
    updateTimerUI();

    if (timeLeft <= 0) {
      clearTimer();
      if (!isQuestionAnswered(currentIndex)) {
        skippedCount++;
        pushReview(null);
      }
      goNext();
    }
  }, 1000);
}

function clearTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

function updateTimerUI() {
  timeEl.textContent = pad(timeLeft);
}

// ====== Render Question ======
function renderQuestion() {
  const q = QUESTIONS[currentIndex];

  const opts = [...q.options];
  if (SHUFFLE_OPTIONS) shuffle(opts);

  questionTextEl.textContent = q.question;
  optionsContainer.innerHTML = "";

  opts.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.type = "button";
    btn.setAttribute("data-value", opt);

    btn.innerHTML = `
      <span class="option-label">${String.fromCharCode(65 + i)}</span>
      <span class="option-text">${escapeHTML(opt)}</span>
      <span class="option-state" aria-hidden="true"></span>
    `;

    btn.addEventListener("click", () => handleSelect(opt, btn, q.correctAnswer));
    optionsContainer.appendChild(btn);
  });

  updateProgressUI();
  nextBtn.disabled = false;
}

function handleSelect(selected, btnEl, correctAnswer) {
  if (btnEl.classList.contains("disabled")) return;

  const buttons = [...optionsContainer.querySelectorAll(".option-btn")];
  buttons.forEach((b) => (b.classList.add("disabled"), (b.disabled = true)));

  // Suspense mode: no visual feedback
  if (selected === correctAnswer) {
    score += 1;
    correctCount++;
  } else {
    score -= NEGATIVE_MARK;
    incorrectCount++;
  }

  pushReview(selected);

  clearTimer();
  setTimeout(goNext, 700);
}

// ====== Review ======
function pushReview(userAnswer) {
  const q = QUESTIONS[currentIndex];
  reviewData.push({
    question: q.question,
    options: q.options.slice(),
    correctAnswer: q.correctAnswer,
    userAnswer: userAnswer,
  });
}

function renderReview() {
  reviewListEl.innerHTML = "";

  reviewData.forEach((item, idx) => {
    const div = document.createElement("div");
    div.className = "review-item";

    const userIsCorrect = item.userAnswer === item.correctAnswer;
    const answered = item.userAnswer !== null && item.userAnswer !== undefined;

    div.innerHTML = `
      <p class="review-q">Q${idx + 1}. ${escapeHTML(item.question)}</p>
      <div class="review-answers">
        <div class="answer-row">
          <span class="answer-label">Your answer:</span>
          <span class="answer-value ${answered ? (userIsCorrect ? "correct" : "incorrect") : ""}">
            ${answered ? escapeHTML(item.userAnswer) : "Skipped"}
          </span>
        </div>
        <div class="answer-row">
          <span class="answer-label">Correct answer:</span>
          <span class="answer-value correct">${escapeHTML(item.correctAnswer)}</span>
        </div>
      </div>
    `;

    reviewListEl.appendChild(div);
  });
}

// ====== Panels ======
function switchPanel(target) {
  welcomePanel.classList.remove("active");
  quizPanel.classList.remove("active");
  resultPanel.classList.remove("active");
  reviewPanel.classList.remove("active");

  if (target === "welcome") welcomePanel.classList.add("active");
  if (target === "quiz") quizPanel.classList.add("active");
  if (target === "result") resultPanel.classList.add("active");
  if (target === "review") reviewPanel.classList.add("active");
}

// ====== Utilities ======
function updateProgressUI() {
  progressCountEl.textContent = (currentIndex + 1).toString();
  const total = QUESTIONS.length;
  const pct = ((currentIndex + 1) / total) * 100;

  progressIndicatorEl.style.inset = `0 ${100 - Math.max(0, Math.min(100, pct))}% 0 0`;
}

function isQuestionAnswered(index) {
  return reviewData[index] && reviewData[index].userAnswer !== null && reviewData[index].userAnswer !== undefined;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function roundTo(n, decimals = 2) {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}

function escapeHTML(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

// ====== Restart ======
function restartQuiz() {
  clearTimer();
  reviewListEl.innerHTML = "";
  switchPanel("welcome");
}

