import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

conn = psycopg2.connect('postgresql://postgres:2003@localhost:5432/postgres')
conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
cur = conn.cursor()

try:
    cur.execute('CREATE DATABASE "lyra-db"')
except Exception as e:
    print(f"lyra-db: {e}")

try:
    cur.execute('CREATE DATABASE lyra_db')
except Exception as e:
    print(f"lyra_db: {e}")

cur.close()
conn.close()
