class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreElement = document.getElementById('score');
        this.startScreen = document.getElementById('startScreen');
        this.gameOverScreen = document.getElementById('gameOverScreen');
        
        // Ad system
        this.videoAdOverlay = document.getElementById('videoAdOverlay');
        this.adTimer = document.getElementById('adTimer');
        this.skipAdBtn = document.getElementById('skipAdBtn');
        this.canRevive = true; // Může hráč použít reklamu na oživení?
        
        // Herní proměnné
        this.isRunning = false;
        this.score = 0;
        this.gameSpeed = 0.8;
        this.frame = 0;
        this.combo = 0;
        this.maxCombo = 0;
        
        // Shop systém
        this.coins = 0; // Virtuální měna (1 sestřel = 1 coin)
        this.hasRocketSystem = false; // Raketový systém zakoupen?
        this.rocketCooldown = 0; // Cooldown pro raketu
        this.rocketMaxCooldown = 120; // 2 sekundy
        this.rockets = []; // Aktivní rakety
        this.shotsUntilRepair = 20; // Počet sestřelů do auto-opravy
        
        // Raketový systém pozice (na zemi mezi věžemi)
        this.rocketSystemPos = { x: 0, y: 0, width: 40, height: 30 };
        
        // Vlastní stíhačky (friendly fighters)
        this.friendlyFighters = [];
        this.maxFighters = 0; // Kolik stíhaček může být aktivních
        this.fighterSpawnCooldown = 0;
        
        // Věže (mrakodrapy) - statické, jen pro zobrazení
        this.groundLevel = 0;
        this.towerBaseHeight = 200; // Začínají na 200px
        this.maxTowerHeight = 0; // Vypočítá se při setupCanvas
        this.towers = [
            { 
                x: 0,
                y: 200, 
                width: 45,  // Menší budovy
                height: 200, // Menší výška (bude růst)
                destroyed: false,
                fireParticles: [],
                hitY: null, // Výška nárazu pro díru
                smokeParticles: []
            },
            { 
                x: 0,
                y: 200, 
                width: 45,  // Menší budovy
                height: 200, // Menší výška (bude růst)
                destroyed: false,
                fireParticles: [],
                hitY: null, // Výška nárazu pro díru
                smokeParticles: []
            }
        ];
        
        // Varování před příletem letadla
        this.warnings = [];
        
        // Nastavení velikosti canvasu
        this.setupCanvas();
        window.addEventListener('resize', () => this.setupCanvas());
        
        // Letadla
        this.planes = [];
        this.planeSpawnRate = 100; // Trochu pomalejší spawn pro větší prostor
        this.lastPlaneSpawn = 0;
        this.planeHeights = [0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85]; // Více výšek
        this.warningTime = 90; // frames před příletem se ukáže varování
        
        // Power-upy
        this.powerUps = [];
        this.lastPowerUpSpawn = 0;
        this.powerUpSpawnRate = 600; // každých 10 sekund
        
        // Particles pro efekty
        this.particles = [];
        
        // Mraky pro atmosféru
        this.clouds = [];
        this.initClouds();
        
        // Ovládání
        this.setupControls();
        
        // Shop setup
        this.setupShop();
        
        // Bind metod
        this.gameLoop = this.gameLoop.bind(this);
    }
    
    setupCanvas() {
        const container = document.getElementById('gameContainer');
        
        // Použij skutečnou velikost containeru (mezi reklamami)
        const rect = container.getBoundingClientRect();
        
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        
        // Úroveň země (5% výšky canvasu)
        this.groundLevel = this.canvas.height - (this.canvas.height * 0.05);
        
        // Max výška věží (85% výšky canvasu)
        this.maxTowerHeight = this.canvas.height * 0.85;
        
        // Umístění věží - dynamicky podle šířky
        const centerX = this.canvas.width / 2;
        const spacing = this.canvas.width * 0.15; // 15% šířky jako mezera
        
        if (this.towers.length > 0) {
            this.towers[0].x = centerX - spacing - this.towers[0].width / 2;
            this.towers[1].x = centerX + spacing - this.towers[1].width / 2;
            
            for (let tower of this.towers) {
                tower.y = Math.min(tower.y, this.groundLevel - tower.height);
            }
        }
        
        // Pozice raketového systému (mezi věžemi na zemi)
        this.rocketSystemPos.x = centerX - this.rocketSystemPos.width / 2;
        this.rocketSystemPos.y = this.groundLevel - this.rocketSystemPos.height;
    }
    
    initClouds() {
        for (let i = 0; i < 5; i++) {
            this.clouds.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height * 0.5,
                width: 40 + Math.random() * 40,
                height: 20 + Math.random() * 20,
                speed: 0.2 + Math.random() * 0.3
            });
        }
    }
    
    setupControls() {
        const handleClick = (x, y) => {
            if (!this.isRunning) return;
            
            // Kontrola kliknutí na letadlo
            for (let i = this.planes.length - 1; i >= 0; i--) {
                const plane = this.planes[i];
                
                // Rozšířená hitbox pro snazší klikání - 50% větší oblast
                const hitMarginX = plane.width * 0.5; // 50% šířky letadla navíc na každou stranu
                const hitMarginY = plane.height * 0.5; // 50% výšky letadla navíc nahoře i dole
                
                if (x >= plane.x - hitMarginX && 
                    x <= plane.x + plane.width + hitMarginX &&
                    y >= plane.y - hitMarginY && 
                    y <= plane.y + plane.height + hitMarginY) {
                    
                    // Letadlo zasaženo!
                    this.shootPlane(plane, i);
                    return;
                }
            }
        };
        
        // Touch ovládání
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            
            handleClick(x, y);
        });
        
        // Mouse ovládání
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            handleClick(x, y);
        });
    }
    
    setupShop() {
        const shopBtn = document.getElementById('shopBtn');
        const shopMenu = document.getElementById('shopMenu');
        const closeShopBtn = document.getElementById('closeShopBtn');
        const buyRocketBtn = document.getElementById('buyRocketBtn');
        const buyFighterBtn = document.getElementById('buyFighterBtn');
        
        shopBtn.addEventListener('click', () => {
            if (!this.isRunning) return;
            shopMenu.style.display = 'flex';
            this.isRunning = false; // Pauza hry
            this.updateShopDisplay();
        });
        
        closeShopBtn.addEventListener('click', () => {
            shopMenu.style.display = 'none';
            this.isRunning = true;
            this.gameLoop();
        });
        
        buyRocketBtn.addEventListener('click', () => {
            if (this.coins >= 50 && !this.hasRocketSystem) {
                this.coins -= 50;
                this.hasRocketSystem = true;
                this.updateShopDisplay();
                alert('🚀 Raketový systém aktivován!');
            } else if (this.hasRocketSystem) {
                alert('✅ Už máš raketový systém!');
            } else {
                alert('❌ Nemáš dost coins! Potřebuješ 50 coins.');
            }
        });
        
        buyFighterBtn.addEventListener('click', () => {
            if (this.coins >= 1 && this.maxFighters < 2) {
                this.coins -= 1;
                this.maxFighters++;
                this.spawnFriendlyFighter();
                this.updateShopDisplay(); 
                alert('✈️ Vlastní stíhačka zakoupena!');
            } else if (this.maxFighters >= 2) {
                alert('✅ Už máš maximum stíhaček (2)!');
            } else {
                alert('❌ Nemáš dost coins! Potřebuješ 150 coins.');
            }
        });
    }
    
    updateShopDisplay() {
        document.getElementById('coinsDisplay').textContent = `💰 Coins: ${this.coins}`;
        document.getElementById('repairProgress').textContent = `Pokrok: ${20 - this.shotsUntilRepair}/20`;
        document.getElementById('fighterCount').textContent = this.maxFighters;
        
        const rocketItem = document.getElementById('rocketItem');
        if (this.hasRocketSystem) {
            rocketItem.classList.add('owned');
            document.getElementById('buyRocketBtn').textContent = 'VLASTNÍŠ ✓';
            document.getElementById('buyRocketBtn').disabled = true;
        }
        
        const fighterItem = document.getElementById('fighterItem');
        const buyFighterBtn = document.getElementById('buyFighterBtn');
        if (this.maxFighters >= 2) {
            fighterItem.classList.add('owned');
            buyFighterBtn.textContent = 'MAXIMUM ✓';
            buyFighterBtn.disabled = true;
        }
    }
    
    spawnFriendlyFighter() {
        if (this.friendlyFighters.length >= this.maxFighters) return;
        
        const fromLeft = Math.random() > 0.5;
        const y = 100 + Math.random() * (this.canvas.height * 0.6);
        
        this.friendlyFighters.push({
            x: fromLeft ? -50 : this.canvas.width + 50,
            y: y,
            width: 40,
            height: 25,
            speed: (fromLeft ? 1 : -1) * 2.5, // Rychlá stíhačka
            shootCooldown: 0,
            shootRate: 60 // Střílí každou sekundu
        });
    }
    
    start() {
        this.startScreen.style.display = 'none';
        this.isRunning = true;
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.gameSpeed = 0.8;
        this.frame = 0;
        this.planes = [];
        this.warnings = [];
        this.powerUps = [];
        this.particles = [];
        this.rockets = []; // Reset raket
        this.rocketCooldown = 0;
        this.friendlyFighters = []; // Reset stíhaček
        this.fighterSpawnCooldown = 0;
        this.lastPlaneSpawn = 0;
        this.lastPowerUpSpawn = 0;
        this.canRevive = true; // Reset možnosti oživení
        
        // Reset pozic věží
        this.groundLevel = this.canvas.height - (this.canvas.height * 0.05);
        const centerX = this.canvas.width / 2;
        const spacing = this.canvas.width * 0.15; // 15% šířky jako mezera
        
        this.towers[0].x = centerX - spacing - this.towers[0].width / 2;
        this.towers[1].x = centerX + spacing - this.towers[1].width / 2;
        
        for (let tower of this.towers) {
            tower.height = this.towerBaseHeight; // Reset na základní výšku
            tower.y = this.groundLevel - tower.height;
            tower.destroyed = false;
            tower.fireParticles = [];
            tower.hitY = null;
            tower.smokeParticles = [];
        }
        
        this.updateScore();
        this.gameLoop();
    }
    
    restart() {
        this.gameOverScreen.style.display = 'none';
        this.start();
    }
    
    gameOver() {
        this.isRunning = false;
        const aliveTowers = this.towers.filter(t => !t.destroyed).length;
        let finalText = `Tvé skóre: ${this.score}`;
        if (this.maxCombo > 1) {
            finalText += `<br>Max Combo: ${this.maxCombo}x 🔥`;
        }
        finalText += `<br>Lives: ${aliveTowers}/2`;
        document.getElementById('finalScore').innerHTML = finalText;
        
        // Zobraz/skryj tlačítko na reklamu podle toho, jestli může oživit
        const watchAdBtn = document.getElementById('watchAdBtn');
        if (this.canRevive) {
            watchAdBtn.style.display = 'inline-block';
        } else {
            watchAdBtn.style.display = 'none';
        }
        
        this.gameOverScreen.style.display = 'flex';
    }
    
    reviveGame() {
        // Obnov obě budovy
        for (let tower of this.towers) {
            tower.destroyed = false;
            tower.fireParticles = [];
        }
        
        // Vyčisti letadla a částice
        this.planes = [];
        this.warnings = [];
        this.particles = [];
        
        // Pokračuj ve hře se současným skóre
        this.isRunning = true;
        this.canRevive = false; // Už nemůže použít další oživení
        this.gameOverScreen.style.display = 'none';
        this.updateScore();
        this.gameLoop();
    }
    
    showVideoAd(onComplete) {
        // Zkusíme přehrát reálnou AdInPlay reklamu
        if (window.aiptag && window.aiptag.cmd && window.aiptag.cmd.player) {
            console.log('Requesting AdInPlay rewarded video...');
            
            // Zobraz loading overlay
            this.videoAdOverlay.style.display = 'flex';
            this.adTimer.textContent = '⏳';
            this.skipAdBtn.style.display = 'none';
            
            aiptag.cmd.player.push(function() {
                const adPlayer = new aipPlayer({
                    AD_WIDTH: 960,
                    AD_HEIGHT: 540,
                    AD_DISPLAY: 'center',
                    LOADING_TEXT: 'Načítám reklamu...',
                    PREROLL_ELEM: function() {
                        return document.getElementById('videoAdPlayer');
                    },
                    AIP_COMPLETE: function() {
                        // Reklama dokončena úspěšně
                        console.log('AdInPlay ad completed successfully');
                        document.getElementById('videoAdOverlay').style.display = 'none';
                        if (onComplete) onComplete();
                    },
                    AIP_REMOVE: function() {
                        // Uživatel zavřel/přeskočil reklamu
                        console.log('AdInPlay ad closed');
                        document.getElementById('videoAdOverlay').style.display = 'none';
                        // Nedáme reward pokud nepřehrál celou reklamu
                    }
                });
            });
            
        } else {
            // Fallback na fake reklamu pokud AdInPlay není dostupné
            console.log('AdInPlay not available, showing fake ad');
            this.showFakeVideoAd(onComplete);
        }
    }
    
    showFakeVideoAd(onComplete) {
        // Původní fake reklama jako fallback
        this.videoAdOverlay.style.display = 'flex';
        this.skipAdBtn.style.display = 'none';
        
        let timeLeft = 5;
        this.adTimer.textContent = timeLeft;
        
        const adInterval = setInterval(() => {
            timeLeft--;
            this.adTimer.textContent = timeLeft;
            
            if (timeLeft <= 0) {
                clearInterval(adInterval);
                this.skipAdBtn.style.display = 'inline-block';
            }
        }, 1000);
        
        this.skipAdBtn.onclick = () => {
            clearInterval(adInterval);
            this.videoAdOverlay.style.display = 'none';
            if (onComplete) onComplete();
        };
    }
    
    shareScore() {
        const text = `Skóroval jsem ${this.score} bodů v Tower Defense! Dokážeš víc? 🏢✈️`;
        
        if (navigator.share) {
            navigator.share({
                title: 'Tower Defense',
                text: text,
                url: window.location.href
            });
        } else {
            // Fallback - zkopírování do clipboardu
            const textarea = document.createElement('textarea');
            textarea.value = text + ' ' + window.location.href;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            alert('Skóre zkopírováno do schránky!');
        }
    }
    
    updateScore() {
        const aliveTowers = this.towers.filter(t => !t.destroyed).length;
        let scoreText = `Score: ${this.score} | Lives: ${aliveTowers}/2`;
        if (this.combo > 1) {
            scoreText += ` | Combo: ${this.combo}x 🔥`;
        }
        scoreText += `\n💰 ${this.coins} | 🔧 ${20 - this.shotsUntilRepair}/20`;
        this.scoreElement.innerHTML = scoreText.replace('\n', '<br>');
    }
    
    spawnPlane() {
        const fromLeft = Math.random() > 0.5;
        const heightPercent = this.planeHeights[Math.floor(Math.random() * this.planeHeights.length)];
        const y = this.canvas.height * heightPercent;
        const baseSpeed = 2.2 + this.gameSpeed * 0.5;
        
        // Pouze 2 typy letadel - ODSTRANĚNÍ RYCHLÝCH
        const types = ['normal', 'slow'];
        const weights = [0.7, 0.3]; // Více normálních
        let type = 'normal';
        const rand = Math.random();
        if (rand < weights[1]) type = 'slow';
        
        const plane = {
            x: fromLeft ? -70 : this.canvas.width + 70,
            y: y,
            width: 60,
            height: 24,
            speed: fromLeft ? baseSpeed : -baseSpeed,
            fromLeft: fromLeft,
            passed: false,
            type: type,
            falling: false,
            fallSpeed: 0,
            rotation: 0
        };
        
        // Úprava rychlosti podle typu
        if (type === 'slow') {
            plane.speed *= 0.7;
            plane.width = 65;
            plane.height = 26;
        }
        
        this.planes.push(plane);
        
        // Přidat varování
        this.warnings.push({
            x: fromLeft ? 30 : this.canvas.width - 50,
            y: y,
            life: this.warningTime,
            maxLife: this.warningTime,
            fromLeft: fromLeft
        });
    }
    
    spawnPowerUp() {
        const types = ['shield', 'slow'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        this.powerUps.push({
            x: this.canvas.width / 2,
            y: 50,
            width: 30,
            height: 30,
            velocityY: 2,
            type: type
        });
    }
    
    shootPlane(plane, index) {
        // Letadlo sestřeleno!
        plane.falling = true;
        plane.fallSpeed = 0;
        plane.rotation = 0;
        
        // Body podle typu (už bez fast)
        const points = plane.type === 'slow' ? 1 : 2;
        this.score += points;
        this.coins++; // +1 coin za sestřel
        this.combo++;
        this.shotsUntilRepair--;
        
        // Auto-repair po 20 sestřelech
        if (this.shotsUntilRepair <= 0) {
            this.autoRepairTower();
            this.shotsUntilRepair = 20; // Reset counter
        }
        
        if (this.combo > this.maxCombo) {
            this.maxCombo = this.combo;
        }
        
        // Růst věží po každém sestřelu (+1px výška)
        this.growTowers();
        
        this.updateScore();
        
        // Exploze
        this.createExplosion(plane.x + plane.width / 2, plane.y + plane.height / 2, '#FF8C00');
    }
    
    growTowers() {
        // Věže rostou o 1px, ale max do 90% obrazovky
        for (let tower of this.towers) {
            if (tower.height < this.maxTowerHeight && !tower.destroyed) {
                tower.height += 1;
                tower.y = this.groundLevel - tower.height;
            }
        }
    }
    
    autoRepairTower() {
        // Najdi poškozenou věž a opravu ji
        for (let tower of this.towers) {
            if (tower.destroyed) {
                tower.destroyed = false;
                tower.fireParticles = [];
                tower.smokeParticles = [];
                tower.hitY = null;
                
                // Zelená exploze - opraveno!
                this.createExplosion(tower.x + tower.width / 2, tower.y + tower.height / 2, '#00FF00');
                
                // Notification
                this.showNotification('♻️ BUDOVA OPRAVENA!', '#00FF00');
                return;
            }
        }
    }
    
    showNotification(text, color = '#FFD700') {
        const notification = document.createElement('div');
        notification.textContent = text;
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.9);
            color: ${color};
            padding: 20px 40px;
            font-size: 24px;
            font-weight: bold;
            border: 3px solid ${color};
            border-radius: 10px;
            z-index: 100;
            animation: fadeOut 2s forwards;
        `;
        
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 2000);
    }
    
    createBigSmokeCloud(x, y) {
        // Velký oblak dýmu při nárazu
        for (let i = 0; i < 50; i++) {
            this.particles.push({
                x: x,
                y: y,
                velocityX: (Math.random() - 0.5) * 3,
                velocityY: -2 - Math.random() * 5, // Stoupá nahoru
                life: 80 + Math.random() * 40,
                maxLife: 120,
                size: 15 + Math.random() * 25,
                color: Math.random() > 0.5 ? '#555555' : '#888888',
                isSmoke: true
            });
        }
    }
    
    createJumpParticles(tower) {
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x: tower.x + tower.width / 2,
                y: tower.y + tower.height,
                velocityX: (Math.random() - 0.5) * 4,
                velocityY: Math.random() * -3,
                life: 30,
                maxLife: 30,
                color: '#CCCCCC'
            });
        }
    }
    
    createExplosion(x, y, color = '#FF0000') {
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x: x,
                y: y,
                velocityX: (Math.random() - 0.5) * 10,
                velocityY: (Math.random() - 0.5) * 10,
                life: 40,
                maxLife: 40,
                color: color
            });
        }
    }
    
    createFireParticles(tower) {
        // Vytvoření ohnivých částic pro hořící budovu - INTENZIVNĚJŠÍ
        if (this.frame % 2 === 0) { // Každé 2 framy (častěji)
            // Oheň primárně kolem místa nárazu
            const hitArea = tower.hitY !== null ? tower.hitY : tower.y + tower.height / 2;
            const hitRange = 80; // Oblast kolem nárazu
            
            for (let i = 0; i < 5; i++) { // Více částic
                // 70% částic kolem nárazu, 30% po celé budově
                let particleY;
                if (Math.random() > 0.3) {
                    // Kolem místa nárazu
                    particleY = hitArea + (Math.random() - 0.5) * hitRange;
                    particleY = Math.max(tower.y, Math.min(particleY, tower.y + tower.height));
                } else {
                    // Náhodně po budově
                    particleY = tower.y + Math.random() * tower.height;
                }
                
                tower.fireParticles.push({
                    x: tower.x + Math.random() * tower.width,
                    y: particleY,
                    velocityX: (Math.random() - 0.5) * 3,
                    velocityY: -2 - Math.random() * 3, // Rychleji nahoru
                    life: 40 + Math.random() * 30,
                    maxLife: 70,
                    size: 4 + Math.random() * 8 // Větší plameny
                });
            }
            
            // Kouř z budovy
            if (Math.random() > 0.5) {
                tower.smokeParticles.push({
                    x: tower.x + Math.random() * tower.width,
                    y: tower.y + Math.random() * 50, // Z horní části
                    velocityX: (Math.random() - 0.5) * 2,
                    velocityY: -1 - Math.random() * 2,
                    life: 60 + Math.random() * 40,
                    maxLife: 100,
                    size: 10 + Math.random() * 20
                });
            }
        }
        
        // Aktualizace ohnivých částic
        for (let i = tower.fireParticles.length - 1; i >= 0; i--) {
            const p = tower.fireParticles[i];
            p.x += p.velocityX;
            p.y += p.velocityY;
            p.life--;
            
            if (p.life <= 0) {
                tower.fireParticles.splice(i, 1);
            }
        }
        
        // Aktualizace kouřových částic
        for (let i = tower.smokeParticles.length - 1; i >= 0; i--) {
            const p = tower.smokeParticles[i];
            p.x += p.velocityX;
            p.y += p.velocityY;
            p.velocityY -= 0.05; // Zpomalení
            p.life--;
            
            if (p.life <= 0) {
                tower.smokeParticles.splice(i, 1);
            }
        }
    }
    
    checkCollision(plane, tower) {
        return plane.x < tower.x + tower.width &&
               plane.x + plane.width > tower.x &&
               plane.y < tower.y + tower.height &&
               plane.y + plane.height > tower.y;
    }
    
    fireRocket() {
        // Najdi nejbližší letadlo
        let closestPlane = null;
        let minDist = Infinity;
        
        const centerX = this.canvas.width / 2;
        const centerY = this.groundLevel;
        
        for (let plane of this.planes) {
            if (plane.falling) continue;
            
            const dx = plane.x - centerX;
            const dy = plane.y - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < minDist && dist < 400) { // Max dosah 400px
                minDist = dist;
                closestPlane = plane;
            }
        }
        
        if (closestPlane) {
            // Vypusť raketu z raketového systému na zemi
            this.rockets.push({
                x: this.rocketSystemPos.x + this.rocketSystemPos.width / 2,
                y: this.rocketSystemPos.y,
                target: closestPlane,
                speed: 5,
                angle: 0
            });
        }
    }
    
    update() {
        this.frame++;
        
        // Raketový systém
        if (this.hasRocketSystem && this.rocketCooldown <= 0) {
            this.fireRocket();
            this.rocketCooldown = this.rocketMaxCooldown; // Reset cooldown
        }
        
        if (this.rocketCooldown > 0) {
            this.rocketCooldown--;
        }
        
        // Update raket
        for (let i = this.rockets.length - 1; i >= 0; i--) {
            const rocket = this.rockets[i];
            
            // Kontrola, zda cíl stále existuje a není sestřelen
            if (!rocket.target || rocket.target.falling || !this.planes.includes(rocket.target)) {
                // Cíl zmizel/byl sestřelen - hledej nový cíl
                let newTarget = null;
                let minDist = Infinity;
                
                for (let plane of this.planes) {
                    if (plane.falling) continue;
                    
                    const dx = plane.x - rocket.x;
                    const dy = plane.y - rocket.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    if (dist < minDist && dist < 300) { // Max dosah pro změnu cíle
                        minDist = dist;
                        newTarget = plane;
                    }
                }
                
                if (newTarget) {
                    // Našli jsme nový cíl
                    rocket.target = newTarget;
                } else {
                    // Žádný nový cíl - raketa exploduje
                    this.createExplosion(rocket.x, rocket.y, '#FF6600');
                    this.rockets.splice(i, 1);
                    continue;
                }
            }
            
            if (rocket.target && !rocket.target.falling) {
                // Naváděná raketa
                const dx = rocket.target.x - rocket.x;
                const dy = rocket.target.y - rocket.y;
                const angle = Math.atan2(dy, dx);
                
                rocket.x += Math.cos(angle) * rocket.speed;
                rocket.y += Math.sin(angle) * rocket.speed;
                rocket.angle = angle;
                
                // Kontrola zásahu
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 20) {
                    // Zásah!
                    this.createExplosion(rocket.x, rocket.y, '#FF0000');
                    rocket.target.falling = true;
                    this.score += 1;
                    this.coins++;
                    this.updateScore();
                    this.rockets.splice(i, 1);
                    continue;
                }
            }
            
            // Odstranění raket mimo obrazovku
            if (rocket.x < 0 || rocket.x > this.canvas.width || 
                rocket.y < 0 || rocket.y > this.canvas.height) {
                this.createExplosion(rocket.x, rocket.y, '#888888'); // Šedá exploze při odletu
                this.rockets.splice(i, 1);
            }
        }
        
        // Update friendly fighters
        this.fighterSpawnCooldown--;
        if (this.fighterSpawnCooldown <= 0 && this.friendlyFighters.length < this.maxFighters) {
            this.spawnFriendlyFighter();
            this.fighterSpawnCooldown = 300; // Spawn každých 5 sekund
        }
        
        for (let i = this.friendlyFighters.length - 1; i >= 0; i--) {
            const fighter = this.friendlyFighters[i];
            
            // Pohyb
            fighter.x += fighter.speed;
            
            // Vyhýbání se věžím
            for (let tower of this.towers) {
                if (!tower.destroyed) {
                    const dx = fighter.x - (tower.x + tower.width / 2);
                    const dy = fighter.y - (tower.y + tower.height / 2);
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    if (dist < 100) {
                        // Vyhni se věži
                        fighter.y += (dy > 0 ? 1 : -1) * 2;
                    }
                }
            }
            
            // Omezení na obrazovku (vertikálně)
            if (fighter.y < 50) fighter.y = 50;
            if (fighter.y > this.canvas.height - 100) fighter.y = this.canvas.height - 100;
            
            // Shooting logic
            fighter.shootCooldown--;
            if (fighter.shootCooldown <= 0) {
                // Najdi nejbližšího nepřítele
                let closestEnemy = null;
                let minDist = Infinity;
                
                for (let plane of this.planes) {
                    if (plane.falling) continue;
                    
                    const dx = plane.x - fighter.x;
                    const dy = plane.y - fighter.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    if (dist < minDist && dist < 200) { // Dosah 200px
                        minDist = dist;
                        closestEnemy = plane;
                    }
                }
                
                if (closestEnemy) {
                    // Sestřel nepřítele
                    closestEnemy.falling = true;
                    this.score += 1;
                    this.coins++;
                    this.createExplosion(closestEnemy.x, closestEnemy.y, '#00BFFF');
                    this.updateScore();
                    fighter.shootCooldown = fighter.shootRate;
                }
            }
            
            // Odstranění mimo obrazovku
            if (fighter.x < -100 || fighter.x > this.canvas.width + 100) {
                this.friendlyFighters.splice(i, 1);
                // Spawn nové stíhačky po chvíli
                this.fighterSpawnCooldown = 180;
            }
        }
        
        // Spawn letadel
        if (this.frame - this.lastPlaneSpawn > this.planeSpawnRate) {
            this.spawnPlane();
            this.lastPlaneSpawn = this.frame;
        }
        
        // Spawn power-upů (vypnuto pro jednoduchost)
        // if (this.frame - this.lastPowerUpSpawn > this.powerUpSpawnRate) {
        //     this.spawnPowerUp();
        //     this.lastPowerUpSpawn = this.frame;
        // }
        
        // Aktualizace mraků
        for (let cloud of this.clouds) {
            cloud.x += cloud.speed;
            if (cloud.x > this.canvas.width + cloud.width) {
                cloud.x = -cloud.width;
                cloud.y = Math.random() * this.canvas.height * 0.5;
            }
        }
        
        // Aktualizace varování
        for (let i = this.warnings.length - 1; i >= 0; i--) {
            const warning = this.warnings[i];
            warning.life--;
            
            if (warning.life <= 0) {
                this.warnings.splice(i, 1);
            }
        }
        
        // Aktualizace letadel
        for (let i = this.planes.length - 1; i >= 0; i--) {
            const plane = this.planes[i];
            
            if (plane.falling) {
                // Padající letadlo
                plane.fallSpeed += 0.4; // Gravitace
                plane.y += plane.fallSpeed;
                plane.rotation += 0.1;
                
                // Odstranění když dopadne
                if (plane.y > this.canvas.height) {
                    this.planes.splice(i, 1);
                }
            } else {
                // Normální let
                plane.x += plane.speed;
                
                // Kontrola kolize s budovami
                let hitTower = false;
                for (let tower of this.towers) {
                    if (tower.destroyed) continue;
                    
                    if (this.checkCollision(plane, tower)) {
                        // Letadlo narazilo do budovy - VELKÝ NÁRAZ
                        tower.destroyed = true;
                        tower.hitY = plane.y + plane.height / 2; // Zaznamenej výšku nárazu
                        
                        // Velká exploze
                        this.createExplosion(plane.x + plane.width / 2, plane.y + plane.height / 2, '#FF4500');
                        
                        // VELKÝ OBLAK DÝMU
                        this.createBigSmokeCloud(plane.x + plane.width / 2, plane.y + plane.height / 2);
                        
                        this.planes.splice(i, 1);
                        hitTower = true;
                        this.combo = 0; // Reset combo
                        this.updateScore();
                        
                        // Zkontroluj, jestli jsou obě budovy zničené = game over
                        const allDestroyed = this.towers.every(t => t.destroyed);
                        if (allDestroyed) {
                            this.gameOver();
                            return;
                        }
                        break;
                    }
                }
                
                if (hitTower) continue;
                
                // Kontrola, zda letadlo prolétlo mimo obrazovku (promeškané)
                if ((plane.fromLeft && plane.x > this.canvas.width + 100) ||
                    (!plane.fromLeft && plane.x < -100)) {
                    
                    // Letadlo prolétlo - nic se neděje, jen combo reset
                    if (!plane.passed) {
                        this.combo = 0;
                    }
                    
                    this.planes.splice(i, 1);
                }
            }
        }
        
        // Aktualizace particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.velocityX;
            p.y += p.velocityY;
            p.velocityY += 0.2; // Gravitace
            p.life--;
            
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
        
        // Aktualizace ohnivých částic pro budovy
        for (let tower of this.towers) {
            if (tower.destroyed) {
                this.createFireParticles(tower);
            }
        }
        
        // Zvýšení obtížnosti
        if (this.score > 0 && this.score % 25 === 0 && this.frame % 60 === 0) {
            this.gameSpeed += 0.1;
            this.planeSpawnRate = Math.max(55, this.planeSpawnRate - 3);
        }
    }
    
    drawCloud(cloud) {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        
        // Pixelový mrak
        const pixelSize = 4;
        const cols = Math.floor(cloud.width / pixelSize);
        const rows = Math.floor(cloud.height / pixelSize);
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (Math.random() > 0.3) {
                    this.ctx.fillRect(
                        cloud.x + col * pixelSize,
                        cloud.y + row * pixelSize,
                        pixelSize,
                        pixelSize
                    );
                }
            }
        }
    }
    
    drawTower(tower) {
        this.ctx.save();
        
        // Průhlednost pro zničenou budovu
        if (tower.destroyed) {
            this.ctx.globalAlpha = 0.4;
        }
        
        // Štít efekt (jen pro nezničené budovy)
        if (tower.shield && !tower.destroyed) {
            this.ctx.strokeStyle = '#00FFFF';
            this.ctx.lineWidth = 3;
            this.ctx.globalAlpha = 0.5 + Math.sin(this.frame * 0.2) * 0.3;
            this.ctx.beginPath();
            this.ctx.arc(
                tower.x + tower.width / 2,
                tower.y + tower.height / 2,
                tower.width * 0.8,
                0,
                Math.PI * 2
            );
            this.ctx.stroke();
            this.ctx.globalAlpha = tower.destroyed ? 0.4 : 1;
        }
        
        // Hlavní budova - šedá (nebo tmavší pokud je zničená)
        this.ctx.fillStyle = tower.destroyed ? '#303030' : '#808080';
        this.ctx.fillRect(tower.x, tower.y, tower.width, tower.height);
        
        // DÍRA V BUDOVĚ při nárazu
        if (tower.destroyed && tower.hitY !== null) {
            const holeHeight = 40;
            const holeY = tower.hitY - holeHeight / 2;
            
            // Černá díra
            this.ctx.globalAlpha = 1;
            this.ctx.fillStyle = '#000000';
            this.ctx.fillRect(tower.x, holeY, tower.width, holeHeight);
            
            // Poškozené okraje díry
            this.ctx.fillStyle = '#1a1a1a';
            for (let i = 0; i < 10; i++) {
                const px = tower.x + Math.random() * tower.width;
                const py = holeY + Math.random() * holeHeight;
                this.ctx.fillRect(px, py, 3, 3);
            }
            
            this.ctx.globalAlpha = tower.destroyed ? 0.4 : 1;
        }
        
        // Okna - pixelová mřížka
        this.ctx.fillStyle = tower.destroyed ? '#663300' : '#FFD700';
        const windowSize = 4;
        const spacing = 8;
        
        for (let y = tower.y + 10; y < tower.y + tower.height - 10; y += spacing) {
            for (let x = tower.x + 8; x < tower.x + tower.width - 8; x += spacing) {
                // Nekreslí okna v díře
                if (tower.destroyed && tower.hitY !== null) {
                    const holeHeight = 40;
                    const holeY = tower.hitY - holeHeight / 2;
                    if (y >= holeY && y <= holeY + holeHeight) {
                        continue;
                    }
                }
                
                if (Math.random() > 0.3) {
                    this.ctx.fillRect(x, y, windowSize, windowSize);
                }
            }
        }
        
        // Obrys
        this.ctx.strokeStyle = tower.destroyed ? '#1a1a1a' : '#404040';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(tower.x, tower.y, tower.width, tower.height);
        
        // Střecha
        this.ctx.fillStyle = tower.destroyed ? '#202020' : '#606060';
        this.ctx.fillRect(tower.x - 5, tower.y - 10, tower.width + 10, 10);
        
        this.ctx.globalAlpha = 1;
        
        // Kreslení INTENZIVNĚJŠÍHO ohně
        if (tower.destroyed) {
            for (let p of tower.fireParticles) {
                const alpha = p.life / p.maxLife;
                const colors = ['#FF0000', '#FF4500', '#FF6347', '#FFD700', '#FF8C00'];
                const colorIndex = Math.floor((1 - alpha) * (colors.length - 1));
                this.ctx.fillStyle = colors[colorIndex];
                this.ctx.globalAlpha = alpha * 0.9;
                
                // Kruh místo čtverce pro lepší efekt
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            // Kouř z budovy
            for (let p of tower.smokeParticles) {
                const alpha = p.life / p.maxLife;
                this.ctx.fillStyle = '#555555';
                this.ctx.globalAlpha = alpha * 0.6;
                
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            this.ctx.globalAlpha = 1;
        }
        
        this.ctx.restore();
    }
    
    drawPlane(plane) {
        this.ctx.save();
        
        // Pokud letadlo padá, rotujeme ho
        if (plane.falling) {
            this.ctx.translate(plane.x + plane.width / 2, plane.y + plane.height / 2);
            this.ctx.rotate(plane.rotation);
            this.ctx.translate(-(plane.x + plane.width / 2), -(plane.y + plane.height / 2));
        }
        
        // Otočení letadla podle směru
        if (!plane.fromLeft) {
            this.ctx.translate(plane.x + plane.width / 2, plane.y + plane.height / 2);
            this.ctx.scale(-1, 1);
            this.ctx.translate(-(plane.x + plane.width / 2), -(plane.y + plane.height / 2));
        }
        
        // Barva podle typu (už bez fast - jen normal a slow)
        let bodyColor = '#C0C0C0';
        if (plane.type === 'slow') bodyColor = '#6BCB77';
        
        // Tmavší pokud padá
        if (plane.falling) {
            bodyColor = '#404040';
        }
        
        // Tělo letadla
        this.ctx.fillStyle = bodyColor;
        this.ctx.fillRect(plane.x, plane.y + 6, plane.width - 10, 8);
        
        // Nos letadla
        this.ctx.fillStyle = bodyColor;
        this.ctx.fillRect(plane.x + plane.width - 10, plane.y + 7, 10, 6);
        
        // Křídla
        this.ctx.fillStyle = bodyColor;
        this.ctx.globalAlpha = 0.8;
        this.ctx.fillRect(plane.x + 15, plane.y, 20, 4);
        this.ctx.fillRect(plane.x + 15, plane.y + 16, 20, 4);
        this.ctx.globalAlpha = 1;
        
        // Okna (pokud nepadá)
        if (!plane.falling) {
            this.ctx.fillStyle = '#4A90E2';
            this.ctx.fillRect(plane.x + 10, plane.y + 8, 3, 3);
            this.ctx.fillRect(plane.x + 15, plane.y + 8, 3, 3);
            this.ctx.fillRect(plane.x + 20, plane.y + 8, 3, 3);
        }
        
        // Obrys
        this.ctx.strokeStyle = '#808080';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(plane.x, plane.y + 6, plane.width - 10, 8);
        
        this.ctx.restore();
    }
    
    drawWarning(warning) {
        this.ctx.save();
        
        // Blikající efekt
        const alpha = (Math.sin(this.frame * 0.3) + 1) / 2 * 0.8 + 0.2;
        this.ctx.globalAlpha = alpha;
        
        // Pozadí
        this.ctx.fillStyle = '#FF0000';
        this.ctx.fillRect(warning.x - 20, warning.y - 15, 40, 30);
        
        // Otazník nebo vykřičník
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('!', warning.x, warning.y);
        
        // Šipka směru
        this.ctx.fillStyle = '#FFFF00';
        if (warning.fromLeft) {
            // Šipka doprava
            this.ctx.beginPath();
            this.ctx.moveTo(warning.x + 25, warning.y);
            this.ctx.lineTo(warning.x + 35, warning.y - 5);
            this.ctx.lineTo(warning.x + 35, warning.y + 5);
            this.ctx.fill();
        } else {
            // Šipka doleva
            this.ctx.beginPath();
            this.ctx.moveTo(warning.x - 25, warning.y);
            this.ctx.lineTo(warning.x - 35, warning.y - 5);
            this.ctx.lineTo(warning.x - 35, warning.y + 5);
            this.ctx.fill();
        }
        
        this.ctx.restore();
    }
    
    drawRocketSystem() {
        const pos = this.rocketSystemPos;
        
        // Základna (tmavě šedá)
        this.ctx.fillStyle = '#555555';
        this.ctx.fillRect(pos.x, pos.y + 20, pos.width, 10);
        
        // Hlavní tělo (šedivé)
        this.ctx.fillStyle = '#888888';
        this.ctx.fillRect(pos.x + 5, pos.y + 10, pos.width - 10, 10);
        
        // Odpalovací rampa (červená)
        this.ctx.fillStyle = '#CC0000';
        this.ctx.fillRect(pos.x + 10, pos.y, 20, 10);
        
        // Detail - malé čtverce
        this.ctx.fillStyle = '#FFFF00';
        this.ctx.fillRect(pos.x + 15, pos.y + 3, 4, 4);
        this.ctx.fillRect(pos.x + 21, pos.y + 3, 4, 4);
        
        // Cooldown kolečko (progress indicator)
        const progress = 1 - (this.rocketCooldown / this.rocketMaxCooldown);
        const radius = 8;
        const centerX = pos.x + pos.width / 2;
        const centerY = pos.y - 12;
        
        // Pozadí kolečka (tmavé)
        this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Progress (zelené - plní se)
        if (progress < 1) {
            this.ctx.fillStyle = '#00FF00';
        } else {
            this.ctx.fillStyle = '#FFD700'; // Zlaté když je ready
        }
        
        this.ctx.beginPath();
        this.ctx.moveTo(centerX, centerY);
        this.ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * progress));
        this.ctx.lineTo(centerX, centerY);
        this.ctx.fill();
        
        // Okraj kolečka
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.stroke();
    }
    
    drawRocket(rocket) {
        this.ctx.save();
        this.ctx.translate(rocket.x, rocket.y);
        this.ctx.rotate(rocket.angle);
        
        // Tělo rakety
        this.ctx.fillStyle = '#FF0000';
        this.ctx.fillRect(-10, -3, 20, 6);
        
        // Špička
        this.ctx.fillStyle = '#FFFF00';
        this.ctx.beginPath();
        this.ctx.moveTo(10, 0);
        this.ctx.lineTo(15, -4);
        this.ctx.lineTo(15, 4);
        this.ctx.fill();
        
        // Plamen
        this.ctx.fillStyle = '#FFA500';
        this.ctx.beginPath();
        this.ctx.moveTo(-10, 0);
        this.ctx.lineTo(-15 - Math.random() * 5, -3);
        this.ctx.lineTo(-15 - Math.random() * 5, 3);
        this.ctx.fill();
        
        this.ctx.restore();
    }
    
    drawFriendlyFighter(fighter) {
        this.ctx.save();
        
        // Tělo (modré)
        this.ctx.fillStyle = '#00BFFF';
        this.ctx.fillRect(fighter.x, fighter.y, fighter.width, fighter.height);
        
        // Špička (bílá)
        this.ctx.fillStyle = '#FFFFFF';
        if (fighter.speed > 0) {
            // Letí doprava
            this.ctx.beginPath();
            this.ctx.moveTo(fighter.x + fighter.width, fighter.y + fighter.height / 2);
            this.ctx.lineTo(fighter.x + fighter.width + 8, fighter.y + fighter.height / 2 - 4);
            this.ctx.lineTo(fighter.x + fighter.width + 8, fighter.y + fighter.height / 2 + 4);
            this.ctx.fill();
        } else {
            // Letí doleva
            this.ctx.beginPath();
            this.ctx.moveTo(fighter.x, fighter.y + fighter.height / 2);
            this.ctx.lineTo(fighter.x - 8, fighter.y + fighter.height / 2 - 4);
            this.ctx.lineTo(fighter.x - 8, fighter.y + fighter.height / 2 + 4);
            this.ctx.fill();
        }
        
        // Křídla (zelené)
        this.ctx.fillStyle = '#00FF00';
        this.ctx.fillRect(fighter.x + fighter.width * 0.3, fighter.y - 5, fighter.width * 0.4, 5);
        this.ctx.fillRect(fighter.x + fighter.width * 0.3, fighter.y + fighter.height, fighter.width * 0.4, 5);
        
        // Kokpit (tmavý)
        this.ctx.fillStyle = '#000088';
        this.ctx.fillRect(fighter.x + fighter.width * 0.6, fighter.y + 8, 8, 8);
        
        this.ctx.restore();
    }
    
    drawPowerUp(powerUp) {
        this.ctx.save();
        
        // Rotace
        this.ctx.translate(powerUp.x + powerUp.width / 2, powerUp.y + powerUp.height / 2);
        this.ctx.rotate(this.frame * 0.05);
        this.ctx.translate(-(powerUp.x + powerUp.width / 2), -(powerUp.y + powerUp.height / 2));
        
        if (powerUp.type === 'shield') {
            // Štít ikona
            this.ctx.fillStyle = '#00FFFF';
            this.ctx.fillRect(powerUp.x + 5, powerUp.y, 20, 5);
            this.ctx.fillRect(powerUp.x, powerUp.y + 5, 30, 20);
            this.ctx.fillRect(powerUp.x + 10, powerUp.y + 25, 10, 5);
        } else if (powerUp.type === 'slow') {
            // Hodiny ikona
            this.ctx.fillStyle = '#FFD700';
            this.ctx.fillRect(powerUp.x + 5, powerUp.y + 5, 20, 20);
            this.ctx.fillStyle = '#333';
            this.ctx.fillRect(powerUp.x + 14, powerUp.y + 8, 2, 8);
            this.ctx.fillRect(powerUp.x + 14, powerUp.y + 14, 6, 2);
        }
        
        this.ctx.restore();
    }
    
    drawParticle(particle) {
        const alpha = particle.life / particle.maxLife;
        this.ctx.fillStyle = particle.color;
        this.ctx.globalAlpha = alpha;
        
        if (particle.isSmoke) {
            // Kouř jako kruh s gradientem
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size / 2, 0, Math.PI * 2);
            this.ctx.fill();
        } else {
            // Normální exploze
            this.ctx.fillRect(particle.x, particle.y, 3, 3);
        }
        
        this.ctx.globalAlpha = 1;
    }
    
    draw() {
        // Pozadí - gradient oblohy
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(1, '#E0F6FF');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Mraky
        for (let cloud of this.clouds) {
            this.drawCloud(cloud);
        }
        
        // Varování
        for (let warning of this.warnings) {
            this.drawWarning(warning);
        }
        
        // Power-upy
        for (let powerUp of this.powerUps) {
            this.drawPowerUp(powerUp);
        }
        
        // Letadla
        for (let plane of this.planes) {
            this.drawPlane(plane);
        }
        
        // Friendly fighters
        for (let fighter of this.friendlyFighters) {
            this.drawFriendlyFighter(fighter);
        }
        
        // Particles
        for (let particle of this.particles) {
            this.drawParticle(particle);
        }
        
        // Rakety
        for (let rocket of this.rockets) {
            this.drawRocket(rocket);
        }
        
        // Věže
        for (let tower of this.towers) {
            this.drawTower(tower);
        }
        
        // Země/základ (5% výšky)
        const groundHeight = this.canvas.height * 0.05;
        this.ctx.fillStyle = '#228B22';
        this.ctx.fillRect(0, this.canvas.height - groundHeight, this.canvas.width, groundHeight);
        
        // Tráva (pixelová textura)
        this.ctx.fillStyle = '#2E7D32';
        for (let x = 0; x < this.canvas.width; x += 4) {
            if (Math.random() > 0.5) {
                this.ctx.fillRect(x, this.canvas.height - groundHeight + Math.random() * 5, 2, 2);
            }
        }
        
        // Raketový systém na zemi (pokud zakoupen)
        if (this.hasRocketSystem) {
            this.drawRocketSystem();
        }
    }
    
    gameLoop() {
        if (!this.isRunning) return;
        
        this.update();
        this.draw();
        
        requestAnimationFrame(this.gameLoop);
    }
}

// Inicializace hry
let game;

// Čekáme na načtení DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM načten, inicializuji hru...');
    
    try {
        game = new Game();
        console.log('Game object created:', game);
    } catch (error) {
        console.error('Chyba při vytváření hry:', error);
        alert('Chyba při načítání hry: ' + error.message);
        return;
    }
    
    // Přidání event listenerů na tlačítka
    const startBtn = document.getElementById('startBtn');
    const restartBtn = document.getElementById('restartBtn');
    const shareBtn = document.getElementById('shareBtn');
    
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            console.log('Start button clicked');
            game.start();
        });
    }
    
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            console.log('Restart button clicked');
            game.restart();
        });
    }
    
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            console.log('Share button clicked');
            game.shareScore();
        });
    }
    
    // Watch Ad button
    const watchAdBtn = document.getElementById('watchAdBtn');
    if (watchAdBtn) {
        watchAdBtn.addEventListener('click', () => {
            console.log('Watch Ad button clicked');
            game.showVideoAd(() => {
                game.reviveGame();
            });
        });
    }
    
    console.log('Hra inicializována, tlačítka připojena');
});
