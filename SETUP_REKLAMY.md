# 🎮 Setup Reklam a Hostingu

## ✅ Co je už implementováno:

1. **PropellerAds Banner** (horní reklama)
2. **AdInPlay SDK** (rewarded video ads)
3. Fallback na fake reklamy pokud SDK není k dispozici

---

## 📺 1. ADINPLAY - Video Reklamy (Rewarded Ads)

### Registrace:
1. Jdi na: https://www.adinplay.com/
2. Klikni "Publishers" → "Sign Up"
3. Vyplň email, název hry: **"Tower Defense"**
4. Žánr: **Action/Arcade**

### Nastavení:
1. Po přihlášení: **Dashboard** → **"Add Game"**
2. Název: **Tower Defense**
3. URL: Až budeš mít (po nahrání na hosting)
4. Zkopíruj své **Game ID** (např: `hypergame.com`)

### Aktivace v kódu:
V `index.html` na řádku **16** nahraď:
```html
<script src="https://api.adinplay.com/libs/aiptag/pub/DPT/hypergame.com/tag.min.js"></script>
```
Změň `hypergame.com` na své Game ID:
```html
<script src="https://api.adinplay.com/libs/aiptag/pub/DPT/TVOJE_GAME_ID/tag.min.js"></script>
```

**💰 Výdělek:** $3-8 CPM (za 1000 přehrání)

---

## 🚀 2. PROPELLERADS - Banner Reklama

### Registrace:
1. Jdi na: https://publishers.propellerads.com/#/app/auth/signUp
2. Vyplň:
   - Email
   - Heslo
   - Website URL: `https://tvoje-hra.netlify.app` (nebo jiný hosting)
   - Traffic type: **Mobile Web**

### Nastavení:
1. Po schválení (24-48h): **Dashboard** → **"Zones"** → **"Add Zone"**
2. Vyber:
   - Zone type: **Banner**
   - Size: **728×90** (Leaderboard)
   - Name: "Top Banner"
3. **Zkopíruj celý kód** který ti dají

### Aktivace v kódu:
V `index.html` najdi komentář **"PropellerAds Banner Code"** (řádek ~377) a nahraď:
```html
<div id="propellerPlaceholder">🎮 PropellerAds Banner (Zone ID: YOUR_ZONE_ID)</div>
```
Celým jejich kódem (začíná s `<script>`).

**💰 Výdělek:** $1-5 CPM

---

## 🌐 3. NAHRÁNÍ NA WEB ZDARMA

### **Možnost A: GitHub Pages** (Nejjednodušší) ⭐

#### Setup:
1. **Vytvoř GitHub účet**: https://github.com/signup
2. **Vytvoř nový repozitář:**
   - Jméno: `tower-defense-game`
   - Public ✅
   - Initialize with README ❌
3. **Nahraj soubory:**
   
   ```powershell
   cd C:\Users\user\HyperGame
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/TVOJE_USERNAME/tower-defense-game.git
   git push -u origin main
   ```

4. **Aktivuj GitHub Pages:**
   - Settings → Pages
   - Source: **Deploy from a branch**
   - Branch: **main** → **/ (root)** → Save

5. **Tvoje URL:** `https://TVOJE_USERNAME.github.io/tower-defense-game/`

**✅ Výhody:**
- Úplně zdarma
- HTTPS automaticky
- Žádný limit návštěvnosti
- Jednoduchý update (jen push do Gitu)

---

### **Možnost B: Netlify** (Nejrychlejší)

1. Jdi na: https://www.netlify.com/
2. **Sign up** (s GitHub nebo email)
3. Drag & drop složku `HyperGame` na Netlify
4. Hotovo! URL: `https://random-name-12345.netlify.app`

**Přejmenování:**
- Site settings → Change site name → `tower-defense`
- Nová URL: `https://tower-defense.netlify.app`

**✅ Výhody:**
- Nejrychlejší (30 sekund)
- Automatický HTTPS
- Jednoduchý update (drag & drop)

---

### **Možnost C: Vercel**

Stejně jako Netlify, ale od tvůrců Next.js:
1. https://vercel.com/signup
2. Import GitHub repo nebo drag & drop
3. URL: `https://tvoje-hra.vercel.app`

---

## 📝 CHECKLIST po nahrání:

### 1️⃣ Aktualizuj AdInPlay:
- [ ] Registruj hru s finální URL
- [ ] Zkopíruj Game ID
- [ ] Nahraď v `index.html` řádek 16

### 2️⃣ Aktualizuj PropellerAds:
- [ ] Registruj se s finální URL
- [ ] Vytvoř banner zone (728×90)
- [ ] Zkopíruj kód
- [ ] Nahraď v `index.html` kolem řádku 377

### 3️⃣ Testování:
- [ ] Otevři hru na mobilu
- [ ] Zahraj game over
- [ ] Sleduj reklamu - měl by se přehrát AdInPlay video
- [ ] Zkontroluj horní banner - PropellerAds

### 4️⃣ Monetizace:
- [ ] AdInPlay Dashboard - sleduj impressions
- [ ] PropellerAds Dashboard - sleduj revenue
- [ ] První výplata obvykle po $25-50

---

## 💰 Odhadované výdělky:

**Pro 10,000 návštěv měsíčně:**
- AdInPlay video (5% conversion): 500 views × $0.005 = **$2.50**
- PropellerAds banner (100% impression): 10,000 × $0.002 = **$20**
- **Celkem: ~$22.50/měsíc**

**Pro 100,000 návštěv:**
- **~$225/měsíc**

**Pro virální hru (1M+ views):**
- **$2,000+/měsíc** 🚀

---

## ⚠️ Důležité poznámky:

1. **Kontroverzní obsah:** PropellerAds je tolerantní, Google AdSense by odmítl
2. **Věk návštěvníků:** AdInPlay preferuje 13+ hráče
3. **Mobilní traffic:** 70%+ mobilních návštěvníků = vyšší CPM
4. **Vyplatit:** PropellerAds min $5, AdInPlay min $20 (PayPal/Wire)

---

## 🔧 Troubleshooting:

**AdInPlay nefunguje:**
- Zkontroluj konzoli (F12) - hledej chyby
- Ověř že Game ID je správně
- Fallback fake ad se přehraje automaticky

**PropellerAds se nezobrazuje:**
- Musíš čekat 24-48h na schválení
- Zkontroluj Zone ID v kódu
- Test bez AdBlocku

**GitHub Pages nefunguje:**
- Čekej 5-10 minut po aktivaci
- URL musí být: `username.github.io/repo-name/`
- Zkontroluj že soubory jsou v root složce

---

## 📞 Podpora:

- **AdInPlay:** support@adinplay.com
- **PropellerAds:** publishers@propellerads.com
- **GitHub Pages:** https://docs.github.com/pages

---

Hotovo! 🎉 Nyní můžeš nahrát hru na web a začít vydělávat!
