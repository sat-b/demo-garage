// Garage — Garage Management Platform
// Home = Group Chat · Bottom tabs · Vehicle plate auto-link
// Two-panel chat app: sidebar job list + full chat per vehicle
// Every operation — check-in, service updates, payments, QC — is a message
import * as React from "react";
const { useState, useEffect, useRef, useReducer, useCallback } = React;

// ── Theme ─────────────────────────────────────────────────────
const T = {
  // Sidebar — clean white
  sidebarBg: "#FAFAF8",
  sidebarHeader: "#FFFFFF",
  sidebarSearch: "#F1EFE8",
  sidebarHover: "#F5F4F0",
  sidebarActive: "#EEEDEB",
  // Chat
  chatBg: "#FAFAF8",
  chatPattern: "none",
  // Bubbles — light
  sent: "#E8F5E9",
  sentText: "#1B1B1A",
  recv: "#F5F4F0",
  recvText: "#1B1B1A",
  system: "transparent",
  systemText: "#888780",
  // Input
  inputBg: "#FFFFFF",
  inputText: "#1B1B1A",
  // Header
  headerBg: "#FFFFFF",
  headerText: "#1B1B1A",
  headerSub: "#888780",
  // Accent — forest green
  green: "#3B6D11",
  greenDark: "#27500A",
  // Text — dark
  text: "#1B1B1A",
  textMuted: "#888780",
  textSub: "#888780",
  // Border — light
  border: "#E5E4DF",
  // Status colours — pastel professional
  open: { bg: "#E6F1FB", text: "#185FA5" },
  in_progress: { bg: "#FAEEDA", text: "#854F0B" },
  completed: { bg: "#EAF3DE", text: "#3B6D11" },
  delivered: { bg: "#F1EFE8", text: "#5F5E5A" },
  // Font — modern, clean
  font: "'Inter', 'SF Pro Text', system-ui, -apple-system, sans-serif",
  mono: "'SF Mono', 'Fira Code', 'JetBrains Mono', monospace",
};

// ── Helpers ───────────────────────────────────────────────────
const dt = () => new Date().toISOString().split("T")[0];
const tm = () => new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
const dAgo = (days) => { const d = new Date(); d.setDate(d.getDate() - days); return d.toISOString().split("T")[0]; };
const fmtINR = (n) => Number(n || 0).toLocaleString("en-IN");
const fmtTime = (time) => time || tm();
const fmtDate = (date) => {
  if (!date) return "";
  const today = dt(), yesterday = dAgo(1);
  if (date === today) return "Today";
  if (date === yesterday) return "Yesterday";
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};
const recalc = (j) => {
  const s = (j.items || []).reduce((t, c) => t + (+c.price || 0), 0);
  const o = (j.outsourced || []).reduce((t, o) => t + (+o.cost || 0), 0);
  const p = (j._parts || []).filter(p => p.type === "new").reduce((t, p) => t + (+p.cost || 0), 0);
  return s + o + p;
};
const sendWA = (phone, msg) => {
  const ph = (phone || "").replace(/\D/g, "");
  const n = ph.length === 10 ? "91" + ph : ph;
  if (!n) return;
  try { window.open("https://wa.me/" + n + "?text=" + encodeURIComponent(msg), "_blank"); } catch (e) { }
};
const numToWords = (n) => {
  if(!n||n===0) return "Zero";
  const ones=["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const tens=["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  if(n<20) return ones[n];
  if(n<100) return tens[Math.floor(n/10)]+(n%10?" "+ones[n%10]:"");
  if(n<1000) return ones[Math.floor(n/100)]+" Hundred"+(n%100?" And "+numToWords(n%100):"");
  if(n<100000) return numToWords(Math.floor(n/1000))+" Thousand"+(n%1000?" "+numToWords(n%1000):"");
  if(n<10000000) return numToWords(Math.floor(n/100000))+" Lakh"+(n%100000?" "+numToWords(n%100000):"");
  return numToWords(Math.floor(n/10000000))+" Crore"+(n%10000000?" "+numToWords(n%10000000):"");
};

// ── Constants ────────────────────────────────────────────────
let USERS = [
  { id:1, name:"Arjun",   role:"admin",        avatar:"👨‍💼" },
  { id:2, name:"Priya",   role:"receptionist", avatar:"👩‍💻" },
  { id:3, name:"Raju",    role:"mechanic",     avatar:"🔧"  },
  { id:4, name:"Kumar",   role:"mechanic",     avatar:"⚙️"  },
  { id:5, name:"Senthil", role:"mechanic",     avatar:"🛠️"  },
  { id:6, name:"Vijay",   role:"mechanic",     avatar:"🔩"  },
];
let MECHANICS = USERS.filter(u => u.role === "mechanic");
let GARAGE = { name: "Sri Murugan Auto Works", phone: "9876500000", address: "123, Main Road, Coimbatore - 641001", email: "srimurugan@gmail.com" };

// ── Multi-garage registry ──
let REGISTERED_GARAGES = [
  {id:1,name:"Sri Murugan Auto Works",phone:"9876500000",address:"123, Main Road, Coimbatore - 641001",
    email:"srimurugan@gmail.com",gst:"",
    users:[{id:1,name:"Arjun",role:"admin",avatar:"👨‍💼"},{id:2,name:"Priya",role:"receptionist",avatar:"👩‍💻"},
      {id:3,name:"Raju",role:"mechanic",avatar:"🔧"},{id:4,name:"Kumar",role:"mechanic",avatar:"⚙️"},
      {id:5,name:"Senthil",role:"mechanic",avatar:"🛠️"},{id:6,name:"Vijay",role:"mechanic",avatar:"🔩"}]},
  {id:2,name:"Kumar Motors",phone:"9876500010",address:"45, Sathy Road, Karur - 639001",
    email:"kumarmotors@gmail.com",gst:"33AADCK1234F1Z5",
    users:[{id:1,name:"Kumar",role:"admin",avatar:"👨‍💼"},{id:2,name:"Selvam",role:"mechanic",avatar:"🔧"}]},
  {id:3,name:"Raja Auto Works",phone:"9876500020",address:"78, Bazaar Street, Erode - 638001",
    email:"rajaauto@gmail.com",gst:"",
    users:[{id:1,name:"Raja",role:"admin",avatar:"👨‍💼"},{id:2,name:"Mani",role:"mechanic",avatar:"🔧"},
      {id:3,name:"Devi",role:"receptionist",avatar:"👩‍💻"}]},
];

// ── Persistent scroll memory (survives tab switches & new job entries) ──
const SCROLL_MEMORY = {}; // { jobNo: scrollTop }

const TAMIL_QUOTES=[
        "உழைப்பே உயர்வின் திறவுகோல்",
        "நேர்மையே நிலையான செல்வம்",
        "பொறுமையே அறிவின் அடையாளம்",
        "ஒற்றுமையே நம் பலம்",
        "கடமையை செய், பலனை எதிர்பாராதே",
        "தோல்வி வெற்றியின் முதல் படி",
        "நேரத்தின் மதிப்பு நேரம் போனால் தெரியும்",
        "நல்ல வார்த்தை நூறு நன்மை தரும்",
        "அன்பே அனைத்தையும் வெல்லும்",
        "முயற்சி திருவினை ஆக்கும்",
        "சிறுதுளி பெருவெள்ளம்",
        "கற்றது கைமண் அளவு, கல்லாதது உலகளவு",
        "வாழ்க்கை ஒரு பயணம், அனுபவி",
        "இன்றைய முயற்சி நாளைய வெற்றி",
        "நம்பிக்கை இருந்தால் வழி பிறக்கும்",
        "குறிக்கோளை நோக்கி முன்னேறு",
        "சிரித்து வாழ, கற்றுக்கொள்",
        "உன் வேலையில் பெருமை கொள்",
        "ஒவ்வொரு நாளும் ஒரு புதிய தொடக்கம்",
        "வெற்றி உழைப்பவருக்கே",
        "நல்லது நினை, நல்லது நடக்கும்",
        "பணிவே மனிதனின் அழகு",
        "காலத்தை வீணடிக்காதே",
        "உண்மையே வெல்லும்",
        "செயலே சிறந்த பதில்",
        "அறிவே ஆயுதம்",
        "கஷ்டம் வரும், அதை கடந்து போ",
        "ஒழுக்கமே வாழ்வின் அடிப்படை",
        "இன்பமும் துன்பமும் மாறி வரும்",
        "நன்றி மறவாதே",
        "யார் நம்மை விமர்சிக்கிறாரோ அவர் நம் ஆசிரியர்",
        "தன்னம்பிக்கையே வெற்றியின் ரகசியம்",
        "எளிமையே உன்னதம்",
        "நேர்மையான உழைப்பு ஒருபோதும் வீண் போகாது",
        "காலம் கற்றுக் கொடுக்கும் பாடம் விலைமதிப்பற்றது",
        "பிறர் துன்பம் கண்டு மனம் இரங்கு",
        "கோபத்தை கட்டுப்படுத்து, அமைதியை பின்பற்று",
        "உன் தவறுகளிலிருந்து பாடம் கற்றுக்கொள்",
        "நல்ல நண்பர்கள் வாழ்வின் சொத்து",
        "வார்த்தையை விட செயல் பேசும்",
        "அடுத்தவருக்கு உதவு, உனக்கும் உதவி வரும்",
        "மனிதன் மாறினால் உலகம் மாறும்",
        "கற்பனையே படைப்பின் தொடக்கம்",
        "விடாமுயற்சி வெற்றியைத் தரும்",
        "நேர்மை ஒருபோதும் தோற்காது",
        "அன்பு செலுத்து, வெறுப்பை விடு",
        "உன் திறமையை உலகிற்கு காட்டு",
        "சிந்தனையே செயலின் ஆரம்பம்",
        "பிறர் மீது கருணை காட்டு",
        "தினமும் ஒரு நல்ல காரியம் செய்",
        "உன் கனவை நம்பு",
        "பயம் உன் எதிரி, தைரியம் உன் நண்பன்",
        "மன அமைதி ஆரோக்கியத்தின் அடிப்படை",
        "கல்வி கண் திறக்கும்",
        "நேரம் பொன் போன்றது",
        "நல்ல பழக்கம் நல்ல எதிர்காலம்",
        "உன் குடும்பமே உன் பலம்",
        "தன்னலமின்றி வாழ்வு வாழ",
        "சோம்பல் வெற்றியின் எதிரி",
        "உன் பேச்சில் இனிமை இருக்கட்டும்",
        "கஷ்டப்படுவோருக்கு கடவுள் உதவுவார்",
        "நம்பிக்கையை இழக்காதே",
        "புன்னகை எல்லா மொழியிலும் பேசும்",
        "தினமும் கற்றுக்கொள், வளர்ந்துகொள்",
        "விரக்தி அடையாதே, முயற்சி செய்",
        "உன் எண்ணங்கள் உன் வாழ்க்கையை வடிவமைக்கும்",
        "ஆரோக்கியமே பெரிய செல்வம்",
        "சிறிய வெற்றிகளைக் கொண்டாடு",
        "பிறரை மதி, மதிப்பு பெறுவாய்",
        "உன் வேலையை அர்ப்பணிப்புடன் செய்",
        "அமைதியான மனம் சரியான முடிவு எடுக்கும்",
        "தவறு செய்வது மனிதனின் இயல்பு, திருத்துவது சிறப்பு",
        "நாளை என்று தள்ளிப்போடாதே",
        "உன் நேரத்தை புத்திசாலித்தனமாக பயன்படுத்து",
        "வாழ்க்கையில் எல்லாவற்றுக்கும் ஒரு நேரம் உண்டு",
        "பொய் ஒருபோதும் நிலைக்காது",
        "நேர்மையாக இரு, தைரியமாக இரு",
        "உன் குழந்தைகளுக்கு நல்ல முன்மாதிரியாக இரு",
        "மற்றவர்கள் சொல்வதை பொறுமையாக கேள்",
        "விமர்சனத்தை ஏற்றுக்கொள், வளர்ச்சி அடைவாய்",
        "கோபம் உன்னையே அழிக்கும்",
        "நல்ல சிந்தனை நல்ல வாழ்வு",
        "உன் உடலை பேணு, அதுவே உன் ஆலயம்",
        "அடுத்தவர் குறையை பாராதே",
        "உன் வாழ்க்கையை நீயே எழுது",
        "சிக்கலை சாதகமாக மாற்று",
        "எதிர்மறை எண்ணங்களை தவிர்",
        "நல்ல புத்தகம் நல்ல நண்பன்",
        "உன் பெற்றோரை மதி",
        "தினமும் நன்றி சொல்",
        "உழைப்புக்கு குறுக்கு வழி இல்லை",
        "தோல்வியை கண்டு பயப்படாதே",
        "உன் இலக்கை தெளிவாக வை",
        "சிறிய படிகள் பெரிய பயணத்தை ஆரம்பிக்கும்",
        "மகிழ்ச்சி உன் கையில்",
        "அன்பு கொடு, அன்பு பெறுவாய்",
        "குழுவாக வேலை செய்",
        "பிரச்சனையை தீர்வு நோக்கி பார்",
        "உன் அனுபவமே உன் ஆசிரியர்",
        "புதிய தொழில்நுட்பத்தை கற்றுக்கொள்",
        "உன் சக ஊழியர்களை மதி",
        "கற்றுக்கொடு, கற்றுக்கொள்",
        "நேரத்தை மதி, வேலையை முடி",
        "பணம் சேமி, எதிர்காலத்திற்கு திட்டமிடு",
        "நல்ல வேலை நல்ல பெயர் தரும்",
        "ஒவ்வொரு நாளும் சிறப்பானது",
        "கடின உழைப்பிற்கு மாற்றில்லை",
        "கற்றது போதும் என்று நினைக்காதே",
        "மகிழ்ச்சியான வேலை மகிழ்ச்சியான வாழ்வு",
        "பிழையிலிருந்து படிப்பினை",
        "உன் வேலையை காதலி",
        "ஒரு நல்ல செயல் ஆயிரம் வார்த்தைக்கு சமம்",
        "விடாது முயற்சி செய்",
        "நம்பகமான பணியாளன் விலைமதிப்பற்றவன்",
        "சிறந்த திட்டமிடல் சிறந்த முடிவு",
        "உன் கடமையை முழு மனதுடன் செய்",
        "நல்ல வேலைக்கு நல்ல ஊதியம்",
        "திறமையை வளர்த்துக்கொள்",
        "ஆக்கபூர்வமாக சிந்தி",
        "தடையை தாண்டு",
        "உன் சுற்றுப்புறத்தை சுத்தமாக வை",
        "உடல் ஆரோக்கியம் மன ஆரோக்கியம்",
        "தினமும் ஒரு புதிய விஷயம் கற்றுக்கொள்",
        "உன் குடும்பத்திற்காக உழை",
        "நம்பிக்கை உன் வழிகாட்டி",
        "கஷ்டம் நிரந்தரமல்ல",
        "நல்ல எண்ணம் நல்ல வாழ்வு",
        "உன் வேலையில் கவனம் செலுத்து",
        "பேராசையை தவிர்",
        "சின்ன சின்ன மகிழ்ச்சிகளை ரசி",
        "உன் நேரத்திற்கு மதிப்பு கொடு",
        "செலவை கட்டுப்படுத்து",
        "நல்ல ஆரோக்கியமே நல்ல வாழ்வு",
        "உன் வாக்கை காப்பாற்று",
        "நிதானமாக முடிவு எடு",
        "மனதில் உறுதி வை",
        "அடுத்தவர் நலனில் அக்கறை கொள்",
        "உன் தவறை ஒப்புக்கொள்",
        "எளிமையான வாழ்க்கை மகிழ்ச்சியான வாழ்க்கை",
        "உன் வேலையை நேர்த்தியாக செய்",
        "நல்ல உறவுகளை பேணு",
        "உன் வயதை வீணடிக்காதே",
        "ஒவ்வொரு முயற்சியும் முக்கியம்",
        "பிறர் உழைப்பை மதி",
        "நீ சிறப்பாக இருக்கிறாய்",
        "உன் கனவுக்காக போராடு",
        "சிறு வேலையும் பெரிய வேலைதான்",
        "உழைப்பின் பலன் இனிக்கும்",
        "மன உறுதியே வெற்றியின் அடிப்படை",
        "நீ தனித்துவமானவன்",
        "ஒவ்வொரு செயலிலும் சிறந்திரு",
        "காலை எழுந்திரு, வேலையை தொடங்கு",
        "உன் திறமையை வீணடிக்காதே",
        "நல்ல பண்பு நல்ல மனிதன்",
        "உன்னை நீ நம்பு",
        "நல்ல கேள்வி நல்ல பதில் தரும்",
        "பிறர் உணர்வுகளை புரிந்துகொள்",
        "சிறு உதவி பெரிய மாற்றம்",
        "உன் வேலையில் தரம் பேணு",
        "ஒழுக்கம் கடைப்பிடி",
        "நல்ல சிந்தனை செயலாக மாறும்",
        "பயணத்தை ரசி, இலக்கு முக்கியம் இல்லை",
        "தைரியமாக முடிவு எடு",
        "உன் சக ஊழியர்களுக்கு உதவு",
        "நேரத்தை திட்டமிடு",
        "சிறந்த வேலை சிறந்த பலன்",
        "உன் உடலை பாதுகா",
        "நல்ல உணவு நல்ல ஆரோக்கியம்",
        "மன அழுத்தத்தை குறை",
        "உன் வாழ்க்கையை ரசி",
        "ஒவ்வொரு சவாலும் ஒரு வாய்ப்பு",
        "பிறர் வெற்றியை பாராட்டு",
        "உன் குறைகளை சரி செய்",
        "நல்ல பழக்கங்களை வளர்",
        "இன்றே தொடங்கு, நாளை தாமதம்",
        "உன் குழந்தைகள் உன்னைப் பார்க்கின்றனர்",
        "உன் வேலையே உன் ஜெபம்",
        "கடவுள் நம்பிக்கை இரு",
        "நல்லதே நடக்கும்",
        "உன் வாழ்வில் நீயே ஹீரோ",
        "சிரமத்தை சிரித்து எதிர்கொள்",
        "ஒவ்வொரு நிமிடமும் விலைமதிப்பற்றது",
        "உன் வேலையில் புதுமை புகுத்து",
        "கற்றுக்கொடுப்பதே சிறந்த கற்றல்",
        "உன் அறிவை பகிர்ந்துகொள்",
        "நல்ல நோக்கம் நல்ல முடிவு",
        "சிறிய தொடக்கம் பெரிய வெற்றி",
        "உன் அனுபவத்தை மற்றவர்களுக்கு கற்றுக்கொடு",
        "கடின நேரத்தில் கலங்காதே",
        "எல்லாவற்றுக்கும் ஒரு காரணம் உண்டு",
        "உன் ஆன்மாவை வளர்",
        "நல்ல தூக்கம் நல்ல ஆரோக்கியம்",
        "உன் பெற்றோர் ஆசி பெறு",
        "நாளை பற்றி கவலை கொள்ளாதே",
        "இன்றை நன்றாக வாழ்",
        "உன் மனசாட்சியை கேள்",
        "நியாயமான வழியில் நட",
        "உன் வேலையில் அர்ப்பணிப்பு காட்டு",
        "மற்றவர்களின் நேரத்தையும் மதி",
        "உன் தவறுகள் உன் ஆசிரியர்கள்",
        "ஒவ்வொரு முடிவும் ஒரு பாடம்",
        "நல்ல விஷயங்கள் நேரம் எடுக்கும்",
        "பொறுமையாக காத்திரு",
        "உன் குடும்பத்துடன் நேரம் செலவிடு",
        "நல்ல நண்பனாக இரு",
        "உன் வார்த்தையை காப்பாற்று",
        "உன்னை மேம்படுத்திக்கொள்",
        "எதிர்காலத்திற்காக திட்டமிடு",
        "இன்றைய கஷ்டம் நாளைய சுகம்",
        "உன் கடமை என்ன என்று யோசி",
        "நல்ல எண்ணங்களை விதை",
        "உன் நாட்டை நேசி",
        "உன் மொழியை மதி",
        "உன் கலாசாரத்தை காப்பாற்று",
        "இயற்கையை பாதுகா",
        "நீர் வீணாக்காதே",
        "மின்சாரத்தை சேமி",
        "உன் சுற்றுச்சூழலை காப்பாற்று",
        "ஒவ்வொரு உயிரையும் மதி",
        "நல்ல சமூகத்தை உருவாக்கு",
        "உன் அண்டை வீட்டாருடன் நல்ல உறவு வை",
        "சட்டத்தை மதி",
        "உன் உரிமைகளை அறி",
        "உன் கடமைகளை நிறைவேற்று",
        "நீதி எல்லோருக்கும் சமம்",
        "அறிவியலை நம்பு",
        "புதிய விஷயங்களை ஆராய்",
        "உன் ஆரோக்கியத்தை பரிசோதி",
        "உடற்பயிற்சி செய்",
        "நல்ல உணவு உன் மருந்து",
        "தண்ணீர் அதிகம் குடி",
        "காலையில் எழு, இரவில் உறங்கு",
        "உன் குழந்தைகளுக்கு நேரம் கொடு",
        "அவர்களுக்கு கல்வி கொடு",
        "நல்ல பண்புகளை கற்றுக்கொடு",
        "உன் மனைவியை மதி",
        "குடும்ப ஒற்றுமை காப்பாற்று",
        "வீட்டை சுத்தமாக வை",
        "பணத்தை சரியாக செலவிடு",
        "தேவையற்ற செலவை தவிர்",
        "சேமிப்பு பழக்கம் வை",
        "எதிர்காலத்திற்கு முதலீடு செய்",
        "கடனை தவிர்",
        "கடன் இருந்தால் முதலில் அடை",
        "உன் வருமானத்திற்கு ஏற்ப வாழ்",
        "ஆடம்பரத்தை தவிர்",
        "எளிமையாக வாழ்",
        "புதிய நண்பர்களை உருவாக்கு",
        "பழைய நண்பர்களை மறவாதே",
        "உன் ஆசிரியர்களை மதி",
        "உன் மூத்தவர்களை மதி",
        "இளையவர்களுக்கு வழிகாட்டு",
        "சமூக சேவை செய்",
        "ரத்ததானம் செய்",
        "மரம் நடு",
        "குப்பையை சரியான இடத்தில் போடு",
        "பிளாஸ்டிக் பயன்பாட்டை குறை",
        "மறுசுழற்சி செய்",
        "இயற்கை வேளாண்மையை ஆதரி",
        "உள்ளூர் பொருட்களை வாங்கு",
        "உன் ஊருக்கு பெருமை சேர்",
        "உன் வேலையால் சமூகத்திற்கு பயன் தா",
        "ஒவ்வொரு நாளும் கடவுளுக்கு நன்றி சொல்",
        "உன் ஆரோக்கியத்திற்கு நன்றி சொல்",
        "உன் குடும்பத்திற்கு நன்றி சொல்",
        "உன் வேலைக்கு நன்றி சொல்",
        "உயிருடன் இருப்பதற்கு நன்றி சொல்",
        "வெற்றி பெற விரும்பினால் தோல்வியை ஏற்றுக்கொள்",
        "உன் வாழ்க்கையை ஒப்பிடாதே",
        "மற்றவர்களின் வெற்றியில் மகிழ்ச்சி அடை",
        "உன் பலவீனத்தை பலமாக மாற்று",
        "கடந்ததை மற",
        "எதிர்காலத்தை நம்பு",
        "நிகழ்காலத்தில் வாழ்",
        "உன் மனதை சுத்தமாக வை",
        "நல்ல இசை கேள்",
        "நல்ல புத்தகம் படி",
        "உன் பொழுதுபோக்கை வளர்",
        "படைப்பாற்றலை வளர்",
        "உன் குரலை கண்டுபிடி",
        "தனித்துவமாக இரு",
        "கூட்டத்தை பின்பற்றாதே",
        "உன் மனசாட்சிப்படி நட",
        "நல்ல தலைவனாக இரு",
        "நல்ல பின்பற்றுபவனாக இரு",
        "பொறுப்பை ஏற்றுக்கொள்",
        "குற்றம் சாட்டாதே",
        "தீர்வை கண்டுபிடி",
        "சிக்கலில் சாதகத்தை பார்",
        "உன் அனுபவத்தில் நம்பிக்கை வை",
        "உன் உள்ளுணர்வை நம்பு",
        "நல்ல முடிவு எடு",
        "தவறான முடிவை சரி செய்",
        "மன்னிப்பு கேள்",
        "மன்னிப்பு கொடு",
        "பழி வாங்காதே",
        "அமைதியே பதில்",
        "நல்ல உணவு சமை",
        "உன் வீட்டை அழகாக வை",
        "உன் தோட்டத்தை பராமரி",
        "விலங்குகளிடம் கருணை காட்டு",
        "குழந்தைகளிடம் அன்பாக இரு",
        "முதியவர்களுக்கு உதவு",
        "நோயாளிகளை சந்தி",
        "ஏழைகளுக்கு உதவு",
        "கல்வி நிறுவனங்களுக்கு உதவு",
        "மருத்துவமனைகளுக்கு உதவு",
        "உன் ஊரின் வளர்ச்சிக்கு உழை",
        "சமூக அக்கறை கொள்",
        "உன் வாக்கை சரியாக பயன்படுத்து",
        "ஜனநாயகத்தை மதி",
        "பெண்களை மதி",
        "குழந்தைகளை பாதுகா",
        "முதியவர்களை கவனி",
        "ஊனமுற்றோருக்கு உதவு",
        "சமத்துவம் காப்பாற்று",
        "மதங்களை மதி",
        "அனைவரையும் சமமாக நட",
        "மனிதநேயம் காட்டு",
        "உலகமே ஒரு குடும்பம்",
        "இசையை ரசி",
        "கலையை ஆதரி",
        "இலக்கியத்தை படி",
        "வரலாற்றை அறி",
        "அறிவியலை புரிந்துகொள்",
        "தொழில்நுட்பத்தை கற்றுக்கொள்",
        "டிஜிட்டல் வளர்ச்சியை ஏற்றுக்கொள்",
        "பாரம்பரியத்தை காப்பாற்று",
        "புதுமையை வரவேற்",
        "மாற்றத்தை ஏற்றுக்கொள்",
        "உன் வாழ்க்கையின் நோக்கத்தை கண்டுபிடி",
        "ஒவ்வொரு நாளும் நன்றியுடன் தொடங்கு",
        "இரவு நிம்மதியாக உறங்கு",
        "உன் ஆன்மீகத்தை வளர்",
        "உன் மனதை அமைதியாக வை",
        "மனிதனின் மதிப்பு அவன் செயலில் இருக்கிறது",
        "நேர்மையான வாழ்க்கை அமைதியான வாழ்க்கை",
        "உன் தொழிலை கௌரவமாக நினை",
        "உன் அறிவை தொடர்ந்து வளர்",
      ]
;

const LANG={
vehicleNumber:{en:"Vehicle number",ta:"வாகன எண்",hi:"वाहन नंबर"},
customerName:{en:"Customer name",ta:"வாடிக்கையாளர் பெயர்",hi:"ग्राहक का नाम"},
phoneNumber:{en:"Phone number",ta:"தொலைபேசி எண்",hi:"फ़ोन नंबर"},
samePhone:{en:"Same phone",ta:"அதே எண்",hi:"वही नंबर"},
vehicleBrand:{en:"Vehicle brand",ta:"வாகன நிறுவனம்",hi:"वाहन ब्रांड"},
vehiclePhotos:{en:"Vehicle photos",ta:"வாகன புகைப்படங்கள்",hi:"वाहन फोटो"},
fuelLevel:{en:"Fuel level",ta:"எரிபொருள் அளவு",hi:"ईंधन स्तर"},
kmReading:{en:"KM reading",ta:"கி.மீ. ரீடிங்",hi:"KM रीडिंग"},
deliveryDate:{en:"Delivery date",ta:"டெலிவரி தேதி",hi:"डिलीवरी तारीख"},
assignMechanic:{en:"Assign Mechanic",ta:"மெக்கானிக் நியமி",hi:"मैकेनिक नियुक्त करें"},
customerBelongings:{en:"Customer belongings",ta:"வாடிக்கையாளர் பொருட்கள்",hi:"ग्राहक का सामान"},
services:{en:"Services",ta:"சேவைகள்",hi:"सेवाएं"},
advancePayment:{en:"Advance payment",ta:"முன்பணம்",hi:"अग्रिम भुगतान"},
paymentMode:{en:"Payment mode",ta:"பணம் செலுத்தும் முறை",hi:"भुगतान का तरीका"},
invalidPlate:{en:"Invalid plate. Try again.",ta:"தவறான எண். மீண்டும் முயற்சி.",hi:"अमान्य नंबर। पुनः प्रयास करें।"},
nameShort:{en:"Name too short.",ta:"பெயர் மிகக் குறைவு.",hi:"नाम बहुत छोटा।"},
need10:{en:"Need 10 digits.",ta:"10 இலக்கங்கள் தேவை.",hi:"10 अंक चाहिए।"},
numOrSkip:{en:"Number or *skip*.",ta:"எண் அல்லது *skip*.",hi:"नंबर या *skip*।"},
invalidAmt:{en:"Invalid amount.",ta:"தவறான தொகை.",hi:"अमान्य राशि।"},
typeModel:{en:"Type model name.",ta:"மாடல் பெயர் டைப் செய்.",hi:"मॉडल नाम टाइप करें।"},
sameCustomer:{en:"Same customer — *yes* or type new name",ta:"அதே வாடிக்கையாளர் — *yes* அல்லது புதிய பெயர்",hi:"वही ग्राहक — *yes* या नया नाम"},
confirmed:{en:"Confirmed!",ta:"உறுதிசெய்யப்பட்டது!",hi:"पुष्टि हो गई!"},
jobCreated:{en:"Job created!",ta:"வேலை உருவாக்கப்பட்டது!",hi:"जॉब बनाया गया!"},
startOver:{en:"Start over",ta:"மீண்டும் தொடங்கு",hi:"फिर से शुरू"},
noAdvance:{en:"No advance payment",ta:"முன்பணம் இல்லை",hi:"कोई अग्रिम नहीं"},
skipped:{en:"Skipped",ta:"தவிர்க்கப்பட்டது",hi:"छोड़ दिया"},
noDelivery:{en:"No delivery date",ta:"டெலிவரி தேதி இல்லை",hi:"कोई डिलीवरी तारीख नहीं"},
tapAbove:{en:"Tap a button above ↑",ta:"மேலே பொத்தானை தட்டுங்கள் ↑",hi:"ऊपर बटन दबाएं ↑"},
checkedIn:{en:"Vehicle Checked In!",ta:"வாகனம் பதிவு செய்யப்பட்டது!",hi:"वाहन चेक-इन हो गया!"},
tapProfile:{en:"Tap your profile",ta:"உங்கள் சுயவிவரத்தை தட்டுங்கள்",hi:"अपनी प्रोफ़ाइल टैप करें"},
admin:{en:"Admin",ta:"நிர்வாகி",hi:"एडमिन"},receptionist:{en:"Receptionist",ta:"வரவேற்பாளர்",hi:"रिसेप्शनिस्ट"},mechanic:{en:"Mechanic",ta:"மெக்கானிக்",hi:"मैकेनिक"},
};
const _t=(k,l)=>(LANG[k]&&LANG[k][l])||(LANG[k]&&LANG[k]["en"])||k;

const SVC_CATALOG = [
  "Regular Service","Full Service","Oil Change","Oil + Filter Change",
  "AC Service","AC Gas Refill","AC Compressor","AC Cooling Coil",
  "Brake Pad (Front)","Brake Pad (Rear)","Brake Disc","Brake Fluid",
  "Wheel Alignment","Wheel Balancing","Tyre Rotation","Tyre Replacement",
  "Battery Replacement","Battery Check","Alternator","Starter Motor",
  "Clutch Set","Clutch Plate","Pressure Plate","Gear Oil",
  "Engine Overhaul","Head Gasket","Valve Grinding","Timing Belt",
  "Suspension Check","Shock Absorber","Coil Spring","Ball Joint",
  "Coolant Flush","Radiator Repair","Thermostat","Water Pump",
  "Power Steering Fluid","Fuel Filter","Air Filter","Cabin Filter",
  "Spark Plugs","Denting","Painting","Polishing","Detailing",
  "Insurance Claim","Accident Repair","Injector Cleaning","DPF Cleaning",
];
const SVC_CATEGORIES = [
  { k:"service", l:"🔧 Service", svcs:["Regular Service","Full Service","Oil Change","Oil + Filter Change","Injector Cleaning","DPF Cleaning"] },
  { k:"engine",  l:"⚙️ Engine",  svcs:["Engine Overhaul","Head Gasket","Valve Grinding","Timing Belt","Coolant Flush","Water Pump","Thermostat","Radiator Repair"] },
  { k:"ac",      l:"❄️ AC",      svcs:["AC Service","AC Gas Refill","AC Compressor","AC Cooling Coil"] },
  { k:"brakes",  l:"🛑 Brakes",  svcs:["Brake Pad (Front)","Brake Pad (Rear)","Brake Disc","Brake Fluid"] },
  { k:"tyres",   l:"🔵 Tyres",   svcs:["Wheel Alignment","Wheel Balancing","Tyre Rotation","Tyre Replacement"] },
  { k:"elec",    l:"⚡ Elec",    svcs:["Battery Replacement","Battery Check","Alternator","Starter Motor","Spark Plugs"] },
  { k:"clutch",  l:"🔩 Clutch",  svcs:["Clutch Set","Clutch Plate","Pressure Plate","Gear Oil","Suspension Check","Shock Absorber","Coil Spring","Ball Joint"] },
  { k:"filters", l:"🌀 Filters", svcs:["Air Filter","Cabin Filter","Fuel Filter"] },
  { k:"body",    l:"🎨 Body",    svcs:["Denting","Painting","Polishing","Detailing","Insurance Claim","Accident Repair"] },
];
const BRANDS = ["Maruti","Hyundai","Tata","Mahindra","Honda","Toyota","Kia","Renault","Nissan","Volkswagen","Skoda","MG","BMW","Mercedes","Audi","Jeep","Ford","Fiat","Others"];
const BRAND_DATA = {
  Maruti:{bg:"#1A4F9F",fg:"#fff",icon:"🚗"}, Hyundai:{bg:"#002C5F",fg:"#fff",icon:"🚙"},
  Tata:{bg:"#00529B",fg:"#fff",icon:"🚘"}, Mahindra:{bg:"#C41230",fg:"#fff",icon:"🛻"},
  Honda:{bg:"#CC0000",fg:"#fff",icon:"🚗"}, Toyota:{bg:"#EB0A1E",fg:"#fff",icon:"🚐"},
  Kia:{bg:"#1a1a1a",fg:"#fff",icon:"🚙"}, Renault:{bg:"#EFDF00",fg:"#000",icon:"🚗"},
  Nissan:{bg:"#C3002F",fg:"#fff",icon:"🚗"}, Volkswagen:{bg:"#001E50",fg:"#fff",icon:"🚘"},
  Skoda:{bg:"#4BA82E",fg:"#fff",icon:"🚗"}, MG:{bg:"#D71921",fg:"#fff",icon:"🚙"},
  BMW:{bg:"#1C69D4",fg:"#fff",icon:"🚘"}, Mercedes:{bg:"#333333",fg:"#fff",icon:"🚗"},
  Audi:{bg:"#BB0A30",fg:"#fff",icon:"🚘"},
  Jeep:{bg:"#2C3E2D",fg:"#fff",icon:"🛻"}, Ford:{bg:"#003499",fg:"#fff",icon:"🚘"},
  Fiat:{bg:"#003087",fg:"#fff",icon:"🚗"}, Others:{bg:"#6B7280",fg:"#fff",icon:"🚗"},
};
const BRAND_MODELS = {
  Maruti:["Swift","Baleno","S-Presso","Celerio","Alto","Alto K10","Ignis","WagonR","Dzire","Ertiga","Brezza","XL6","Grand Vitara","Fronx","Jimny","Invicto","Ciaz","S-Cross","Eeco","Vitara","Zen","Esteem","Omni"],
  Hyundai:["i10","Grand i10","i20","Santro","Aura","Verna","Venue","Creta","Alcazar","Tucson","Exter","Ioniq 5","Kona","Elite i20","Xcent","Accent","Eon","Getz"],
  Tata:["Tiago","Tiago NRG","Tiago EV","Tigor","Tigor EV","Altroz","Punch","Punch EV","Nexon","Nexon EV","Nexon EV Max","Harrier","Safari","Curvv","Curvv EV","Sierra","Hexa","Sumo","Zest","Bolt","Nano","Indica","Indica Vista","Indigo","Indigo CS","Aria","Xenon","Yodha","Ace","Magic","Winger"],
  Mahindra:["XUV700","XUV400","XUV400 EV","XUV300","XUV3XO","Thar","Thar Roxx","Scorpio","Scorpio N","Bolero","Bolero Neo","BE6","Marazzo","TUV300","KUV100","Xylo","Quanto","Verito","Logan"],
  Honda:["City","City Hybrid","Amaze","Jazz","WR-V","Elevate","Civic","CR-V","Accord","BR-V","Brio","Mobilio"],
  Toyota:["Innova","Innova Crysta","Innova Hycross","Fortuner","Fortuner Legender","Camry","Glanza","Urban Cruiser","Urban Cruiser Hyryder","Rumion","Hilux","Corolla","Etios","Etios Cross","Etios Liva","Land Cruiser"],
  Kia:["Seltos","Sonet","Carens","EV6","EV9","Carnival","Syros"],
  Renault:["Kwid","Triber","Duster","Kiger","Captur","Lodgy"],
  Nissan:["Magnite","Kicks","Terrano","Micra","Sunny","X-Trail"],
  Volkswagen:["Polo","Vento","Taigun","Virtus","Tiguan","T-Roc","Jetta","Passat"],
  Skoda:["Rapid","Kushaq","Slavia","Octavia","Superb","Kodiaq","Kylaq"],
  MG:["Hector","Hector Plus","Astor","Gloster","ZS EV","Comet EV","Windsor"],
  Jeep:["Compass","Meridian","Wrangler","Grand Cherokee"],
  Ford:["EcoSport","Endeavour","Figo","Aspire","Freestyle","Fiesta","Ikon"],
  Fiat:["Punto","Linea","Abarth","Palio","Petra","Adventure"],
  BMW:["3 Series","5 Series","7 Series","X1","X3","X5","X7","M340i","Z4","2 Series","1 Series","6 GT","iX","i4"],
  Mercedes:["A-Class","C-Class","E-Class","S-Class","GLA","GLC","GLE","GLS","AMG GT","CLA","EQS","EQC","V-Class"],
  Audi:["A3","A4","A6","A8","Q3","Q5","Q7","Q8","e-tron","RS5","TT","S5"],
  Others:[],
};
const FUELS = [{v:"full",l:"Full ⛽"},{v:"3/4",l:"¾"},{v:"1/2",l:"½"},{v:"1/4",l:"¼"},{v:"empty",l:"E"}];
const BELONGS = [
  {k:"stepney",l:"Spare tyre",qty:false},{k:"jack",l:"Jackie",qty:false},
  {k:"jackLever",l:"Jackie lever",qty:false},{k:"spanner",l:"Wheel spanner",qty:false},
  {k:"thread",l:"Topping thread",qty:false},{k:"toolkit",l:"Toolkit",qty:false},
  {k:"firstAid",l:"First aid kit",qty:false},{k:"docs",l:"Documents",qty:false},
  {k:"mats",l:"Floor mats",qty:true,max:4},{k:"wheelCup",l:"Wheel cups",qty:true,max:4},{k:"keys",l:"Keys",qty:true,max:5},
];
const CREDIT_TERMS = [{k:"7d",l:"7 Days",days:7},{k:"15d",l:"15 Days",days:15},{k:"30d",l:"30 Days",days:30},{k:"45d",l:"45 Days",days:45}];
const STATUS_META = {
  open:        { label:"Waiting",    icon:"📋", color:"#F0AD00" },
  in_progress: { label:"In Progress",icon:"🔧", color:"#3B6D11" },
  completed:   { label:"QC Ready",   icon:"✅", color:"#6B6EFF" },
  delivered:   { label:"Delivered",  icon:"📦", color:"#888780" },
};

// ── Demo Jobs ─────────────────────────────────────────────────
const DEMO_JOBS = [
  { jobNo:1001, name:"Suresh Kumar", phone:"9876500001",
    regNo:"TN 01 AB 1234", brand:"Maruti", model:"Swift", kms:"45000", fuel:"3/4",
    date:dt(), status:"in_progress", assignedTo:3,
    items:[{complaint:"Regular Service",price:2500,fromCheckin:true},{complaint:"Oil + Filter Change",price:1200,fromCheckin:true},{complaint:"Brake Pad (Front)",price:1800,fromCheckin:true}],
    _checkinSnapshot:[{complaint:"Regular Service",price:2500},{complaint:"Oil + Filter Change",price:1200},{complaint:"Brake Pad (Front)",price:1800}],
    outsourced:[{service:"Wheel Alignment",vendor:"Balaji Alignment Centre",cost:800,vendorCost:500,status:"received",sentDate:dAgo(0)},{service:"AC Gas Refill",vendor:"Cool Zone AC",cost:1200,vendorCost:800,status:"sent",sentDate:dAgo(0)}], _parts:[{name:"Engine Oil 5W30",cost:850,type:"new",done:false}],
    _servicesDone:[0,1,2], _serviceDates:{0:dt()+" 10:15 am · Raju",1:dt()+" 10:30 am · Raju",2:dt()+" 11:00 am · Raju"},
    _washDone:false, _testDriveDone:false, _qcPassed:false, _custNotified:false,
    payments:[{id:1,amount:2000,method:"CASH",date:dt(),time:"10:00",by:"Priya"}],
    totalAmount:6350, photos:{front:null,rear:null,left:null,right:null},
    damageNotes:"Minor scratch on left door", deliveryDate:"", belongings:{stepney:true},
    timeline:[
      {id:"t1",date:dt(),time:"09:30",note:"Vehicle checked in by Priya",auto:true,by:"System",type:"system"},
      {id:"t2",date:dt(),time:"10:00",note:"Assigned to Raju",auto:true,by:"System",type:"system"},
      {id:"t3",date:dt(),time:"10:30",note:"Engine oil drained. Oil filter replaced. Cleaned air filter.",auto:false,by:"Raju",type:"message"},
      {id:"t4",date:dt(),time:"11:00",note:"💰 Payment ₹2,000 received (CASH)",auto:true,by:"System",type:"system"},
    ]},
  { jobNo:1000, name:"Priya Devi", phone:"9876500002",
    regNo:"TN 02 CD 5678", brand:"Hyundai", model:"Creta", kms:"28000", fuel:"full",
    date:dt(), status:"open", assignedTo:null,
    items:[{complaint:"AC Service",price:3000,fromCheckin:true},{complaint:"Wheel Alignment",price:700,fromCheckin:true}],
    _checkinSnapshot:[{complaint:"AC Service",price:3000},{complaint:"Wheel Alignment",price:700}],
    outsourced:[], _parts:[], _servicesDone:[], _serviceDates:{},
    _washDone:false, _testDriveDone:false, _qcPassed:false, _custNotified:false,
    payments:[], totalAmount:3700,
    photos:{front:null,rear:null,left:null,right:null},
    damageNotes:"", deliveryDate:"", belongings:{},
    timeline:[{id:"t5",date:dt(),time:"08:45",note:"Vehicle checked in",auto:true,by:"System",type:"system"}]},
  { jobNo:999, name:"Mohan Raj", phone:"9876500003",
    regNo:"TN 03 EF 9012", brand:"Tata", model:"Nexon", kms:"62000", fuel:"1/2",
    date:dAgo(1), status:"completed", assignedTo:4,
    items:[{complaint:"Clutch Set",price:6500,fromCheckin:true},{complaint:"Gear Oil",price:800,fromCheckin:true}],
    _checkinSnapshot:[{complaint:"Clutch Set",price:6500},{complaint:"Gear Oil",price:800}],
    outsourced:[], _parts:[{name:"Clutch Plate Kit",cost:3500,type:"new",done:true}],
    _servicesDone:[0,1], _serviceDates:{0:dAgo(1)+" 12:30 pm · Kumar",1:dAgo(1)+" 01:45 pm · Kumar"},
    _washDone:true, _testDriveDone:true, _qcPassed:false, _custNotified:false,
    payments:[], totalAmount:10800,
    photos:{front:null,rear:null,left:null,right:null},
    damageNotes:"", deliveryDate:dt(), belongings:{},
    timeline:[
      {id:"t6",date:dAgo(1),time:"09:00",note:"Vehicle checked in",auto:true,by:"System",type:"system"},
      {id:"t7",date:dAgo(1),time:"14:00",note:"Clutch assembly done. Test drive completed.",auto:false,by:"Kumar",type:"message"},
    ]},
  { jobNo:998, name:"Anitha Kumari", phone:"9876500004",
    regNo:"KA 01 GH 3456", brand:"Honda", model:"City", kms:"89000", fuel:"1/4",
    date:dAgo(3), status:"delivered", assignedTo:3,
    items:[{complaint:"Battery Replacement",price:4500,fromCheckin:true},{complaint:"Alternator Check",price:500,fromCheckin:true}],
    _checkinSnapshot:[{complaint:"Battery Replacement",price:4500},{complaint:"Alternator Check",price:500}],
    outsourced:[], _parts:[{name:"Amaron Battery 60Ah",cost:3800,type:"new",done:true}],
    _servicesDone:[0,1], _serviceDates:{0:dAgo(3)+" 12:00 pm · Raju",1:dAgo(3)+" 01:30 pm · Raju"},
    _washDone:true, _testDriveDone:true, _qcPassed:true, _custNotified:true,
    payments:[{id:1,amount:8800,method:"UPI",date:dAgo(3),time:"16:00",by:"Admin"}],
    totalAmount:8800,
    photos:{front:null,rear:null,left:null,right:null},
    damageNotes:"", deliveryDate:dAgo(3), belongings:{},
    timeline:[
      {id:"t8",date:dAgo(3),time:"11:00",note:"Vehicle checked in",auto:true,by:"System",type:"system"},
      {id:"t9",date:dAgo(3),time:"14:00",note:"Battery replaced. Alternator checked — OK.",auto:false,by:"Raju",type:"message"},
      {id:"t10",date:dAgo(3),time:"15:30",note:"💰 Payment ₹8,800 received (UPI)",auto:true,by:"System",type:"system"},
      {id:"t11",date:dAgo(3),time:"16:00",note:"🚗 Vehicle Delivered",auto:true,by:"System",type:"system"},
    ],_nextDueDate:dAgo(45),_nextDueKm:"92000"},
  // Follow-up demo: due in ~15 days
  { jobNo:997, name:"Vignesh R", phone:"9876500005",
    regNo:"TN 38 CD 7890", brand:"Hyundai", model:"Verna", kms:"45000", fuel:"3/4",
    date:dAgo(60), status:"delivered", assignedTo:4,
    items:[{complaint:"Full Service",price:3500,fromCheckin:true},{complaint:"AC Gas Top-up",price:1200,fromCheckin:true}],
    _checkinSnapshot:[{complaint:"Full Service",price:3500},{complaint:"AC Gas Top-up",price:1200}],
    outsourced:[], _parts:[{name:"Engine Oil 5W30",cost:850,type:"new",done:true},{name:"Oil Filter",cost:280,type:"new",done:true}],
    _servicesDone:[0,1], _serviceDates:{0:dAgo(60)+" 11:00 am · Kumar",1:dAgo(60)+" 02:00 pm · Kumar"},
    _washDone:true, _testDriveDone:true, _qcPassed:true, _custNotified:true,
    payments:[{id:1,amount:5830,method:"Cash",date:dAgo(60),time:"16:00",by:"Admin"}],
    totalAmount:5830,
    photos:{front:null,rear:null,left:null,right:null},
    damageNotes:"", deliveryDate:dAgo(60), belongings:{},
    _nextDueDate:(()=>{const d=new Date();d.setDate(d.getDate()+5);return d.toISOString().slice(0,10);})(),
    _nextDueKm:"48000",
    timeline:[
      {id:"t12",date:dAgo(60),time:"10:00",note:"Vehicle checked in",auto:true,by:"System",type:"system"},
      {id:"t13",date:dAgo(60),time:"16:00",note:"🚗 Vehicle Delivered",auto:true,by:"System",type:"system"},
    ]},
  // Overdue demo: was due 20 days ago
  { jobNo:996, name:"Deepa Lakshmi", phone:"9876500006",
    regNo:"TN 01 EF 4567", brand:"Toyota", model:"Innova", kms:"120000", fuel:"1/2",
    date:dAgo(120), status:"delivered", assignedTo:3,
    items:[{complaint:"Brake Pad Replacement",price:2800,fromCheckin:true},{complaint:"Wheel Alignment",price:600,fromCheckin:true}],
    _checkinSnapshot:[{complaint:"Brake Pad Replacement",price:2800},{complaint:"Wheel Alignment",price:600}],
    outsourced:[], _parts:[{name:"Brake Pad Set (Front)",cost:1200,type:"new",done:true}],
    _servicesDone:[0,1], _serviceDates:{0:dAgo(120)+" 10:00 am · Raju",1:dAgo(120)+" 11:30 am · Raju"},
    _washDone:true, _testDriveDone:true, _qcPassed:true, _custNotified:true,
    payments:[{id:1,amount:4600,method:"UPI",date:dAgo(120),time:"15:00",by:"Admin"}],
    totalAmount:4600,
    photos:{front:null,rear:null,left:null,right:null},
    damageNotes:"", deliveryDate:dAgo(120), belongings:{},
    _nextDueDate:dAgo(20),_nextDueKm:"125000",
    timeline:[
      {id:"t14",date:dAgo(120),time:"09:00",note:"Vehicle checked in",auto:true,by:"System",type:"system"},
      {id:"t15",date:dAgo(120),time:"15:00",note:"🚗 Vehicle Delivered",auto:true,by:"System",type:"system"},
    ]},
  // Another overdue
  { jobNo:995, name:"Ramesh Babu", phone:"9876500007",
    regNo:"TN 11 GH 2233", brand:"Mahindra", model:"XUV500", kms:"78000", fuel:"1/4",
    date:dAgo(90), status:"delivered", assignedTo:4,
    items:[{complaint:"Engine Oil Change",price:1800,fromCheckin:true},{complaint:"Air Filter",price:400,fromCheckin:true}],
    _checkinSnapshot:[{complaint:"Engine Oil Change",price:1800},{complaint:"Air Filter",price:400}],
    outsourced:[], _parts:[{name:"Engine Oil 5W30",cost:850,type:"new",done:true},{name:"Air Filter",cost:220,type:"new",done:true}],
    _servicesDone:[0,1], _serviceDates:{0:dAgo(90)+" 10:00 am · Kumar",1:dAgo(90)+" 10:30 am · Kumar"},
    _washDone:true, _testDriveDone:true, _qcPassed:true, _custNotified:true,
    payments:[{id:1,amount:3270,method:"Cash",date:dAgo(90),time:"14:00",by:"Admin"}],
    totalAmount:3270,
    photos:{front:null,rear:null,left:null,right:null},
    damageNotes:"", deliveryDate:dAgo(90), belongings:{},
    _nextDueDate:dAgo(10),_nextDueKm:"83000",
    timeline:[
      {id:"t16",date:dAgo(90),time:"09:00",note:"Vehicle checked in",auto:true,by:"System",type:"system"},
      {id:"t17",date:dAgo(90),time:"14:00",note:"🚗 Vehicle Delivered",auto:true,by:"System",type:"system"},
    ]},
];

// ── Reducer ───────────────────────────────────────────────────
let msgIdCounter = 1000;
const newMsgId = () => "m" + (++msgIdCounter);

function jobReducer(prev, { type: action, payload }) {
  const now = { date: dt(), time: tm() };
  const addMsg = (j, note, by = "System", msgType = "system") => ({
    ...j,
    timeline: [...(j.timeline || []), { id: newMsgId(), ...now, note, auto: true, by, type: msgType }],
  });
  switch (action) {
    case "ADD_JOB": {
      const snap = (payload.items||[]).filter(c=>c.fromCheckin).map(c=>({...c}));
      return [{...payload, _checkinSnapshot: snap}, ...prev];
    }
    case "ADD_NOTE": return prev.map(j => j.jobNo !== payload.jobNo ? j : {
      ...j,
      timeline: [...(j.timeline || []), { id: newMsgId(), ...now, note: payload.note, auto: false, by: payload.by, type: "message",
        ...(payload.isVoice?{isVoice:true,dataURL:payload.dataURL,voiceDur:payload.voiceDur}:{}),
        ...(payload.dataUrl?{dataUrl:payload.dataUrl}:{}) }]
    });
    case "CHANGE_STATUS": return prev.map(j => {
      if (j.jobNo !== payload.jobNo) return j;
      const nj = { ...j, status: payload.status };
      const label = STATUS_META[payload.status]?.label || payload.status;
      return addMsg(nj, `${STATUS_META[payload.status]?.icon} Status → ${label}`, payload.by || "System");
    });
    case "REOPEN_JOB": return prev.map(j => {
      if (j.jobNo !== payload.jobNo) return j;
      const nj = { ...j, status: "in_progress",
        _reopened:true, _reopenedAt:new Date().toISOString(),
        _reopenCount:((j._reopenCount||0)+1),
        _estimateSent:false, _estimateSentAt:null,
        _washDone:false, _testDriveDone:false, _qcPassed:false, _custNotified:false,
        _workUndoneAt:Date.now()
      };
      nj.timeline = [...(nj.timeline||[]),
        {id:newMsgId(),...now,note:"reopen",by:payload.by||"System",auto:true,type:"reopen_card"}
      ];
      return nj;
    });
    case "ADD_SERVICE": return prev.map(j => {
      if (j.jobNo !== payload.jobNo) return j;
      const items = [...(j.items || []), { complaint: payload.complaint.trim(), price: +payload.price || 0 }];
      const nj = { ...j, items };
      nj.totalAmount = recalc(nj);
      // Revert to in_progress if job was completed/QC — new work added
      nj._washDone=false; nj._testDriveDone=false; nj._qcPassed=false; nj._custNotified=false; if(nj.status==="completed") nj.status="in_progress";
      const priceStr = +payload.price > 0 ? ` — ₹${fmtINR(+payload.price)}` : "";
      return addMsg(nj, `🔧 Added: ${payload.complaint}${priceStr}`, payload.by || "System");
    });
    case "REMOVE_SERVICE": return prev.map(j => {
      if (j.jobNo !== payload.jobNo) return j;
      const removed = (j.items || [])[payload.idx]?.complaint || "";
      const items = (j.items || []).filter((_, i) => i !== payload.idx);
      const nj = { ...j, items };
      nj.totalAmount = recalc(nj);
      return addMsg(nj, `❌ Removed: ${removed}`, payload.by || "System");
    });
    case "ADD_PAYMENT": return prev.map(j => {
      if (j.jobNo !== payload.jobNo) return j;
      const payments = [...(j.payments || []), payload.payment];
      const nj = { ...j, payments };
      return addMsg(nj, `💰 Payment ₹${fmtINR(payload.payment.amount)} received (${payload.payment.method})`, payload.by);
    });
    case "MARK_DELIVERED": return prev.map(j => {
      if (j.jobNo !== payload.jobNo) return j;
      const nj = { ...j, status: "delivered", deliveryDate: now.date, _custNotified: true };
      // Auto-generate health checks
      const items = j.items||[];
      const hc = [
        {cat:"Brakes",status:items.some(c=>/brake/i.test(c.complaint))?"green":"amber",
          note:items.some(c=>/brake/i.test(c.complaint))?"Serviced":"Check next visit"},
        {cat:"Tyres",status:items.some(c=>/tyre|wheel|align/i.test(c.complaint))?"green":"amber",
          note:items.some(c=>/tyre|wheel/i.test(c.complaint))?"Checked":"Visual only"},
        {cat:"Engine",status:"green",
          note:items.some(c=>/oil|filter|service/i.test(c.complaint))?"Oil & filter changed":"Running smooth"},
        {cat:"Suspension",status:items.some(c=>/susp|shock/i.test(c.complaint))?"green":"amber",
          note:items.some(c=>/susp/i.test(c.complaint))?"Serviced":"Monitor for wear"},
        {cat:"Battery",status:items.some(c=>/batt/i.test(c.complaint))?"green":"green",
          note:items.some(c=>/batt/i.test(c.complaint))?"Replaced":"Holding charge"},
        {cat:"AC",status:items.some(c=>/ac |a\/c/i.test(c.complaint))?"green":"amber",
          note:items.some(c=>/ac /i.test(c.complaint))?"Serviced":"Recommend next visit"},
        {cat:"Lights",status:"green",note:"All working"},
        {cat:"Fluids",status:"green",note:"Topped up"},
        {cat:"Exhaust",status:"green",note:"No leaks"},
        {cat:"Body",status:"green",note:"Condition noted"},
      ];
      nj.timeline = [...(nj.timeline||[]),
        {id:newMsgId(),...now,note:"Vehicle Delivered",by:payload.by||"System",auto:true,type:"system"},
        {id:newMsgId(),...now,note:"Health Report",by:payload.by||"System",auto:true,
          type:"health_report",healthChecks:hc,
          nextDue:j._nextDueDate||"",nextKm:j._nextDueKm||"",nextSvcs:j._nextVisitServices||[]}
      ];
      return nj;
    });
    case "ASSIGN_MECHANIC": return prev.map(j => {
      if (j.jobNo !== payload.jobNo) return j;
      const newMech = MECHANICS.find(m => m.id === payload.mechId);
      const mname = newMech ? newMech.name : "Unassigned";
      const oldMech = j.assignedTo ? MECHANICS.find(m => m.id === j.assignedTo) : null;
      const note = oldMech && oldMech.id !== payload.mechId
        ? "👨‍🔧 Reassigned: " + oldMech.name + " → " + mname
        : "👨‍🔧 Assigned to " + mname;
      return addMsg({ ...j, assignedTo: payload.mechId }, note, payload.by || "System");
    });
    case "UPDATE_SVC_PRICE": return prev.map(j => {
      if (j.jobNo !== payload.jobNo) return j;
      const items = (j.items || []).map((c, i) => i === payload.idx ? { ...c, price: +payload.price || 0 } : c);
      const nj = { ...j, items };
      nj.totalAmount = recalc(nj);
      return nj;
    });
    case "TOGGLE_SERVICE": return prev.map(j => {
      if (j.jobNo !== payload.jobNo) return j;
      const done = j._servicesDone || [];
      const dates = {...(j._serviceDates||{})};
      const wasDone = done.includes(payload.idx);
      const _servicesDone = wasDone ? done.filter(x => x !== payload.idx) : [...done, payload.idx];
      if(!wasDone) dates[payload.idx] = dt()+" "+tm()+" · "+(payload.by||""); else delete dates[payload.idx];
      const svcItem = (j.items||[])[payload.idx];
      const svcName = svcItem ? svcItem.complaint : "Service";
      const nj = {...j, _servicesDone, _serviceDates:dates};
      // If unticking — reset QC so it must be re-verified
      if(wasDone) {
        nj._washDone=false; nj._testDriveDone=false;
        nj._qcPassed=false; nj._custNotified=false;
        if(nj.status==="completed") nj.status="in_progress";
        return addMsg(nj, "↩️ Reopened: "+svcName+" — QC reset", payload.by||"System");
      }
      return addMsg(nj, "✅ Completed: "+svcName+" (by "+(payload.by||"System")+")", payload.by||"System");
    });
    case "TOGGLE_QC": return prev.map(j => {
      if (j.jobNo !== payload.jobNo) return j;
      return addMsg({ ...j, [payload.key]: payload.value }, (payload.value?"✅":"↩️")+" "+payload.label, payload.by);
    });
    case "QC_SAVE": return prev.map(j => {
      if(j.jobNo !== payload.jobNo) return j;
      const updated = {...j, ...payload.checks};
      const allDone = payload.checks._testDriveDone &&
                      payload.checks._qcPassed && payload.checks._custNotified;
      const parts = [];
      if(payload.checks._washDone) parts.push("Washed");
      if(payload.checks._testDriveDone) parts.push("Test Drive");
      if(payload.checks._qcPassed) parts.push("QC Passed");
      if(payload.checks._custNotified) parts.push("Customer Notified");
      const note = allDone
        ? "✅ QC Complete — "+parts.join(" · ")
        : "📋 QC Updated — "+parts.join(" · ");
      if(allDone) updated.status = updated.status==="in_progress"?"completed":updated.status;
      return addMsg(updated, note, payload.by, "qc_result");
    });
    case "ADD_PART": return prev.map(j => {
      if (j.jobNo !== payload.jobNo) return j;
      const _parts = [...(j._parts || []), payload.part];
      const nj = { ...j, _parts }; nj.totalAmount = recalc(nj);
      nj._washDone=false; nj._testDriveDone=false; nj._qcPassed=false; nj._custNotified=false; if(nj.status==="completed") nj.status="in_progress";
      return addMsg(nj, "🔩 Part added: "+payload.part.name+(payload.part.cost>0?" — ₹"+fmtINR(payload.part.cost):""), payload.by);
    });
    case "TOGGLE_PART": return prev.map(j => {
      if (j.jobNo !== payload.jobNo) return j;
      const _parts = (j._parts||[]).map((p,i)=>i===payload.idx?{...p,done:!p.done,
        doneDate:!p.done?dt()+" "+tm():null,
        doneBy:!p.done?(payload.by||""):null}:p);
      return {...j,_parts};
    });
    case "REMOVE_PART": return prev.map(j => {
      if (j.jobNo !== payload.jobNo) return j;
      const _parts = (j._parts||[]).filter((_,i)=>i!==payload.idx);
      const nj={...j,_parts}; nj.totalAmount=recalc(nj); return nj;
    });
    case "REMOVE_OUTSOURCE": return prev.map(j => {
      if (j.jobNo !== payload.jobNo) return j;
      const outsourced = (j.outsourced||[]).filter((_,i)=>i!==payload.idx);
      const nj={...j,outsourced}; nj.totalAmount=recalc(nj); return nj;
    });
    case "ADD_OUTSOURCE": return prev.map(j => {
      if (j.jobNo !== payload.jobNo) return j;
      const outsourced = [...(j.outsourced||[]), payload.item];
      const nj={...j,outsourced}; nj.totalAmount=recalc(nj);
      nj._washDone=false; nj._testDriveDone=false; nj._qcPassed=false; nj._custNotified=false; if(nj.status==="completed") nj.status="in_progress";
      return addMsg(nj,`📤 Outsourced: ${payload.item.service} → ${payload.item.vendor}`,payload.by);
    });
    case "RECV_OUTSOURCE": return prev.map(j => {
      if (j.jobNo !== payload.jobNo) return j;
      const outsourced=(j.outsourced||[]).map((o,i)=>i===payload.idx?{...o,status:"received",receivedDate:dt()}:o);
      return addMsg({...j,outsourced},"📥 Received: "+((j.outsourced||[])[payload.idx]&&(j.outsourced||[])[payload.idx].service||"item"),payload.by);
    });
    case "PAY_VENDOR": return prev.map(j => {
      if (j.jobNo !== payload.jobNo) return j;
      const outsourced=(j.outsourced||[]).map((o,i)=>i===payload.idx?{...o,vendorPaid:true,vendorPaidDate:dt(),vendorPaidBy:payload.by}:o);
      return addMsg({...j,outsourced},"💸 Vendor paid: "+((j.outsourced||[])[payload.idx]&&(j.outsourced||[])[payload.idx].vendor||"vendor")+" ₹"+fmtINR((j.outsourced||[])[payload.idx]&&(j.outsourced||[])[payload.idx].vendorCost||0),payload.by);
    });
    case "UPDATE_DELIVERY": return prev.map(j => j.jobNo !== payload.jobNo ? j : {
      ...j, deliveryDate: payload.deliveryDate,
      timeline: [...(j.timeline || []), { id: newMsgId(), ...now, note: `📅 Delivery date set: ${payload.deliveryDate}`, auto: true, by: payload.by || "System", type: "system" }]
    });
    case "SEND_ESTIMATE": return prev.map(j => {
      if (j.jobNo !== payload.jobNo) return j;
      const sentTime = new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true});
      const ed = payload.estimateData||null;
      const nj = {...j,_estimateSent:true,_estimateSentAt:sentTime,_estimateSnapshot:ed,
        timeline:[...(j.timeline||[]),{id:newMsgId(),...now,
          note:"📄 Estimate saved",by:payload.by,auto:true,
          type:"estimate_card",estimateData:ed}]};
      return nj;
    });
    case "SAVE_REMARKS": return prev.map(j => {
      if(j.jobNo !== payload.jobNo) return j;
      return addMsg({...j, remarks: payload.remarks, _nextVisitServices: payload.nextVisitServices||[],
        _nextDueDate: payload.dueDate||"", _nextDueKm: payload.dueKm||""},
        "📝 Next visit noted", payload.by);
    });
    case "UPDATE_PHOTO": return prev.map(j => {
      if(j.jobNo !== payload.jobNo) return j;
      return addMsg(
        {...j, photos:{...(j.photos||{}), [payload.side]: payload.dataUrl}},
        "📸 "+payload.side.charAt(0).toUpperCase()+payload.side.slice(1)+" photo updated",
        payload.by
      );
    });
    case "UPDATE_PART_PHOTO": return prev.map(j => {
      if(j.jobNo !== payload.jobNo) return j;
      const _parts = (j._parts||[]).map((p,i)=>
        i===payload.idx ? {...p, photo:payload.photo} : p
      );
      return addMsg({...j,_parts}, "📷 Photo added for: "+payload.name, payload.by);
    });
    // ── UNDO actions — reverse workflow steps one by one ──
    case "UNDO_ESTIMATE": return prev.map(j => {
      if(j.jobNo !== payload.jobNo) return j;
      return addMsg({...j, _estimateSent:false, _estimateSentAt:null},
        "↩️ Undo: Estimate reverted", payload.by);
    });
    case "UNDO_SERVICE_DUE": return prev.map(j => {
      if(j.jobNo !== payload.jobNo) return j;
      return addMsg({...j, _nextVisitServices:[], _estimateSent:false, _estimateSentAt:null},
        "↩️ Undo: Service Due cleared", payload.by);
    });
    case "UNDO_NEXT_VISIT": return prev.map(j => {
      if(j.jobNo !== payload.jobNo) return j;
      return addMsg({...j, remarks:"", _nextDueDate:"", _nextDueKm:"",
        _nextVisitServices:[], _estimateSent:false, _estimateSentAt:null},
        "↩️ Undo: Next Visit notes cleared", payload.by);
    });
    case "UNDO_QC": return prev.map(j => {
      if(j.jobNo !== payload.jobNo) return j;
      const nj = {...j, _washDone:false, _testDriveDone:false, _qcPassed:false, _custNotified:false,
        remarks:"", _nextDueDate:"", _nextDueKm:"", _nextVisitServices:[],
        _estimateSent:false, _estimateSentAt:null};
      if(nj.status==="completed") nj.status="in_progress";
      return addMsg(nj, "↩️ Undo: QC reset — status reverted to In Progress", payload.by);
    });
    case "UNDO_WORK": return prev.map(j => {
      if(j.jobNo !== payload.jobNo) return j;
      // Keep services, parts, outsourced as-is — just unlock work and reset downstream
      const nj = {...j, _workUndoneAt:Date.now(),
        _washDone:false, _testDriveDone:false, _qcPassed:false, _custNotified:false,
        remarks:"", _nextDueDate:"", _nextDueKm:"", _nextVisitServices:[],
        _estimateSent:false, _estimateSentAt:null};
      if(nj.status==="completed") nj.status="in_progress";
      return addMsg(nj, "↩️ Undo: Work unlocked — QC and downstream reset", payload.by);
    });
    default: return prev;
  }
}

// ---
// SMALL COMPONENTS
// ---

function Avatar({ name, size = 40, bg, fg }) {
  const initials = (name || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const colors = ["#3B6D11","#6B6EFF","#F0AD00","#A32D2D","#3B82F6","#8B5CF6"];
  const color = bg || colors[name ? name.charCodeAt(0) % colors.length : 0];
  return (
    <div style={{width:size,height:size,borderRadius:"50%",background:color,
      display:"flex",alignItems:"center",justifyContent:"center",
      fontSize:size*0.38,fontWeight:700,color:fg||"#fff",flexShrink:0,fontFamily:T.font}}>
      {initials}
    </div>
  );
}

function StatusPill({ status, small }) {
  const m = STATUS_META[status] || STATUS_META.open;
  return (
    <span style={{
      display:"inline-flex",alignItems:"center",gap:3,
      padding:small?"2px 7px":"3px 10px",borderRadius:20,
      background:m.color+"22",color:m.color,
      fontSize:small?10:11,fontWeight:700,fontFamily:T.font,
    }}>
      <span style={{fontSize:small?9:10}}>{m.icon}</span>
      {m.label}
    </span>
  );
}

// ---
// SIDEBAR
// ---
// ---
// JOB LIST SCREEN — full-width mobile WhatsApp style
// ---
function JobListScreen({ jobs, user, staffMsgs, onSelect, onNewCheckin, onStaffChat, onLogout, lang, setLang, expenses, setExpenses, inventory, setInventory }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("active");
  const [showDash, setShowDash] = useState(false);
  const isMech = user.role === "mechanic";

  const hasDues = j => {
    if(j.status !== "delivered") return false;
    const pd=(j.payments||[]).reduce((s,p)=>s+p.amount,0);
    return Math.max(0,(j.totalAmount||0)-pd)>0;
  };

  const today2 = dt();
  const in7 = (()=>{const d=new Date();d.setDate(d.getDate()+7);return d.toISOString().slice(0,10);})();

  // Follow-up: delivered + next service date within 7 days
  const isFollowUp = j => j.status==="delivered" && j._nextDueDate && j._nextDueDate>=today2 && j._nextDueDate<=in7;
  // Overdue: delivered + next service date has passed
  const isOverdue = j => j.status==="delivered" && j._nextDueDate && j._nextDueDate<today2;

  const filtered = jobs.filter(j => {
    if(isMech && j.assignedTo !== user.id) return false;
    if(isMech && j.status==="delivered") return false;
    const q = search.toLowerCase();
    const ms = !q || (j.name||"").toLowerCase().includes(q) || (j.regNo||"").toLowerCase().includes(q)
      || (j.brand||"").toLowerCase().includes(q) || (j.model||"").toLowerCase().includes(q)
      || (j.phone||"").includes(q);
    const mf = filter==="all" || j.status===filter
      || (filter==="active" && ["open","in_progress"].includes(j.status))
      || (filter==="dues"   && hasDues(j))
      || (filter==="remind" && j.status==="delivered" && (j._nextDueDate||j._nextDueKm))
      || (filter==="followup" && isFollowUp(j))
      || (filter==="overdue" && isOverdue(j));
    return ms && mf;
  });

  const remindCount = jobs.filter(j=>j.status==="delivered"&&(j._nextDueDate||j._nextDueKm)).length;
  const followUpCount = jobs.filter(j=>isFollowUp(j)).length;
  const overdueCount = jobs.filter(j=>isOverdue(j)).length;
  const mechJobs = isMech ? jobs.filter(j=>j.assignedTo===user.id&&j.status!=="delivered") : jobs;
  const counts = {
    all: mechJobs.length,
    active: mechJobs.filter(j=>["open","in_progress"].includes(j.status)).length,
    completed: mechJobs.filter(j=>j.status==="completed").length,
    delivered: isMech ? 0 : jobs.filter(j=>j.status==="delivered").length,
    dues: isMech ? 0 : jobs.filter(j=>hasDues(j)).length,
    remind: isMech ? 0 : remindCount,
    followup: followUpCount,
    overdue: overdueCount,
  };

  // staffMsgs available for staff chat screen

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:"#FAFAF8",position:"relative",fontFamily:T.font}}>
      {showDash&&<AdminDashboard jobs={jobs} expenses={expenses} setExpenses={setExpenses} inventory={inventory} setInventory={setInventory} onClose={()=>setShowDash(false)}/>}

      {/* Header — clean, warm */}
      <div style={{background:"#FFFFFF",padding:"12px 16px 10px",flexShrink:0,position:"relative"}}>
        {/* Top row: title + action icons */}
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
          <div style={{flex:1,fontSize:17,fontWeight:700,color:"#1B1B1A",fontFamily:T.font,letterSpacing:"0.2px"}}>
            {isMech ? "My Jobs" : GARAGE.name}
          </div>
          {!isMech && (
            <button onClick={onNewCheckin}
              style={{width:34,height:34,borderRadius:10,background:"#3B6D11",border:"none",
                cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
                color:"#FFFFFF",fontSize:22,fontWeight:400,lineHeight:1}}>
              +
            </button>
          )}
          <button onClick={()=>setLang(l=>l==="en"?"ta":l==="ta"?"hi":"en")}
            title={lang==="en"?"Switch to Tamil":lang==="ta"?"Switch to Hindi":"Switch to English"}
            style={{width:34,height:34,borderRadius:10,background:"#F1EFE8",border:"none",
              cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:11,fontWeight:800,color:"#3B6D11",fontFamily:T.mono}}>
            {lang==="en"?"EN":lang==="ta"?"தமி":"हिं"}
          </button>
          {user.role==="admin"&&(
            <button onClick={()=>setShowDash(true)}
              title="Dashboard"
              style={{width:34,height:34,borderRadius:10,background:"#F1EFE8",border:"none",
                cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="7" height="7" rx="2" stroke="#3B6D11" strokeWidth="1.5"/>
                <rect x="14" y="3" width="7" height="7" rx="2" stroke="#3B6D11" strokeWidth="1.5"/>
                <rect x="3" y="14" width="7" height="7" rx="2" stroke="#3B6D11" strokeWidth="1.5"/>
                <rect x="14" y="14" width="7" height="7" rx="2" stroke="#3B6D11" strokeWidth="1.5"/>
              </svg>
            </button>
          )}
        </div>

        {/* Always-visible WhatsApp-style search bar */}
        <div style={{background:"#F1EFE8",borderRadius:24,padding:"9px 16px",
          display:"flex",alignItems:"center",gap:8,marginBottom:0}}>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search or start a new job"
            style={{flex:1,background:"transparent",border:"none",outline:"none",
              fontSize:13,fontFamily:T.font,color:"#1B1B1A"}}/>
          {search?(
            <button onClick={()=>setSearch("")}
              style={{background:"none",border:"none",cursor:"pointer",
                color:"#888780",fontSize:18,lineHeight:1,padding:0}}>×</button>
          ):(
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="#888780" strokeWidth="1.6"/>
              <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="#888780" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          )}
        </div>
      </div>

      {/* Filter pills — separate row with own background */}
      <div style={{background:"#FAFAF8",borderBottom:"0.5px solid #E5E4DF",
        padding:"10px 16px",display:"flex",gap:6,overflowX:"auto",flexShrink:0,scrollbarWidth:"none"}}>
        {[{k:"all",l:"All"},{k:"active",l:"Active"},{k:"completed",l:"QC"},
          ...(!isMech?[{k:"delivered",l:"Done"},{k:"followup",l:"Follow Up"},{k:"overdue",l:"Overdue"}]:[])
        ].map(f=>(
          <button key={f.k} onClick={()=>setFilter(f.k)}
            style={{padding:"6px 14px",border:"none",cursor:"pointer",
              fontFamily:T.font,fontSize:12,fontWeight:filter===f.k?600:400,
              borderRadius:20,whiteSpace:"nowrap",flexShrink:0,
              background:filter===f.k?"#3B6D11":(f.k==="overdue"&&counts.overdue>0?"#FFF0F0":
                f.k==="followup"&&counts.followup>0?"#FFF8E7":"#EEEDEB"),
              color:filter===f.k?"#FFFFFF":(f.k==="overdue"&&counts.overdue>0?"#A32D2D":
                f.k==="followup"&&counts.followup>0?"#854F0B":"#888780")}}>
            {f.l}
          </button>
        ))}
      </div>

      {/* Job cards */}
      <div style={{flex:1,overflowY:"auto",padding:"8px 12px"}}>
        {filtered.length===0&&(
          <div style={{padding:48,textAlign:"center",color:"#888780"}}>
            <div style={{fontSize:15,fontWeight:600,color:"#1B1B1A",marginBottom:6}}>
              {search?"No results":isMech?"No jobs assigned":"No jobs yet"}</div>
            <div style={{fontSize:13}}>{isMech?"Your manager will assign vehicles.":"Tap + New to check in."}</div>
          </div>
        )}
        {filtered.map(j=>{
          const paid=(j.payments||[]).reduce((s,p)=>s+p.amount,0);
          const bal=Math.max(0,(j.totalAmount||0)-paid);
          const mech=MECHANICS.find(m=>m.id===j.assignedTo);
          const svcDone=(j._servicesDone||[]).length;
          const svcTotal=(j.items||[]).length;
          const pct=svcTotal>0?Math.round(svcDone/svcTotal*100):0;
          const sc={
            open:{bg:"#E6F1FB",c:"#185FA5",l:"OPEN"},
            in_progress:{bg:"#FAEEDA",c:"#854F0B",l:"IN PROGRESS"},
            completed:{bg:"#EAF3DE",c:"#3B6D11",l:"COMPLETED"},
            delivered:{bg:"#F1EFE8",c:"#5F5E5A",l:"DELIVERED"}
          }[j.status]||{bg:"#1A2D42",c:"#185FA5",l:"OPEN"};
          return(
            <div key={j.jobNo} onClick={()=>onSelect(j.jobNo)}
              style={{background:"#fff",borderRadius:14,padding:"14px 16px",marginBottom:8,border:"0.5px solid #E5E4DF",
                cursor:"pointer",border:"1px solid #2A272322",
                transition:"transform .1s,background .1s"}}
              onMouseEnter={e=>{e.currentTarget.style.background="#F9F8F5";e.currentTarget.style.transform="scale(1.005)";}}
              onMouseLeave={e=>{e.currentTarget.style.background="#fff";e.currentTarget.style.transform="scale(1)";}}>
              {/* Top row: plate + status */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontSize:15,fontWeight:700,fontFamily:T.mono,color:"#1B1B1A",letterSpacing:1}}>{j.regNo}</div>
                <span style={{fontSize:10,fontWeight:600,fontFamily:T.font,padding:"3px 10px",borderRadius:12,
                  background:sc.bg,color:sc.c,letterSpacing:"0.2px"}}>{sc.l}</span>
                {j._reopened&&j.status!=="delivered"&&(
                  <span style={{fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:10,
                    background:"#FEF3C7",color:"#854F0B",marginLeft:4}}>REWORK</span>
                )}
              </div>
              {/* Middle: customer + vehicle */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}>
                <div>
                  <span style={{fontSize:14,fontWeight:500,color:"#1B1B1A"}}>{j.name}</span>
                  <span style={{fontSize:12,color:"#888780",marginLeft:8}}>{j.brand} {j.model}</span>
                </div>
                <span style={{fontSize:12,fontFamily:T.mono,color:"#888780"}}>#{j.jobNo}</span>
              </div>
              {/* Bottom row: meta */}
              <div style={{display:"flex",alignItems:"center",gap:12,fontSize:11,color:"#888780"}}>
                <span>{fmtDate(j.date)}</span>
                {mech&&!isMech&&<span style={{color:"#3B6D11"}}>{mech.name}</span>}
                {svcTotal>0&&(
                  <div style={{flex:1,display:"flex",alignItems:"center",gap:6}}>
                    <div style={{flex:1,height:3,background:"#E5E4DF",borderRadius:2,overflow:"hidden",maxWidth:80}}>
                      <div style={{width:pct+"%",height:"100%",background:pct===100?"#3B6D11":"#3B6D11",borderRadius:2}}/>
                    </div>
                    <span style={{fontFamily:T.mono,fontSize:10}}>{svcDone}/{svcTotal}</span>
                  </div>
                )}
                {bal>0&&user.role==="admin"&&(
                  <span style={{fontFamily:T.mono,color:"#A32D2D",fontWeight:600}}>{fmtINR(bal)}</span>
                )}
              </div>
              {/* Follow-up details — visible only in followup/overdue filter */}
              {(filter==="followup"||filter==="overdue")&&j._nextDueDate&&(
                <div style={{marginTop:8,padding:"8px 10px",background:filter==="overdue"?"#FFF0F0":"#FFF8EE",
                  borderRadius:8,border:"1px solid "+(filter==="overdue"?"#FECACA":"#FDE68A")}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <span style={{fontSize:10,fontWeight:700,color:filter==="overdue"?"#A32D2D":"#854F0B"}}>
                      {filter==="overdue"?"OVERDUE":"NEXT SERVICE"}
                    </span>
                    <span style={{fontSize:11,fontWeight:600,color:filter==="overdue"?"#A32D2D":"#854F0B",fontFamily:T.mono}}>
                      {fmtDate(j._nextDueDate)}{j._nextDueKm?" \u00b7 "+j._nextDueKm+" km":""}
                    </span>
                  </div>
                  {(j._nextVisitServices||[]).length>0&&(
                    <div style={{fontSize:10,color:"#888780",marginBottom:6}}>
                      {(j._nextVisitServices||[]).join(" \u00b7 ")}
                    </div>
                  )}
                  <button onClick={(e)=>{
                    e.stopPropagation();
                    const daysDiff = Math.ceil((new Date(j._nextDueDate)-new Date())/(1000*60*60*24));
                    const msg = filter==="overdue"
                      ?"Hi "+j.name+", your *"+j.brand+" "+j.model+"* ("+j.regNo+") service was due on *"+fmtDate(j._nextDueDate)+"*."
                        +(j._nextVisitServices?.length>0?"\n\nServices due: "+(j._nextVisitServices||[]).join(", "):"")
                        +"\n\nPlease schedule your visit at your earliest convenience.\n\n"+GARAGE.name+" | "+GARAGE.phone
                      :"Hi "+j.name+", your *"+j.brand+" "+j.model+"* ("+j.regNo+") next service is due on *"+fmtDate(j._nextDueDate)+"*"
                        +(j._nextDueKm?" at "+j._nextDueKm+" km":"")+"."
                        +(j._nextVisitServices?.length>0?"\n\nRecommended: "+(j._nextVisitServices||[]).join(", "):"")
                        +"\n\nBook now to keep your vehicle in top condition!\n\n"+GARAGE.name+" | "+GARAGE.phone;
                    sendWA(j.phone,msg);showFlash("Reminder sent to "+j.name);
                  }}
                    style={{padding:"4px 10px",borderRadius:6,border:"none",
                      background:"#25D366",cursor:"pointer",display:"inline-flex",
                      alignItems:"center",gap:4}}>
                    <span style={{fontSize:10,fontWeight:600,color:"#fff"}}>Send Reminder</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}



function SystemPill({ msg }) {
  return (
    <div style={{display:"flex",justifyContent:"center",margin:"6px 0"}}>
      <span style={{background:"#F5F4F0",color:T.textMuted,fontSize:11,
        padding:"4px 14px",borderRadius:14,fontFamily:T.font,maxWidth:400,textAlign:"center"}}>
        {msg.note}
      </span>
    </div>
  );
}

function MessageBubble({ msg, isSent, userName }) {
  const isSentMsg = isSent;
  return (
    <div style={{display:"flex",justifyContent:isSentMsg?"flex-end":"flex-start",margin:"2px 0",padding:"0 12px"}}>
      <div style={{maxWidth:"72%"}}>
        {!isSentMsg&&<div style={{fontSize:11,color:T.green,fontWeight:600,marginBottom:2,marginLeft:2,fontFamily:T.font}}>{msg.by}</div>}
        <div style={{
          background:isSentMsg?T.sent:T.recv,
          borderRadius:isSentMsg?"12px 2px 12px 12px":"2px 12px 12px 12px",
          padding:"8px 12px",
          boxShadow:"0 1px 3px rgba(0,0,0,0.3)",
        }}>
          {msg.dataUrl&&(
            <img src={msg.dataUrl} alt="photo" style={{width:"100%",maxWidth:220,borderRadius:6,display:"block",marginBottom:4}}/>
          )}
          <div style={{fontSize:13,color:T.recvText,fontFamily:T.font,lineHeight:1.5,wordBreak:"break-word"}}>{msg.note}</div>
          <div style={{fontSize:10,color:T.textMuted,textAlign:"right",marginTop:4,display:"flex",justifyContent:"flex-end",gap:4}}>
            {fmtTime(msg.time)}
            {isSentMsg&&<span style={{color:T.green}}>✓✓</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---
// JOB INFO CARD (shown as first message in chat)
// ---
function JobInfoCard({ job, user, dispatch, showFlash }) {
  const [editDelivery, setEditDelivery] = useState(false);
  const [newDel, setNewDel] = useState(job.deliveryDate || "");
  const checkinItems = job._checkinSnapshot || (job.items||[]).filter(c=>c.fromCheckin);
  const paid = (job.payments || []).reduce((s, p) => s + p.amount, 0);
  const bal = Math.max(0, (job.totalAmount || 0) - paid);
  const isMech = user&&user.role==="mechanic";
  const mechName = job.assignedTo ? ((MECHANICS.find(m=>m.id===job.assignedTo)||{}).name||"") : "";

  return (
    <div style={{margin:"4px 8px 6px"}}>
      <div style={{background:T.recv,borderRadius:12,overflow:"hidden",borderLeft:"4px solid "+(STATUS_META[job.status]||STATUS_META.open).color}}>

        {/* Plate */}
        <div style={{padding:"12px 14px",borderBottom:"1px solid "+T.border}}>
          <div style={{background:"#FFFDE7",borderRadius:8,padding:"10px 12px",textAlign:"center",
            marginBottom:10,border:"2px solid #222"}}>
            <div style={{fontFamily:T.mono,fontWeight:900,fontSize:20,color:"#111",letterSpacing:5}}>{job.regNo}</div>
          </div>
          {/* Details grid */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px 12px",fontSize:12}}>
            {!isMech&&<div><span style={{color:T.textMuted}}>Customer</span><br/><span style={{color:T.text,fontWeight:600}}>{job.name}</span></div>}
            {!isMech&&job.phone&&<div><span style={{color:T.textMuted}}>Phone</span><br/><span style={{color:T.text,fontFamily:T.mono}}>{job.phone}</span></div>}
            <div><span style={{color:T.textMuted}}>Vehicle</span><br/><span style={{color:T.text}}>{job.brand} {job.model}</span></div>
            {job.fuel&&<div><span style={{color:T.textMuted}}>Fuel</span><br/><span style={{color:T.text}}>{job.fuel}</span></div>}
            {job.kms&&<div><span style={{color:T.textMuted}}>KM</span><br/><span style={{color:T.text}}>{job.kms}</span></div>}
            {mechName&&<div><span style={{color:T.textMuted}}>Mechanic</span><br/><span style={{color:T.green}}>{mechName}</span></div>}
          </div>
        </div>

        {/* Delivery */}
        <div style={{padding:"8px 14px",borderBottom:"1px solid "+T.border,display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:11,color:T.textMuted}}>📅 Delivery:</span>
          {editDelivery?(
            <div style={{display:"flex",gap:4,flex:1}}>
              <input type="date" value={newDel} onChange={e=>setNewDel(e.target.value)}
                style={{flex:1,background:"#FFFFFF",border:"1px solid "+T.border,borderRadius:8,padding:"4px 8px",
                  color:T.text,fontSize:11,fontFamily:T.font,outline:"none",colorScheme:"light"}}/>
              <button onClick={()=>{dispatch("UPDATE_DELIVERY",{jobNo:job.jobNo,deliveryDate:newDel,by:user.name});setEditDelivery(false);showFlash("📅 Updated");}}
                style={{padding:"3px 7px",background:T.green,border:"none",borderRadius:5,color:"#fff",fontSize:11,cursor:"pointer"}}>✓</button>
            </div>
          ):(
            <span onClick={()=>setEditDelivery(true)} style={{fontSize:12,color:T.green,cursor:"pointer",fontWeight:600,fontFamily:T.font}}>
              {job.deliveryDate||"Set date ✏️"}
            </span>
          )}
        </div>

        {/* Work requested */}
        {checkinItems.length>0&&(
          <div style={{padding:"10px 14px",borderBottom:"1px solid "+T.border}}>
            <div style={{fontSize:10,fontWeight:600,color:T.textMuted,letterSpacing:.4,marginBottom:6}}>WORK REQUESTED</div>
            {checkinItems.map((c,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"3px 0"}}>
                <span style={{color:T.text}}>{i+1}. {c.complaint}</span>
                {c.price>0&&<span style={{color:T.green,fontFamily:T.mono,fontWeight:700}}>₹{fmtINR(c.price)}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Belongings */}
        {job.belongings&&Object.values(job.belongings).some(v=>v===true||v>0)&&(
          <div style={{padding:"8px 14px",borderBottom:"1px solid "+T.border}}>
            <div style={{fontSize:10,fontWeight:600,color:T.textMuted,letterSpacing:.4,marginBottom:4}}>BELONGINGS</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
              {BELONGS.filter(b=>{const v=job.belongings[b.k];return v===true||v>0;}).map(b=>(
                <span key={b.k} style={{fontSize:11,padding:"2px 8px",borderRadius:10,background:T.border,color:T.text,fontFamily:T.font}}>
                  {b.l}{b.qty&&job.belongings[b.k]>0?" ×"+job.belongings[b.k]:""}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Payment */}
        {!isMech&&(
          <div style={{padding:"8px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            {paid>0 ? (
              <>
                <div>
                  <div style={{fontSize:10,color:T.textMuted}}>Advance</div>
                  <div style={{fontSize:14,fontFamily:T.mono,fontWeight:700,color:T.green}}>₹{fmtINR(paid)}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:10,color:T.textMuted}}>Pending</div>
                  <div style={{fontSize:14,fontFamily:T.mono,fontWeight:700,color:bal>0?"#F0AD00":T.textMuted}}>
                    {bal>0?"₹"+fmtINR(bal):"To be billed"}
                  </div>
                </div>
              </>
            ) : (
              <div>
                <div style={{fontSize:10,color:T.textMuted}}>Payment</div>
                <div style={{fontSize:12,color:T.textMuted}}>No advance</div>
              </div>
            )}
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:10,color:T.textMuted}}>{fmtDate(job.date)}</div>
              <div style={{fontSize:11,color:T.textMuted}}>#{job.jobNo}</div>
            </div>
          </div>
        )}
        {isMech&&(
          <div style={{padding:"6px 14px",fontSize:10,color:T.textMuted,textAlign:"right"}}>{fmtDate(job.date)} · #{job.jobNo}</div>
        )}
      </div>
    </div>
  );
}

// ---
// SERVICES PANEL (tab)
// ---


// ---
// VEHICLE PHOTOS CARD — shows check-in photos in the chat
// ---
function ServiceHistory({ regNo, jobs, currentJobNo }) {
  const past = jobs.filter(j => j.regNo === regNo && j.jobNo !== currentJobNo)
    .sort((a,b) => b.jobNo - a.jobNo);
  if (past.length === 0) return null;
  return (
    <div style={{margin:"6px 10px",background:"#F5F4F0",borderRadius:12,border:"1px solid #E5E4DF"}}>
      <div style={{padding:"8px 13px",borderBottom:"1px solid #E5E4DF",display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:14}}>🕐</span>
        <span style={{fontSize:12,fontWeight:700,color:"#E9EDEF",fontFamily:T.font}}>Service History — {past.length} previous visit{past.length!==1?"s":""}</span>
      </div>
      {past.map((j,i) => {
        const paid=(j.payments||[]).reduce((s,p)=>s+p.amount,0);
        return (
          <div key={j.jobNo} style={{padding:"8px 13px",borderBottom:i<past.length-1?"1px solid #2A3942":""}} >
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
              <span style={{fontSize:11,color:"#888780"}}>#{j.jobNo} · {fmtDate(j.date)} · {j.name}</span>
              <span style={{fontSize:10,fontWeight:700,padding:"1px 7px",borderRadius:10,
                background:((s)=>({open:"#F0AD0022",in_progress:"#00A88422",completed:"#6B6EFF22",delivered:"#8696A022"})[s]||"#E5E4DF")(j.status),
                color:((s)=>({open:"#F0AD00",in_progress:"#3B6D11",completed:"#6B6EFF",delivered:"#888780"})[s]||"#888780")(j.status)}}>
                {j.status.replace("_"," ")}
              </span>
            </div>
            {(j.items||[]).map((c,ci) => (
              <div key={ci} style={{display:"flex",justifyContent:"space-between",fontSize:11,padding:"1px 0"}}>
                <span style={{color:"#888780",marginRight:4}}>{ci+1}.</span>
                <span style={{flex:1,color:"#E9EDEF"}}>{c.complaint}</span>
                {c.price>0&&<span style={{color:"#3B6D11",fontFamily:"'Courier New',monospace",fontWeight:700}}>₹{fmtINR(c.price)}</span>}
              </div>
            ))}
            {j.remarks&&(
              <div style={{marginTop:5,padding:"4px 6px",background:"#F5F4F0",borderRadius:5,
                borderLeft:"2px solid #00A884"}}>
                <div style={{fontSize:9,color:"#888780",marginBottom:1}}>📝 Notes from that visit:</div>
                <div style={{fontSize:11,color:"#3B6D11"}}>{j.remarks}</div>
              </div>
            )}
            {paid>0&&(
              <div style={{fontSize:10,color:"#3B6D11",marginTop:3,textAlign:"right"}}>
                Paid: ₹{fmtINR(paid)} · Total: ₹{fmtINR(j.totalAmount)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---
// FEATURE 2: INVOICE PRINT
// ---
function VehiclePhotosCard({ job, user, dispatch, showFlash }) {
  const [fullscreen,  setFullscreen]  = useState(null);
  const [annotating,  setAnnotating]  = useState(null); // side being annotated
  const inputRefs = useRef({});
  const photos  = job.photos || {};
  const sides   = ["front","rear","left","right"];
  const labels  = {front:"⬆️ Front",rear:"⬇️ Rear",left:"◀️ Left",right:"▶️ Right"};
  const hasSome = sides.some(s=>photos[s]);
  const canEdit = user && user.role !== "mechanic";

  if(!job.photos) return null;

  const handleFile = (side, file) => {
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale  = Math.min(1, 1200/Math.max(img.width,img.height));
        canvas.width  = img.width  * scale;
        canvas.height = img.height * scale;
        canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg",0.82);
        dispatch("UPDATE_PHOTO",{jobNo:job.jobNo,side,dataUrl,by:user?.name||"?"});
        showFlash&&showFlash("📸 "+labels[side]+" updated");
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const makeSample = (side) => {
    const colors={front:"#1a3a5c",rear:"#2d1a5c",left:"#1a5c2d",right:"#5c3a1a"};
    const cv=document.createElement("canvas"); cv.width=400; cv.height=280;
    const ctx=cv.getContext("2d");
    const g=ctx.createLinearGradient(0,0,400,280);
    g.addColorStop(0,colors[side]||"#1a3a5c"); g.addColorStop(1,"#FFFFFF");
    ctx.fillStyle=g; ctx.fillRect(0,0,400,280);
    ctx.fillStyle="rgba(0,0,0,0.06)";
    ctx.beginPath(); ctx.roundRect(60,100,280,100,12); ctx.fill();
    ctx.beginPath(); ctx.roundRect(100,70,200,80,20); ctx.fill();
    [100,300].forEach(x=>{
      ctx.fillStyle="rgba(255,255,255,0.07)";
      ctx.beginPath(); ctx.arc(x,200,30,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle="rgba(255,255,255,0.18)"; ctx.lineWidth=4;
      ctx.beginPath(); ctx.arc(x,200,26,0,Math.PI*2); ctx.stroke();
    });
    ctx.fillStyle="rgba(255,255,255,0.75)"; ctx.font="bold 16px Segoe UI,sans-serif";
    ctx.textAlign="center"; ctx.fillText(labels[side],200,36);
    const dataUrl=cv.toDataURL("image/jpeg",0.85);
    dispatch("UPDATE_PHOTO",{jobNo:job.jobNo,side,dataUrl,by:user?.name||"?"});
    showFlash&&showFlash("✨ "+labels[side]+" sample added");
  };

  // PhotoAnnotator is open
  if(annotating) {
    return (
      <div style={{margin:"4px 10px 6px"}}>
        <PhotoAnnotator
          photo={photos[annotating]}
          side={labels[annotating]}
          onSave={dataUrl=>{
            dispatch("UPDATE_PHOTO",{jobNo:job.jobNo,side:annotating,dataUrl,by:user?.name||"?"});
            showFlash&&showFlash("✏️ Damage marked on "+labels[annotating]);
            setAnnotating(null);
          }}
          onClose={()=>setAnnotating(null)}
        />
      </div>
    );
  }

  return (
    <div style={{margin:"4px 10px 6px",background:"#F5F4F0",borderRadius:12,
      border:"1px solid #E5E4DF",overflow:"hidden"}}>

      {/* Header */}
      <div style={{padding:"7px 12px",borderBottom:"1px solid #E5E4DF",
        display:"flex",alignItems:"center",gap:7}}>
        <span style={{fontSize:13}}>📸</span>
        <span style={{fontSize:12,fontWeight:700,color:T.text,fontFamily:T.font,flex:1}}>
          Vehicle Photos
        </span>
        <span style={{fontSize:10,color:hasSome?T.green:T.textMuted,fontWeight:hasSome?600:400}}>
          {hasSome?sides.filter(s=>photos[s]).length+"/4 captured":"No photos yet"}
        </span>
      </div>

      {/* Photo grid */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:2,padding:2}}>
        {sides.map(side=>{
          const src=photos[side];
          return (
            <div key={side} style={{position:"relative",height:110,
              background:"#FFFFFF",overflow:"hidden",borderRadius:4}}>

              <input ref={el=>inputRefs.current[side]=el}
                type="file" accept="image/*" style={{display:"none"}}
                onChange={e=>handleFile(side,e.target.files&&e.target.files[0])}/>

              {src ? (
                <>
                  <img src={src} alt={side}
                    style={{width:"100%",height:"100%",objectFit:"cover",
                      display:"block",cursor:"pointer"}}
                    onClick={()=>setFullscreen(side)}/>
                  {/* Action bar on captured photo */}
                  <div style={{position:"absolute",bottom:0,left:0,right:0,
                    padding:"3px 4px",background:"rgba(0,0,0,0.72)",
                    display:"flex",alignItems:"center",gap:3}}>
                    <span style={{fontSize:8,color:"rgba(0,0,0,0.4)",
                      flex:1,fontFamily:T.font}}>{labels[side]}</span>
                    {canEdit&&(
                      <>
                        <button onClick={e=>{e.stopPropagation();setAnnotating(side);}}
                          style={{padding:"1px 5px",background:"#F59E0B",
                            border:"none",borderRadius:3,cursor:"pointer",
                            fontSize:9,color:"#fff",fontFamily:T.font,fontWeight:700}}>
                          ✏️
                        </button>
                        <button onClick={e=>{e.stopPropagation();inputRefs.current[side]&&inputRefs.current[side].click();}}
                          style={{padding:"1px 5px",background:"rgba(255,255,255,0.18)",
                            border:"none",borderRadius:3,cursor:"pointer",
                            fontSize:9,color:"#fff",fontFamily:T.font}}>
                          🔄
                        </button>
                      </>
                    )}
                  </div>
                </>
              ) : (
                canEdit ? (
                  <div style={{width:"100%",height:"100%",display:"flex",
                    flexDirection:"column",overflow:"hidden",borderRadius:4,
                    border:"1.5px dashed #2A3942"}}>
                    <button onClick={()=>inputRefs.current[side]&&inputRefs.current[side].click()}
                      style={{flex:1,background:"transparent",border:"none",
                        cursor:"pointer",display:"flex",flexDirection:"column",
                        alignItems:"center",justifyContent:"center",gap:3,
                        borderBottom:"1px solid #E5E4DF"}}>
                      <span style={{fontSize:20,opacity:.4}}>📷</span>
                      <span style={{fontSize:10,color:T.green,fontWeight:600,
                        fontFamily:T.font}}>Upload</span>
                      <span style={{fontSize:8,color:T.textMuted}}>{labels[side]}</span>
                    </button>
                    <button onClick={()=>makeSample(side)}
                      style={{padding:"4px 0",background:"transparent",border:"none",
                        cursor:"pointer",fontSize:9,color:T.textMuted,
                        fontFamily:T.font,display:"flex",alignItems:"center",
                        justifyContent:"center",gap:3}}>
                      ✨ Sample
                    </button>
                  </div>
                ) : (
                  <div style={{width:"100%",height:"100%",display:"flex",
                    flexDirection:"column",alignItems:"center",justifyContent:"center",
                    gap:4,border:"1.5px dashed #2A3942",borderRadius:4}}>
                    <span style={{fontSize:20,opacity:.25}}>📷</span>
                    <span style={{fontSize:9,color:"#B4B2A9",fontFamily:T.font}}>
                      {labels[side]}
                    </span>
                    <span style={{fontSize:8,color:"#E5E4DF"}}>Not captured</span>
                  </div>
                )
              )}
            </div>
          );
        })}
      </div>

      {/* Fullscreen overlay */}
      {fullscreen&&(
        <div onClick={()=>setFullscreen(null)}
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,.93)",
            zIndex:9999,display:"flex",flexDirection:"column",
            alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
          <img src={photos[fullscreen]} alt={fullscreen}
            style={{maxWidth:"100%",maxHeight:"78vh",objectFit:"contain",borderRadius:8}}/>
          {/* Actions */}
          {canEdit&&(
            <div style={{display:"flex",gap:8,marginTop:12}} onClick={e=>e.stopPropagation()}>
              <button onClick={()=>{setFullscreen(null);setAnnotating(fullscreen);}}
                style={{padding:"7px 16px",background:"#F59E0B",border:"none",
                  borderRadius:8,color:"#fff",fontSize:12,fontWeight:700,
                  cursor:"pointer",fontFamily:T.font}}>
                ✏️ Mark Damage
              </button>
              <button onClick={()=>{setFullscreen(null);inputRefs.current[fullscreen]&&inputRefs.current[fullscreen].click();}}
                style={{padding:"7px 16px",background:"rgba(0,0,0,0.04)",border:"none",
                  borderRadius:8,color:"#fff",fontSize:12,cursor:"pointer",fontFamily:T.font}}>
                🔄 Replace
              </button>
            </div>
          )}
          <div style={{marginTop:10,fontSize:12,color:"rgba(255,255,255,0.55)",
            fontFamily:T.font}}>{labels[fullscreen]} · tap outside to close</div>
          <div style={{display:"flex",gap:10,marginTop:10}}>
            {sides.filter(s=>photos[s]).map(s=>(
              <button key={s} onClick={e=>{e.stopPropagation();setFullscreen(s);}}
                style={{padding:"4px 12px",borderRadius:14,border:"none",cursor:"pointer",
                  fontFamily:T.font,fontSize:10,fontWeight:600,
                  background:fullscreen===s?"#fff":"rgba(0,0,0,0.06)",
                  color:fullscreen===s?"#FAFAF8":"#fff"}}>
                {labels[s]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


function printInvoice(job) {
  const paid=(job.payments||[]).reduce((s,p)=>s+p.amount,0);
  const bal=Math.max(0,(job.totalAmount||0)-paid);
  const rows=(job.items||[]).map((c,i)=>`
    <tr><td>${i+1}</td><td>${c.complaint}</td><td style="text-align:right">₹${fmtINR(c.price)}</td></tr>`).join("");
  const partRows=(job._parts||[]).filter(p=>p.type==="new").map(p=>`
    <tr><td></td><td>🔩 ${p.name}</td><td style="text-align:right">₹${fmtINR(p.cost)}</td></tr>`).join("");
  const payRows=(job.payments||[]).map((p,i)=>`
    <tr><td>${i+1}</td><td>${p.method} · ${p.date} · ${p.by}</td><td style="text-align:right">₹${fmtINR(p.amount)}</td></tr>`).join("");
  const html=`<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>Job Card #${job.jobNo}</title>
  <style>
    body{font-family:'Segoe UI',sans-serif;padding:28px;max-width:540px;margin:0 auto;color:#111}
    h1{color:#075E54;font-size:20px;margin-bottom:2px}
    .sub{color:#666;font-size:13px;margin-bottom:16px}
    .plate{background:#FFFDE7;border:2px solid #333;border-radius:6px;padding:8px 16px;
      font-family:'Courier New',monospace;font-weight:900;font-size:22px;letter-spacing:4px;
      display:inline-block;margin-bottom:12px}
    .info{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:16px;font-size:13px}
    .info span{color:#666}
    table{width:100%;border-collapse:collapse;margin:10px 0}
    th{background:#f5f5f5;padding:7px 8px;text-align:left;font-size:12px;color:#555}
    td{padding:6px 8px;border-bottom:1px solid #eee;font-size:13px}
    .total{font-weight:bold;font-size:16px;color:#075E54}
    .bal{color:#c0392b;font-weight:bold}
    .paid{color:#27ae60}
    .section{margin-top:16px;padding-top:12px;border-top:2px solid #eee}
    .footer{margin-top:24px;padding-top:12px;border-top:1px solid #eee;font-size:12px;color:#888;text-align:center}
    @media print{body{padding:12px}}
  </style></head><body>
  <h1>🔧 ${GARAGE.name}</h1>
  <div class="sub">Job Card #${job.jobNo} · Date: ${job.date}</div>
  <div class="plate">${job.regNo}</div>
  <div class="info">
    <div><span>Customer: </span><strong>${job.name}</strong></div>
    <div><span>Phone: </span>${job.phone}</div>
    <div><span>Vehicle: </span>${job.brand} ${job.model}</div>
    ${job.kms?`<div><span>Odometer: </span>${job.kms} km</div>`:""}
    ${job.fuel?`<div><span>Fuel: </span>${job.fuel}</div>`:""}
    ${job.deliveryDate?`<div><span>Delivery: </span>${job.deliveryDate}</div>`:""}
  </div>
  <div class="section">
    <table><thead><tr><th>#</th><th>Service / Work</th><th>Amount</th></tr></thead>
    <tbody>${rows}${partRows}</tbody></table>
  </div>
  <div style="margin-top:10px;display:flex;justify-content:space-between;font-size:14px">
    <span class="total">Total: ₹${fmtINR(job.totalAmount)}</span>
    ${bal>0?`<span class="bal">Balance Due: ₹${fmtINR(bal)}</span>`:`<span class="paid">✅ Fully Paid</span>`}
  </div>
  ${(job.payments||[]).length>0?`<div class="section">
    <div style="font-size:12px;font-weight:700;color:#555;margin-bottom:6px">PAYMENT HISTORY</div>
    <table><thead><tr><th>#</th><th>Method / Date</th><th>Amount</th></tr></thead>
    <tbody>${payRows}</tbody></table>
    <div class="paid" style="text-align:right;font-size:13px;margin-top:6px">Paid: ₹${fmtINR(paid)}</div>
  </div>`:""}
  <div class="footer">
    Thank you for choosing ${GARAGE.name}!<br>
    Contact: ${GARAGE.phone}<br>
    <div style="margin-top:16px;border-top:1px dashed #ccc;padding-top:10px">
      Customer Signature: _______________________
    </div>
  </div>
  </body></html>`;
  const w=window.open("","_blank","width=600,height=800");
  if(w){w.document.write(html);w.document.close();setTimeout(()=>w.print(),400);}
}

// ---
// FEATURE 3: VOICE NOTE component
// ---
function VoiceNote({ onSend, hasText }) {
  const [state, setState] = useState("idle"); // idle | recording | preview
  const [audioURL, setAudioURL] = useState(null);
  const [duration, setDuration] = useState(0);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const blobRef = useRef(null);

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = e => { if(e.data.size>0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type:"audio/webm" });
        blobRef.current = blob;
        setAudioURL(URL.createObjectURL(blob));
        setState("preview");
        stream.getTracks().forEach(t=>t.stop());
      };
      rec.start();
      recorderRef.current = rec;
      setState("recording");
      setDuration(0);
      timerRef.current = setInterval(()=>setDuration(d=>d+1),1000);
    } catch(e) {
      alert("Microphone access denied.");
    }
  };

  const stopRec = () => {
    if(timerRef.current) clearInterval(timerRef.current);
    if(recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
  };

  const send = () => {
    if(!blobRef.current) return;
    const reader = new FileReader();
    reader.onload = ev => {
      onSend({ type:"voice", dataURL: ev.target.result, duration });
      setState("idle"); setAudioURL(null); setDuration(0);
    };
    reader.readAsDataURL(blobRef.current);
  };

  const cancel = () => {
    if(recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
    if(timerRef.current) clearInterval(timerRef.current);
    setState("idle"); setAudioURL(null); setDuration(0);
  };

  const fmtDur = s => Math.floor(s/60)+":"+String(s%60).padStart(2,"0");

  // Idle — show mic only when no text
  if (state === "idle") {
    if(hasText) return null;
    return (
      <button onClick={startRec}
        style={{width:42,height:42,borderRadius:21,background:T.green,border:"none",cursor:"pointer",
          display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
          boxShadow:"0 2px 6px rgba(59,109,17,.3)"}}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" fill="#fff"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
          <line x1="12" y1="19" x2="12" y2="23" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
          <line x1="8" y1="23" x2="16" y2="23" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
    );
  }

  // Recording — full bar
  if (state === "recording") return (
    <div style={{display:"flex",alignItems:"center",gap:8,flex:1,background:"#E5E4DF",borderRadius:22,padding:"6px 12px"}}>
      <button onClick={cancel}
        style={{width:28,height:28,borderRadius:14,background:"#A32D2D",border:"none",cursor:"pointer",
          color:"#fff",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
      <span style={{width:8,height:8,borderRadius:4,background:"#A32D2D",flexShrink:0}}/>
      <span style={{flex:1,fontSize:13,color:T.text,fontFamily:T.font}}>{fmtDur(duration)}</span>
      <button onClick={stopRec}
        style={{width:34,height:34,borderRadius:17,background:T.green,border:"none",cursor:"pointer",
          display:"flex",alignItems:"center",justifyContent:"center"}}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" fill="#fff"/>
        </svg>
      </button>
    </div>
  );

  // Preview
  if (state === "preview") return (
    <div style={{display:"flex",alignItems:"center",gap:6,flex:1,background:"#E5E4DF",borderRadius:22,padding:"6px 10px"}}>
      <button onClick={cancel}
        style={{width:28,height:28,borderRadius:14,background:"#A32D2D",border:"none",cursor:"pointer",
          color:"#fff",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
      <audio src={audioURL} controls style={{flex:1,height:28,minWidth:0}}/>
      <span style={{fontSize:10,color:T.textMuted,flexShrink:0}}>{fmtDur(duration)}</span>
      <button onClick={send}
        style={{width:34,height:34,borderRadius:17,background:T.green,border:"none",cursor:"pointer",
          display:"flex",alignItems:"center",justifyContent:"center"}}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" fill="#fff"/>
        </svg>
      </button>
    </div>
  );
  return null;
}

// Voice message bubble
function VoiceBubble({ msg, isMine }) {
  return (
    <div style={{display:"flex",justifyContent:isMine?"flex-end":"flex-start",padding:"2px 10px",marginBottom:2}}>
      <div style={{maxWidth:"78%",background:isMine?"#E8F5E9":"#FFFFFF",
        borderRadius:isMine?"12px 2px 12px 12px":"2px 12px 12px 12px",
        padding:"8px 11px",boxShadow:"0 1px 2px rgba(0,0,0,.3)"}}>
        {!isMine&&<div style={{fontSize:11,color:"#3B6D11",fontWeight:600,marginBottom:3,fontFamily:T.font}}>{msg.by}</div>}
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:18}}>🎤</span>
          <audio src={msg.dataURL} controls style={{height:28,minWidth:140,maxWidth:200}}/>
          <span style={{fontSize:10,color:"#888780",flexShrink:0}}>{msg.voiceDur}</span>
        </div>
        <div style={{fontSize:10,color:"#888780",textAlign:"right",marginTop:3}}>
          {msg.time}{isMine&&<span style={{color:"#3B6D11",marginLeft:4}}>✓✓</span>}
        </div>
      </div>
    </div>
  );
}

// ---
// FEATURE 4: GROUP / STAFF CHAT
// ---
function StaffChat({ user, staffMsgs, onSend, onBack }) {
  const [note, setNote] = useState("");
  const [showVoice, setShowVoice] = useState(false);
  const [showStaffMenu, setShowStaffMenu] = useState(false);
  const endRef = useRef(null);
  const noteRef = useRef(null);

  useEffect(()=>{ endRef.current&&endRef.current.scrollIntoView({behavior:"smooth"}); },[staffMsgs.length]);

  const send = () => {
    if(!note.trim()) return;
    // parse @mentions
    const txt = note.trim();
    onSend({ type:"text", note:txt });
    setNote("");
  };

  const sendVoice = (v) => {
    const fmtDur = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
    onSend({ type:"voice", dataURL: v.dataURL, voiceDur: fmtDur(v.duration) });
    setShowVoice(false);
  };

  // Highlight @mentions
  const renderText = (text) => {
    const parts = text.split(/(@\w+)/g);
    return parts.map((p,i) =>
      p.startsWith("@")
        ? <span key={i} style={{color:"#3B6D11",fontWeight:700}}>{p}</span>
        : p
    );
  };

  const online = USERS.map(u=>u.name).join(", ");

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",background:"#FAFAF8",height:"100%",overflow:"hidden"}}>
      {/* Header */}
      <div style={{background:"#FFFFFF",padding:"10px 14px",display:"flex",alignItems:"center",gap:10,flexShrink:0,borderBottom:"0.5px solid #E5E4DF"}}>
        <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",padding:"0 2px"}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 19l-7-7 7-7" stroke="#1B1B1A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div style={{width:36,height:36,borderRadius:10,background:"#F1EFE8",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>👥</div>
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:600,color:"#1B1B1A",fontFamily:T.font}}>Staff Chat</div>
          <div style={{fontSize:11,color:"#888780"}}>All staff · {USERS.length} members</div>
        </div>
      </div>
      {/* Members strip */}
      <div style={{background:"#F5F4F0",padding:"6px 12px",display:"flex",gap:8,overflowX:"auto",scrollbarWidth:"none",borderBottom:"0.5px solid #E5E4DF",flexShrink:0}}>
        {USERS.map(u=>(
          <div key={u.id} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,flexShrink:0}}>
            <div style={{width:34,height:34,borderRadius:17,background:"#E5E4DF",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{u.avatar}</div>
            <div style={{fontSize:9,color:"#888780"}}>{u.name}</div>
          </div>
        ))}
      </div>
      {/* Messages */}
      <div style={{flex:1,overflowY:"auto",minHeight:0,padding:"8px 0"}}>
        {staffMsgs.length===0&&(
          <div style={{padding:24,textAlign:"center",color:"#888780",fontFamily:T.font}}>
            <div style={{fontSize:36,marginBottom:10}}>👋</div>
            <div>Staff chat is empty. Say something!</div>
            <div style={{fontSize:12,marginTop:8}}>Tip: Type @Raju to notify someone</div>
          </div>
        )}
        {staffMsgs.map((msg,i) => {
          const mine = msg.by === user.name;
          if(msg.type==="voice") return <VoiceBubble key={i} msg={msg} isMine={mine}/>;
          return (
            <div key={i} style={{display:"flex",justifyContent:mine?"flex-end":"flex-start",padding:"2px 10px",marginBottom:2}}>
              <div style={{maxWidth:"78%",background:mine?"#E8F5E9":"#FFFFFF",
                borderRadius:mine?"12px 2px 12px 12px":"2px 12px 12px 12px",
                padding:"8px 11px",boxShadow:"0 1px 2px rgba(0,0,0,.3)"}}>
                {!mine&&<div style={{fontSize:11,color:"#3B6D11",fontWeight:600,marginBottom:2,fontFamily:T.font}}>{msg.by}</div>}
                <div style={{fontSize:13,color:"#E9EDEF",lineHeight:1.5,fontFamily:T.font,wordBreak:"break-word"}}>{renderText(msg.note||"")}</div>
                <div style={{fontSize:10,color:"#888780",textAlign:"right",marginTop:3}}>
                  {msg.time}{mine&&<span style={{color:"#3B6D11",marginLeft:4}}>✓✓</span>}
                </div>
              </div>
            </div>
          );
        })}
        {/* QC passed → Payment nudge */}
      </div>
      {/* Input */}
      <div style={{background:"#FFFFFF",flexShrink:0,borderTop:"1px solid #E5E4DF",padding:"8px 10px",position:"relative"}}>
        {/* Staff menu */}
        {showStaffMenu&&(
          <div style={{position:"absolute",bottom:"100%",left:0,marginBottom:6,
            background:"#FFFFFF",borderRadius:14,border:"1px solid #E5E4DF",
            boxShadow:"0 8px 24px rgba(0,0,0,.15)",minWidth:200,maxWidth:260,
            zIndex:20,overflow:"hidden"}}>
            <div style={{padding:"5px 10px",borderBottom:"1px solid #E5E4DF",
              display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:9,fontWeight:700,color:"#888780",letterSpacing:.3}}>STAFF MEMBERS</span>
              <button onClick={()=>setShowStaffMenu(false)}
                style={{background:"none",border:"none",cursor:"pointer",color:"#888780",
                  fontSize:14,lineHeight:1,padding:"0 2px"}}>×</button>
            </div>
            {USERS.map((u,i)=>(
              <button key={u.id} onClick={()=>{
                setNote(n=>(n?n+" ":"")+"@"+u.name+" ");
                setShowStaffMenu(false);
                setTimeout(()=>noteRef.current?.focus(),100);
              }}
                style={{width:"100%",display:"flex",alignItems:"center",gap:8,
                  padding:"7px 10px",background:"transparent",border:"none",
                  borderBottom:i<USERS.length-1?"1px solid #F1EFE8":"none",
                  cursor:"pointer",textAlign:"left"}}>
                <span style={{fontSize:14,flexShrink:0}}>{u.avatar||"👤"}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:11,color:"#1B1B1A",fontWeight:600}}>{u.name}</div>
                  <div style={{fontSize:9,color:"#888780"}}>{u.role}</div>
                </div>
                {u.name===user.name&&<span style={{fontSize:8,color:"#3B6D11",fontWeight:600,
                  background:"#EAF3DE",padding:"1px 6px",borderRadius:8}}>You</span>}
              </button>
            ))}
          </div>
        )}
        <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
          {/* + button */}
          <button onClick={()=>setShowStaffMenu(v=>!v)}
            style={{width:42,height:42,borderRadius:21,
              background:showStaffMenu?"#3B6D11":"#E5E4DF",border:"none",cursor:"pointer",
              fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",
              flexShrink:0,fontWeight:700,color:showStaffMenu?"#fff":"#1B1B1A",
              transition:"all .15s"}}>
            {showStaffMenu?"×":"+"}
          </button>
          <div style={{flex:1,background:"#E5E4DF",borderRadius:22,padding:"8px 14px",display:"flex",alignItems:"center"}}>
            <textarea ref={noteRef} value={note} onChange={e=>setNote(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}
              placeholder="Type a message..."
              rows={1}
              style={{flex:1,background:"transparent",border:"none",outline:"none",resize:"none",
                fontSize:13,fontFamily:T.font,color:T.text,lineHeight:1.5,maxHeight:80,overflow:"auto"}}/>
          </div>
          {/* Mic / Send toggle */}
          {note.trim() ? (
            <button onClick={send}
              style={{width:42,height:42,borderRadius:21,background:T.green,border:"none",
                cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
                flexShrink:0,boxShadow:"0 2px 6px rgba(59,109,17,.3)"}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ) : (
            <VoiceNote onSend={sendVoice} hasText={false}/>
          )}
        </div>
      </div>
    </div>
  );
}

// ---
// FEATURE 5: ENHANCED ADMIN DASHBOARD
// ---
function AdminDashboard({ jobs, onClose, expenses, setExpenses, inventory, setInventory }) {
  const [tab, setTab] = useState("overview");
  const [expDesc, setExpDesc] = useState("");
  const [expAmt, setExpAmt] = useState("");
  const [expCat, setExpCat] = useState("General");
  const [expPeriod, setExpPeriod] = useState("daily");
  const [expDate, setExpDate] = useState(dt());
  const [calMonth, setCalMonth] = useState(()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");});
  const [invName, setInvName] = useState("");
  const [invQty, setInvQty] = useState("");
  const [invCatFilter, setInvCatFilter] = useState("All");

  const today = dt();
  const todayJobs   = jobs.filter(j=>j.date===today);
  const activeJobs  = jobs.filter(j=>["open","in_progress"].includes(j.status));
  const qcReady     = jobs.filter(j=>j.status==="completed");
  const overdue     = jobs.filter(j=>j.deliveryDate&&j.deliveryDate<today&&j.status!=="delivered");
  const totalRev    = jobs.filter(j=>j.status==="delivered").reduce((s,j)=>s+(j.totalAmount||0),0);
  const pending     = jobs.reduce((s,j)=>{
    if(j.status==="delivered") return s;
    const paid=(j.payments||[]).reduce((t,p)=>t+p.amount,0);
    return s+Math.max(0,(j.totalAmount||0)-paid);
  },0);

  // Last 7 days revenue
  const last7=[];
  for(let i=6;i>=0;i--){
    const d=dAgo(i);
    const dayJobs=jobs.filter(j=>j.date===d);
    const rev=dayJobs.reduce((s,j)=>{const p=(j.payments||[]).reduce((t,pp)=>t+pp.amount,0);return s+p;},0);
    const dayName=new Date(d).toLocaleDateString("en",{weekday:"short"});
    last7.push({d,dayName,rev,count:dayJobs.length});
  }
  const maxRev=Math.max(...last7.map(d=>d.rev),1);

  // Top services
  const svcCount={};
  jobs.forEach(j=>(j.items||[]).forEach(it=>{
    const n=it.complaint||"Unknown";
    svcCount[n]=(svcCount[n]||0)+1;
  }));
  const topSvc=Object.entries(svcCount).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const maxSvc=topSvc.length>0?topSvc[0][1]:1;

  // Mechanic performance
  const mechPerf=MECHANICS.map(m=>{
    const mJobs=jobs.filter(j=>j.assignedTo===m.id);
    const completed=mJobs.filter(j=>["completed","delivered"].includes(j.status)).length;
    const active=mJobs.filter(j=>["open","in_progress"].includes(j.status)).length;
    let totalDone=0;
    mJobs.forEach(j=>{
      const dates=j._serviceDates||{};
      Object.values(dates).forEach(d=>{if(d&&d.includes(m.name))totalDone++;});
    });
    return {...m,total:mJobs.length,completed,active,totalDone};
  });

  // Expenses + Vendor costs from outsourced work
  const vendorExpenses = jobs.flatMap(j=>(j.outsourced||[]).filter(o=>o.vendorCost>0).map(o=>({
    id:"v-"+j.jobNo+"-"+o.service,date:o.sentDate||j.date,desc:o.service+" ("+o.vendor+")",
    amount:o.vendorCost,category:"Vendor/Outsource",isVendor:true,jobNo:j.jobNo,vehicle:j.regNo
  })));
  const allExpenses = [...(expenses||[]),...vendorExpenses].sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  const todayExp=allExpenses.filter(e=>e.date===today);
  const totalExp=allExpenses.reduce((s,e)=>s+e.amount,0);
  const todayExpTotal=todayExp.reduce((s,e)=>s+e.amount,0);

  // Indian Financial Year (Apr 1 - Mar 31)
  const getFY=(dateStr)=>{
    if(!dateStr) return "";
    const d=new Date(dateStr);
    const y=d.getFullYear(); const m=d.getMonth();
    return m>=3?(y+"-"+(y+1)):((y-1)+"-"+y); // Apr=3
  };
  const currentFY = getFY(today);
  const fyStart = currentFY.split("-")[0]+"-04-01";
  const fyEnd = currentFY.split("-")[1]+"-03-31";
  const fyExpenses = allExpenses.filter(e=>e.date>=fyStart&&e.date<=fyEnd);
  const fyTotal = fyExpenses.reduce((s,e)=>s+e.amount,0);
  const fyRevenue = jobs.filter(j=>j.date>=fyStart&&j.date<=fyEnd)
    .reduce((s,j)=>s+(j.payments||[]).reduce((t,p)=>t+p.amount,0),0);

  // Monthly breakdown for current FY
  const fyMonths = [];
  for(let mi=3;mi<15;mi++){
    const yr=mi<12?+currentFY.split("-")[0]:+currentFY.split("-")[1];
    const mo=mi%12;
    const ym=yr+"-"+String(mo+1).padStart(2,"0");
    const mExp=fyExpenses.filter(e=>e.date&&e.date.startsWith(ym)).reduce((s,e)=>s+e.amount,0);
    const mRev=jobs.filter(j=>j.date&&j.date.startsWith(ym))
      .reduce((s,j)=>s+(j.payments||[]).reduce((t,p)=>t+p.amount,0),0);
    const mName=new Date(yr,mo).toLocaleDateString("en",{month:"short"});
    fyMonths.push({ym,mName,mExp,mRev});
  }
  const maxFyBar=Math.max(...fyMonths.map(m=>Math.max(m.mExp,m.mRev)),1);

  // Low stock
  const lowStock=(inventory||[]).filter(p=>p.stock<=p.minStock);

  const C={bg:"#FAFAF8",card:"#FFFFFF",border:"#E5E4DF",text:"#1B1B1A",muted:"#888780",
    amber:"#854F0B",green:"#3B6D11",red:"#A32D2D",blue:"#185FA5",purple:"#534AB7"};

  const addStock=(id,qty)=>{
    setInventory(prev=>prev.map(p=>p.id===id?{...p,stock:p.stock+qty}:p));
  };

  return (
    <div style={{position:"absolute",top:0,left:0,right:0,bottom:0,background:C.bg,zIndex:20,display:"flex",flexDirection:"column",overflow:"hidden",fontFamily:T.font}}>
      {/* Header */}
      <div style={{background:C.card,padding:"12px 16px",display:"flex",alignItems:"center",gap:12,flexShrink:0,borderBottom:"1px solid "+C.border}}>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:C.text,fontSize:22}}>&#8249;</button>
        <div style={{fontSize:15,fontWeight:700,color:C.text,flex:1}}>Dashboard</div>
        <span style={{fontSize:11,color:C.muted,fontFamily:T.mono}}>{fmtDate(today)}</span>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",background:C.card,borderBottom:"1px solid "+C.border,flexShrink:0}}>
        {[{k:"overview",l:"Overview"},{k:"reports",l:"Reports"},{k:"inventory",l:"Inventory"},{k:"expenses",l:"Expenses"}].map(t2=>(
          <button key={t2.k} onClick={()=>setTab(t2.k)}
            style={{flex:1,padding:"10px 4px",border:"none",cursor:"pointer",fontSize:12,fontWeight:tab===t2.k?600:400,
              fontFamily:T.font,background:"transparent",
              color:tab===t2.k?C.amber:C.muted,
              borderBottom:tab===t2.k?"2px solid "+C.amber:"2px solid transparent"}}>
            {t2.l}
          </button>
        ))}
      </div>

      <div style={{flex:1,overflowY:"auto",padding:14}}>

      {tab==="overview"&&(<>
        {/* Stat cards */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8,marginBottom:14}}>
          {[
            {l:"Active",v:activeJobs.length,c:C.amber},
            {l:"QC Ready",v:qcReady.length,c:C.purple},
            {l:"Overdue",v:overdue.length,c:overdue.length>0?C.red:C.muted},
            {l:"Revenue",v:fmtINR(totalRev),c:C.green},
          ].map((s,i)=>(
            <div key={i} style={{background:C.card,borderRadius:12,padding:"10px 8px",textAlign:"center",border:"1px solid "+C.border}}>
              <div style={{fontSize:18,fontWeight:700,color:s.c,fontFamily:T.mono}}>{s.v}</div>
              <div style={{fontSize:9,color:C.muted,marginTop:2}}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* FY Summary */}
        <div style={{background:C.card,borderRadius:12,padding:12,border:"1px solid "+C.border,marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
            <div>
              <div style={{fontSize:9,fontWeight:700,color:C.muted,letterSpacing:.3}}>FINANCIAL YEAR</div>
              <div style={{fontSize:15,fontWeight:700,color:C.text,fontFamily:T.mono}}>FY {currentFY}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:9,color:C.muted}}>Net</div>
              <div style={{fontSize:15,fontWeight:700,fontFamily:T.mono,
                color:fyRevenue-fyTotal>=0?C.green:C.red}}>
                {fyRevenue-fyTotal>=0?"+":""}₹{fmtINR(Math.abs(fyRevenue-fyTotal))}
              </div>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
            <div style={{background:C.green+"12",borderRadius:8,padding:"6px 4px",textAlign:"center"}}>
              <div style={{fontSize:13,fontWeight:700,color:C.green,fontFamily:T.mono}}>₹{fmtINR(fyRevenue)}</div>
              <div style={{fontSize:8,color:C.green,fontWeight:600}}>INCOME</div>
            </div>
            <div style={{background:C.red+"12",borderRadius:8,padding:"6px 4px",textAlign:"center"}}>
              <div style={{fontSize:13,fontWeight:700,color:C.red,fontFamily:T.mono}}>₹{fmtINR(fyTotal)}</div>
              <div style={{fontSize:8,color:C.red,fontWeight:600}}>EXPENSE</div>
            </div>
            <div style={{background:C.amber+"12",borderRadius:8,padding:"6px 4px",textAlign:"center"}}>
              <div style={{fontSize:13,fontWeight:700,color:C.amber,fontFamily:T.mono}}>₹{fmtINR(pending)}</div>
              <div style={{fontSize:8,color:C.amber,fontWeight:600}}>PENDING</div>
            </div>
          </div>
        </div>

        {/* 7-day revenue chart */}
        <div style={{background:C.card,borderRadius:12,padding:14,border:"1px solid "+C.border,marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:600,color:C.muted,marginBottom:12}}>WEEKLY REVENUE</div>
          <div style={{display:"flex",alignItems:"flex-end",gap:6,height:100}}>
            {last7.map((d,i)=>(
              <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                <span style={{fontSize:9,color:C.amber,fontFamily:T.mono}}>{d.rev>0?fmtINR(d.rev):""}</span>
                <div style={{width:"100%",height:Math.max(4,d.rev/maxRev*70),background:d.d===today?C.amber:C.amber+"66",borderRadius:4}}/>
                <span style={{fontSize:9,color:d.d===today?C.text:C.muted}}>{d.dayName}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top services + Mechanic perf side by side */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          {/* Top services */}
          <div style={{background:C.card,borderRadius:12,padding:14,border:"1px solid "+C.border}}>
            <div style={{fontSize:11,fontWeight:600,color:C.muted,marginBottom:10}}>TOP SERVICES</div>
            {topSvc.map(([name,count],i)=>(
              <div key={i} style={{marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}>
                  <span style={{color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"70%"}}>{name}</span>
                  <span style={{color:C.amber,fontFamily:T.mono,fontWeight:600}}>{count}</span>
                </div>
                <div style={{height:3,background:C.border,borderRadius:2,overflow:"hidden"}}>
                  <div style={{width:(count/maxSvc*100)+"%",height:"100%",background:C.amber,borderRadius:2}}/>
                </div>
              </div>
            ))}
          </div>

          {/* Mechanic performance */}
          <div style={{background:C.card,borderRadius:12,padding:14,border:"1px solid "+C.border}}>
            <div style={{fontSize:11,fontWeight:600,color:C.muted,marginBottom:10}}>MECHANIC STATS</div>
            {mechPerf.map(m=>(
              <div key={m.id} style={{marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}>
                  <span style={{color:C.text}}>{m.avatar} {m.name}</span>
                  <span style={{color:C.green,fontFamily:T.mono,fontWeight:600}}>{m.completed}/{m.total}</span>
                </div>
                <div style={{height:3,background:C.border,borderRadius:2,overflow:"hidden"}}>
                  <div style={{width:m.total>0?(m.completed/m.total*100)+"%":"0%",height:"100%",background:C.green,borderRadius:2}}/>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Low stock alert */}
        {lowStock.length>0&&(
          <div style={{background:"#FFF8E7",borderRadius:12,padding:14,border:"1px solid "+C.amber+"44",marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:600,color:C.amber,marginBottom:8}}>LOW STOCK ALERT — {lowStock.length} items</div>
            {lowStock.map(p=>(
              <div key={p.id} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"4px 0",color:C.text}}>
                <span>{p.name}</span>
                <span style={{color:C.red,fontFamily:T.mono,fontWeight:600}}>{p.stock} left (min: {p.minStock})</span>
              </div>
            ))}
          </div>
        )}

        {/* Overdue */}
        {overdue.length>0&&(
          <div style={{background:"#FFF0F0",borderRadius:12,padding:14,border:"1px solid "+C.red+"44"}}>
            <div style={{fontSize:11,fontWeight:600,color:C.red,marginBottom:8}}>OVERDUE — {overdue.length} JOBS</div>
            {overdue.map(j=>{
              const mech=MECHANICS.find(m=>m.id===j.assignedTo);
              const days=Math.ceil((new Date()-new Date(j.deliveryDate))/(1000*60*60*24));
              return(
                <div key={j.jobNo} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:12}}>
                  <div>
                    <span style={{color:C.text}}>{j.name}</span>
                    <span style={{color:C.muted,marginLeft:8,fontFamily:T.mono}}>{j.regNo}</span>
                  </div>
                  <span style={{color:C.red,fontFamily:T.mono,fontWeight:600}}>{days}d late</span>
                </div>
              );
            })}
          </div>
        )}
      </>)}

      {tab==="reports"&&(()=>{
        // ═══ MONTHLY REVENUE (last 6 months) ═══
        const months=[];
        for(let i=5;i>=0;i--){
          const d=new Date();d.setMonth(d.getMonth()-i);
          const ym=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
          const label=d.toLocaleDateString("en",{month:"short"});
          const mJobs=jobs.filter(j=>j.date&&j.date.startsWith(ym));
          const income=mJobs.reduce((s,j)=>{const p=(j.payments||[]).reduce((t,pp)=>t+pp.amount,0);return s+p;},0);
          const mExp=(expenses||[]).filter(e=>e.date&&e.date.startsWith(ym)).reduce((s,e)=>s+e.amount,0);
          months.push({ym,label,income,expense:mExp,profit:income-mExp,jobs:mJobs.length});
        }
        const maxInc=Math.max(...months.map(m=>m.income),1);

        // ═══ CUSTOMER ANALYTICS ═══
        const custMap={};
        jobs.forEach(j=>{
          const k=(j.phone||j.name||"Unknown");
          if(!custMap[k]) custMap[k]={name:j.name,phone:j.phone,visits:0,revenue:0,lastDate:j.date};
          custMap[k].visits++;
          custMap[k].revenue+=(j.totalAmount||0);
          if(j.date>custMap[k].lastDate) custMap[k].lastDate=j.date;
        });
        const customers=Object.values(custMap).sort((a,b)=>b.revenue-a.revenue);
        const returning=customers.filter(c=>c.visits>1).length;
        const newCust=customers.filter(c=>c.visits===1).length;
        const topCust=customers.slice(0,5);

        // ═══ BRAND ANALYTICS ═══
        const brandMap={};
        jobs.forEach(j=>{
          const b=j.brand||"Unknown";
          if(!brandMap[b]) brandMap[b]={count:0,revenue:0};
          brandMap[b].count++;
          brandMap[b].revenue+=(j.totalAmount||0);
        });
        const topBrands=Object.entries(brandMap).sort((a,b)=>b[1].count-a[1].count).slice(0,6);
        const maxBrand=topBrands.length>0?topBrands[0][1].count:1;

        // ═══ PAYMENT COLLECTION ═══
        const totalBilled=jobs.reduce((s,j)=>s+(j.totalAmount||0),0);
        const totalCollected=jobs.reduce((s,j)=>s+(j.payments||[]).reduce((t,p)=>t+p.amount,0),0);
        const totalDues=Math.max(0,totalBilled-totalCollected);
        const collRate=totalBilled>0?Math.round(totalCollected/totalBilled*100):0;
        const payMethods={CASH:0,UPI:0,CARD:0};
        jobs.forEach(j=>(j.payments||[]).forEach(p=>{
          const m=(p.method||"CASH").toUpperCase();
          payMethods[m]=(payMethods[m]||0)+p.amount;
        }));
        const totalPay=Object.values(payMethods).reduce((s,v)=>s+v,0)||1;

        // ═══ MECHANIC DETAILED ═══
        const mechDetailed=MECHANICS.map(m=>{
          const mj=jobs.filter(j=>j.assignedTo===m.id);
          const completed=mj.filter(j=>["completed","delivered"].includes(j.status)).length;
          const active=mj.filter(j=>["open","in_progress"].includes(j.status)).length;
          const revenue=mj.reduce((s,j)=>s+(j.totalAmount||0),0);
          let svcDone=0;
          mj.forEach(j=>{
            const dates=j._serviceDates||{};
            Object.values(dates).forEach(d=>{if(d&&d.includes(m.name))svcDone++;});
          });
          const avgTime=completed>0?Math.round(mj.filter(j=>j.status==="delivered").reduce((s,j)=>{
            const start=new Date(j.date);const end=new Date(j.deliveryDate||j.date);
            return s+Math.max(1,Math.ceil((end-start)/(1000*60*60*24)));
          },0)/Math.max(1,completed)):0;
          return{...m,total:mj.length,completed,active,revenue,svcDone,avgTime};
        });

        // ═══ P&L SUMMARY ═══
        const totalIncome=months.reduce((s,m)=>s+m.income,0);
        const totalExpense=months.reduce((s,m)=>s+m.expense,0);
        const netProfit=totalIncome-totalExpense;

        return(<>
        {/* P&L Summary Cards */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
          <div style={{background:C.card,borderRadius:12,padding:12,textAlign:"center",border:"1px solid "+C.border}}>
            <div style={{fontSize:18,fontWeight:700,color:C.green,fontFamily:T.mono}}>{fmtINR(totalIncome)}</div>
            <div style={{fontSize:9,color:C.muted,marginTop:2}}>Total income</div>
          </div>
          <div style={{background:C.card,borderRadius:12,padding:12,textAlign:"center",border:"1px solid "+C.border}}>
            <div style={{fontSize:18,fontWeight:700,color:C.red,fontFamily:T.mono}}>{fmtINR(totalExpense)}</div>
            <div style={{fontSize:9,color:C.muted,marginTop:2}}>Total expense</div>
          </div>
          <div style={{background:C.card,borderRadius:12,padding:12,textAlign:"center",border:"1px solid "+C.border,
            borderTop:netProfit>=0?"3px solid "+C.green:"3px solid "+C.red,borderRadius:0}}>
            <div style={{fontSize:18,fontWeight:700,color:netProfit>=0?C.green:C.red,fontFamily:T.mono}}>{fmtINR(Math.abs(netProfit))}</div>
            <div style={{fontSize:9,color:C.muted,marginTop:2}}>{netProfit>=0?"Net profit":"Net loss"}</div>
          </div>
        </div>

        {/* Monthly Revenue + Expense Chart */}
        <div style={{background:C.card,borderRadius:12,padding:14,border:"1px solid "+C.border,marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:600,color:C.muted,marginBottom:12}}>MONTHLY TREND (6 MONTHS)</div>
          <div style={{display:"flex",alignItems:"flex-end",gap:8,height:110}}>
            {months.map((m,i)=>{
              const maxH=Math.max(maxInc,1);
              return(
                <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                  <span style={{fontSize:8,color:C.green,fontFamily:T.mono}}>{m.income>0?fmtINR(m.income):""}</span>
                  <div style={{width:"100%",display:"flex",gap:2,alignItems:"flex-end",justifyContent:"center",height:70}}>
                    <div style={{width:"45%",height:Math.max(3,m.income/maxH*65),background:C.green,borderRadius:3,opacity:.8}}/>
                    <div style={{width:"45%",height:Math.max(3,m.expense/maxH*65),background:C.red,borderRadius:3,opacity:.8}}/>
                  </div>
                  <span style={{fontSize:9,color:m.ym.startsWith(today.slice(0,7))?C.text:C.muted,fontWeight:m.ym.startsWith(today.slice(0,7))?600:400}}>{m.label}</span>
                  <span style={{fontSize:8,color:C.muted,fontFamily:T.mono}}>{m.jobs}j</span>
                </div>
              );
            })}
          </div>
          <div style={{display:"flex",gap:12,marginTop:8,justifyContent:"center"}}>
            <span style={{fontSize:9,color:C.muted,display:"flex",alignItems:"center",gap:4}}>
              <span style={{width:8,height:8,borderRadius:2,background:C.green,display:"inline-block"}}/>Income
            </span>
            <span style={{fontSize:9,color:C.muted,display:"flex",alignItems:"center",gap:4}}>
              <span style={{width:8,height:8,borderRadius:2,background:C.red,display:"inline-block"}}/>Expense
            </span>
          </div>
        </div>

        {/* Payment Collection */}
        <div style={{background:C.card,borderRadius:12,padding:14,border:"1px solid "+C.border,marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:600,color:C.muted,marginBottom:10}}>PAYMENT COLLECTION</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6,marginBottom:12}}>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:14,fontWeight:700,fontFamily:T.mono,color:C.amber}}>{fmtINR(totalBilled)}</div>
              <div style={{fontSize:8,color:C.muted,marginTop:2}}>Billed</div>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:14,fontWeight:700,fontFamily:T.mono,color:C.green}}>{fmtINR(totalCollected)}</div>
              <div style={{fontSize:8,color:C.muted,marginTop:2}}>Collected</div>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:14,fontWeight:700,fontFamily:T.mono,color:totalDues>0?C.red:C.green}}>{fmtINR(totalDues)}</div>
              <div style={{fontSize:8,color:C.muted,marginTop:2}}>Pending</div>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:14,fontWeight:700,fontFamily:T.mono,color:collRate>=80?C.green:C.amber}}>{collRate}%</div>
              <div style={{fontSize:8,color:C.muted,marginTop:2}}>Rate</div>
            </div>
          </div>
          {/* Payment method split */}
          <div style={{display:"flex",height:6,borderRadius:3,overflow:"hidden",marginBottom:6}}>
            <div style={{width:(payMethods.CASH/totalPay*100)+"%",background:C.green}}/>
            <div style={{width:(payMethods.UPI/totalPay*100)+"%",background:C.blue}}/>
            <div style={{width:(payMethods.CARD/totalPay*100)+"%",background:C.purple}}/>
          </div>
          <div style={{display:"flex",gap:12,fontSize:9,color:C.muted}}>
            <span><span style={{color:C.green}}>Cash</span> {fmtINR(payMethods.CASH)}</span>
            <span><span style={{color:C.blue}}>UPI</span> {fmtINR(payMethods.UPI)}</span>
            <span><span style={{color:C.purple}}>Card</span> {fmtINR(payMethods.CARD)}</span>
          </div>
        </div>

        {/* Customer + Brand side by side */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          {/* Top Customers */}
          <div style={{background:C.card,borderRadius:12,padding:14,border:"1px solid "+C.border}}>
            <div style={{fontSize:11,fontWeight:600,color:C.muted,marginBottom:4}}>CUSTOMERS</div>
            <div style={{display:"flex",gap:12,marginBottom:10}}>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:16,fontWeight:700,fontFamily:T.mono,color:C.amber}}>{returning}</div>
                <div style={{fontSize:8,color:C.muted}}>Returning</div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:16,fontWeight:700,fontFamily:T.mono,color:C.blue}}>{newCust}</div>
                <div style={{fontSize:8,color:C.muted}}>New</div>
              </div>
            </div>
            {topCust.map((c,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:11,padding:"4px 0",
                borderBottom:i<topCust.length-1?"1px solid "+C.border+"33":""}}>
                <div style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"60%"}}>
                  <span style={{color:C.text}}>{c.name}</span>
                  <span style={{color:C.muted,marginLeft:4,fontSize:9}}>{c.visits}x</span>
                </div>
                <span style={{color:C.amber,fontFamily:T.mono,fontWeight:600,fontSize:10}}>{fmtINR(c.revenue)}</span>
              </div>
            ))}
          </div>

          {/* Brand analytics */}
          <div style={{background:C.card,borderRadius:12,padding:14,border:"1px solid "+C.border}}>
            <div style={{fontSize:11,fontWeight:600,color:C.muted,marginBottom:10}}>TOP BRANDS</div>
            {topBrands.map(([brand,data],i)=>(
              <div key={i} style={{marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}>
                  <span style={{color:C.text}}>{brand}</span>
                  <span style={{color:C.amber,fontFamily:T.mono,fontWeight:600}}>{data.count}</span>
                </div>
                <div style={{height:3,background:C.border,borderRadius:2,overflow:"hidden"}}>
                  <div style={{width:(data.count/maxBrand*100)+"%",height:"100%",background:C.amber,borderRadius:2}}/>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mechanic Productivity */}
        <div style={{background:C.card,borderRadius:12,padding:14,border:"1px solid "+C.border,marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:600,color:C.muted,marginBottom:12}}>MECHANIC PRODUCTIVITY</div>
          {mechDetailed.map(m=>(
            <div key={m.id} style={{padding:"10px 0",borderBottom:"1px solid "+C.border+"33"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <span style={{fontSize:13,fontWeight:600,color:C.text}}>{m.avatar} {m.name}</span>
                <span style={{fontSize:10,fontFamily:T.mono,color:m.active>0?C.amber:C.green,
                  padding:"2px 8px",borderRadius:10,background:m.active>0?C.amber+"22":C.green+"22"}}>
                  {m.active>0?m.active+" active":"Free"}
                </span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:4}}>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:14,fontWeight:700,fontFamily:T.mono,color:C.text}}>{m.total}</div>
                  <div style={{fontSize:8,color:C.muted}}>Jobs</div>
                </div>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:14,fontWeight:700,fontFamily:T.mono,color:C.green}}>{m.completed}</div>
                  <div style={{fontSize:8,color:C.muted}}>Done</div>
                </div>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:14,fontWeight:700,fontFamily:T.mono,color:C.blue}}>{m.svcDone}</div>
                  <div style={{fontSize:8,color:C.muted}}>Tasks</div>
                </div>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:14,fontWeight:700,fontFamily:T.mono,color:C.amber}}>{fmtINR(m.revenue)}</div>
                  <div style={{fontSize:8,color:C.muted}}>Revenue</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Monthly Income vs Expense (FY) */}
        <div style={{background:C.card,borderRadius:12,padding:12,border:"1px solid "+C.border,marginBottom:14}}>
          <div style={{fontSize:10,fontWeight:700,color:C.muted,letterSpacing:.3,marginBottom:8}}>
            FY {currentFY} · INCOME vs EXPENSE
          </div>
          <div style={{display:"flex",gap:2,alignItems:"flex-end",height:80}}>
            {fyMonths.map((m,i)=>{
              const hE=Math.max(2,Math.round(m.mExp/maxFyBar*70));
              const hR=Math.max(2,Math.round(m.mRev/maxFyBar*70));
              const isNow=m.ym===today.slice(0,7);
              return (
                <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:1}}>
                  <div style={{display:"flex",gap:1,alignItems:"flex-end",height:70}}>
                    <div style={{width:6,height:hR,background:C.green,borderRadius:"2px 2px 0 0",opacity:isNow?1:.5}}/>
                    <div style={{width:6,height:hE,background:C.red,borderRadius:"2px 2px 0 0",opacity:isNow?1:.5}}/>
                  </div>
                  <span style={{fontSize:7,color:isNow?C.text:C.muted,fontWeight:isNow?700:400}}>{m.mName}</span>
                </div>
              );
            })}
          </div>
          <div style={{display:"flex",gap:12,justifyContent:"center",marginTop:6}}>
            <div style={{display:"flex",alignItems:"center",gap:3}}>
              <div style={{width:8,height:8,borderRadius:2,background:C.green}}/>
              <span style={{fontSize:9,color:C.muted}}>Income</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:3}}>
              <div style={{width:8,height:8,borderRadius:2,background:C.red}}/>
              <span style={{fontSize:9,color:C.muted}}>Expense</span>
            </div>
          </div>
        </div>

        {/* Expense by category */}
        {(()=>{
          const cats={};
          allExpenses.filter(e=>e.date>=fyStart&&e.date<=fyEnd).forEach(e=>{cats[e.category]=(cats[e.category]||0)+e.amount;});
          const sorted=Object.entries(cats).sort((a,b)=>b[1]-a[1]);
          const catTotal=sorted.reduce((s,c)=>s+c[1],0)||1;
          const catColors={"Vendor/Outsource":C.purple,"Utilities":C.blue,"Staff":"#185FA5","Maintenance":C.amber,"Parts":C.green,"General":C.muted,"Rent":"#534AB7","Other":"#888780"};
          if(sorted.length===0) return null;
          return (
            <div style={{background:C.card,borderRadius:12,padding:12,border:"1px solid "+C.border,marginBottom:14}}>
              <div style={{fontSize:10,fontWeight:700,color:C.muted,letterSpacing:.3,marginBottom:8}}>EXPENSE BY CATEGORY</div>
              <div style={{display:"flex",height:10,borderRadius:5,overflow:"hidden",marginBottom:8}}>
                {sorted.map(([cat,amt],i)=>(
                  <div key={i} style={{width:Math.max(2,Math.round(amt/catTotal*100))+"%",
                    background:catColors[cat]||C.muted,height:"100%"}}/>
                ))}
              </div>
              {sorted.map(([cat,amt])=>(
                <div key={cat} style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <div style={{width:8,height:8,borderRadius:2,background:catColors[cat]||C.muted,flexShrink:0}}/>
                  <span style={{fontSize:11,color:C.text,flex:1}}>{cat}</span>
                  <span style={{fontSize:11,fontWeight:600,color:C.text,fontFamily:T.mono}}>₹{fmtINR(amt)}</span>
                  <span style={{fontSize:9,color:C.muted,width:30,textAlign:"right"}}>{Math.round(amt/catTotal*100)}%</span>
                </div>
              ))}
            </div>
          );
        })()}

        </>);
      })()}

      {tab==="inventory"&&(()=>{
        const invSearch = invName;
        const invCats = [...new Set((inventory||[]).map(p=>p.category))].sort();
        const filtered = (inventory||[]).filter(p=>{
          if(invCatFilter!=="All"&&p.category!==invCatFilter) return false;
          if(invName.trim()&&!p.name.toLowerCase().includes(invName.toLowerCase())
            &&!p.sku.toLowerCase().includes(invName.toLowerCase())) return false;
          return true;
        }).sort((a,b)=>(a.stock<=a.minStock?0:1)-(b.stock<=b.minStock?0:1)||a.name.localeCompare(b.name));
        const totalValue=(inventory||[]).reduce((s,p)=>s+p.stock*p.cost,0);
        const lowCount=(inventory||[]).filter(p=>p.stock<=p.minStock).length;

        return (<>
        {/* Stats */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:10}}>
          <div style={{background:C.card,borderRadius:10,padding:"8px 6px",textAlign:"center",border:"1px solid "+C.border}}>
            <div style={{fontSize:16,fontWeight:700,color:C.text,fontFamily:T.mono}}>{(inventory||[]).length}</div>
            <div style={{fontSize:8,color:C.muted}}>ITEMS</div>
          </div>
          <div style={{background:C.card,borderRadius:10,padding:"8px 6px",textAlign:"center",border:"1px solid "+C.border}}>
            <div style={{fontSize:14,fontWeight:700,color:C.green,fontFamily:T.mono}}>₹{fmtINR(totalValue)}</div>
            <div style={{fontSize:8,color:C.muted}}>VALUE</div>
          </div>
          <div style={{background:lowCount>0?"#FFF0F0":C.card,borderRadius:10,padding:"8px 6px",textAlign:"center",
            border:"1px solid "+(lowCount>0?C.red+"44":C.border)}}>
            <div style={{fontSize:16,fontWeight:700,color:lowCount>0?C.red:C.green,fontFamily:T.mono}}>{lowCount}</div>
            <div style={{fontSize:8,color:lowCount>0?C.red:C.muted}}>LOW STOCK</div>
          </div>
        </div>

        {/* Search */}
        <div style={{display:"flex",alignItems:"center",background:C.card,borderRadius:10,padding:"0 10px",
          border:"1px solid "+C.border,marginBottom:8}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke={C.muted} strokeWidth="1.5"/>
            <line x1="16.5" y1="16.5" x2="21" y2="21" stroke={C.muted} strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input value={invName} onChange={e=>setInvName(e.target.value)}
            placeholder="Search parts by name or SKU..."
            style={{flex:1,padding:"9px 8px",background:"transparent",border:"none",
              fontSize:12,color:C.text,outline:"none",fontFamily:T.font}}/>
          {invName&&<button onClick={()=>setInvName("")} style={{background:"none",border:"none",
            cursor:"pointer",color:C.muted,fontSize:14}}>×</button>}
        </div>

        {/* Category pills */}
        <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:10}}>
          {["All",...invCats].map(c=>(
            <button key={c} onClick={()=>setInvCatFilter(c)}
              style={{padding:"4px 10px",borderRadius:12,border:"1.5px solid "+(invCatFilter===c?C.green:"#E5E4DF"),
                cursor:"pointer",fontSize:10,background:invCatFilter===c?C.green:"#fff",
                color:invCatFilter===c?"#fff":C.muted,fontWeight:invCatFilter===c?600:400,fontFamily:T.font}}>
              {c}
            </button>
          ))}
        </div>

        {/* Add new part */}
        {invQty==="show"?(
          <div style={{background:C.card,borderRadius:10,padding:12,border:"2px solid "+C.green+"44",marginBottom:10}}>
            <div style={{fontSize:10,fontWeight:700,color:C.green,marginBottom:8}}>ADD NEW PART</div>
            <div style={{display:"flex",gap:6,marginBottom:6}}>
              <input id="inv-name" placeholder="Part name *" style={{flex:1,padding:"8px 10px",background:C.bg,
                border:"1px solid "+C.border,borderRadius:8,fontSize:12,color:C.text,outline:"none",fontFamily:T.font}}/>
              <input id="inv-sku" placeholder="SKU" style={{width:80,padding:"8px 10px",background:C.bg,
                border:"1px solid "+C.border,borderRadius:8,fontSize:12,color:C.text,outline:"none",fontFamily:T.mono}}/>
            </div>
            <div style={{display:"flex",gap:6,marginBottom:6}}>
              <input id="inv-stock" placeholder="Stock qty" type="number" inputMode="numeric" style={{flex:1,padding:"8px 10px",
                background:C.bg,border:"1px solid "+C.border,borderRadius:8,fontSize:12,color:C.text,outline:"none",fontFamily:T.mono}}/>
              <input id="inv-min" placeholder="Min stock" type="number" inputMode="numeric" style={{flex:1,padding:"8px 10px",
                background:C.bg,border:"1px solid "+C.border,borderRadius:8,fontSize:12,color:C.text,outline:"none",fontFamily:T.mono}}/>
              <input id="inv-cost" placeholder="₹ Cost" type="number" inputMode="numeric" style={{flex:1,padding:"8px 10px",
                background:C.bg,border:"1px solid "+C.border,borderRadius:8,fontSize:12,color:C.text,outline:"none",fontFamily:T.mono}}/>
            </div>
            <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>
              {["Filters","Oils","Electrical","Brakes","Fluids","Accessories","General"].map(c=>(
                <button key={c} id={"inv-cat-"+c}
                  onClick={e=>{document.querySelectorAll("[id^=inv-cat-]").forEach(b=>b.style.background=C.bg);
                    e.currentTarget.style.background=C.green;e.currentTarget.style.color="#fff";e.currentTarget.dataset.sel="1";}}
                  style={{padding:"4px 10px",borderRadius:12,border:"1px solid #E5E4DF",
                    cursor:"pointer",fontSize:10,background:C.bg,color:C.muted,fontFamily:T.font}}>
                  {c}
                </button>
              ))}
            </div>
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>{
                const name=document.getElementById("inv-name")?.value?.trim();
                if(!name){return;}
                const sku=document.getElementById("inv-sku")?.value?.trim()||"P-"+Date.now();
                const stock=+(document.getElementById("inv-stock")?.value||0);
                const minStock=+(document.getElementById("inv-min")?.value||3);
                const cost=+(document.getElementById("inv-cost")?.value||0);
                const catBtn=document.querySelector("[id^=inv-cat-][data-sel='1']");
                const cat=catBtn?catBtn.textContent:"General";
                setInventory(prev=>[...prev,{id:Date.now(),name,sku,stock,minStock,cost,category:cat}]);
                setInvQty("");
              }}
                style={{flex:1,padding:"9px",borderRadius:8,border:"none",cursor:"pointer",
                  background:C.green,color:"#fff",fontSize:12,fontWeight:600,fontFamily:T.font}}>
                Save Part
              </button>
              <button onClick={()=>setInvQty("")}
                style={{padding:"9px 16px",borderRadius:8,border:"1px solid "+C.border,cursor:"pointer",
                  background:C.bg,color:C.muted,fontSize:12,fontFamily:T.font}}>
                Cancel
              </button>
            </div>
          </div>
        ):(
          <button onClick={()=>setInvQty("show")}
            style={{width:"100%",padding:"10px",borderRadius:10,border:"2px dashed "+C.green+"66",
              background:C.green+"08",cursor:"pointer",color:C.green,fontSize:12,fontWeight:600,
              fontFamily:T.font,marginBottom:10,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
            <span style={{fontSize:16}}>+</span> Add New Part
          </button>
        )}

        {/* Parts list */}
        {filtered.length===0?(
          <div style={{textAlign:"center",padding:20,color:C.muted,fontSize:12}}>
            {invName?"No parts match \""+invName+"\"":"No parts in inventory"}
          </div>
        ):(
          filtered.map(p=>{
            const isLow=p.stock<=p.minStock;
            return (
              <div key={p.id} style={{background:C.card,borderRadius:10,padding:"10px 12px",
                border:"1px solid "+(isLow?C.red+"44":C.border),marginBottom:6,
                borderLeft:"3px solid "+(isLow?C.red:C.green)}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,color:C.text,fontFamily:T.font}}>{p.name}</div>
                    <div style={{fontSize:10,color:C.muted,fontFamily:T.mono,marginTop:1}}>
                      {p.sku} · {p.category} · ₹{fmtINR(p.cost)}/unit
                    </div>
                  </div>
                  <div style={{textAlign:"center",flexShrink:0}}>
                    <div style={{fontSize:20,fontWeight:700,fontFamily:T.mono,
                      color:isLow?C.red:C.green}}>{p.stock}</div>
                    <div style={{fontSize:8,color:isLow?C.red:C.muted}}>
                      {isLow?"LOW! min:"+p.minStock:"min:"+p.minStock}
                    </div>
                  </div>
                </div>
                {/* Quick stock buttons */}
                <div style={{display:"flex",gap:4,marginTop:8,alignItems:"center"}}>
                  <button onClick={()=>addStock(p.id,-1)}
                    style={{width:30,height:28,borderRadius:6,border:"1px solid "+C.border,background:C.bg,
                      color:C.red,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:T.mono}}>−</button>
                  {[1,5,10].map(n=>(
                    <button key={n} onClick={()=>addStock(p.id,n)}
                      style={{height:28,padding:"0 10px",borderRadius:6,border:"1px solid "+C.border,background:C.bg,
                        color:C.green,fontSize:11,fontFamily:T.mono,cursor:"pointer",fontWeight:600}}>+{n}</button>
                  ))}
                  <div style={{flex:1}}/>
                  <span style={{fontSize:10,color:C.muted,fontFamily:T.mono}}>
                    Val: ₹{fmtINR(p.stock*p.cost)}
                  </span>
                  <button onClick={()=>{
                    setInventory(prev=>prev.filter(x=>x.id!==p.id));
                  }}
                    style={{background:"none",border:"none",cursor:"pointer",color:C.red,
                      fontSize:13,opacity:.4,padding:"0 2px"}}>×</button>
                </div>
              </div>
            );
          })
        )}
        </>);
      })()}

      {tab==="expenses"&&(()=>{
        const [yr,mo] = calMonth.split("-").map(Number);
        const daysInMonth = new Date(yr,mo,0).getDate();
        const firstDay = new Date(yr,mo-1,1).getDay();
        const calDays = [];
        for(let i=0;i<firstDay;i++) calDays.push(null);
        for(let d=1;d<=daysInMonth;d++) calDays.push(d);
        const makeDateStr = (d) => calMonth+"-"+String(d).padStart(2,"0");
        const expDates = {};
        allExpenses.forEach(e=>{expDates[e.date]=(expDates[e.date]||0)+e.amount;});
        const dayExpenses = allExpenses.filter(e=>e.date===expDate);
        const dayTotal = dayExpenses.reduce((s,e)=>s+e.amount,0);
        const monthStart=calMonth+"-01";
        const monthEnd=calMonth+"-"+String(daysInMonth).padStart(2,"0");
        const monthExp = allExpenses.filter(e=>e.date>=monthStart&&e.date<=monthEnd);
        const monthTotal = monthExp.reduce((s,e)=>s+e.amount,0);
        const todayExp = allExpenses.filter(e=>e.date===today);
        const todayTotal = todayExp.reduce((s,e)=>s+e.amount,0);
        const prevMonth = () => {const d=new Date(yr,mo-2,1);setCalMonth(d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"));};
        const nextMonth = () => {const d=new Date(yr,mo,1);setCalMonth(d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"));};
        const monthName = new Date(yr,mo-1).toLocaleDateString("en",{month:"short",year:"numeric"});

        const quickItems = [
          {l:"Tea/Coffee",ic:"\u2615",amt:50,cat:"General"},
          {l:"Lunch",ic:"\uD83C\uDF5B",amt:150,cat:"Staff"},
          {l:"Fuel",ic:"\u26FD",amt:500,cat:"Maintenance"},
          {l:"Transport",ic:"\uD83D\uDE95",amt:200,cat:"General"},
          {l:"Cleaning",ic:"\uD83E\uDDF9",amt:100,cat:"Maintenance"},
          {l:"Stationery",ic:"\uD83D\uDCDD",amt:50,cat:"General"},
        ];

        const addQuick = (item) => {
          setExpenses(prev=>[{id:Date.now(),date:expDate,desc:item.l,amount:item.amt,category:item.cat},...prev]);
        };

        return (<>
        {/* Today summary bar */}
        <div style={{display:"flex",gap:8,marginBottom:10}}>
          <div style={{flex:1,background:C.card,borderRadius:12,padding:"10px 12px",border:"1px solid "+C.border}}>
            <div style={{fontSize:9,color:C.muted,fontWeight:600}}>TODAY</div>
            <div style={{fontSize:18,fontWeight:700,color:todayTotal>0?C.red:C.muted,fontFamily:T.mono}}>{"\u20b9"}{fmtINR(todayTotal)}</div>
            <div style={{fontSize:9,color:C.muted}}>{todayExp.length} entries</div>
          </div>
          <div style={{flex:1,background:C.card,borderRadius:12,padding:"10px 12px",border:"1px solid "+C.border}}>
            <div style={{fontSize:9,color:C.muted,fontWeight:600}}>{monthName.toUpperCase()}</div>
            <div style={{fontSize:18,fontWeight:700,color:monthTotal>0?C.amber:C.muted,fontFamily:T.mono}}>{"\u20b9"}{fmtINR(monthTotal)}</div>
            <div style={{fontSize:9,color:C.muted}}>{monthExp.length} entries</div>
          </div>
        </div>

        {/* Quick add buttons */}
        <div style={{background:C.card,borderRadius:12,border:"1px solid "+C.border,padding:"8px 10px",marginBottom:10}}>
          <div style={{fontSize:9,fontWeight:700,color:C.muted,letterSpacing:.3,marginBottom:6}}>QUICK ADD</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:5}}>
            {quickItems.map(item=>(
              <button key={item.l} onClick={()=>addQuick(item)}
                style={{padding:"8px 4px",borderRadius:8,border:"1px solid "+C.border,
                  background:C.bg,cursor:"pointer",textAlign:"center"}}>
                <div style={{fontSize:16}}>{item.ic}</div>
                <div style={{fontSize:9,fontWeight:600,color:C.text,marginTop:2}}>{item.l}</div>
                <div style={{fontSize:9,color:C.muted,fontFamily:T.mono}}>{"\u20b9"}{item.amt}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom add */}
        <div style={{background:C.card,borderRadius:12,padding:"8px 10px",border:"1px solid "+C.border,marginBottom:10}}>
          <div style={{display:"flex",gap:6,marginBottom:6}}>
            <input value={expDesc} onChange={e=>setExpDesc(e.target.value)} placeholder="What did you spend on?"
              style={{flex:1,padding:"8px 10px",background:C.bg,border:"1px solid "+C.border,borderRadius:8,
                color:C.text,fontSize:12,fontFamily:T.font,outline:"none",boxSizing:"border-box"}}/>
            <div style={{display:"flex",alignItems:"center",background:C.bg,border:"1px solid "+C.border,
              borderRadius:8,width:80,overflow:"hidden"}}>
              <span style={{padding:"0 2px 0 6px",fontSize:11,color:C.muted,fontWeight:700}}>{"\u20b9"}</span>
              <input value={expAmt} onChange={e=>setExpAmt(e.target.value.replace(/[^0-9.]/g,""))}
                placeholder="0" inputMode="numeric"
                style={{flex:1,padding:"8px 4px",background:"transparent",border:"none",
                  color:C.text,fontSize:12,fontFamily:T.mono,outline:"none",width:"100%"}}/>
            </div>
            <button onClick={()=>{
              if(!expDesc.trim()||!expAmt||+expAmt<=0) return;
              setExpenses(prev=>[{id:Date.now(),date:expDate,desc:expDesc.trim(),amount:+expAmt,category:expCat},...prev]);
              setExpDesc("");setExpAmt("");
            }}
              style={{padding:"8px 12px",borderRadius:8,border:"none",cursor:"pointer",
                background:expDesc.trim()&&expAmt&&+expAmt>0?C.amber:C.border,
                color:expDesc.trim()&&expAmt&&+expAmt>0?"#fff":C.muted,fontSize:11,fontWeight:700,flexShrink:0}}>
              +
            </button>
          </div>
          <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
            {["General","Utilities","Staff","Maintenance","Parts","Rent","Other"].map(c=>(
              <button key={c} onClick={()=>setExpCat(c)}
                style={{padding:"2px 8px",borderRadius:10,border:"1px solid "+(expCat===c?C.amber:"#E5E4DF"),
                  cursor:"pointer",fontSize:8,background:expCat===c?C.amber:C.bg,
                  color:expCat===c?"#fff":C.muted,fontWeight:expCat===c?600:400}}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Calendar — compact */}
        <div style={{background:C.card,borderRadius:12,border:"1px solid "+C.border,marginBottom:10,overflow:"hidden"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 10px",
            background:"#F5F4F0",borderBottom:"1px solid "+C.border}}>
            <button onClick={prevMonth} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:C.muted,padding:"2px 6px"}}>{"\u25c0"}</button>
            <span style={{fontSize:11,fontWeight:700,color:C.text}}>{monthName}</span>
            <button onClick={nextMonth} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:C.muted,padding:"2px 6px"}}>{"\u25b6"}</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:0,padding:"4px 6px 1px"}}>
            {["S","M","T","W","T","F","S"].map((d,i)=>(
              <div key={i} style={{textAlign:"center",fontSize:8,fontWeight:700,color:C.muted,padding:1}}>{d}</div>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:1,padding:"0 6px 6px"}}>
            {calDays.map((d,i)=>{
              if(!d) return <div key={i}/>;
              const ds = makeDateStr(d);
              const isSel = ds===expDate;
              const isToday = ds===today;
              const dayAmt = expDates[ds]||0;
              return (
                <button key={i} onClick={()=>setExpDate(ds)}
                  style={{background:isSel?C.amber:isToday?"#EAF3DE":"transparent",
                    border:isSel?"1.5px solid "+C.amber:isToday?"1.5px solid #3B6D1144":"1.5px solid transparent",
                    borderRadius:6,padding:"4px 0",cursor:"pointer",textAlign:"center",position:"relative"}}>
                  <span style={{fontSize:11,fontWeight:isSel||isToday?700:400,
                    color:isSel?"#fff":isToday?C.green:C.text}}>{d}</span>
                  {dayAmt>0&&!isSel&&<div style={{position:"absolute",bottom:1,left:"50%",marginLeft:-2,
                    width:4,height:4,borderRadius:2,background:C.red}}/>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected date header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"2px 4px 6px"}}>
          <span style={{fontSize:10,fontWeight:700,color:C.muted}}>
            {expDate===today?"TODAY":fmtDate(expDate)} ({dayExpenses.length})
          </span>
          <span style={{fontSize:13,fontWeight:700,color:dayTotal>0?C.red:C.muted,fontFamily:T.mono}}>
            {"\u20b9"}{fmtINR(dayTotal)}
          </span>
        </div>

        {/* Day expenses list */}
        {dayExpenses.length===0?(
          <div style={{textAlign:"center",padding:14,color:C.muted,fontSize:11,background:C.card,
            borderRadius:10,border:"1px solid "+C.border}}>No expenses</div>
        ):(
          dayExpenses.map(e=>(
            <div key={e.id} style={{display:"flex",alignItems:"center",gap:8,
              padding:"7px 10px",background:C.card,borderRadius:10,border:"1px solid "+C.border,marginBottom:3}}>
              <div style={{width:4,height:4,borderRadius:2,flexShrink:0,
                background:e.isVendor?"#534AB7":C.amber}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:11,color:C.text,fontFamily:T.font,
                  overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.desc}</div>
                <div style={{fontSize:8,color:C.muted}}>{e.category}{e.vehicle?" \u00b7 "+e.vehicle:""}</div>
              </div>
              <span style={{fontSize:12,fontWeight:700,fontFamily:T.mono,color:C.red,flexShrink:0}}>{"\u20b9"}{fmtINR(e.amount)}</span>
              {!e.isVendor&&(
                <button onClick={()=>setExpenses(prev=>prev.filter(x=>x.id!==e.id))}
                  style={{background:"none",border:"none",cursor:"pointer",color:"#A32D2D",
                    fontSize:12,padding:"0 2px",opacity:.4,flexShrink:0}}>{"\u00d7"}</button>
              )}
            </div>
          ))
        )}

        {/* Monthly category breakdown */}
        {monthExp.length>0&&(
          <div style={{background:C.card,borderRadius:12,border:"1px solid "+C.border,marginTop:8,overflow:"hidden"}}>
            <div style={{padding:"5px 10px",background:"#F5F4F0",borderBottom:"1px solid "+C.border,
              display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:9,fontWeight:700,color:C.muted}}>{monthName.toUpperCase()} BREAKDOWN</span>
              <span style={{fontSize:11,fontWeight:700,color:C.red,fontFamily:T.mono}}>{"\u20b9"}{fmtINR(monthTotal)}</span>
            </div>
            {(()=>{
              const cats = {};
              monthExp.forEach(e=>{cats[e.category]=(cats[e.category]||0)+e.amount;});
              const sorted = Object.entries(cats).sort((a,b)=>b[1]-a[1]);
              const maxCat = sorted[0]?sorted[0][1]:1;
              return sorted.map(([cat,amt],i)=>(
                <div key={cat} style={{padding:"5px 10px",borderBottom:i<sorted.length-1?"0.5px solid #F1EFE8":"none"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                    <span style={{fontSize:10,fontWeight:600,color:C.text}}>{cat}</span>
                    <span style={{fontSize:10,fontWeight:700,color:C.red,fontFamily:T.mono}}>{"\u20b9"}{fmtINR(amt)}</span>
                  </div>
                  <div style={{height:3,background:"#F1EFE8",borderRadius:2,overflow:"hidden"}}>
                    <div style={{width:Math.round(amt/maxCat*100)+"%",height:"100%",
                      background:C.amber,borderRadius:2}}/>
                  </div>
                </div>
              ));
            })()}
          </div>
        )}
        </>);
      })()}

      </div>
    </div>
  );
}


// ---

// ---
// WORK CARD — Services + Parts + Outsource (Receptionist/Admin only)
// ---
function WorkCard({ job, user, dispatch, showFlash, onClose }) {
  const [view, setView] = useState("svc"); // svc | part | out | log
  const [grp,setGrp] = useState(SVC_CATEGORIES[0].k);
  const [q,setQ] = useState("");
  const [svcName,setSvcName] = useState("");
  const [svcPrice,setSvcPrice] = useState("");
  const [partName,setPartName]   = useState("");
  const [partCost,setPartCost]   = useState("");
  const [partType,setPartType]   = useState("new"); // new | old
  const [partPhoto,setPartPhoto] = useState(null);
  const partPhotoRef             = useRef(null);
  const [outSvc,setOutSvc] = useState("");
  const [outVendor,setOutVendor] = useState("");
  const [outCost,setOutCost] = useState("");
  const [outVendorCost,setOutVendorCost] = useState("");
  const priceRef = useRef(null);

  const added = (job.items||[]).map(c=>c.complaint);
  const addSvc = () => {
    const n=(svcName||q).trim(); if(!n) return;
    dispatch("ADD_SERVICE",{jobNo:job.jobNo,complaint:n,price:svcPrice,by:user.name});
    setSvcName("");setSvcPrice("");setQ("");setView("svc");showFlash("🔧 Service added");
  };
  const addPart = () => {
    const name = partName.trim() || (partType==="old"?"Removed part":"New part");
    dispatch("ADD_PART",{jobNo:job.jobNo,part:{
      name:name,
      cost:partType==="new"?+partCost||0:0,
      type:partType,
      photo:partPhoto||null,
      done:false,
    },by:user.name});
    setPartName("");setPartCost("");setPartPhoto(null);
    setView("svc");
    showFlash(partType==="new"?"🔩 New part added":"🗑️ Old part recorded");
  };
  const addOut = () => {
    if(!outSvc.trim()||!outVendor.trim()) return;
    dispatch("ADD_OUTSOURCE",{jobNo:job.jobNo,item:{service:outSvc.trim(),vendor:outVendor.trim(),cost:+outCost||0,vendorCost:+outVendorCost||0,status:"pending",sentDate:dt()},by:user.name});
    setOutSvc("");setOutVendor("");setOutCost("");setOutVendorCost("");setView("svc");showFlash("📤 Outsourced");
  };

  const total = (job.items||[]).reduce((t,c)=>t+(+c.price||0),0)
    + (job._parts||[]).filter(p=>p.type==="new").reduce((t,p)=>t+(+p.cost||0),0)
    + (job.outsourced||[]).reduce((t,o)=>t+(+o.cost||0),0);

  const fi = {background:"#FFFFFF",border:"1px solid #E5E4DF",borderRadius:8,padding:"10px 13px",fontSize:13,color:T.text,outline:"none",fontFamily:T.font,width:"100%",boxSizing:"border-box"};

  return (
    <div style={{margin:"4px 10px",background:"#F5F4F0",borderRadius:12,border:"1px solid #E5E4DF",overflow:"hidden"}}>
      {/* Sub-tabs + close */}
      <div style={{display:"flex",borderBottom:"1px solid #E5E4DF",alignItems:"center"}}>
        {[["svc","＋ Service"],["part","＋ Part"],["out","📤 Outsource"]].map(([v,l])=>(
          <button key={v} onClick={()=>setView(v)}
            style={{flex:1,padding:"8px 4px",border:"none",cursor:"pointer",fontFamily:T.font,fontSize:11,fontWeight:view===v?700:500,background:"transparent",color:view===v?T.green:T.textMuted,borderBottom:view===v?`2px solid ${T.green}`:"2px solid transparent"}}>
            {l}
          </button>
        ))}
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:T.textMuted,fontSize:20,lineHeight:1,padding:"0 8px",flexShrink:0}}>×</button>
      </div>



      {/* ADD SERVICE — belongings style */}
      {view==="svc"&&(
        <div style={{padding:"10px 12px"}}>
          {/* Category tabs */}
          <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:8}}>
            {SVC_CATEGORIES.map(c=>(
              <button key={c.k} onClick={()=>setGrp(c.k)}
                style={{padding:"5px 10px",borderRadius:14,cursor:"pointer",fontSize:11,
                  fontWeight:grp===c.k?600:400,whiteSpace:"nowrap",
                  border:grp===c.k?"1.5px solid #3B6D11":"1.5px solid #E5E4DF",
                  background:grp===c.k?"#EAF3DE":"#FAFAF8",
                  color:grp===c.k?"#3B6D11":"#888780"}}>
                {c.l}
              </button>
            ))}
          </div>
          {/* Toggle pills — belongings style */}
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8,maxHeight:160,overflowY:"auto"}}>
            {(SVC_CATEGORIES.find(c=>c.k===grp)?.svcs||[]).map(s=>{
              const isAdded = added.includes(s);
              const idx = isAdded ? (job.items||[]).findIndex(c=>c.complaint===s) : -1;
              const isDone = idx>=0 && (job._servicesDone||[]).includes(idx);
              return (
                <button key={s} onClick={()=>{
                  if(isAdded) return;
                  setSvcName(s);setSvcPrice("");
                  setTimeout(()=>priceRef.current?.focus(),80);
                }}
                  style={{padding:"8px 12px",borderRadius:20,cursor:isAdded?"default":"pointer",fontSize:12,
                    border:isAdded?(isDone?"1.5px solid #3B6D11":"1.5px solid #854F0B"):"1.5px solid #E5E4DF",
                    background:isDone?"#EAF3DE":isAdded?"#FFF8EE":"#FAFAF8",
                    color:isDone?"#3B6D11":isAdded?"#854F0B":"#888780",
                    fontWeight:isAdded?600:400,
                    display:"flex",alignItems:"center",gap:5,
                    transition:"all .15s"}}>
                  <span style={{fontSize:13}}>{isDone?"✓":isAdded?"●":"+"}</span>
                  {s}
                </button>
              );
            })}
          </div>
          {/* Custom input — dashed pill */}
          <div style={{display:"flex",gap:6,marginBottom:6}}>
            <input value={q} onChange={e=>setQ(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&q.trim()){setSvcName(q.trim());setQ("");setTimeout(()=>priceRef.current?.focus(),80);}}}
              placeholder="+ Type custom service..."
              style={{flex:1,padding:"8px 12px",background:"#FAFAF8",
                border:"1.5px dashed #E5E4DF",borderRadius:20,
                fontSize:12,color:"#1B1B1A",outline:"none"}}/>
          </div>
          {/* Price input */}
          {svcName&&(
            <div style={{background:"#EAF3DE",borderRadius:10,padding:"8px 10px",border:"1.5px solid #3B6D1144"}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                <span style={{flex:1,fontSize:12,fontWeight:600,color:"#3B6D11"}}>✓ {svcName}</span>
                <button onClick={()=>{setSvcName("");setSvcPrice("");}} style={{background:"none",border:"none",cursor:"pointer",color:"#888780",fontSize:16}}>×</button>
              </div>
              <div style={{display:"flex",gap:6}}>
                <div style={{flex:1,display:"flex",alignItems:"center",background:"#fff",borderRadius:8,border:"1.5px solid #E5E4DF"}}>
                  <span style={{padding:"0 6px 0 10px",color:"#888780",fontWeight:700}}>₹</span>
                  <input ref={priceRef} value={svcPrice} onChange={e=>setSvcPrice(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")addSvc();}}
                    type="number" inputMode="numeric" placeholder="Price"
                    style={{flex:1,padding:"8px 6px 8px 0",border:"none",background:"#fff",fontSize:13,outline:"none",color:"#1B1B1A",fontWeight:700}}/>
                </div>
                <button onClick={addSvc} style={{padding:"8px 16px",background:"#3B6D11",color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer"}}>Add</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ADD PART — belongings style */}
      {view==="part"&&(
        <div style={{padding:"10px 12px",display:"flex",flexDirection:"column",gap:8,overflowY:"auto",maxHeight:"55vh"}}>
          {/* New / Old toggle — pill style */}
          <div style={{display:"flex",gap:6}}>
            {[["new","🔩 New Part"],["old","🗑️ Old Part"]].map(([t,l])=>(
              <button key={t} onClick={()=>setPartType(t)}
                style={{flex:1,padding:"8px 12px",borderRadius:20,cursor:"pointer",fontSize:12,
                  border:partType===t?(t==="new"?"1.5px solid #3B6D11":"1.5px solid #A32D2D"):"1.5px solid #E5E4DF",
                  background:partType===t?(t==="new"?"#EAF3DE":"#FFF0F0"):"#FAFAF8",
                  color:partType===t?(t==="new"?"#3B6D11":"#A32D2D"):"#888780",
                  fontWeight:partType===t?600:400,textAlign:"center"}}>
                {l}
              </button>
            ))}
          </div>
          {/* Part name */}
          <input value={partName} onChange={e=>setPartName(e.target.value)}
            placeholder={partType==="new"?"New part name (e.g. Bosch Oil Filter)":"Old part removed (e.g. Old brake pads)"}
            style={{background:"#FAFAF8",border:"1.5px solid #E5E4DF",borderRadius:20,
              padding:"8px 14px",fontSize:12,color:"#1B1B1A",outline:"none"}}/>
          {/* Cost — only for new parts */}
          {partType==="new"&&(
            <div style={{display:"flex",alignItems:"center",background:"#FAFAF8",
              borderRadius:20,border:"1.5px solid #E5E4DF"}}>
              <span style={{padding:"0 6px 0 14px",color:"#888780",fontWeight:700}}>₹</span>
              <input value={partCost} onChange={e=>setPartCost(e.target.value)}
                type="number" inputMode="numeric" placeholder="Cost"
                style={{flex:1,padding:"8px 8px 8px 0",border:"none",background:"transparent",
                  fontSize:13,outline:"none",color:"#1B1B1A",fontWeight:700}}/>
            </div>
          )}
          {/* Photo capture — for both new and old parts */}
          <div>
              <input ref={partPhotoRef} type="file" accept="image/*"
                style={{display:"none"}}
                onChange={e=>{
                  const file=e.target.files&&e.target.files[0]; if(!file) return;
                  const reader=new FileReader();
                  reader.onload=ev=>{
                    const img=new Image();
                    img.onload=()=>{
                      const cv=document.createElement("canvas");
                      const sc=Math.min(1,1200/Math.max(img.width,img.height));
                      cv.width=img.width*sc; cv.height=img.height*sc;
                      cv.getContext("2d").drawImage(img,0,0,cv.width,cv.height);
                      setPartPhoto(cv.toDataURL("image/jpeg",.82));
                    };
                    img.src=ev.target.result;
                  };
                  reader.readAsDataURL(file);
                }}/>
              {partPhoto?(
                <div style={{position:"relative",borderRadius:8,overflow:"hidden",
                  border:`1px solid ${T.green}55`}}>
                  <img src={partPhoto} alt="part"
                    style={{width:"100%",height:80,objectFit:"cover",display:"block"}}/>
                  <div style={{position:"absolute",top:4,right:4,display:"flex",gap:4}}>
                    <button onClick={()=>partPhotoRef.current&&partPhotoRef.current.click()}
                      style={{padding:"2px 7px",background:"rgba(0,0,0,0.6)",
                        border:"none",borderRadius:4,cursor:"pointer",
                        fontSize:9,color:"#fff",fontFamily:T.font}}>🔄</button>
                    <button onClick={()=>setPartPhoto(null)}
                      style={{padding:"2px 7px",background:"rgba(232,93,74,0.7)",
                        border:"none",borderRadius:4,cursor:"pointer",
                        fontSize:9,color:"#fff"}}>×</button>
                  </div>
                  <div style={{position:"absolute",bottom:0,left:0,right:0,
                    padding:"3px 7px",background:"rgba(0,0,0,0.6)",
                    fontSize:9,color:"rgba(255,255,255,0.8)",fontFamily:T.font}}>
                    📷 {partType==="new"?"New part photo":"Old part photo"}
                  </div>
                </div>
              ):(
                <button onClick={()=>partPhotoRef.current&&partPhotoRef.current.click()}
                  style={{width:"100%",padding:"9px",background:"#FFFFFF",
                    border:"1.5px dashed #2A3942",borderRadius:8,cursor:"pointer",
                    display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                    fontFamily:T.font}}>
                  <span style={{fontSize:16}}>📷</span>
                  <span style={{fontSize:12,color:T.textMuted}}>{partType==="new"?"Photo of new part":"Photo of old part"}</span>
                  <span style={{fontSize:10,color:T.textMuted,opacity:.6}}>(optional)</span>
                </button>
              )}
            </div>
          <button onClick={addPart} disabled={!partName.trim()&&!partPhoto&&partType==="new"}
            style={{padding:"11px",background:(partName.trim()||partPhoto||partType==="old")?T.green:"#E5E4DF",color:"#fff",
              border:"none",borderRadius:8,fontSize:13,fontWeight:800,
              cursor:(partName.trim()||partPhoto||partType==="old")?"pointer":"not-allowed",fontFamily:T.font}}>
            {partType==="new"?"Add New Part":"Record Removed Part"}
          </button>
        </div>
      )}

      {/* OUTSOURCE */}
      {view==="out"&&(
        <div style={{padding:"10px 12px",display:"flex",flexDirection:"column",gap:8}}>
          {/* Common outsource suggestions */}
          <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
            {["Flywheel Resurfacing","Radiator Repair","AC Compressor Repair","Denting & Painting",
              "Windshield Replacement","Headlight Restoration","Bumper Repair","Alloy Wheel Repair",
              "Turbo Repair","Injector Service","ECU Repair","Starter Motor Repair",
              "Alternator Repair","Power Steering Repair","Gearbox Repair","Differential Repair",
              "Silencer Fabrication","Upholstery Work","CNG/LPG Kit","Wheel Alignment (Laser)"]
              .filter(s=>!(job.outsourced||[]).some(o=>o.service===s))
              .map(s=>
              <button key={s} onClick={()=>setOutSvc(s)}
                style={{padding:"5px 12px",borderRadius:14,cursor:"pointer",fontSize:12,
                  border:"none",background:outSvc===s?T.green:T.border,
                  color:outSvc===s?"#fff":T.textMuted,fontFamily:T.font,
                  fontWeight:outSvc===s?600:400}}>
                {s}
              </button>
            )}
          </div>
          <input value={outSvc} onChange={e=>setOutSvc(e.target.value)} placeholder="Or type custom work..."
            style={{background:"#FFFFFF",border:"1px solid #E5E4DF",borderRadius:8,padding:"10px 13px",fontSize:13,color:T.text,outline:"none",fontFamily:T.font}}/>
          <input value={outVendor} onChange={e=>setOutVendor(e.target.value)} placeholder="Vendor name (e.g. Krishna Engineering)"
            style={{background:"#FFFFFF",border:"1px solid #E5E4DF",borderRadius:8,padding:"10px 13px",fontSize:13,color:T.text,outline:"none",fontFamily:T.font}}/>
          <div style={{display:"flex",gap:8}}>
            <div style={{flex:1}}>
              <div style={{fontSize:9,color:T.textMuted,marginBottom:3}}>Customer cost</div>
              <div style={{display:"flex",alignItems:"center",background:"#FFFFFF",borderRadius:8,border:"1px solid #E5E4DF"}}>
                <span style={{padding:"0 4px 0 10px",color:T.textMuted,fontWeight:700,fontSize:11}}>₹</span>
                <input value={outCost} onChange={e=>setOutCost(e.target.value)} type="number" inputMode="numeric" placeholder="0"
                  style={{flex:1,padding:"10px 6px 10px 0",border:"none",background:"transparent",fontSize:13,fontFamily:T.mono,outline:"none",color:T.text,fontWeight:700}}/>
              </div>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:9,color:T.textMuted,marginBottom:3}}>Vendor cost (for accounts)</div>
              <div style={{display:"flex",alignItems:"center",background:"#FFFFFF",borderRadius:8,border:"1px solid #E5E4DF"}}>
                <span style={{padding:"0 4px 0 10px",color:"#F0AD00",fontWeight:700,fontSize:11}}>₹</span>
                <input value={outVendorCost} onChange={e=>setOutVendorCost(e.target.value)} type="number" inputMode="numeric" placeholder="0"
                  style={{flex:1,padding:"10px 6px 10px 0",border:"none",background:"transparent",fontSize:13,fontFamily:T.mono,outline:"none",color:T.text,fontWeight:700}}/>
              </div>
            </div>
          </div>
          <button onClick={addOut} disabled={!outSvc.trim()||!outVendor.trim()}
            style={{padding:"10px 14px",background:(outSvc.trim()&&outVendor.trim())?T.green:"#E5E4DF",color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:(outSvc.trim()&&outVendor.trim())?"pointer":"not-allowed",fontFamily:T.font,width:"100%"}}>
            📤 Send Out
          </button>
        </div>
      )}

      {/* ── Save / Done bar — always visible at bottom ── */}
      {(()=>{
        const svcDone = (job.items||[]).length>0 && (job._servicesDone||[]).length===(job.items||[]).length;
        const partsDone = (job._parts||[]).filter(p=>p.type==="new").every(p=>p.done);
        const outDone = (job.outsourced||[]).every(o=>o.status==="received");
        const allDone = svcDone && partsDone && outDone;
        const svcCount = (job._servicesDone||[]).length;
        const svcTotal = (job.items||[]).length;
        const msg = !svcTotal?"Add services first"
          :!svcDone?svcCount+"/"+svcTotal+" services done"
          :!partsDone?"Mark all parts as done"
          :!outDone?"Receive all outwork"
          :"💾 Save";
        return (
      <div style={{padding:"8px 12px",borderTop:"1px solid #E5E4DF",
        background:"#FAFAF8",display:"flex",gap:8}}>
        <div style={{flex:1,display:"flex",alignItems:"center",gap:6}}>
          {svcTotal>0&&(
            <span style={{fontSize:11,color:T.textMuted,fontFamily:T.font}}>
              {svcTotal} service{svcTotal>1?"s":""} · ₹{fmtINR(total)}
            </span>
          )}
        </div>
        <button onClick={()=>{if(allDone){showFlash("✅ Work saved");onClose();}}}
          style={{padding:"9px 20px",background:allDone?T.green:"#C5C4BF",border:"none",borderRadius:8,
            cursor:allDone?"pointer":"not-allowed",fontSize:12,color:"#fff",fontWeight:700,
            fontFamily:T.font,flexShrink:0,
            boxShadow:allDone?"0 2px 6px rgba(59,109,17,.3)":"none",
            opacity:allDone?1:0.7}}>
          {msg}
        </button>
      </div>);})()}
    </div>
  );
}

// ---
// WORK SUMMARY CARD — live card showing all work added to the job
// Services (with tick status) + Old parts removed + New parts + Outsourced
// ---
// ── Part Photo Adder — inline in WorkSummaryCard ─────────────
function PartPhotoAdder({ part, jobIdx, jobNo, user, dispatch, showFlash }) {
  const ref = useRef(null);
  const handleFile = file => {
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const cv = document.createElement("canvas");
        const sc = Math.min(1, 1200/Math.max(img.width,img.height));
        cv.width=img.width*sc; cv.height=img.height*sc;
        cv.getContext("2d").drawImage(img,0,0,cv.width,cv.height);
        dispatch("UPDATE_PART_PHOTO",{jobNo,idx:jobIdx,
          photo:cv.toDataURL("image/jpeg",.82),name:part.name,by:user.name});
        showFlash("📷 Photo added for "+part.name);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };
  return (
    <div>
      <input ref={ref} type="file" accept="image/*" style={{display:"none"}}
        onChange={e=>handleFile(e.target.files&&e.target.files[0])}/>
      <button onClick={()=>ref.current&&ref.current.click()}
        style={{width:"100%",marginTop:3,padding:"5px 8px",
          background:"transparent",border:"1px dashed #2A3942",
          borderRadius:6,cursor:"pointer",fontFamily:T.font,
          display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
        <span style={{fontSize:13}}>📷</span>
        <span style={{fontSize:10,color:T.textMuted}}>Add part photo</span>
      </button>
    </div>
  );
}


function WorkSummaryCard({ job, user, dispatch, showFlash, onGoToQC, onNavigate, onUndoWork, activeStep }) {
  const [editIdx, setEditIdx] = useState(null);
  const [editVal, setEditVal] = useState("");
  const [workSaved, setWorkSaved] = useState(false);

  // Reset workSaved when services are cleared OR work is undone
  useEffect(()=>{
    const svcDone = (job._servicesDone||[]).length===(job.items||[]).length&&(job.items||[]).length>0;
    if(!svcDone) setWorkSaved(false);
  },[job._servicesDone, job.items]);

  useEffect(()=>{
    if(job._workUndoneAt) setWorkSaved(false);
  },[job._workUndoneAt]);

  const services   = job.items || [];
  const newParts   = (job._parts||[]).filter(p=>p.type==="new");
  const oldParts   = (job._parts||[]).filter(p=>p.type==="old");
  const outsourced = job.outsourced || [];
  const allParts   = job._parts||[];

  // Progress counts only services + new parts + outsourced (old parts = documentation only)
  const svcDone    = (job._servicesDone||[]).length;
  const partsDone  = newParts.filter(p=>p.done).length;
  const outDone    = outsourced.filter(o=>o.status==="received").length;
  const totalItems = services.length + newParts.length + outsourced.length;
  const doneCount  = svcDone + partsDone + outDone;
  const allSvcDone = services.length>0 && svcDone===services.length;
  const allOutDone = outsourced.every(o=>o.status==="received");
  const allPartsDone = newParts.every(p=>p.done);
  const workComplete = totalItems>0 && doneCount===totalItems;

  const total = services.reduce((t,c)=>t+(+c.price||0),0)
              + newParts.reduce((t,p)=>t+(+p.cost||0),0)
              + outsourced.reduce((t,o)=>t+(+o.cost||0),0);

  if(services.length===0 && newParts.length===0 && oldParts.length===0 && outsourced.length===0) return null;

  const isMech    = user.role==="mechanic";
  const canEdit   = !isMech;
  const pct       = totalItems>0 ? Math.round(doneCount/totalItems*100) : 0;
  const bdrCol    = workComplete ? T.green+"66" : "#E5E4DF";
  const hdrBg     = workComplete ? "#EAF3DE" : "#F5F4F0";

  const savePrice = (jobIdx, displayIdx) => {
    dispatch("UPDATE_SVC_PRICE",{jobNo:job.jobNo,idx:jobIdx,price:editVal});
    setEditIdx(null);
    showFlash("₹ Updated");
  };

  return (
    <div style={{margin:"4px 10px",background:"#F5F4F0",borderRadius:10,
      border:"1px solid "+bdrCol,overflow:"hidden",transition:"border-color .3s"}}>

      {/* Header — compact */}
      <div style={{background:hdrBg,padding:"6px 10px",
        display:"flex",alignItems:"center",gap:8,transition:"background .3s"}}>
        <span style={{fontSize:13}}>{workComplete&&workSaved?"✅":"🔧"}</span>
        <span style={{fontSize:12,fontWeight:700,
          color:workComplete&&workSaved?T.green:"#1B1B1A",fontFamily:T.font}}>
          {workComplete&&workSaved?"Work Complete":"Work in Progress"}
        </span>
        {workSaved&&(
          <span style={{fontSize:9,color:T.green,fontWeight:700,fontFamily:T.font,
            background:T.green+"18",padding:"2px 6px",borderRadius:4}}>✅ Saved</span>
        )}
        <div style={{flex:1}}/>
        {totalItems>0&&(
          <div style={{display:"flex",alignItems:"center",gap:5,flexShrink:0}}>
            <span style={{fontSize:10,
              color:workComplete?T.green:T.textMuted,
              fontWeight:workComplete?700:400}}>
              {doneCount+"/"+totalItems}
            </span>
            <div style={{width:36,height:3,background:"#E5E4DF",borderRadius:2,overflow:"hidden"}}>
              <div style={{width:pct+"%",height:"100%",
                background:workComplete?"#00E096":T.green,
                borderRadius:2,transition:"width .3s"}}/>
            </div>
          </div>
        )}
      </div>

      {/* Mini workflow stepper — hidden when step content is open */}
      {!isMech&&onNavigate&&!activeStep&&(
        <div style={{display:"flex",alignItems:"center",gap:0,padding:"8px 8px 6px",
          background:"#FAFAF8",borderBottom:"1px solid #E5E4DF"}}>
          {[
            {k:"work",ic:"🔧",l:"Work",done:workComplete,
              active:!workComplete},
            {k:"qc",ic:"✅",l:"QC",done:!!(job._testDriveDone&&job._qcPassed&&job._custNotified),
              active:workComplete&&!(job._testDriveDone&&job._qcPassed&&job._custNotified)},
            {k:"nextservice",ic:"📝",l:"Next Visit",done:!!(job._nextDueDate||job.remarks),
              active:!!(job._testDriveDone&&job._qcPassed&&job._custNotified)&&!(job._nextDueDate||job.remarks)},
            {k:"servicedue",ic:"🔩",l:"Service Due",done:!!(job._nextVisitServices&&job._nextVisitServices.length>0),
              active:!!(job._nextDueDate||job.remarks)&&!(job._nextVisitServices&&job._nextVisitServices.length>0)},
            {k:"estimate",ic:"📄",l:"Estimate",done:!!job._estimateSent,
              active:!!(job._nextVisitServices&&job._nextVisitServices.length>0)&&!job._estimateSent},
            {k:"payment",ic:"💰",l:"Payment",
              done:!!job._estimateSent&&(job.payments||[]).reduce((s,p)=>s+p.amount,0)>=(job.totalAmount||1),
              active:!!job._estimateSent&&(job.payments||[]).reduce((s,p)=>s+p.amount,0)<(job.totalAmount||1)},
          ].map((s,i,arr)=>(
            <React.Fragment key={s.k}>
              <div style={{position:"relative",flexShrink:0}}>
                <button onClick={()=>{if(s.active||s.done) onNavigate(s.k);}}
                  style={{display:"flex",flexDirection:"column",alignItems:"center",gap:1,
                    padding:"2px 5px",background:"none",border:"none",
                    cursor:(s.active||s.done)?"pointer":"default",
                    opacity:(s.active||s.done)?1:0.35}}>
                  <div style={{width:22,height:22,borderRadius:11,
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,
                    background:s.done?"#EAF3DE":s.active?"#fff":"#F1EFE8",
                    border:"1.5px solid "+(s.done?T.green+"55":s.active?T.green:"#E5E4DF"),
                    color:s.done?T.green:s.active?T.green:T.textMuted,fontWeight:700}}>
                    {s.done?"✓":s.ic}
                  </div>
                  <span style={{fontSize:7,fontFamily:T.font,fontWeight:(s.done||s.active)?600:400,
                    color:(s.done||s.active)?T.green:T.textMuted,whiteSpace:"nowrap"}}>{s.l}</span>
                </button>
              </div>
              {i<arr.length-1&&(
                <div style={{height:1.5,flex:1,minWidth:4,
                  background:s.done?T.green:"#E5E4DF"}}/>
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Content — locked when saved */}
      <div style={{pointerEvents:workSaved?"none":"auto",opacity:workSaved?0.55:1,transition:"opacity .2s"}}>

      {/* Services — split by day */}
      {services.length>0&&(()=>{
        // Split into pending and completed
        const pending = [];
        const completed = [];
        services.forEach((c,si)=>{
          const i = (job.items||[]).findIndex((item)=>item===c);
          const done = (job._servicesDone||[]).includes(i);
          const doneDate = (job._serviceDates||{})[i]||"";
          const dateOnly = doneDate.split(" ")[0]||"";
          if(done) completed.push({c,si,i,done,doneDate,dateOnly});
          else pending.push({c,si,i,done,doneDate,dateOnly});
        });
        // Group completed by date
        const byDay = {};
        completed.forEach(item=>{
          const d = item.dateOnly||"Unknown";
          if(!byDay[d]) byDay[d]=[];
          byDay[d].push(item);
        });
        const dayKeys = Object.keys(byDay).sort().reverse();
        const today = dt();

        const renderItem = (item) => {
          const {c,si,i,done,doneDate} = item;
          const editing = editIdx===si;
          return (
            <div key={si} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 0",
              borderBottom:"1px solid #E5E4DF"}}>
              <div onClick={()=>{dispatch("TOGGLE_SERVICE",{jobNo:job.jobNo,idx:i,by:user.name});}}
                style={{width:18,height:18,borderRadius:9,flexShrink:0,cursor:"pointer",
                border:"1.5px solid "+(done?T.green:"#B4B2A9"),
                background:done?T.green:"transparent",
                display:"flex",alignItems:"center",justifyContent:"center"}}>
                {done&&<span style={{color:"#fff",fontSize:10,fontWeight:900}}>✓</span>}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <span style={{fontSize:11,color:done?T.textMuted:T.text,fontFamily:T.font,
                  textDecoration:done?"line-through":"none"}}>{c.complaint}</span>
                {done&&doneDate&&<div style={{fontSize:9,color:T.green,marginTop:1}}>✓ {doneDate}</div>}
              </div>
              {!isMech&&(
                editing ? (
                  <div style={{display:"flex",gap:3,alignItems:"center"}}>
                    <div style={{display:"flex",alignItems:"center",background:"#FFFFFF",borderRadius:5,
                      border:"1px solid "+T.green,overflow:"hidden"}}>
                      <span style={{padding:"0 3px 0 5px",fontSize:10,color:T.textMuted,fontWeight:700}}>₹</span>
                      <input autoFocus value={editVal} onChange={e=>setEditVal(e.target.value)}
                        onKeyDown={e=>{if(e.key==="Enter")savePrice(i,si);if(e.key==="Escape"){setEditIdx(null);setEditVal("");}}}
                        type="number" inputMode="numeric"
                        style={{width:52,padding:"3px 4px",border:"none",background:"#FFFFFF",
                          fontSize:11,fontFamily:T.mono,outline:"none",color:T.text,fontWeight:700}}/>
                    </div>
                    <button onClick={()=>savePrice(i,si)}
                      style={{padding:"2px 7px",background:T.green,border:"none",borderRadius:4,
                        color:"#fff",fontSize:10,cursor:"pointer",fontWeight:700}}>✓</button>
                  </div>
                ) : (
                  <button onClick={()=>{setEditIdx(si);setEditVal(String(c.price||""));}}
                    style={{background:"transparent",border:"none",cursor:"pointer",padding:"2px 4px",
                      borderRadius:4,fontSize:10,fontFamily:T.mono,fontWeight:700,
                      color:c.price>0?T.green:"#B4B2A9",minWidth:44,textAlign:"right"}}>
                    {c.price>0?"₹"+fmtINR(c.price):"₹ —"}
                  </button>
                )
              )}
              {!isMech&&(
                <button onClick={e=>{e.stopPropagation();dispatch("REMOVE_SERVICE",{jobNo:job.jobNo,idx:i,by:user.name});}}
                  style={{background:"none",border:"none",cursor:"pointer",color:"#A32D2D",fontSize:13,padding:"0 2px",flexShrink:0,opacity:.5}}>×</button>
              )}
            </div>
          );
        };

        return (
          <div style={{padding:"4px 10px",
            borderBottom:(newParts.length>0||outsourced.length>0||oldParts.length>0)?"1px solid #2A394230":""}}>
            {/* Pending work */}
            {pending.length>0&&(
              <>
                <div style={{fontSize:9,fontWeight:700,color:"#F0AD00",letterSpacing:.3,marginBottom:2,marginTop:2}}>
                  PENDING · {pending.length}
                </div>
                {pending.map(renderItem)}
              </>
            )}
            {/* Completed by day */}
            {dayKeys.map(d=>(
              <div key={d}>
                <div style={{fontSize:9,fontWeight:700,color:T.green,letterSpacing:.3,marginTop:6,marginBottom:2}}>
                  ✓ {d===today?"TODAY":fmtDate(d)} · {byDay[d].length} done
                </div>
                {byDay[d].map(renderItem)}
              </div>
            ))}
          </div>
        );
      })()}

      {/* Parts removed — with photos */}
      {oldParts.length>0&&(
        <div style={{padding:"4px 10px",
          borderBottom:(newParts.length>0||outsourced.length>0)?"1px solid #2A394230":"",
          background:"#F5F4F0"}}>
          <div style={{fontSize:9,fontWeight:700,color:"#A32D2D",marginBottom:4,letterSpacing:.3}}>
            OLD PARTS REMOVED
          </div>
          {oldParts.map((p,i)=>{
            const jobIdx=(job._parts||[]).findIndex(pp=>pp===p);
            return(
              <div key={i} style={{marginBottom:i<oldParts.length-1?8:0}}>
                <div style={{display:"flex",alignItems:"center",gap:6,fontSize:11,padding:"2px 0"}}>
                  <button onClick={()=>{dispatch("TOGGLE_PART",{jobNo:job.jobNo,idx:jobIdx,by:user.name});}}
                    style={{width:18,height:18,borderRadius:9,border:"1.5px solid "+(p.done?"#A32D2D":T.border),
                      background:p.done?"#A32D2D":"transparent",cursor:"pointer",flexShrink:0,
                      color:"#fff",fontSize:9,display:"flex",alignItems:"center",justifyContent:"center",padding:0}}>
                    {p.done?"✓":""}
                  </button>
                  <div style={{flex:1,minWidth:0}}>
                    <span style={{color:p.done?T.textMuted:T.text,fontFamily:T.font,fontSize:11,
                      textDecoration:p.done?"line-through":"none"}}>{p.name}</span>
                    {p.done&&p.doneDate&&<div style={{fontSize:9,color:T.green,marginTop:1}}>✓ {p.doneDate}{p.doneBy?" · "+p.doneBy:""}</div>}
                  </div>
                  {!isMech&&<button onClick={()=>dispatch("REMOVE_PART",{jobNo:job.jobNo,idx:jobIdx,by:user.name})}
                    style={{background:"none",border:"none",cursor:"pointer",color:"#A32D2D",fontSize:13,padding:"0 2px",flexShrink:0,opacity:.5}}>×</button>}
                </div>
                {p.photo?(
                  <div style={{marginTop:4,borderRadius:7,overflow:"hidden",
                    border:"1px solid #E5E4DF",position:"relative"}}>
                    <img src={p.photo} alt={p.name}
                      style={{width:"100%",height:80,objectFit:"cover",display:"block"}}/>
                    {!isMech&&(
                      <button onClick={()=>sendWA(job.phone,
                          "📷 *"+GARAGE.name+"*\n\nHi "+job.name+
                          ", here is the old *"+p.name+"* removed from your *"+job.regNo+"*.\n\nThank you! 🙏"
                        )}
                        style={{position:"absolute",bottom:5,right:5,
                          padding:"4px 10px",background:"#25D366",border:"none",
                          borderRadius:6,cursor:"pointer",fontSize:10,
                          fontWeight:600,color:"#fff",fontFamily:T.font}}>
                        {"Send to Customer"}
                      </button>
                    )}
                  </div>
                ):(
                  !isMech&&<PartPhotoAdder part={p} jobIdx={jobIdx}
                    jobNo={job.jobNo} user={user}
                    dispatch={dispatch} showFlash={showFlash}/>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New parts — with photos */}
      {newParts.length>0&&(
        <div style={{padding:"4px 10px",
          borderBottom:outsourced.length>0?"1px solid #2A394230":""}}>
          <div style={{fontSize:9,fontWeight:700,color:T.textMuted,marginBottom:4,letterSpacing:.3}}>
            NEW PARTS
          </div>
          {newParts.map((p,i)=>{
            const jobIdx=(job._parts||[]).findIndex(pp=>pp===p);
            return(
              <div key={i} style={{marginBottom:i<newParts.length-1?8:0}}>
                <div style={{display:"flex",alignItems:"center",gap:6,fontSize:11,padding:"2px 0"}}>
                  <button onClick={()=>{dispatch("TOGGLE_PART",{jobNo:job.jobNo,idx:jobIdx,by:user.name});}}
                    style={{width:18,height:18,borderRadius:9,border:"1.5px solid "+(p.done?T.green:T.border),
                      background:p.done?T.green:"transparent",cursor:"pointer",flexShrink:0,
                      color:"#fff",fontSize:9,display:"flex",alignItems:"center",justifyContent:"center",padding:0}}>
                    {p.done?"✓":""}
                  </button>
                  <div style={{flex:1,minWidth:0}}>
                    <span style={{color:p.done?T.textMuted:T.text,fontFamily:T.font,fontSize:11,
                      textDecoration:p.done?"line-through":"none"}}>{p.name}</span>
                    {p.done&&p.doneDate&&<div style={{fontSize:9,color:T.green,marginTop:1}}>✓ {p.doneDate}{p.doneBy?" · "+p.doneBy:""}</div>}
                  </div>
                  {!isMech&&(
                    <span style={{color:T.green,fontFamily:T.mono,fontWeight:700,fontSize:10}}>
                      {"₹"+fmtINR(p.cost)}
                    </span>
                  )}
                  {!isMech&&<button onClick={()=>dispatch("REMOVE_PART",{jobNo:job.jobNo,idx:jobIdx,by:user.name})}
                    style={{background:"none",border:"none",cursor:"pointer",color:"#A32D2D",fontSize:13,padding:"0 2px",flexShrink:0,opacity:.5}}>×</button>}
                </div>
                {p.photo?(
                  <div style={{marginTop:4,borderRadius:7,overflow:"hidden",
                    border:"1px solid #E5E4DF",position:"relative"}}>
                    <img src={p.photo} alt={p.name}
                      style={{width:"100%",height:80,objectFit:"cover",display:"block"}}/>
                    {!isMech&&(
                      <button onClick={()=>sendWA(job.phone,
                          "📷 *"+GARAGE.name+"*\n\nHi "+job.name+
                          (p.type==="old"
                            ?", here is the old *"+p.name+"* removed from your *"+job.regNo+"*."
                            :", here is the new *"+p.name+"* installed on your *"+job.regNo+"*.")+
                          "\n\nThank you! 🙏"
                        )}
                        style={{position:"absolute",bottom:5,right:5,
                          padding:"4px 10px",background:"#25D366",border:"none",
                          borderRadius:6,cursor:"pointer",fontSize:10,
                          fontWeight:600,color:"#fff",fontFamily:T.font}}>
                        {"Send to Customer"}
                      </button>
                    )}
                  </div>
                ):(
                  !isMech&&<PartPhotoAdder part={p} jobIdx={jobIdx}
                    jobNo={job.jobNo} user={user}
                    dispatch={dispatch} showFlash={showFlash}/>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Outsourced */}
      {outsourced.length>0&&(
        <div style={{padding:"6px 10px",
          borderBottom:"1px solid #E5E4DF"}}>
          <div style={{fontSize:9,fontWeight:700,color:"#534AB7",marginBottom:4,letterSpacing:.3,
            display:"flex",alignItems:"center",gap:6}}>
            <span>📤 OUTWORK</span>
            <span style={{fontSize:9,fontWeight:400,color:"#888780"}}>{outsourced.filter(o=>o.status==="received").length}/{outsourced.length} received</span>
          </div>
          {outsourced.map((o,i)=>{
            const done = o.status==="received";
            const oIdx = (job.outsourced||[]).indexOf(o);
            return (
              <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",marginBottom:4,
                borderRadius:10,
                border:done?"1.5px solid #3B6D11":"1.5px dashed #534AB7",
                background:done?"#EAF3DE":"#F5F0FF"}}>
                <button onClick={()=>{if(!done&&oIdx>=0)dispatch("RECV_OUTSOURCE",{jobNo:job.jobNo,idx:oIdx,by:user.name});}}
                  style={{width:20,height:20,borderRadius:10,border:"1.5px solid "+(done?"#3B6D11":"#534AB7"),
                    background:done?"#3B6D11":"transparent",cursor:done?"default":"pointer",flexShrink:0,
                    color:"#fff",fontSize:10,display:"flex",alignItems:"center",justifyContent:"center",padding:0}}>
                  {done?"✓":""}
                </button>
                <div style={{flex:1,minWidth:0}}>
                  <span style={{fontSize:12,color:done?"#3B6D11":"#534AB7",fontWeight:600,
                    textDecoration:done?"line-through":"none"}}>{o.service}</span>
                  <div style={{fontSize:9,color:done?"#3B6D11":"#888780",marginTop:1}}>
                    {o.vendor&&<span style={{background:done?"#3B6D1118":"#534AB718",
                      padding:"1px 6px",borderRadius:6,marginRight:4}}>{o.vendor}</span>}
                    {done?"✓ Received":"⏳ Sent — tap to receive"}
                  </div>
                </div>
                {!isMech&&o.cost>0&&(
                  <span style={{color:done?"#3B6D11":"#534AB7",fontWeight:700,fontSize:11,flexShrink:0}}>
                    ₹{fmtINR(o.cost)}
                  </span>
                )}
                {!isMech&&<button onClick={()=>dispatch("REMOVE_OUTSOURCE",{jobNo:job.jobNo,idx:oIdx,by:user.name})}
                  style={{background:"none",border:"none",cursor:"pointer",color:"#A32D2D",fontSize:13,padding:"0 2px",flexShrink:0,opacity:.5}}>×</button>}
              </div>
            );
          })}
        </div>
      )}

      {/* Total shown in a compact info line — only for admin/recpt */}
      {!isMech&&total>0&&(
        <div style={{padding:"6px 10px",background:workComplete?"#EAF3DE":"#F5F4F0",
          borderTop:"1px solid #E5E4DF",display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:10,color:T.textMuted,fontFamily:T.font,fontWeight:600}}>TOTAL</span>
          <span style={{fontSize:13,fontFamily:T.mono,fontWeight:800,color:T.green}}>₹{fmtINR(total)}</span>
          {workComplete&&<span style={{fontSize:10,color:T.green,fontFamily:T.font,marginLeft:"auto"}}>✅ All done</span>}
        </div>
      )}

      </div>{/* end lock wrapper */}

      {/* Save + QC */}
      {!isMech&&workComplete&&onGoToQC&&job.status!=="delivered"&&(
        <div style={{padding:"8px 14px 12px",display:"flex",gap:8}}>
          <button onClick={()=>{setWorkSaved(true);showFlash("✅ Work saved");}}
            style={{flex:1,padding:"12px",background:workSaved?"#EAF3DE":"#F1EFE8",
              border:workSaved?"1.5px solid "+T.green+"44":"1.5px solid #E5E4DF",
              borderRadius:8,cursor:"pointer",fontSize:13,fontFamily:T.font,
              color:T.green,fontWeight:600}}>
            {workSaved?"✅ Saved":"💾 Save"}
          </button>
          <button onClick={()=>{setWorkSaved(true);onGoToQC();}}
            style={{flex:1,padding:"12px",background:T.green,
              border:"1.5px solid "+T.green,
              borderRadius:8,cursor:"pointer",fontSize:13,fontFamily:T.font,
              fontWeight:700,color:"#fff",
              boxShadow:"0 2px 6px rgba(59,109,17,.3)"}}>
            QC →
          </button>
        </div>
      )}
      {isMech&&workComplete&&(
        <div style={{padding:"5px 10px",background:T.green+"15",
          display:"flex",alignItems:"center",gap:5}}>
          <span style={{fontSize:11,color:T.green,fontWeight:700,fontFamily:T.font}}>
            ✅ All your work is done!
          </span>
        </div>
      )}
    </div>
  );
}

// ---
// --- VendorAccountsCard --- separate vendor payment tracking
function VendorAccountsCard({ job, user, dispatch, showFlash, onClose }) {
  const outsourced = (job.outsourced||[]).filter(o=>o.vendorCost>0);
  const vTotal = outsourced.reduce((t,o)=>t+o.vendorCost,0);
  const vPaid = outsourced.filter(o=>o.vendorPaid).reduce((t,o)=>t+o.vendorCost,0);
  const vDue = vTotal - vPaid;

  return (
    <div style={{margin:"4px 10px",background:T.recv,borderRadius:12,border:"1px solid "+T.border,overflow:"hidden"}}>
      <div style={{display:"flex",alignItems:"center",padding:"10px 14px",borderBottom:"1px solid "+T.border}}>
        <span style={{fontSize:14,fontWeight:600,color:T.text,fontFamily:T.font,flex:1}}>💰 Vendor Accounts</span>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:T.textMuted,fontSize:18}}>×</button>
      </div>
      {outsourced.length===0?(
        <div style={{padding:"20px 14px",textAlign:"center",fontSize:12,color:T.textMuted}}>No outsourced items with vendor cost</div>
      ):(
        <div style={{padding:"8px 14px"}}>
          {outsourced.map((o,i)=>{
            const origIdx = (job.outsourced||[]).indexOf(o);
            return (
              <div key={i} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 0",
                borderBottom:i<outsourced.length-1?"1px solid "+T.border+"22":""}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,color:T.text,fontFamily:T.font}}>{o.service}</div>
                  <div style={{fontSize:10,color:T.textMuted}}>{o.vendor}{o.vendorPaid?" · Paid "+o.vendorPaidDate:""}</div>
                </div>
                <span style={{fontSize:13,color:"#F0AD00",fontFamily:T.mono,fontWeight:700,flexShrink:0}}>₹{fmtINR(o.vendorCost)}</span>
                {o.vendorPaid ? (
                  <span style={{fontSize:10,padding:"3px 10px",borderRadius:10,background:T.green+"22",color:T.green,fontWeight:600,flexShrink:0}}>Paid ✅</span>
                ) : (
                  <button onClick={()=>{dispatch("PAY_VENDOR",{jobNo:job.jobNo,idx:origIdx,by:user.name});showFlash("💸 Vendor paid");}}
                    style={{padding:"6px 12px",background:"#F0AD00",border:"none",borderRadius:8,
                      color:"#111",fontSize:11,fontWeight:700,cursor:"pointer",flexShrink:0}}>
                    Pay ₹{fmtINR(o.vendorCost)}
                  </button>
                )}
              </div>
            );
          })}
          <div style={{display:"flex",justifyContent:"space-between",paddingTop:8,marginTop:6,borderTop:"1px solid "+T.border}}>
            <div>
              <div style={{fontSize:10,color:T.textMuted}}>Vendor Total</div>
              <div style={{fontSize:14,fontFamily:T.mono,fontWeight:700,color:"#F0AD00"}}>₹{fmtINR(vTotal)}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:10,color:T.textMuted}}>{vDue>0?"Due":"Status"}</div>
              <div style={{fontSize:14,fontFamily:T.mono,fontWeight:700,color:vDue>0?"#F0AD00":T.green}}>
                {vDue>0?"₹"+fmtINR(vDue):"All Paid ✅"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- PaymentInEstimate --- inline payment recorder
function PaymentInEstimate({ job, user, dispatch, showFlash, grandTotal }) {
  const [amt, setAmt] = useState("");
  const [method, setMethod] = useState("CASH");
  const [showForm, setShowForm] = useState(false);
  const paid = (job.payments||[]).reduce((s,p)=>s+p.amount,0);
  const bal = Math.max(0, grandTotal - paid);

  const record = () => {
    const a = +amt; if(!a||a<=0) return;
    dispatch("ADD_PAYMENT",{jobNo:job.jobNo,payment:{
      id:Date.now(),amount:a,method,date:dt(),time:tm(),by:user.name
    },by:user.name});
    setAmt(""); setShowForm(false);
    showFlash("💰 ₹"+fmtINR(a)+" recorded");
  };

  return (
    <div style={{padding:"8px 14px",borderTop:"1px solid "+T.border,flexShrink:0}}>
      {(job.payments||[]).length>0&&(
        <div style={{marginBottom:8}}>
          <div style={{fontSize:10,color:T.textMuted,fontWeight:600,marginBottom:4}}>PAYMENTS</div>
          {(job.payments||[]).map((p,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"2px 0"}}>
              <span style={{color:T.text}}>{p.method} · {p.date}</span>
              <span style={{color:T.green,fontFamily:T.mono,fontWeight:600}}>₹{fmtINR(p.amount)}</span>
            </div>
          ))}
          <div style={{display:"flex",justifyContent:"space-between",paddingTop:4,marginTop:4,borderTop:"1px solid "+T.border,fontSize:12}}>
            <span style={{color:T.textMuted}}>Balance</span>
            <span style={{color:bal>0?"#F0AD00":T.green,fontFamily:T.mono,fontWeight:700}}>
              {bal>0?"₹"+fmtINR(bal):"Settled ✅"}
            </span>
          </div>
        </div>
      )}
      {bal>0&&!showForm&&(
        <button onClick={()=>setShowForm(true)}
          style={{width:"100%",padding:"8px",background:"transparent",border:"1px dashed "+T.border,
            borderRadius:8,color:T.green,fontSize:12,cursor:"pointer",fontFamily:T.font}}>
          💰 Record Payment
        </button>
      )}
      {showForm&&(
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            {[{l:"Full ₹"+fmtINR(bal),v:bal},{l:"₹1,000",v:1000},{l:"₹2,000",v:2000},{l:"₹5,000",v:5000}]
              .filter(c=>c.v<=bal).map(c=>(
              <button key={c.l} onClick={()=>setAmt(String(c.v))}
                style={{padding:"5px 12px",borderRadius:14,fontSize:12,cursor:"pointer",border:"none",
                  background:+amt===c.v?T.green:T.border,color:+amt===c.v?"#fff":T.textMuted,fontFamily:T.font}}>
                {c.l}
              </button>
            ))}
          </div>
          <div style={{display:"flex",gap:6}}>
            <div style={{flex:1,display:"flex",alignItems:"center",background:"#F5F4F0",borderRadius:8,border:"1px solid "+T.border}}>
              <span style={{padding:"0 4px 0 10px",color:T.textMuted,fontWeight:700}}>₹</span>
              <input value={amt} onChange={e=>setAmt(e.target.value.replace(/\D/g,""))}
                onKeyDown={e=>{if(e.key==="Enter")record();}}
                inputMode="numeric" placeholder="Amount"
                style={{flex:1,padding:"8px 6px 8px 0",border:"none",background:"transparent",
                  fontSize:14,fontFamily:T.mono,outline:"none",color:T.text,fontWeight:700}}/>
            </div>
          </div>
          <div style={{display:"flex",gap:5}}>
            {["CASH","UPI","CARD"].map(m=>(
              <button key={m} onClick={()=>setMethod(m)}
                style={{flex:1,padding:"7px",borderRadius:8,fontSize:12,cursor:"pointer",border:"none",
                  background:method===m?T.green:T.border,color:method===m?"#fff":T.textMuted,
                  fontFamily:T.font,fontWeight:method===m?600:400}}>
                {m==="CASH"?"💵 ":m==="UPI"?"📱 ":"💳 "}{m}
              </button>
            ))}
          </div>
          <div style={{display:"flex",gap:6}}>
            <button onClick={record} disabled={!amt||+amt<=0}
              style={{flex:1,padding:"10px",background:(amt&&+amt>0)?T.green:T.border,border:"none",borderRadius:8,
                color:"#fff",fontSize:13,fontWeight:600,cursor:(amt&&+amt>0)?"pointer":"not-allowed",fontFamily:T.font}}>
              ✅ Record ₹{amt?fmtINR(+amt):"0"}
            </button>
            <button onClick={()=>setShowForm(false)}
              style={{padding:"10px 14px",background:T.border,border:"none",borderRadius:8,
                color:T.textMuted,fontSize:13,cursor:"pointer"}}>×</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ESTIMATE CARD — formal estimate before QC, sent to customer
// ---
function EstimateCard({ job, user, dispatch, showFlash, onClose, onDone }) {
  // Editable spares: parts only
  const initSpares = (job._parts||[]).filter(p=>p.type==="new").map(p=>({desc:p.name,qty:1,rate:+p.cost||0}));
  // Editable labour: services
  const initLabour = (job.items||[]).map((c,i)=>({desc:c.complaint,qty:1,rate:+c.price||0,
    doneDate:(job._serviceDates||{})[i]||null}));
  // Editable outwork: outsourced — vendor name hidden from customer
  const initOutwork = (job.outsourced||[]).map(o=>({desc:o.service,qty:1,rate:+o.cost||0,
    vendor:o.vendor||"",vendorCost:+o.vendorCost||0}));

  const [spares, setSpares] = useState(initSpares.length>0?initSpares:[{desc:"",qty:1,rate:0}]);
  const [labour, setLabour] = useState(initLabour.length>0?initLabour:[{desc:"",qty:1,rate:0}]);
  const [outwork, setOutwork] = useState(initOutwork.length>0?initOutwork:[]);
  const [spareName, setSpareName] = useState("");
  const [labourName, setLabourName] = useState("");
  const [outworkName, setOutworkName] = useState("");
  const [estimateSaved, setEstimateSaved] = useState(!!job._estimateSent);

  // Auto-sync: when outsourced items are added in WorkCard, add them to outwork
  useEffect(()=>{
    const existing = outwork.map(r=>r.desc);
    const newItems = (job.outsourced||[]).filter(o=>!existing.includes(o.service))
      .map(o=>({desc:o.service,qty:1,rate:+o.cost||0,vendor:o.vendor||"",vendorCost:+o.vendorCost||0}));
    if(newItems.length>0) setOutwork(prev=>[...prev,...newItems]);
  },[job.outsourced]);

  // Auto-sync: when new parts are added in WorkCard, add them to spares
  useEffect(()=>{
    const existing = spares.map(r=>r.desc);
    const newItems = (job._parts||[]).filter(p=>p.type==="new"&&!existing.includes(p.name))
      .map(p=>({desc:p.name,qty:1,rate:+p.cost||0}));
    if(newItems.length>0) setSpares(prev=>[...prev,...newItems]);
  },[job._parts]);
  const [editJobNo, setEditJobNo] = useState(String(job.jobNo));
  const [editBillNo, setEditBillNo] = useState("Q"+job.jobNo);
  const [editLabNo, setEditLabNo] = useState("L"+job.jobNo);

  const sparesTotal = spares.reduce((t,r)=>t+(r.qty*r.rate),0);
  const labourTotal = labour.reduce((t,r)=>t+(r.qty*r.rate),0);
  const outworkTotal = outwork.reduce((t,r)=>t+(r.qty*r.rate),0);
  const grandTotal = sparesTotal + labourTotal + outworkTotal;
  const paid = (job.payments||[]).reduce((s,p)=>s+p.amount,0);

  const now = new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"2-digit",year:"numeric"});
  const estNo = editBillNo;
  const labNo = editLabNo;

  const updateSpare = (i,field,val) => setSpares(s=>s.map((r,j)=>j===i?{...r,[field]:field==="desc"?val:+val||0}:r));
  const updateLabour = (i,field,val) => setLabour(s=>s.map((r,j)=>j===i?{...r,[field]:field==="desc"?val:+val||0}:r));
  const updateOutwork = (i,field,val) => setOutwork(s=>s.map((r,j)=>j===i?{...r,[field]:field==="desc"?val:+val||0}:r));
  const removeSpare = (i) => setSpares(s=>s.filter((_,j)=>j!==i));
  const removeLabour = (i) => setLabour(s=>s.filter((_,j)=>j!==i));
  const removeOutwork = (i) => setOutwork(s=>s.filter((_,j)=>j!==i));
  const addSpare = () => { if(!spareName.trim()) return; setSpares(s=>[...s,{desc:spareName.trim(),qty:1,rate:0}]); setSpareName(""); };
  const addLabour = () => { if(!labourName.trim()) return; setLabour(s=>[...s,{desc:labourName.trim(),qty:1,rate:0}]); setLabourName(""); };
  const addOutwork = () => { if(!outworkName.trim()) return; setOutwork(s=>[...s,{desc:outworkName.trim(),qty:1,rate:0}]); setOutworkName(""); };

  const buildWaText = () => {
    let t = "*ESTIMATE — "+GARAGE.name+"*\n"+GARAGE.address+"\n\n";
    t += "Est No: "+estNo+" | Date: "+now+"\n";
    t += "Customer: "+job.name+" | Ph: "+job.phone+"\n";
    t += "Vehicle: "+job.regNo+" | "+job.brand+" "+job.model+"\n";
    if(job.kms) t += "KMs: "+job.kms+"\n";
    t += "\n";
    if(spares.some(r=>r.desc)){
      t += "*ESTIMATE SPARES*\n";
      spares.filter(r=>r.desc).forEach((r,i)=>{ t += (i+1)+". "+r.desc+" — Qty:"+r.qty+" × ₹"+fmtINR(r.rate)+" = ₹"+fmtINR(r.qty*r.rate)+"\n"; });
      t += "Spares Total: ₹"+fmtINR(sparesTotal)+"\n\n";
    }
    if(labour.some(r=>r.desc)){
      t += "*ESTIMATE LABOUR*\n";
      labour.filter(r=>r.desc).forEach((r,i)=>{ t += (i+1)+". "+r.desc+" — ₹"+fmtINR(r.qty*r.rate)+"\n"; });
      t += "Labour Total: ₹"+fmtINR(labourTotal)+"\n\n";
    }
    if(outwork.some(r=>r.desc)){
      t += "*ESTIMATE OUTWORK*\n";
      outwork.filter(r=>r.desc).forEach((r,i)=>{ t += (i+1)+". "+r.desc+" — ₹"+fmtINR(r.qty*r.rate)+"\n"; });
      t += "Outwork Total: ₹"+fmtINR(outworkTotal)+"\n\n";
    }
    t += "*Total: ₹"+fmtINR(grandTotal)+"*\n";
    t += "Rupees "+numToWords(Math.round(grandTotal))+" Only\n\n";
    if(paid>0) t += "Advance Paid: ₹"+fmtINR(paid)+"\nBalance: ₹"+fmtINR(Math.max(0,grandTotal-paid))+"\n\n";
    t += "Please confirm to proceed.\nThank you! — "+GARAGE.name+" | "+GARAGE.phone;
    return t;
  };

  const sendEstimate = () => {
    sendWA(job.phone, buildWaText());
    dispatch("SEND_ESTIMATE",{jobNo:job.jobNo,by:user.name});
    showFlash("📄 Estimate sent!");
  };

  const cellInput = {background:"#F9F8F6",border:"1px solid #E5E4DF",borderRadius:4,padding:"6px 6px",
    fontSize:12,color:"#1B1B1A",outline:"none",fontFamily:"'Courier New',monospace",fontWeight:600,width:"100%",boxSizing:"border-box"};

  const printBill = () => {
    const makeRows = (s) => s.filter(r=>r.desc).map((r,i)=>
      "<tr><td>"+(i+1)+"</td><td>"+r.desc+"</td><td style='text-align:right'>"+r.qty+"</td><td style='text-align:right'>"+fmtINR(r.rate)+"</td><td style='text-align:right'>"+fmtINR(r.qty*r.rate)+"</td></tr>"
    ).join("");
    const html = "<!DOCTYPE html><html><head><title>Estimate - "+job.regNo+"</title>"
    +"<style>"
    +"*{margin:0;padding:0;box-sizing:border-box}"
    +"body{font-family:'Courier New',monospace;font-size:13px;padding:20px;max-width:700px;margin:0 auto}"
    +"h1{font-size:20px;text-align:center;margin-bottom:2px}"
    +".addr{text-align:center;font-size:11px;margin-bottom:10px}"
    +"h2{font-size:16px;text-align:center;margin:8px 0;letter-spacing:2px}"
    +".info{display:grid;grid-template-columns:1fr 1fr;gap:2px 20px;margin-bottom:12px;font-size:12px}"
    +".info span{color:#555}"
    +"table{width:100%;border-collapse:collapse;margin-bottom:4px}"
    +"th,td{border:1px solid #333;padding:4px 6px;font-size:12px}"
    +"th{background:#f0f0f0;font-weight:700;text-align:left}"
    +".total-row{font-weight:700;text-align:right;padding:6px;font-size:13px}"
    +".grand{font-size:15px;font-weight:700;display:flex;justify-content:space-between;padding:8px 0;border-top:2px solid #333;margin-top:8px}"
    +".words{font-size:11px;font-style:italic;margin-bottom:8px}"
    +".adv{display:flex;justify-content:space-between;font-size:12px;margin-bottom:12px}"
    +".sig{margin-top:40px;text-align:right;font-size:12px}"
    +"@media print{body{padding:10px}}"
    +"</style></head><body>"
    +"<h1>"+GARAGE.name+"</h1>"
    +"<div class='addr'>"+GARAGE.address+"<br>Ph: "+GARAGE.phone+" | Mail: "+GARAGE.email+"</div>"
    +"<h2>ESTIMATE</h2>"
    +"<div class='info'>"
    +"<div><span>To:</span> <b>"+job.name+"</b></div><div><span>Job No:</span> "+editJobNo+"</div>"
    +"<div><span>Cell:</span> "+job.phone+"</div><div><span>Job Date:</span> "+now+"</div>"
    +"<div><span>Regn No:</span> <b>"+job.regNo+"</b></div><div><span>Bill No:</span> "+editBillNo+"</div>"
    +"<div><span>Model:</span> "+job.brand+" "+job.model+"</div><div><span>Labour No:</span> "+editLabNo+"</div>"
    +(job.kms?"<div><span>KMs:</span> "+job.kms+"</div>":"")
    +"<div><span>Payment:</span> "+(paid>0?"Advance ₹"+fmtINR(paid):"CREDIT")+"</div>"
    +"</div>"
    +(spares.some(r=>r.desc)?
      "<div style='margin-bottom:12px'><div style='font-weight:700;margin-bottom:4px'>ESTIMATE SPARES</div>"
      +"<table><thead><tr><th style='width:35px'>S.No</th><th>Description</th><th style='width:40px;text-align:right'>Qty</th><th style='width:60px;text-align:right'>Rate</th><th style='width:70px;text-align:right'>Amount</th></tr></thead>"
      +"<tbody>"+makeRows(spares)+"</tbody></table>"
      +"<div class='total-row'>Total Spares Bill Amount: ₹"+fmtINR(sparesTotal)+"</div></div>":"")
    +(labour.some(r=>r.desc)?
      "<div style='margin-bottom:12px'><div style='font-weight:700;margin-bottom:4px'>ESTIMATE LABOUR</div>"
      +"<table><thead><tr><th style='width:35px'>S.No</th><th>Description</th><th style='width:40px;text-align:right'>Qty</th><th style='width:60px;text-align:right'>Rate</th><th style='width:70px;text-align:right'>Amount</th></tr></thead>"
      +"<tbody>"+makeRows(labour)+"</tbody></table>"
      +"<div class='total-row'>Total Labour Bill Amount: ₹"+fmtINR(labourTotal)+"</div></div>":"")
    +(outwork.some(r=>r.desc)?
      "<div style='margin-bottom:12px'><div style='font-weight:700;margin-bottom:4px'>ESTIMATE OUTWORK</div>"
      +"<table><thead><tr><th style='width:35px'>S.No</th><th>Description</th><th style='width:40px;text-align:right'>Qty</th><th style='width:60px;text-align:right'>Rate</th><th style='width:70px;text-align:right'>Amount</th></tr></thead>"
      +"<tbody>"+makeRows(outwork)+"</tbody></table>"
      +"<div class='total-row'>Total Outwork Bill Amount: ₹"+fmtINR(outworkTotal)+"</div></div>":"")
    +"<div class='grand'><span>Total Bill Amount</span><span>₹"+fmtINR(grandTotal)+"</span></div>"
    +"<div class='words'>Rupees "+numToWords(Math.round(grandTotal))+" Only</div>"
    +(paid>0?"<div class='adv'><span>Advance Received: ₹"+fmtINR(paid)+"</span><span>Balance: ₹"+fmtINR(Math.max(0,grandTotal-paid))+"</span></div>":"")
    +"<div class='sig'>Authorized Signature</div>"
    +"</body></html>";
    // Use hidden iframe to print (window.open blocked in artifacts)
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;border:none;z-index:99999;background:#fff";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open(); doc.write(html); doc.close();
    // Add close button inside iframe
    const closeBtn = doc.createElement("button");
    closeBtn.textContent = "✕ Close Preview";
    closeBtn.style.cssText = "position:fixed;top:10px;right:10px;padding:8px 16px;background:#333;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;z-index:100;font-family:sans-serif";
    closeBtn.onclick = function(){ document.body.removeChild(iframe); };
    doc.body.appendChild(closeBtn);
    // Add print button inside iframe
    const printBtn = doc.createElement("button");
    printBtn.textContent = "🖨️ Print";
    printBtn.style.cssText = "position:fixed;top:10px;right:150px;padding:8px 16px;background:#00A884;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;z-index:100;font-family:sans-serif";
    printBtn.onclick = function(){ iframe.contentWindow.print(); };
    doc.body.appendChild(printBtn);
    // Hide buttons when printing
    const printCSS = doc.createElement("style");
    printCSS.textContent = "@media print{button{display:none!important}}";
    doc.head.appendChild(printCSS);
  };

  const [editCell, setEditCell] = useState(null);
  const editRef = useRef(null);

  const renderTable = (title, rows, setRows, updateRow, removeRow, addName, setAddName, addRow, tblKey) => {
    const sectionTotal = rows.reduce((t,r)=>t+(r.qty*r.rate),0);
    return (
    <div style={{padding:"8px 10px",borderBottom:"1px solid "+T.border}}>
      <div style={{fontSize:11,fontWeight:700,color:T.text,marginBottom:6,letterSpacing:.4}}>{title}</div>
      <div style={{display:"grid",gridTemplateColumns:"22px 1fr 40px 60px 60px 20px",gap:3,marginBottom:4}}>
        <span style={{fontSize:9,color:T.textMuted,fontWeight:600}}>#</span>
        <span style={{fontSize:9,color:T.textMuted,fontWeight:600}}>Item</span>
        <span style={{fontSize:9,color:T.textMuted,fontWeight:600,textAlign:"center"}}>Qty</span>
        <span style={{fontSize:9,color:T.textMuted,fontWeight:600,textAlign:"right"}}>Rate</span>
        <span style={{fontSize:9,color:T.textMuted,fontWeight:600,textAlign:"right"}}>Amt</span>
        <span/>
      </div>
      {rows.map((r,i)=>(
        <div key={i} style={{display:"grid",gridTemplateColumns:"22px 1fr 40px 60px 60px 20px",gap:3,alignItems:"center",
          marginBottom:2,padding:"4px 0",borderBottom:"0.5px solid #F1EFE8"}}>
          <span style={{fontSize:10,color:T.textMuted}}>{i+1}</span>
          <input value={r.desc} onChange={e=>updateRow(i,"desc",e.target.value)}
            style={{...cellInput,fontSize:11,padding:"5px 4px"}} placeholder="Item"/>
          <input value={r.qty===0?"":r.qty||""} onChange={e=>updateRow(i,"qty",e.target.value)}
            inputMode="numeric" placeholder="1"
            style={{...cellInput,textAlign:"center",fontSize:11,padding:"5px 2px"}}/>
          <input value={r.rate===0?"":r.rate||""} onChange={e=>updateRow(i,"rate",e.target.value)}
            inputMode="numeric" placeholder="0"
            style={{...cellInput,textAlign:"right",fontSize:11,padding:"5px 4px"}}/>
          <span style={{fontSize:11,fontFamily:T.mono,color:r.qty*r.rate>0?T.green:T.textMuted,
            textAlign:"right",fontWeight:600}}>
            {r.qty*r.rate>0?fmtINR(r.qty*r.rate):"\u2014"}
          </span>
          <button onClick={()=>removeRow(i)}
            style={{background:"none",border:"none",cursor:"pointer",color:"#A32D2D",fontSize:12,padding:0}}>{"\u00d7"}</button>
        </div>
      ))}
      <div style={{display:"flex",gap:5,marginTop:6}}>
        <input value={addName} onChange={e=>setAddName(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter" && addName.trim()) addRow();}}
          placeholder={"+ Add "+title.replace("ESTIMATE ","").toLowerCase()+"..."}
          style={{flex:1,padding:"6px 10px",background:"#F5F4F0",border:"1px solid "+T.border,
            borderRadius:6,fontSize:12,color:T.text,outline:"none",fontFamily:T.font}}/>
        <button onClick={()=>{if(addName.trim()) addRow();}}
          style={{padding:"6px 12px",background:addName.trim()?T.green:T.border,color:"#fff",
            border:"none",borderRadius:6,fontSize:11,fontWeight:600,cursor:"pointer"}}>
          Add
        </button>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",padding:"8px 4px 0",marginTop:6,borderTop:"1px solid "+T.border}}>
        <span style={{fontSize:12,fontWeight:600,color:T.text}}>Total {title.replace("ESTIMATE ","")}</span>
        <span style={{fontSize:14,fontWeight:700,color:T.green,fontFamily:T.mono}}>{"\u20b9"}{fmtINR(sectionTotal)}</span>
      </div>
    </div>
    );
  };

  return (
    <div style={{margin:"6px 10px",background:T.recv,borderRadius:12,border:"1px solid "+T.border,
      overflow:"hidden"}}>

      {/* Garage header */}
      <div style={{padding:"12px 14px",borderBottom:"1px solid "+T.border,textAlign:"center",flexShrink:0,position:"relative"}}>
        <div style={{fontSize:16,fontWeight:700,color:T.text,fontFamily:T.font,letterSpacing:.5}}>{GARAGE.name}</div>
        <div style={{fontSize:10,color:T.textMuted,marginTop:2}}>{GARAGE.address}</div>
        <div style={{fontSize:10,color:T.textMuted}}>Ph: {GARAGE.phone} | {GARAGE.email}</div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginTop:6}}>
          <span style={{fontSize:14,fontWeight:700,color:T.text,letterSpacing:1}}>ESTIMATE</span>
          {estimateSaved&&(
            <span style={{fontSize:9,color:T.green,fontWeight:700,fontFamily:T.font,
              background:T.green+"18",padding:"2px 6px",borderRadius:4}}>✅ Saved</span>
          )}
          <div style={{position:"absolute",right:14,display:"flex",gap:4}}>
            <button onClick={()=>{sendWA(job.phone,buildWaText());showFlash("📤 Sent to "+job.name);}}
              title="Send to Customer"
              style={{background:"#EAF3DE",border:"1px solid "+T.green+"44",
                borderRadius:8,cursor:"pointer",padding:"4px 8px",fontSize:12,lineHeight:1,
                display:"flex",alignItems:"center",justifyContent:"center",gap:3,
                color:T.green,fontWeight:600,fontFamily:T.font}}>
              📤 <span style={{fontSize:10}}>Send</span>
            </button>
            <button onClick={printBill} title="Print Bill"
              style={{background:"#F1EFE8",border:"1px solid #E5E4DF",
                borderRadius:8,cursor:"pointer",padding:"4px 8px",fontSize:14,lineHeight:1,
                display:"flex",alignItems:"center",justifyContent:"center"}}>
              🖨️
            </button>
          </div>
        </div>
      </div>

      {/* Document info — editable numbers */}
      <div style={{padding:"8px 14px",borderBottom:"1px solid "+T.border,display:"grid",
        gridTemplateColumns:"1fr 1fr",gap:"3px 16px",fontSize:11,flexShrink:0}}>
        <div><span style={{color:T.textMuted}}>To: </span><span style={{color:T.text,fontWeight:600}}>{job.name}</span></div>
        <div style={{display:"flex",alignItems:"center",gap:3}}>
          <span style={{color:T.textMuted}}>Job No: </span>
          <input value={editJobNo} onChange={e=>setEditJobNo(e.target.value)}
            style={{background:"transparent",border:"none",borderBottom:"1px dashed #C5C4BF",
              color:T.text,fontSize:11,fontFamily:T.mono,fontWeight:600,width:60,
              outline:"none",padding:"1px 2px"}}/>
        </div>
        <div><span style={{color:T.textMuted}}>Cell: </span><span style={{color:T.text}}>{job.phone}</span></div>
        <div><span style={{color:T.textMuted}}>Date: </span><span style={{color:T.text}}>{now}</span></div>
        <div><span style={{color:T.textMuted}}>Regn No: </span><span style={{color:T.text,fontFamily:T.mono,fontWeight:600}}>{job.regNo}</span></div>
        <div style={{display:"flex",alignItems:"center",gap:3}}>
          <span style={{color:T.textMuted}}>Bill No: </span>
          <input value={editBillNo} onChange={e=>setEditBillNo(e.target.value)}
            style={{background:"transparent",border:"none",borderBottom:"1px dashed #C5C4BF",
              color:T.text,fontSize:11,fontFamily:T.mono,fontWeight:600,width:60,
              outline:"none",padding:"1px 2px"}}/>
        </div>
        <div><span style={{color:T.textMuted}}>Model: </span><span style={{color:T.text}}>{job.brand} {job.model}</span></div>
        <div style={{display:"flex",alignItems:"center",gap:3}}>
          <span style={{color:T.textMuted}}>Labour No: </span>
          <input value={editLabNo} onChange={e=>setEditLabNo(e.target.value)}
            style={{background:"transparent",border:"none",borderBottom:"1px dashed #C5C4BF",
              color:T.text,fontSize:11,fontFamily:T.mono,fontWeight:600,width:60,
              outline:"none",padding:"1px 2px"}}/>
        </div>
        {job.kms&&<div><span style={{color:T.textMuted}}>KMs: </span><span style={{color:T.text}}>{job.kms}</span></div>}
      </div>

      {/* Scrollable tables — locked when saved */}
      <div style={{pointerEvents:estimateSaved?"none":"auto",opacity:estimateSaved?0.55:1,transition:"opacity .2s"}}>
      <div>
        {renderTable("ESTIMATE SPARES",spares,setSpares,updateSpare,removeSpare,spareName,setSpareName,addSpare,"spares")}
        {renderTable("ESTIMATE LABOUR",labour,setLabour,updateLabour,removeLabour,labourName,setLabourName,addLabour,"labour")}
        {renderTable("ESTIMATE OUTWORK",outwork,setOutwork,updateOutwork,removeOutwork,outworkName,setOutworkName,addOutwork,"outwork")}

        {/* Vendor payments — internal only, hidden from print/customer */}
        {outwork.some(r=>r.vendor||r.vendorCost>0)&&(
          <div style={{margin:"0 14px 10px",padding:"8px 10px",background:"#F5F0FF",
            borderRadius:8,border:"1px dashed #534AB7"}}>
            <div style={{fontSize:9,fontWeight:700,color:"#534AB7",letterSpacing:.3,marginBottom:6}}>
              VENDOR PAYMENTS (Internal — not shown in print)
            </div>
            {outwork.filter(r=>r.vendor||r.vendorCost>0).map((r,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:6,marginBottom:4,fontSize:11}}>
                <span style={{color:"#534AB7",flex:1}}>{r.desc}</span>
                <span style={{color:T.textMuted,fontSize:10}}>{r.vendor||"—"}</span>
                <div style={{display:"flex",alignItems:"center",background:"#fff",borderRadius:4,
                  border:"1px solid #E5E4DF",width:70}}>
                  <span style={{padding:"0 3px 0 5px",fontSize:10,color:T.textMuted}}>₹</span>
                  <input value={r.vendorCost||""} onChange={e=>{
                    const val=+e.target.value.replace(/\D/g,"")||0;
                    setOutwork(s=>s.map((x,j)=>j===outwork.indexOf(r)?{...x,vendorCost:val}:x));
                  }}
                    type="number" inputMode="numeric" placeholder="0"
                    style={{flex:1,padding:"3px 4px",border:"none",background:"transparent",
                      fontSize:11,fontFamily:T.mono,color:"#534AB7",fontWeight:600,outline:"none",width:"100%"}}/>
                </div>
              </div>
            ))}
            <div style={{fontSize:9,color:T.textMuted,marginTop:4,fontStyle:"italic"}}>
              Total vendor cost: ₹{fmtINR(outwork.reduce((s,r)=>s+(r.vendorCost||0),0))} → auto-added to expenses
            </div>
          </div>
        )}

      </div>
      </div>{/* end Estimate lock wrapper */}

      {/* Fixed footer — Grand total + Payment + Print */}
      <div style={{flexShrink:0,borderTop:"2px solid "+T.green+"55",background:"#F5F4F0"}}>
        {/* Breakdown */}
        <div style={{padding:"6px 14px",display:"flex",gap:8,fontSize:10,color:T.textMuted}}>
          {sparesTotal>0&&<span>Spares: <b style={{color:T.text}}>₹{fmtINR(sparesTotal)}</b></span>}
          {labourTotal>0&&<span>Labour: <b style={{color:T.text}}>₹{fmtINR(labourTotal)}</b></span>}
          {outworkTotal>0&&<span>Outwork: <b style={{color:T.text}}>₹{fmtINR(outworkTotal)}</b></span>}
        </div>
        {/* Grand total row */}
        <div style={{padding:"8px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:T.text}}>Total</div>
            <div style={{fontSize:9,color:T.textMuted,fontStyle:"italic"}}>{numToWords(Math.round(grandTotal))}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:18,fontWeight:700,color:T.green,fontFamily:T.mono}}>₹{fmtINR(grandTotal)}</div>
            {paid>0&&(
              <div style={{fontSize:10,color:T.textMuted}}>
                Paid <span style={{color:T.green,fontFamily:T.mono}}>₹{fmtINR(paid)}</span>
                {" · "}Balance <span style={{color:grandTotal>paid?"#F0AD00":T.green,fontFamily:T.mono,fontWeight:600}}>₹{fmtINR(Math.max(0,grandTotal-paid))}</span>
              </div>
            )}
          </div>
        </div>

        {/* Save + Print + Close */}
      {user.role!=="mechanic"&&(
        <div style={{padding:"10px 14px",borderTop:"1px solid "+T.border,flexShrink:0,display:"flex",gap:8}}>
          <button onClick={()=>{if(grandTotal>0){
            dispatch("SEND_ESTIMATE",{jobNo:job.jobNo,by:user.name,
              estimateData:{spares:spares.filter(r=>r.desc),labour:labour.filter(r=>r.desc),
                outwork:outwork.filter(r=>r.desc),sparesTotal,labourTotal,outworkTotal,grandTotal}});
            setEstimateSaved(true);showFlash("✅ Estimate saved");}}}
            style={{flex:1,padding:"12px",
              background:grandTotal>0?(estimateSaved?"#EAF3DE":"#F1EFE8"):"#E5E4DF",
              border:estimateSaved?"1px solid "+T.green+"44":"none",borderRadius:8,
              cursor:grandTotal>0?"pointer":"not-allowed",fontSize:13,fontFamily:T.font,
              color:grandTotal>0?T.green:T.textMuted,fontWeight:600,
              opacity:grandTotal>0?1:0.5}}>
            {estimateSaved?"✅ Saved":"💾 Save"}
          </button>
          {estimateSaved&&onDone&&(
            <button onClick={onDone}
              style={{flex:1,padding:"12px",background:T.green,border:"none",borderRadius:8,
                color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:T.font,
                boxShadow:"0 2px 6px rgba(59,109,17,.3)"}}>
              Payment →
            </button>
          )}
        </div>
      )}
      </div>
    </div>
  );
}


const NEXT_VISIT_SUGGESTIONS = [
  "Oil change due","Full service due","Brake pad check",
  "Timing belt replacement","Coolant flush","AC service",
  "Tyre rotation","Wheel alignment","Battery check","Clutch wear check",
  "Suspension check","Spark plug replacement","Cabin filter change",
  "Air filter replacement","Power steering fluid check","Rear brake check",
  "Wiper blade change","Fuel filter change","Radiator flush","Injector cleaning",
];

// Grouped for ServiceDueCard
const SVC_GROUPS = [
  { label:"🛢️ Engine & Fluids", items:["Oil change due","Full service due","Coolant flush","Fuel filter change","Radiator flush","Injector cleaning","Power steering fluid check"] },
  { label:"🔩 Brakes & Tyres",  items:["Brake pad check","Rear brake check","Tyre rotation","Wheel alignment"] },
  { label:"❄️ Comfort & AC",    items:["AC service","Cabin filter change","Air filter replacement","Wiper blade change"] },
  { label:"⚙️ Mechanical",      items:["Timing belt replacement","Spark plug replacement","Clutch wear check","Suspension check","Battery check"] },
];

function ServiceDueCard({ job, user, dispatch, showFlash, onClose, onDone }) {
  const CATS = [
    {k:"oil",    ic:"🛢️", l:"Oil & Fluids", items:["Oil change","Oil + filter change","Transmission fluid","Brake fluid flush","Coolant flush","Power steering fluid"]},
    {k:"brakes", ic:"🔩", l:"Brakes & Tyres", items:["Brake pad check","Brake pad replacement","Brake disc check","Tyre rotation","Wheel alignment","Wheel balancing","Tyre replacement"]},
    {k:"engine", ic:"⚙️", l:"Engine", items:["Timing belt","Spark plugs","Air filter","Fuel filter","Injector cleaning","DPF cleaning","Engine tune-up","Clutch wear check"]},
    {k:"ac",     ic:"❄️", l:"AC & Comfort", items:["AC service","AC gas refill","Cabin filter","Wiper blades"]},
    {k:"elec",   ic:"🔋", l:"Electrical", items:["Battery check","Battery replacement","Alternator check","Starter motor"]},
    {k:"susp",   ic:"🔧", l:"Suspension", items:["Suspension check","Shock absorber","Ball joint","Coil spring"]},
    {k:"general",ic:"📋", l:"General", items:["Full service","General inspection","Body wash & polish","Insurance renewal","PUC / Emission check"]},
  ];

  const [selected, setSelected] = useState(job._nextVisitServices||[]);
  const [saved, setSaved] = useState(!!(job._nextVisitServices&&job._nextVisitServices.length>0));
  const [custom, setCustom] = useState("");
  const [activeCat, setActiveCat] = useState("oil");

  const toggle = (svc) => {
    setSelected(s=>s.includes(svc)?s.filter(x=>x!==svc):[...s,svc]);
    setSaved(false);
  };

  const addCustom = () => {
    const val = custom.trim();
    if(!val || selected.includes(val)) return;
    setSelected(s=>[...s,val]);
    setCustom("");
    setSaved(false);
  };

  const save = () => {
    dispatch("SAVE_REMARKS",{jobNo:job.jobNo,remarks:job.remarks||"",
      nextVisitServices:selected,dueDate:job._nextDueDate||"",
      dueKm:job._nextDueKm||"",by:user.name});
    showFlash("🔧 Services saved");
    setSaved(true);
  };

  const activeCatData = CATS.find(c=>c.k===activeCat);

  // KM milestone recommendations
  const curKm = +(job.kms||"").replace(/\D/g,"")||0;
  const KM_MILESTONES = [
    {km:5000,  every:true,  svcs:["Oil change","Tyre rotation"]},
    {km:10000, every:true,  svcs:["Oil + filter change","Air filter"]},
    {km:20000, every:true,  svcs:["Brake pad check","Cabin filter","Wheel alignment"]},
    {km:30000, every:false, svcs:["Coolant flush","Transmission fluid","Spark plugs"]},
    {km:40000, every:false, svcs:["Fuel filter","AC service","Brake fluid flush"]},
    {km:50000, every:false, svcs:["Timing belt","Suspension check","Battery check","Full service"]},
    {km:60000, every:false, svcs:["Brake disc check","Injector cleaning","Wheel balancing"]},
    {km:70000, every:false, svcs:["Timing belt","Clutch wear check","Shock absorber"]},
    {km:80000, every:false, svcs:["Engine tune-up","Power steering fluid","Alternator check"]},
    {km:100000,every:false, svcs:["Full service","Timing belt","Coolant flush","Transmission fluid","Suspension check","Brake pad replacement"]},
  ];
  // Find next milestone
  const nextMilestone = KM_MILESTONES.find(m => {
    if(m.every) return curKm > 0 && (curKm % m.km) >= (m.km - 2000);
    return curKm > 0 && curKm >= (m.km - 3000) && curKm <= (m.km + 3000);
  });
  // Also check recurring services based on rough intervals
  const recommended = [];
  if(curKm > 0) {
    // Every 10K: oil+filter
    if(curKm % 10000 >= 8000 || curKm % 10000 <= 2000) {
      if(!recommended.includes("Oil + filter change")) recommended.push("Oil + filter change");
    }
    // Every 20K: brake check, cabin filter
    if(curKm % 20000 >= 17000) {
      ["Brake pad check","Cabin filter"].forEach(s=>{if(!recommended.includes(s))recommended.push(s);});
    }
    // 40K+: timing belt, spark plugs
    if(curKm >= 38000 && curKm <= 52000) {
      ["Timing belt","Spark plugs"].forEach(s=>{if(!recommended.includes(s))recommended.push(s);});
    }
    if(curKm >= 65000 && curKm <= 75000) {
      ["Timing belt","Suspension check","Clutch wear check"].forEach(s=>{if(!recommended.includes(s))recommended.push(s);});
    }
    if(curKm >= 95000) {
      ["Full service","Timing belt","Coolant flush","Brake pad replacement"].forEach(s=>{if(!recommended.includes(s))recommended.push(s);});
    }
    // Add milestone-specific
    if(nextMilestone) nextMilestone.svcs.forEach(s=>{if(!recommended.includes(s))recommended.push(s);});
  }
  // Deduplicate
  const uniqueRecs = [...new Set(recommended)].slice(0, 8);

  return (
    <div style={{margin:"4px 10px",background:T.recv,borderRadius:12,
      border:"1px solid "+T.border,overflow:"hidden",
      display:"flex",flexDirection:"column",maxHeight:"70vh"}}>

      {/* Header — fixed */}
      <div style={{padding:"10px 14px",borderBottom:"1px solid "+T.border,
        display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
        <span style={{fontSize:14,fontWeight:600,color:T.text,fontFamily:T.font}}>
          🔧 Service Due
        </span>
        {saved&&(
          <span style={{fontSize:9,color:T.green,fontWeight:700,fontFamily:T.font,
            background:T.green+"18",padding:"2px 6px",borderRadius:4}}>✅ Saved</span>
        )}
        <div style={{flex:1}}/>
        {selected.length>0&&(
          <span style={{fontSize:10,color:T.green,fontWeight:700,fontFamily:T.font,flexShrink:0}}>
            {selected.length} selected
          </span>
        )}
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",
          color:T.textMuted,fontSize:18,lineHeight:1}}>×</button>
      </div>

      {/* Scrollable content */}
      <div style={{flex:1,overflowY:"auto",minHeight:0,
        pointerEvents:saved?"none":"auto",opacity:saved?0.55:1,transition:"opacity .2s"}}>

      {/* KM-based recommendations */}
      {uniqueRecs.length>0&&(
        <div style={{padding:"10px 14px",borderBottom:"1px solid "+T.border,background:"#FFFBEB"}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
            <span style={{fontSize:12}}>⚡</span>
            <span style={{fontSize:10,fontWeight:700,color:"#92400E",fontFamily:T.font}}>
              RECOMMENDED AT {curKm>0?fmtINR(curKm)+" KM":"CURRENT KM"}
            </span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
            {uniqueRecs.map(s=>{
              const on = selected.includes(s);
              return (
                <button key={s} onClick={()=>toggle(s)}
                  style={{padding:"7px 10px",borderRadius:8,cursor:"pointer",fontSize:11,
                    border:on?"1.5px solid "+T.green:"1.5px solid #F59E0B55",
                    fontFamily:T.font,fontWeight:on?700:500,textAlign:"left",
                    background:on?T.green+"15":"#FEF3C7",color:on?T.green:"#92400E",
                    display:"flex",alignItems:"center",gap:5}}>
                  <span style={{width:14,height:14,borderRadius:7,flexShrink:0,fontSize:8,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    background:on?T.green:"#F59E0B44",color:on?"#fff":"#92400E",fontWeight:700}}>
                    {on?"✓":""}
                  </span>
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      )}



      {/* Category pills — wrap */}
      <div style={{display:"flex",flexWrap:"wrap",gap:6,padding:"10px 14px",borderBottom:"1px solid "+T.border,
        background:"#FAFAF8"}}>
        {CATS.map(cat=>{
          const isActive = activeCat===cat.k;
          const catCount = cat.items.filter(i=>selected.includes(i)).length;
          return (
            <button key={cat.k} onClick={()=>setActiveCat(cat.k)}
              style={{padding:"6px 10px",borderRadius:18,cursor:"pointer",fontSize:11,
                fontFamily:T.font,whiteSpace:"nowrap",position:"relative",
                background:isActive?T.green:"#fff",
                color:isActive?"#fff":T.textMuted,fontWeight:isActive?700:400,
                border:isActive?"1.5px solid "+T.green:"1.5px solid #E5E4DF",
                boxShadow:isActive?"0 2px 6px rgba(59,109,17,.2)":"none",
                transition:"all .15s"}}>
              {cat.ic} {cat.l}
              {catCount>0&&(
                <span style={{position:"absolute",top:-4,right:-4,width:16,height:16,borderRadius:8,
                  background:isActive?"#fff":T.green,color:isActive?T.green:"#fff",fontSize:9,fontWeight:800,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  border:"1.5px solid "+(isActive?T.green:"#fff")}}>{catCount}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Service pills for active category */}
      <div style={{padding:"12px 14px",minHeight:60}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          {activeCatData&&activeCatData.items.map(s=>{
            const on = selected.includes(s);
            return (
              <button key={s} onClick={()=>toggle(s)}
                style={{padding:"10px 12px",borderRadius:10,cursor:"pointer",fontSize:12,
                  border:on?"1.5px solid "+T.green:"1.5px solid #E5E4DF",
                  fontFamily:T.font,fontWeight:on?700:400,textAlign:"left",
                  background:on?T.green+"15":"#fff",color:on?T.green:T.text,
                  display:"flex",alignItems:"center",gap:6}}>
                <span style={{width:18,height:18,borderRadius:9,flexShrink:0,fontSize:10,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  background:on?T.green:"#E5E4DF",color:on?"#fff":"#C5C4BF",fontWeight:700}}>
                  {on?"✓":""}
                </span>
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom add */}
      <div style={{padding:"8px 14px",borderTop:"1px solid "+T.border}}>
        <div style={{display:"flex",gap:6}}>
          <input value={custom} onChange={e=>setCustom(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter")addCustom();}}
            placeholder="Add custom service..."
            style={{flex:1,padding:"7px 12px",background:"#F5F4F0",border:"1px solid "+T.border,
              borderRadius:8,fontSize:12,color:T.text,outline:"none",fontFamily:T.font,
              boxSizing:"border-box"}}/>
          <button onClick={addCustom} disabled={!custom.trim()}
            style={{padding:"7px 14px",background:custom.trim()?T.green:"#E5E4DF",
              border:"none",borderRadius:8,cursor:custom.trim()?"pointer":"default",
              fontSize:12,color:custom.trim()?"#fff":T.textMuted,fontWeight:600,
              fontFamily:T.font,flexShrink:0}}>
            Add
          </button>
        </div>
      </div>

      </div>{/* end scrollable content */}

      {/* Save + Done — fixed at bottom */}
      <div style={{padding:"10px 14px",display:"flex",gap:8,flexShrink:0,borderTop:"1px solid "+T.border}}>
        <button onClick={()=>{if(selected.length>0) save();}}
          style={{flex:1,padding:"10px",background:selected.length>0?"#F1EFE8":"#E5E4DF",border:"none",borderRadius:8,
            cursor:selected.length>0?"pointer":"not-allowed",fontSize:12,
            color:selected.length>0?T.green:T.textMuted,fontWeight:600,fontFamily:T.font,
            opacity:selected.length>0?1:0.5}}>
          {saved?"✅ Saved":"💾 Save"}
        </button>
        <button onClick={()=>{if(saved&&onDone) onDone();}}
          style={{flex:1,padding:"10px",background:saved?T.green:"#E5E4DF",border:"none",borderRadius:8,
            cursor:saved?"pointer":"not-allowed",fontSize:12,
            color:saved?"#fff":T.textMuted,fontWeight:700,fontFamily:T.font,
            opacity:saved?1:0.5}}>
          {saved?"Estimate →":"Save first"}
        </button>
      </div>
    </div>
  );
}
function QCCard({ job, user, dispatch, showFlash, onClose, onNextService }) {
  const checks = [
    {key:"_washDone",      l:"Vehicle Washed", optional:true},
    {key:"_testDriveDone", l:"Test Drive", optional:false},
    {key:"_qcPassed",      l:"QC Passed", optional:false},
    {key:"_custNotified",  l:"Customer Notified", optional:false},
  ];

  const [local, setLocal] = useState({
    _washDone:     !!job._washDone,
    _testDriveDone:!!job._testDriveDone,
    _qcPassed:     !!job._qcPassed,
    _custNotified: !!job._custNotified,
  });
  const [saved, setSaved] = useState(checks.some(c=>!!job[c.key]));

  // Sync local state when job changes (e.g. QC reset by service untick)
  useEffect(()=>{
    setLocal({
      _washDone:     !!job._washDone,
      _testDriveDone:!!job._testDriveDone,
      _qcPassed:     !!job._qcPassed,
      _custNotified: !!job._custNotified,
    });
    setSaved(checks.some(c=>!!job[c.key]));
  },[job._washDone, job._testDriveDone, job._qcPassed, job._custNotified]);

  const toggle = (key) => { setLocal(l=>({...l,[key]:!l[key]})); setSaved(false); };

  const save = () => {
    dispatch("QC_SAVE",{jobNo:job.jobNo, checks:local, by:user.name});
    showFlash("✅ QC saved");
    setSaved(true);
  };

  const allDone    = checks.filter(c=>!c.optional).every(c=>!!local[c.key]);
  const doneCount  = checks.filter(c=>!!local[c.key]).length;

  // Work completion check
  const totalSvc   = (job.items||[]).length;
  const doneSvc    = (job._servicesDone||[]).length;
  const workDone   = totalSvc > 0 && doneSvc === totalSvc;
  const canProceed = allDone && saved && workDone;

  return (
    <div style={{margin:"4px 10px 6px",background:"#fff",borderRadius:14,
      border:"1px solid "+(allDone&&saved?T.green+"66":T.border),overflow:"hidden",
      boxShadow:"0 1px 6px rgba(0,0,0,.06)",fontFamily:T.font}}>

      {/* Tab header */}
      <div style={{padding:"10px 14px",borderBottom:"1px solid "+T.border,
        background:allDone&&saved?"#EAF3DE":"#FAFAF8",
        display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:13,fontWeight:700,fontFamily:T.font,
          color:allDone&&saved?T.green:T.text}}>
          ✅ QC Inspection
        </span>
        {saved&&(
          <span style={{fontSize:9,color:T.green,fontWeight:700,fontFamily:T.font,
            background:T.green+"18",padding:"2px 6px",borderRadius:4}}>✅ Saved</span>
        )}
        <div style={{flex:1}}/>
        <span style={{fontSize:11,fontFamily:T.font,fontWeight:700,
          color:allDone&&saved?T.green:T.textMuted,flexShrink:0}}>
          {doneCount}/{checks.length}
        </span>
        <div style={{width:48,height:4,background:"#E5E4DF",borderRadius:2,overflow:"hidden",flexShrink:0}}>
          <div style={{width:(doneCount/checks.length*100)+"%",height:"100%",
            background:T.green,borderRadius:2,transition:"width .3s"}}/>
        </div>
        <button onClick={onClose}
          style={{background:"none",border:"none",cursor:"pointer",fontFamily:T.font,
            color:T.textMuted,fontSize:18,lineHeight:1,padding:"0 0 0 4px"}}>×</button>
      </div>

      {/* Work incomplete warning */}
      {!workDone && totalSvc > 0 && (
        <div style={{padding:"8px 14px",background:"#FFF8EE",
          borderBottom:"1px solid #F59E0B33",
          display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:14}}>⚠️</span>
          <span style={{fontSize:11,color:"#854F0B",fontFamily:T.font}}>
            {doneSvc}/{totalSvc} services done — complete all work before proceeding to Next Visit
          </span>
        </div>
      )}

      {/* QC pills — locked when saved */}
      <div style={{pointerEvents:saved?"none":"auto",opacity:saved?0.55:1,transition:"opacity .2s"}}>
      {/* QC pills — mandatory */}
      <div style={{padding:"12px 14px 4px",display:"flex",flexWrap:"wrap",gap:8}}>
        {checks.filter(c=>!c.optional).map(c=>{
          const on = local[c.key];
          return (
            <button key={c.key} onClick={()=>toggle(c.key)}
              style={{padding:"8px 16px",borderRadius:22,cursor:"pointer",fontSize:12,
                fontFamily:T.font,whiteSpace:"nowrap",border:on?"1.5px solid "+T.green:"1.5px solid #E5E4DF",
                fontWeight:on?700:400,minWidth:0,
                background:on?T.green:"#F1EFE8",color:on?"#fff":T.textMuted,
                boxShadow:on?"0 2px 6px rgba(59,109,17,.25)":"none",
                transition:"all .2s"}}>
              {c.l}
            </button>
          );
        })}
      </div>
      {/* QC pills — optional */}
      <div style={{padding:"4px 14px 12px",display:"flex",flexWrap:"wrap",gap:8}}>
        {checks.filter(c=>c.optional).map(c=>{
          const on = local[c.key];
          return (
            <button key={c.key} onClick={()=>toggle(c.key)}
              style={{padding:"6px 14px",borderRadius:22,cursor:"pointer",fontSize:11,
                fontFamily:T.font,whiteSpace:"nowrap",
                border:on?"1.5px solid "+T.green:"1.5px dashed #C5C4BF",
                fontWeight:on?700:400,minWidth:0,
                background:on?T.green+"22":"transparent",color:on?T.green:T.textMuted,
                transition:"all .2s"}}>
              {c.l}{!on?" (optional)":""}
            </button>
          );
        })}
      </div>

      </div>{/* end QC lock wrapper */}

      {/* Save + Next Visit */}
      <div style={{padding:"0 14px 12px",display:"flex",gap:8}}>
        <button onClick={()=>{if(allDone) save();}}
          style={{flex:1,padding:"10px",background:allDone?"#F1EFE8":"#E5E4DF",border:"none",
            borderRadius:8,cursor:allDone?"pointer":"not-allowed",fontSize:12,fontFamily:T.font,
            color:allDone?T.green:T.textMuted,fontWeight:600,opacity:allDone?1:0.5}}>
          {saved?"✅ Saved":"💾 Save"}
        </button>
        <button onClick={()=>{ if(canProceed) onNextService(); }}
          title={!workDone?"Complete all services first":!allDone?"Tick all QC checks":!saved?"Save QC first":""}
          style={{flex:1,padding:"10px",border:"none",borderRadius:8,
            fontSize:12,fontFamily:T.font,fontWeight:700,
            cursor:canProceed?"pointer":"not-allowed",
            background:canProceed?T.green:!workDone?"#F59E0B33":"#E5E4DF",
            color:canProceed?"#fff":!workDone?"#854F0B":T.textMuted,
            transition:"all .25s"}}>
          {!workDone?"⚠️ Work Pending":"Next Visit →"}
        </button>
      </div>
    </div>
  );
}


// ── Next Visit Service Card — inline in chat ──────────────────
function NextServiceCard({ job, user, dispatch, showFlash, onClose, onDone }) {
  const [customNote, setCustomNote] = useState(job.remarks||"");
  const [dueDate, setDueDate] = useState(job._nextDueDate||"");
  const [dueKm, setDueKm] = useState(job._nextDueKm||"");
  const [saved, setSaved] = useState(!!(job._nextDueDate||job.remarks));

  const save = () => {
    dispatch("SAVE_REMARKS",{jobNo:job.jobNo,remarks:customNote.trim(),
      nextVisitServices:job._nextVisitServices||[],
      dueDate:dueDate,dueKm:dueKm,by:user.name});
    showFlash("📝 Notes saved");
    setSaved(true);
  };

  const monthsFromNow = (m) => {
    const d = new Date(); d.setMonth(d.getMonth()+m);
    return d.toISOString().split("T")[0];
  };
  const kmFromNow = (add) => {
    const cur = +(job.kms||"").replace(/\D/g,"")||0;
    return String(cur+add);
  };

  return (
    <div style={{margin:"4px 10px",background:T.recv,borderRadius:12,
      border:"1px solid "+T.border,overflow:"hidden"}}>
      <div style={{padding:"10px 14px",borderBottom:"1px solid "+T.border,
        display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:14,fontWeight:600,color:T.text,fontFamily:T.font}}>
          📝 Next Visit Notes
        </span>
        {saved&&(
          <span style={{fontSize:9,color:T.green,fontWeight:700,fontFamily:T.font,
            background:T.green+"18",padding:"2px 6px",borderRadius:4}}>✅ Saved</span>
        )}
        <div style={{flex:1}}/>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",
          color:T.textMuted,fontSize:18,lineHeight:1}}>×</button>
      </div>

      {/* Content — locked when saved */}
      <div style={{pointerEvents:saved?"none":"auto",opacity:saved?0.55:1,transition:"opacity .2s"}}>

      {/* Due date + KM */}
      <div style={{padding:"10px 14px",borderBottom:"1px solid "+T.border}}>
        <div style={{fontSize:10,color:T.textMuted,fontWeight:600,marginBottom:6}}>REMINDER</div>

        {/* Brand-aware service interval hint */}
        {(()=>{
          const brand = (job.brand||"").toLowerCase();
          const isEuro = ["skoda","volkswagen","vw","audi","bmw","mercedes","volvo","jeep","fiat"].some(b=>brand.includes(b));
          const isHondaOld = brand.includes("honda");
          const interval = isEuro ? "15,000 km / 1 year" : isHondaOld ? "5,000–10,000 km / 6 months" : "10,000 km / 6 months";
          return (
            <div style={{background:"#FFF8EE",borderRadius:8,padding:"6px 10px",
              marginBottom:8,fontSize:11,color:"#854F0B",display:"flex",alignItems:"center",gap:6}}>
              <span>🔔</span>
              <span><b>{job.brand||"This vehicle"}</b> standard service: {interval}</span>
            </div>
          );
        })()}

        <div style={{display:"flex",gap:8,marginBottom:8}}>
          <div style={{flex:1}}>
            <div style={{fontSize:9,color:T.textMuted,marginBottom:3}}>Due date <span style={{color:"#E53E3E"}}>*</span></div>
            <input type="date" value={dueDate} min={dt()}
              onChange={e=>{
                const val = e.target.value;
                if(val && val < dt()) return; // block past dates
                setDueDate(val);setSaved(false);
              }}
              style={{width:"100%",padding:"7px 10px",background:dueDate?"#FFFFFF":"#FFF5F5",
                border:"1px solid "+(dueDate?T.border:"#FCA5A5"),
                borderRadius:6,fontSize:12,color:T.text,outline:"none",fontFamily:T.font,
                boxSizing:"border-box",colorScheme:"light"}}/>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:9,color:T.textMuted,marginBottom:3}}>Due at KM <span style={{color:"#E53E3E"}}>*</span></div>
            {(()=>{
              const curKm = +(job.kms||"").replace(/\D/g,"")||0;
              const enteredKm = +(dueKm||0);
              const invalid = dueKm && enteredKm <= curKm;
              return (<>
                <input value={dueKm} onChange={e=>{setDueKm(e.target.value.replace(/\D/g,""));setSaved(false);}}
                  inputMode="numeric" placeholder={curKm>0?"Must be > "+fmtINR(curKm):"e.g. 50000"}
                  style={{width:"100%",padding:"7px 10px",
                    background:invalid?"#FFF5F5":dueKm?"#F5F4F0":"#FFF5F5",
                    border:"1px solid "+(invalid?"#DC2626":dueKm?T.border:"#FCA5A5"),
                    borderRadius:6,fontSize:12,color:invalid?"#DC2626":T.text,outline:"none",fontFamily:T.mono,
                    boxSizing:"border-box"}}/>
                {curKm>0&&(
                  <div style={{fontSize:8,marginTop:2,color:invalid?"#DC2626":T.textMuted,fontFamily:T.mono}}>
                    {invalid?"⚠️ Must be greater than current "+fmtINR(curKm)+" km":"Current: "+fmtINR(curKm)+" km"}
                  </div>
                )}
              </>);
            })()}
          </div>
        </div>

        {/* Smart date pills */}
        {(()=>{
          const brand = (job.brand||"").toLowerCase();
          const isEuro = ["skoda","volkswagen","vw","audi","bmw","mercedes","volvo"].some(b=>brand.includes(b));
          const datePills = isEuro
            ? [{l:"6 months",m:6},{l:"1 year",m:12},{l:"2 years",m:24}]
            : [{l:"3 months",m:3},{l:"6 months",m:6},{l:"1 year",m:12}];
          return (
            <div style={{marginBottom:6}}>
              <div style={{fontSize:9,color:T.textMuted,marginBottom:4,fontWeight:600}}>DATE SHORTCUTS</div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {datePills.map((s,i)=>(
                  <button key={i} onClick={()=>{setDueDate(monthsFromNow(s.m));setSaved(false);}}
                    style={{padding:"5px 12px",borderRadius:14,cursor:"pointer",fontSize:11,
                      border:"1px solid "+T.border,background:"transparent",
                      color:T.textMuted,fontFamily:T.font}}>{s.l}</button>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Smart KM pills — brand-aware */}
        {(()=>{
          const brand = (job.brand||"").toLowerCase();
          const isEuro = ["skoda","volkswagen","vw","audi","bmw","mercedes","volvo"].some(b=>brand.includes(b));
          const isLuxury = ["bmw","mercedes","audi","volvo"].some(b=>brand.includes(b));
          const isHondaOld = brand.includes("honda");
          let kmPills;
          if(isLuxury)       kmPills = [{l:"+15,000 km",v:15000},{l:"+20,000 km",v:20000}];
          else if(isEuro)    kmPills = [{l:"+10,000 km",v:10000},{l:"+15,000 km",v:15000}];
          else if(isHondaOld) kmPills = [{l:"+5,000 km",v:5000},{l:"+10,000 km",v:10000}];
          else               kmPills = [{l:"+5,000 km",v:5000},{l:"+10,000 km",v:10000},{l:"+15,000 km",v:15000}];
          return (
            <div>
              <div style={{fontSize:9,color:T.textMuted,marginBottom:4,fontWeight:600}}>KM SHORTCUTS</div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {kmPills.map((s,i)=>(
                  <button key={i} onClick={()=>{setDueKm(kmFromNow(s.v));setSaved(false);}}
                    style={{padding:"5px 12px",borderRadius:14,cursor:"pointer",fontSize:11,
                      border:"1px solid "+T.border,background:"transparent",
                      color:T.textMuted,fontFamily:T.font}}>{s.l}</button>
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Custom note */}
      <div style={{padding:"10px 14px",borderBottom:"1px solid "+T.border}}>
        <div style={{fontSize:10,color:T.textMuted,fontWeight:600,marginBottom:4}}>NOTE <span style={{fontWeight:400,fontSize:9,opacity:.6}}>(optional)</span></div>
        <input value={customNote} onChange={e=>{setCustomNote(e.target.value);setSaved(false);}}
          placeholder="e.g. Customer mentioned AC noise..."
          style={{width:"100%",padding:"8px 12px",background:"#F5F4F0",border:"1px solid "+T.border,
            borderRadius:8,fontSize:12,color:T.text,outline:"none",fontFamily:T.font,
            boxSizing:"border-box"}}/>
      </div>

      </div>{/* end NextVisit lock wrapper */}

      <div style={{padding:"10px 14px",display:"flex",gap:8}}>
        {(()=>{
          const curKm = +(job.kms||"").replace(/\D/g,"")||0;
          const enteredKm = +(dueKm||0);
          const kmValid = enteredKm > curKm;
          const dateValid = dueDate && dueDate >= dt();
          const canSave = !!(dateValid && dueKm && kmValid);
          const msg = saved?"✅ Saved"
            :!dueDate&&!dueKm?"Fill date & KM"
            :!dueDate?"Fill due date"
            :dueDate<dt()?"Date must be future"
            :!dueKm?"Fill due KM"
            :!kmValid?"KM must be > "+fmtINR(curKm)
            :"💾 Save";
          return(
          <button onClick={()=>{if(canSave) save();}}
            style={{flex:1,padding:"10px",background:canSave?"#F1EFE8":((!kmValid&&dueKm)||(dueDate&&dueDate<dt()))?"#FFF5F5":"#E5E4DF",
              border:((!kmValid&&dueKm)||(dueDate&&dueDate<dt()))?"1px solid #FCA5A5":"none",borderRadius:8,
              cursor:canSave?"pointer":"not-allowed",fontSize:12,
              color:canSave?T.green:((!kmValid&&dueKm)||(dueDate&&dueDate<dt()))?"#DC2626":T.textMuted,fontWeight:600,fontFamily:T.font,
              opacity:canSave?1:0.6}}>
            {msg}
          </button>);})()}
        {(()=>{
          return(
          <button onClick={()=>{if(saved&&onDone) onDone();}}
            style={{flex:1,padding:"10px",background:saved?T.green:"#E5E4DF",border:"none",borderRadius:8,
              cursor:saved?"pointer":"not-allowed",fontSize:12,
              color:saved?"#fff":T.textMuted,fontWeight:700,fontFamily:T.font,
              opacity:saved?1:0.5}}>
            {saved?"Service Due →":"Save first"}
          </button>);})()}
      </div>
    </div>
  );
}

// ── Service Due Card — separate from Next Visit ────────────────
// ── Payment Card ──────────────────────────────────────────────
function PayCard({ job, user, dispatch, showFlash, onClose }) {
  const [amt,setAmt] = useState("");
  const [mth,setMth] = useState("CASH");
  const [note,setNote] = useState("");
  const [saved,setSaved] = useState(false);
  const paid = (job.payments||[]).reduce((s,p)=>s+p.amount,0);
  const bal  = Math.max(0,(job.totalAmount||0)-paid);

  const doPayment = () => {
    const a=+amt; if(!a) return;
    dispatch("ADD_PAYMENT",{jobNo:job.jobNo,payment:{
      id:Date.now(),amount:a,method:mth,
      date:dt(),time:tm(),by:user.name,
      note:note.trim()||undefined,
      isDue: a < bal,
    },by:user.name});
    showFlash("💰 ₹"+fmtINR(a)+" recorded"+(a<bal?" · Balance due: ₹"+fmtINR(bal-a):""));
    setAmt(""); setNote(""); setSaved(false);
  };

  return (
    <div style={{margin:"4px 10px",background:"#F5F4F0",borderRadius:12,border:"1px solid #E5E4DF",overflow:"hidden"}}>
      <div style={{padding:"8px 12px",borderBottom:"1px solid #E5E4DF",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:13,fontWeight:700,color:T.text,fontFamily:T.font}}>💰 Payment</span>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:T.textMuted,fontSize:20,lineHeight:1,padding:"0 2px"}}>×</button>
      </div>
      {!(job._testDriveDone&&job._qcPassed&&job._custNotified)&&(
        <div style={{padding:"10px 12px",background:"#FFF8EE",display:"flex",gap:8,alignItems:"center",borderBottom:"1px solid #E5E4DF"}}>
          <span style={{fontSize:14}}>⚠️</span>
          <span style={{fontSize:11,color:"#F59E0B",fontFamily:T.font}}>
            QC inspection must be completed before recording payment.
          </span>
        </div>
      )}
      <div style={{padding:"8px 12px 6px",borderBottom:"1px solid #E5E4DF",display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
        {[["Total",job.totalAmount,T.text],["Paid",paid,"#3B6D11"],["Balance",bal,bal>0?T.red:T.green]].map(([l,v,c])=>(
          <div key={l} style={{textAlign:"center"}}>
            <div style={{fontSize:10,color:T.textMuted}}>{l}</div>
            <div style={{fontSize:14,fontFamily:T.mono,fontWeight:800,color:c}}>₹{fmtINR(v)}</div>
          </div>
        ))}
      </div>
      {(job.payments||[]).length>0&&(
        <div style={{padding:"6px 12px",borderBottom:"1px solid #E5E4DF"}}>
          {(job.payments||[]).map((p,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:11,padding:"3px 0"}}>
              <span style={{color:T.textMuted}}>{p.method} · {p.by} · {p.date}</span>
              <span style={{color:"#3B6D11",fontFamily:T.mono,fontWeight:700}}>₹{fmtINR(p.amount)}</span>
            </div>
          ))}
        </div>
      )}
      {bal>0&&(
        <div style={{padding:"10px 12px"}}>
          <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:8}}>
            {[{l:"Full",v:bal},{l:"50%",v:Math.round(bal*.5)},{l:"₹500",v:500},{l:"₹1000",v:1000}].filter(q=>q.v>0).map(q=>(
              <button key={q.l} onClick={()=>{setAmt(String(q.v));setSaved(false);}}
                style={{padding:"4px 9px",borderRadius:12,cursor:"pointer",fontSize:11,fontWeight:+amt===q.v?700:500,border:`1px solid ${+amt===q.v?T.green:T.border}`,background:+amt===q.v?T.green+"22":"transparent",color:+amt===q.v?T.green:T.textMuted,fontFamily:T.font}}>
                {q.l}
              </button>
            ))}
          </div>
          <div style={{display:"flex",alignItems:"center",background:"#FFFFFF",borderRadius:8,border:"1px solid #E5E4DF",marginBottom:8}}>
            <span style={{padding:"0 8px 0 12px",fontSize:16,color:T.textMuted,fontWeight:700}}>₹</span>
            <input value={amt} onChange={e=>{setAmt(e.target.value.replace(/\D/g,""));setSaved(false);}} type="number" inputMode="numeric" placeholder="Amount"
              style={{flex:1,padding:"10px 8px",border:"none",background:"#FFFFFF",fontSize:17,fontFamily:T.mono,fontWeight:800,outline:"none",color:T.text}}/>
          </div>
          <div style={{display:"flex",gap:6,marginBottom:10}}>
            {["CASH","UPI","CARD"].map(m=>(
              <button key={m} onClick={()=>{setMth(m);setSaved(false);}}
                style={{flex:1,padding:"7px",borderRadius:8,border:`1.5px solid ${mth===m?T.green:T.border}`,background:mth===m?T.green+"22":"transparent",fontSize:12,cursor:"pointer",fontFamily:T.font,fontWeight:mth===m?800:500,color:mth===m?T.green:T.textMuted}}>
                {m==="CASH"?"💵":m==="UPI"?"📱":"💳"} {m}
              </button>
            ))}
          </div>
          {+amt>0&&+amt<bal&&(
            <div style={{marginBottom:8,padding:"7px 10px",background:"#FFF8EE",
              borderRadius:8,border:"1px solid #F59E0B44",
              fontSize:11,color:"#F59E0B",fontFamily:T.font}}>
              ⚠️ Partial payment — ₹{fmtINR(bal-+amt)} will remain as <strong>due</strong>
            </div>
          )}
          <input value={note} onChange={e=>{setNote(e.target.value);setSaved(false);}}
            placeholder="Note (optional — e.g. part payment, card failed)"
            style={{width:"100%",marginBottom:8,padding:"8px 10px",background:"#FFFFFF",
              border:"1px solid #E5E4DF",borderRadius:8,fontSize:11,
              color:T.text,fontFamily:T.font,outline:"none",boxSizing:"border-box"}}/>

          {/* Save → then Record — two step */}
          {!saved ? (
            <button onClick={()=>{if(+amt)setSaved(true);}} disabled={!+amt}
              style={{width:"100%",padding:"12px",background:+amt?T.green:"#E5E4DF",border:"none",
                borderRadius:8,color:"#fff",fontSize:13,fontWeight:700,
                cursor:+amt?"pointer":"not-allowed",fontFamily:T.font}}>
              💾 Save — ₹{fmtINR(+amt||0)} via {mth}
            </button>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {/* Review banner */}
              <div style={{background:"#EAF3DE",borderRadius:8,padding:"10px 12px",
                border:"1px solid "+T.green+"44",display:"flex",alignItems:"center",gap:10}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:700,color:T.green,fontFamily:T.font}}>
                    ₹{fmtINR(+amt)} · {mth}
                  </div>
                  <div style={{fontSize:11,color:T.textMuted,marginTop:2}}>
                    {note||"No note"} · {+amt>=bal?"Full payment":"Part payment"}
                  </div>
                </div>
                <button onClick={()=>setSaved(false)}
                  style={{background:"none",border:"none",cursor:"pointer",
                    color:T.textMuted,fontSize:12,fontFamily:T.font,textDecoration:"underline"}}>
                  Edit
                </button>
              </div>
              <button onClick={doPayment}
                style={{width:"100%",padding:"12px",background:T.green,border:"none",
                  borderRadius:8,color:"#fff",fontSize:14,fontWeight:800,
                  cursor:"pointer",fontFamily:T.font}}>
                {+amt>=bal?"✅ Confirm Full Payment":"✅ Record ₹"+fmtINR(+amt)+" Payment"}
              </button>
            </div>
          )}

          {job.status!=="delivered"&&bal>0&&paid>0&&(
            <button onClick={()=>{dispatch("MARK_DELIVERED",{jobNo:job.jobNo,by:user.name});onClose();showFlash("🚗 Delivered with ₹"+fmtINR(bal)+" due");}}
              style={{width:"100%",padding:"9px",background:"transparent",border:"1px dashed #F0AD00",
                borderRadius:8,color:"#854F0B",fontSize:11,cursor:"pointer",
                fontFamily:T.font,marginTop:6}}>
              ⚠️ Deliver with ₹{fmtINR(bal)} outstanding due
            </button>
          )}
        </div>
      )}
      {bal<=0&&paid>0&&(
        <div style={{padding:"12px"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
            <span style={{fontSize:20}}>✅</span>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:T.green,fontFamily:T.font}}>Fully Paid</div>
              <div style={{fontSize:11,color:T.textMuted}}>₹{fmtINR(paid)} received</div>
            </div>
          </div>
          {job.status!=="delivered"&&(
            <button onClick={()=>{
              dispatch("MARK_DELIVERED",{jobNo:job.jobNo,by:user.name});
              onClose();
              showFlash("🚗 Vehicle Delivered!");
            }}
              style={{width:"100%",padding:"14px",background:T.green,border:"none",
                borderRadius:10,color:"#fff",fontSize:15,fontWeight:800,
                cursor:"pointer",fontFamily:T.font,
                boxShadow:"0 3px 12px rgba(59,109,17,.35)"}}>
              🚗 Deliver Vehicle
            </button>
          )}
          {job.status==="delivered"&&(
            <div style={{textAlign:"center",padding:"8px",background:"#F1EFE8",borderRadius:8}}>
              <span style={{fontSize:12,color:T.textMuted,fontFamily:T.font}}>📦 Vehicle Delivered on {job.deliveryDate}</span>
            </div>
          )}
        </div>
      )}
      {bal<=0&&paid===0&&(
        <div style={{padding:"12px",textAlign:"center",color:T.textMuted,fontSize:12}}>
          No payment recorded yet
        </div>
      )}
    </div>
  );
}

// ── Assign Card ───────────────────────────────────────────────
function AssignCard({ job, user, dispatch, showFlash, onClose }) {
  return (
    <div style={{margin:"4px 10px",background:"#F5F4F0",borderRadius:12,border:"1px solid #E5E4DF"}}>
      <div style={{padding:"8px 12px",borderBottom:"1px solid #E5E4DF",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:13,fontWeight:700,color:T.text,fontFamily:T.font}}>👨‍🔧 Assign Mechanic</span>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:T.textMuted,fontSize:18,lineHeight:1}}>×</button>
      </div>
      <div style={{padding:"10px 12px"}}>
        <div style={{fontSize:11,color:T.textMuted,marginBottom:8,fontFamily:T.font}}>
          Once assigned, the mechanic will see this vehicle in their job list.
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          <button onClick={()=>{dispatch("ASSIGN_MECHANIC",{jobNo:job.jobNo,mechId:null,by:user.name});showFlash("Unassigned");onClose();}}
            style={{padding:"8px 16px",borderRadius:9,border:`1px solid ${!job.assignedTo?T.green:T.border}`,background:!job.assignedTo?T.green+"22":"transparent",color:!job.assignedTo?T.green:T.textMuted,fontSize:12,cursor:"pointer",fontFamily:T.font,fontWeight:!job.assignedTo?700:500}}>
            None
          </button>
          {MECHANICS.map(m=>(
            <button key={m.id} onClick={()=>{dispatch("ASSIGN_MECHANIC",{jobNo:job.jobNo,mechId:m.id,by:user.name});showFlash(`✅ Assigned to ${m.name}`);onClose();}}
              style={{padding:"8px 16px",borderRadius:9,border:`1px solid ${job.assignedTo===m.id?T.green:T.border}`,background:job.assignedTo===m.id?T.green+"22":"transparent",color:job.assignedTo===m.id?T.green:T.textMuted,fontSize:12,cursor:"pointer",fontFamily:T.font,fontWeight:job.assignedTo===m.id?700:500,display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:16}}>{m.avatar}</span>
              <div style={{textAlign:"left"}}>
                <div>{m.name}</div>
                {job.assignedTo===m.id&&<div style={{fontSize:10,color:T.green}}>Currently assigned ✓</div>}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── + Action Menu ─────────────────────────────────────────────
function PlusMenu({ job, user, onAction, onClose }) {
  const canAdmin   = user.role==="admin";
  const isRecp     = user.role==="receptionist";
  const paid       = (job.payments||[]).reduce((s,p)=>s+p.amount,0);
  const bal        = Math.max(0,(job.totalAmount||0)-paid);
  const allSvcDone = (job._servicesDone||[]).length===(job.items||[]).length&&(job.items||[]).length>0;
  const allPartsDone = (job._parts||[]).every(p=>p.done);
  const allOutDone = (job.outsourced||[]).every(o=>o.status==="received");
  const totalWork = (job.items||[]).length + (job._parts||[]).length + (job.outsourced||[]).length;
  const workComplete = totalWork>0 && allSvcDone && allPartsDone && allOutDone;
  const qcPassed   = !!(job._testDriveDone&&job._qcPassed&&job._custNotified);
  const assignedMech = MECHANICS.find(m=>m.id===job.assignedTo);
  const delivered  = job.status==="delivered";

  const opts = [
    {k:"work",   ic:"🔧", l:"Services & Work",
      sub:"Add services, parts, outsource"},

    {k:"vehicle", ic:"🚗", l:"Vehicle Info",
      sub:(job.regNo||"")+" · "+(job.brand||"")+" "+(job.model||"")},

    {k:"assign", ic:"👨‍🔧", l:"Assign Mechanic",
      sub:assignedMech?assignedMech.name+" assigned":"Not assigned"},

    // QC — unlocks after work complete, always accessible once passed
    (workComplete||qcPassed)
      ? {k:"qc",ic:"✅",l:"QC Inspection",sub:qcPassed?"✅ QC Passed":"Open QC checklist"}
      : {k:"_qc",ic:"✅",l:"QC Inspection",sub:"⚠️ Complete all work first",disabled:true},

    // Next Visit — unlocks after QC
    (qcPassed||job._nextDueDate||job.remarks)
      ? {k:"nextservice",ic:"📝",l:"Next Visit Notes",sub:job._nextDueDate||job.remarks?"Note saved":"Add notes"}
      : {k:"_nv",ic:"📝",l:"Next Visit Notes",sub:"⚠️ Complete QC first",disabled:true},

    // Service Due — separate tab after Next Visit
    (qcPassed||job._nextVisitServices?.length>0)
      ? {k:"servicedue",ic:"🔧",l:"Service Due",sub:job._nextVisitServices?.length>0?job._nextVisitServices.length+" service(s) noted":"Add services due"}
      : {k:"_sd",ic:"🔧",l:"Service Due",sub:"⚠️ Complete QC first",disabled:true},

    // Estimate — unlocks after QC, always accessible once opened
    (qcPassed||job._estimateSent)
      ? {k:"estimate",ic:"📄",l:"Estimate / Bill",sub:job._estimateSent?"✅ Estimate saved":"Generate & print bill"}
      : {k:"_e",ic:"📄",l:"Estimate / Bill",sub:"⚠️ Complete QC first",disabled:true},

    // Payment — unlocks after estimate saved
    job._estimateSent
      ? {k:"payment",ic:"💰",l:"Payment",sub:(()=>{const p=(job.payments||[]).reduce((s,pp)=>s+pp.amount,0);const b=Math.max(0,(job.totalAmount||0)-p);return p>0?(b>0?"₹"+fmtINR(p)+" paid · ₹"+fmtINR(b)+" due":"₹"+fmtINR(p)+" — Fully paid ✅"):"Record payment";})()}
      : {k:"_p",ic:"💰",l:"Payment",sub:"⚠️ Save estimate first",disabled:true},

    // Vendor accounts
    (canAdmin||isRecp)&&(job.outsourced||[]).some(o=>o.vendorCost>0)&&{k:"vendor",ic:"💸",l:"Vendor Accounts",
      sub:(()=>{const d=(job.outsourced||[]).filter(o=>o.vendorCost>0&&!o.vendorPaid).reduce((t,o)=>t+o.vendorCost,0);return d>0?"₹"+fmtINR(d)+" due":"All paid ✅";})()},

    // Log — always available
    {k:"log",ic:"📋",l:"Job Log",
      sub:(job.timeline||[]).length+" entries"},

    canAdmin&&!delivered&&{k:"status",ic:"🔄",l:"Change Status",
      sub:"Current: "+(STATUS_META[job.status]&&STATUS_META[job.status].label||job.status)},
  ].filter(Boolean);

  return (
    <div style={{position:"absolute",bottom:"100%",left:0,marginBottom:8,background:"#FFFFFF",borderRadius:14,border:"1px solid #E5E4DF",boxShadow:"0 8px 24px rgba(0,0,0,.5)",minWidth:260,zIndex:10,overflow:"hidden"}}>
      <div style={{padding:"8px 12px",borderBottom:"1px solid #E5E4DF",fontSize:11,fontWeight:700,color:T.textMuted,fontFamily:T.font}}>ACTIONS</div>
      {opts.map((opt,i)=>(
        <button key={opt.k+i} onClick={()=>{ if(!opt.disabled){onAction(opt.k);onClose();}}}
          style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"11px 14px",background:"transparent",border:"none",borderBottom:i<opts.length-1?"1px solid #2A394233":"none",cursor:opt.disabled?"default":"pointer",textAlign:"left",opacity:opt.disabled?0.4:1}}>
          <span style={{fontSize:18,flexShrink:0}}>{opt.ic}</span>
          <div>
            <div style={{fontSize:13,color:T.text,fontFamily:T.font,fontWeight:600}}>{opt.l}</div>
            <div style={{fontSize:11,color:T.textMuted,fontFamily:T.font}}>{opt.sub}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

// ── Status Change ─────────────────────────────────────────────
function StatusCard({ job, user, dispatch, showFlash, onClose }) {
  const statuses = ["open","in_progress","completed"];
  return (
    <div style={{margin:"4px 10px",background:"#F5F4F0",borderRadius:12,border:"1px solid #E5E4DF"}}>
      <div style={{padding:"8px 12px",borderBottom:"1px solid #E5E4DF",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:13,fontWeight:700,color:T.text,fontFamily:T.font}}>🔄 Update Status</span>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:T.textMuted,fontSize:18}}>×</button>
      </div>
      <div style={{padding:"8px 12px",display:"flex",flexDirection:"column",gap:6}}>
        {statuses.map(s=>{
          const sm=STATUS_META[s]; const cur=job.status===s;
          return(
            <button key={s} onClick={()=>{if(!cur){dispatch("CHANGE_STATUS",{jobNo:job.jobNo,status:s,by:user.name});showFlash(`${sm.icon} ${sm.label}`);onClose();}}}
              style={{padding:"10px 14px",borderRadius:10,border:`1.5px solid ${cur?sm.color:T.border}`,background:cur?sm.color+"22":"transparent",cursor:cur?"default":"pointer",display:"flex",alignItems:"center",gap:10,fontFamily:T.font}}>
              <span style={{fontSize:16}}>{sm.icon}</span>
              <span style={{flex:1,fontSize:13,fontWeight:600,color:cur?sm.color:T.text}}>{sm.label}</span>
              {cur&&<span style={{fontSize:10,color:sm.color,fontWeight:700}}>Current</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---

// CHAT PANEL
// Admin + Receptionist: full access via + button
// Mechanic: read-only job card + tick services + chat
// ---
function ChatPanel({ job, user, jobs, dispatch, showFlash, onStartCheckin, onBack, lang }) {
  const [note, setNote] = useState("");
  const [active, setActive] = useState(null); // work|qc|payment|assign|status|estimate
  const [showNextSvc, setShowNextSvc] = useState(false);
  const [showPlus, setShowPlus] = useState(false);
  const [showDash, setShowDash] = useState(false);

  const endRef = useRef(null);
  const scrollRef = useRef(null);
  const isMech  = user.role==="mechanic";
  const canAdmin = user.role==="admin";
  const isRecp  = user.role==="receptionist";
  const canManage = canAdmin||isRecp;

  const manualMsgCount = (job&&job.timeline||[]).filter(m=>!m.auto&&m.type!=="system").length;

  // Save scroll position to module-level store (persists across tab switches)
  const saveScroll = () => {
    if(scrollRef.current && job?.jobNo) {
      SCROLL_MEMORY[job.jobNo] = scrollRef.current.scrollTop;
    }
  };

  // Restore scroll when job changes or component mounts
  useEffect(()=>{
    if(!scrollRef.current || !job?.jobNo) return;
    const saved = SCROLL_MEMORY[job.jobNo];
    if(saved !== undefined) {
      setTimeout(()=>{ if(scrollRef.current) scrollRef.current.scrollTop = saved; }, 50);
    } else {
      setTimeout(()=>{ endRef.current?.scrollIntoView({behavior:"auto"}); }, 50);
    }
  },[job?.jobNo]);

  // Only auto-scroll to bottom if user is already near bottom
  useEffect(()=>{
    if(!scrollRef.current) return;
    const el = scrollRef.current;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if(nearBottom) endRef.current?.scrollIntoView({behavior:"smooth"});
  },[manualMsgCount]);

  // Always scroll to bottom when a workflow step is opened
  useEffect(()=>{
    if(active && ["work","qc","nextservice","servicedue","estimate","payment","vehicle","assign","vendor","log","status"].includes(active)){
      setTimeout(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); }, 80);
    }
  },[active]);

  // Auto-close stepper if active step's prerequisite is no longer met
  useEffect(()=>{
    if(!active || !job) return;
    const qcOk = !!(job._testDriveDone&&job._qcPassed&&job._custNotified);
    const estOk = !!job._estimateSent;
    const svcDone = (job.items||[]).length>0 && (job._servicesDone||[]).length===(job.items||[]).length;
    // Close QC only if services were undone (not just parts/outsource)
    if(active==="qc" && !svcDone) setActive(null);
    if(active==="nextservice" && !qcOk) setActive(null);
    if(active==="servicedue" && !qcOk) setActive(null);
    if(active==="estimate" && !qcOk && !estOk) setActive(null);
    if(active==="payment" && !estOk) setActive(null);
  });

  // No job selected
  if (!job) {
    return (
      <div style={{width:"100%",background:T.chatBg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,height:"100%",position:"relative"}}>

        <div style={{fontSize:64}}>🔧</div>
        <div style={{fontSize:20,fontWeight:700,color:T.text,fontFamily:T.font}}>{GARAGE.name}</div>
        <div style={{fontSize:13,color:T.textMuted,textAlign:"center",maxWidth:260,fontFamily:T.font}}>Select a job from the list or start a new check-in.</div>
        {canManage&&(
          <button onClick={onStartCheckin}
            style={{padding:"12px 28px",background:T.green,border:"none",borderRadius:20,color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:T.font,marginTop:8}}>
            ＋ New Check-In
          </button>
        )}
      </div>
    );
  }

  const sm = STATUS_META[job.status]||STATUS_META.open;
  const bd = BRAND_DATA[job.brand]||{bg:"#6B7280",icon:"🚗"};
  const paid = (job.payments||[]).reduce((s,p)=>s+p.amount,0);
  const bal  = Math.max(0,(job.totalAmount||0)-paid);
  const assignedMech = MECHANICS.find(m=>m.id===job.assignedTo);
  const allSvcDone = (job._servicesDone||[]).length===(job.items||[]).length&&(job.items||[]).length>0;
  const qcPassed   = !!(job._testDriveDone&&job._qcPassed&&job._custNotified);

  // Filter timeline — only manual messages in chat (system logs go to Log tab)
  const timeline = (job.timeline||[]).filter(msg=>{
    if(msg.type==="estimate_card") return true; // always show estimate
    if(msg.type==="health_report") return true; // always show health report
    if(msg.type==="reopen_card") return true; // always show reopen
    if(msg.type==="qc_result") return true; // always show QC
    if(msg.auto || msg.type==="system") return false;
    return true;
  });
  const grouped = timeline.reduce((acc,msg)=>{
    const d=msg.date||dt(); if(!acc[d])acc[d]=[]; acc[d].push(msg); return acc;
  },{});

  const sendNote = () => {
    if(!note.trim()) return;
    dispatch("ADD_NOTE",{jobNo:job.jobNo,note:note.trim(),by:user.name});
    setNote("");
  };
  const sendVoice = (v) => {
    const fmtDur=s=>`${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
    dispatch("ADD_NOTE",{jobNo:job.jobNo,note:"🎤 Voice note ("+fmtDur(v.duration)+")",by:user.name,isVoice:true,dataURL:v.dataURL,voiceDur:fmtDur(v.duration)});
  };
  const handleAction = k => {
    if(k==="invoice"){printInvoice(job);return;}
    if(k==="notify"){sendWA(job.phone,`Hi ${job.name}, your vehicle *${job.regNo}* status: *${sm.label}*${bal>0?`\nBalance: ₹${fmtINR(bal)}`:""}.\n— ${GARAGE.name} 🙏`);return;}
    // Enforce step dependencies
    if(k==="qc"&&!allSvcDone){showFlash("Complete all work items first");return;}
    if(k==="nextservice"&&!qcPassed){showFlash("Complete QC inspection first");return;}
    if(k==="servicedue"&&!qcPassed){showFlash("Complete QC inspection first");return;}
    if(k==="estimate"&&!qcPassed){showFlash("Complete QC inspection first");return;}
    if(k==="payment"&&!job._estimateSent){showFlash("Save estimate first");return;}
    setActive(a=>a===k?null:k);
  };

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",background:T.chatBg,height:"100%",overflow:"hidden"}}>

      {/* Header */}
      <div style={{background:"#FFFFFF",padding:"10px 14px",display:"flex",alignItems:"center",gap:10,flexShrink:0,borderBottom:"0.5px solid #E5E4DF"}}>
        <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,lineHeight:1,padding:"0 2px",flexShrink:0}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 19l-7-7 7-7" stroke="#1B1B1A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div style={{width:36,height:36,borderRadius:10,background:bd.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{bd.icon}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14,fontWeight:600,color:"#1B1B1A",fontFamily:T.font,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            {isMech ? job.regNo : job.name}
          </div>
          <div style={{fontSize:11,color:"#888780",fontFamily:T.mono,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            {job.regNo} · {sm.icon} {sm.label}{assignedMech?" · "+assignedMech.name:""}
          </div>
        </div>
      </div>

      {/* Chat scroll */}
      <div ref={scrollRef} onScroll={saveScroll}
        style={{flex:1,overflowY:"auto",minHeight:0,backgroundImage:T.chatPattern}}
        onClick={()=>{if(showPlus)setShowPlus(false);}}>
        {/* Pinned job info */}
        <JobInfoCard job={job} user={user} dispatch={dispatch} showFlash={showFlash}/>
        <VehiclePhotosCard job={job} user={user} dispatch={dispatch} showFlash={showFlash}/>
        <ServiceHistory regNo={job.regNo} jobs={jobs} currentJobNo={job.jobNo}/>
        {/* Work summary card — shows all work added, updates live */}
        <WorkSummaryCard job={job} user={user} dispatch={dispatch} showFlash={showFlash}
          onGoToQC={()=>setActive("qc")}
          onNavigate={(step)=>setActive(step)}
          onUndoWork={()=>setActive(null)}
          activeStep={active}/>

        {/* Timeline */}
        {Object.entries(grouped).map(([date,msgs])=>(
          <div key={date}>
            <div style={{display:"flex",justifyContent:"center",margin:"6px 0"}}>
              <span style={{background:"#F5F4F0",color:T.textMuted,fontSize:11,padding:"3px 12px",borderRadius:12,fontFamily:T.font}}>{fmtDate(date)}</span>
            </div>
            {msgs.map(msg=>{
              if(msg.type==="reopen_card") {
                return (
                <div key={msg.id} style={{margin:"4px 10px 6px"}}>
                  <div style={{background:"#FFF8EE",borderRadius:12,border:"1px solid #FDE68A",
                    padding:"12px 14px",display:"flex",alignItems:"center",gap:10,
                    boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
                    <div style={{width:36,height:36,borderRadius:18,background:"#FEF3C7",
                      display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>
                      {"🔄"}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:700,color:"#854F0B"}}>Job Re-opened</div>
                      <div style={{fontSize:10,color:"#888780"}}>
                        {msg.by} {"\u00b7"} {msg.time} {"\u00b7"} Workflow reset for rework
                      </div>
                    </div>
                  </div>
                </div>
                );
              }
              if(msg.type==="estimate_card"&&msg.estimateData) {
                const ed = msg.estimateData;
                return (
                <div key={msg.id} style={{margin:"4px 10px 6px"}}>
                  <div style={{background:"#fff",borderRadius:12,border:"1px solid #E5E4DF",
                    overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
                    <div style={{padding:"8px 12px",background:"#EAF3DE",borderBottom:"1px solid #C0DD9744",
                      display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontSize:13}}>📄</span>
                      <span style={{fontSize:12,fontWeight:700,color:"#3B6D11",flex:1}}>Estimate</span>
                      <button onClick={()=>{
                        let r="*ESTIMATE \u2014 "+GARAGE.name+"*\n\n";
                        r+="Vehicle: *"+job.regNo+"* "+job.brand+" "+job.model+"\n";
                        r+="Customer: *"+job.name+"*\n\n";
                        if(ed.spares&&ed.spares.length>0){r+="*SPARES*\n";ed.spares.forEach(s=>{r+=s.desc+(s.qty>1?" x"+s.qty:"")+" \u2014 \u20b9"+fmtINR(s.qty*s.rate)+"\n";});r+="\n";}
                        if(ed.labour&&ed.labour.length>0){r+="*LABOUR*\n";ed.labour.forEach(s=>{r+=s.desc+" \u2014 \u20b9"+fmtINR(s.qty*s.rate)+"\n";});r+="\n";}
                        if(ed.outwork&&ed.outwork.length>0){r+="*OUTWORK*\n";ed.outwork.forEach(s=>{r+=s.desc+" \u2014 \u20b9"+fmtINR(s.qty*s.rate)+"\n";});r+="\n";}
                        r+="*Total: \u20b9"+fmtINR(ed.grandTotal||0)+"*\n\n"+GARAGE.name+"\n"+GARAGE.phone;
                        sendWA(job.phone,r);showFlash("Estimate sent");
                      }}
                        style={{padding:"3px 8px",borderRadius:6,border:"none",
                          background:"#25D366",cursor:"pointer",display:"inline-flex",
                          alignItems:"center",gap:3,flexShrink:0}}>
                        <span style={{fontSize:9,fontWeight:600,color:"#fff"}}>Send</span>
                      </button>
                      <button onClick={()=>{
                        const html = "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Estimate</title>"
                          +"<style>body{font-family:sans-serif;padding:20px;max-width:600px;margin:auto}"
                          +"h2{text-align:center;margin:0}p.sub{text-align:center;color:#666;font-size:12px;margin:4px 0 16px}"
                          +"table{width:100%;border-collapse:collapse;margin:10px 0}th,td{padding:6px 8px;text-align:left;border-bottom:1px solid #eee;font-size:13px}"
                          +"th{background:#f5f5f5;font-size:11px;color:#666}.cat{background:#f0f0f0;font-weight:700;font-size:12px}"
                          +"td.amt{text-align:right;font-family:monospace;font-weight:600}"
                          +".total{font-size:16px;font-weight:700;text-align:right;padding:12px 8px;border-top:2px solid #333}"
                          +".sig{margin-top:40px;text-align:right;font-size:11px;color:#888}"
                          +"@media print{button{display:none!important}}</style></head><body>"
                          +"<h2>"+GARAGE.name+"</h2>"
                          +"<p class='sub'>"+GARAGE.address+" | "+GARAGE.phone+"</p>"
                          +"<table><tr><td><b>Customer:</b> "+job.name+"</td><td><b>Vehicle:</b> "+job.regNo+"</td></tr>"
                          +"<tr><td><b>Model:</b> "+(job.brand||"")+" "+(job.model||"")+"</td><td><b>Date:</b> "+fmtDate(msg.date||dt())+"</td></tr></table>"
                          +"<table><tr><th>#</th><th>Description</th><th>Qty</th><th style='text-align:right'>Rate</th><th style='text-align:right'>Amount</th></tr>";
                        let html2 = "";
                        let sno = 1;
                        if(ed.spares&&ed.spares.length>0){
                          html2+="<tr><td colspan='5' class='cat'>SPARES</td></tr>";
                          ed.spares.forEach(s=>{html2+="<tr><td>"+sno+++"</td><td>"+s.desc+"</td><td>"+s.qty+"</td><td class='amt'>\u20b9"+fmtINR(s.rate)+"</td><td class='amt'>\u20b9"+fmtINR(s.qty*s.rate)+"</td></tr>";});
                        }
                        if(ed.labour&&ed.labour.length>0){
                          html2+="<tr><td colspan='5' class='cat'>LABOUR</td></tr>";
                          ed.labour.forEach(s=>{html2+="<tr><td>"+sno+++"</td><td>"+s.desc+"</td><td>"+s.qty+"</td><td class='amt'>\u20b9"+fmtINR(s.rate)+"</td><td class='amt'>\u20b9"+fmtINR(s.qty*s.rate)+"</td></tr>";});
                        }
                        if(ed.outwork&&ed.outwork.length>0){
                          html2+="<tr><td colspan='5' class='cat'>OUTWORK</td></tr>";
                          ed.outwork.forEach(s=>{html2+="<tr><td>"+sno+++"</td><td>"+s.desc+"</td><td>"+s.qty+"</td><td class='amt'>\u20b9"+fmtINR(s.rate)+"</td><td class='amt'>\u20b9"+fmtINR(s.qty*s.rate)+"</td></tr>";});
                        }
                        html2+="</table><div class='total'>Grand Total: \u20b9"+fmtINR(ed.grandTotal||0)+"</div>"
                          +"<div class='sig'>Authorized Signature</div></body></html>";
                        const iframe = document.createElement("iframe");
                        iframe.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;border:none;z-index:99999;background:#fff";
                        document.body.appendChild(iframe);
                        const doc = iframe.contentDocument||iframe.contentWindow.document;
                        doc.open();doc.write(html+html2);doc.close();
                        const closeBtn=doc.createElement("button");
                        closeBtn.textContent="Close";
                        closeBtn.style.cssText="position:fixed;top:10px;right:10px;padding:8px 16px;background:#333;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;z-index:100";
                        closeBtn.onclick=function(){document.body.removeChild(iframe);};
                        doc.body.appendChild(closeBtn);
                        const printBtn=doc.createElement("button");
                        printBtn.textContent="Print";
                        printBtn.style.cssText="position:fixed;top:10px;right:100px;padding:8px 16px;background:#3B6D11;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;z-index:100";
                        printBtn.onclick=function(){iframe.contentWindow.print();};
                        doc.body.appendChild(printBtn);
                      }}
                        style={{padding:"3px 8px",borderRadius:6,border:"none",
                          background:"#3B6D1133",cursor:"pointer",display:"inline-flex",
                          alignItems:"center",gap:3,flexShrink:0}}>
                        <span style={{fontSize:9,fontWeight:600,color:"#3B6D11"}}>{"🖨️"}</span>
                      </button>
                      <span style={{fontSize:9,color:"#888780"}}>{msg.time}</span>
                    </div>
                    {ed.spares&&ed.spares.length>0&&(
                      <div style={{padding:"6px 12px",borderBottom:"0.5px solid #F1EFE8"}}>
                        <div style={{fontSize:9,fontWeight:700,color:"#888780",marginBottom:3}}>SPARES</div>
                        {ed.spares.map((r,i)=>(
                          <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:11,padding:"1px 0"}}>
                            <span style={{color:"#1B1B1A"}}>{r.desc} {r.qty>1?"×"+r.qty:""}</span>
                            <span style={{color:"#3B6D11",fontFamily:T.mono,fontWeight:600}}>{r.qty*r.rate>0?"\u20b9"+fmtINR(r.qty*r.rate):""}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {ed.labour&&ed.labour.length>0&&(
                      <div style={{padding:"6px 12px",borderBottom:"0.5px solid #F1EFE8"}}>
                        <div style={{fontSize:9,fontWeight:700,color:"#888780",marginBottom:3}}>LABOUR</div>
                        {ed.labour.map((r,i)=>(
                          <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:11,padding:"1px 0"}}>
                            <span style={{color:"#1B1B1A"}}>{r.desc}</span>
                            <span style={{color:"#3B6D11",fontFamily:T.mono,fontWeight:600}}>{r.qty*r.rate>0?"\u20b9"+fmtINR(r.qty*r.rate):""}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {ed.outwork&&ed.outwork.length>0&&(
                      <div style={{padding:"6px 12px",borderBottom:"0.5px solid #F1EFE8"}}>
                        <div style={{fontSize:9,fontWeight:700,color:"#888780",marginBottom:3}}>OUTWORK</div>
                        {ed.outwork.map((r,i)=>(
                          <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:11,padding:"1px 0"}}>
                            <span style={{color:"#1B1B1A"}}>{r.desc}</span>
                            <span style={{color:"#3B6D11",fontFamily:T.mono,fontWeight:600}}>{r.qty*r.rate>0?"\u20b9"+fmtINR(r.qty*r.rate):""}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{padding:"8px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",
                      background:"#F5F4F0"}}>
                      <span style={{fontSize:12,fontWeight:700,color:"#1B1B1A"}}>Total</span>
                      <span style={{fontSize:16,fontWeight:800,color:"#3B6D11",fontFamily:T.mono}}>{"\u20b9"}{fmtINR(ed.grandTotal||0)}</span>
                    </div>

                  </div>
                </div>
                );
              }
              if(msg.type==="health_report"&&msg.healthChecks) {
                const ragC = {green:"#3B6D11",amber:"#D97706",red:"#DC2626"};
                const ragB = {green:"#EAF3DE",amber:"#FEF3C7",red:"#FEE2E2"};
                const ragL = {green:"Good",amber:"Monitor",red:"Urgent"};
                return (
                <div key={msg.id} style={{margin:"4px 10px 6px"}}>
                  <div style={{background:"#fff",borderRadius:12,border:"1px solid #E5E4DF",
                    overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
                    <div style={{padding:"8px 12px",background:"#3B6D11",
                      display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontSize:13,color:"#fff"}}>📋</span>
                      <span style={{fontSize:12,fontWeight:700,color:"#fff",flex:1}}>Vehicle Health Report</span>
                      <button onClick={()=>{
                        const hc = msg.healthChecks||[];
                        let r = "*VEHICLE HEALTH REPORT*\n*"+GARAGE.name+"*\n\n";
                        r += "Vehicle: *"+job.regNo+"* "+job.brand+" "+job.model+"\n";
                        r += "Customer: *"+job.name+"*\nKMs: "+(job.kms||"")+"\n\n";
                        hc.forEach(h=>{
                          const dot=h.status==="green"?"\uD83D\uDFE2":h.status==="amber"?"\uD83D\uDFE1":"\uD83D\uDD34";
                          r+=dot+" *"+h.cat+"* — "+h.note+"\n";
                        });
                        if(msg.nextDue) r+="\nNext: "+msg.nextDue+(msg.nextKm?" · "+msg.nextKm+"km":"")+"\n";
                        r+="\nThank you! "+GARAGE.phone;
                        sendWA(job.phone,r);showFlash("📤 Report sent");
                      }}
                        style={{padding:"3px 8px",borderRadius:6,border:"none",
                          background:"rgba(255,255,255,.2)",cursor:"pointer",display:"inline-flex",
                          alignItems:"center",gap:3,flexShrink:0}}>
                        <span style={{fontSize:9,fontWeight:600,color:"#fff"}}>Send</span>
                      </button>
                      <button onClick={()=>{
                        const hc = msg.healthChecks||[];
                        const html = "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Health Report</title>"
                          +"<style>body{font-family:sans-serif;padding:20px;max-width:600px;margin:auto}"
                          +"h2{text-align:center;margin:0}p.sub{text-align:center;color:#666;font-size:12px;margin:4px 0 16px}"
                          +"table{width:100%;border-collapse:collapse;margin:10px 0}td{padding:8px;font-size:13px;border-bottom:1px solid #eee}"
                          +".dot{display:inline-block;width:10px;height:10px;border-radius:5px;margin-right:8px}"
                          +".g{background:#3B6D11}.a{background:#D97706}.r{background:#DC2626}"
                          +".cat{font-weight:700}.note{color:#666;font-size:12px}"
                          +".lbl{font-size:11px;padding:2px 8px;border-radius:10px;font-weight:600;float:right}"
                          +".lg{background:#EAF3DE;color:#3B6D11}.la{background:#FEF3C7;color:#D97706}.lr{background:#FEE2E2;color:#DC2626}"
                          +".next{background:#f5f5f5;padding:12px;border-radius:8px;margin-top:16px;font-size:13px}"
                          +".sig{margin-top:40px;text-align:right;font-size:11px;color:#888}"
                          +"@media print{button{display:none!important}}</style></head><body>"
                          +"<h2>"+GARAGE.name+"</h2>"
                          +"<p class='sub'>"+GARAGE.address+" | "+GARAGE.phone+"</p>"
                          +"<p style='font-size:13px'><b>Customer:</b> "+job.name+" | <b>Vehicle:</b> "+job.regNo+" "+job.brand+" "+job.model+" | <b>KMs:</b> "+(job.kms||"")+"</p>"
                          +"<h3 style='margin:16px 0 8px;font-size:14px'>Vehicle Health Report</h3><table>"
                          +hc.map(h=>"<tr><td><span class='dot "+(h.status==="green"?"g":h.status==="amber"?"a":"r")+"'></span>"
                            +"<span class='cat'>"+h.cat+"</span><br><span class='note'>"+h.note+"</span></td>"
                            +"<td style='text-align:right'><span class='lbl "+(h.status==="green"?"lg":h.status==="amber"?"la":"lr")+"'>"
                            +(h.status==="green"?"Good":h.status==="amber"?"Monitor":"Urgent")+"</span></td></tr>").join("")
                          +"</table>"
                          +(msg.nextDue?"<div class='next'><b>Next Service:</b> "+fmtDate(msg.nextDue)+(msg.nextKm?" at "+msg.nextKm+" km":"")
                            +(msg.nextSvcs&&msg.nextSvcs.length>0?"<br><span style='color:#666;font-size:12px'>"+msg.nextSvcs.join(" | ")+"</span>":"")+"</div>":"")
                          +"<div class='sig'>Authorized Signature</div></body></html>";
                        const iframe = document.createElement("iframe");
                        iframe.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;border:none;z-index:99999;background:#fff";
                        document.body.appendChild(iframe);
                        const doc = iframe.contentDocument||iframe.contentWindow.document;
                        doc.open();doc.write(html);doc.close();
                        const closeBtn=doc.createElement("button");
                        closeBtn.textContent="Close";
                        closeBtn.style.cssText="position:fixed;top:10px;right:10px;padding:8px 16px;background:#333;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;z-index:100";
                        closeBtn.onclick=function(){document.body.removeChild(iframe);};
                        doc.body.appendChild(closeBtn);
                        const printBtn=doc.createElement("button");
                        printBtn.textContent="Print";
                        printBtn.style.cssText="position:fixed;top:10px;right:100px;padding:8px 16px;background:#3B6D11;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;z-index:100";
                        printBtn.onclick=function(){iframe.contentWindow.print();};
                        doc.body.appendChild(printBtn);
                      }}
                        style={{padding:"3px 8px",borderRadius:6,border:"none",
                          background:"rgba(255,255,255,.2)",cursor:"pointer",display:"inline-flex",
                          alignItems:"center",gap:3,flexShrink:0}}>
                        <span style={{fontSize:9,fontWeight:600,color:"#fff"}}>{"🖨️"}</span>
                      </button>
                      <span style={{fontSize:9,color:"#C0DD97"}}>{msg.time}</span>
                    </div>
                    <div style={{padding:"6px 12px"}}>
                      {/* Legend */}
                      <div style={{display:"flex",gap:8,padding:"4px 0 6px",borderBottom:"0.5px solid #F1EFE8"}}>
                        {[["green","Good"],["amber","Monitor"],["red","Urgent"]].map(([k,l])=>(
                          <div key={k} style={{display:"flex",alignItems:"center",gap:3,fontSize:9}}>
                            <div style={{width:8,height:8,borderRadius:4,background:ragC[k]}}/>
                            <span style={{color:ragC[k],fontWeight:600}}>{l}</span>
                          </div>
                        ))}
                      </div>
                      {/* Items */}
                      {msg.healthChecks.map((h,hi)=>(
                        <div key={hi} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 0",
                          borderBottom:hi<msg.healthChecks.length-1?"0.5px solid #F1EFE8":"none"}}>
                          <div style={{width:8,height:8,borderRadius:4,background:ragC[h.status],flexShrink:0}}/>
                          <span style={{fontSize:11,fontWeight:600,color:"#1B1B1A",flex:1}}>{h.cat}</span>
                          <span style={{fontSize:9,color:ragC[h.status]}}>{h.note}</span>
                          <span style={{fontSize:8,fontWeight:700,color:ragC[h.status],
                            background:ragB[h.status],padding:"1px 6px",borderRadius:8,flexShrink:0}}>
                            {ragL[h.status]}
                          </span>
                        </div>
                      ))}
                      {/* Next service */}
                      {msg.nextDue&&(
                        <div style={{marginTop:6,padding:"6px 8px",background:"#F5F4F0",borderRadius:6}}>
                          <div style={{fontSize:9,fontWeight:700,color:"#888780"}}>NEXT SERVICE</div>
                          <div style={{fontSize:11,color:"#1B1B1A"}}>{fmtDate(msg.nextDue)}{msg.nextKm?" · "+msg.nextKm+" km":""}</div>
                          {msg.nextSvcs&&msg.nextSvcs.length>0&&(
                            <div style={{fontSize:9,color:"#888780",marginTop:1}}>{msg.nextSvcs.join(" · ")}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Quick actions */}
                  <div style={{display:"flex",gap:6,marginTop:6}}>
                      <button onClick={()=>{try{window.open("tel:"+job.phone)}catch(e){}}}
                        style={{flex:1,padding:"8px",borderRadius:8,border:"1px solid #E5E4DF",
                          background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",
                          justifyContent:"center",gap:4,fontSize:10,fontWeight:600,color:"#1B1B1A"}}>
                        📞 Call
                      </button>
                      <button onClick={()=>sendWA(job.phone,"Hi "+job.name+", how is your "+job.brand+" "+job.model+" running? We'd love your feedback! Rate us: \u2b50\u2b50\u2b50\u2b50\u2b50")}
                        style={{flex:1,padding:"8px",borderRadius:8,border:"1px solid #E5E4DF",
                          background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",
                          justifyContent:"center",gap:4,fontSize:10,fontWeight:600,color:"#1B1B1A"}}>
                        ⭐ Feedback
                      </button>
                      <button onClick={()=>{dispatch("REOPEN_JOB",{jobNo:job.jobNo,by:user.name});showFlash("🔄 Job re-opened — use + for workflow");}}
                        style={{flex:1,padding:"8px",borderRadius:8,border:"1px solid #E5E4DF",
                          background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",
                          justifyContent:"center",gap:4,fontSize:10,fontWeight:600,color:"#854F0B"}}>
                        🔄 Re-open
                      </button>
                  </div>
                </div>
                );
              }
              if(msg.type==="system"||msg.auto) return <SystemPill key={msg.id} msg={msg}/>;
              if(msg.type==="qc_result") return (
                <div key={msg.id} style={{display:"flex",justifyContent:"flex-start",margin:"4px 10px 6px",alignItems:"flex-end",gap:6}}>
                  <div style={{width:26,height:26,borderRadius:13,background:"#EAF3DE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>✅</div>
                  <div style={{background:"#EAF3DE",borderRadius:"4px 14px 14px 14px",padding:"8px 12px",maxWidth:"82%",border:"1px solid "+T.green+"44",boxShadow:"0 1px 3px rgba(0,0,0,.06)"}}>
                    <div style={{fontSize:11,fontWeight:700,color:T.green,marginBottom:4,fontFamily:T.font}}>QC Inspection</div>
                    <div style={{fontSize:12,color:T.text,lineHeight:1.6,fontFamily:T.font}}>{msg.note}</div>
                    <div style={{fontSize:9,color:T.textMuted,marginTop:3,textAlign:"right"}}>{msg.time} · {msg.by}</div>
                  </div>
                </div>
              );
              if(msg.isVoice) return <VoiceBubble key={msg.id} msg={msg} isMine={msg.by===user?.name}/>;
              return <MessageBubble key={msg.id} msg={msg} isSent={msg.by===user?.name} userName={user?.name}/>;
            })}
          </div>
        ))}

        {/* ── Workflow stepper: Work → QC → Next Visit → Service Due → Estimate → Payment ── */}
        {["work","qc","nextservice","servicedue","estimate","payment"].includes(active) && canManage && (()=>{
          // Force-close stale views: only close if the PREREQUISITE step was undone
          const _qcOk = !!(job._testDriveDone&&job._qcPassed&&job._custNotified);
          const _svcDone = (job.items||[]).length>0 && (job._servicesDone||[]).length===(job.items||[]).length;
          // Close QC only if work was undone (not just because QC isn't done yet)
          if(active==="qc" && !_svcDone) { setTimeout(()=>setActive(null),0); return null; }
          if(active==="nextservice" && !_qcOk) { setTimeout(()=>setActive(null),0); return null; }
          if(active==="servicedue" && !_qcOk) { setTimeout(()=>setActive(null),0); return null; }

          const STEPS = [
            {k:"work",       ic:"🔧", l:"Work"},
            {k:"qc",         ic:"✅", l:"QC"},
            {k:"nextservice",ic:"📝", l:"Next Visit"},
            {k:"servicedue", ic:"🔩", l:"Service Due"},
            {k:"estimate",   ic:"📄", l:"Estimate"},
            {k:"payment",    ic:"💰", l:"Payment"},
          ];
          const curIdx = STEPS.findIndex(s=>s.k===active);

          // Determine which steps have saved data (for undo)
          const stepDone = {
            work: allSvcDone,
            qc: !!(job._testDriveDone&&job._qcPassed&&job._custNotified),
            nextservice: !!(job._nextDueDate||job.remarks),
            servicedue: !!(job._nextVisitServices&&job._nextVisitServices.length>0),
            estimate: !!job._estimateSent,
            payment: (job.payments||[]).length>0,
          };
          const UNDO_MAP = {work:"UNDO_WORK",qc:"UNDO_QC",nextservice:"UNDO_NEXT_VISIT",servicedue:"UNDO_SERVICE_DUE",estimate:"UNDO_ESTIMATE"};

          const handleUndo = (stepKey, e) => {
            if(e) { e.preventDefault(); e.stopPropagation(); }
            const labels = {work:"Work",qc:"QC",nextservice:"Next Visit",servicedue:"Service Due",estimate:"Estimate"};
            if(UNDO_MAP[stepKey]) {
              dispatch(UNDO_MAP[stepKey],{jobNo:job.jobNo,by:user.name});
              showFlash("↩️ "+labels[stepKey]+" undone"+(stepKey==="work"?" — all steps reset":""));
              if(stepKey==="work") {
                setActive(null);
                setTimeout(()=>setActive(null),50);
              } else {
                setActive(stepKey);
              }
            }
          };


          return (
            <div style={{margin:"4px 10px 6px",background:"#fff",borderRadius:14,
              border:"1px solid #E5E4DF",overflow:"hidden",
              boxShadow:"0 1px 6px rgba(0,0,0,.06)"}}>
              {/* Mini stepper — moves with active step */}
              <div style={{display:"flex",alignItems:"center",gap:0,padding:"8px 8px 6px",
                background:"#FAFAF8",borderBottom:"1px solid #E5E4DF"}}>
                {STEPS.map((s,i)=>{
                  const isPast=i<curIdx;
                  const isCurrent=i===curIdx;
                  const isFuture=i>curIdx;
                  const isDone=isPast&&(s.k==="work"?allSvcDone:(stepDone[s.k]||false));
                  const hasUndo=isDone&&!!UNDO_MAP[s.k];
                  const canClick=!hasUndo&&(!isFuture||isDone);
                  return (
                    <React.Fragment key={s.k}>
                      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,
                        position:"relative",flexShrink:0}}>
                        <button onClick={()=>{if(canClick)setActive(s.k);}}
                          style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,
                            padding:"2px 6px",background:"none",border:"none",
                            cursor:canClick?"pointer":"default",opacity:isFuture&&!isDone?.4:1}}>
                          <div style={{width:26,height:26,borderRadius:13,
                            display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,
                            background:isCurrent?T.green:isDone?"#EAF3DE":"#F1EFE8",
                            border:"2px solid "+(isCurrent?T.green:isDone?T.green+"55":"#E5E4DF"),
                            color:isCurrent?"#fff":isDone?T.green:T.textMuted,
                            fontWeight:700}}>
                            {isDone?"✓":s.ic}
                          </div>
                          <span style={{fontSize:7,fontFamily:T.font,fontWeight:isCurrent?700:400,
                            color:isCurrent?T.green:isDone?T.green:T.textMuted,whiteSpace:"nowrap"}}>
                            {s.l}
                          </span>
                        </button>
                        {isDone&&UNDO_MAP[s.k]&&(
                          <button onClick={(e)=>{e.preventDefault();e.stopPropagation();handleUndo(s.k,e);}}
                            style={{position:"absolute",top:-6,left:"50%",transform:"translateX(-50%)",
                              width:20,height:20,borderRadius:10,background:"#FF6B35",border:"2px solid #fff",
                              cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
                              padding:0,boxShadow:"0 1px 4px rgba(0,0,0,.3)",zIndex:10}}>
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                              <path d="M3 10h13a4 4 0 0 1 0 8H10" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M7 6l-4 4 4 4" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        )}
                      </div>
                      {i<STEPS.length-1&&(
                        <div style={{height:2,flex:1,minWidth:6,background:isDone?T.green+"44":"#E5E4DF",
                          borderRadius:1,alignSelf:"center",marginBottom:12}}/>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
              {active==="work" && <WorkCard job={job} user={user} dispatch={dispatch}
                showFlash={showFlash} onClose={()=>setActive(null)} embedded/>}
              {active==="qc" && <QCCard job={job} user={user} dispatch={dispatch}
                showFlash={showFlash} onClose={()=>setActive(null)}
                onNextService={()=>setActive("nextservice")} embedded/>}
              {active==="nextservice" && <NextServiceCard job={job} user={user} dispatch={dispatch}
                showFlash={showFlash} onClose={()=>setActive(null)}
                onDone={()=>setActive("servicedue")} embedded/>}
              {active==="servicedue" && <ServiceDueCard job={job} user={user} dispatch={dispatch}
                showFlash={showFlash} onClose={()=>setActive(null)}
                onDone={()=>setActive("estimate")} embedded/>}
              {active==="estimate" && <EstimateCard job={job} user={user} dispatch={dispatch}
                showFlash={showFlash} onClose={()=>setActive(null)}
                onDone={()=>setActive("payment")} embedded/>}
              {active==="payment" && <PayCard job={job} user={user} dispatch={dispatch}
                showFlash={showFlash} onClose={()=>setActive(null)} embedded/>}
            </div>
          );
        })()}
        {active==="vehicle" && (
          <div style={{margin:"4px 10px",background:T.recv,borderRadius:12,border:"1px solid "+T.border,overflow:"hidden"}}>
            <div style={{display:"flex",alignItems:"center",padding:"10px 14px",borderBottom:"1px solid "+T.border}}>
              <span style={{fontSize:14,fontWeight:600,color:T.text,fontFamily:T.font,flex:1}}>🚗 Vehicle Info</span>
              <button onClick={()=>setActive(null)} style={{background:"none",border:"none",cursor:"pointer",color:T.textMuted,fontSize:18}}>×</button>
            </div>
            <div style={{padding:"10px 14px"}}>
              <div style={{background:"#FFFDE7",borderRadius:8,padding:"10px",textAlign:"center",marginBottom:10,border:"2px solid #333"}}>
                <div style={{fontFamily:T.mono,fontWeight:900,fontSize:20,color:T.text,letterSpacing:5}}>{job.regNo}</div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px 14px",fontSize:12}}>
                <div><span style={{color:T.textMuted}}>Customer</span><br/><span style={{color:T.text,fontWeight:600}}>{job.name}</span></div>
                <div><span style={{color:T.textMuted}}>Phone</span><br/><span style={{color:T.text,fontFamily:T.mono}}>{job.phone}</span></div>
                <div><span style={{color:T.textMuted}}>Brand</span><br/><span style={{color:T.text}}>{job.brand}</span></div>
                <div><span style={{color:T.textMuted}}>Model</span><br/><span style={{color:T.text}}>{job.model}</span></div>
                {job.fuel&&<div><span style={{color:T.textMuted}}>Fuel</span><br/><span style={{color:T.text}}>{job.fuel}</span></div>}
                {job.kms&&<div><span style={{color:T.textMuted}}>KM</span><br/><span style={{color:T.text}}>{job.kms}</span></div>}
                <div><span style={{color:T.textMuted}}>Date In</span><br/><span style={{color:T.text}}>{job.date}</span></div>
                {job.deliveryDate&&<div><span style={{color:T.textMuted}}>Delivery</span><br/><span style={{color:T.green,fontWeight:600}}>{job.deliveryDate}</span></div>}
                {job.assignedTo&&<div><span style={{color:T.textMuted}}>Mechanic</span><br/><span style={{color:T.text}}>{(MECHANICS.find(m=>m.id===job.assignedTo)||{}).name||"—"}</span></div>}
                <div><span style={{color:T.textMuted}}>Status</span><br/><span style={{color:(STATUS_META[job.status]||{}).color||T.text,fontWeight:600}}>{(STATUS_META[job.status]||{}).label||job.status}</span></div>
              </div>
              {/* Belongings */}
              {job.belongings&&Object.values(job.belongings).some(v=>v===true||v>0)&&(
                <div style={{marginTop:10,paddingTop:8,borderTop:"1px solid "+T.border}}>
                  <div style={{fontSize:10,color:T.textMuted,fontWeight:600,marginBottom:4}}>BELONGINGS</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                    {BELONGS.filter(b=>{const v=job.belongings[b.k];return v===true||v>0;}).map(b=>(
                      <span key={b.k} style={{fontSize:11,padding:"3px 8px",borderRadius:10,background:T.border,color:T.text,fontFamily:T.font}}>
                        {b.l}{b.qty&&job.belongings[b.k]>0?" ×"+job.belongings[b.k]:""}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {active==="assign"  && canManage && <AssignCard job={job} user={user} dispatch={dispatch} showFlash={showFlash} onClose={()=>setActive(null)}/>}
        {active==="status"  && canAdmin  && <StatusCard job={job} user={user} dispatch={dispatch} showFlash={showFlash} onClose={()=>setActive(null)}/>}
        {active==="vendor"  && canManage && <VendorAccountsCard job={job} user={user} dispatch={dispatch} showFlash={showFlash} onClose={()=>setActive(null)}/>}
        {active==="log" && (
          <div style={{margin:"4px 10px",background:T.recv,borderRadius:12,border:"1px solid "+T.border,overflow:"hidden"}}>
            <div style={{display:"flex",alignItems:"center",padding:"10px 14px",borderBottom:"1px solid "+T.border}}>
              <span style={{fontSize:14,fontWeight:600,color:T.text,fontFamily:T.font,flex:1}}>📋 Job Log</span>
              <span style={{fontSize:11,color:T.textMuted,marginRight:8}}>{(job.timeline||[]).length} entries</span>
              <button onClick={()=>setActive(null)} style={{background:"none",border:"none",cursor:"pointer",color:T.textMuted,fontSize:18}}>×</button>
            </div>
            <div style={{padding:"8px 12px",borderBottom:"1px solid "+T.border}}>
              <div style={{display:"flex",gap:6}}>
                <input value={note} onChange={e=>setNote(e.target.value)}
                  onKeyDown={e=>{if(e.key==="Enter"&&note.trim()){dispatch("ADD_NOTE",{jobNo:job.jobNo,note:note.trim(),by:user.name});setNote("");showFlash("📝 Note added");}}}
                  placeholder="Add a note..."
                  style={{flex:1,padding:"7px 12px",background:"#F5F4F0",border:"1px solid "+T.border,
                    borderRadius:8,fontSize:12,color:T.text,outline:"none",fontFamily:T.font}}/>
                <button onClick={()=>{if(note.trim()){dispatch("ADD_NOTE",{jobNo:job.jobNo,note:note.trim(),by:user.name});setNote("");showFlash("📝 Note added");}}}
                  style={{padding:"7px 12px",background:note.trim()?T.green:T.border,color:"#fff",
                    border:"none",borderRadius:8,fontSize:11,fontWeight:600,cursor:"pointer"}}>Add</button>
              </div>
            </div>
            <div style={{maxHeight:"50vh",overflowY:"auto",padding:"4px 12px"}}>
              {(job.timeline||[]).slice().reverse().map((entry,i)=>{
                const isSystem = entry.type==="system"||entry.auto;
                return (
                  <div key={entry.id||i} style={{display:"flex",gap:8,padding:"5px 0",
                    borderBottom:"1px solid "+T.border+"15"}}>
                    <div style={{width:6,height:6,borderRadius:3,marginTop:5,flexShrink:0,
                      background:isSystem?T.textMuted:T.green}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,color:T.text,fontFamily:T.font,lineHeight:1.4}}>{entry.note}</div>
                      <div style={{fontSize:9,color:T.textMuted,marginTop:1}}>
                        {entry.by}{entry.date?" · "+entry.date:""}{entry.time?" "+entry.time:""}
                      </div>
                    </div>
                  </div>
                );
              })}
              {(job.timeline||[]).length===0&&(
                <div style={{padding:"16px 0",textAlign:"center",fontSize:12,color:T.textMuted}}>No activity yet</div>
              )}
            </div>
          </div>
        )}

        {/* Mechanic: service tick list (inline, no card UI) */}
        {isMech && (job.items||[]).length>0 && (
          <div style={{margin:"4px 10px",background:"#F5F4F0",borderRadius:12,border:"1px solid #E5E4DF",padding:"8px 12px"}}>
            <div style={{fontSize:10,fontWeight:700,color:T.textMuted,marginBottom:6,letterSpacing:.5}}>YOUR WORK</div>
            {(job.items||[]).map((c,i)=>{
              const done=(job._servicesDone||[]).includes(i);
              const doneDate = (job._serviceDates||{})[i];
              return(
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:i<job.items.length-1?"1px solid #2A394233":""}}>
                  <button onClick={()=>dispatch("TOGGLE_SERVICE",{jobNo:job.jobNo,idx:i,by:user.name})}
                    style={{width:24,height:24,borderRadius:12,border:"2px solid "+(done?T.green:T.border),background:done?T.green:"transparent",cursor:"pointer",flexShrink:0,color:"#fff",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",padding:0}}>
                    {done?"✓":""}
                  </button>
                  <div style={{flex:1,minWidth:0}}>
                    <span style={{fontSize:13,color:done?T.textMuted:T.text,fontFamily:T.font,fontWeight:done?400:600,textDecoration:done?"line-through":"none"}}>
                      {c.complaint}
                    </span>
                    {done&&doneDate&&<div style={{fontSize:9,color:T.green,marginTop:2}}>✓ {doneDate}</div>}
                  </div>
                </div>
              );
            })}
            {/* Progress */}
            <div style={{marginTop:8,paddingTop:6,borderTop:"1px solid #E5E4DF"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:10,color:T.textMuted}}>Progress</span>
                <span style={{fontSize:10,fontWeight:700,color:T.green}}>{(job._servicesDone||[]).length}/{(job.items||[]).length} done</span>
              </div>
              <div style={{height:4,background:T.border,borderRadius:2,overflow:"hidden"}}>
                <div style={{width:`${(job.items||[]).length>0?(job._servicesDone||[]).length/(job.items||[]).length*100:0}%`,height:"100%",background:T.green,borderRadius:2,transition:"width .3s"}}/>
              </div>
            </div>
          </div>
        )}

        <div ref={endRef}/>
        <div ref={endRef}/>
      </div>

      {/* Input bar */}
      <div style={{background:T.inputBg,flexShrink:0,borderTop:`1px solid ${T.border}`,padding:"8px 10px"}}>
        <div style={{display:"flex",gap:8,alignItems:"flex-end",position:"relative"}}>
          {showPlus&&<PlusMenu job={job} user={user} onAction={handleAction} onClose={()=>setShowPlus(false)}/>}
          {/* + button — only for receptionist & admin */}
          {canManage&&(
            <button onClick={()=>{
                if(active||showNextSvc){setActive(null);setShowNextSvc(false);setShowPlus(false);}
                else setShowPlus(v=>!v);
              }}
              style={{width:42,height:42,borderRadius:21,
                background:(showPlus||active||showNextSvc)?T.green+"cc":"#E5E4DF",
                border:"none",cursor:"pointer",fontSize:20,
                display:"flex",alignItems:"center",justifyContent:"center",
                flexShrink:0,transition:"background .15s",fontWeight:700,
                color:(showPlus||active||showNextSvc)?"#fff":"#1B1B1A"}}>
              {(showPlus||active||showNextSvc)?"×":"+"}
            </button>
          )}
          <div style={{flex:1,background:"#E5E4DF",borderRadius:22,padding:"8px 14px",display:"flex",alignItems:"center"}}>
            <textarea value={note} onChange={e=>setNote(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendNote();}}}
              placeholder={isMech?"Type an update...":"Type a message..."}
              rows={1}
              style={{flex:1,background:"transparent",border:"none",outline:"none",resize:"none",fontSize:13,fontFamily:T.font,color:T.text,lineHeight:1.5,maxHeight:80,overflow:"auto"}}/>
          </div>
          {/* Single green button — mic when empty, send when text */}
          {note.trim() ? (
            <button onClick={sendNote}
              style={{width:42,height:42,borderRadius:21,background:T.green,border:"none",
                cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
                flexShrink:0,boxShadow:"0 2px 6px rgba(59,109,17,.3)"}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ) : (
            <VoiceNote onSend={sendVoice} hasText={false}/>
          )}
        </div>
      </div>
    </div>
  );
}

function MechanicJobCard({ job }) {
  const urgency = () => {
    if (!job.deliveryDate) return null;
    const today = dt();
    if (job.deliveryDate < today) return { label:"OVERDUE", color:"#A32D2D" };
    if (job.deliveryDate === today) return { label:"TODAY", color:"#F59E0B" };
    return null;
  };
  const urg = urgency();
  const checkinSvcs = (job.items||[]).filter(c=>c.fromCheckin);

  return (
    <div style={{margin:"8px 10px 4px",background:"#F5F4F0",borderRadius:14,overflow:"hidden",border:"1px solid #E5E4DF"}}>
      {/* Plate strip */}
      <div style={{background:BRAND_DATA[job.brand]?.bg||"#E5E4DF",padding:"10px 14px",display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:24,flexShrink:0}}>{BRAND_DATA[job.brand]?.icon||"🚗"}</span>
        <div style={{flex:1}}>
          <div style={{fontFamily:T.mono,fontWeight:900,fontSize:20,color:"#fff",letterSpacing:5,lineHeight:1}}>{job.regNo}</div>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.75)",marginTop:2}}>{job.brand} {job.model}</div>
        </div>
        {urg&&(
          <span style={{fontSize:10,fontWeight:800,padding:"3px 9px",borderRadius:20,background:urg.color,color:"#fff",flexShrink:0}}>
            {urg.label}
          </span>
        )}
      </div>
      {/* Quick info */}
      <div style={{padding:"8px 14px",display:"flex",gap:16,flexWrap:"wrap",borderBottom:"1px solid #E5E4DF"}}>
        {job.fuel&&<span style={{fontSize:12,color:T.textMuted}}>⛽ {job.fuel}</span>}
        {job.kms&&<span style={{fontSize:12,color:T.textMuted}}>📏 {job.kms} km</span>}
        {job.deliveryDate&&(
          <span style={{fontSize:12,color:urg?urg.color:T.textMuted,fontWeight:urg?700:400}}>
            📅 {job.deliveryDate}
          </span>
        )}
      </div>
      {/* Work list — the only thing mechanic needs */}
      {checkinSvcs.length > 0 && (
        <div style={{padding:"10px 14px"}}>
          <div style={{fontSize:10,fontWeight:800,color:T.textMuted,letterSpacing:.5,marginBottom:8}}>WORK ORDER</div>
          {checkinSvcs.map((c,i) => {
            const done = (job._servicesDone||[]).includes(i);
            return (
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",
                borderBottom:i<checkinSvcs.length-1?"1px solid #2A394266":"none"}}>
                <div style={{width:22,height:22,borderRadius:11,flexShrink:0,
                  border:`2px solid ${done?T.green:"#E5E4DF"}`,
                  background:done?T.green:"transparent",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  color:"#fff",fontSize:12,fontWeight:700}}>
                  {done?"✓":""}
                </div>
                <span style={{flex:1,fontSize:13,color:done?T.textMuted:T.text,
                  fontFamily:T.font,fontWeight:done?400:600,
                  textDecoration:done?"line-through":"none"}}>
                  {c.complaint}
                </span>
                {done&&<span style={{fontSize:11,color:T.green}}>Done</span>}
              </div>
            );
          })}
          {/* Progress bar */}
          <div style={{marginTop:10}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
              <span style={{fontSize:10,color:T.textMuted}}>Progress</span>
              <span style={{fontSize:10,fontWeight:700,color:T.green}}>
                {(job._servicesDone||[]).length}/{checkinSvcs.length} done
              </span>
            </div>
            <div style={{height:4,background:"#E5E4DF",borderRadius:2,overflow:"hidden"}}>
              <div style={{
                width:`${checkinSvcs.length>0?(job._servicesDone||[]).length/checkinSvcs.length*100:0}%`,
                height:"100%",background:T.green,borderRadius:2,transition:"width .3s"
              }}/>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MechanicChat({ job, user, jobs, dispatch, showFlash, onBack, lang }) {
  const [note, setNote] = useState("");
  const endRef = useRef(null);

  const timelineLen = (job&&job.timeline||[]).length;
  useEffect(()=>{ endRef.current&&endRef.current.scrollIntoView({behavior:"smooth"}); },[timelineLen]);

  if (!job) {
    return (
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
        background:T.chatBg,gap:14,padding:24}}>
        <div style={{fontSize:48}}>💬</div>
        <div style={{fontSize:16,fontWeight:700,color:T.text,fontFamily:T.font,textAlign:"center"}}>No Job Selected</div>
        <div style={{fontSize:13,color:T.textMuted,textAlign:"center",fontFamily:T.font,maxWidth:260}}>
          Tap a job from your list to open the chat.
        </div>
      </div>
    );
  }

  const sm = STATUS_META[job.status]||STATUS_META.open;
  const timeline = (job.timeline||[]).filter(msg => {
    // Hide financial details from mechanic
    const n = msg.note||"";
    if(n.includes("💰")||n.includes("₹")||n.includes("Payment")||n.includes("📲")||n.includes("💸")) return false;
    return true;
  });
  const grouped = timeline.reduce((acc,msg)=>{
    const d=msg.date||dt(); if(!acc[d])acc[d]=[]; acc[d].push(msg); return acc;
  },{});

  const sendNote = () => {
    if(!note.trim()) return;
    dispatch("ADD_NOTE",{jobNo:job.jobNo,note:note.trim(),by:user.name});
    setNote("");
  };

  const camRef = useRef(null);
  const sendPhoto = (file) => {
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const cv = document.createElement("canvas");
        const sc = Math.min(1, 800/Math.max(img.width, img.height));
        cv.width = img.width*sc; cv.height = img.height*sc;
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        const dataUrl = cv.toDataURL("image/jpeg", 0.8);
        dispatch("ADD_NOTE",{jobNo:job.jobNo, note:"📷 Photo", by:user.name, dataUrl});
        showFlash("📷 Photo sent");
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const sendVoice = (v) => {
    const fmtDur=s=>`${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
    dispatch("ADD_NOTE",{jobNo:job.jobNo,note:"🎤 Voice note ("+fmtDur(v.duration)+")",by:user.name,isVoice:true,dataURL:v.dataURL,voiceDur:fmtDur(v.duration)});
  };

  // Quick mark done for a service
  const toggleSvc = (idx) => {
    dispatch("TOGGLE_SERVICE",{jobNo:job.jobNo,idx,by:user.name});
  };

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",background:T.chatBg,height:"100%",overflow:"hidden"}}>
      {/* Header */}
      <div style={{background:"#FFFFFF",padding:"10px 14px",display:"flex",alignItems:"center",gap:10,flexShrink:0,borderBottom:"0.5px solid #E5E4DF"}}>
        <button onClick={onBack}
          style={{background:"none",border:"none",cursor:"pointer",padding:"0 2px",flexShrink:0}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 19l-7-7 7-7" stroke="#1B1B1A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div style={{width:36,height:36,borderRadius:10,background:BRAND_DATA[job.brand]&&BRAND_DATA[job.brand].bg||"#E5E4DF",
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>
          {BRAND_DATA[job.brand]&&BRAND_DATA[job.brand].icon||"🚗"}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:15,fontWeight:700,color:"#1B1B1A",fontFamily:T.mono,letterSpacing:1.5,
            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{job.regNo}</div>
          <div style={{fontSize:11,color:"#888780"}}>
            {job.brand} {job.model} · {sm.icon} {sm.label}
          </div>
        </div>
        {job.status==="open"&&(
          <button onClick={()=>{dispatch("CHANGE_STATUS",{jobNo:job.jobNo,status:"in_progress",by:user.name});showFlash("Started!");}}
            style={{padding:"5px 11px",background:"#E6F1FB",border:"0.5px solid #B5D4F4",
              borderRadius:8,color:"#185FA5",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:T.font,flexShrink:0}}>
            Start
          </button>
        )}
        {job.status==="in_progress"&&(
          <button onClick={()=>{dispatch("CHANGE_STATUS",{jobNo:job.jobNo,status:"completed",by:user.name});showFlash("Marked done!");}}
            style={{padding:"5px 11px",background:"#EAF3DE",border:"0.5px solid #C0DD97",
              borderRadius:8,color:"#3B6D11",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:T.font,flexShrink:0}}>
            Done
          </button>
        )}
      </div>

      {/* Chat scroll */}
      <div style={{flex:1,overflowY:"auto",minHeight:0,backgroundImage:T.chatPattern}}>
        {/* Job card — the "first message" */}
        <MechanicJobCard job={job}/>

        {/* Work items — mechanic can tick */}
        {(job.items||[]).length>0&&(
          <div style={{margin:"4px 10px",background:"#F5F4F0",borderRadius:12,border:"1px solid #E5E4DF",padding:"8px 12px"}}>
            <div style={{fontSize:10,fontWeight:700,color:T.textMuted,marginBottom:6,letterSpacing:.5}}>YOUR WORK</div>
            {(job.items||[]).map((c,i)=>{
              const done=(job._servicesDone||[]).includes(i);
              const doneDate = (job._serviceDates||{})[i];
              return(
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:i<(job.items||[]).length-1?"1px solid #2A394233":""}}>
                  <button onClick={()=>dispatch("TOGGLE_SERVICE",{jobNo:job.jobNo,idx:i,by:user.name})}
                    style={{width:24,height:24,borderRadius:12,border:"2px solid "+(done?T.green:T.border),background:done?T.green:"transparent",cursor:"pointer",flexShrink:0,color:"#fff",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",padding:0}}>
                    {done?"✓":""}
                  </button>
                  <div style={{flex:1,minWidth:0}}>
                    <span style={{fontSize:13,color:done?T.textMuted:T.text,fontFamily:T.font,fontWeight:done?400:600,textDecoration:done?"line-through":"none"}}>
                      {c.complaint}
                    </span>
                    {done&&doneDate&&<div style={{fontSize:9,color:T.green,marginTop:2}}>✓ {doneDate}</div>}
                  </div>
                </div>
              );
            })}
            {/* Parts */}
            {(job._parts||[]).length>0&&(
              <div style={{marginTop:6,paddingTop:6,borderTop:"1px solid #E5E4DF"}}>
                <div style={{fontSize:9,fontWeight:700,color:T.textMuted,marginBottom:4}}>PARTS</div>
                {(job._parts||[]).map((p,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"5px 0"}}>
                    <button onClick={()=>dispatch("TOGGLE_PART",{jobNo:job.jobNo,idx:i,by:user.name})}
                      style={{width:24,height:24,borderRadius:12,border:"2px solid "+(p.done?T.green:T.border),background:p.done?T.green:"transparent",cursor:"pointer",flexShrink:0,color:"#fff",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",padding:0}}>
                      {p.done?"✓":""}
                    </button>
                    <div style={{flex:1,minWidth:0}}>
                      <span style={{fontSize:13,color:p.done?T.textMuted:T.text,fontFamily:T.font,fontWeight:p.done?400:600,textDecoration:p.done?"line-through":"none"}}>
                        {p.name} {p.type==="old"?"(removed)":""}
                      </span>
                      {p.done&&p.doneDate&&<div style={{fontSize:9,color:T.green,marginTop:2}}>✓ {p.doneDate}{p.doneBy?" · "+p.doneBy:""}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Outsourced */}
            {(job.outsourced||[]).length>0&&(
              <div style={{marginTop:6,paddingTop:6,borderTop:"1px solid #E5E4DF"}}>
                <div style={{fontSize:9,fontWeight:700,color:T.textMuted,marginBottom:4}}>OUTSOURCED</div>
                {(job.outsourced||[]).map((o,i)=>{
                  const done=o.status==="received";
                  return(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"5px 0"}}>
                      <button onClick={()=>{if(!done)dispatch("RECV_OUTSOURCE",{jobNo:job.jobNo,idx:i,by:user.name});}}
                        style={{width:24,height:24,borderRadius:12,border:"2px solid "+(done?T.green:T.border),background:done?T.green:"transparent",cursor:done?"default":"pointer",flexShrink:0,color:"#fff",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",padding:0}}>
                        {done?"✓":""}
                      </button>
                      <div style={{flex:1,minWidth:0}}>
                        <span style={{fontSize:13,color:done?T.textMuted:T.text,fontFamily:T.font,textDecoration:done?"line-through":"none"}}>{o.service}</span>
                        {done&&o.receivedDate&&<div style={{fontSize:9,color:T.green,marginTop:2}}>✓ {o.receivedDate}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {/* Progress */}
            {(()=>{
              const svcD=(job._servicesDone||[]).length;
              const partD=(job._parts||[]).filter(p=>p.done).length;
              const outD=(job.outsourced||[]).filter(o=>o.status==="received").length;
              const total=(job.items||[]).length+(job._parts||[]).length+(job.outsourced||[]).length;
              const doneAll=svcD+partD+outD;
              const pct=total>0?Math.round(doneAll/total*100):0;
              return (
                <div style={{marginTop:8,paddingTop:6,borderTop:"1px solid #E5E4DF"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontSize:10,color:T.textMuted}}>Progress</span>
                    <span style={{fontSize:10,fontWeight:700,color:T.green}}>{doneAll}/{total} done</span>
                  </div>
                  <div style={{height:4,background:T.border,borderRadius:2,overflow:"hidden"}}>
                    <div style={{width:pct+"%",height:"100%",background:T.green,borderRadius:2,transition:"width .3s"}}/>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Timeline messages */}
        {Object.entries(grouped).map(([date,msgs])=>(
          <div key={date}>
            <div style={{display:"flex",justifyContent:"center",margin:"6px 0"}}>
              <span style={{background:"#F5F4F0",color:T.textMuted,fontSize:11,padding:"3px 12px",borderRadius:12,fontFamily:T.font}}>{fmtDate(date)}</span>
            </div>
            {msgs.map(msg=>{
              if(msg.type==="system"||msg.auto) return <SystemPill key={msg.id} msg={msg}/>;
              if(msg.isVoice) return <VoiceBubble key={msg.id} msg={msg} isMine={msg.by===user?.name}/>;
              return <MessageBubble key={msg.id} msg={msg} isSent={msg.by===user?.name} userName={user?.name}/>;
            })}
          </div>
        ))}
        <div ref={endRef}/>
      </div>

      {/* Input bar */}
      <div style={{background:T.inputBg,flexShrink:0,borderTop:"1px solid "+T.border,padding:"8px 10px"}}>
        <input ref={camRef} type="file" accept="image/*" capture="environment" style={{display:"none"}}
          onChange={e=>{const f=e.target.files&&e.target.files[0];if(f)sendPhoto(f);e.target.value="";}}/>
        <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
          {/* + button — opens camera */}
          <button onClick={()=>camRef.current&&camRef.current.click()}
            style={{width:42,height:42,borderRadius:21,background:"#E5E4DF",border:"none",cursor:"pointer",
              fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",
              flexShrink:0,fontWeight:700,color:"#1B1B1A"}}>
            +
          </button>
          <div style={{flex:1,background:"#E5E4DF",borderRadius:22,padding:"8px 14px",display:"flex",alignItems:"center"}}>
            <textarea value={note} onChange={e=>setNote(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendNote();}}}
              placeholder="Type a message..."
              rows={1}
              style={{flex:1,background:"transparent",border:"none",outline:"none",resize:"none",
                fontSize:13,fontFamily:T.font,color:T.text,lineHeight:1.5,maxHeight:80,overflow:"auto"}}/>
          </div>
          {/* Mic / Send toggle */}
          {note.trim() ? (
            <button onClick={sendNote}
              style={{width:42,height:42,borderRadius:21,background:T.green,border:"none",
                cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
                flexShrink:0,boxShadow:"0 2px 6px rgba(59,109,17,.3)"}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ) : (
            <VoiceNote onSend={sendVoice} hasText={false}/>
          )}
        </div>
      </div>
    </div>
  );
}


// ---
// PHOTO GRID CARD — 4-slot capture card for check-in, inline in chat
// ---
function PhotoGridCard({ photos, onCapture, onPhotoSet }) {
  const refs = useRef({});
  const sides = ["front","rear","left","right"];
  const labels = {front:"⬆️ Front",rear:"⬇️ Rear",left:"◀️ Left",right:"▶️ Right"};
  const colors = {front:"#1a3a5c",rear:"#2d1a5c",left:"#1a5c2d",right:"#5c3a1a"};
  const cnt = sides.filter(s=>photos[s]).length;
  const [fullscreen, setFullscreen] = useState(null);
  const [annotating, setAnnotating] = useState(null);

  const handleFile = (side, file) => {
    if(!file) return;
    onCapture(side, file);
  };

  const makeSample = (side) => {
    const cv=document.createElement("canvas"); cv.width=400; cv.height=280;
    const ctx=cv.getContext("2d");
    const g=ctx.createLinearGradient(0,0,400,280);
    g.addColorStop(0,colors[side]||"#1a3a5c"); g.addColorStop(1,"#FFFFFF");
    ctx.fillStyle=g; ctx.fillRect(0,0,400,280);
    ctx.fillStyle="rgba(0,0,0,0.06)";
    ctx.beginPath(); ctx.roundRect(60,100,280,100,12); ctx.fill();
    ctx.beginPath(); ctx.roundRect(100,70,200,80,20); ctx.fill();
    [100,300].forEach(x=>{
      ctx.fillStyle="rgba(255,255,255,0.07)";
      ctx.beginPath(); ctx.arc(x,200,30,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle="rgba(255,255,255,0.18)"; ctx.lineWidth=4;
      ctx.beginPath(); ctx.arc(x,200,26,0,Math.PI*2); ctx.stroke();
    });
    ctx.fillStyle="rgba(255,255,255,0.75)"; ctx.font="bold 16px Segoe UI,sans-serif";
    ctx.textAlign="center"; ctx.fillText(labels[side],200,36);
    ctx.font="13px Segoe UI,sans-serif"; ctx.fillStyle="rgba(255,255,255,0.35)";
    ctx.fillText("Sample Photo",200,258);
    onPhotoSet(side, cv.toDataURL("image/jpeg",0.85));
  };

  const removePhoto = (side) => {
    onPhotoSet(side, null);
  };

  // PhotoAnnotator open
  if(annotating && photos[annotating]) {
    return (
      <div style={{margin:"4px 10px 6px"}}>
        <PhotoAnnotator
          photo={photos[annotating]}
          side={labels[annotating]}
          onSave={dataUrl=>{
            onPhotoSet(annotating, dataUrl);
            setAnnotating(null);
          }}
          onClose={()=>setAnnotating(null)}
        />
      </div>
    );
  }

  // Fullscreen overlay
  if(fullscreen && photos[fullscreen]) {
    return (
      <div onClick={()=>setFullscreen(null)}
        style={{position:"fixed",inset:0,background:"rgba(0,0,0,.93)",
          zIndex:9999,display:"flex",flexDirection:"column",
          alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
        <img src={photos[fullscreen]} alt={fullscreen}
          style={{maxWidth:"100%",maxHeight:"72vh",objectFit:"contain",borderRadius:8}}/>
        <div style={{display:"flex",gap:8,marginTop:12}} onClick={e=>e.stopPropagation()}>
          <button onClick={()=>{setFullscreen(null);setAnnotating(fullscreen);}}
            style={{padding:"7px 16px",background:"#F59E0B",border:"none",
              borderRadius:8,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:T.font}}>
            ✏️ Mark Damage
          </button>
          <button onClick={()=>{setFullscreen(null);refs.current[fullscreen]?.click();}}
            style={{padding:"7px 16px",background:"rgba(0,0,0,0.04)",border:"none",
              borderRadius:8,color:"#fff",fontSize:12,cursor:"pointer",fontFamily:T.font}}>
            🔄 Replace
          </button>
          <button onClick={()=>{removePhoto(fullscreen);setFullscreen(null);}}
            style={{padding:"7px 16px",background:"#A32D2D",border:"none",
              borderRadius:8,color:"#fff",fontSize:12,cursor:"pointer",fontFamily:T.font}}>
            🗑️ Remove
          </button>
        </div>
        <div style={{marginTop:10,fontSize:12,color:"rgba(255,255,255,0.55)",fontFamily:T.font}}>
          {labels[fullscreen]} · tap outside to close
        </div>
        {/* Side switcher */}
        <div style={{display:"flex",gap:10,marginTop:10}}>
          {sides.filter(s=>photos[s]).map(s=>(
            <button key={s} onClick={e=>{e.stopPropagation();setFullscreen(s);}}
              style={{padding:"4px 12px",borderRadius:14,border:"none",cursor:"pointer",
                fontFamily:T.font,fontSize:10,fontWeight:600,
                background:fullscreen===s?"#fff":"rgba(0,0,0,0.06)",
                color:fullscreen===s?"#FAFAF8":"#fff"}}>
              {labels[s]}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{margin:"4px 8px 6px"}}>
      <div style={{background:T.recv,borderRadius:12,overflow:"hidden"}}>

        {/* Header */}
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",borderBottom:"1px solid "+T.border}}>
          <span style={{fontSize:16}}>📸</span>
          <span style={{fontSize:14,fontWeight:600,color:T.text,fontFamily:T.font,flex:1}}>
            Vehicle Photos
          </span>
          <span style={{fontSize:12,color:cnt>0?T.green:T.textMuted,fontWeight:600}}>
            {cnt}/4
          </span>
        </div>

        {/* 2×2 Grid */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,padding:"8px 10px"}}>
          {sides.map(side=>(
            <div key={side} style={{position:"relative"}}>
              <input ref={el=>refs.current[side]=el} type="file" accept="image/*"
                style={{display:"none"}}
                onChange={e=>{handleFile(side,e.target.files&&e.target.files[0]);e.target.value="";}}/>

              {photos[side] ? (
                <div style={{position:"relative",borderRadius:10,overflow:"hidden",
                  border:"2px solid "+T.green,height:130}}>
                  <img src={photos[side]} alt={side}
                    onClick={()=>setFullscreen(side)}
                    style={{width:"100%",height:"100%",objectFit:"cover",display:"block",cursor:"pointer"}}/>
                  {/* Action bar */}
                  <div style={{position:"absolute",bottom:0,left:0,right:0,
                    padding:"4px 6px",background:"rgba(0,0,0,0.75)",
                    display:"flex",alignItems:"center",gap:4}}>
                    <span style={{fontSize:10,color:T.green,fontWeight:600,flex:1,fontFamily:T.font}}>
                      {labels[side]} ✓
                    </span>
                    <button onClick={e=>{e.stopPropagation();setAnnotating(side);}}
                      style={{padding:"2px 6px",background:"#F59E0B",border:"none",
                        borderRadius:4,cursor:"pointer",fontSize:10,color:"#fff",fontWeight:600}}>✏️</button>
                    <button onClick={e=>{e.stopPropagation();refs.current[side]?.click();}}
                      style={{padding:"2px 6px",background:T.border,border:"none",
                        borderRadius:4,cursor:"pointer",fontSize:10,color:"#fff"}}>🔄</button>
                    <button onClick={e=>{e.stopPropagation();removePhoto(side);}}
                      style={{padding:"2px 6px",background:"#A32D2D",border:"none",
                        borderRadius:4,cursor:"pointer",fontSize:10,color:"#fff"}}>×</button>
                  </div>
                </div>
              ) : (
                <div style={{height:130,borderRadius:10,border:"1.5px dashed "+T.border,
                  background:"#F5F4F0",overflow:"hidden",display:"flex",flexDirection:"column"}}>
                  <button onClick={()=>refs.current[side]?.click()}
                    style={{flex:1,background:"transparent",border:"none",cursor:"pointer",
                      display:"flex",flexDirection:"column",alignItems:"center",
                      justifyContent:"center",gap:4,borderBottom:"1px solid "+T.border}}>
                    <span style={{fontSize:24,opacity:0.35}}>📷</span>
                    <span style={{fontSize:11,color:T.green,fontWeight:600,fontFamily:T.font}}>
                      {labels[side]}
                    </span>
                    <span style={{fontSize:9,color:T.textMuted}}>Tap to upload</span>
                  </button>
                  <button onClick={()=>makeSample(side)}
                    style={{padding:"5px 0",background:"transparent",border:"none",
                      cursor:"pointer",fontSize:10,color:T.textMuted,fontFamily:T.font,
                      display:"flex",alignItems:"center",justifyContent:"center",gap:3}}>
                    ✨ Sample
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Timestamp */}
        <div style={{fontSize:10,color:T.textMuted,textAlign:"right",padding:"4px 14px 8px"}}>
          {new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true})}
        </div>
      </div>
    </div>
  );
}

// ---
// ---
// SERVICE PICKER CARD — inline in chat for check-in service selection
// Categories, search, add, price, list — all in one card
// ---
function ServicePickerCard({ items, onItemsChange, onDone }) {
  const [activeCat, setActiveCat] = useState((SVC_CATEGORIES[0]||{}).k||"service");
  const [editIdx, setEditIdx] = useState(null);
  const [editPrice, setEditPrice] = useState("");
  const [customName, setCustomName] = useState("");
  const priceRef = useRef(null);

  const added = (items||[]).map(c=>c.complaint);
  const total = (items||[]).reduce((t,c)=>t+(+c.price||0),0);

  const toggle = (name) => {
    if(added.includes(name)){
      onItemsChange((items||[]).filter(c=>c.complaint!==name));
      if(editIdx!==null && items[editIdx]?.complaint===name) setEditIdx(null);
    } else {
      onItemsChange([...(items||[]), {complaint:name, price:0, fromCheckin:true}]);
    }
  };

  const savePrice = () => {
    if(editIdx===null) return;
    onItemsChange(items.map((c,i)=>i===editIdx?{...c,price:+editPrice||0}:c));
    setEditIdx(null); setEditPrice("");
  };

  const activeSvcs = SVC_CATEGORIES.find(c=>c.k===activeCat);

  return (
    <div style={{margin:"4px 8px 6px",background:"#F5F4F0",borderRadius:12,
      overflow:"hidden",display:"flex",flexDirection:"column",maxHeight:"65vh"}}>

      {/* Header — same as belongings */}
      <div style={{padding:"10px 12px",borderBottom:"1px solid #E5E4DF",
        display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
        <span style={{fontSize:15}}>🔧</span>
        <span style={{fontSize:13,fontWeight:600,color:"#1B1B1A",flex:1}}>Services & Complaints</span>
        {items.length>0&&<span style={{fontSize:11,fontWeight:600,color:"#3B6D11",
          background:"#EAF3DE",padding:"2px 8px",borderRadius:10}}>{items.length} selected</span>}
      </div>

      {/* Category tabs */}
      <div style={{padding:"8px 10px",flexShrink:0,display:"flex",gap:4,overflowX:"auto",
        borderBottom:"1px solid #E5E4DF"}}>
        {SVC_CATEGORIES.map(c=>(
          <button key={c.k} onClick={()=>setActiveCat(c.k)}
            style={{padding:"5px 10px",borderRadius:14,cursor:"pointer",fontSize:11,
              fontWeight:activeCat===c.k?600:400,whiteSpace:"nowrap",flexShrink:0,
              border:activeCat===c.k?"1.5px solid #3B6D11":"1.5px solid #E5E4DF",
              background:activeCat===c.k?"#EAF3DE":"#FAFAF8",
              color:activeCat===c.k?"#3B6D11":"#888780"}}>
            {c.l}
          </button>
        ))}
      </div>

      {/* Service toggle pills — SAME style as belongings */}
      <div style={{flex:1,overflowY:"auto",padding:"10px 12px"}}>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {(activeSvcs?.svcs||[]).map(s=>{
            const on = added.includes(s);
            return (
              <button key={s} onClick={()=>toggle(s)}
                style={{padding:"8px 12px",borderRadius:20,cursor:"pointer",fontSize:12,
                  border:on?"1.5px solid #3B6D11":"1.5px solid #E5E4DF",
                  background:on?"#EAF3DE":"#FAFAF8",
                  color:on?"#3B6D11":"#888780",fontWeight:on?600:400,
                  display:"flex",alignItems:"center",gap:5,
                  transition:"all .15s"}}>
                <span style={{fontSize:13}}>{on?"✓":"+"}</span>
                {s}
              </button>
            );
          })}
        </div>

        {/* Custom — simple inline input */}
        <div style={{display:"flex",gap:6,marginTop:10}}>
          <input value={customName} onChange={e=>setCustomName(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"&&customName.trim()){toggle(customName.trim());setCustomName("");}}}
            placeholder="+ Type custom service..."
            style={{flex:1,padding:"8px 12px",background:"#FAFAF8",
              border:"1.5px dashed #E5E4DF",borderRadius:20,
              fontSize:12,color:"#1B1B1A",outline:"none"}}/>
          {customName.trim()&&(
            <button onClick={()=>{toggle(customName.trim());setCustomName("");}}
              style={{padding:"8px 14px",background:"#EAF3DE",color:"#3B6D11",
                border:"1.5px solid #3B6D11",borderRadius:20,
                fontSize:12,fontWeight:600,cursor:"pointer"}}>Add</button>
          )}
        </div>
      </div>

      {/* Selected items with price */}
      {items.length>0&&(
        <div style={{padding:"6px 12px",borderTop:"1px solid #E5E4DF",flexShrink:0,maxHeight:120,overflowY:"auto"}}>
          <div style={{fontSize:9,fontWeight:700,color:"#888780",letterSpacing:.3,marginBottom:4}}>
            SELECTED ({items.length})
          </div>
          {items.map((c,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 0",
              borderBottom:i<items.length-1?"0.5px solid #E5E4DF":"none"}}>
              <span style={{flex:1,fontSize:12,color:"#1B1B1A"}}>{c.complaint}</span>
              {editIdx===i ? (
                <div style={{display:"flex",alignItems:"center",gap:3}}>
                  <span style={{fontSize:11,color:"#888780"}}>₹</span>
                  <input ref={priceRef} value={editPrice}
                    onChange={e=>setEditPrice(e.target.value.replace(/\D/g,""))}
                    onKeyDown={e=>{if(e.key==="Enter") savePrice();}}
                    onBlur={savePrice}
                    type="number" inputMode="numeric"
                    style={{width:50,padding:"3px 6px",border:"1.5px solid #3B6D11",borderRadius:8,
                      fontSize:12,outline:"none",textAlign:"right",background:"#EAF3DE"}}/>
                </div>
              ) : (
                <button onClick={()=>{setEditIdx(i);setEditPrice(String(c.price||""));setTimeout(()=>priceRef.current?.focus(),80);}}
                  style={{background:c.price>0?"#EAF3DE":"#FAFAF8",
                    border:c.price>0?"1.5px solid #3B6D11":"1.5px dashed #E5E4DF",borderRadius:8,
                    padding:"2px 8px",cursor:"pointer",fontSize:11,
                    color:c.price>0?"#3B6D11":"#888780"}}>
                  {c.price>0?"₹"+fmtINR(c.price):"+ ₹"}
                </button>
              )}
              <button onClick={()=>toggle(c.complaint)}
                style={{background:"none",border:"none",cursor:"pointer",color:"#A32D2D",
                  fontSize:13,padding:"0 2px"}}>×</button>
            </div>
          ))}
        </div>
      )}

      {/* Done button — same as belongings */}
      <div style={{padding:"8px 12px",borderTop:"1px solid #E5E4DF",flexShrink:0}}>
        <button onClick={onDone}
          style={{width:"100%",padding:"10px",borderRadius:10,border:"none",cursor:"pointer",
            fontSize:13,fontWeight:700,color:"#fff",
            background:items.length>0?"#3B6D11":"#888780"}}>
          {items.length>0
            ?"✓ Done · "+items.length+" service"+(items.length!==1?"s":"")+(total>0?" · ₹"+fmtINR(total):"")
            :"Skip — No services"}
        </button>
      </div>
    </div>
  );
}

// CHECKIN BOT — Pure WhatsApp-style conversational check-in
// User types in text bar, bot responds. Chips for selections.
// ---
function CheckinBot({ user, jobs, dispatch, onDone, onBack, showFlash, lang }) {
  const [msgs, setMsgs] = useState([]);
  const [phase, setPhase] = useState("init");
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const startListening = () => {
    try {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if(!SR) { showFlash("🎤 Speech not supported in this browser"); return; }
      const rec = new SR();
      rec.lang = "en-IN";
      rec.continuous = false;
      rec.interimResults = true;
      let finalText = "";
      rec.onresult = (e) => {
        let interim = "";
        for(let i = e.resultIndex; i < e.results.length; i++){
          const t = e.results[i][0].transcript;
          if(e.results[i].isFinal){ finalText += t; }
          else { interim = t; }
        }
        setInput(prev => {
          const base = prev.replace(/ ?\[.*\]$/, "");
          if(finalText) return (base ? base + " " : "") + finalText;
          if(interim) return (base ? base + " " : "") + "[" + interim + "]";
          return base;
        });
      };
      rec.onerror = (e) => { 
        setListening(false);
        if(e.error==="not-allowed") showFlash("🎤 Mic access denied");
        else showFlash("🎤 " + (e.error||"Error"));
      };
      rec.onend = () => {
        setListening(false);
        setInput(prev => prev.replace(/ ?\[.*\]$/, ""));
      };
      rec.start();
      recognitionRef.current = rec;
      setListening(true);
      showFlash("🎤 Listening...");
    } catch(e) {
      showFlash("🎤 Speech not available");
      setListening(false);
    }
  };
  const stopListening = () => {
    if(recognitionRef.current) { try{ recognitionRef.current.stop(); }catch(e){} }
    setListening(false);
  };
  const [subPhase, setSubPhase] = useState(null); // for multi-step phases like photos, services
  const [showBotMenu, setShowBotMenu] = useState(false);
  const [editStep, setEditStep] = useState(null);
  const [editVal, setEditVal] = useState("");
  const editInputRef = useRef(null);

  // Collected data
  const [data, setData] = useState({
    regNo:"", name:"", phone:"", brand:"", model:"",
    photos:{front:null,rear:null,left:null,right:null},
    fuel:"", kms:"", deliveryDate:"", assignedTo:null,
    items:[], belongings:{}, _suggestedServices:[],
    _payAmount:0, _payMethod:"",
  });

  const endRef = useRef(null);
  const inputRef = useRef(null);
  const dataRef = useRef(data);
  useEffect(()=>{dataRef.current=data;},[data]);

  useEffect(()=>{
    endRef.current&&endRef.current.scrollIntoView({behavior:"smooth"});
  },[msgs.length, phase, subPhase]);

  // Focus input when phase changes to a text-input phase
  useEffect(()=>{
    if(["plate","name","phone","kms","pay_custom"].includes(phase)){
      setTimeout(()=>inputRef.current?.focus(),150);
    }
  },[phase]);

  // Kick off on mount or restart
  const initDone = useRef(false);
  useEffect(()=>{
    if(phase==="init"&&msgs.length===0){
      setTimeout(()=>{
        addBot("🚗 *"+_t("vehicleNumber",lang)+"*");
        setPhase("plate");
      }, initDone.current?300:0);
      initDone.current=true;
    }
  },[phase, msgs.length]);

  const addBot = (text, extra) => setMsgs(m=>[...m,{from:"bot",text,time:tm(),...extra}]);
  const addUser = (text, extra) => setMsgs(m=>[...m,{from:"user",text,time:tm(),...extra}]);

  // Build summary and go to confirm phase
  const goToSummary = () => {
    const d = dataRef.current;
    const total = d.items.reduce((t,c)=>t+(+c.price||0),0);
    const mechName = d.assignedTo ? (MECHANICS.find(mm=>mm.id===d.assignedTo)?.name||"Assigned") : null;
    // Add a special summary message
    setMsgs(m=>[...m, {from:"bot", type:"summary", time:tm(),
      summary:{
        regNo:d.regNo, name:d.name, phone:d.phone,
        brand:d.brand, model:d.model, fuel:d.fuel, kms:d.kms,
        deliveryDate:d.deliveryDate, mechanic:mechName,
        items:d.items, total, belongings:d.belongings,
        payAmount:d._payAmount, payMethod:d._payMethod,
      }
    }]);
    setPhase("confirm");
  };

  // Format plate
  // Format Indian number plate live while typing
  // Standard: TN 37 EV 8900 | BH: 22 BH 1234 AB | Old: TN 01 A 1234
  const fmtPlate = (raw) => {
    const s = raw.replace(/\s/g,"").toUpperCase().slice(0,13);
    if(!s) return "";
    if(/^\d{2}BH/i.test(s)){
      return s.replace(/^(\d{2})(BH)(\d{0,4})([A-Z]{0,2})$/i,(_,a,b,c,d)=>[a,b,c,d].filter(Boolean).join(" "));
    }
    // Match: STATE(1-2 letters) + DISTRICT(1-2 digits) + SERIES(0-3 letters) + NUMBER(1-4 digits)
    const m = s.match(/^([A-Z]{1,2})(\d{1,2})([A-Z]{0,3})(\d{0,4})$/);
    if(m) return [m[1],m[2],m[3],m[4]].filter(Boolean).join(" ");
    return s;
  };

  // ── Send handler (text bar) ──
  const handleSendText = (text) => {
    const prev = input;
    setInput(text);
    setTimeout(()=>{
      setInput("");
      // Simulate send with this text
      const val = text.trim();
      if(!val) return;
      // Re-run the phase logic
      switch(phase) {
        case "name": {
          const isYes = /^(yes|y|yeah|yep|ok|same|ha|haa|aam)$/i.test(val);
          if(isYes && data.name) {
            addUser("Yes — "+data.name);
            setTimeout(()=>{
              if(data.phone) {
                addBot("📱 *"+_t("samePhone",lang)+"*");
                setPhase("phone");
              } else {
                addBot("📱 *"+_t("phoneNumber",lang)+"*");
                setPhase("phone");
              }
            },300);
          }
          break;
        }
        case "phone": {
          const isYes = /^(yes|y|yeah|yep|ok|same|ha|haa|aam)$/i.test(val);
          if(isYes && data.phone) {
            addUser("Yes — "+data.phone);
            setTimeout(()=>{
              if(data.brand) {
                addBot("🚘 *"+data.brand+" "+data.model+"* — same");
                setSubPhase("suggest_brand");
              } else {
                addBot("🚘 *"+_t("vehicleBrand",lang)+"*");
              }
              setPhase("brand");
            },300);
          }
          break;
        }
        default: break;
      }
    },0);
  };

  const handleSend = () => {
    const val = input.trim();
    if(!val) return;
    setInput("");

    switch(phase) {
      case "plate": {
        const plate = fmtPlate(val.replace(/[^A-Za-z0-9\s]/g,"")).toUpperCase();
        const raw = plate.replace(/\s/g,"");
        // Validate Indian plate format
        // Standard: XX 00 XX 0000 (state + district + series + number)
        // BH: 00 BH 0000 XX
        // Old: XX 00 X 0000
        const isValid = /^\d{2}BH\d{1,4}[A-Z]{0,2}$/.test(raw) ||
                         /^[A-Z]{2}\d{2}[A-Z]{1,3}\d{1,4}$/.test(raw);
        if(!isValid) {
          const msg = {
            en:"⚠️ Invalid plate. Format: TN 37 AB 1234",
            ta:"⚠️ தவறான எண். உதாரணம்: TN 37 AB 1234",
            hi:"⚠️ अमान्य नंबर। उदाहरण: TN 37 AB 1234"
          };
          addBot((msg[lang]||msg.en));
          return;
        }
        addUser(plate, {type:"plate"});
        setData(d=>({...d,regNo:plate}));

        // Check for returning customer
        const norm = plate.replace(/\s/g,"").toUpperCase();
        const past = jobs.filter(j=>j.regNo.replace(/\s/g,"").toUpperCase()===norm).sort((a,b)=>b.jobNo-a.jobNo);
        if(past.length>0){
          const last = past[0];
          const dues = past.reduce((s,j)=>{const p=(j.payments||[]).reduce((t,pp)=>t+pp.amount,0);return s+Math.max(0,(j.totalAmount||0)-p);},0);
          let note = `🔁 *Returning customer!* ${past.length} past visit${past.length!==1?"s":""}.\n\nLast: #${last.jobNo} · ${last.brand} ${last.model} · ${fmtDate(last.date)}`;
          if(last.remarks) note += `\n📝 _${last.remarks}_`;
          const nextSvcs = last._nextVisitServices||[];
          if(nextSvcs.length>0) note += `\n🔧 _Noted: ${nextSvcs.join(", ")}_`;
          if(dues>0) note += `\n⚠️ *Pending dues: ₹${fmtINR(dues)}*`;
          setTimeout(()=>addBot(note),300);
          setData(d=>({...d, name:last.name||"", phone:last.phone||"", brand:last.brand||"", model:last.model||"",
            _suggestedServices:nextSvcs}));
          setTimeout(()=>addBot("*"+last.name+"* · "+last.phone+"\n"+_t("sameCustomer",lang)),800);
        } else {
          setTimeout(()=>addBot("👤 *"+_t("customerName",lang)+"*"),300);
        }
        setPhase("name");
        break;
      }
      case "name": {
        const isYes = /^(yes|y|yeah|yep|ok|same|ha|haa|aam)$/i.test(val);
        if(isYes && data.name) {
          addUser("Yes — "+data.name);
          setTimeout(()=>{
            if(data.phone) {
              addBot("📱 *"+_t("samePhone",lang)+"*");
              setPhase("phone");
            } else {
              addBot("📱 *"+_t("phoneNumber",lang)+"*");
              setPhase("phone");
            }
          },300);
        } else {
          if(val.length<2) { addBot("⚠️ "+_t("nameShort",lang)); return; }
          addUser(val);
          setData(d=>({...d,name:val}));
          setTimeout(()=>addBot("📱 *"+_t("phoneNumber",lang)+"*"),300);
          setPhase("phone");
        }
        break;
      }
      case "phone": {
        const isYes = /^(yes|y|yeah|yep|ok|same|ha|haa|aam)$/i.test(val);
        if(isYes && data.phone) {
          addUser("Yes — "+data.phone);
        } else {
          const digits = val.replace(/\D/g,"");
          if(digits.length!==10) { addBot("⚠️ "+_t("need10",lang)); return; }
          addUser(digits);
          setData(d=>({...d,phone:digits}));
        }
        setTimeout(()=>{
          if(data.brand) {
            addBot("🚘 *"+data.brand+" "+data.model+"* — same");
            setSubPhase("suggest_brand");
          } else {
            addBot("🚘 *"+_t("vehicleBrand",lang)+"*");
          }
          setPhase("brand");
        },300);
        break;
      }
      case "kms": {
        if(/^(skip|no|nah|na)$/i.test(val)){
          addUser(_t("skipped",lang));
        } else {
          const km = val.replace(/\D/g,"");
          if(!km) { addBot("⚠️ "+_t("numOrSkip",lang)); return; }
          addUser(km+" km");
          setData(d=>({...d,kms:km}));
        }
        setTimeout(()=>{addBot("📅 *"+_t("deliveryDate",lang)+"*"); setPhase("delivery");},300);
        break;
      }
      case "pay_custom": {
        const amt = +val.replace(/[^\d]/g,"");
        if(!amt || amt<=0) { addBot("⚠️ "+_t("invalidAmt",lang)); return; }
        addUser("₹"+fmtINR(amt)+" advance");
        setData(d=>({...d,_payAmount:amt}));
        setTimeout(()=>{addBot("💳 *"+_t("paymentMode",lang)+"*");setPhase("pay_method");},300);
        break;
      }
      case "model_custom": {
        if(val.length<1) { addBot("⚠️ "+_t("typeModel",lang)); return; }
        handleChip("model", val);
        break;
      }
      default: break;
    }
  };

  // ── Chip tap handler ──
  const handleChip = (type, value) => {
    switch(type) {
      case "brand": {
        const bd = BRAND_DATA[value]||{icon:"🚗"};
        addUser(bd.icon+" "+value);
        setData(d=>({...d, brand:value, model:""}));
        setTimeout(()=>addBot("*"+value+"* model"),300);
        setPhase("model");
        break;
      }
      case "same_brand": {
        addUser(BRAND_DATA[data.brand]?.icon+" "+data.brand+" "+data.model+" (same)");
        setTimeout(()=>{addBot("📸 *"+_t("vehiclePhotos",lang)+"*");setPhase("photos");},300);
        break;
      }
      case "model": {
        addUser(value);
        setData(d=>({...d, model:value}));
        setTimeout(()=>{addBot("📸 *"+_t("vehiclePhotos",lang)+"*");setPhase("photos");},300);
        break;
      }
      case "photo_done": {
        const cnt = Object.values(data.photos).filter(Boolean).length;
        addUser("📸 "+cnt+" photo"+(cnt!==1?"s":"")+" captured");
        setTimeout(()=>{addBot("⛽ *"+_t("fuelLevel",lang)+"*");setPhase("fuel");},300);
        break;
      }
      case "fuel": {
        addUser("⛽ "+value);
        setData(d=>({...d,fuel:value}));
        setTimeout(()=>{addBot("📏 *"+_t("kmReading",lang)+"*");setPhase("kms");},300);
        break;
      }
      case "delivery": {
        if(value==="skip"){
          addUser(_t("noDelivery",lang));
        } else {
          const d2=new Date();d2.setDate(d2.getDate()+parseInt(value));
          const dateStr=d2.toISOString().split("T")[0];
          const labels={0:"Today",1:"Tomorrow",2:"2 days",3:"3 days",5:"5 days",7:"1 week"};
          addUser("📅 "+(labels[value]||value+" days")+" ("+dateStr+")");
          setData(d=>({...d,deliveryDate:dateStr}));
        }
        setTimeout(()=>{addBot("🧰 *"+_t("customerBelongings",lang)+"*");setPhase("belongings");},300);
        break;
      }
      case "mechanic": {
        // kept for backward compat but skipped in flow
        if(value==="none"){
          addUser(_t("notAssigned",lang));
        } else {
          const m = MECHANICS.find(mm=>mm.id===+value);
          addUser(m?m.avatar+" "+m.name:"Mechanic #"+value);
          setData(d=>({...d,assignedTo:+value}));
        }
        setTimeout(()=>{addBot("🧰 *"+_t("customerBelongings",lang)+"*");setPhase("belongings");},300);
        break;
      }
      case "belongings_done": {
        const count = Object.values(data.belongings).filter(v=>v===true||v>0).length;
        addUser("🧰 "+count+" items checked");
        setTimeout(()=>{
          // Auto-add suggested services from last visit
          if(data._suggestedServices&&data._suggestedServices.length>0){
            const newItems = data._suggestedServices.map(s=>({complaint:s,price:0,fromCheckin:true,suggested:true}));
            setData(d=>({...d,items:[...d.items,...newItems]}));
            addBot("🔧 *Services*\n"+data._suggestedServices.length+" from last visit added");
          } else {
            addBot("🔧 *"+_t("services",lang)+"*");
          }
          setPhase("services");
        },300);
        break;
      }
      case "services_done": {
        const total = data.items.reduce((t,c)=>t+(+c.price||0),0);
        addUser("🔧 "+data.items.length+" service"+(data.items.length!==1?"s":"")+(total>0?" · ₹"+fmtINR(total):"")+" added");
        setTimeout(()=>{
          addBot("💰 *"+_t("advancePayment",lang)+"*"+(total>0?"\nEstimate: ₹"+fmtINR(total):""));
          setPhase("payment");
        },400);
        break;
      }
      case "pay_amount": {
        const total = data.items.reduce((t,c)=>t+(+c.price||0),0);
        const amt = value==="full"?total:value==="half"?Math.round(total/2):+value;
        addUser("₹"+fmtINR(amt)+" advance");
        setData(d=>({...d,_payAmount:amt}));
        setTimeout(()=>{addBot("💳 *"+_t("paymentMode",lang)+"*");setPhase("pay_method");},300);
        break;
      }
      case "pay_skip": {
        addUser(_t("noAdvance",lang));
        setData(d=>({...d,_payAmount:0,_payMethod:""}));
        setTimeout(()=>goToSummary(),400);
        break;
      }
      case "pay_method": {
        addUser((value==="CASH"?"💵":value==="UPI"?"📱":"💳")+" "+value);
        setData(d=>({...d,_payMethod:value}));
        setTimeout(()=>goToSummary(),400);
        break;
      }
      case "confirm_yes": {
        addUser("✅ "+_t("confirmed",lang));
        // Create the job
        const total = data.items.reduce((t,c)=>t+(+c.price||0),0);
        const jobNo = Math.max(...jobs.map(j=>j.jobNo), 1000) + 1;
        const payments = data._payAmount>0 ? [{id:Date.now(),amount:data._payAmount,method:data._payMethod,date:dt(),time:tm(),by:user.name}] : [];
        dispatch("ADD_JOB", {
          jobNo, name:data.name.trim(), phone:data.phone.trim(),
          regNo:data.regNo.toUpperCase(), brand:data.brand, model:data.model,
          kms:data.kms, fuel:data.fuel, date:dt(), status:"open", assignedTo:data.assignedTo,
          items:data.items.map(c=>({...c,fromCheckin:true})),
          outsourced:[], _parts:[],
          _servicesDone:[], _serviceDates:{}, _washDone:false, _testDriveDone:false, _qcPassed:false, _custNotified:false,
          payments, totalAmount:total,
          photos:{...data.photos}, damageNotes:"", deliveryDate:data.deliveryDate, belongings:{...data.belongings},
          timeline:[
            {id:newMsgId(),date:dt(),time:tm(),note:`Vehicle checked in by ${user.name}`,auto:true,by:"System",type:"system"},
            ...(data.assignedTo?[{id:newMsgId(),date:dt(),time:tm(),note:`👨‍🔧 Assigned to ${MECHANICS.find(m=>m.id===data.assignedTo)?.name}`,auto:true,by:"System",type:"system"}]:[]),
            ...(data._payAmount>0?[{id:newMsgId(),date:dt(),time:tm(),note:`💰 Advance ₹${fmtINR(data._payAmount)} received (${data._payMethod})`,auto:true,by:"System",type:"system"}]:[]),
          ],
        });
        showFlash("✅ "+_t("checkedIn",lang));
        setTimeout(()=>{
          addBot("✅ *Job #"+jobNo+" "+_t("jobCreated",lang)+"*");
          setTimeout(()=>onDone(jobNo),1500);
        },400);
        setPhase("done");
        break;
      }
      case "confirm_restart": {
        addUser("✏️ "+_t("startOver",lang));
        setMsgs([]);
        setData({regNo:"",name:"",phone:"",brand:"",model:"",photos:{front:null,rear:null,left:null,right:null},fuel:"",kms:"",deliveryDate:"",assignedTo:null,items:[],_payAmount:0,_payMethod:""});
        setPhase("init");
        setTimeout(()=>{addBot("🚗 *"+_t("vehicleNumber",lang)+"*");setPhase("plate");},300);
        break;
      }
      default: break;
    }
  };

  // ── Photo capture handler (called by PhotoGridCard) ──
  const handlePhotoCapture = (side, file) => {
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const cv = document.createElement("canvas");
        const sc = Math.min(1, 1200/Math.max(img.width,img.height));
        cv.width=img.width*sc; cv.height=img.height*sc;
        cv.getContext("2d").drawImage(img,0,0,cv.width,cv.height);
        const dataUrl = cv.toDataURL("image/jpeg",0.82);
        setData(d=>({...d,photos:{...d.photos,[side]:dataUrl}}));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  // ── Render chips based on current phase ──
  const renderChips = () => {
    const chipStyle = (selected) => ({
      padding:"7px 16px",borderRadius:20,cursor:"pointer",fontSize:13,fontWeight:selected?600:400,
      border:selected?`1px solid ${T.green}`:`1px solid ${T.border}`,
      background:selected?"#00A88422":T.sidebarHeader,
      color:selected?T.green:T.text,
      fontFamily:T.font,flexShrink:0,whiteSpace:"nowrap",
    });

    switch(phase) {
      case "name":
        if(data.name) return (
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            <button onClick={()=>{handleSendText("yes");}}
              style={{...chipStyle(true),background:"#00A88422",border:"1px solid "+T.green}}>
              ✓ {data.name}
            </button>
          </div>
        );
        return null;
      case "phone":
        if(data.phone) return (
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            <button onClick={()=>{handleSendText("yes");}}
              style={{...chipStyle(true),background:"#00A88422",border:"1px solid "+T.green}}>
              ✓ {data.phone}
            </button>
          </div>
        );
        return null;
      case "brand":
        return (
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {subPhase==="suggest_brand" && data.brand && (
              <button onClick={()=>handleChip("same_brand",data.brand)}
                style={{...chipStyle(true),padding:"8px 14px",background:"#00A88422",border:"1px solid "+T.green}}>
                {data.brand} {data.model} — same vehicle ✓
              </button>
            )}
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {BRANDS.map(b=>
                <button key={b} onClick={()=>handleChip("brand",b)} style={chipStyle(false)}>{b}</button>
              )}
            </div>
          </div>
        );
      case "model": {
        const models = BRAND_MODELS[data.brand]||[];
        return (
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {models.map(m=>
                <button key={m} onClick={()=>handleChip("model",m)} style={chipStyle(false)}>{m}</button>
              )}
              <button onClick={()=>setPhase("model_custom")}
                style={{...chipStyle(false),border:"1px dashed "+T.border,color:T.textMuted}}>Other ✏️</button>
            </div>
            {models.length===0&&(
              <div style={{fontSize:12,color:T.textMuted,fontFamily:T.font}}>No models listed — type below or tap Other ✏️</div>
            )}
          </div>
        );
      }
      case "model_custom":
        return null;
      case "photos":
        return (
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>handleChip("photo_done")}
              style={{...chipStyle(true),padding:"8px 20px",background:T.green,color:"#fff",border:"none",fontWeight:700}}>
              {Object.values(data.photos).filter(Boolean).length>0
                ?"Continue with "+Object.values(data.photos).filter(Boolean).length+" photo"+(Object.values(data.photos).filter(Boolean).length!==1?"s":"")+" →"
                :"Skip Photos →"}
            </button>
          </div>
        );
      case "fuel":
        return (
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {FUELS.map(f=>
              <button key={f.v} onClick={()=>handleChip("fuel",f.v)} style={chipStyle(false)}>{f.l}</button>
            )}
          </div>
        );
      case "delivery":
        return (
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            {[{l:"Today",d:"0"},{l:"Tomorrow",d:"1"},{l:"2 days",d:"2"},{l:"3 days",d:"3"},{l:"5 days",d:"5"},{l:"1 week",d:"7"}].map(x=>
              <button key={x.d} onClick={()=>handleChip("delivery",x.d)} style={chipStyle(false)}>{x.l}</button>
            )}
            <button onClick={()=>handleChip("delivery","skip")} style={{...chipStyle(false),color:T.textMuted}}>Skip</button>
          </div>
        );
      case "mechanic":
        return (
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            <button onClick={()=>handleChip("mechanic","none")} style={chipStyle(false)}>None</button>
            {MECHANICS.map(m=>
              <button key={m.id} onClick={()=>handleChip("mechanic",String(m.id))} style={chipStyle(false)}>{m.avatar} {m.name}</button>
            )}
          </div>
        );
      case "belongings": {
        const bCount = Object.values(data.belongings).filter(v=>v===true||v>0).length;
        const toggles = BELONGS.filter(b=>!b.qty);
        const qtys = BELONGS.filter(b=>b.qty);
        const icons = {stepney:"🛞",jack:"🔧",jackLever:"🔩",spanner:"🔧",thread:"🧵",toolkit:"🧰",firstAid:"🩹",docs:"📄",mats:"🟫",wheelCup:"⭕",keys:"🔑"};
        return (
          <div style={{background:"#fff",borderRadius:14,border:"1px solid #E5E4DF",overflow:"hidden",
            boxShadow:"0 2px 8px rgba(0,0,0,.04)"}}>
            {/* Header */}
            <div style={{padding:"10px 14px",borderBottom:"1px solid #F1EFE8",display:"flex",
              alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:12,fontWeight:600,color:"#1B1B1A"}}>Select items in vehicle</span>
              {bCount>0&&<span style={{fontSize:10,color:"#3B6D11",fontWeight:700,
                background:"#EAF3DE",padding:"2px 8px",borderRadius:10}}>{bCount} selected</span>}
            </div>

            {/* Toggle items */}
            <div style={{padding:"10px 12px",display:"flex",flexWrap:"wrap",gap:6}}>
              {toggles.map(b=>{
                const on = !!data.belongings[b.k];
                return (
                  <button key={b.k} onClick={()=>setData(d=>({...d,belongings:{...d.belongings,[b.k]:!d.belongings[b.k]}}))}
                    style={{padding:"8px 12px",borderRadius:20,cursor:"pointer",fontSize:12,
                      border:on?"1.5px solid #3B6D11":"1.5px solid #E5E4DF",
                      background:on?"#EAF3DE":"#FAFAF8",
                      color:on?"#3B6D11":"#888780",fontWeight:on?600:400,
                      display:"flex",alignItems:"center",gap:5,
                      transition:"all .15s"}}>
                    <span style={{fontSize:13}}>{on?"✓":icons[b.k]||"•"}</span>
                    {b.l}
                  </button>
                );
              })}
            </div>

            {/* Quantity items */}
            <div style={{padding:"4px 12px 10px",display:"flex",gap:6}}>
              {qtys.map(b=>{
                const cur = data.belongings[b.k]||0;
                return (
                  <div key={b.k} style={{flex:1,borderRadius:12,overflow:"hidden",
                    border:cur>0?"1.5px solid #3B6D11":"1.5px solid #E5E4DF",
                    background:cur>0?"#EAF3DE":"#FAFAF8"}}>
                    <div style={{fontSize:10,textAlign:"center",padding:"4px 0 2px",
                      color:cur>0?"#3B6D11":"#888780",fontWeight:600}}>
                      {icons[b.k]||"•"} {b.l}
                    </div>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <button onClick={()=>setData(d=>({...d,belongings:{...d.belongings,[b.k]:Math.max(0,cur-1)}}))}
                        style={{background:"none",border:"none",color:cur>0?"#3B6D11":"#C5C4BF",
                          fontSize:18,cursor:"pointer",padding:"2px 10px",fontWeight:700}}>−</button>
                      <span style={{fontSize:16,fontWeight:700,width:24,textAlign:"center",
                        color:cur>0?"#3B6D11":"#C5C4BF"}}>{cur}</span>
                      <button onClick={()=>setData(d=>({...d,belongings:{...d.belongings,[b.k]:Math.min(b.max||4,cur+1)}}))}
                        style={{background:"none",border:"none",color:cur>0?"#3B6D11":"#888780",
                          fontSize:18,cursor:"pointer",padding:"2px 10px",fontWeight:700}}>+</button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Done / Skip */}
            <button onClick={()=>handleChip("belongings_done")}
              style={{width:"100%",padding:"12px",border:"none",cursor:"pointer",
                fontSize:13,fontWeight:700,color:"#fff",
                borderRadius:"0 0 14px 14px",
                background:bCount>0?"#3B6D11":"#888780"}}>
              {bCount>0?"✓ Done · "+bCount+" item"+(bCount!==1?"s":"")+" selected":"Skip — No belongings"}
            </button>
          </div>
        );
      }
      case "payment": {
        const total = data.items.reduce((t,c)=>t+(+c.price||0),0);
        const half = Math.round(total/2);
        return (
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {total>0&&(
              <button onClick={()=>handleChip("pay_amount","full")}
                style={{...chipStyle(false),background:"rgba(0,168,132,0.15)",border:"1.5px solid #00A884",color:"#3B6D11",fontWeight:600}}>
                Full ₹{fmtINR(total)}
              </button>
            )}
            {half>0&&half!==total&&<button onClick={()=>handleChip("pay_amount","half")} style={chipStyle(false)}>Half ₹{fmtINR(half)}</button>}
            {total>1000&&<button onClick={()=>handleChip("pay_amount","1000")} style={chipStyle(false)}>₹1,000</button>}
            {total>500&&<button onClick={()=>handleChip("pay_amount","500")} style={chipStyle(false)}>₹500</button>}
            <button onClick={()=>handleChip("pay_amount","2000")} style={chipStyle(false)}>₹2,000</button>
            <button onClick={()=>handleChip("pay_amount","5000")} style={chipStyle(false)}>₹5,000</button>
            <button onClick={()=>{setPhase("pay_custom");}} style={{...chipStyle(false),borderStyle:"dashed",border:"1px dashed "+T.border}}>
              ✏️ Custom
            </button>
            <button onClick={()=>handleChip("pay_skip")} style={{...chipStyle(false),color:T.textMuted}}>
              No Payment
            </button>
          </div>
        );
      }
      case "pay_method":
        return (
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>handleChip("pay_method","CASH")}
              style={{...chipStyle(false),display:"flex",alignItems:"center",gap:4}}>💵 Cash</button>
            <button onClick={()=>handleChip("pay_method","UPI")}
              style={{...chipStyle(false),display:"flex",alignItems:"center",gap:4}}>📱 UPI</button>
            <button onClick={()=>handleChip("pay_method","CARD")}
              style={{...chipStyle(false),display:"flex",alignItems:"center",gap:4}}>💳 Card</button>
          </div>
        );
      case "confirm":
        return (
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>handleChip("confirm_yes")}
              style={{...chipStyle(true),padding:"10px 24px",background:T.green,color:"#fff",border:"none",fontWeight:700,fontSize:14}}>
              ✅ Confirm Check-In
            </button>
            <button onClick={()=>handleChip("confirm_restart")} style={{...chipStyle(false),color:T.textMuted}}>
              ✏️ Start Over
            </button>
          </div>
        );
      default: return null;
    }
  };

  // ── Determine if text input should be active ──
  const isTextPhase = ["plate","name","phone","kms","pay_custom","model_custom"].includes(phase);
  const placeholder = {
    plate:"Type here...",
    name:"Type customer name...",
    phone:"Type 10-digit phone...",
    kms:"Type km reading or 'skip'...",
    pay_custom:"Type amount...",
    model_custom:"Type model name...",
  }[phase] || "";

  // Progress calculation
  const phases = ["plate","name","phone","brand","model","photos","fuel","kms","delivery","mechanic","belongings","services","payment","confirm"];
  const curIdx = phases.indexOf(phase);
  const stepsCompleted = phase==="done"?phases.length:(curIdx>=0?curIdx:0);

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",background:T.chatBg,height:"100%",overflow:"hidden"}}>

      {/* Header */}
      <div style={{background:"#FFFFFF",flexShrink:0,borderBottom:"0.5px solid #E5E4DF"}}>
        <div style={{padding:"10px 14px",display:"flex",alignItems:"center",gap:8}}>
          <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",padding:"0 2px",flexShrink:0}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 19l-7-7 7-7" stroke="#1B1B1A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <div style={{width:32,height:32,borderRadius:8,background:"#EAF3DE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>🤖</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:600,color:"#1B1B1A",whiteSpace:"nowrap"}}>Check-in Bot</div>
            <div style={{fontSize:10,color:"#888780"}}>{stepsCompleted}/{phases.length} steps</div>
          </div>
          {phase!=="init"&&phase!=="done"&&(
            <button onClick={()=>{
              setMsgs([]);setPhase("init");setInput("");setSubPhase(null);
              setData({regNo:"",name:"",phone:"",brand:"",model:"",
                photos:{front:null,rear:null,left:null,right:null},
                fuel:"",kms:"",deliveryDate:"",assignedTo:null,
                items:[],belongings:{},_suggestedServices:[],_payAmount:0,_payMethod:""});
              showFlash("🔄 Restarted");
            }}
              style={{padding:"4px 8px",borderRadius:6,border:"1px solid #E5E4DF",
                background:"#F5F4F0",cursor:"pointer",fontSize:10,fontWeight:600,
                color:"#888780",flexShrink:0}}>
              🔄
            </button>
          )}
        </div>
        {/* Progress bar — full width thin line */}
        <div style={{height:3,background:"#E5E4DF",display:"flex"}}>
          <div style={{width:Math.round(stepsCompleted/phases.length*100)+"%",height:"100%",
            background:"#3B6D11",borderRadius:"0 2px 2px 0",transition:"width .3s"}}/>
        </div>
      </div>

      {/* Daily Tamil quote — title bar */}
      {(()=>{
        const doy=Math.floor((Date.now()-new Date(new Date().getFullYear(),0,0))/86400000);
        return (
          <div style={{background:"#EAF3DE",padding:"8px 14px",borderBottom:"1px solid #C8E0B0",
            textAlign:"center",flexShrink:0}}>
            <div style={{fontSize:12,color:"#27500A",fontFamily:T.font,fontStyle:"italic",lineHeight:1.4}}>
              📜 {TAMIL_QUOTES[doy%TAMIL_QUOTES.length]}
            </div>
          </div>
        );
      })()}

      {/* Chat area */}
      <div style={{flex:1,overflowY:"auto",minHeight:0,padding:"4px 0 0",
        backgroundImage:T.chatPattern}}>

        {msgs.map((msg,i)=>{
          const isBot = msg.from==="bot";
          const isPlate = msg.type==="plate";

          // ── WhatsApp text formatting ──
          const renderWA = (text) => (text||"").split(/(\*[^*]+\*|_[^_]+_)/g).map((part,j)=>
            part.startsWith("*")&&part.endsWith("*")
              ? <strong key={j}>{part.slice(1,-1)}</strong>
              : part.startsWith("_")&&part.endsWith("_")
                ? <em key={j}>{part.slice(1,-1)}</em>
                : part
          );

          // ── Belongings card ──
          // -- Summary card --
          if(msg.type==="summary") {
            const s = msg.summary;
            const bal = Math.max(0, (s.total||0) - (s.payAmount||0));
            return (
              <div key={i} style={{margin:"4px 8px 6px"}}>
                <div style={{background:T.recv,borderRadius:12,overflow:"hidden",borderLeft:"4px solid "+T.green}}>
                  {/* Title */}
                  <div style={{padding:"10px 14px",borderBottom:"1px solid "+T.border}}>
                    <div style={{fontSize:11,fontWeight:600,color:T.textMuted,letterSpacing:.5,marginBottom:8}}>📋 CHECK-IN SUMMARY</div>
                    {/* Plate */}
                    <div style={{background:"#FFFDE7",borderRadius:8,padding:"8px 12px",textAlign:"center",
                      marginBottom:10,border:"2px solid #333"}}>
                      <div style={{fontFamily:T.mono,fontWeight:900,fontSize:18,color:"#111",letterSpacing:5}}>{s.regNo}</div>
                    </div>
                    {/* Details grid */}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px 12px",fontSize:12}}>
                      <div><span style={{color:T.textMuted}}>Customer</span><br/><span style={{color:T.text,fontWeight:600}}>{s.name}</span></div>
                      <div><span style={{color:T.textMuted}}>Phone</span><br/><span style={{color:T.text,fontFamily:T.mono}}>{s.phone}</span></div>
                      <div><span style={{color:T.textMuted}}>Vehicle</span><br/><span style={{color:T.text}}>{s.brand} {s.model}</span></div>
                      {s.fuel&&<div><span style={{color:T.textMuted}}>Fuel</span><br/><span style={{color:T.text}}>{s.fuel}</span></div>}
                      {s.kms&&<div><span style={{color:T.textMuted}}>KM</span><br/><span style={{color:T.text}}>{s.kms}</span></div>}
                      {s.deliveryDate&&<div><span style={{color:T.textMuted}}>Delivery</span><br/><span style={{color:T.green}}>{s.deliveryDate}</span></div>}
                      {s.mechanic&&<div><span style={{color:T.textMuted}}>Mechanic</span><br/><span style={{color:T.text}}>{s.mechanic}</span></div>}
                    </div>
                  </div>
                  {/* Work items */}
                  {s.items.length>0&&(
                    <div style={{padding:"10px 14px",borderBottom:"1px solid "+T.border}}>
                      <div style={{fontSize:11,fontWeight:600,color:T.textMuted,letterSpacing:.5,marginBottom:6}}>WORK REQUESTED</div>
                      {s.items.map((c,ci)=>(
                        <div key={ci} style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"3px 0",lineHeight:1.5}}>
                          <span style={{color:T.text}}>{ci+1}. {c.complaint}</span>
                          {c.price>0&&<span style={{color:T.green,fontFamily:T.mono,fontWeight:700}}>₹{fmtINR(c.price)}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Belongings */}
                  {s.belongings&&Object.values(s.belongings).some(v=>v===true||v>0)&&(
                    <div style={{padding:"8px 14px",borderBottom:"1px solid "+T.border}}>
                      <div style={{fontSize:11,fontWeight:600,color:T.textMuted,letterSpacing:.5,marginBottom:4}}>BELONGINGS</div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                        {BELONGS.filter(b=>{const v=s.belongings[b.k];return v===true||v>0;}).map(b=>{
                          const v=s.belongings[b.k];
                          return <span key={b.k} style={{fontSize:11,color:T.text,padding:"2px 8px",
                            borderRadius:10,background:T.border,fontFamily:T.font}}>
                            {b.l}{b.qty&&v>0?" ×"+v:""}
                          </span>;
                        })}
                      </div>
                    </div>
                  )}
                  {/* Payment + Total */}
                  <div style={{padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    {s.payAmount>0 ? (
                      <>
                        <div>
                          <div style={{fontSize:10,color:T.textMuted}}>Advance Received</div>
                          <div style={{fontSize:15,fontFamily:T.mono,fontWeight:700,color:T.green}}>
                            ₹{fmtINR(s.payAmount)} <span style={{fontSize:10,color:T.textMuted,fontFamily:T.font}}>{s.payMethod}</span>
                          </div>
                        </div>
                        <div style={{textAlign:"right"}}>
                          <div style={{fontSize:10,color:T.textMuted}}>{s.total>0?"Pending":"To be billed"}</div>
                          <div style={{fontSize:15,fontFamily:T.mono,fontWeight:700,color:s.total>s.payAmount?"#F0AD00":T.textMuted}}>
                            {s.total>s.payAmount?"₹"+fmtINR(s.total-s.payAmount):"After work"}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <div style={{fontSize:10,color:T.textMuted}}>{s.total>0?"Estimate":"Payment"}</div>
                          <div style={{fontSize:16,fontFamily:T.mono,fontWeight:700,color:s.total>0?T.green:T.textMuted}}>
                            {s.total>0?"₹"+fmtINR(s.total):"No advance"}
                          </div>
                        </div>
                        <div style={{textAlign:"right"}}>
                          <div style={{fontSize:10,color:T.textMuted}}>Status</div>
                          <div style={{fontSize:12,color:T.textMuted}}>To be billed</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                {/* "Everything look good?" below card */}
                <div style={{padding:"6px 4px",fontSize:13,color:T.textMuted,fontFamily:T.font}}>Everything look good?</div>
              </div>
            );
          }

          return (
            <div key={i} style={{display:"flex",justifyContent:isBot?"flex-start":"flex-end",
              padding:"1px 8px",marginBottom:2,alignItems:"flex-end",gap:4}}>
              {/* Bot avatar — small, like WhatsApp group */}
              {isBot&&(
                <div style={{width:24,height:24,borderRadius:12,background:T.green,
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,
                  flexShrink:0,marginBottom:1}}>🤖</div>
              )}
              {/* Bubble wrapper — shrink to fit */}
              <div style={{maxWidth:"75%",minWidth:60}}>
                <div style={{
                  background:isBot?T.recv:T.sent,
                  borderRadius:isBot?"2px 10px 10px 10px":"10px 2px 10px 10px",
                  padding:isPlate?"4px":"6px 10px 4px",
                  display:"inline-block",
                  maxWidth:"100%",
                }}>
                  {/* Image */}
                  {msg.type==="image"&&msg.dataUrl&&(
                    <img src={msg.dataUrl} alt="photo" style={{width:"100%",maxWidth:180,borderRadius:6,display:"block",marginBottom:3}}/>
                  )}
                  {/* Plate card */}
                  {isPlate ? (
                    <>
                      <div style={{background:"#00473a",borderRadius:8,padding:"8px 16px",textAlign:"center",
                        border:"1px solid rgba(255,255,255,0.06)"}}>
                        <div style={{fontSize:18,color:"#fff",fontFamily:T.mono,fontWeight:900,letterSpacing:4}}>
                          {msg.text}
                        </div>
                      </div>
                      <div style={{fontSize:10,color:T.textSub,textAlign:"right",marginTop:3,padding:"0 2px"}}>
                        {msg.time} <span style={{color:"#53BDEB"}}>✓✓</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{fontSize:13.5,color:isBot?"#27500A":T.text,fontFamily:T.font,
                        lineHeight:1.4,wordBreak:"break-word",whiteSpace:"pre-line"}}>
                        {renderWA(msg.text)}
                      </div>
                      <div style={{fontSize:10,color:T.textSub,textAlign:"right",marginTop:2,
                        display:"flex",justifyContent:"flex-end",alignItems:"center",gap:3}}>
                        {msg.time}
                        {!isBot&&<span style={{color:"#53BDEB"}}>✓✓</span>}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {/* Photo grid card — inline in chat when in photos phase */}
        {phase==="photos"&&(
          <PhotoGridCard
            photos={data.photos}
            onCapture={handlePhotoCapture}
            onPhotoSet={(side,dataUrl)=>setData(d=>({...d,photos:{...d.photos,[side]:dataUrl}}))}
          />
        )}
        {/* Belongings checklist */}
        {/* Added items — compact pills above picker */}
        {phase==="services"&&data.items.length>0&&(
          <div style={{padding:"6px 10px",display:"flex",flexWrap:"wrap",gap:4,alignItems:"center"}}>
            {data.items.map((c,i)=>(
              <span key={i} style={{display:"inline-flex",alignItems:"center",gap:3,
                padding:"3px 8px 3px 10px",borderRadius:14,fontSize:11,
                background:"#00A88418",border:"1px solid #00A88433",color:T.text,fontFamily:T.font}}>
                {c.complaint}{c.price>0&&<span style={{color:T.green,fontFamily:T.mono,fontSize:10}}>₹{fmtINR(c.price)}</span>}
                <button onClick={()=>setData(d=>({...d,items:d.items.filter((_,idx)=>idx!==i)}))}
                  style={{background:"none",border:"none",cursor:"pointer",color:"#A32D2D",
                    fontSize:12,padding:0,lineHeight:1,marginLeft:1}}>×</button>
              </span>
            ))}
            <span style={{fontSize:10,color:T.green,fontWeight:600,marginLeft:4}}>
              {data.items.reduce((t,c)=>t+(+c.price||0),0)>0?"₹"+fmtINR(data.items.reduce((t,c)=>t+(+c.price||0),0)):""}
            </span>
          </div>
        )}
        {/* Service picker card */}
        {phase==="services"&&(
          <ServicePickerCard
            items={data.items}
            onItemsChange={(newItems)=>setData(d=>({...d,items:newItems}))}
            onDone={()=>handleChip("services_done")}
          />
        )}
        <div ref={endRef}/>
      </div>

      {/* Chips */}
      {renderChips()&&(
        <div style={{background:T.chatBg,padding:"4px 10px",
          maxHeight:220,overflowY:"auto",flexShrink:0}}>
          {renderChips()}
        </div>
      )}

      {/* Input bar — WhatsApp style */}
      <div style={{background:T.sidebarHeader,flexShrink:0,borderTop:`1px solid ${T.border}`,
        padding:"8px 10px",position:"relative"}}>

        {/* + Menu — inline editable */}
        {showBotMenu&&(()=>{
          const openEdit = (k, val) => { setEditStep(k); setEditVal(val||""); setTimeout(()=>editInputRef.current?.focus(),100); };
          const saveEdit = (k) => {
            if(k==="plate") setData(d=>({...d,regNo:editVal.toUpperCase()}));
            if(k==="name") setData(d=>({...d,name:editVal}));
            if(k==="phone") setData(d=>({...d,phone:editVal}));
            if(k==="kms") setData(d=>({...d,kms:editVal}));
            setEditStep(null); setEditVal("");
          };
          const pickChip = (k, val) => {
            if(k==="brand") setData(d=>({...d,brand:val,model:""}));
            if(k==="model") setData(d=>({...d,model:val}));
            if(k==="fuel") setData(d=>({...d,fuel:val}));
            setEditStep(null);
          };

          const BRANDS = ["Maruti","Hyundai","Tata","Mahindra","Kia","Toyota","Honda","Renault","Ford","Volkswagen","Skoda","MG","Nissan","Jeep","BMW","Audi","Mercedes"];
          const FUELS = ["Petrol","Diesel","CNG","Electric","Hybrid"];
          const brandModels = {Maruti:["Swift","Baleno","Alto","WagonR","Dzire","Brezza","Ertiga","Ciaz","Celerio","Ignis","XL6","S-Presso","Fronx","Jimny","Grand Vitara","Invicto"],
            Hyundai:["i20","Creta","Venue","Verna","i10","Tucson","Alcazar","Exter","Aura","Santro","Kona EV"],
            Tata:["Nexon","Punch","Harrier","Safari","Altroz","Tiago","Tigor","Nano"],
            Mahindra:["Thar","XUV700","Scorpio","XUV300","Bolero","XUV400","Marazzo"],
            Kia:["Seltos","Sonet","Carens","EV6","Carnival"],
            Toyota:["Innova","Fortuner","Glanza","Urban Cruiser","Hilux","Camry","Vellfire"],
            Honda:["City","Amaze","WR-V","Elevate","Jazz"],
            default:["Sedan","SUV","Hatchback","MUV","Other"]};

          const steps = [
            {k:"plate",ic:"🚗",l:"Vehicle Number",val:data.regNo,type:"text",inputMode:"text",
              format:v=>v.replace(/[^A-Za-z0-9]/g,"").toUpperCase()},
            {k:"name",ic:"👤",l:"Customer Name",val:data.name,type:"text",inputMode:"text",
              format:v=>v.replace(/[^A-Za-z\s]/g,"").replace(/\b\w/g,c=>c.toUpperCase())},
            {k:"phone",ic:"📞",l:"Phone Number",val:data.phone,type:"text",inputMode:"numeric",
              format:v=>v.replace(/\D/g,"").slice(0,10)},
            {k:"brand",ic:"🏭",l:"Vehicle Brand",val:data.brand,type:"chips",opts:BRANDS},
            {k:"model",ic:"🚘",l:"Vehicle Model",val:data.model,type:"chips",
              opts:data.brand?(brandModels[data.brand]||brandModels.default):[]},
            {k:"photos",ic:"📸",l:"Vehicle Photos",val:Object.values(data.photos).filter(Boolean).length>0?Object.values(data.photos).filter(Boolean).length+" photo(s)":"",type:"goto"},
            {k:"fuel",ic:"⛽",l:"Fuel Level",val:data.fuel,type:"chips",opts:FUELS},
            {k:"kms",ic:"📏",l:"KM Reading",val:data.kms,type:"text",inputMode:"numeric",
              format:v=>v.replace(/[^0-9]/g,"")},
            {k:"belongings",ic:"🧰",l:"Belongings",val:(()=>{const c=Object.values(data.belongings).filter(v=>v===true||v>0).length;return c>0?c+" item(s)":"";})(),type:"goto"},
            {k:"services",ic:"🔧",l:"Services",val:data.items.length>0?data.items.length+" service(s)":"",type:"goto"},
            {k:"payment",ic:"💰",l:"Payment",val:data._payAmount>0?"₹"+fmtINR(data._payAmount):"",type:"goto"},
          ];

          return (
          <div style={{position:"absolute",bottom:"100%",left:0,marginBottom:6,
            background:"#FFFFFF",borderRadius:14,border:"1px solid #E5E4DF",
            boxShadow:"0 8px 24px rgba(0,0,0,.15)",minWidth:220,maxWidth:280,
            zIndex:20,overflow:"hidden"}}>
            <div style={{padding:"5px 10px",borderBottom:"1px solid #E5E4DF",
              display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:9,fontWeight:700,color:"#888780",letterSpacing:.3}}>EDIT CHECK-IN</span>
              <button onClick={()=>setShowBotMenu(false)}
                style={{background:"none",border:"none",cursor:"pointer",color:"#888780",
                  fontSize:14,lineHeight:1,padding:"0 2px"}}>×</button>
            </div>
            <div style={{maxHeight:260,overflowY:"auto"}}>
            {steps.map((s,i)=>{
              const isEditing = editStep===s.k;
              const done = !!s.val;
              return (
              <div key={s.k} style={{borderBottom:i<steps.length-1?"1px solid #F1EFE8":"none"}}>
                {/* Row — tap to edit */}
                <button onClick={()=>{
                  if(done&&s.type==="text") openEdit(s.k, s.val);
                  else if(done&&s.type==="chips") setEditStep(isEditing?null:s.k);
                  else {
                    // Navigate to this phase in the bot
                    if(s.k==="payment") setPhase("pay_method");
                    else setPhase(s.k);
                    setInput("");setShowBotMenu(false);setEditStep(null);
                    if(["plate","name","phone","kms"].includes(s.k))
                      setTimeout(()=>inputRef.current?.focus(),150);
                  }
                }}
                  style={{width:"100%",display:"flex",alignItems:"center",gap:8,
                    padding:"7px 10px",background:isEditing?"#F5F4F0":"transparent",border:"none",
                    cursor:"pointer",textAlign:"left",
                    opacity:done?1:0.55}}>
                  <span style={{fontSize:14,flexShrink:0}}>{s.ic}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:11,color:"#1B1B1A",fontWeight:600}}>{s.l}</div>
                    <div style={{fontSize:9,color:done?"#3B6D11":"#888780",
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {done?"✅ "+s.val:"Tap to enter"}
                    </div>
                  </div>
                  {done&&!isEditing&&<span style={{fontSize:9,color:"#888780"}}>✏️</span>}
                </button>

                {/* Inline text editor */}
                {isEditing&&s.type==="text"&&(
                  <div style={{padding:"0 10px 6px",display:"flex",gap:4,paddingLeft:32}}>
                    <input ref={editInputRef} value={editVal}
                      onChange={e=>setEditVal(s.format?s.format(e.target.value):e.target.value)}
                      onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();saveEdit(s.k);}}}
                      inputMode={s.inputMode||"text"}
                      placeholder={s.l+"..."}
                      style={{flex:1,padding:"6px 8px",background:"#fff",
                        border:"1.5px solid #3B6D11",borderRadius:6,
                        fontSize:12,fontWeight:600,color:"#1B1B1A",outline:"none"}}/>
                    <button onClick={()=>saveEdit(s.k)}
                      style={{width:28,height:28,borderRadius:6,background:"#3B6D11",border:"none",
                        cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <button onClick={()=>setEditStep(null)}
                      style={{width:28,height:28,borderRadius:6,background:"#F5F4F0",
                        border:"1px solid #E5E4DF",cursor:"pointer",
                        fontSize:13,color:"#888780",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
                  </div>
                )}

                {/* Inline chip selector */}
                {isEditing&&s.type==="chips"&&(
                  <div style={{padding:"0 10px 6px",paddingLeft:32}}>
                    <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                      {(s.opts||[]).map(o=>(
                        <button key={o} onClick={()=>pickChip(s.k,o)}
                          style={{padding:"4px 8px",borderRadius:14,cursor:"pointer",fontSize:10,
                            border:data[s.k==="brand"?"brand":s.k==="model"?"model":"fuel"]===o?"1.5px solid #3B6D11":"1.5px solid #E5E4DF",
                            background:data[s.k==="brand"?"brand":s.k==="model"?"model":"fuel"]===o?"#EAF3DE":"#FAFAF8",
                            color:data[s.k==="brand"?"brand":s.k==="model"?"model":"fuel"]===o?"#3B6D11":"#888780",
                            fontWeight:data[s.k==="brand"?"brand":s.k==="model"?"model":"fuel"]===o?600:400}}>
                          {data[s.k==="brand"?"brand":s.k==="model"?"model":"fuel"]===o?"✓ ":""}{o}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              );
            })}
            </div>
          </div>
          );
        })()}

        <div style={{display:"flex",gap:8,alignItems:"center"}}>

          {/* + button */}
          <button onClick={()=>setShowBotMenu(v=>!v)}
            style={{width:42,height:42,borderRadius:21,
              background:showBotMenu?"#3B6D11":"#E5E4DF",border:"none",cursor:"pointer",
              fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",
              flexShrink:0,fontWeight:700,color:showBotMenu?"#fff":"#1B1B1A",
              transition:"all .15s"}}>
            {showBotMenu?"×":"+"}
          </button>

          {/* Text input pill */}
          <div style={{flex:1,background:T.border,borderRadius:26,
            padding:"0 14px",display:"flex",alignItems:"center",
            minHeight:42,opacity:isTextPhase?1:0.55}}>
            <input ref={inputRef} value={input}
              onChange={e=>{
                if(phase==="plate"){
                  const raw = e.target.value.replace(/[^A-Za-z0-9]/g,"").toUpperCase();
                  setInput(fmtPlate(raw));
                } else if(phase==="name"){
                  const cleaned = e.target.value.replace(/[^A-Za-z\s]/g,"");
                  setInput(cleaned.replace(/\b\w/g, c=>c.toUpperCase()));
                } else if(phase==="phone"){
                  setInput(e.target.value.replace(/\D/g,"").slice(0,10));
                } else if(phase==="kms"){
                  setInput(e.target.value.replace(/[^0-9a-zA-Z]/g,""));
                } else {
                  setInput(e.target.value);
                }
              }}
              onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();handleSend();}}}
              placeholder={isTextPhase?placeholder:_t("tapAbove",lang)}
              disabled={!isTextPhase}
              inputMode={phase==="phone"||phase==="kms"||phase==="pay_custom"?"numeric":"text"}
              autoCapitalize="off"
              style={{flex:1,background:"transparent",border:"none",outline:"none",
                fontSize:14,fontFamily:T.font,color:T.text,lineHeight:1.5,
                padding:"10px 0"}}/>
          </div>

          {/* Mic / Send toggle */}
          {(()=>{
            const showSend = input.trim()&&isTextPhase;
            if(showSend) return (
              <button onClick={()=>handleSend()}
                style={{width:42,height:42,borderRadius:21,background:T.green,border:"none",
                  cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
                  flexShrink:0,boxShadow:"0 2px 6px rgba(59,109,17,.3)"}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            );
            return (
              <button onClick={listening?stopListening:startListening}
                style={{width:42,height:42,borderRadius:21,
                  background:listening?"#A32D2D":T.green,border:"none",cursor:"pointer",
                  display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
                  boxShadow:"0 2px 6px rgba(59,109,17,.3)"}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" fill="#fff"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="12" y1="19" x2="12" y2="23" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="8" y1="23" x2="16" y2="23" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            );
          })()}
        </div>
      </div>
    </div>
  );
}


// ── Photos step ───────────────────────────────────────────────

// ── Photo Annotator (draw circles/arrows/notes on damage photos) ──
const DAMAGE_NOTES = {
  "#EF4444": ["Minor dent","Deep dent","Panel dent","Door dent","Bumper dent","Fender dent"],
  "#F59E0B": ["Surface crack","Deep crack","Windscreen crack","Bumper crack","Headlight crack","Panel crack"],
  "#3B82F6": ["Light scratch","Deep scratch","Keyed scratch","Door scratch","Bumper scratch","Bonnet scratch"],
  "#10B981": ["Paint chip","Paint peel","Paint fade","Rust spot","Paint transfer","Missing paint"],
  "#8B5CF6": ["Missing part","Broken light","Broken mirror","Dent & scratch","Sticker damage","Other damage"],
};

// Draw a rounded rect WITHOUT using roundRect API (unsupported in some browsers)
function fillRoundRect(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r);
  ctx.closePath(); ctx.fill();
}

function PhotoAnnotator({photo,side,onSave,onClose}) {
  const canvasRef=useRef(null);
  const textInputRef=useRef(null);
  const [drawing,setDrawing]=useState(false);
  const [color,setColor]=useState("#EF4444");
  const [tool,setTool]=useState("circle");
  const [startPt,setStartPt]=useState(null);
  const [history,setHistory]=useState([]);
  const [textPos,setTextPos]=useState(null);
  const [textVal,setTextVal]=useState("");
  const [textScreen,setTextScreen]=useState(null);

  const colors=[
    {hex:"#EF4444",label:"Dent"},
    {hex:"#F59E0B",label:"Crack"},
    {hex:"#3B82F6",label:"Scratch"},
    {hex:"#10B981",label:"Paint"},
    {hex:"#8B5CF6",label:"Other"},
  ];

  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return;
    const ctx=canvas.getContext("2d");
    const img=new Image();
    img.onload=()=>{
      canvas.width=img.width; canvas.height=img.height;
      ctx.drawImage(img,0,0);
      setHistory([ctx.getImageData(0,0,canvas.width,canvas.height)]);
    };
    img.src=photo;
  },[photo]);

  useEffect(()=>{
    if(textPos) setTimeout(()=>textInputRef.current?.focus(),80);
  },[textPos]);

  const getPos=(e,canvas)=>{
    const rect=canvas.getBoundingClientRect();
    const scaleX=canvas.width/rect.width; const scaleY=canvas.height/rect.height;
    const touch=e.touches?e.touches[0]:e;
    return {
      c:{x:(touch.clientX-rect.left)*scaleX,y:(touch.clientY-rect.top)*scaleY},
      s:{x:touch.clientX,y:touch.clientY},
    };
  };

  // Stamp text label with solid background — works everywhere
  const stampNote=(cx,cy,text)=>{
    if(!text.trim()) return;
    const canvas=canvasRef.current; const ctx=canvas.getContext("2d");
    const fs=Math.max(14,Math.round(canvas.width/55));
    const pad=Math.round(fs*0.4);
    ctx.font=`bold ${fs}px Arial,sans-serif`;
    const tw=ctx.measureText(text).width;
    const bw=tw+pad*2; const bh=fs+pad*2;
    const bx=Math.min(Math.max(cx-bw/2, 4), canvas.width-bw-4);
    const by=Math.max(cy-bh-18, 4);
    const r=Math.round(fs*0.35);
    // Coloured pill background
    ctx.fillStyle=color;
    fillRoundRect(ctx,bx,by,bw,bh,r);
    // White text with black shadow for readability
    ctx.shadowColor="rgba(0,0,0,0.5)"; ctx.shadowBlur=3; ctx.shadowOffsetX=1; ctx.shadowOffsetY=1;
    ctx.fillStyle="#fff";
    ctx.textBaseline="middle";
    ctx.fillText(text,bx+pad,by+bh/2);
    ctx.shadowColor="transparent"; ctx.shadowBlur=0; ctx.shadowOffsetX=0; ctx.shadowOffsetY=0;
    // Triangle pointer from pill down to the tap point
    const px=Math.min(Math.max(cx,bx+r),bx+bw-r);
    ctx.fillStyle=color;
    ctx.beginPath();
    ctx.moveTo(px-10,by+bh);
    ctx.lineTo(px+10,by+bh);
    ctx.lineTo(px,cy);
    ctx.closePath(); ctx.fill();
    setHistory(h=>[...h,ctx.getImageData(0,0,canvas.width,canvas.height)]);
  };

  // lastPos ref for freehand continuous drawing
  const lastPosRef=useRef(null);

  const onDown=(e)=>{
    e.preventDefault();
    const canvas=canvasRef.current; if(!canvas) return;
    if(tool==="text"){
      if(textPos){setTextPos(null);setTextVal("");return;}
      const {c,s}=getPos(e,canvas);
      setTextPos(c); setTextScreen(s); setTextVal("");
      return;
    }
    const {c}=getPos(e,canvas);
    if(tool==="draw"){
      // Freehand — start a new path segment; save snapshot for undo
      const ctx=canvas.getContext("2d");
      const lw=Math.max(5,Math.round(canvas.width/120));
      ctx.strokeStyle=color; ctx.lineWidth=lw; ctx.lineCap="round"; ctx.lineJoin="round";
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(c.x,c.y);
      lastPosRef.current=c;
      setDrawing(true);
    } else {
      setStartPt(c); setDrawing(true);
    }
  };

  const onUp=(e)=>{
    e.preventDefault(); if(!drawing||tool==="text") return;
    setDrawing(false);
    const canvas=canvasRef.current; const ctx=canvas.getContext("2d");
    if(tool==="draw"){
      // Freehand done — save to history
      lastPosRef.current=null;
      setHistory(h=>[...h,ctx.getImageData(0,0,canvas.width,canvas.height)]);
    } else {
      if(!startPt) return;
      const {c:pos}=getPos(e,canvas);
      const lw=Math.max(6,Math.round(canvas.width/120));
      ctx.setLineDash([]);
      if(tool==="circle"){
        const rx=Math.abs(pos.x-startPt.x)/2; const ry=Math.abs(pos.y-startPt.y)/2;
        const cx=(pos.x+startPt.x)/2; const cy=(pos.y+startPt.y)/2;
        ctx.lineWidth=lw; ctx.strokeStyle=color; ctx.lineJoin="round";
        ctx.beginPath(); ctx.ellipse(cx,cy,Math.max(rx,12),Math.max(ry,12),0,0,2*Math.PI);
        ctx.stroke();
      } else if(tool==="arrow"){
        const dx=pos.x-startPt.x; const dy=pos.y-startPt.y;
        const len=Math.sqrt(dx*dx+dy*dy); if(len<10){setStartPt(null);return;}
        const angle=Math.atan2(dy,dx);
        const hs=Math.max(22,lw*4);
        ctx.strokeStyle=color; ctx.lineWidth=lw; ctx.lineCap="round";
        ctx.beginPath(); ctx.moveTo(startPt.x,startPt.y); ctx.lineTo(pos.x,pos.y); ctx.stroke();
        // Triangle arrowhead
        ctx.fillStyle=color;
        ctx.beginPath();
        ctx.moveTo(pos.x,pos.y);
        ctx.lineTo(pos.x-hs*Math.cos(angle-0.4),pos.y-hs*Math.sin(angle-0.4));
        ctx.lineTo(pos.x-hs*Math.cos(angle+0.4),pos.y-hs*Math.sin(angle+0.4));
        ctx.closePath(); ctx.fill();
      }
      setHistory(h=>[...h,ctx.getImageData(0,0,canvas.width,canvas.height)]);
      setStartPt(null);
    }
  };

  const onMove=(e)=>{
    e.preventDefault(); if(!drawing||tool==="text") return;
    const canvas=canvasRef.current; const ctx=canvas.getContext("2d");
    const {c:pos}=getPos(e,canvas);
    if(tool==="draw"){
      // Freehand — draw segment from last position to current
      const lw=Math.max(5,Math.round(canvas.width/120));
      ctx.strokeStyle=color; ctx.lineWidth=lw; ctx.lineCap="round"; ctx.lineJoin="round";
      ctx.setLineDash([]);
      if(lastPosRef.current){
        ctx.beginPath();
        ctx.moveTo(lastPosRef.current.x,lastPosRef.current.y);
        ctx.lineTo(pos.x,pos.y);
        ctx.stroke();
      }
      lastPosRef.current=pos;
    } else if(tool==="circle"&&startPt){
      // Circle preview
      if(history.length>0) ctx.putImageData(history[history.length-1],0,0);
      const lw=Math.max(4,Math.round(canvas.width/120));
      ctx.strokeStyle=color+"88"; ctx.lineWidth=lw; ctx.setLineDash([12,6]);
      const rx=Math.abs(pos.x-startPt.x)/2; const ry=Math.abs(pos.y-startPt.y)/2;
      const cx=(pos.x+startPt.x)/2; const cy=(pos.y+startPt.y)/2;
      ctx.beginPath(); ctx.ellipse(cx,cy,Math.max(rx,4),Math.max(ry,4),0,0,2*Math.PI); ctx.stroke();
      ctx.setLineDash([]);
    } else if(tool==="arrow"&&startPt){
      // Arrow preview
      if(history.length>0) ctx.putImageData(history[history.length-1],0,0);
      const lw=Math.max(4,Math.round(canvas.width/120));
      ctx.strokeStyle=color+"88"; ctx.lineWidth=lw; ctx.setLineDash([10,5]);
      ctx.beginPath(); ctx.moveTo(startPt.x,startPt.y); ctx.lineTo(pos.x,pos.y); ctx.stroke();
      ctx.setLineDash([]);
    }
  };

  const undo=()=>{
    if(history.length<2) return;
    const canvas=canvasRef.current; const ctx=canvas.getContext("2d");
    ctx.putImageData(history[history.length-2],0,0);
    setHistory(h=>h.slice(0,-1));
    setTextPos(null); setTextVal("");
  };

  const suggestions=DAMAGE_NOTES[color]||[];
  const colorLabel=colors.find(c=>c.hex===color)?.label||"Damage";

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.95)",zIndex:9999,display:"flex",flexDirection:"column"}}>
      {/* Header */}
      <div style={{background:"#FFFFFF",padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div style={{color:"#fff",fontWeight:700,fontSize:15}}>📸 Mark Damage — {side}</div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={undo} style={{padding:"6px 12px",background:"rgba(0,0,0,0.06)",border:"none",borderRadius:8,color:"#fff",fontSize:12,cursor:"pointer",fontWeight:600}}>↩ Undo</button>
          <button onClick={onClose} style={{padding:"6px 12px",background:"rgba(0,0,0,0.06)",border:"none",borderRadius:8,color:"#fff",fontSize:12,cursor:"pointer"}}>✕</button>
        </div>
      </div>
      {/* Toolbar */}
      <div style={{background:"#FFFFFF",padding:"8px 10px",display:"flex",flexDirection:"column",gap:6,flexShrink:0}}>
        {/* Damage type pills */}
        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
          {colors.map(c=>(
            <button key={c.hex} onClick={()=>setColor(c.hex)}
              style={{display:"flex",alignItems:"center",gap:5,padding:"5px 10px",borderRadius:16,cursor:"pointer",
                background:color===c.hex?c.hex:"rgba(0,0,0,0.04)",
                border:`2px solid ${color===c.hex?c.hex:"rgba(255,255,255,0.18)"}`,
                color:color===c.hex?"#fff":"rgba(255,255,255,0.65)",
                fontSize:12,fontWeight:color===c.hex?800:500}}>
              <span style={{width:10,height:10,borderRadius:5,background:c.hex,flexShrink:0,
                boxShadow:color===c.hex?"0 0 0 2px #fff":"none"}}/>
              {c.label}
            </button>
          ))}
        </div>
        {/* Tool row */}
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          {[{k:"circle",l:"⭕ Circle"},{k:"arrow",l:"↗ Arrow"},{k:"draw",l:"✍️ Draw"},{k:"text",l:"✏️ Note"}].map(t=>(
            <button key={t.k} onClick={()=>{setTool(t.k);setTextPos(null);setTextVal("");}}
              style={{padding:"4px 10px",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer",
                border:`2px solid ${tool===t.k?"#fff":"transparent"}`,
                background:tool===t.k?"rgba(0,0,0,0.06)":"transparent",color:"#fff"}}>
              {t.l}
            </button>
          ))}
          <span style={{color:"rgba(255,255,255,0.4)",fontSize:10,marginLeft:"auto"}}>
            {tool==="text"?`Tap photo → type ${colorLabel} note`:
             tool==="circle"?"Drag to circle the damage area":
             tool==="arrow"?"Drag to draw a straight arrow":
             "Draw freely — triangle, rectangle, any shape"}
          </span>
        </div>
      </div>
      {/* Canvas */}
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",padding:6,position:"relative"}}>
        <canvas ref={canvasRef}
          style={{maxWidth:"100%",maxHeight:"100%",borderRadius:8,touchAction:"none",
            cursor:tool==="text"?"cell":"crosshair"}}
          onMouseDown={onDown} onMouseUp={onUp} onMouseMove={onMove}
          onTouchStart={onDown} onTouchEnd={onUp} onTouchMove={onMove} />

        {/* Text note input overlay */}
        {textPos&&textScreen&&(
          <div style={{
            position:"fixed",
            left:Math.min(Math.max(textScreen.x-20,8),window.innerWidth-260),
            top:Math.max(textScreen.y-160,60),
            background:"rgba(10,10,10,0.96)",borderRadius:14,padding:12,
            border:`2px solid ${color}`,width:240,zIndex:10,
            boxShadow:`0 4px 24px rgba(0,0,0,0.5)`}}>
            <div style={{fontSize:11,color:"rgba(0,0,0,0.4)",marginBottom:8,fontWeight:600}}>
              ✏️ {colorLabel} note — tap a suggestion or type
            </div>
            {/* Auto-suggestions */}
            <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:8}}>
              {suggestions.map(s=>(
                <button key={s} onClick={()=>{setTextVal(s);}}
                  style={{padding:"3px 9px",borderRadius:12,border:`1px solid ${color}44`,
                    background:textVal===s?color:"rgba(0,0,0,0.04)",
                    color:textVal===s?"#fff":"rgba(255,255,255,0.75)",
                    fontSize:11,cursor:"pointer",fontFamily:T.font}}>
                  {s}
                </button>
              ))}
            </div>
            {/* Free-type input */}
            <input ref={textInputRef} value={textVal}
              onChange={e=>setTextVal(e.target.value)}
              onKeyDown={e=>{
                if(e.key==="Enter"&&textVal.trim()){stampNote(textPos.x,textPos.y,textVal.trim());setTextPos(null);setTextVal("");}
                if(e.key==="Escape"){setTextPos(null);setTextVal("");}
              }}
              placeholder="Or type custom note..."
              style={{width:"100%",padding:"8px 10px",border:`1.5px solid ${color}`,borderRadius:8,
                background:"rgba(0,0,0,0.04)",color:"#fff",fontSize:13,
                fontFamily:T.font,outline:"none",boxSizing:"border-box"}} />
            <div style={{display:"flex",gap:6,marginTop:8}}>
              <button onClick={()=>{if(textVal.trim()){stampNote(textPos.x,textPos.y,textVal.trim());setTextPos(null);setTextVal("");}}}
                disabled={!textVal.trim()}
                style={{flex:1,padding:"8px",background:textVal.trim()?color:"rgba(0,0,0,0.04)",
                  border:"none",borderRadius:8,color:"#fff",fontSize:12,fontWeight:800,cursor:"pointer"}}>
                Stamp on photo
              </button>
              <button onClick={()=>{setTextPos(null);setTextVal("");}}
                style={{padding:"8px 10px",background:"rgba(0,0,0,0.04)",border:"none",
                  borderRadius:8,color:"#fff",fontSize:12,cursor:"pointer"}}>
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
      {/* Save */}
      <div style={{padding:"10px 14px",background:"#FFFFFF",flexShrink:0}}>
        <button onClick={()=>onSave(canvasRef.current.toDataURL("image/jpeg",0.88))}
          style={{width:"100%",padding:"13px",background:T.green,color:"#fff",border:"none",borderRadius:12,fontSize:15,fontWeight:800,cursor:"pointer",fontFamily:T.font}}>
          ✅ Save Annotated Photo
        </button>
      </div>
    </div>
  );
}



// ── Login ────────────────────────────────────────────────────
// ── Garage Registration Screen ──
// Blueprint: Calm (value-first) + Canva (progressive) + Strava (quick) + Duolingo (celebration)
function GarageRegScreen({ onDone, onExisting, lang, setLang }) {
  const [step, setStep] = useState(0); // 0=welcome, 1=garage, 2=admin, 3=success
  const [gName, setGName] = useState("");
  const [gPhone, setGPhone] = useState("");
  const [gAddr, setGAddr] = useState("");
  const [gEmail, setGEmail] = useState("");
  const [gGst, setGGst] = useState("");
  const [aName, setAName] = useState("");
  const [aPhone, setAPhone] = useState("");
  const [aPin, setAPin] = useState("");

  const finish = () => {
    GARAGE.name = gName.trim();
    GARAGE.phone = gPhone.trim();
    GARAGE.address = gAddr.trim();
    GARAGE.email = gEmail.trim();
    GARAGE.gst = gGst.trim()||undefined;
    USERS = [{id:1,name:aName.trim(),role:"admin",avatar:"👨‍💼",phone:aPhone.trim()||undefined,pin:aPin}];
    MECHANICS = [];
    onDone();
  };

  const bg = {minHeight:"100vh",display:"flex",flexDirection:"column",fontFamily:T.font,overflowY:"auto"};
  const inp = (v,set,ph,opts={}) => (
    <div style={{marginBottom:10}}>
      <div style={{fontSize:10,fontWeight:600,color:"#888780",marginBottom:4,paddingLeft:2}}>{ph}</div>
      <input value={v} onChange={e=>{
        let val = e.target.value;
        if(opts.phone) val=val.replace(/\D/g,"").slice(0,10);
        if(opts.upper) val=val.toUpperCase();
        if(opts.pin) val=val.replace(/\D/g,"").slice(0,4);
        set(val);
      }}
        placeholder={opts.placeholder||ph}
        type={opts.type||"text"}
        inputMode={opts.phone||opts.pin?"numeric":"text"}
        maxLength={opts.pin?4:undefined}
        style={{width:"100%",padding:"14px 16px",background:"#fff",
          border:"1.5px solid #E5E4DF",borderRadius:12,fontSize:14,color:"#1B1B1A",
          outline:"none",boxSizing:"border-box",
          ...(opts.pin?{letterSpacing:20,textAlign:"center",fontSize:24,fontWeight:700}:{}),
          ...(opts.focus?{borderColor:"#3B6D11",boxShadow:"0 0 0 3px rgba(59,109,17,.1)"}:{})}}/>
    </div>
  );

  // ── STEP 0: Welcome ──
  if(step===0) return (
    <div style={{...bg,background:"linear-gradient(180deg,#27500A 0%,#3B6D11 40%,#FAFAF8 100%)",alignItems:"center"}}>

      {/* Language selector */}
      <div style={{display:"flex",gap:6,padding:"16px 0 0",alignSelf:"center"}}>
        {[{k:"en",l:"EN"},{k:"ta",l:"தமி"},{k:"hi",l:"हिं"}].map(lg=>(
          <button key={lg.k} onClick={()=>setLang(lg.k)}
            style={{padding:"4px 12px",borderRadius:14,cursor:"pointer",fontSize:10,fontWeight:600,
              border:"none",background:lang===lg.k?"rgba(255,255,255,.25)":"transparent",
              color:lang===lg.k?"#fff":"rgba(255,255,255,.5)"}}>{lg.l}</button>
        ))}
      </div>

      {/* Hero */}
      <div style={{textAlign:"center",padding:"40px 24px 30px",color:"#fff"}}>
        <div style={{width:70,height:70,borderRadius:20,background:"rgba(255,255,255,.15)",
          border:"2px solid rgba(255,255,255,.3)",margin:"0 auto 16px",
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:34}}>🔧</div>
        <div style={{fontSize:26,fontWeight:800,letterSpacing:0.5}}>Garage</div>
        <div style={{fontSize:13,color:"#C0DD97",marginTop:4,lineHeight:1.5}}>
          Your garage. Simplified.
        </div>
      </div>

      {/* Feature cards */}
      <div style={{width:"100%",maxWidth:360,padding:"0 20px",boxSizing:"border-box"}}>
        {[
          {icon:"📋",title:"Manage Jobs",desc:"Check-in → Work → QC → Payment → Delivery"},
          {icon:"💰",title:"Track Money",desc:"Payments, expenses, vendor costs — all in one place"},
          {icon:"👥",title:"Team Chat",desc:"Mechanics, receptionists — everyone connected"},
        ].map((f,i)=>(
          <div key={i} style={{display:"flex",gap:12,alignItems:"center",padding:"14px 16px",
            background:"#fff",borderRadius:14,marginBottom:8,
            border:"1px solid #E5E4DF",boxShadow:"0 2px 8px rgba(0,0,0,.04)"}}>
            <div style={{width:40,height:40,borderRadius:10,background:"#EAF3DE",
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{f.icon}</div>
            <div>
              <div style={{fontSize:14,fontWeight:600,color:"#1B1B1A"}}>{f.title}</div>
              <div style={{fontSize:11,color:"#888780",marginTop:2}}>{f.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{width:"100%",maxWidth:360,padding:"20px 20px 24px",boxSizing:"border-box"}}>
        <button onClick={()=>setStep(1)}
          style={{width:"100%",padding:"16px",borderRadius:14,border:"none",cursor:"pointer",
            fontSize:16,fontWeight:700,color:"#fff",background:"#3B6D11",
            boxShadow:"0 4px 16px rgba(59,109,17,.3)"}}>
          Get Started — It's Free
        </button>
        <button onClick={onExisting||onDone}
          style={{width:"100%",padding:"12px",borderRadius:10,border:"none",cursor:"pointer",
            fontSize:13,fontWeight:500,color:"#888780",background:"transparent",marginTop:8}}>
          I already have a garage →
        </button>
      </div>
    </div>
  );

  // ── Progress bar (steps 1-3) ──
  const progBar = (
    <div style={{display:"flex",alignItems:"center",gap:0,padding:"12px 0 16px",width:"100%",maxWidth:260}}>
      {[1,2,3].map((s,i)=>(
        <React.Fragment key={s}>
          <div style={{width:28,height:28,borderRadius:14,fontSize:11,fontWeight:700,
            display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
            background:step>s?"#3B6D11":step===s?"#3B6D11":"#E5E4DF",
            color:step>=s?"#fff":"#888780",
            transition:"all .3s"}}>
            {step>s?"✓":s}
          </div>
          {i<2&&<div style={{flex:1,height:3,borderRadius:2,
            background:step>s?"#3B6D11":"#E5E4DF",transition:"all .3s"}}/>}
        </React.Fragment>
      ))}
    </div>
  );

  // ── STEP 1: Garage Details ──
  if(step===1) return (
    <div style={{...bg,background:"#FAFAF8",alignItems:"center",padding:"0 20px"}}>
      {/* Header */}
      <div style={{width:"100%",maxWidth:360,display:"flex",alignItems:"center",padding:"16px 0 0"}}>
        <button onClick={()=>setStep(0)}
          style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#888780",padding:"4px 8px 4px 0"}}>←</button>
        <div style={{flex:1}}/>
      </div>

      {progBar}

      <div style={{width:"100%",maxWidth:360}}>
        <div style={{fontSize:20,fontWeight:700,color:"#1B1B1A",marginBottom:4}}>🏪 Your Garage</div>
        <div style={{fontSize:12,color:"#888780",marginBottom:20}}>Tell us about your workshop</div>

        {inp(gName,setGName,"Garage Name",{placeholder:"e.g. Sri Murugan Auto Works"})}
        {inp(gPhone,setGPhone,"Phone Number",{phone:true,placeholder:"10-digit mobile number"})}
        {inp(gAddr,setGAddr,"Full Address",{placeholder:"Street, City, Pincode"})}
        {inp(gEmail,setGEmail,"Email (optional)",{type:"email",placeholder:"garage@email.com"})}
        {inp(gGst,setGGst,"GST Number (optional)",{upper:true,placeholder:"22AAAAA0000A1Z5"})}

        <button onClick={()=>{if(gName.trim()&&gPhone.trim().length>=10&&gAddr.trim()) setStep(2);}}
          disabled={!gName.trim()||gPhone.trim().length<10||!gAddr.trim()}
          style={{width:"100%",padding:"15px",borderRadius:12,border:"none",cursor:"pointer",
            fontSize:15,fontWeight:700,color:"#fff",marginTop:8,marginBottom:24,
            background:gName.trim()&&gPhone.trim().length>=10&&gAddr.trim()?"#3B6D11":"#C5C4BF",
            boxShadow:gName.trim()&&gPhone.length>=10&&gAddr.trim()?"0 3px 12px rgba(59,109,17,.2)":"none",
            transition:"all .2s"}}>
          Continue
        </button>
      </div>
    </div>
  );

  // ── STEP 2: Admin Account ──
  if(step===2) return (
    <div style={{...bg,background:"#FAFAF8",alignItems:"center",padding:"0 20px"}}>
      <div style={{width:"100%",maxWidth:360,display:"flex",alignItems:"center",padding:"16px 0 0"}}>
        <button onClick={()=>setStep(1)}
          style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#888780",padding:"4px 8px 4px 0"}}>←</button>
        <div style={{flex:1}}/>
      </div>

      {progBar}

      <div style={{width:"100%",maxWidth:360}}>
        <div style={{fontSize:20,fontWeight:700,color:"#1B1B1A",marginBottom:4}}>👨‍💼 Your Account</div>
        <div style={{fontSize:12,color:"#888780",marginBottom:20}}>Create the admin login for {gName}</div>

        {inp(aName,setAName,"Your Name",{placeholder:"Owner / Manager name"})}
        {inp(aPhone,setAPhone,"Your Phone (optional)",{phone:true,placeholder:"Personal number"})}

        <div style={{marginBottom:10}}>
          <div style={{fontSize:10,fontWeight:600,color:"#888780",marginBottom:4,paddingLeft:2}}>Create a 4-digit PIN</div>
          <div style={{display:"flex",gap:8,justifyContent:"center"}}>
            {[0,1,2,3].map(i=>(
              <div key={i} style={{width:52,height:58,borderRadius:12,
                border:aPin.length===i?"2px solid #3B6D11":"2px solid #E5E4DF",
                background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:24,fontWeight:700,color:"#1B1B1A",
                boxShadow:aPin.length===i?"0 0 0 3px rgba(59,109,17,.1)":"none",
                transition:"all .2s"}}>
                {aPin[i]?"●":""}
              </div>
            ))}
          </div>
          <input value={aPin} onChange={e=>setAPin(e.target.value.replace(/\D/g,"").slice(0,4))}
            type="tel" inputMode="numeric" maxLength={4} autoFocus
            style={{position:"absolute",opacity:0,width:0,height:0}}/>
          {/* Tap to focus hidden input */}
          <div onClick={()=>{const el=document.querySelector('input[maxLength="4"]');if(el)el.focus();}}
            style={{textAlign:"center",fontSize:11,color:"#3B6D11",marginTop:8,cursor:"pointer"}}>
            Tap here to enter PIN
          </div>
        </div>

        <div style={{background:"#FAFEF5",borderRadius:10,padding:"10px 14px",marginTop:16,marginBottom:10,
          border:"1px solid #3B6D1133",fontSize:11,color:"#3B6D11",lineHeight:1.5}}>
          💡 You'll use this PIN to login. You can add mechanics and receptionists later from Settings.
        </div>

        <button onClick={()=>{if(aName.trim()&&aPin.length===4) setStep(3);}}
          disabled={!aName.trim()||aPin.length<4}
          style={{width:"100%",padding:"15px",borderRadius:12,border:"none",cursor:"pointer",
            fontSize:15,fontWeight:700,color:"#fff",marginTop:4,marginBottom:24,
            background:aName.trim()&&aPin.length===4?"#3B6D11":"#C5C4BF",
            boxShadow:aName.trim()&&aPin.length===4?"0 3px 12px rgba(59,109,17,.2)":"none",
            transition:"all .2s"}}>
          Continue
        </button>
      </div>
    </div>
  );

  // ── STEP 3: Success ──
  return (
    <div style={{...bg,background:"#FAFAF8",alignItems:"center",padding:"0 20px"}}>
      <div style={{width:"100%",maxWidth:360,display:"flex",alignItems:"center",padding:"16px 0 0"}}>
        <button onClick={()=>setStep(2)}
          style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#888780",padding:"4px 8px 4px 0"}}>←</button>
        <div style={{flex:1}}/>
      </div>

      {progBar}

      <div style={{width:"100%",maxWidth:360}}>
        {/* Celebration */}
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:48,marginBottom:8}}>🎉</div>
          <div style={{fontSize:22,fontWeight:700,color:"#1B1B1A"}}>All Set!</div>
          <div style={{fontSize:13,color:"#888780",marginTop:4}}>Your garage is ready to go</div>
        </div>

        {/* Summary card */}
        <div style={{background:"linear-gradient(135deg,#3B6D11,#27500A)",borderRadius:16,
          padding:"20px",color:"#fff",marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
            <div style={{width:44,height:44,borderRadius:12,background:"rgba(255,255,255,.15)",
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🏪</div>
            <div>
              <div style={{fontSize:16,fontWeight:700}}>{gName}</div>
              <div style={{fontSize:11,color:"#C0DD97",marginTop:2}}>{gPhone} · {gAddr}</div>
            </div>
          </div>
          <div style={{height:1,background:"rgba(255,255,255,.15)",margin:"0 0 14px"}}/>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:36,height:36,borderRadius:10,background:"rgba(255,255,255,.15)",
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>👨‍💼</div>
            <div>
              <div style={{fontSize:14,fontWeight:600}}>{aName}</div>
              <div style={{fontSize:11,color:"#C0DD97"}}>Admin · PIN ••••</div>
            </div>
          </div>
        </div>

        {/* What's next */}
        <div style={{background:"#fff",borderRadius:14,border:"1px solid #E5E4DF",padding:"14px 16px",marginBottom:20}}>
          <div style={{fontSize:11,fontWeight:700,color:"#888780",letterSpacing:0.5,marginBottom:10}}>WHAT'S NEXT</div>
          {[
            {n:"1",t:"Add your mechanics from Settings → Staff",c:"#3B6D11"},
            {n:"2",t:"Check-in your first vehicle",c:"#854F0B"},
            {n:"3",t:"Start managing jobs like a pro",c:"#1B1B1A"},
          ].map((s,i)=>(
            <div key={i} style={{display:"flex",gap:10,alignItems:"center",marginBottom:i<2?8:0}}>
              <div style={{width:22,height:22,borderRadius:11,background:s.c,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:10,fontWeight:700,color:"#fff",flexShrink:0}}>{s.n}</div>
              <span style={{fontSize:12,color:"#1B1B1A"}}>{s.t}</span>
            </div>
          ))}
        </div>

        <button onClick={finish}
          style={{width:"100%",padding:"16px",borderRadius:14,border:"none",cursor:"pointer",
            fontSize:16,fontWeight:700,color:"#fff",background:"#3B6D11",
            boxShadow:"0 4px 16px rgba(59,109,17,.3)",marginBottom:24}}>
          🚀 Launch {gName}
        </button>
      </div>
    </div>
  );
}

// ── Garage Selector Screen ──
function GarageSelectorScreen({ onSelect, onNewGarage, onBack, lang }) {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [found, setFound] = useState(null);

  const search = () => {
    if(phone.length<10) { setError("Enter 10-digit phone number"); return; }
    const g = REGISTERED_GARAGES.find(g=>g.phone===phone);
    if(g) { setFound(g); setError(""); }
    else { setError("No garage found with this number"); setFound(null); }
  };

  return (
    <div style={{minHeight:"100vh",background:"#FAFAF8",display:"flex",flexDirection:"column",
      alignItems:"center",fontFamily:T.font,padding:24}}>

      {/* Header */}
      <div style={{width:"100%",maxWidth:360,display:"flex",alignItems:"center",gap:10,marginBottom:24}}>
        <button onClick={onBack}
          style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#888780",padding:4}}>←</button>
        <div>
          <div style={{fontSize:16,fontWeight:700,color:"#1B1B1A"}}>Find Your Garage</div>
          <div style={{fontSize:11,color:"#888780"}}>Enter your registered phone number</div>
        </div>
      </div>

      <div style={{width:"100%",maxWidth:360}}>

        {/* Phone input */}
        <div style={{display:"flex",gap:8,marginBottom:8}}>
          <div style={{flex:1,display:"flex",alignItems:"center",background:"#fff",
            border:"1.5px solid "+(error?"#A32D2D":"#E5E4DF"),borderRadius:12,padding:"0 14px"}}>
            <span style={{fontSize:14,color:"#888780",marginRight:6}}>📞</span>
            <input value={phone} onChange={e=>{setPhone(e.target.value.replace(/\D/g,"").slice(0,10));setError("");setFound(null);}}
              placeholder="Garage phone number"
              type="tel" inputMode="numeric"
              onKeyDown={e=>{if(e.key==="Enter") search();}}
              style={{flex:1,padding:"14px 0",border:"none",background:"transparent",
                fontSize:16,color:"#1B1B1A",outline:"none",letterSpacing:1}}/>
          </div>
          <button onClick={search}
            style={{padding:"0 20px",borderRadius:12,border:"none",cursor:"pointer",
              background:phone.length===10?"#3B6D11":"#C5C4BF",color:"#fff",
              fontSize:14,fontWeight:700}}>
            Go
          </button>
        </div>

        {error&&(
          <div style={{padding:"8px 12px",background:"#FFF5F5",borderRadius:8,
            border:"1px solid #F5C0C0",fontSize:12,color:"#A32D2D",marginBottom:8}}>
            {error}
          </div>
        )}

        {/* Demo hint */}
        <div style={{padding:"8px 12px",background:"#FAFEF5",borderRadius:8,
          border:"1px solid #3B6D1133",fontSize:11,color:"#3B6D11",marginBottom:16}}>
          💡 Demo numbers: 9876500000 (Sri Murugan) · 9876500010 (Kumar Motors) · 9876500020 (Raja Auto)
        </div>

        {/* Found garage card */}
        {found&&(
          <div style={{marginBottom:16}}>
            <div style={{fontSize:10,fontWeight:700,color:"#888780",letterSpacing:0.5,marginBottom:6}}>GARAGE FOUND</div>
            <button onClick={()=>onSelect(found)}
              style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"16px",
                background:"#fff",border:"2px solid #3B6D11",borderRadius:14,cursor:"pointer",textAlign:"left"}}>
              <div style={{width:48,height:48,borderRadius:14,
                background:"linear-gradient(135deg,#3B6D11,#27500A)",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:20,color:"#fff",fontWeight:700,flexShrink:0}}>
                {found.name.charAt(0)}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:15,fontWeight:700,color:"#1B1B1A"}}>{found.name}</div>
                <div style={{fontSize:11,color:"#888780",marginTop:2}}>{found.address}</div>
                <div style={{fontSize:11,color:"#3B6D11",marginTop:2,fontWeight:600}}>
                  {found.users.length} staff · Tap to login →
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Register new */}
        <button onClick={onNewGarage}
          style={{width:"100%",padding:"14px 16px",borderRadius:14,cursor:"pointer",
            border:"1.5px dashed #3B6D11",background:"transparent",marginTop:8,
            display:"flex",alignItems:"center",justifyContent:"center",gap:8,
            fontSize:13,color:"#3B6D11",fontWeight:600}}>
          + Register New Garage
        </button>
      </div>
    </div>
  );
}

function LoginScreen({ onLogin, onNewGarage, onBack, lang, setLang }) {
  return (
    <div style={{minHeight:"100vh",background:"#FAFAF8",display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",fontFamily:T.font,padding:24}}>
      {/* Back button */}
      {onBack&&(
        <button onClick={onBack}
          style={{position:"absolute",top:16,left:16,background:"none",border:"none",
            cursor:"pointer",fontSize:20,color:"#888780",padding:4}}>←</button>
      )}
      <div style={{display:"flex",gap:6,marginBottom:32}}>
        {[{k:"en",l:"English"},{k:"ta",l:"தமிழ்"},{k:"hi",l:"हिंदी"}].map(lg=>(
          <button key={lg.k} onClick={()=>setLang(lg.k)}
            style={{padding:"6px 16px",borderRadius:20,cursor:"pointer",
              fontSize:12,fontWeight:lang===lg.k?600:400,fontFamily:T.font,
              border:lang===lg.k?"none":"1px solid #2A2723",
              background:lang===lg.k?"#1B1B1A":"transparent",
              color:lang===lg.k?"#FFFFFF":"#888780"}}>
            {lg.l}
          </button>
        ))}
      </div>
      <div style={{textAlign:"center",marginBottom:36}}>
        <div style={{width:56,height:56,borderRadius:16,background:"#E8F5E9",margin:"0 auto 14px",
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>🔧</div>
        <div style={{fontSize:18,fontWeight:700,color:"#1B1B1A",letterSpacing:"0.3px"}}>{GARAGE.name}</div>
        <div style={{fontSize:10,color:"#3B6D11",marginTop:4,fontWeight:600}}>Garage</div>
        <div style={{fontSize:12,color:"#888780",marginTop:6}}>{_t("tapProfile",lang)}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,width:"100%",maxWidth:340}}>
        {USERS.map(u=>{
          const rc={admin:"#3B6D11",receptionist:"#185FA5",mechanic:"#854F0B"};
          return (
            <button key={u.id} onClick={()=>onLogin(u)}
              style={{padding:"20px 10px",background:"#FFFFFF",border:"1px solid #2A2723",
                borderRadius:16,cursor:"pointer",fontFamily:T.font,textAlign:"center",
                display:"flex",flexDirection:"column",alignItems:"center",gap:10,
                transition:"transform .1s"}}
              onMouseEnter={e=>e.currentTarget.style.transform="scale(1.02)"}
              onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
              <div style={{width:44,height:44,borderRadius:14,background:"#F1EFE8",
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{u.avatar}</div>
              <div>
                <div style={{fontSize:14,fontWeight:600,color:"#1B1B1A"}}>{u.name}</div>
                <div style={{fontSize:11,color:rc[u.role]||"#888780",marginTop:3,fontWeight:500}}>{_t(u.role,lang)}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Register new garage */}
      {onNewGarage&&(
        <button onClick={onNewGarage}
          style={{marginTop:24,padding:"10px 24px",borderRadius:10,cursor:"pointer",
            border:"1.5px dashed #3B6D11",background:"transparent",
            fontSize:12,color:"#3B6D11",fontWeight:600,fontFamily:T.font}}>
          + Register New Garage
        </button>
      )}
    </div>
  );
}

// ── Flash toast ───────────────────────────────────────────────
function Flash({ msg }) {
  if (!msg) return null;
  return (
    <div style={{position:"fixed",bottom:20,left:"50%",transform:"translateX(-50%)",
      background:"#F5F4F0",color:T.text,border:"1px solid #00A884",
      borderRadius:20,padding:"10px 20px",fontSize:13,fontWeight:600,
      fontFamily:T.font,boxShadow:"0 4px 16px rgba(0,0,0,0.5)",
      zIndex:9999,whiteSpace:"nowrap"}}>
      {msg}
    </div>
  );
}

// ── Root App ──────────────────────────────────────────────────
export default function GarageCom() {
  const [jobs, jobDispatch] = useReducer(jobReducer, DEMO_JOBS);
  const [expenses, setExpenses] = useState([
    {id:1,date:dAgo(0),desc:"Electricity Bill",amount:2400,category:"Utilities"},
    {id:2,date:dAgo(1),desc:"Workshop cleaning",amount:500,category:"Maintenance"},
    {id:3,date:dAgo(2),desc:"Lunch for staff",amount:800,category:"Staff"},
  ]);
  const [inventory, setInventory] = useState([
    {id:1,name:"Bosch Oil Filter",sku:"BOF-001",stock:12,minStock:5,cost:280,category:"Filters"},
    {id:2,name:"NGK Spark Plug",sku:"NSP-004",stock:24,minStock:10,cost:120,category:"Electrical"},
    {id:3,name:"Brake Pad Set (Front)",sku:"BPF-010",stock:3,minStock:4,cost:850,category:"Brakes"},
    {id:4,name:"Engine Oil 5W30 (1L)",sku:"EO5-001",stock:18,minStock:8,cost:450,category:"Oils"},
    {id:5,name:"Air Filter Universal",sku:"AFU-002",stock:7,minStock:5,cost:220,category:"Filters"},
    {id:6,name:"Coolant (1L)",sku:"CLT-001",stock:10,minStock:6,cost:180,category:"Fluids"},
    {id:7,name:"Wiper Blade Pair",sku:"WBP-003",stock:5,minStock:3,cost:350,category:"Accessories"},
    {id:8,name:"Battery 12V 65Ah",sku:"BAT-065",stock:2,minStock:2,cost:4200,category:"Electrical"},
  ]);
  const [user,  setUser]   = useState(null);
  const [garageReg, setGarageReg] = useState(false); // false=show welcome screen first
  const [showSelector, setShowSelector] = useState(true); // show garage selector after welcome
  const [lang,  setLang]   = useState("en");
  const [tab,   setTab]    = useState("jobs"); // chat | jobs | checkin | job
  const [selJobId, setSelJobId] = useState(null);
  const [navHistory, setNavHistory] = useState(["jobs"]);
  const [flash, setFlash] = useState("");
  const flashRef = useRef(null);
  const showFlash = useCallback((msg) => {
    setFlash(msg);
    if(flashRef.current) clearTimeout(flashRef.current);
    flashRef.current = setTimeout(()=>setFlash(""), 2500);
  },[]);

  // Navigation helper
  const navTo = useCallback((newTab, jobNo) => {
    setTab(prev => {
      setNavHistory(h => [...h.slice(-15), prev==="job"?"job:"+selJobId:prev]);
      return newTab;
    });
    if(jobNo !== undefined) setSelJobId(jobNo);
  }, [selJobId]);
  const [staffMsgs, setStaffMsgs] = useState([
    {by:"System",note:(()=>{
      const dayOfYear=Math.floor((Date.now()-new Date(new Date().getFullYear(),0,0))/86400000);
      return "📜 "+TAMIL_QUOTES[dayOfYear%TAMIL_QUOTES.length];
    })(),time:"09:00",type:"text"},
    {by:"Arjun",note:"Good morning team! Today we have 4 vehicles. Let's finish on time 💪",time:"09:05 am",type:"text"},
    {by:"Priya",note:"Good morning sir. Swift customer is here for check-in",time:"09:10 am",type:"text"},
    {by:"Raju",note:"Morning all. I'll start on the Swift brake job",time:"09:12 am",type:"text"},
    {by:"Kumar",note:"Nexon clutch parts arrived. Starting work now",time:"09:30 am",type:"text"},
    {by:"Senthil",note:"AC compressor for Creta — do we have stock?",time:"10:15 am",type:"text"},
    {by:"Priya",note:"Checking inventory... Yes, 1 unit available",time:"10:18 am",type:"text"},
    {by:"Arjun",note:"Senthil, proceed with the AC work. Priya, bill the compressor",time:"10:20 am",type:"text"},
  ]);
  const [dmMsgs, setDmMsgs] = useState({
    "1-3": [ // Arjun ↔ Raju
      {by:"Arjun",note:"Raju, Swift front brake pad work started?",time:"09:15 am",type:"text"},
      {by:"Raju",note:"Yes sir, removing old pads now. Will update in 30 min",time:"09:18 am",type:"text"},
      {by:"Arjun",note:"Good. Check disc also while you're at it",time:"09:20 am",type:"text"},
      {by:"Raju",note:"Disc is fine sir, only pads needed replacement",time:"09:45 am",type:"text"},
      {by:"Raju",note:"Brake pad work done. Test drive pending",time:"10:30 am",type:"text"},
    ],
    "1-2": [ // Arjun ↔ Priya
      {by:"Priya",note:"Sir, Nexon customer called asking about delivery",time:"10:00 am",type:"text"},
      {by:"Arjun",note:"Tell them tomorrow by 5pm. Clutch work is almost done",time:"10:05 am",type:"text"},
      {by:"Priya",note:"Ok sir, I'll inform them",time:"10:06 am",type:"text"},
    ],
    "1-4": [ // Arjun ↔ Kumar
      {by:"Kumar",note:"Sir, Nexon clutch assembly completed",time:"02:00 pm",type:"text"},
      {by:"Arjun",note:"Great work Kumar. Do test drive and update",time:"02:05 pm",type:"text"},
    ],
  });

  const dispatch = useCallback((type, payload) => {
    if(type==="CHANGE_STATUS" && user && user.role!=="mechanic") {
      const j = jobs.find(j=>j.jobNo===payload.jobNo);
      if(j) {
        if(payload.status==="in_progress")
          setTimeout(()=>sendWA(j.phone,"🔧 *"+GARAGE.name+"*\n\nHi "+j.name+", we have started work on your *"+j.regNo+"*.\nWe will keep you updated!\n\nThank you! 🙏"), 400);
        if(payload.status==="completed")
          setTimeout(()=>sendWA(j.phone,"✅ *"+GARAGE.name+"*\n\nHi "+j.name+", your vehicle *"+j.regNo+"* is ready for pickup!\n\nPlease call us.\n📞 "+GARAGE.phone+"\n\nThank you! 🙏"), 400);
      }
    }
    jobDispatch({type, payload});
  },[jobs, user]);

  const sendStaffMsg = useCallback((msg) => {
    setStaffMsgs(m=>[...m,{
      ...msg,
      by: user&&user.name||"?",
      time: new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true}),
    }]);
  },[user]);

  const sendDM = useCallback((targetId, msg) => {
    const newMsg = {
      ...msg,
      by: user&&user.name||"?",
      time: new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true}),
    };
    setDmMsgs(prev => {
      const key = [user.id, targetId].sort().join("-");
      return {...prev, [key]: [...(prev[key]||[]), newMsg]};
    });
  },[user]);

  const selectedJob = jobs.find(j=>j.jobNo===selJobId)||null;

  // Active vehicle plates (not delivered) for auto-linking
  const activePlates = jobs.filter(j=>j.status!=="delivered").map(j=>({plate:j.regNo,jobNo:j.jobNo}));

  const openJob = (jobNo) => { navTo("job", jobNo); };

  if(!garageReg) return <GarageRegScreen onDone={()=>{setGarageReg(true);setShowSelector(false);}} lang={lang} setLang={setLang}
    onExisting={()=>{setGarageReg(true);setShowSelector(true);}}/>;
  if(!user&&showSelector) return <GarageSelectorScreen
    onSelect={(g)=>{
      GARAGE.name=g.name;GARAGE.phone=g.phone;GARAGE.address=g.address;GARAGE.email=g.email;GARAGE.gst=g.gst||"";
      USERS.length=0;g.users.forEach(u=>USERS.push(u));
      MECHANICS=USERS.filter(u=>u.role==="mechanic");
      setShowSelector(false);
    }}
    onNewGarage={()=>setGarageReg(false)}
    onBack={()=>{setGarageReg(false);}}
    lang={lang}/>;
  if(!user) return <LoginScreen onLogin={setUser}
    onBack={()=>setShowSelector(true)}
    onNewGarage={()=>setGarageReg(false)} lang={lang} setLang={setLang}/>;

  const isMech = user.role==="mechanic";

  // Bottom tab config
  const tabs = [
    {k:"jobs",label:"Jobs"},
    {k:"chat",label:"Chat"},
    {k:"contacts",label:"Contacts"},
    {k:"more",label:"More"},
  ];

  return (
    <div style={{
      width:"100%",height:"100vh",maxWidth:480,margin:"0 auto",
      background:"#FAFAF8",display:"flex",flexDirection:"column",
      overflow:"hidden",position:"relative",fontFamily:T.font,
    }}>
      <style>{"\n        * { box-sizing:border-box; margin:0; padding:0; }\n        ::-webkit-scrollbar { width:3px; }\n        ::-webkit-scrollbar-thumb { background:#2A2723; border-radius:2px; }\n        input, textarea, button { font-family:inherit; }\n        input:focus, textarea:focus { outline:none; }\n        ::placeholder { color:#5E6155 !important; }\n      "}</style>

      <div style={{flex:1,display:"flex",flexDirection:"column",minHeight:0}}>

        {/* GROUP CHAT — Home screen */}
        {tab==="chat"&&(
          <GarageGroupChat
            user={user} staffMsgs={staffMsgs} onSend={sendStaffMsg}
            dmMsgs={dmMsgs} onSendDM={sendDM}
            activePlates={activePlates} onOpenJob={openJob}
            lang={lang} setLang={setLang} onLogout={()=>setUser(null)}
          />
        )}

        {/* JOBS LIST */}
        {tab==="jobs"&&(
          <JobListScreen
            jobs={jobs} user={user} staffMsgs={staffMsgs}
            onSelect={id=>{navTo("job",id);}}
            onNewCheckin={()=>navTo("checkin")}
            onStaffChat={()=>navTo("chat")}
            onLogout={()=>setUser(null)}
            lang={lang} setLang={setLang}
            expenses={expenses} setExpenses={setExpenses} inventory={inventory} setInventory={setInventory}
          />
        )}

        {/* JOB DETAIL */}
        {tab==="job"&&(
          isMech
            ? <MechanicChat job={selectedJob} user={user} jobs={jobs} lang={lang}
                dispatch={dispatch} showFlash={showFlash} onBack={()=>navTo("jobs")}/>
            : <ChatPanel job={selectedJob} user={user} jobs={jobs} lang={lang}
                dispatch={dispatch} showFlash={showFlash}
                onStartCheckin={()=>navTo("checkin")} onBack={()=>navTo("jobs")}/>
        )}

        {/* CHECK-IN */}
        {tab==="checkin"&&(
          <CheckinBot user={user} jobs={jobs} lang={lang}
            dispatch={dispatch} showFlash={showFlash}
            onDone={jobNo=>{navTo("job",jobNo);}}
            onBack={()=>navTo("chat")}
          />
        )}

        {/* MORE / SETTINGS */}
        {tab==="more"&&(
          <MoreScreen user={user} jobs={jobs} lang={lang} setLang={setLang}
            onLogout={()=>setUser(null)} onDashboard={null} showFlash={showFlash}/>
        )}

        {/* CONTACTS */}
        {tab==="contacts"&&(
          <ContactsScreen jobs={jobs} user={user} showFlash={showFlash}
            onOpenJob={(jobNo)=>navTo("job",jobNo)}/>
        )}

      </div>

      {/* ── BOTTOM TAB BAR — always visible ── */}
      <div style={{display:"flex",background:"#FFFFFF",borderTop:"0.5px solid #E5E4DF",
        padding:"4px 0 env(safe-area-inset-bottom,6px)",flexShrink:0}}>
        {tabs.map(t=>{
          const isActive = tab===t.k||(t.k==="jobs"&&tab==="job")||(t.k==="jobs"&&tab==="checkin");
          const iconColor = isActive ? "#3B6D11" : "#B4B2A9";
          return (
            <button key={t.k} onClick={()=>navTo(t.k)}
              style={{flex:1,border:"none",background:"transparent",cursor:"pointer",
                display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"6px 0"}}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                {t.k==="jobs"&&<><rect x="3" y="3" width="18" height="18" rx="3" stroke={iconColor} strokeWidth="1.5"/><line x1="7" y1="8" x2="17" y2="8" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round"/><line x1="7" y1="12" x2="14" y2="12" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round"/><line x1="7" y1="16" x2="11" y2="16" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round"/></>}
                {t.k==="chat"&&<><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></>}
                {t.k==="contacts"&&<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round"/><circle cx="12" cy="7" r="4" stroke={iconColor} strokeWidth="1.5"/></>}
                {t.k==="more"&&<><circle cx="12" cy="12" r="3" stroke={iconColor} strokeWidth="1.5"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke={iconColor} strokeWidth="1.5"/></>}
              </svg>
              <span style={{fontSize:10,fontWeight:isActive?600:400,
                color:isActive?"#3B6D11":"#B4B2A9",fontFamily:T.font}}>{t.label}</span>
            </button>
          );
        })}
      </div>



      <Flash msg={flash}/>
    </div>
  );
}

// ── WAChat — Full WhatsApp-style chat sheet ──────────────────────────────
const WA_REACTIONS = ["👍","❤️","😂","😮","🙏","👏"];
function WAChat({ user, chatType, chatTitle, chatSub, dmTarget, allMsgs, msg, setMsg,
  sendMsg, closeChat, endRef, roleColor }) {

  const [reactions, setReactions]   = useState({});   // msgIndex → {emoji: count}
  const [reactionBar, setReactionBar] = useState(null); // msgIndex showing picker
  const [replyTo, setReplyTo]        = useState(null);  // {by, note}
  const [showPoll, setShowPoll]      = useState(false);
  const [pollQ, setPollQ]            = useState("");
  const [pollOpts, setPollOpts]      = useState(["",""]);
  const [polls, setPolls]            = useState([]);    // [{q, opts:[{label,votes:[]}]}]
  const [deletedMsgs, setDeletedMsgs] = useState({});
  const [showAttach, setShowAttach]  = useState(false);
  const [showStaffPicker, setShowStaffPicker] = useState(false);
  const msgAreaRef = useRef(null);
  const msgInputRef = useRef(null);

  const addReaction = (idx, emoji) => {
    setReactions(r => {
      const cur = r[idx] || {};
      const count = cur[emoji] || 0;
      return {...r, [idx]: {...cur, [emoji]: count + 1}};
    });
    setReactionBar(null);
  };

  const submitPoll = () => {
    const opts = pollOpts.filter(o => o.trim());
    if(!pollQ.trim() || opts.length < 2) return;
    setPolls(p => [...p, {q: pollQ, opts: opts.map(l=>({label:l, votes:[]}))}]);
    setPollQ(""); setPollOpts(["",""]); setShowPoll(false);
  };

  const votePoll = (pi, oi) => {
    setPolls(p => p.map((poll, i) => {
      if(i !== pi) return poll;
      const already = poll.opts.some(o => o.votes.includes(user.name));
      if(already) return poll;
      return {...poll, opts: poll.opts.map((o,j) =>
        j===oi ? {...o, votes:[...o.votes, user.name]} : o
      )};
    }));
  };

  const totalVotes = (poll) => poll.opts.reduce((s,o)=>s+o.votes.length,0);

  const WA_BG = "#FAFAF8";
  const WA_SENT = "#E8F5E9";
  const WA_RECV = "#FFFFFF";
  const WA_GREEN = "#3B6D11";
  const WA_TEAL = "#3B6D11";

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",background:WA_BG,overflow:"hidden",fontFamily:T.font}}>

        {/* ── Header ── */}
        <div style={{background:"linear-gradient(135deg, #3B6D11 0%, #27500A 100%)",padding:"10px 14px",
          display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
          <button onClick={closeChat}
            style={{background:"none",border:"none",cursor:"pointer",padding:"4px 6px 4px 0",lineHeight:1}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="#fff" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div style={{width:38,height:38,borderRadius:19,flexShrink:0,
            background:"rgba(255,255,255,.15)",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,
            border:"2px solid rgba(255,255,255,.3)"}}>
            {chatType==="group"?(
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="#fff" strokeWidth="1.5"/>
                <circle cx="9" cy="7" r="4" stroke="#fff" strokeWidth="1.5"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="#fff" strokeWidth="1.5"/>
              </svg>
            ):dmTarget?.avatar}
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:600,color:"#fff"}}>{chatTitle}</div>
            <div style={{display:"flex",alignItems:"center",gap:4,marginTop:1}}>
              <div style={{width:7,height:7,borderRadius:4,background:"#00E096"}}/>
              <span style={{fontSize:11,color:"#C0DD97",textTransform:"capitalize"}}>
                {chatType==="group"?USERS.length+" members · online":chatSub+" · online"}
              </span>
            </div>
          </div>
          <button style={{background:"none",border:"none",cursor:"pointer",padding:6,lineHeight:1}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="5" r="1.5" fill="rgba(255,255,255,.6)"/>
              <circle cx="12" cy="12" r="1.5" fill="rgba(255,255,255,.6)"/>
              <circle cx="12" cy="19" r="1.5" fill="rgba(255,255,255,.6)"/>
            </svg>
          </button>
        </div>

        {/* ── Messages area ── */}
        <div ref={msgAreaRef} style={{flex:1,overflowY:"auto",padding:"8px 10px",minHeight:0}}
          onClick={()=>{setReactionBar(null);setShowAttach(false);}}>

          {/* Polls pinned at top */}
          {polls.map((poll,pi)=>{
            const total = totalVotes(poll);
            const myVote = poll.opts.findIndex(o=>o.votes.includes(user.name));
            return (
              <div key={pi} style={{background:"#fff",borderRadius:12,margin:"6px 0",
                padding:"12px 14px",boxShadow:"0 1px 2px rgba(0,0,0,.1)"}}>
                <div style={{fontSize:13,fontWeight:700,color:"#1B1B1A",marginBottom:10,
                  borderBottom:"1px solid #F1EFE8",paddingBottom:8}}>
                  📊 {poll.q}
                </div>
                {poll.opts.map((opt,oi)=>{
                  const pct = total>0 ? Math.round((opt.votes.length/total)*100) : 0;
                  const voted = myVote===oi;
                  return (
                    <div key={oi} onClick={()=>votePoll(pi,oi)}
                      style={{marginBottom:8,cursor:"pointer"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                        <div style={{width:20,height:20,borderRadius:10,flexShrink:0,
                          background:voted?"#128C7E":"transparent",
                          border:"2px solid "+(voted?"#128C7E":"#ccc"),
                          display:"flex",alignItems:"center",justifyContent:"center"}}>
                          {voted&&<svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                            <path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
                          </svg>}
                        </div>
                        <span style={{fontSize:13,color:"#1B1B1A",flex:1}}>{opt.label}</span>
                        <span style={{fontSize:11,color:"#888780",fontFamily:T.mono}}>
                          {opt.votes.length} · {pct}%
                        </span>
                      </div>
                      <div style={{height:4,borderRadius:2,background:"#E5E4DF",marginLeft:28}}>
                        <div style={{height:"100%",borderRadius:2,background:WA_TEAL,
                          width:pct+"%",transition:"width .3s"}}/>
                      </div>
                    </div>
                  );
                })}
                <div style={{fontSize:10,color:"#888780",marginTop:6,textAlign:"right"}}>
                  {total} vote{total!==1?"s":""}
                </div>
              </div>
            );
          })}

          {allMsgs.length===0&&polls.length===0&&(
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",
              justifyContent:"center",height:"60%",gap:8}}>
              <div style={{fontSize:32}}>{chatType==="group"?"👥":dmTarget?.avatar}</div>
              <div style={{fontSize:12,color:"#888780",textAlign:"center",
                background:"rgba(255,255,255,0.8)",padding:"8px 16px",borderRadius:10}}>
                {chatType==="group"?"Send a message to the team":"Start chatting with "+chatTitle}
              </div>
            </div>
          )}

          {allMsgs.map((m,i)=>{
            const isMine = m.by===user.name;
            const isSystem = m.by==="System";
            const isDeleted = deletedMsgs[i];
            const msgReactions = reactions[i]||{};
            const hasReactions = Object.keys(msgReactions).length>0;
            const sender = USERS.find(u=>u.name===m.by);

            if(isSystem) return (
              <div key={i} style={{display:"flex",justifyContent:"center",margin:"6px 0"}}>
                <span style={{background:"rgba(255,255,255,0.85)",color:"#888780",fontSize:11,
                  padding:"4px 12px",borderRadius:10,boxShadow:"0 1px 2px rgba(0,0,0,.08)"}}>
                  {m.note}
                </span>
              </div>
            );

            return (
              <div key={i} style={{display:"flex",
                justifyContent:isMine?"flex-end":"flex-start",
                marginBottom:hasReactions?18:4,alignItems:"flex-end",gap:6,position:"relative"}}>

                {/* Avatar — received messages */}
                {!isMine&&(
                  <div style={{width:30,height:30,borderRadius:15,background:"#F1EFE8",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:15,flexShrink:0,marginBottom:hasReactions?16:2}}>
                    {sender?.avatar||(dmTarget?.avatar)||"?"}
                  </div>
                )}

                <div style={{maxWidth:"75%",position:"relative"}}>
                  {/* Bubble */}
                  <div
                    onClick={()=>setReactionBar(reactionBar===i?null:i)}
                    style={{
                      background:isDeleted?"rgba(255,255,255,0.6)":(isMine?WA_SENT:WA_RECV),
                      borderRadius:isMine?"12px 2px 12px 12px":"2px 12px 12px 12px",
                      padding:"7px 10px 5px",
                      boxShadow:"0 1px 2px rgba(0,0,0,.13)",
                      cursor:"pointer",
                      border:isDeleted?"1px solid #E5E4DF":"none"}}>

                    {/* Sender name in group */}
                    {!isMine&&chatType==="group"&&!isDeleted&&(
                      <div style={{fontSize:11,fontWeight:700,marginBottom:2,
                        color:roleColor(sender?.role||"")}}>
                        {m.by}
                      </div>
                    )}

                    {/* Reply preview */}
                    {m.replyTo&&(
                      <div style={{background:"rgba(0,0,0,0.06)",borderLeft:"3px solid "+WA_TEAL,
                        borderRadius:6,padding:"4px 8px",marginBottom:6}}>
                        <div style={{fontSize:10,fontWeight:700,color:WA_TEAL}}>{m.replyTo.by}</div>
                        <div style={{fontSize:11,color:"#555",overflow:"hidden",
                          textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:180}}>
                          {m.replyTo.note}
                        </div>
                      </div>
                    )}

                    {/* Message text */}
                    <div style={{fontSize:13,color:isDeleted?"#888780":"#1B1B1A",
                      lineHeight:1.45,wordBreak:"break-word",
                      fontStyle:isDeleted?"italic":"normal"}}>
                      {isDeleted?"🚫 This message was deleted":m.note}
                    </div>

                    {/* Time + tick */}
                    <div style={{display:"flex",justifyContent:"flex-end",
                      alignItems:"center",gap:3,marginTop:2}}>
                      <span style={{fontSize:10,color:"#888780"}}>{m.time}</span>
                      {isMine&&(
                        <svg width="14" height="10" viewBox="0 0 16 11" fill="none">
                          <path d="M1 5.5L5 9.5L15 1.5" stroke={WA_TEAL} strokeWidth="1.8" strokeLinecap="round"/>
                          <path d="M5 5.5L9 9.5L15 1.5" stroke={WA_TEAL} strokeWidth="1.8" strokeLinecap="round"/>
                        </svg>
                      )}
                    </div>
                  </div>

                  {/* Reaction picker */}
                  {reactionBar===i&&(
                    <div style={{position:"absolute",
                      bottom:"100%",
                      [isMine?"right":"left"]:0,
                      marginBottom:4,
                      background:"#fff",borderRadius:24,
                      boxShadow:"0 4px 16px rgba(0,0,0,.18)",
                      padding:"6px 10px",display:"flex",gap:6,zIndex:20}}>
                      {WA_REACTIONS.map(e=>(
                        <button key={e} onClick={()=>addReaction(i,e)}
                          style={{background:"none",border:"none",cursor:"pointer",
                            fontSize:20,padding:2,lineHeight:1}}>
                          {e}
                        </button>
                      ))}
                      {/* Reply button */}
                      <button onClick={()=>{setReplyTo({by:m.by,note:m.note});setReactionBar(null);}}
                        style={{background:"none",border:"none",cursor:"pointer",
                          padding:"2px 4px",lineHeight:1,color:"#888780"}}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M9 17l-5-5 5-5M20 18v-2a4 4 0 0 0-4-4H4"
                            stroke="#888780" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      {/* Admin delete */}
                      {user.role==="admin"&&(
                        <button onClick={()=>{setDeletedMsgs(d=>({...d,[i]:true}));setReactionBar(null);}}
                          style={{background:"none",border:"none",cursor:"pointer",
                            padding:"2px 4px",lineHeight:1,color:"#A32D2D"}}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <polyline points="3 6 5 6 21 6" stroke="#A32D2D" strokeWidth="2" strokeLinecap="round"/>
                            <path d="M19 6l-1 14H6L5 6" stroke="#A32D2D" strokeWidth="2" strokeLinecap="round"/>
                            <path d="M10 11v6M14 11v6" stroke="#A32D2D" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Reactions below bubble */}
                  {hasReactions&&(
                    <div style={{display:"flex",gap:4,marginTop:3,
                      justifyContent:isMine?"flex-end":"flex-start",flexWrap:"wrap"}}>
                      {Object.entries(msgReactions).map(([emoji,count])=>(
                        <span key={emoji}
                          style={{background:"#fff",borderRadius:12,padding:"2px 7px",
                            fontSize:12,boxShadow:"0 1px 3px rgba(0,0,0,.12)",
                            border:"1px solid #E5E4DF",cursor:"pointer"}}
                          onClick={()=>addReaction(i,emoji)}>
                          {emoji} {count}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={endRef}/>
        </div>

        {/* ── Reply preview bar ── */}
        {replyTo&&(
          <div style={{background:"#F1EFE8",borderTop:"1px solid #E5E4DF",
            padding:"6px 12px",display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
            <div style={{flex:1,borderLeft:"3px solid "+WA_TEAL,paddingLeft:8}}>
              <div style={{fontSize:11,fontWeight:700,color:WA_TEAL}}>{replyTo.by}</div>
              <div style={{fontSize:11,color:"#555",overflow:"hidden",
                textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{replyTo.note}</div>
            </div>
            <button onClick={()=>setReplyTo(null)}
              style={{background:"none",border:"none",cursor:"pointer",
                color:"#888780",fontSize:18,lineHeight:1}}>×</button>
          </div>
        )}

        {/* ── Poll creator ── */}
        {showPoll&&(
          <div style={{background:"#fff",borderTop:"1px solid #E5E4DF",
            padding:"12px 14px",flexShrink:0}}>
            <div style={{fontSize:12,fontWeight:700,color:"#1B1B1A",marginBottom:8}}>
              📊 Create Poll
            </div>
            <input value={pollQ} onChange={e=>setPollQ(e.target.value)}
              placeholder="Question..."
              style={{width:"100%",background:"#F1EFE8",border:"none",borderRadius:8,
                padding:"8px 12px",fontSize:13,fontFamily:T.font,color:"#1B1B1A",
                marginBottom:6,boxSizing:"border-box"}}/>
            {pollOpts.map((opt,oi)=>(
              <input key={oi} value={opt}
                onChange={e=>setPollOpts(o=>o.map((v,j)=>j===oi?e.target.value:v))}
                placeholder={"Option "+(oi+1)}
                style={{width:"100%",background:"#F1EFE8",border:"none",borderRadius:8,
                  padding:"7px 12px",fontSize:12,fontFamily:T.font,color:"#1B1B1A",
                  marginBottom:4,boxSizing:"border-box"}}/>
            ))}
            <div style={{display:"flex",gap:6,marginTop:4}}>
              <button onClick={()=>setPollOpts(o=>[...o,""])}
                style={{flex:1,padding:"7px",background:"#F1EFE8",border:"none",
                  borderRadius:8,fontSize:12,cursor:"pointer",color:"#3B6D11",fontWeight:600}}>
                + Option
              </button>
              <button onClick={()=>setShowPoll(false)}
                style={{flex:1,padding:"7px",background:"#F1EFE8",border:"none",
                  borderRadius:8,fontSize:12,cursor:"pointer",color:"#888780"}}>
                Cancel
              </button>
              <button onClick={submitPoll}
                style={{flex:1,padding:"7px",background:WA_TEAL,border:"none",
                  borderRadius:8,fontSize:12,cursor:"pointer",color:"#fff",fontWeight:600}}>
                Post Poll
              </button>
            </div>
          </div>
        )}

        {/* ── Emoji picker ── */}
        {showAttach&&(
          <div style={{background:"#fff",borderTop:"1px solid #E5E4DF",
            padding:"8px 12px",flexShrink:0,maxHeight:180,overflowY:"auto"}}>
            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
              {["😀","😂","😊","🙏","👍","👋","❤️","🔥","✅","⚠️","💪","🎉",
                "😅","😎","🤔","😮","😢","😡","🙄","🤝","👏","💯","⭐","🔧",
                "🚗","🛠️","✨","📞","💰","📋","⚡","🎯","🏠","📸","🔔","💬",
              ].map(e=>(
                <button key={e} onClick={()=>{setMsg(m=>m+e);setShowAttach(false);}}
                  style={{width:36,height:36,border:"none",background:"transparent",
                    cursor:"pointer",fontSize:20,borderRadius:8,
                    display:"flex",alignItems:"center",justifyContent:"center"}}
                  onMouseEnter={ev=>ev.currentTarget.style.background="#F1EFE8"}
                  onMouseLeave={ev=>ev.currentTarget.style.background="transparent"}>
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Input bar ── */}
        <div style={{background:"#fff",padding:"8px 10px",flexShrink:0,
          borderTop:"0.5px solid #E5E4DF",position:"relative"}}>

          {/* Staff picker menu */}
          {showStaffPicker&&chatType==="group"&&(
            <div style={{position:"absolute",bottom:"100%",left:0,marginBottom:6,
              background:"#FFFFFF",borderRadius:14,border:"1px solid #E5E4DF",
              boxShadow:"0 8px 24px rgba(0,0,0,.15)",minWidth:200,maxWidth:260,
              zIndex:20,overflow:"hidden"}}>
              <div style={{padding:"5px 10px",borderBottom:"1px solid #E5E4DF",
                display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span style={{fontSize:9,fontWeight:700,color:"#888780",letterSpacing:.3}}>STAFF MEMBERS</span>
                <button onClick={()=>setShowStaffPicker(false)}
                  style={{background:"none",border:"none",cursor:"pointer",color:"#888780",
                    fontSize:14,lineHeight:1,padding:"0 2px"}}>×</button>
              </div>
              {USERS.map((u,i)=>(
                <button key={u.id} onClick={()=>{
                  setMsg(m=>(m?m+" ":"")+"@"+u.name+" ");
                  setShowStaffPicker(false);
                  setTimeout(()=>msgInputRef.current?.focus(),100);
                }}
                  style={{width:"100%",display:"flex",alignItems:"center",gap:8,
                    padding:"7px 10px",background:"transparent",border:"none",
                    borderBottom:i<USERS.length-1?"1px solid #F1EFE8":"none",
                    cursor:"pointer",textAlign:"left"}}>
                  <span style={{fontSize:14,flexShrink:0}}>{u.avatar||"👤"}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:11,color:"#1B1B1A",fontWeight:600}}>{u.name}</div>
                    <div style={{fontSize:9,color:"#888780"}}>{u.role}</div>
                  </div>
                  {u.name===user.name&&<span style={{fontSize:8,color:"#3B6D11",fontWeight:600,
                    background:"#EAF3DE",padding:"1px 6px",borderRadius:8}}>You</span>}
                </button>
              ))}
            </div>
          )}

          <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
          {/* + button */}
          <button onClick={()=>setShowStaffPicker(v=>!v)}
            style={{width:42,height:42,borderRadius:21,
              background:showStaffPicker?"#3B6D11":"#E5E4DF",border:"none",cursor:"pointer",
              fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",
              flexShrink:0,fontWeight:700,color:showStaffPicker?"#fff":"#1B1B1A",
              transition:"all .15s"}}>
            {showStaffPicker?"×":"+"}
          </button>

          <div style={{flex:1,background:"#E5E4DF",borderRadius:22,padding:"8px 14px",display:"flex",alignItems:"center"}}>
            <textarea ref={msgInputRef} value={msg} onChange={e=>setMsg(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){
                e.preventDefault();
                sendMsg();
                setReplyTo(null);
              }}}
              placeholder={chatType==="group"?"Type a message...":"Message "+chatTitle+"..."}
              rows={1}
              style={{flex:1,background:"transparent",border:"none",outline:"none",
                resize:"none",fontSize:13,fontFamily:T.font,color:"#1B1B1A",
                lineHeight:1.5,padding:"2px 0",maxHeight:80,overflow:"auto"}}/>
          </div>

          {/* Send or Mic */}
          {msg.trim() ? (
            <button onClick={()=>{sendMsg();setReplyTo(null);}}
              style={{width:42,height:42,borderRadius:21,background:T.green,border:"none",
                cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
                flexShrink:0,boxShadow:"0 2px 6px rgba(59,109,17,.3)"}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="#fff"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ) : (
            <button onClick={()=>{
              if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia) return;
              navigator.mediaDevices.getUserMedia({audio:true}).then(stream=>{
                const recorder=new MediaRecorder(stream);
                const chunks=[];
                recorder.ondataavailable=e=>chunks.push(e.data);
                recorder.start();
                setTimeout(()=>{if(recorder.state==="recording")recorder.stop();},30000);
                const stopDiv=document.createElement("div");
                stopDiv.innerHTML="<div style='font-size:20px;margin-bottom:8px'>🔴</div>Recording...<br><small>Tap to stop</small>";
                stopDiv.style.cssText="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;padding:24px 36px;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.3);font-size:14px;cursor:pointer;z-index:99999;font-family:sans-serif;text-align:center";
                document.body.appendChild(stopDiv);
                stopDiv.onclick=()=>{if(recorder.state==="recording")recorder.stop();};
                recorder.onstop=()=>{
                  stream.getTracks().forEach(t=>t.stop());
                  stopDiv.remove();
                  const blob=new Blob(chunks,{type:"audio/webm"});
                  const reader=new FileReader();
                  reader.onload=(re)=>{
                    const note="Voice note";
                    if(chatType==="group") onSend({note,type:"text",isVoice:true,dataURL:re.target.result});
                    else if(dmTarget) onSendDM(dmTarget.id,{note,type:"text",isVoice:true,dataURL:re.target.result});
                  };
                  reader.readAsDataURL(blob);
                };
              }).catch(()=>{});
            }}
              style={{width:42,height:42,borderRadius:21,background:T.green,border:"none",
              cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
              flexShrink:0,boxShadow:"0 2px 6px rgba(59,109,17,.3)"}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" fill="#fff"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                <line x1="12" y1="19" x2="12" y2="23" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                <line x1="8" y1="23" x2="16" y2="23" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          )}
          </div>
        </div>
    </div>
  );
}

// ── GarageGroupChat — Horizontal avatar strip + WAChat overlay ──
function GarageGroupChat({ user, staffMsgs, onSend, dmMsgs, onSendDM, activePlates, onOpenJob, lang, setLang, onLogout }) {
  const [chatOpen, setChatOpen] = useState(false); // bottom sheet open
  const [chatType, setChatType] = useState(null);  // "group" | "dm"
  const [dmTarget, setDmTarget] = useState(null);
  const [msg, setMsg] = useState("");
  const endRef = useRef(null);

  const dmKey = dmTarget ? [user.id, dmTarget.id].sort().join("-") : "";
  const currentDMs = dmTarget ? (dmMsgs[dmKey]||[]) : [];
  const allMsgs = chatType==="group" ? staffMsgs : currentDMs;

  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); },[allMsgs.length, chatOpen]);

  const sendMsg = () => {
    if(!msg.trim()) return;
    if(chatType==="group") onSend({note:msg.trim(),type:"text"});
    else if(dmTarget) onSendDM(dmTarget.id, {note:msg.trim(),type:"text"});
    setMsg("");
  };

  const openGroup = () => { setDmTarget(null); setChatType("group"); setChatOpen(true); setMsg(""); };
  const openDM    = (u)  => { setDmTarget(u);  setChatType("dm");    setChatOpen(true); setMsg(""); };
  const closeChat = ()   => { setChatOpen(false); setTimeout(()=>{setChatType(null);setDmTarget(null);},300); };

  const getDMPreview = (u) => {
    const key = [user.id, u.id].sort().join("-");
    const msgs = dmMsgs[key]||[];
    if(msgs.length===0) return "";
    const last = msgs[msgs.length-1];
    return (last.by===user.name?"You: ":"")+((last.note||"").slice(0,22));
  };

  const groupUnread = staffMsgs.filter(m=>m.by!=="System").length;
  const roleColor   = r => r==="admin"?"#3B6D11":r==="receptionist"?"#185FA5":"#854F0B";
  const chatTitle   = chatType==="group"?"Team Chat":(dmTarget?.name||"");
  const chatSub     = chatType==="group"?USERS.length+" members":(dmTarget?.role||"");

  const [chatTab, setChatTab] = useState("dm"); // "dm" | "group"
  const totalDmUnread = USERS.filter(u=>u.id!==user.id).reduce((s,u)=>{
    const key=[user.id,u.id].sort().join("-");
    return s+(dmMsgs[key]||[]).filter(m=>m.by!==user.name).length;
  },0);

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",background:"#FAFAF8",overflow:"hidden"}}>

      {/* DM overlay — only when a person is tapped */}
      {chatOpen && chatType==="dm" ? (
        <WAChat
          user={user} chatType={chatType} chatTitle={chatTitle} chatSub={chatSub}
          dmTarget={dmTarget} allMsgs={allMsgs} msg={msg} setMsg={setMsg}
          sendMsg={sendMsg} closeChat={closeChat} endRef={endRef}
          roleColor={roleColor} onSend={onSend} onSendDM={onSendDM}
        />
      ) : (
        <>

      {/* Green header with avatar strip */}
      <div style={{background:"linear-gradient(135deg, #3B6D11 0%, #27500A 100%)",
        padding:"14px 16px 12px",flexShrink:0}}>
        <div style={{fontSize:14,fontWeight:700,color:"#fff",fontFamily:T.font,marginBottom:10}}>
          Team Chat
          <span style={{fontSize:11,fontWeight:400,color:"#C0DD97",marginLeft:8}}>
            {USERS.length} members
          </span>
        </div>

        {/* Staff avatars — tap to DM */}
        <div style={{display:"flex",gap:10,overflowX:"auto",scrollbarWidth:"none",paddingBottom:2}}>
          {USERS.filter(u=>u.id!==user.id).map(u=>{
            const key=[user.id,u.id].sort().join("-");
            const hasDM = (dmMsgs[key]||[]).length>0;
            const unread = (dmMsgs[key]||[]).filter(m=>m.by!==user.name).length;
            return (
              <div key={u.id} onClick={()=>openDM(u)}
                style={{display:"flex",flexDirection:"column",alignItems:"center",
                  gap:3,cursor:"pointer",flexShrink:0}}>
                <div style={{position:"relative"}}>
                  <div style={{width:42,height:42,borderRadius:21,
                    background:"rgba(255,255,255,.12)",
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,
                    border:"2px solid rgba(255,255,255,.25)"}}>
                    {u.avatar}
                  </div>
                  {hasDM&&(
                    <div style={{position:"absolute",bottom:0,right:0,width:11,height:11,
                      borderRadius:6,background:"#00E096",border:"2px solid #27500A"}}/>
                  )}
                  {unread>0&&(
                    <div style={{position:"absolute",top:-3,right:-3,minWidth:16,height:16,borderRadius:8,
                      background:"#F0AD00",display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:9,fontWeight:800,color:"#fff",border:"2px solid #27500A",padding:"0 3px"}}>
                      {unread}
                    </div>
                  )}
                </div>
                <span style={{fontSize:9,color:"rgba(255,255,255,.7)",fontWeight:500,
                  maxWidth:42,textAlign:"center",overflow:"hidden",textOverflow:"ellipsis",
                  whiteSpace:"nowrap"}}>{u.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Team chat messages */}
      <div style={{flex:1,overflowY:"auto",padding:"8px 10px",minHeight:0}}>
        {staffMsgs.map((m,i)=>{
          const isMine = m.by===user.name;
          const isSystem = m.by==="System";
          const sender = USERS.find(u=>u.name===m.by);

          if(isSystem) return (
            <div key={i} style={{display:"flex",justifyContent:"center",margin:"6px 0"}}>
              <span style={{background:"#F1EFE8",color:"#888780",fontSize:11,
                padding:"4px 12px",borderRadius:10}}>
                {m.note}
              </span>
            </div>
          );

          return (
            <div key={i} style={{display:"flex",
              justifyContent:isMine?"flex-end":"flex-start",
              marginBottom:4,alignItems:"flex-end",gap:6}}>
              {!isMine&&(
                <div style={{width:28,height:28,borderRadius:14,background:"#F1EFE8",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:14,flexShrink:0,marginBottom:2}}>
                  {sender?.avatar||"?"}
                </div>
              )}
              <div style={{maxWidth:"75%"}}>
                <div style={{
                  background:isMine?"#E8F5E9":"#FFFFFF",
                  borderRadius:isMine?"12px 2px 12px 12px":"2px 12px 12px 12px",
                  padding:"7px 10px 5px",
                  boxShadow:"0 1px 2px rgba(0,0,0,.08)"}}>
                  {!isMine&&(
                    <div style={{fontSize:11,fontWeight:700,marginBottom:2,
                      color:roleColor(sender?.role||"")}}>
                      {m.by}
                    </div>
                  )}
                  <div style={{fontSize:13,color:"#1B1B1A",lineHeight:1.45,wordBreak:"break-word"}}>
                    {m.note}
                  </div>
                  <div style={{display:"flex",justifyContent:"flex-end",alignItems:"center",gap:3,marginTop:2}}>
                    <span style={{fontSize:10,color:"#888780"}}>{m.time}</span>
                    {isMine&&(
                      <svg width="14" height="10" viewBox="0 0 16 11" fill="none">
                        <path d="M1 5.5L5 9.5L15 1.5" stroke="#3B6D11" strokeWidth="1.8" strokeLinecap="round"/>
                        <path d="M5 5.5L9 9.5L15 1.5" stroke="#3B6D11" strokeWidth="1.8" strokeLinecap="round"/>
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef}/>
      </div>

      {/* Message input */}
      <div style={{padding:"8px 10px",background:"#fff",borderTop:"0.5px solid #E5E4DF",
        display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
        <div style={{flex:1,display:"flex",alignItems:"center",background:"#F5F4F0",
          borderRadius:22,padding:"0 14px",border:"1px solid #E5E4DF"}}>
          <input value={msg} onChange={e=>setMsg(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter")sendMsg();}}
            placeholder="Type a message..."
            style={{flex:1,padding:"10px 0",border:"none",background:"transparent",
              fontSize:13,color:"#1B1B1A",outline:"none",fontFamily:T.font}}/>
        </div>
        <button onClick={sendMsg}
          style={{width:40,height:40,borderRadius:20,
            background:msg.trim()?"#3B6D11":"#E5E4DF",border:"none",
            cursor:msg.trim()?"pointer":"default",
            display:"flex",alignItems:"center",justifyContent:"center",
            flexShrink:0,transition:"background .2s"}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="#fff"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

        </>
      )}
    </div>
  );
}

// ── Contacts Screen — auto-populated from jobs ───────────────
function ContactsScreen({ jobs, user, showFlash, onOpenJob }) {
  const [search, setSearch] = useState("");
  const [selContact, setSelContact] = useState(null); // selected contact for detail

  // Auto-extract unique contacts from all jobs
  const contacts = (() => {
    const map = {};
    jobs.forEach(j => {
      const phone = (j.phone || "").trim();
      if (!phone) return;
      const key = phone.replace(/\D/g, "");
      if (!map[key]) {
        map[key] = { name: j.name, phone: j.phone, vehicles: [], totalJobs: 0, lastVisit: "", firstVisit: j.date, totalSpent: 0, totalBilled: 0 };
      }
      map[key].totalJobs++;
      if (!map[key].vehicles.find(v => v.regNo === j.regNo)) {
        map[key].vehicles.push({ regNo: j.regNo, brand: j.brand, model: j.model, kms: j.kms });
      }
      if (j.date > map[key].lastVisit) map[key].lastVisit = j.date;
      if (j.date < map[key].firstVisit) map[key].firstVisit = j.date;
      map[key].totalSpent += (j.payments || []).reduce((s, p) => s + p.amount, 0);
      map[key].totalBilled += (j.totalAmount || 0);
      map[key].jobNos = [...(map[key].jobNos || []), j.jobNo];
    });
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
  })();

  const filtered = search.trim()
    ? contacts.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search) ||
        c.vehicles.some(v => v.regNo.toLowerCase().includes(search.toLowerCase())))
    : contacts;

  const grouped = {};
  filtered.forEach(c => {
    const letter = (c.name[0] || "#").toUpperCase();
    if (!grouped[letter]) grouped[letter] = [];
    grouped[letter].push(c);
  });
  const letters = Object.keys(grouped).sort();

  // Customer Detail View
  if(selContact) {
    const c = selContact;
    const custJobs = jobs.filter(j=>(j.phone||"").replace(/\D/g,"")===(c.phone||"").replace(/\D/g,""))
      .sort((a,b)=>(b.date||"").localeCompare(a.date||""));
    const totalDue = c.totalBilled - c.totalSpent;
    const firstYear = c.firstVisit ? new Date(c.firstVisit).getFullYear() : "";
    const yearsAsCustomer = firstYear ? (new Date().getFullYear() - firstYear) : 0;

    return (
      <div style={{flex:1,display:"flex",flexDirection:"column",background:"#FAFAF8",overflow:"hidden"}}>
        {/* Green header */}
        <div style={{background:"linear-gradient(135deg, #3B6D11 0%, #27500A 100%)",
          padding:"14px 16px",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <button onClick={()=>setSelContact(null)}
              style={{background:"none",border:"none",cursor:"pointer",padding:"2px"}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M19 12H5M12 19l-7-7 7-7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <div style={{width:44,height:44,borderRadius:22,background:"rgba(255,255,255,.15)",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:18,fontWeight:700,color:"#fff",border:"2px solid rgba(255,255,255,.3)"}}>
              {c.name.charAt(0).toUpperCase()}
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:16,fontWeight:700,color:"#fff",fontFamily:T.font}}>{c.name}</div>
              <div style={{fontSize:11,color:"#C0DD97",fontFamily:T.mono}}>{c.phone}</div>
            </div>
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>{try{window.open("tel:"+c.phone);}catch(e){}}}
                style={{width:32,height:32,borderRadius:16,background:"rgba(255,255,255,.15)",
                  border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"
                    stroke="#fff" strokeWidth="1.5"/>
                </svg>
              </button>
              <button onClick={()=>sendWA(c.phone,"Hi "+c.name+"! This is "+GARAGE.name+". How can we help?")}
                style={{width:32,height:32,borderRadius:16,background:"rgba(255,255,255,.15)",
                  border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                    stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6,padding:"12px 12px 8px"}}>
          {[
            {v:c.totalJobs,l:"Visits",c:T.green},
            {v:yearsAsCustomer>0?yearsAsCustomer+"y":"New",l:"Customer",c:"#185FA5"},
            {v:"₹"+fmtINR(c.totalSpent),l:"Paid",c:T.green},
            {v:totalDue>0?"₹"+fmtINR(totalDue):"₹0",l:totalDue>0?"Due":"No dues",c:totalDue>0?"#A32D2D":T.green},
          ].map((s,i)=>(
            <div key={i} style={{background:"#fff",borderRadius:10,padding:"10px 6px",textAlign:"center",
              border:"1px solid #E5E4DF"}}>
              <div style={{fontSize:14,fontWeight:700,color:s.c,fontFamily:T.mono}}>{s.v}</div>
              <div style={{fontSize:9,color:T.textMuted,marginTop:2}}>{s.l}</div>
            </div>
          ))}
        </div>

        <div style={{flex:1,overflowY:"auto",padding:"0 12px 12px"}}>

          {/* Vehicles */}
          <div style={{fontSize:10,fontWeight:700,color:T.textMuted,letterSpacing:.3,padding:"8px 4px 6px"}}>
            VEHICLES ({c.vehicles.length})
          </div>
          {c.vehicles.map((v,vi)=>(
            <div key={vi} style={{background:"#fff",borderRadius:10,padding:"10px 12px",
              border:"1px solid #E5E4DF",marginBottom:6,display:"flex",alignItems:"center",gap:10}}>
              <div style={{fontSize:20}}>🚗</div>
              <div style={{flex:1}}>
                <div style={{background:"#FFFDE7",borderRadius:5,padding:"3px 8px",display:"inline-block",
                  border:"1.5px solid #333",marginBottom:3}}>
                  <span style={{fontFamily:T.mono,fontWeight:900,fontSize:12,color:T.text,letterSpacing:2}}>{v.regNo}</span>
                </div>
                <div style={{fontSize:11,color:T.textMuted}}>{v.brand} {v.model}{v.kms?" · "+v.kms+" km":""}</div>
              </div>
            </div>
          ))}

          {/* Visit History Timeline */}
          <div style={{fontSize:10,fontWeight:700,color:T.textMuted,letterSpacing:.3,padding:"12px 4px 6px"}}>
            SERVICE HISTORY ({custJobs.length})
          </div>
          {custJobs.map((j,ji)=>{
            const sm=STATUS_META[j.status]||{};
            const paid=(j.payments||[]).reduce((s,p)=>s+p.amount,0);
            const bal=Math.max(0,(j.totalAmount||0)-paid);
            const mech=MECHANICS.find(m=>m.id===j.assignedTo);
            return (
              <div key={j.jobNo} onClick={()=>onOpenJob(j.jobNo)}
                style={{background:"#fff",borderRadius:10,border:"1px solid #E5E4DF",
                  marginBottom:8,overflow:"hidden",cursor:"pointer"}}
                onMouseEnter={e=>e.currentTarget.style.borderColor=T.green}
                onMouseLeave={e=>e.currentTarget.style.borderColor="#E5E4DF"}>
                {/* Job header */}
                <div style={{padding:"10px 12px",display:"flex",alignItems:"center",gap:8,
                  borderBottom:"1px solid #F1EFE8"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,flex:1}}>
                    <div style={{width:8,height:8,borderRadius:4,background:sm.color||"#888",flexShrink:0}}/>
                    <span style={{fontSize:12,fontWeight:700,color:T.text,fontFamily:T.mono}}>#{j.jobNo}</span>
                    <span style={{fontSize:10,color:T.textMuted}}>{fmtDate(j.date)}</span>
                  </div>
                  <span style={{fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:6,
                    background:(sm.color||"#888")+"15",color:sm.color||T.textMuted}}>{sm.label||j.status}</span>
                </div>
                {/* Vehicle + services */}
                <div style={{padding:"8px 12px"}}>
                  <div style={{fontSize:11,fontFamily:T.mono,fontWeight:600,color:T.text,marginBottom:4}}>
                    {j.regNo} · {j.brand} {j.model}
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:6}}>
                    {(j.items||[]).map((it,ii)=>(
                      <span key={ii} style={{fontSize:10,padding:"2px 8px",borderRadius:12,
                        background:"#F1EFE8",color:T.text,fontFamily:T.font}}>
                        {it.complaint}
                      </span>
                    ))}
                  </div>
                  {/* Amount + mechanic */}
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div style={{fontSize:11,color:T.textMuted}}>
                      {mech?mech.avatar+" "+mech.name:"Unassigned"}
                    </div>
                    <div style={{textAlign:"right"}}>
                      <span style={{fontSize:13,fontWeight:700,fontFamily:T.mono,color:T.green}}>
                        ₹{fmtINR(j.totalAmount||0)}
                      </span>
                      {bal>0&&(
                        <span style={{fontSize:10,color:"#A32D2D",marginLeft:6,fontFamily:T.mono}}>
                          Due: ₹{fmtINR(bal)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {custJobs.length===0&&(
            <div style={{textAlign:"center",padding:20,color:T.textMuted,fontSize:12}}>No visit history</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#FAFAF8", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ background: "#FFFFFF", padding: "16px 16px 12px", borderBottom: "0.5px solid #E5E4DF" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.text, fontFamily: T.font }}>Contacts</div>
          <span style={{ fontSize: 12, color: T.textMuted, fontFamily: T.mono, fontWeight: 600 }}>
            {contacts.length} customers
          </span>
        </div>
        {/* Search */}
        <div style={{display:"flex",alignItems:"center",background:"#F1EFE8",borderRadius:24,padding:"9px 16px",gap:8}}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, phone, or vehicle..."
            style={{flex:1,background:"transparent",border:"none",outline:"none",
              fontSize:13,color:T.text,fontFamily:T.font}} />
          {search ? (
            <button onClick={() => setSearch("")}
              style={{background:"none",border:"none",cursor:"pointer",color:"#888780",
                fontSize:18,lineHeight:1,padding:0}}>×</button>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="#888780" strokeWidth="1.6"/>
              <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="#888780" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          )}
        </div>
      </div>

      {/* Contact list */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>👤</div>
            <div style={{ fontSize: 13, color: T.textMuted, fontFamily: T.font }}>
              {search ? "No contacts match \"" + search + "\"" : "Contacts will appear here after check-in"}
            </div>
          </div>
        ) : (
          letters.map(letter => (
            <div key={letter}>
              {/* Letter header */}
              <div style={{ padding: "6px 16px", background: "#F5F4F0",
                fontSize: 11, fontWeight: 700, color: T.green, fontFamily: T.font,
                position: "sticky", top: 0, zIndex: 1, borderBottom: "0.5px solid #E5E4DF" }}>
                {letter}
              </div>
              {grouped[letter].map((c, ci) => (
                <div key={ci} style={{ display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 16px", borderBottom: "0.5px solid #E5E4DF", cursor: "pointer",
                  background: "#FFFFFF" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#F5F4F0"}
                  onMouseLeave={e => e.currentTarget.style.background = "#FFFFFF"}>

                  {/* Avatar */}
                  <div style={{ width: 42, height: 42, borderRadius: 21, background: "#EAF3DE",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16, fontWeight: 700, color: T.green, fontFamily: T.font, flexShrink: 0 }}>
                    {c.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: T.text, fontFamily: T.font,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: T.textMuted, fontFamily: T.mono, marginTop: 1 }}>{c.phone}</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
                      {c.vehicles.map((v, vi) => (
                        <span key={vi} style={{ fontSize: 9, padding: "1px 6px", borderRadius: 4,
                          background: "#F1EFE8", color: T.textMuted, fontFamily: T.mono, fontWeight: 600 }}>
                          {v.regNo}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Right side — stats + actions */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                    <div style={{ fontSize: 10, color: T.textMuted, fontFamily: T.font }}>
                      {c.totalJobs} visit{c.totalJobs > 1 ? "s" : ""}
                    </div>
                    {c.totalSpent > 0 && (
                      <div style={{ fontSize: 10, color: T.green, fontFamily: T.mono, fontWeight: 700 }}>
                        ₹{fmtINR(c.totalSpent)}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 4 }}>
                      {/* Call */}
                      <button onClick={(e) => { e.stopPropagation(); try { window.open("tel:" + c.phone); } catch (err) { } }}
                        style={{ width: 28, height: 28, borderRadius: 14, background: "#EAF3DE",
                          border: "none", cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"
                            stroke={T.green} strokeWidth="1.5" />
                        </svg>
                      </button>
                      {/* WhatsApp */}
                      <button onClick={(e) => { e.stopPropagation(); sendWA(c.phone, "Hi " + c.name + "! This is " + GARAGE.name + ". How can we help you today?"); }}
                        style={{ width: 28, height: 28, borderRadius: 14, background: "#EAF3DE",
                          border: "none", cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                            stroke={T.green} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function MoreScreen({ user, jobs, lang, setLang, onLogout, showFlash }) {
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [staffList, setStaffList] = useState(USERS);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("mechanic");
  const [newPhone, setNewPhone] = useState("");
  const [newPin, setNewPin] = useState("");
  const [openPanel, setOpenPanel] = useState(null); // "notif"|"print"|"help"|"contact"
  const [notifJob, setNotifJob] = useState(true);
  const [notifPay, setNotifPay] = useState(true);
  const [notifRemind, setNotifRemind] = useState(true);
  const [printHeader, setPrintHeader] = useState(true);
  const [printGst, setPrintGst] = useState(false);
  const [printTerms, setPrintTerms] = useState("Vehicle will be parked at owner's risk. Not responsible for delays due to parts availability.");
  const ac = jobs.filter(j=>["open","in_progress"].includes(j.status)).length;
  const qc = jobs.filter(j=>j.status==="completed").length;
  const dn = jobs.filter(j=>j.status==="delivered").length;
  const rev = jobs.reduce((s,j)=>(j.payments||[]).reduce((t,p)=>t+p.amount,s),0);
  const dues = jobs.reduce((s,j)=>{const p=(j.payments||[]).reduce((t,pp)=>t+pp.amount,0);return s+Math.max(0,(j.totalAmount||0)-p);},0);
  const _sH={padding:"7px 14px",background:"#F5F4F0",borderBottom:"1px solid #E5E4DF"};
  const _chev = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="#C5C4BF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;

  const roleAvatars = {mechanic:["🔧","⚙️","🛠️","🔩"],receptionist:["👩‍💻","📋","📞","🖥️"]};
  const addStaff = () => {
    if(!newName.trim()||!newPin.trim()) return;
    const id = Math.max(...staffList.map(u=>u.id))+1;
    const avatars = roleAvatars[newRole]||["👤"];
    const avatar = avatars[id%avatars.length];
    const newUser = {id,name:newName.trim(),role:newRole,avatar,phone:newPhone.trim()||undefined,pin:newPin.trim()};
    USERS.push(newUser);
    MECHANICS = USERS.filter(u=>u.role==="mechanic");
    setStaffList([...USERS]);
    setNewName("");setNewPhone("");setNewPin("");setNewRole("mechanic");setShowAddStaff(false);
    showFlash("✅ "+newName.trim()+" added as "+newRole);
  };

  const removeStaff = (id) => {
    if(id===user.id) return;
    const u = staffList.find(s=>s.id===id);
    USERS = USERS.filter(s=>s.id!==id);
    MECHANICS = USERS.filter(s=>s.role==="mechanic");
    setStaffList([...USERS]);
    showFlash("Removed "+((u||{}).name||"staff"));
  };

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",background:"#FAFAF8",overflowY:"auto"}}>

      {/* Profile */}
      <div style={{background:"linear-gradient(135deg,#3B6D11,#27500A)",padding:"20px 16px 16px"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:48,height:48,borderRadius:14,background:"rgba(255,255,255,.15)",
            border:"2px solid rgba(255,255,255,.3)",display:"flex",alignItems:"center",
            justifyContent:"center",fontSize:22,flexShrink:0}}>{user.avatar}</div>
          <div>
            <div style={{fontSize:16,fontWeight:700,color:"#fff"}}>{user.name}</div>
            <div style={{fontSize:11,color:"#C0DD97",marginTop:2}}>{_t(user.role,lang)} · {GARAGE.name}</div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{display:"flex",gap:6,padding:"10px 12px 4px"}}>
        <div style={{flex:1,background:"#fff",borderRadius:10,padding:"8px 4px",textAlign:"center",border:"1px solid #E5E4DF"}}>
          <div style={{fontSize:16,fontWeight:700,color:"#3B6D11"}}>{ac}</div>
          <div style={{fontSize:8,color:"#888780",marginTop:1}}>Active</div>
        </div>
        <div style={{flex:1,background:"#fff",borderRadius:10,padding:"8px 4px",textAlign:"center",border:"1px solid #E5E4DF"}}>
          <div style={{fontSize:16,fontWeight:700,color:"#854F0B"}}>{qc}</div>
          <div style={{fontSize:8,color:"#888780",marginTop:1}}>QC</div>
        </div>
        <div style={{flex:1,background:"#fff",borderRadius:10,padding:"8px 4px",textAlign:"center",border:"1px solid #E5E4DF"}}>
          <div style={{fontSize:16,fontWeight:700,color:"#888780"}}>{dn}</div>
          <div style={{fontSize:8,color:"#888780",marginTop:1}}>Done</div>
        </div>
        <div style={{flex:1,background:"#fff",borderRadius:10,padding:"8px 4px",textAlign:"center",border:"1px solid #E5E4DF"}}>
          <div style={{fontSize:11,fontWeight:700,color:"#3B6D11"}}>₹{fmtINR(rev)}</div>
          <div style={{fontSize:8,color:"#888780",marginTop:1}}>Revenue</div>
        </div>
      </div>

      <div style={{padding:"4px 12px 20px"}}>

      {/* Garage Info */}
      <div style={{background:"#fff",borderRadius:12,border:"1px solid #E5E4DF",marginBottom:8,overflow:"hidden"}}>
        <div style={{padding:"7px 14px",background:"#F5F4F0",borderBottom:"1px solid #E5E4DF"}}><span style={{fontSize:10,fontWeight:700,color:"#888780",letterSpacing:0.5}}>GARAGE INFO</span></div>
        <div style={{padding:"2px 0"}}>
          <div style={{display:"flex",padding:"6px 14px",borderBottom:"0.5px solid #F1EFE8"}}>
            <span style={{width:65,fontSize:11,color:"#888780",flexShrink:0}}>Name</span>
            <span style={{fontSize:12,fontWeight:600,color:"#1B1B1A"}}>{GARAGE.name}</span>
          </div>
          <div style={{display:"flex",padding:"6px 14px",borderBottom:"0.5px solid #F1EFE8"}}>
            <span style={{width:65,fontSize:11,color:"#888780",flexShrink:0}}>Phone</span>
            <span style={{fontSize:12,color:"#1B1B1A"}}>{GARAGE.phone}</span>
          </div>
          <div style={{display:"flex",padding:"6px 14px",borderBottom:"0.5px solid #F1EFE8"}}>
            <span style={{width:65,fontSize:11,color:"#888780",flexShrink:0}}>Address</span>
            <span style={{fontSize:12,color:"#1B1B1A",flex:1}}>{GARAGE.address}</span>
          </div>
          <div style={{display:"flex",padding:"6px 14px",borderBottom:"0.5px solid #F1EFE8"}}>
            <span style={{width:65,fontSize:11,color:"#888780",flexShrink:0}}>Email</span>
            <span style={{fontSize:11,color:"#1B1B1A"}}>{GARAGE.email}</span>
          </div>
          <div style={{display:"flex",padding:"6px 14px"}}>
            <span style={{width:65,fontSize:11,color:"#888780",flexShrink:0}}>GST</span>
            <span style={{fontSize:12,color:"#1B1B1A"}}>{GARAGE.gst||"Not set"}</span>
          </div>
        </div>
      </div>

      {/* Staff Management */}
      <div style={{background:"#fff",borderRadius:12,border:"1px solid #E5E4DF",marginBottom:8,overflow:"hidden"}}>
        <div style={{padding:"7px 14px",background:"#F5F4F0",borderBottom:"1px solid #E5E4DF"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontSize:10,fontWeight:700,color:"#888780",letterSpacing:0.5}}>STAFF ({staffList.length})</span>
            <button onClick={()=>setShowAddStaff(!showAddStaff)}
              style={{background:showAddStaff?"#A32D2D":"#3B6D11",border:"none",borderRadius:6,
                padding:"3px 10px",cursor:"pointer",fontSize:10,fontWeight:600,color:"#fff"}}>
              {showAddStaff?"Cancel":"+ Add"}
            </button>
          </div>
        </div>

        {/* Add staff form */}
        {showAddStaff&&(
          <div style={{padding:"10px 14px",background:"#FAFEF5",borderBottom:"1px solid #E5E4DF"}}>
            <div style={{display:"flex",gap:6,marginBottom:6}}>
              {["mechanic","receptionist"].map(r=>(
                <button key={r} onClick={()=>setNewRole(r)}
                  style={{flex:1,padding:"7px",borderRadius:8,cursor:"pointer",fontSize:11,fontWeight:600,
                    border:newRole===r?"1.5px solid #3B6D11":"1.5px solid #E5E4DF",
                    background:newRole===r?"#EAF3DE":"#fff",
                    color:newRole===r?"#3B6D11":"#888780"}}>
                  {r==="mechanic"?"🔧 Mechanic":"👩‍💻 Receptionist"}
                </button>
              ))}
            </div>
            <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Name"
              style={{width:"100%",padding:"8px 10px",background:"#fff",border:"1px solid #E5E4DF",
                borderRadius:8,fontSize:12,color:"#1B1B1A",outline:"none",marginBottom:6,boxSizing:"border-box"}}/>
            <input value={newPhone} onChange={e=>setNewPhone(e.target.value.replace(/\D/g,"").slice(0,10))}
              placeholder="Phone (optional)" type="tel" inputMode="numeric"
              style={{width:"100%",padding:"8px 10px",background:"#fff",border:"1px solid #E5E4DF",
                borderRadius:8,fontSize:12,color:"#1B1B1A",outline:"none",marginBottom:6,boxSizing:"border-box"}}/>
            <input value={newPin} onChange={e=>setNewPin(e.target.value.replace(/\D/g,"").slice(0,4))}
              placeholder="4-digit PIN for login" type="tel" inputMode="numeric" maxLength={4}
              style={{width:"100%",padding:"8px 10px",background:"#fff",border:"1px solid #E5E4DF",
                borderRadius:8,fontSize:12,color:"#1B1B1A",outline:"none",marginBottom:8,boxSizing:"border-box",
                letterSpacing:8,textAlign:"center",fontWeight:700}}/>
            <button onClick={addStaff}
              disabled={!newName.trim()||!newPin.trim()||newPin.length<4}
              style={{width:"100%",padding:"10px",borderRadius:8,border:"none",cursor:"pointer",
                fontSize:13,fontWeight:600,color:"#fff",
                background:newName.trim()&&newPin.length===4?"#3B6D11":"#C5C4BF"}}>
              + Add {newRole==="mechanic"?"Mechanic":"Receptionist"}
            </button>
          </div>
        )}

        {/* Staff list — compact pills */}
        <div style={{padding:"8px 10px",display:"flex",flexWrap:"wrap",gap:6}}>
          {staffList.map(s=>(
            <div key={s.id} style={{display:"inline-flex",alignItems:"center",gap:5,
              padding:"5px 10px",borderRadius:20,fontSize:11,
              background:s.role==="admin"?"#EAF3DE":s.role==="receptionist"?"#FFF8EE":"#F5F4F0",
              border:s.role==="admin"?"1px solid #3B6D1144":"1px solid #E5E4DF"}}>
              <span style={{fontSize:12}}>{s.avatar}</span>
              <span style={{fontWeight:600,color:"#1B1B1A"}}>{s.name}</span>
              <span style={{fontSize:9,color:"#888780"}}>{s.role==="admin"?"admin":s.role==="receptionist"?"recpt":"mech"}</span>
              {s.id!==user.id&&s.role!=="admin"&&(
                <button onClick={()=>removeStaff(s.id)}
                  style={{background:"none",border:"none",cursor:"pointer",color:"#A32D2D",
                    fontSize:13,padding:0,lineHeight:1,marginLeft:2}}>×</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div style={{background:"#fff",borderRadius:12,border:"1px solid #E5E4DF",marginBottom:8,overflow:"hidden"}}>
        <div style={{padding:"7px 14px",background:"#F5F4F0",borderBottom:"1px solid #E5E4DF"}}>
          <span style={{fontSize:10,fontWeight:700,color:"#888780",letterSpacing:0.5}}>SETTINGS</span>
        </div>

        {/* Language */}
        <button onClick={()=>setOpenPanel(openPanel==="lang"?null:"lang")}
          style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"12px 14px",cursor:"pointer",
            borderBottom:"0.5px solid #F1EFE8",border:"none",background:openPanel==="lang"?"#FAFEF5":"transparent",textAlign:"left"}}>
          <div style={{width:32,height:32,borderRadius:8,background:"#EAF3DE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>🌐</div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:500,color:"#1B1B1A"}}>Language</div>
            <div style={{fontSize:10,color:"#888780",marginTop:1}}>{lang==="en"?"English":lang==="ta"?"Tamil (தமிழ்)":"Hindi (हिंदी)"}</div>
          </div>
          <span style={{fontSize:12,color:"#888780",transform:openPanel==="lang"?"rotate(90deg)":"none",transition:"transform .2s"}}>›</span>
        </button>
        {openPanel==="lang"&&(
          <div style={{padding:"6px 14px 10px",background:"#FAFEF5",borderBottom:"0.5px solid #F1EFE8"}}>
            {[{k:"en",l:"English",s:"App language in English"},{k:"ta",l:"Tamil (தமிழ்)",s:"செயலி தமிழில்"},{k:"hi",l:"Hindi (हिंदी)",s:"ऐप हिंदी में"}].map(lg=>(
              <button key={lg.k} onClick={()=>{setLang(lg.k);showFlash("🌐 "+lg.l+" selected");}}
                style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"10px 8px",cursor:"pointer",
                  border:lang===lg.k?"1.5px solid #3B6D11":"1.5px solid #E5E4DF",
                  background:lang===lg.k?"#EAF3DE":"#fff",
                  borderRadius:10,marginBottom:4,textAlign:"left"}}>
                <div style={{width:20,height:20,borderRadius:10,border:"2px solid "+(lang===lg.k?"#3B6D11":"#C5C4BF"),
                  display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  {lang===lg.k&&<div style={{width:10,height:10,borderRadius:5,background:"#3B6D11"}}/>}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:lang===lg.k?600:400,color:lang===lg.k?"#3B6D11":"#1B1B1A"}}>{lg.l}</div>
                  <div style={{fontSize:9,color:"#888780",marginTop:1}}>{lg.s}</div>
                </div>
                {lang===lg.k&&<span style={{fontSize:12,color:"#3B6D11",fontWeight:700}}>✓</span>}
              </button>
            ))}
          </div>
        )}

        {/* Notifications */}
        <button onClick={()=>setOpenPanel(openPanel==="notif"?null:"notif")}
          style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"12px 14px",cursor:"pointer",
            borderBottom:"0.5px solid #F1EFE8",border:"none",background:openPanel==="notif"?"#FAFEF5":"transparent",textAlign:"left"}}>
          <div style={{width:32,height:32,borderRadius:8,background:"#EAF3DE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>🔔</div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:500,color:"#1B1B1A"}}>Notifications</div>
            <div style={{fontSize:10,color:"#888780",marginTop:1}}>{[notifJob&&"Jobs",notifPay&&"Payment",notifRemind&&"Reminders"].filter(Boolean).join(", ")||"All off"}</div>
          </div>
          <span style={{fontSize:12,color:"#888780",transform:openPanel==="notif"?"rotate(90deg)":"none",transition:"transform .2s"}}>›</span>
        </button>
        {openPanel==="notif"&&(
          <div style={{padding:"8px 14px 12px",background:"#FAFEF5",borderBottom:"0.5px solid #F1EFE8"}}>
            {[{k:"job",v:notifJob,set:setNotifJob,l:"Job Updates",s:"New check-in, status change, assignment"},
              {k:"pay",v:notifPay,set:setNotifPay,l:"Payment Alerts",s:"Payment received, dues reminder"},
              {k:"remind",v:notifRemind,set:setNotifRemind,l:"Service Reminders",s:"Follow-up & overdue alerts"}
            ].map(n=>(
              <button key={n.k} onClick={()=>n.set(!n.v)}
                style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"8px 0",cursor:"pointer",
                  border:"none",background:"transparent",textAlign:"left",borderBottom:"0.5px solid #E5E4DF"}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:500,color:"#1B1B1A"}}>{n.l}</div>
                  <div style={{fontSize:9,color:"#888780",marginTop:1}}>{n.s}</div>
                </div>
                <div style={{width:40,height:22,borderRadius:11,background:n.v?"#3B6D11":"#C5C4BF",
                  padding:2,cursor:"pointer",transition:"background .2s"}}>
                  <div style={{width:18,height:18,borderRadius:9,background:"#fff",
                    boxShadow:"0 1px 3px rgba(0,0,0,.2)",transition:"margin-left .2s",
                    marginLeft:n.v?18:0}}/>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Print Settings */}
        <button onClick={()=>setOpenPanel(openPanel==="print"?null:"print")}
          style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"12px 14px",cursor:"pointer",
            border:"none",background:openPanel==="print"?"#FAFEF5":"transparent",textAlign:"left"}}>
          <div style={{width:32,height:32,borderRadius:8,background:"#EAF3DE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>🖨️</div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:500,color:"#1B1B1A"}}>Print Settings</div>
            <div style={{fontSize:10,color:"#888780",marginTop:1}}>Bill header, GST, terms</div>
          </div>
          <span style={{fontSize:12,color:"#888780",transform:openPanel==="print"?"rotate(90deg)":"none",transition:"transform .2s"}}>›</span>
        </button>
        {openPanel==="print"&&(
          <div style={{padding:"8px 14px 12px",background:"#FAFEF5"}}>
            {/* Header toggle */}
            <button onClick={()=>setPrintHeader(!printHeader)}
              style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"8px 0",cursor:"pointer",
                border:"none",background:"transparent",textAlign:"left",borderBottom:"0.5px solid #E5E4DF"}}>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:500,color:"#1B1B1A"}}>Garage Header</div>
                <div style={{fontSize:9,color:"#888780",marginTop:1}}>Show name, address, phone on bill</div>
              </div>
              <div style={{width:40,height:22,borderRadius:11,background:printHeader?"#3B6D11":"#C5C4BF",padding:2,transition:"background .2s"}}>
                <div style={{width:18,height:18,borderRadius:9,background:"#fff",boxShadow:"0 1px 3px rgba(0,0,0,.2)",
                  transition:"margin-left .2s",marginLeft:printHeader?18:0}}/>
              </div>
            </button>
            {/* GST toggle */}
            <button onClick={()=>setPrintGst(!printGst)}
              style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"8px 0",cursor:"pointer",
                border:"none",background:"transparent",textAlign:"left",borderBottom:"0.5px solid #E5E4DF"}}>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:500,color:"#1B1B1A"}}>Show GST on Bill</div>
                <div style={{fontSize:9,color:"#888780",marginTop:1}}>{GARAGE.gst||"Not set"}</div>
              </div>
              <div style={{width:40,height:22,borderRadius:11,background:printGst?"#3B6D11":"#C5C4BF",padding:2,transition:"background .2s"}}>
                <div style={{width:18,height:18,borderRadius:9,background:"#fff",boxShadow:"0 1px 3px rgba(0,0,0,.2)",
                  transition:"margin-left .2s",marginLeft:printGst?18:0}}/>
              </div>
            </button>
            {/* Terms */}
            <div style={{marginTop:6}}>
              <div style={{fontSize:10,fontWeight:600,color:"#888780",marginBottom:4}}>Terms & Conditions</div>
              <textarea value={printTerms} onChange={e=>setPrintTerms(e.target.value)}
                rows={3} style={{width:"100%",padding:"8px 10px",background:"#fff",border:"1px solid #E5E4DF",
                  borderRadius:8,fontSize:11,color:"#1B1B1A",outline:"none",resize:"vertical",
                  boxSizing:"border-box",lineHeight:1.4}}/>
            </div>
          </div>
        )}
      </div>

      {/* Business */}
      <div style={{background:"#fff",borderRadius:12,border:"1px solid #E5E4DF",marginBottom:8,overflow:"hidden"}}>
        <div style={{padding:"7px 14px",background:"#F5F4F0",borderBottom:"1px solid #E5E4DF"}}><span style={{fontSize:10,fontWeight:700,color:"#888780",letterSpacing:0.5}}>BUSINESS</span></div>
        <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderBottom:"0.5px solid #F1EFE8"}}>
          <div style={{width:32,height:32,borderRadius:8,background:"#EAF3DE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>💰</div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:500,color:"#1B1B1A"}}>Total Collection</div>
            <div style={{fontSize:10,color:"#888780",marginTop:1}}>{jobs.length} jobs · {dn} delivered</div>
          </div>
          <span style={{fontSize:14,fontWeight:700,color:"#3B6D11"}}>₹{fmtINR(rev)}</span>
        </div>
        {dues>0&&(
          <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px"}}>
            <div style={{width:32,height:32,borderRadius:8,background:"#FFF0F0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>⚠️</div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:500,color:"#A32D2D"}}>Pending Dues</div>
              <div style={{fontSize:10,color:"#888780",marginTop:1}}>Across all active jobs</div>
            </div>
            <span style={{fontSize:14,fontWeight:700,color:"#A32D2D"}}>₹{fmtINR(dues)}</span>
          </div>
        )}
      </div>

      {/* Support */}
      <div style={{background:"#fff",borderRadius:12,border:"1px solid #E5E4DF",marginBottom:8,overflow:"hidden"}}>
        <div style={{padding:"7px 14px",background:"#F5F4F0",borderBottom:"1px solid #E5E4DF"}}>
          <span style={{fontSize:10,fontWeight:700,color:"#888780",letterSpacing:0.5}}>SUPPORT</span>
        </div>

        {/* Help & FAQ */}
        <button onClick={()=>setOpenPanel(openPanel==="help"?null:"help")}
          style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"12px 14px",cursor:"pointer",
            borderBottom:"0.5px solid #F1EFE8",border:"none",background:openPanel==="help"?"#FAFEF5":"transparent",textAlign:"left"}}>
          <div style={{width:32,height:32,borderRadius:8,background:"#EAF3DE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>❓</div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:500,color:"#1B1B1A"}}>Help & FAQ</div>
            <div style={{fontSize:10,color:"#888780",marginTop:1}}>How to use Garage</div>
          </div>
          <span style={{fontSize:12,color:"#888780",transform:openPanel==="help"?"rotate(90deg)":"none",transition:"transform .2s"}}>›</span>
        </button>
        {openPanel==="help"&&(
          <div style={{padding:"8px 14px 12px",background:"#FAFEF5",borderBottom:"0.5px solid #F1EFE8"}}>
            {[
              {q:"How to check-in a vehicle?",a:"Go to Jobs tab → tap + New Check-In → follow the bot steps: enter plate number, customer name, phone, complaints."},
              {q:"How to complete a job?",a:"Open a job → Work tab (tick services, add parts) → QC → Next Visit → Service Due → Estimate → Payment → Deliver."},
              {q:"How to add mechanics?",a:"Settings → Staff section → tap + Add → enter name, role, and 4-digit PIN."},
              {q:"How to send estimate?",a:"Open job → Estimate step → fill spares, labour, outwork → tap 📤 Send button to WhatsApp customer."},
              {q:"How to track expenses?",a:"Jobs tab → tap 📊 Dashboard → Expenses tab → add daily expenses with category."},
              {q:"How to follow up with customers?",a:"Jobs tab → tap Follow Up or Overdue pills → open the job → tap 📤 Send Reminder."},
            ].map((f,i)=>(
              <div key={i} style={{padding:"8px 0",borderBottom:i<5?"0.5px solid #E5E4DF":"none"}}>
                <div style={{fontSize:12,fontWeight:600,color:"#1B1B1A",marginBottom:3}}>{f.q}</div>
                <div style={{fontSize:11,color:"#888780",lineHeight:1.4}}>{f.a}</div>
              </div>
            ))}
          </div>
        )}

        {/* Contact Support */}
        <button onClick={()=>setOpenPanel(openPanel==="contact"?null:"contact")}
          style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"12px 14px",cursor:"pointer",
            borderBottom:"0.5px solid #F1EFE8",border:"none",background:openPanel==="contact"?"#FAFEF5":"transparent",textAlign:"left"}}>
          <div style={{width:32,height:32,borderRadius:8,background:"#EAF3DE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>💬</div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:500,color:"#1B1B1A"}}>Contact Support</div>
            <div style={{fontSize:10,color:"#888780",marginTop:1}}>Report issues or feedback</div>
          </div>
          <span style={{fontSize:12,color:"#888780",transform:openPanel==="contact"?"rotate(90deg)":"none",transition:"transform .2s"}}>›</span>
        </button>
        {openPanel==="contact"&&(
          <div style={{padding:"8px 14px 12px",background:"#FAFEF5",borderBottom:"0.5px solid #F1EFE8"}}>
            <button onClick={()=>{try{window.open("https://wa.me/919876500000?text=Hi, I need help with Garage app");}catch(e){}}}
              style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"10px 12px",cursor:"pointer",
                border:"1px solid #3B6D1133",background:"#EAF3DE",borderRadius:8,marginBottom:6,textAlign:"left"}}>
              <span style={{fontSize:16}}>💬</span>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:600,color:"#3B6D11"}}>WhatsApp Support</div>
                <div style={{fontSize:10,color:"#888780"}}>Chat with our team</div>
              </div>
            </button>
            <button onClick={()=>{try{window.open("tel:9876500000");}catch(e){}}}
              style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"10px 12px",cursor:"pointer",
                border:"1px solid #E5E4DF",background:"#fff",borderRadius:8,marginBottom:6,textAlign:"left"}}>
              <span style={{fontSize:16}}>📞</span>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:600,color:"#1B1B1A"}}>Call Support</div>
                <div style={{fontSize:10,color:"#888780"}}>9876500000</div>
              </div>
            </button>
            <button onClick={()=>{try{window.open("mailto:support@garage.app");}catch(e){}}}
              style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"10px 12px",cursor:"pointer",
                border:"1px solid #E5E4DF",background:"#fff",borderRadius:8,textAlign:"left"}}>
              <span style={{fontSize:16}}>📧</span>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:600,color:"#1B1B1A"}}>Email Support</div>
                <div style={{fontSize:10,color:"#888780"}}>support@garage.app</div>
              </div>
            </button>
          </div>
        )}

        {/* About */}
        <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px"}}>
          <div style={{width:32,height:32,borderRadius:8,background:"#EAF3DE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>ℹ️</div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:500,color:"#1B1B1A"}}>About</div>
            <div style={{fontSize:10,color:"#888780",marginTop:1}}>Garage v3.8</div>
          </div>
        </div>
      </div>

      {/* Sign out */}
      {!confirmLogout ? (
        <button onClick={()=>setConfirmLogout(true)}
          style={{width:"100%",padding:"12px",background:"#fff",border:"1.5px solid #E5E4DF",
            borderRadius:12,cursor:"pointer",display:"flex",alignItems:"center",
            justifyContent:"center",gap:8,color:"#A32D2D",fontSize:13,fontWeight:600,marginBottom:16}}>
          Sign out
        </button>
      ) : (
        <div style={{background:"#FFF5F5",borderRadius:12,padding:16,border:"1px solid #F5C0C0",marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:600,color:"#A32D2D",marginBottom:4,textAlign:"center"}}>
            Sign out of {GARAGE.name}?
          </div>
          <div style={{fontSize:11,color:"#888780",textAlign:"center",marginBottom:14}}>
            You will need to log back in.
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setConfirmLogout(false)}
              style={{flex:1,padding:"10px",background:"#F1EFE8",border:"none",borderRadius:8,
                cursor:"pointer",fontSize:13,color:"#1B1B1A",fontWeight:500}}>Cancel</button>
            <button onClick={onLogout}
              style={{flex:1,padding:"10px",background:"#A32D2D",border:"none",borderRadius:8,
                cursor:"pointer",fontSize:13,color:"#fff",fontWeight:600}}>Sign out</button>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}

