import os
from sqlmodel import SQLModel, create_engine, Session

DATABASE_URL = os.getenv("LYRA_DATABASE_URL", "sqlite:///./lyra.db")

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False
    db_file = DATABASE_URL.replace("sqlite:///", "").replace("sqlite://", "")
    if db_file.startswith("./"):
        db_file = db_file[2:]
    if os.path.exists(db_file):
        os.remove(db_file)

engine = create_engine(DATABASE_URL, connect_args=connect_args)


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
