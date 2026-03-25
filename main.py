from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI, HTTPException
from sqlmodel import Session, select
from models import Batting, Teams, People, engine

app = FastAPI()


@app.get("/years")
async def get_years():
    with Session(engine) as session:
        result = session.exec(select(Teams.yearID).distinct().order_by(Teams.yearID))
        return result.all()

@app.get("/teams")
async def get_teams(year: int):
    with Session(engine) as session:
        result = session.exec(select(Teams.teamID, Teams.name, Teams.lgID, Teams.divID).where(Teams.yearID == year).order_by(Teams.name))
        return [{"teamID": teamID, "name": name, "lgID": lgID, "divID": divID} for teamID, name, lgID, divID in result.all()]

@app.get("/players")
async def get_players(teamID: str, yearID: int):
    with Session(engine) as session:
        result = session.exec(
            select(Batting.playerID, People.nameFirst, People.nameLast)
            .where(Batting.teamID == teamID, Batting.yearID == yearID)
            .join(People, Batting.playerID == People.playerID)
            .distinct()
            .order_by(People.nameLast, People.nameFirst)
        )
        return [{"playerID": playerID, "nameFirst": nameFirst, "nameLast": nameLast} for playerID, nameFirst, nameLast in result.all()]

@app.get("/player/{playerID}")
async def get_player(playerID: str):
    with Session(engine) as session:
        person = session.exec(select(People).where(People.playerID == playerID)).first()
        if not person:
            raise HTTPException(status_code=404, detail="Player not found")
        batting = session.exec(
            select(Batting).where(Batting.playerID == playerID).order_by(Batting.yearID, Batting.stint)
        ).all()
        return {
            "bio": person.model_dump(),
            "batting": [row.model_dump() for row in batting]
        }

app.mount("/", StaticFiles(directory="static", html=True), name="static")