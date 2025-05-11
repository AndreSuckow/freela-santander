const scorm = pipwerks.SCORM;
scorm.version = "1.2";

let isLMS = false;
let totalSections = 21; // Total de seções disponíveis
let currentSectionIndex = 0;
let highestSectionVisited = 0;
let debugMode = false;

// Dados do SCORM para controle
let data = {
  scoreRaw: "0",
  lessonLocation: "0",
  lessonStatus: "incomplete"
};

// Função para carregar um módulo
async function loadModule(index) {
  try {
    const moduleNumber = index + 1;
    const container = document.createElement('div');
    container.className = 'section-container';
    container.id = `section-${moduleNumber}`;
    
    // Carrega o HTML do módulo
    const response = await fetch(`screens/${moduleNumber}/index.html`);
    const html = await response.text();
    container.innerHTML = html;

    // Remove previous module stylesheet if exists
    const previousStyle = document.querySelector(`link[href^="screens/"][href$="/style.css"]`);
    if (previousStyle) {
      previousStyle.remove();
    }

    // Carrega e aplica o CSS do módulo
    const styleElement = document.createElement('link');
    styleElement.rel = 'stylesheet';
    styleElement.href = `screens/${moduleNumber}/style.css`;
    document.head.appendChild(styleElement);

    // Remove previous module script if exists
    const previousScript = document.querySelector(`script[src^="screens/"][src$="/script.js"]`);
    if (previousScript) {
      previousScript.remove();
    }

    // Carrega e executa o JavaScript do módulo
    const script = document.createElement('script');
    script.src = `screens/${moduleNumber}/script.js`;
    document.body.appendChild(script);

    return container;
  } catch (error) {
    console.error(`Erro ao carregar módulo ${index + 1}:`, error);
    return null;
  }
}

// Função para ativar/desativar modo debug
function toggleDebug(active = true) {
  debugMode = active;
  console.log(`%cModo Debug ${debugMode ? 'ATIVADO' : 'DESATIVADO'}`, 'color: cyan; font-weight: bold');
  if (debugMode) {
    console.log('%cUse debug.goTo(número_da_tela) para navegar', 'color: cyan');
  }
}

// Objeto debug com funções úteis para desenvolvimento
const debug = {
  goTo: function(screenNumber) {
    if (!debugMode) {
      console.log('%cAtive o modo debug primeiro usando toggleDebug()', 'color: red');
      return;
    }
    
    const index = screenNumber - 1;
    if (index < 0 || index >= totalSections) {
      console.log(`%cTela ${screenNumber} não existe. Total de telas: ${totalSections}`, 'color: red');
      return;
    }
    
    console.log(`%cNavegando para tela ${screenNumber} via modo debug`, 'color: cyan');
    goToSection(index);
  },
  
  status: function() {
    console.log('%cStatus do Curso:', 'color: cyan; font-weight: bold');
    console.log('Total de telas:', totalSections);
    console.log('Tela atual:', currentSectionIndex + 1);
    console.log('Maior tela visitada:', highestSectionVisited + 1);
    console.log('Progresso:', data.scoreRaw + '%');
    console.log('Status:', data.lessonStatus);
    console.log('Modo Debug:', debugMode ? 'Ativado' : 'Desativado');
  }
};

function updateProgress(index) {
  const perc = Math.round(((highestSectionVisited + 1) / totalSections) * 100);
  data.scoreRaw = perc.toString();
  data.lessonLocation = highestSectionVisited.toString();

  console.log(`%cProgresso atual do curso: ${perc}%`, 'color: orange; font-weight: bold');

  if (highestSectionVisited === totalSections - 1) {
    data.lessonStatus = "completed";
    console.log('%cCurso Completo!', 'color: green; font-weight: bold; font-size: 14px');
  }

  sincronizeSCORM();
}

// Create overlay element for transitions
const overlay = document.createElement('div');
overlay.className = 'transition-overlay';
document.body.appendChild(overlay);

// Função global para navegar entre seções
async function goToSection(index) {
  if (index < 0 || index >= totalSections) return;

  const contentDiv = document.getElementById('content');
  
  // Start transition - fade to black
  overlay.classList.add('active');
  
  // Wait for fade out animation
  await new Promise(resolve => setTimeout(resolve, 500));

  // Remove módulos anteriores
  document.querySelectorAll('.section-container').forEach(section => {
    section.remove();
  });

  // Carrega e adiciona novo módulo
  const moduleContainer = await loadModule(index);
  if (moduleContainer) {
    contentDiv.appendChild(moduleContainer);
    
    // Small delay to ensure DOM is ready
    setTimeout(() => {
      moduleContainer.classList.add('active');
      // Start fade in from black
      overlay.classList.remove('active');
    }, 50);
  }
  
  currentSectionIndex = index;
  highestSectionVisited = Math.max(highestSectionVisited, currentSectionIndex);
  
  // Handle sound management for the new screen
  handleScreenChange(index);
  
  console.log(`%cNavegando para tela ${index + 1} de ${totalSections}`, 'color: purple; font-weight: bold');
  updateProgress(index);
}

function sincronizeSCORM() {
  highestSectionVisited = Math.max(highestSectionVisited, currentSectionIndex);
  
  if (isLMS) {
    scorm.set("cmi.core.score.raw", data.scoreRaw);
    scorm.set("cmi.core.lesson_location", highestSectionVisited.toString());
    scorm.set("cmi.core.lesson_status", data.lessonStatus);
    scorm.save();
  } else {
    localStorage.setItem('courseProgress', JSON.stringify({
      data: data,
      highestSectionVisited: highestSectionVisited
    }));
  }
}

// Recupera dados salvos localmente
if (localStorage.getItem('courseProgress')) {
  const savedProgress = JSON.parse(localStorage.getItem('courseProgress'));
  data = savedProgress.data;
  highestSectionVisited = savedProgress.highestSectionVisited;
}

// Wrap initialization in a function that will be called by preloader
window.initCourse = async function() {
  const connected = scorm.init();
  isLMS = !!connected;

  if (isLMS) {
    console.log('%cServidor LMS Encontrado.', 'color: green; font-weight: bold');
    
    const lastLocation = scorm.get("cmi.core.lesson_location");
    const lastStatus = scorm.get("cmi.core.lesson_status");
    const lastScore = scorm.get("cmi.core.score.raw");

    data.lessonLocation = lastLocation || "0";
    data.lessonStatus = lastStatus || "incomplete";
    data.scoreRaw = lastScore || "0";
    
    highestSectionVisited = Number(data.lessonLocation);

    scorm.set("cmi.core.score.min", "0");
    scorm.set("cmi.core.score.max", "100");
  } else {
    console.log('%cModo Local Ativo - Progresso salvo no navegador', 'color: blue; font-weight: bold');
  }
  
  console.log(`%cÚltima tela visitada: ${Number(data.lessonLocation) + 1}`, 'color: blue; font-style: italic');
  
  // Inicia na última seção visitada ou na primeira
  await goToSection(Number(data.lessonLocation) || 0);
};

// Expondo funções globalmente
window.goToSection = goToSection;
window.toggleDebug = toggleDebug;
window.debug = debug;

console.log('%cModo debug disponível! Use toggleDebug() para ativar', 'color: cyan; font-style: italic');


