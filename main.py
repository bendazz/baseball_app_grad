from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI
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
        result = session.exec(select(Teams.name, Teams.lgID, Teams.divID).where(Teams.yearID == year).order_by(Teams.name))
        return [{"name": name, "lgID": lgID, "divID": divID} for name, lgID, divID in result.all()]

app.mount("/", StaticFiles(directory="static", html=True), name="static")