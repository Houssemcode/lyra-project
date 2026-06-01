from sqlmodel import Session, select
from models import IslamicActivity, Routine

DEFAULT_ROUTINES = ["Morning", "Afternoon", "Evening", "Anytime"]

DEEDS = [
    {"name": "Fajr Prayer",           "reward_text": "Better than the world and everything in it",                            "type": "fard"},
    {"name": "Dhuhr Prayer",          "reward_text": "Angels witness and record your prayer",                                   "type": "fard"},
    {"name": "Asr Prayer",            "reward_text": "Whoever misses it is as if he lost his family and wealth",               "type": "fard"},
    {"name": "Maghrib Prayer",        "reward_text": "The gates of Paradise open at Maghrib time",                             "type": "fard"},
    {"name": "Isha Prayer",           "reward_text": "Praying Isha in congregation equals half the night in prayer",           "type": "fard"},
    {"name": "Morning Dhikr",         "reward_text": "Protection and blessings throughout the day",                            "type": "sunnah"},
    {"name": "Evening Dhikr",         "reward_text": "Protection and blessings throughout the night",                          "type": "sunnah"},
    {"name": "Quran Recitation",      "reward_text": "10 rewards per letter recited",                                           "type": "sunnah"},
    {"name": "Jumu'ah Prayer",        "reward_text": "Sins between two Fridays are expiated",                                  "type": "fard"},
    {"name": "Monday Fast",           "reward_text": "Deeds are presented to Allah on Mondays",                                "type": "sunnah"},
    {"name": "Thursday Fast",         "reward_text": "Deeds are presented to Allah on Thursdays",                              "type": "sunnah"},
    {"name": "Sadaqah",               "reward_text": "Charity extinguishes sin as water extinguishes fire",                    "type": "mostahab"},
    {"name": "White Days Fast (13th)","reward_text": "Fasting three days a month is like fasting all year", "hijri_day": 13,  "type": "sunnah"},
    {"name": "White Days Fast (14th)","reward_text": "Fasting three days a month is like fasting all year", "hijri_day": 14,  "type": "sunnah"},
    {"name": "White Days Fast (15th)","reward_text": "Fasting three days a month is like fasting all year", "hijri_day": 15,  "type": "sunnah"},
]


def seed_routines(session: Session):
    existing = session.exec(select(Routine)).all()
    existing_names = {r.name for r in existing}
    for name in DEFAULT_ROUTINES:
        if name not in existing_names:
            session.add(Routine(name=name, is_default=True))
    session.commit()


def seed_islamic_activities(session: Session):
    existing = session.exec(select(IslamicActivity)).all()
    if existing:
        return
    for deed_data in DEEDS:
        deed = IslamicActivity(
            name=deed_data["name"],
            reward_text=deed_data.get("reward_text"),
            hijri_month=deed_data.get("hijri_month"),
            hijri_day=deed_data.get("hijri_day"),
            type=deed_data.get("type", "sunnah"),
        )
        session.add(deed)
    session.commit()
