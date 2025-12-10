// M.0.1.JS (CORREGIDO COMPLETO)
const botonMicrofono = document.getElementById("microfono");
const audioReproducir = document.getElementById("audioReproducir");
const transcripcionDiv = document.getElementById("transcripcion");

let grabando = false;
let mediaRecorder;
let chunks = [];
let tiempoSilencio = 3000; // 3 segundos
let temporizadorSilencio;
let audioContext;
let analyser;
let source;
let scriptProcessor;

// Configurar conexión WebSocket
const socket = io();

// Escuchar eventos de WebSocket para iniciar o detener la grabación
socket.on("iniciar_grabacion", (data) => {
  console.log(data.message);
  iniciarGrabacion();
});

socket.on("detener_grabacion", (data) => {
  console.log(data.message);
  detenerGrabacion();
});

// Manejo del botón de grabación
botonMicrofono.addEventListener("click", async () => {
  if (grabando) {
    detenerGrabacion();
  } else {
    await iniciarGrabacion();
  }
});

// Función para iniciar la grabación
async function iniciarGrabacion() {
  try {
    // Reproducir sonido de inicio
    try {
      const beep = new Audio("/static/audios/beep2.mp3");
      await beep.play().catch(err => console.log("Audio beep2 opcional:", err));
    } catch (e) {
      console.log("Audio beep2 no disponible");
    }
    
    // Limpiar transcripción anterior
    
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
    
    mediaRecorder = new MediaRecorder(stream, { 
      mimeType: "audio/webm;codecs=opus",
      audioBitsPerSecond: 128000
    });

    chunks = []; // Limpiar chunks anteriores

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    mediaRecorder.onstop = async () => {
      console.log("Grabación finalizada, procesando audio...");
      await procesarAudio();
    };

    mediaRecorder.start(100); // Grabar en chunks de 100ms
    grabando = true;
    botonMicrofono.classList.add("grabando");
    botonMicrofono.innerHTML = '<box-icon name="microphone" color="white"></box-icon>';
    botonMicrofono.title = "Detener grabación";

    // Configurar AudioContext y AnalyserNode para detectar silencio
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    analyser.fftSize = 2048;

    scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);
    analyser.connect(scriptProcessor);
    scriptProcessor.connect(audioContext.destination);

    scriptProcessor.onaudioprocess = () => {
      const array = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(array);
      const amplitud = array.reduce((a, b) => a + b) / array.length;

      if (amplitud > 5) { // Umbral bajo para detectar voz
        reiniciarTemporizadorSilencio();
      }
    };

    // Iniciar el temporizador de silencio
    reiniciarTemporizadorSilencio();
    
  } catch (error) {
    console.error("Error al acceder al micrófono:", error);
    transcripcionDiv.textContent = "Error al acceder al micrófono. Verifica los permisos.";
  }
}

// Función para detener la grabación
function detenerGrabacion() {
  if (mediaRecorder && grabando && mediaRecorder.state !== "inactive") {
    try {
      const beep = new Audio("/static/audios/beep.mp3");
      beep.play().catch(err => console.log("Audio beep opcional:", err));
    } catch (e) {
      console.log("Audio beep no disponible");
    }
    
    mediaRecorder.stop();
    grabando = false;
    botonMicrofono.classList.remove("grabando");
    botonMicrofono.innerHTML = '<box-icon name="microphone-off" color="white"></box-icon>';
    botonMicrofono.title = "Iniciar grabación";

    clearTimeout(temporizadorSilencio); // Limpiar el temporizador

    // Liberar recursos de AudioContext
    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }
    
    // Detener todas las pistas del stream
    if (mediaRecorder.stream) {
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    
  }
}

// Función para procesar el audio
async function procesarAudio() {
  try {
    if (chunks.length === 0) {
      transcripcionDiv.textContent = "No se grabó audio. Intenta nuevamente.";
      return;
    }
    
    const blob = new Blob(chunks, { type: "audio/webm" });
    const url = URL.createObjectURL(blob);
    audioReproducir.src = url;
    chunks = [];

    const formData = new FormData();
    formData.append("audio", blob, "audio.webm");

    const response = await fetch("/audio", { 
      method: "POST", 
      body: formData 
    });
    
    const result = await response.json();

    if (result.success && result.text) {
      // Mostrar texto transcrito
      if (result.resultado) {
        transcripcionDiv.innerHTML = `
          <div>
            <strong>Dijiste:</strong> ${result.text}
          </div>
          <div>
            <strong>Asistente:</strong> ${result.resultado}
          </div>
        `;
      } else {
        transcripcionDiv.textContent = `Dijiste: ${result.text}`;
      }
      
      // Si hay un comando que genera URL, abrirla después de 1 segundo
      if (result.resultado && result.resultado.includes("YouTube") || 
          result.resultado.includes("Google") || 
          result.resultado.includes("Wikipedia")) {
        setTimeout(() => {
          const searchQuery = encodeURIComponent(result.text.replace("reproduce", "").replace("busca en", "").trim());
          let url = "";
          
          if (result.text.includes("reproduce") || result.text.includes("youtube")) {
            url = `https://www.youtube.com/results?search_query=${searchQuery}`;
          } else if (result.text.includes("busca en") && !result.text.includes("youtube")) {
            url = `https://www.google.com/search?q=${searchQuery}`;
          } else if (result.text.includes("dime")) {
            url = `https://es.wikipedia.org/wiki/${searchQuery}`;
          }
          
          if (url) {
            window.open(url, '_blank');
          }
        }, 1000);
      }
      
    } else {
      transcripcionDiv.textContent = ` ${result.text || "Error en la transcripción"}`;
    }
  } catch (error) {
    console.error("Error procesando audio:", error);
    transcripcionDiv.textContent = "Error al enviar el audio al servidor.";
  }
}

// Función para reiniciar el temporizador de silencio
function reiniciarTemporizadorSilencio() {
  clearTimeout(temporizadorSilencio); // Limpiar el temporizador anterior
  temporizadorSilencio = setTimeout(() => {
    console.log("Silencio detectado. Deteniendo grabación...");
    socket.emit("detener_grabacion", { message: "Detener grabación por silencio" });
    detenerGrabacion();
  }, tiempoSilencio);
}



// Agregar input de texto para comandos
function agregarInputComando() {
  const asistenteContainer = document.querySelector(".asistente-container");
  if (!asistenteContainer) {
    console.log("Contenedor de asistente no encontrado, reintentando...");
    setTimeout(agregarInputComando, 500);
    return;
  }
  
  // Verificar si ya existe
  if (document.getElementById("input-comando-container")) return;
  
  const inputContainer = document.createElement("div");
  inputContainer.id = "input-comando-container";
  inputContainer.style.cssText = `
    width: 100%;
    max-width: 600px;
    margin: 30px auto;
    display: flex;
    gap: 10px;
    align-items: center;
  `;
  
  inputContainer.innerHTML = `
    <input type="text" id="input-comando" placeholder="O escribe tu comando aquí (ej: 'reproduce música', 'busca en google python')" 
           style="flex: 1; padding: 14px; border: 2px solid #4CAF50; border-radius: 10px; font-size: 16px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
    <button id="btn-ejecutar-comando" 
            style="padding: 14px 28px; background: linear-gradient(135deg, #4CAF50, #45a049); color: white; border: none; border-radius: 10px; cursor: pointer; font-size: 16px; font-weight: bold; box-shadow: 0 4px 6px rgba(76, 175, 80, 0.3); transition: all 0.3s;">
      Ejecutar
    </button>
  `;
  
  asistenteContainer.appendChild(inputContainer);
  
  const btnEjecutar = document.getElementById("btn-ejecutar-comando");
  const inputComando = document.getElementById("input-comando");
  
  btnEjecutar.addEventListener("click", async () => {
    const texto = inputComando.value.trim();
    if (texto) {
      await procesarComandoTexto(texto);
      inputComando.value = "";
      inputComando.focus();
    }
  });
  
  inputComando.addEventListener("keypress", async (e) => {
    if (e.key === "Enter") {
      const texto = inputComando.value.trim();
      if (texto) {
        await procesarComandoTexto(texto);
        inputComando.value = "";
      }
    }
  });
  
  // Efecto hover en botón
  btnEjecutar.addEventListener("mouseenter", () => {
    btnEjecutar.style.transform = "translateY(-2px)";
    btnEjecutar.style.boxShadow = "0 6px 12px rgba(76, 175, 80, 0.4)";
  });
  
  btnEjecutar.addEventListener("mouseleave", () => {
    btnEjecutar.style.transform = "translateY(0)";
    btnEjecutar.style.boxShadow = "0 4px 6px rgba(76, 175, 80, 0.3)";
  });
}

// Llamar después de cargar la página
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM cargado, inicializando asistente...");
  setTimeout(agregarInputComando, 1000);
  
  // Configurar estilo inicial de transcripción
});

// Manejar el evento de WebSocket para detener grabación desde servidor
socket.on("detener_grabacion", (data) => {
  console.log("Deteniendo grabación desde servidor:", data.message);
  if (grabando) {
    detenerGrabacion();
  }
});