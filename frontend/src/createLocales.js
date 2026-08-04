import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const localesDir = path.join(__dirname, 'locales');
if (!fs.existsSync(localesDir)) {
    fs.mkdirSync(localesDir, { recursive: true });
}

// Added ko (Korean) and mr (Marathi)
const langs = ['en', 'ta', 'te', 'kn', 'ml', 'hi', 'fr', 'de', 'es', 'ja', 'zh', 'ko', 'mr'];

const baseEn = {
    "sidebar": {
        "dashboard": "Dashboard",
        "forms": "Forms",
        "responses": "Responses",
        "analytics": "Analytics",
        "settings": "Settings",
        "profile": "Profile",
        "users": "Users",
        "audit": "Audit Logs",
        "rules": "Rules",
        "workflows": "Workflows",
        "exports": "Export Center",
        "group_workspace": "Workspace",
        "group_data": "Data",
        "group_admin": "Admin"
    },
    "navbar": {
        "search": "Search...",
        "notifications": "Notifications",
        "mark_read": "Mark read",
        "clear_all": "Clear all",
        "no_notifications": "No notifications",
        "all_caught_up": "You're all caught up!",
        "sign_out": "Sign Out",
        "new": "new",
        "language": "Language",
        "theme_toggle": "Toggle Theme"
    },
    "dashboard": {
        "welcome": "Welcome back",
        "snapshot": "Here is a snapshot of your workspace performance today.",
        "create_form": "Create Form",
        "my_forms": "My Forms",
        "published_forms": "Published Forms",
        "draft_forms": "Draft Forms",
        "total_responses": "Total Responses",
        "avg_completion_rate": "Avg Completion Rate",
        "completion_rate": "Completion Rate",
        "submission_velocity": "Submission Velocity",
        "top_performing": "Top Performing Forms",
        "recently_modified": "Recently Modified Forms",
        "latest_submissions": "Latest Submissions",
        "no_data": "No data available",
        "loading": "Loading dashboard data..."
    },
    "forms": {
        "title": "Forms",
        "create_new": "Create New Form",
        "search": "Search forms...",
        "status": "Status",
        "responses": "Responses",
        "created": "Created",
        "actions": "Actions",
        "edit": "Edit",
        "preview": "Preview",
        "publish": "Publish",
        "unpublish": "Unpublish",
        "delete": "Delete",
        "empty_state": "No forms found",
        "empty_desc": "You haven't created any forms yet."
    },
    "builder": {
        "title": "Form Builder",
        "elements": "Elements",
        "properties": "Properties",
        "save": "Save Form",
        "publish": "Publish Form",
        "drag_drop": "Drag & Drop elements here",
        "text_input": "Text Input",
        "email_input": "Email",
        "number_input": "Number",
        "dropdown": "Dropdown",
        "radio": "Radio Buttons",
        "checkbox": "Checkbox",
        "date": "Date Picker",
        "file": "File Upload",
        "rating": "Rating",
        "signature": "Signature",
        "label": "Label",
        "placeholder": "Placeholder",
        "required": "Required Field",
        "help_text": "Help Text"
    },
    "analytics": {
        "title": "Analytics",
        "my_analytics": "My Analytics",
        "export_csv": "Export CSV",
        "export_pdf": "Export PDF",
        "submission_trend": "Submission Trend",
        "responses_by_form": "Responses by Form",
        "total_views": "Total Views",
        "avg_time": "Avg Time to Complete",
        "last_response": "Last Response Date",
        "field_completion": "Field Completion",
        "time_vs_responses": "Time vs Responses",
        "recent_responses": "Recent Responses",
        "no_published_forms": "No published forms available",
        "no_published_desc": "Analytics are only available for forms that have been published and are actively collecting responses.",
        "go_to_forms": "Go to My Forms"
    },
    "settings": {
        "title": "Settings",
        "subtitle": "Manage your account, workspace, and security preferences.",
        "profile": "Profile",
        "account": "Account",
        "preferences": "Preferences",
        "security": "Security",
        "storage": "Storage & Data",
        "retention": "Retention Policy",
        "audit": "Audit Logs",
        "danger_zone": "Danger Zone",
        "language": "Language",
        "save": "Save Settings",
        "edit_profile": "Edit Profile",
        "enable_2fa": "Enable 2FA",
        "change_password": "Change Password",
        "sign_out_all": "Sign Out Everywhere"
    },
    "auth": {
        "login": "Sign In",
        "register": "Create Account",
        "email": "Email Address",
        "password": "Password",
        "forgot_password": "Forgot Password?",
        "sign_in_btn": "Sign In",
        "sign_up_btn": "Sign Up",
        "no_account": "Don't have an account?",
        "have_account": "Already have an account?"
    },
    "common": {
        "save": "Save",
        "cancel": "Cancel",
        "delete": "Delete",
        "edit": "Edit",
        "create": "Create",
        "confirm": "Confirm",
        "back": "Back",
        "next": "Next",
        "yes": "Yes",
        "no": "No",
        "success": "Success",
        "error": "Error",
        "loading": "Loading...",
        "actions": "Actions",
        "close": "Close",
        "search": "Search",
        "filter": "Filter"
    }
};

const translations = {
    'fr': { sidebar: { dashboard: 'Tableau de bord', forms: 'Formulaires', settings: 'Paramètres' } },
    'es': { sidebar: { dashboard: 'Panel', forms: 'Formularios', settings: 'Ajustes' } },
    'de': { sidebar: { dashboard: 'Dashboard', forms: 'Formulare', settings: 'Einstellungen' } },
    'hi': { sidebar: { dashboard: 'डैशबोर्ड', forms: 'फ़ॉर्म', settings: 'सेटिंग्स' } },
    'ta': { sidebar: { dashboard: 'முகப்பு', forms: 'படிவங்கள்', settings: 'அமைப்புகள்' } }
};

function mergeDict(base, overlay) {
    const res = { ...base };
    for (const [k, v] of Object.entries(overlay)) {
        if (typeof v === 'object' && !Array.isArray(v) && res[k]) {
            res[k] = mergeDict(res[k], v);
        } else {
            res[k] = v;
        }
    }
    return res;
}

function addSuffix(d, lang) {
    const newD = {};
    for (const [k, v] of Object.entries(d)) {
        if (typeof v === 'object' && !Array.isArray(v)) {
            newD[k] = addSuffix(v, lang);
        } else {
            newD[k] = v + ` [${lang.toUpperCase()}]`;
        }
    }
    return newD;
}

for (const lang of langs) {
    const p = path.join(localesDir, `${lang}.json`);
    let content = baseEn;
    if (translations[lang]) {
        content = mergeDict(baseEn, translations[lang]);
    } else if (lang !== 'en') {
        content = addSuffix(baseEn, lang);
    }
    fs.writeFileSync(p, JSON.stringify(content, null, 2), 'utf-8');
}

console.log('JSON files created successfully for languages:', langs.join(', '));
