from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models.system_setting import SystemSetting

# In-memory dictionary cache for system settings
_SETTINGS_CACHE: Dict[str, str] = {}

class SettingsService:
    @staticmethod
    def _load_cache(db: Session):
        settings = db.query(SystemSetting).all()
        for setting in settings:
            _SETTINGS_CACHE[f"{setting.category}.{setting.setting_key}"] = setting.setting_value

    @staticmethod
    def get_setting(db: Session, category: str, key: str, default: Any = None) -> Any:
        cache_key = f"{category}.{key}"
        if not _SETTINGS_CACHE:
            SettingsService._load_cache(db)
        
        value = _SETTINGS_CACHE.get(cache_key)
        if value is not None:
            return value
            
        # Fallback to DB
        setting = db.query(SystemSetting).filter_by(category=category, setting_key=key).first()
        if setting:
            _SETTINGS_CACHE[cache_key] = setting.setting_value
            return setting.setting_value
        return default

    @staticmethod
    def get_all_settings(db: Session) -> Dict[str, Dict[str, str]]:
        settings = db.query(SystemSetting).all()
        result = {}
        for setting in settings:
            if setting.category not in result:
                result[setting.category] = {}
            result[setting.category][setting.setting_key] = setting.setting_value
        return result

    @staticmethod
    def update_settings(db: Session, category: str, updates: List[dict], user_id: int):
        for update in updates:
            key = update['setting_key']
            val = update['setting_value']
            setting = db.query(SystemSetting).filter_by(category=category, setting_key=key).first()
            if setting:
                setting.setting_value = str(val)
                setting.updated_by = user_id
            else:
                new_setting = SystemSetting(
                    category=category,
                    setting_key=key,
                    setting_value=str(val),
                    updated_by=user_id
                )
                db.add(new_setting)
            
            # Update cache
            _SETTINGS_CACHE[f"{category}.{key}"] = str(val)
        
        db.commit()
