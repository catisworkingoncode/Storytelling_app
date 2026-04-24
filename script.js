const startScreen = document.getElementById("start-screen");
const storyScreen = document.getElementById("story-screen");
const summaryScreen = document.getElementById("summary-screen");

const startButton = document.getElementById("start-button");
const listenButton = document.getElementById("listen-button");
const stopAudioButton = document.getElementById("stop-audio-button");
const nextButton = document.getElementById("next-button");
const restartButton = document.getElementById("restart-button");

const progressBar = document.getElementById("progress-bar");
const stepLabel = document.getElementById("step-label");
const storyTitle = document.getElementById("story-title");
const storyText = document.getElementById("story-text");
const storyIllustration = document.getElementById("story-illustration");
const questionArea = document.getElementById("question-area");
const questionText = document.getElementById("question-text");
const answerButtons = document.getElementById("answer-buttons");
const childMessage = document.getElementById("child-message");
const parentSummary = document.getElementById("parent-summary");
const choiceList = document.getElementById("choice-list");

// Each story step is stored here so the app has no backend or external data.
const storySteps = [
  {
    type: "story",
    title: "Luna Finds a Map",
    text:
      "Luna was walking through the park when she found a tiny folded map near a blue bench. The map had a bright path drawn on it and a note that said, Find the picnic tree!",
  },
  {
    type: "question",
    title: "A Small Sound",
    text:
      "Before Luna could follow the map, she heard a soft whimper from behind a bush. A little puppy was tangled in a ribbon.",
    question: "What should Luna do?",
    answers: [
      {
        text: "Help the puppy get untangled.",
        tag: "empathy",
        choiceLabel: "Helping",
      },
      {
        text: "Keep following the map by herself.",
        tag: "independence",
        choiceLabel: "Ignoring",
      },
    ],
  },
  {
    type: "story",
    title: "The Picnic Tree",
    text:
      "Luna and the puppy found the picnic tree. Under the branches sat two children with one small sandwich and a basket of berries.",
  },
  {
    type: "question",
    title: "Snack Time",
    text:
      "Luna had crackers in her backpack. The children smiled, but everyone looked hungry after the long walk.",
    question: "What should Luna do with her crackers?",
    answers: [
      {
        text: "Share the crackers with everyone.",
        tag: "kindness",
        choiceLabel: "Sharing",
      },
      {
        text: "Save the crackers for later.",
        tag: "independence",
        choiceLabel: "Ignoring",
      },
    ],
  },
  {
    type: "story",
    title: "A Shadow on the Path",
    text:
      "Clouds covered the sun, and the path home looked darker than before. Luna could see the park gate ahead, but the wind made the leaves rustle loudly.",
  },
  {
    type: "question",
    title: "Going Home",
    text:
      "The puppy stayed close to Luna as the trees moved in the wind. Luna took a deep breath and looked at the path.",
    question: "How should Luna go home?",
    answers: [
      {
        text: "Walk slowly and ask the others to stay together.",
        tag: "cautious",
        choiceLabel: "Fearful",
      },
      {
        text: "Lead the way and check that everyone is okay.",
        tag: "empathy",
        choiceLabel: "Helping",
      },
    ],
  },
  {
    type: "story",
    title: "Home Again",
    text:
      "Luna reached the gate with her new friends. The puppy wagged its tail, and Luna felt proud of the choices she made during the adventure.",
  },
];

const insightMessages = {
  empathy:
    "Your child showed empathy and understanding of others' feelings. They tend to choose helpful actions when someone needs care.",
  kindness:
    "Your child showed kindness and generosity. They tend to notice chances to share and include others.",
  independence:
    "Your child showed independence. They may enjoy making their own path and focusing on personal goals.",
  cautious:
    "Your child showed cautious thinking. They may prefer careful steps, safety, and support when something feels uncertain.",
};

let currentStepIndex = 0;
let selectedAnswer = null;
let chosenAnswers = [];
let audioContext = null;
let speechUtterance = null;
let wordTimings = [];
let narrationText = "";
let isChangingStep = false;
let narrationVoices = [];
let selectedNarrationVoice = null;
let narrationTimer = null;
let narrationRunId = 0;

if ("scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

window.scrollTo(0, 0);

startButton.addEventListener("click", startStory);
listenButton.addEventListener("click", function () {
  playClickSound();
  speakCurrentStep();
});
stopAudioButton.addEventListener("click", function () {
  playClickSound();
  stopNarration();
});
nextButton.addEventListener("click", goToNextStep);
restartButton.addEventListener("click", restartStory);
window.addEventListener("load", function () {
  window.scrollTo(0, 0);
});

if ("speechSynthesis" in window) {
  loadNarrationVoices();
  window.speechSynthesis.onvoiceschanged = loadNarrationVoices;
}

function startStory() {
  playClickSound();
  currentStepIndex = 0;
  chosenAnswers = [];
  selectedAnswer = null;
  isChangingStep = false;
  showScreen(storyScreen);
  showCurrentStep();
  speakCurrentStep();
}

function restartStory() {
  playClickSound();
  stopNarration();
  currentStepIndex = 0;
  chosenAnswers = [];
  selectedAnswer = null;
  isChangingStep = false;
  showScreen(startScreen);
}

function showScreen(screenToShow) {
  startScreen.classList.remove("active");
  storyScreen.classList.remove("active");
  summaryScreen.classList.remove("active");
  screenToShow.classList.add("active");
  window.scrollTo(0, 0);
}

function showCurrentStep() {
  const currentStep = storySteps[currentStepIndex];
  const progressPercent = ((currentStepIndex + 1) / storySteps.length) * 100;

  progressBar.style.width = progressPercent + "%";
  stepLabel.textContent = "Step " + (currentStepIndex + 1) + " of " + storySteps.length;
  storyTitle.textContent = currentStep.title;
  wordTimings = [];
  renderWords(storyText, currentStep.text, 0);
  storyIllustration.className = "mini-scene scene-" + currentStepIndex;

  if (currentStep.type === "question") {
    showQuestion(currentStep);
  } else {
    hideQuestion();
  }
}

function showQuestion(questionStep) {
  selectedAnswer = null;
  questionArea.classList.remove("hidden");
  answerButtons.innerHTML = "";
  nextButton.disabled = true;
  narrationText =
    questionStep.text +
    " " +
    questionStep.question +
    " For choice one, " +
    questionStep.answers[0].text +
    " For choice two, " +
    questionStep.answers[1].text;
  renderWords(questionText, questionStep.question, narrationText.indexOf(questionStep.question));

  questionStep.answers.forEach(function (answer) {
    const answerButton = document.createElement("button");
    answerButton.className = "answer-button";
    renderWords(answerButton, answer.text, narrationText.indexOf(answer.text));

    answerButton.addEventListener("click", function () {
      chooseAnswer(answer, answerButton);
    });

    answerButtons.appendChild(answerButton);
  });
}

function hideQuestion() {
  selectedAnswer = null;
  questionArea.classList.add("hidden");
  questionText.innerHTML = "";
  answerButtons.innerHTML = "";
  narrationText = storySteps[currentStepIndex].text;
  nextButton.disabled = false;
}

function chooseAnswer(answer, answerButton) {
  const allAnswerButtons = document.querySelectorAll(".answer-button");

  playClickSound();
  selectedAnswer = answer;
  nextButton.disabled = false;

  // Remove the old selected style before marking the new answer.
  allAnswerButtons.forEach(function (button) {
    button.classList.remove("selected");
  });

  answerButton.classList.add("selected");
}

function goToNextStep() {
  const currentStep = storySteps[currentStepIndex];

  if (isChangingStep) {
    return;
  }

  playClickSound();

  if (currentStep.type === "question" && selectedAnswer === null) {
    return;
  }

  isChangingStep = true;

  if (currentStep.type === "question") {
    chosenAnswers.push({
      question: currentStep.question,
      answer: selectedAnswer.text,
      tag: selectedAnswer.tag,
      choiceLabel: selectedAnswer.choiceLabel,
    });
  }

  currentStepIndex = currentStepIndex + 1;

  if (currentStepIndex >= storySteps.length) {
    showSummary();
  } else {
    showCurrentStep();
    speakCurrentStep();
  }

  setTimeout(function () {
    isChangingStep = false;
  }, 350);
}

function showSummary() {
  const strongestTrait = findStrongestTrait();

  stopNarration();
  showScreen(summaryScreen);
  childMessage.textContent = "You helped make Luna's adventure special. Every choice helped tell the story!";
  parentSummary.textContent = insightMessages[strongestTrait];
  showChoiceList();
}

function renderWords(container, text, startOffset) {
  const words = text.split(" ");
  let runningIndex = startOffset;

  container.innerHTML = "";

  words.forEach(function (word, index) {
    const wordSpan = document.createElement("span");
    const space = index === words.length - 1 ? "" : " ";

    wordSpan.className = "word";
    wordSpan.textContent = word;
    container.appendChild(wordSpan);
    container.appendChild(document.createTextNode(space));

    wordTimings.push({
      start: runningIndex,
      end: runningIndex + word.length,
      element: wordSpan,
    });

    runningIndex = runningIndex + word.length + space.length;
  });
}

function speakCurrentStep() {
  if ("speechSynthesis" in window === false) {
    listenButton.textContent = "Audio not available";
    return;
  }

  stopNarration();
  clearActiveWords();

  selectedNarrationVoice = chooseNarrationVoice();
  listenButton.textContent = "Reading...";
  narrationRunId = narrationRunId + 1;
  speakNarrationSegment(splitNarrationIntoSegments(narrationText), 0, narrationRunId);
}

function stopNarration() {
  narrationRunId = narrationRunId + 1;

  if (narrationTimer !== null) {
    clearTimeout(narrationTimer);
    narrationTimer = null;
  }

  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }

  speechUtterance = null;
  clearActiveWords();
  listenButton.innerHTML = "&#9654; Listen";
}

function loadNarrationVoices() {
  narrationVoices = window.speechSynthesis.getVoices();
  selectedNarrationVoice = chooseNarrationVoice();
}

function chooseNarrationVoice() {
  const englishVoices = narrationVoices.filter(function (voice) {
    return voice.lang.toLowerCase().startsWith("en");
  });

  if (englishVoices.length === 0) {
    return null;
  }

  // Give higher scores to voices that are usually warmer and less robotic.
  englishVoices.sort(function (firstVoice, secondVoice) {
    return getVoiceScore(secondVoice) - getVoiceScore(firstVoice);
  });

  return englishVoices[0];
}

function getVoiceScore(voice) {
  const name = voice.name.toLowerCase();
  let score = 0;

  if (voice.lang.toLowerCase() === "en-us") {
    score = score + 20;
  }

  if (voice.default) {
    score = score + 8;
  }

  if (voice.localService) {
    score = score + 8;
  }

  if (name.includes("natural") || name.includes("neural") || name.includes("premium")) {
    score = score + 100;
  }

  if (name.includes("enhanced")) {
    score = score + 88;
  }

  if (name.includes("samantha")) {
    score = score + 85;
  }

  if (name.includes("jenny") || name.includes("aria") || name.includes("ava")) {
    score = score + 82;
  }

  if (name.includes("nicky") || name.includes("zoe") || name.includes("joanna")) {
    score = score + 75;
  }

  if (name.includes("google us english")) {
    score = score + 68;
  }

  if (name.includes("karen") || name.includes("moira") || name.includes("tessa")) {
    score = score + 55;
  }

  if (name.includes("alex")) {
    score = score + 35;
  }

  if (name.includes("compact") || name.includes("robot") || name.includes("whisper")) {
    score = score - 70;
  }

  if (name.includes("fred") || name.includes("ralph") || name.includes("trinoids")) {
    score = score - 80;
  }

  return score;
}

function splitNarrationIntoSegments(text) {
  const segments = [];
  let segmentStart = 0;

  for (let index = 0; index < text.length; index = index + 1) {
    const character = text[index];
    const isSentenceEnd = character === "." || character === "!" || character === "?";
    const isSoftBreak = character === "," || character === ";" || character === ":";
    const isLastCharacter = index === text.length - 1;

    if (isSentenceEnd || isSoftBreak || isLastCharacter) {
      const rawSegment = text.slice(segmentStart, index + 1);
      const trimmedSegment = rawSegment.trim();
      const leadingSpaces = rawSegment.length - rawSegment.trimStart().length;

      if (trimmedSegment.length > 0) {
        segments.push({
          breakType: getBreakType(character, isLastCharacter),
          order: segments.length,
          start: segmentStart + leadingSpaces,
          text: trimmedSegment,
        });
      }

      segmentStart = index + 1;
    }
  }

  return segments;
}

function getBreakType(character, isLastCharacter) {
  if (character === "?") {
    return "question";
  }

  if (character === "!") {
    return "excited";
  }

  if (character === "," || character === ";" || character === ":") {
    return "soft";
  }

  if (isLastCharacter) {
    return "end";
  }

  return "sentence";
}

function speakNarrationSegment(segments, segmentIndex, runId) {
  if (runId !== narrationRunId) {
    return;
  }

  if (segmentIndex >= segments.length) {
    clearActiveWords();
    listenButton.innerHTML = "&#9654; Listen";
    return;
  }

  const segment = segments[segmentIndex];
  const utterance = new SpeechSynthesisUtterance(segment.text);

  speechUtterance = utterance;

  if (selectedNarrationVoice !== null) {
    utterance.voice = selectedNarrationVoice;
    utterance.lang = selectedNarrationVoice.lang;
  } else {
    utterance.lang = "en-US";
  }

  // These settings keep the browser voice calm, warm, and story-like.
  utterance.rate = getSegmentRate(segment);
  utterance.pitch = getSegmentPitch(segment);
  utterance.volume = 1;

  utterance.onboundary = function (event) {
    highlightWordAt(segment.start + event.charIndex);
  };

  utterance.onend = function () {
    if (runId !== narrationRunId) {
      return;
    }

    clearActiveWords();
    narrationTimer = setTimeout(function () {
      speakNarrationSegment(segments, segmentIndex + 1, runId);
    }, getSegmentPause(segment));
  };

  utterance.onerror = function () {
    clearActiveWords();
    listenButton.innerHTML = "&#9654; Listen";
  };

  window.speechSynthesis.speak(utterance);
}

function getSegmentRate(segment) {
  const text = segment.text.toLowerCase();
  const naturalVariation = [0, -0.025, 0.018, -0.012, 0.01][segment.order % 5];
  let rate = 0.82;

  if (segment.breakType === "question") {
    rate = 0.78;
  } else if (text.includes("soft whimper")) {
    rate = 0.72;
  } else if (text.includes("darker") || text.includes("wind") || text.includes("shadow")) {
    rate = 0.74;
  } else if (text.includes("bright path") || text.includes("felt proud")) {
    rate = 0.84;
  } else if (text.includes("for choice")) {
    rate = 0.76;
  } else if (segment.breakType === "soft") {
    rate = 0.8;
  } else if (text.length < 35) {
    rate = 0.84;
  } else {
    rate = 0.8;
  }

  return clamp(rate + naturalVariation, 0.7, 0.9);
}

function getSegmentPitch(segment) {
  const text = segment.text.toLowerCase();
  const naturalVariation = [0.02, -0.015, 0.04, -0.025, 0.01][segment.order % 5];
  let pitch = 1.06;

  if (segment.breakType === "question") {
    pitch = 1.2;
  } else if (segment.breakType === "excited") {
    pitch = 1.16;
  } else if (text.includes("puppy") || text.includes("friends") || text.includes("share")) {
    pitch = 1.13;
  } else if (text.includes("bright path") || text.includes("picnic")) {
    pitch = 1.12;
  } else if (text.includes("darker") || text.includes("wind") || text.includes("shadow")) {
    pitch = 0.96;
  } else if (text.includes("soft whimper")) {
    pitch = 1.02;
  } else if (text.includes("for choice")) {
    pitch = 0.98;
  }

  return clamp(pitch + naturalVariation, 0.92, 1.24);
}

function getSegmentPause(segment) {
  if (segment.breakType === "question") {
    return 650;
  }

  if (segment.breakType === "excited") {
    return 480;
  }

  if (segment.breakType === "soft") {
    return 230;
  }

  if (segment.text.length < 35) {
    return 360;
  }

  return 520;
}

function clamp(number, minimum, maximum) {
  return Math.min(Math.max(number, minimum), maximum);
}

function highlightWordAt(characterIndex) {
  clearActiveWords();

  wordTimings.forEach(function (wordTiming) {
    if (characterIndex >= wordTiming.start && characterIndex <= wordTiming.end) {
      wordTiming.element.classList.add("active-word");
    }
  });
}

function clearActiveWords() {
  const activeWords = document.querySelectorAll(".active-word");

  activeWords.forEach(function (word) {
    word.classList.remove("active-word");
  });
}

function findStrongestTrait() {
  const tagCounts = {};
  let strongestTrait = "empathy";
  let highestCount = 0;

  // Count how many times each behavior tag was chosen.
  chosenAnswers.forEach(function (answer) {
    if (tagCounts[answer.tag] === undefined) {
      tagCounts[answer.tag] = 0;
    }

    tagCounts[answer.tag] = tagCounts[answer.tag] + 1;

    if (tagCounts[answer.tag] > highestCount) {
      highestCount = tagCounts[answer.tag];
      strongestTrait = answer.tag;
    }
  });

  return strongestTrait;
}

function showChoiceList() {
  choiceList.innerHTML = "";

  chosenAnswers.forEach(function (answer) {
    const listItem = document.createElement("li");
    listItem.textContent =
      answer.choiceLabel + ": " + answer.answer + " (" + answer.tag + ")";
    choiceList.appendChild(listItem);
  });
}

function playClickSound() {
  // Web Audio creates a tiny cheerful beep without needing sound files.
  if (window.AudioContext === undefined && window.webkitAudioContext === undefined) {
    return;
  }

  if (audioContext === null) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  const oscillator = audioContext.createOscillator();
  const volume = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = 560;
  volume.gain.value = 0.05;

  oscillator.connect(volume);
  volume.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.07);
}
