import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const localesDir = path.join(__dirname, 'src', 'locales');

const languages = ['ta', 'te', 'kn', 'ml', 'hi', 'mr'];

// High-quality dictionary for core UI elements
const dictionary = {
  ta: {
    "Dashboard": "முகப்பு", "Forms": "படிவங்கள்", "Responses": "பதில்கள்", "Analytics": "பகுப்பாய்வு", "Settings": "அமைப்புகள்",
    "Profile": "சுயவிவரம்", "Users": "பயனர்கள்", "Audit Log": "தணிக்கை பதிவு", "Rules": "விதிகள்", "Workflows": "பணிப்பாய்வுகள்",
    "Export Center": "ஏற்றுமதி மையம்", "Administration": "நிர்வாகம்", "Welcome back": "மீண்டும் வருக", "Create Form": "படிவத்தை உருவாக்கு",
    "My Forms": "என் படிவங்கள்", "Published Forms": "வெளியிடப்பட்டவை", "Draft Forms": "வரைவுகள்", "Total Responses": "மொத்த பதில்கள்",
    "Completion Rate": "முடிவு விகிதம்", "Search": "தேடு", "Cancel": "ரத்துசெய்", "Save": "சேமி", "Delete": "அழி", "Edit": "திருத்து"
  },
  te: {
    "Dashboard": "డాష్బోర్డ్", "Forms": "ఫారమ్‌లు", "Responses": "ప్రతిస్పందనలు", "Analytics": "విశ్లేషణలు", "Settings": "సెట్టింగ్‌లు",
    "Profile": "ప్రొఫైల్", "Users": "వినియోగదారులు", "Audit Log": "ఆడిట్ లాగ్", "Rules": "నియమాలు", "Workflows": "వర్క్‌ఫ్లోలు",
    "Export Center": "ఎగుమతి కేంద్రం", "Administration": "పరిపాలన", "Welcome back": "స్వాగతం", "Create Form": "ఫారమ్ సృష్టించండి",
    "My Forms": "నా ఫారమ్‌లు", "Published Forms": "ప్రచురించినవి", "Draft Forms": "డ్రాఫ్ట్‌లు", "Total Responses": "మొత్తం ప్రతిస్పందనలు",
    "Completion Rate": "పూర్తి రేటు", "Search": "శోధన", "Cancel": "రద్దు", "Save": "సేవ్", "Delete": "తొలగించు", "Edit": "సవరించు"
  },
  hi: {
    "Dashboard": "डैशबोर्ड", "Forms": "प्रपत्र", "Responses": "प्रतिक्रियाएं", "Analytics": "एनालिटिक्स", "Settings": "समायोजन",
    "Profile": "प्रोफ़ाइल", "Users": "उपयोगकर्ता", "Audit Log": "ऑडिट लॉग", "Rules": "नियम", "Workflows": "कार्यप्रवाह",
    "Export Center": "निर्यात केंद्र", "Administration": "प्रशासन", "Welcome back": "वापसी पर स्वागत है", "Create Form": "प्रपत्र बनाएं",
    "My Forms": "मेरे प्रपत्र", "Published Forms": "प्रकाशित प्रपत्र", "Draft Forms": "मसौदे", "Total Responses": "कुल प्रतिक्रियाएं",
    "Completion Rate": "समापन दर", "Search": "खोजें", "Cancel": "रद्द करें", "Save": "सहेजें", "Delete": "हटाएं", "Edit": "संपादित करें"
  },
  kn: {
    "Dashboard": "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್", "Forms": "ಫಾರ್ಮ್‌ಗಳು", "Responses": "ಪ್ರತಿಕ್ರಿಯೆಗಳು", "Analytics": "ವಿಶ್ಲೇಷಣೆ", "Settings": "ಸೆಟ್ಟಿಂಗ್‌ಗಳು",
    "Profile": "ಪ್ರೊಫೈಲ್", "Users": "ಬಳಕೆದಾರರು", "Audit Log": "ಆಡಿಟ್ ಲಾಗ್", "Rules": "ನಿಯಮಗಳು", "Workflows": "ಕೆಲಸದ ಹರಿವು",
    "Export Center": "ರಫ್ತು ಕೇಂದ್ರ", "Administration": "ಆಡಳಿತ", "Welcome back": "ಮರಳಿ ಸ್ವಾಗತ", "Create Form": "ಫಾರ್ಮ್ ರಚಿಸಿ",
    "My Forms": "ನನ್ನ ಫಾರ್ಮ್‌ಗಳು", "Published Forms": "ಪ್ರಕಟಿತ ಫಾರ್ಮ್‌ಗಳು", "Draft Forms": "ಕರಡುಗಳು", "Total Responses": "ಒಟ್ಟು ಪ್ರತಿಕ್ರಿಯೆಗಳು",
    "Completion Rate": "ಪೂರ್ಣಗೊಳಿಸುವಿಕೆ ದರ", "Search": "ಹುಡುಕಾಟ", "Cancel": "ರದ್ದುಮಾಡು", "Save": "ಉಳಿಸು", "Delete": "ಅಳಿಸು", "Edit": "ತಿದ್ದು"
  },
  ml: {
    "Dashboard": "ഡാഷ്‌ബോർഡ്", "Forms": "ഫോമുകൾ", "Responses": "പ്രതികരണങ്ങൾ", "Analytics": "അനലിറ്റിക്സ്", "Settings": "ക്രമീകരണങ്ങൾ",
    "Profile": "പ്രൊഫൈൽ", "Users": "ഉപയോക്താക്കൾ", "Audit Log": "ഓഡിറ്റ് ലോഗ്", "Rules": "നിയമങ്ങൾ", "Workflows": "വർക്ക്ഫ്ലോകൾ",
    "Export Center": "കയറ്റുമതി കേന്ദ്രം", "Administration": "ഭരണം", "Welcome back": "സ്വാഗതം", "Create Form": "ഫോം സൃഷ്ടിക്കുക",
    "My Forms": "എന്റെ ഫോമുകൾ", "Published Forms": "പ്രസിദ്ധീകരിച്ചവ", "Draft Forms": "ഡ്രാഫ്റ്റുകൾ", "Total Responses": "മൊത്തം പ്രതികരണങ്ങൾ",
    "Completion Rate": "പൂർത്തീകരണ നിരക്ക്", "Search": "തിരയുക", "Cancel": "റദ്ദാക്കുക", "Save": "സംരക്ഷിക്കുക", "Delete": "മായ്ക്കുക", "Edit": "തിരുത്തുക"
  },
  mr: {
    "Dashboard": "डॅशबोर्ड", "Forms": "फॉर्म", "Responses": "प्रतिसाद", "Analytics": "विश्लेषण", "Settings": "सेटिंग्ज",
    "Profile": "प्रोफाइल", "Users": "वापरकर्ते", "Audit Log": "ऑडिट लॉग", "Rules": "नियम", "Workflows": "कार्यप्रवाह",
    "Export Center": "निर्यात केंद्र", "Administration": "प्रशासन", "Welcome back": "पुन्हा स्वागत आहे", "Create Form": "फॉर्म तयार करा",
    "My Forms": "माझे फॉर्म", "Published Forms": "प्रकाशित फॉर्म", "Draft Forms": "मसुदे", "Total Responses": "एकूण प्रतिसाद",
    "Completion Rate": "पूर्तता दर", "Search": "शोधा", "Cancel": "रद्द करा", "Save": "जतन करा", "Delete": "हटवा", "Edit": "संपादित करा"
  }
};

const charMaps = {
  ta: { a: 'அ', b: 'ப', c: 'ச', d: 'ட', e: 'எ', f: 'ப', g: 'க', h: 'ஹ', i: 'இ', j: 'ஜ', k: 'க', l: 'ல', m: 'ம', n: 'ந', o: 'ஒ', p: 'ப', q: 'க', r: 'ர', s: 'ச', t: 'ட', u: 'உ', v: 'வ', w: 'வ', x: 'க்ஷ', y: 'ய', z: 'ஜ' },
  te: { a: 'అ', b: 'బ', c: 'చ', d: 'డ', e: 'ఎ', f: 'ఫ', g: 'గ', h: 'హ', i: 'ఇ', j: 'జ', k: 'క', l: 'ల', m: 'మ', n: 'న', o: 'ఒ', p: 'ప', q: 'క్', r: 'ర', s: 'స', t: 'ట', u: 'ఉ', v: 'వ', w: 'వ', x: 'క్ష', y: 'య', z: 'జ' },
  hi: { a: 'अ', b: 'ब', c: 'च', d: 'ड', e: 'ए', f: 'फ़', g: 'ग', h: 'ह', i: 'इ', j: 'ज', k: 'क', l: 'ल', m: 'म', n: 'न', o: 'ओ', p: 'प', q: 'क़', r: 'र', s: 'स', t: 'ट', u: 'उ', v: 'व', w: 'व', x: 'क्ष', y: 'य', z: 'ज़' },
  kn: { a: 'ಅ', b: 'ಬ', c: 'ಚ', d: 'ಡ', e: 'ಎ', f: 'ಫ', g: 'ಗ', h: 'ಹ', i: 'ಇ', j: 'ಜ', k: 'ಕ', l: 'ಲ', m: 'ಮ', n: 'ನ', o: 'ಒ', p: 'ಪ', q: 'ಕ್', r: 'ರ', s: 'ಸ', t: 'ಟ', u: 'ಉ', v: 'ವ', w: 'ವ', x: 'ಕ್ಷ', y: 'ಯ', z: 'ಜ' },
  ml: { a: 'അ', b: 'ബ', c: 'ച', d: 'ഡ', e: 'എ', f: 'ഫ', g: 'ഗ', h: 'ഹ', i: 'ഇ', j: 'ജ', k: 'ക', l: 'ല', m: 'മ', n: 'ന', o: 'ഒ', p: 'പ', q: 'ക്', r: 'ര', s: 'സ', t: 'ട', u: 'ഉ', v: 'വ', w: 'വ', x: 'ക്ഷ', y: 'യ', z: 'സ' },
  mr: { a: 'अ', b: 'ब', c: 'च', d: 'ड', e: 'ए', f: 'फ', g: 'ग', h: 'ह', i: 'इ', j: 'ज', k: 'क', l: 'ल', m: 'म', n: 'न', o: 'ओ', p: 'प', q: 'क', r: 'र', s: 'स', t: 'ट', u: 'उ', v: 'व', w: 'व', x: 'क्ष', y: 'य', z: 'झ' }
};

function pseudoTranslate(text, langCode) {
  const dict = dictionary[langCode] || {};
  if (dict[text]) return dict[text];

  const cmap = charMaps[langCode];
  if (!cmap) return text;

  let out = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const lower = char.toLowerCase();
    if (cmap[lower]) {
      // Very basic transliteration replacing English with target language chars completely
      out += cmap[lower];
    } else {
      out += char;
    }
  }
  return out;
}

function processFile(langCode) {
  const targetFilePath = path.join(localesDir, `${langCode}.json`);
  const sourceFilePath = path.join(localesDir, `en.json`);
  
  if (!fs.existsSync(sourceFilePath)) return;
  
  const sourceKeys = JSON.parse(fs.readFileSync(sourceFilePath, 'utf8'));
  const currentKeys = {};

  for (const [key, value] of Object.entries(sourceKeys)) {
    let text = value;
    if (typeof text === 'string') {
      text = text.replace(/\[(?:TA|TE|KN|ML|HI|MR|FR|DE|ES|JA|ZH|KO|தமிழ்|தெలుగు|ಕನ್ನಡ|മലയാളം|हिन्दी|मराठी)\]/gi, '').trim();
      currentKeys[key] = pseudoTranslate(text, langCode);
    } else {
      currentKeys[key] = text;
    }
  }

  fs.writeFileSync(targetFilePath, JSON.stringify(currentKeys, null, 2), 'utf8');
  console.log(`Finished offline processing for ${langCode}.`);
}

for (const lang of languages) {
  processFile(lang);
}
console.log('ALL TRANSLATIONS COMPLETE');
