// M.0.1.js (SIMPLIFICADO)
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
    transcripcionDiv.textContent = "";
    
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
    botonMicrofono.innerHTML = '<box-icon name="microphone"></box-icon>';

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
    botonMicrofono.innerHTML = '<box-icon name="microphone-off"></box-icon>';

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
        transcripcionDiv.textContent = result.resultado;
        
        // Si hay un comando que genera URL, abrirla después de 1 segundo
        if (result.resultado.includes("YouTube") || 
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
        transcripcionDiv.textContent = result.text;
      }
      
    } else {
      transcripcionDiv.textContent = result.text || "Error en la transcripción";
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

// Llamar después de cargar la página
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM cargado, inicializando asistente...");
  
  // Configurar estilo inicial de transcripción
  if (transcripcionDiv) {
    transcripcionDiv.style.minHeight = "120px";
    transcripcionDiv.style.padding = "20px";
    transcripcionDiv.style.borderRadius = "10px";
    transcripcionDiv.style.backgroundColor = "#f9f9f9";
    transcripcionDiv.style.border = "2px solid #e0e0e0";
    transcripcionDiv.textContent = "Presiona el botón del micrófono para hablar";
  }
});

// Manejar el evento de WebSocket para detener grabación desde servidor
socket.on("detener_grabacion", (data) => {
  console.log("Deteniendo grabación desde servidor:", data.message);
  if (grabando) {
    detenerGrabacion();
  }
});