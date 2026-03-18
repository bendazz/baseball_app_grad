import pandas as pd
import sqlite3

DB_PATH = "baseball.db"
conn = sqlite3.connect(DB_PATH)
conn.execute("PRAGMA foreign_keys = ON")

# --- People table ---
people = pd.read_csv("people.csv")
people.drop(columns=["ID"], inplace=True)
people.to_sql("people", conn, if_exists="replace", index=False)
conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_people_pk ON people(playerID)")

# --- Teams table ---
teams = pd.read_csv("teams.csv")
teams.to_sql("teams", conn, if_exists="replace", index=False)
conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_pk ON teams(teamID, yearID)")

# --- Batting table ---
batting = pd.read_csv("batting.csv")
batting.to_sql("batting", conn, if_exists="replace", index=False)
conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_batting_pk ON batting(playerID, yearID, stint)")

conn.close()

# Now recreate with proper primary keys and foreign keys using DDL
conn = sqlite3.connect(DB_PATH)
conn.execute("PRAGMA foreign_keys = ON")

# Rebuild people with primary key
cols_people = pd.read_sql("SELECT * FROM people LIMIT 0", conn).columns.tolist()
col_defs_people = []
for col in cols_people:
    dtype = "TEXT"
    if col in ("birthYear", "birthMonth", "birthDay", "deathYear", "deathMonth", "deathDay", "weight", "height"):
        dtype = "INTEGER"
    if col == "playerID":
        col_defs_people.append(f'"{col}" {dtype} PRIMARY KEY')
    else:
        col_defs_people.append(f'"{col}" {dtype}')

conn.execute("ALTER TABLE people RENAME TO people_old")
conn.execute(f"CREATE TABLE people ({', '.join(col_defs_people)})")
conn.execute(f"INSERT INTO people SELECT {', '.join(f'\"{ c}\"' for c in cols_people)} FROM people_old")
conn.execute("DROP TABLE people_old")

# Rebuild teams with composite primary key
cols_teams = pd.read_sql("SELECT * FROM teams LIMIT 0", conn).columns.tolist()
int_cols_teams = {"yearID", "Rank", "G", "Ghome", "W", "L", "R", "AB", "H", "2B", "3B", "HR",
                  "BB", "SO", "SB", "CS", "HBP", "SF", "RA", "ER", "CG", "SHO", "SV", "IPouts",
                  "HA", "HRA", "BBA", "SOA", "E", "DP", "attendance", "BPF", "PPF"}
real_cols_teams = {"ERA", "FP"}
col_defs_teams = []
for col in cols_teams:
    if col in int_cols_teams:
        dtype = "INTEGER"
    elif col in real_cols_teams:
        dtype = "REAL"
    else:
        dtype = "TEXT"
    col_defs_teams.append(f'"{col}" {dtype}')
col_defs_teams.append("PRIMARY KEY (teamID, yearID)")

conn.execute("ALTER TABLE teams RENAME TO teams_old")
conn.execute(f"CREATE TABLE teams ({', '.join(col_defs_teams)})")
conn.execute(f"INSERT INTO teams SELECT {', '.join(f'\"{c}\"' for c in cols_teams)} FROM teams_old")
conn.execute("DROP TABLE teams_old")

# Rebuild batting with composite primary key and foreign keys
cols_batting = pd.read_sql("SELECT * FROM batting LIMIT 0", conn).columns.tolist()
text_cols_batting = {"playerID", "teamID", "lgID"}
col_defs_batting = []
for col in cols_batting:
    if col in text_cols_batting:
        dtype = "TEXT"
    else:
        dtype = "INTEGER"
    col_defs_batting.append(f'"{col}" {dtype}')
col_defs_batting.append("PRIMARY KEY (playerID, yearID, stint)")
col_defs_batting.append("FOREIGN KEY (playerID) REFERENCES people(playerID)")
col_defs_batting.append("FOREIGN KEY (yearID, teamID) REFERENCES teams(yearID, teamID)")

conn.execute("ALTER TABLE batting RENAME TO batting_old")
conn.execute(f"CREATE TABLE batting ({', '.join(col_defs_batting)})")
conn.execute(f"INSERT INTO batting SELECT {', '.join(f'\"{c}\"' for c in cols_batting)} FROM batting_old")
conn.execute("DROP TABLE batting_old")

conn.commit()
conn.close()

print("baseball.db created successfully with primary keys and foreign keys.")
