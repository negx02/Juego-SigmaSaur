const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const currentScoreEl = document.getElementById('current-score');
const hiScoreEl = document.getElementById('hi-score-display');
const finalScoreEl = document.getElementById('final-score');
const newRecordMsg = document.getElementById('new-record-msg');

// Estados del juego
let gameRunning = false;
let gameSpeed = 6;
let score = 0;
let highScore = localStorage.getItem('sigmaSaurHi') || 0;
let frame = 0;
let spawnTimer = 0;
let obstacles = [];
let decorations = [];

hiScoreEl.innerText = `HI: ${Math.floor(highScore).toString().padStart(5, '0')}`;

// Objeto Jugador (Dino rediseñado)
const dino = {
    x: 50,
    y: 280,
    originalWidth: 50,
    originalHeight: 70,
    width: 50,
    height: 70,
    dy: 0,
    jumpPower: -13,
    gravity: 0.7,
    grounded: false,
    crouching: false,
    color: '#39ff14',
    
    draw: function() {
        //DISEÑO DE PERSONAJE
        ctx.fillStyle = this.color;
        
        if (this.crouching) {
            // DIBUJO AGACHADO (Forma alargada)
            // Cuerpo central
            ctx.fillRect(this.x, this.y + 20, 60, 25);
            // Cola (atrás)
            ctx.fillRect(this.x - 20, this.y + 25, 20, 10);
            // Cabeza (adelante baja)
            ctx.fillStyle = '#2dbd0f';
            ctx.fillRect(this.x + 60, this.y + 20, 25, 25);
            // Ojo
            ctx.fillStyle = '#000';
            ctx.fillRect(this.x + 75, this.y + 25, 5, 5);
            // Patas (encogidas)
            ctx.fillStyle = '#2dbd0f';
            ctx.fillRect(this.x + 10, this.y + 45, 15, 5); // Trasera
            ctx.fillRect(this.x + 40, this.y + 45, 15, 5); // Delantera
        } else {
            // DIBUJO DE PIE (Forma "Kaiju" / T-Rex agresivo)
            
            // Cola (curva hacia arriba para balance)
            ctx.fillRect(this.x - 20, this.y + 20, 20, 15);
            ctx.fillRect(this.x - 25, this.y + 10, 10, 10); // Punta cola

            // Cuerpo (Robusto)
            ctx.fillRect(this.x, this.y + 10, 50, 45);
            
            // Cabeza (Más grande y cuadrada)
            ctx.fillStyle = '#2dbd0f';
            ctx.fillRect(this.x + 20, this.y - 15, 45, 40);
            
            // Hocico/Mandíbula
            ctx.fillStyle = '#39ff14';
            ctx.fillRect(this.x + 65, this.y, 10, 25);

            // Ojo
            ctx.fillStyle = '#000';
            ctx.fillRect(this.x + 50, this.y - 5, 6, 6);
            
            // Brazos (Garras rosas)
            ctx.fillStyle = '#ff00ff'; 
            ctx.fillRect(this.x + 50, this.y + 30, 15, 6);
            ctx.fillRect(this.x + 60, this.y + 36, 4, 6); // Garra abajo

            // Patas (Animación de correr)
            ctx.fillStyle = '#2dbd0f';
            if (Math.floor(frame / 8) % 2 === 0) {
                ctx.fillRect(this.x + 5, this.y + 55, 18, 15); // Pata trasera piso
                ctx.fillRect(this.x + 35, this.y + 50, 18, 10); // Pata delantera aire
            } else {
                ctx.fillRect(this.x + 5, this.y + 50, 18, 10); // Pata trasera aire
                ctx.fillRect(this.x + 35, this.y + 55, 18, 15); // Pata delantera piso
            }
        }
    },
    jump: function() {
        if (this.grounded && !this.crouching) {
            this.dy = this.jumpPower;
            this.grounded = false;
        }
    },
    crouch: function(isDown) {
        if(isDown) {
            if (!this.crouching) {
                this.crouching = true;
                this.height = 35; 
                this.width = 70; 
                if (!this.grounded) this.dy += 5; 
            }
            if (this.grounded) this.y = 350 - this.height;
        } else {
            if (this.crouching) {
                this.crouching = false;
                this.height = this.originalHeight;
                this.width = this.originalWidth;
                this.y = 350 - this.height;
            }
        }
    },
    update: function() {
        if (!gameRunning) return;
        this.dy += this.gravity;
        this.y += this.dy;

        // Colisión Suelo
        if (this.y + this.height > 350) {
            this.y = 350 - this.height;
            this.dy = 0;
            this.grounded = true;
        } else {
            this.grounded = false;
        }
    }
};

// Obstáculos
class Obstacle {
    constructor(type) {
        this.x = canvas.width;
        this.markedForDeletion = false;
        this.type = type;

        if (type === 'tronco') {
            this.width = 40; this.height = 30;
            this.y = 350 - this.height;
            this.color = '#8B4513';
        } else if (type === 'muro') {
            this.width = 30; this.height = 70;
            this.y = 350 - this.height;
            this.color = '#777';
        } else if (type === 'avion') {
            this.width = 60; 
            this.height = 30;
            this.y = 275; 
            this.color = '#55aaff';
        }
    }
    update() {
        this.x -= gameSpeed;
        if (this.x + this.width < -50) this.markedForDeletion = true;
    }
    draw() {
        if (this.type === 'avion') {
            ctx.fillStyle = '#ccc';
            ctx.beginPath();
            ctx.ellipse(this.x + 30, this.y + 15, 30, 10, 0, 0, Math.PI * 2); 
            ctx.fill();
            ctx.fillStyle = '#ff3333';
            ctx.fillRect(this.x + 15, this.y + 5, 25, 5);
            ctx.fillStyle = '#fff';
            if (frame % 4 < 2) ctx.fillRect(this.x - 5, this.y + 5, 5, 20);
        } else if (this.type === 'tronco') {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.fillStyle = '#5c3a1e';
            ctx.fillRect(this.x + 5, this.y + 5, 10, 20);
        } else { // Muro
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.strokeStyle = '#000';
            ctx.strokeRect(this.x, this.y, this.width, this.height);
        }
    }
}

class Decoration {
    constructor(type) {
        this.x = canvas.width;
        this.type = type;
        this.markedForDeletion = false;
        
        if (type === 'nube') {
            this.y = Math.random() * 80 + 20; 
            this.size = Math.random() * 30 + 30;
            this.speedModifier = 0.3;
        } else if (type === 'arbol_lejos') {
            this.y = 350;
            this.size = Math.random() * 40 + 40;
            this.speedModifier = 0.6;
        }
    }
    update() {
        this.x -= gameSpeed * this.speedModifier;
        if (this.x + 100 < -100) this.markedForDeletion = true;
    }
    draw() {
        if (this.type === 'nube') {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.arc(this.x + this.size * 0.8, this.y + 10, this.size * 0.8, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'arbol_lejos') {
            ctx.fillStyle = '#112211'; 
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x + this.size/2, this.y - this.size * 2);
            ctx.lineTo(this.x + this.size, this.y);
            ctx.fill();
        }
    }
}

// --- Sistema ---

function startGame() {
    if (gameRunning) return;
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    newRecordMsg.classList.add('hidden');
    
    // INTENTAR REPRODUCIR AUDIO
    // Los navegadores bloquean el audio automático, pero como el usuario 
    // acaba de interactuar (clic/tecla) para iniciar, esto debería funcionar.
    if(bgMusic) {
        bgMusic.currentTime = 0; // Reiniciar canción
        bgMusic.play().catch(e => console.log("Audio no iniciado: interacción requerida"));
    }

    gameRunning = true;
    score = 0;
    gameSpeed = 7;
    obstacles = [];
    decorations = [];
    spawnTimer = 0;
    dino.y = 280;
    dino.dy = 0;
    dino.crouch(false);
    
    animate();
}

function resetGame() {
    startGame();
}

function exitGame() {
    if(confirm("¿SALIR DEL JUEGO?")) {
        // Detener música al salir
        if(bgMusic) bgMusic.pause();
        window.close();
        document.body.innerHTML = "<div style='color:white; text-align:center;'><h1>SISTEMA APAGADO</h1></div>";
    }
}

function checkCollision(player, obs) {
    const paddingX = 8; 
    const paddingY = 2; 

    return (
        player.x + paddingX < obs.x + obs.width - paddingX &&
        player.x + player.width - paddingX > obs.x + paddingX &&
        player.y + paddingY < obs.y + obs.height - paddingY &&
        player.y + player.height - paddingY > obs.y + paddingY
    );
}

function gameOver() {
    gameRunning = false;
    

    let isNewRecord = false;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('sigmaSaurHi', highScore);
        isNewRecord = true;
    }
    finalScoreEl.innerText = Math.floor(score);
    hiScoreEl.innerText = `HI: ${Math.floor(highScore).toString().padStart(5, '0')}`;
    if(isNewRecord) newRecordMsg.classList.remove('hidden');
    gameOverScreen.classList.remove('hidden');
}

function animate() {
    if (!gameRunning) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fondo Cielo Gradiente
    let gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, "#200f21");
    gradient.addColorStop(1, "#442244");
    ctx.fillStyle = gradient;
    ctx.fillRect(0,0, canvas.width, canvas.height);

    // --- DISEÑO DE SUELO (TIERRA) ---
    // Base Tierra
    ctx.fillStyle = '#4a3c31'; // Café tierra oscuro
    ctx.fillRect(0, 350, canvas.width, 50);
    
    // Línea de pasto superior
    ctx.fillStyle = '#2d8a2d'; // Verde oscuro
    ctx.fillRect(0, 350, canvas.width, 5);

    // Textura de tierra que se mueve
    ctx.fillStyle = '#2e241d'; // Rocas oscuras
    for(let i=0; i<canvas.width; i+=60) {
        // Calcular posición basada en velocidad para efecto de movimiento
        let offset = (i - frame * gameSpeed) % canvas.width;
        if(offset < 0) offset += canvas.width;
        
        // Dibujar detalles de tierra aleatorios pero consistentes
        ctx.fillRect(offset, 365, 6, 6); 
        ctx.fillRect(offset + 25, 380, 4, 4);
        ctx.fillRect(offset + 10, 390, 8, 3);
    }

    score += 0.05;
    gameSpeed += 0.0003; 
    currentScoreEl.innerText = Math.floor(score).toString().padStart(5, '0');

    // Decoración
    if (Math.random() < 0.02) decorations.push(new Decoration('nube'));
    if (Math.random() < 0.04) decorations.push(new Decoration('arbol_lejos'));

    decorations.forEach((d, index) => {
        d.update(); d.draw();
        if (d.markedForDeletion) decorations.splice(index, 1);
    });

    // Obstáculos
    spawnTimer--;
    if (spawnTimer <= 0) {
        const types = ['tronco', 'muro', 'avion', 'avion']; 
        const randomType = types[Math.floor(Math.random() * types.length)];
        obstacles.push(new Obstacle(randomType));
        spawnTimer = (Math.random() * 40 + 50) - (gameSpeed * 1.5);
        if (spawnTimer < 35) spawnTimer = 35;
    }

    obstacles.forEach((obs, index) => {
        obs.update(); obs.draw();
        if (checkCollision(dino, obs)) gameOver();
        if (obs.markedForDeletion) obstacles.splice(index, 1);
    });

    dino.update();
    dino.draw();

    frame++;
    requestAnimationFrame(animate);
}

function handleInput(e) {
    if (!gameRunning) {
        if ((e.code || e.type === 'mousedown') && !startScreen.classList.contains('hidden')) startGame();
        return;
    }
    if (e.type === 'keydown') {
        if (e.code === 'Space' || e.code === 'ArrowUp') dino.jump();
        if (e.code === 'ArrowDown' || e.code === 'KeyS') dino.crouch(true);
    } else if (e.type === 'keyup') {
        if (e.code === 'ArrowDown' || e.code === 'KeyS') dino.crouch(false);
    } else if (e.type === 'mousedown' || e.type === 'touchstart') {
        const clientY = e.clientY || e.touches[0].clientY;
        if (clientY > window.innerHeight / 2) dino.crouch(true);
        else dino.jump();
    } else if (e.type === 'mouseup' || e.type === 'touchend') {
        dino.crouch(false);
    }
}

window.addEventListener('keydown', handleInput);
window.addEventListener('keyup', handleInput);
canvas.addEventListener('mousedown', handleInput);
canvas.addEventListener('mouseup', handleInput);
canvas.addEventListener('touchstart', (e)=>{e.preventDefault(); handleInput(e)}, {passive:false});
canvas.addEventListener('touchend', (e)=>{e.preventDefault(); handleInput(e)});

function initialDraw() {
    ctx.fillStyle = '#200f21'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#4a3c31'; ctx.fillRect(0, 350, canvas.width, 50); // Suelo tierra inicial
    ctx.fillStyle = '#2d8a2d'; ctx.fillRect(0, 350, canvas.width, 5); // Pasto inicial
    dino.draw();
}
initialDraw();