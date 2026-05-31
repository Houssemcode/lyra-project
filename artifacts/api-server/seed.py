from sqlmodel import Session, select
from models import IslamicActivity


DEEDS = [
    {"name": "Fajr Prayer", "arabic_name": "صلاة الفجر", "reward_text": "Better than the world and everything in it", "category": "prayer", "sort_order": 1},
    {"name": "Dhuhr Prayer", "arabic_name": "صلاة الظهر", "reward_text": "Angels witness and record your prayer", "category": "prayer", "sort_order": 2},
    {"name": "Asr Prayer", "arabic_name": "صلاة العصر", "reward_text": "Whoever misses it is as if he lost his family and wealth", "category": "prayer", "sort_order": 3},
    {"name": "Maghrib Prayer", "arabic_name": "صلاة المغرب", "reward_text": "The gates of Paradise open at Maghrib time", "category": "prayer", "sort_order": 4},
    {"name": "Isha Prayer", "arabic_name": "صلاة العشاء", "reward_text": "Praying Isha in congregation equals half the night in prayer", "category": "prayer", "sort_order": 5},
    {"name": "Morning Dhikr", "arabic_name": "أذكار الصباح", "reward_text": "Protection and blessings throughout the day", "category": "dhikr", "sort_order": 10},
    {"name": "Evening Dhikr", "arabic_name": "أذكار المساء", "reward_text": "Protection and blessings throughout the night", "category": "dhikr", "sort_order": 11},
    {"name": "Quran Recitation", "arabic_name": "تلاوة القرآن", "reward_text": "10 rewards per letter recited", "category": "quran", "sort_order": 20},
    {"name": "Jumu'ah Prayer", "arabic_name": "صلاة الجمعة", "reward_text": "Sins between two Fridays are expiated", "category": "jumu'ah", "day_of_week": 5, "sort_order": 30},
    {"name": "Monday Fast", "arabic_name": "صيام الاثنين", "reward_text": "Deeds are presented to Allah on Mondays", "category": "fasting", "day_of_week": 1, "sort_order": 40},
    {"name": "Thursday Fast", "arabic_name": "صيام الخميس", "reward_text": "Deeds are presented to Allah on Thursdays", "category": "fasting", "day_of_week": 4, "sort_order": 41},
    {"name": "Sadaqah", "arabic_name": "الصدقة", "reward_text": "Charity extinguishes sin as water extinguishes fire", "category": "charity", "sort_order": 50},
    {"name": "White Days Fast (13th)", "arabic_name": "صيام أيام البيض", "reward_text": "Fasting three days a month is like fasting all year", "category": "fasting", "hijri_day": 13, "sort_order": 42},
    {"name": "White Days Fast (14th)", "arabic_name": "صيام أيام البيض", "reward_text": "Fasting three days a month is like fasting all year", "category": "fasting", "hijri_day": 14, "sort_order": 43},
    {"name": "White Days Fast (15th)", "arabic_name": "صيام أيام البيض", "reward_text": "Fasting three days a month is like fasting all year", "category": "fasting", "hijri_day": 15, "sort_order": 44},
]


def seed_islamic_activities(session: Session):
    existing = session.exec(select(IslamicActivity)).all()
    if existing:
        return

    for deed_data in DEEDS:
        deed = IslamicActivity(
            name=deed_data["name"],
            arabic_name=deed_data.get("arabic_name"),
            reward_text=deed_data["reward_text"],
            category=deed_data["category"],
            hijri_month=deed_data.get("hijri_month"),
            hijri_day=deed_data.get("hijri_day"),
            day_of_week=deed_data.get("day_of_week"),
            is_active=True,
            sort_order=deed_data.get("sort_order", 0),
        )
        session.add(deed)
    session.commit()
