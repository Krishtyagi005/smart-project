import sqlite3
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional

app = FastAPI()

# Enable CORS so frontend can talk to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_FILE = "school.db"

def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS classrooms 
                 (id INTEGER PRIMARY KEY, name TEXT UNIQUE, capacity INTEGER, equipment TEXT)''')
    c.execute('''CREATE TABLE IF NOT EXISTS classes 
                 (id INTEGER PRIMARY KEY, class_id TEXT, name TEXT, teacher TEXT, 
                  room_name TEXT, day TEXT, start_time TEXT, end_time TEXT)''')
    conn.commit()
    conn.close()

init_db()

# Models
class Classroom(BaseModel):
    name: str
    capacity: int
    equipment: str

class ClassItem(BaseModel):
    class_id: str
    name: str
    teacher: str
    room_name: str
    day: str
    start_time: str
    end_time: str

def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

# Routes
@app.get("/api/dashboard-stats")
def stats():
    conn = get_db()
    c = conn.cursor()
    total_classes = c.execute("SELECT COUNT(*) FROM classes").fetchone()[0]
    total_rooms = c.execute("SELECT COUNT(*) FROM classrooms").fetchone()[0]
    conn.close()
    return {"totalClasses": total_classes, "totalClassrooms": total_rooms}

@app.get("/api/classrooms")
def get_rooms():
    conn = get_db()
    rooms = conn.execute("SELECT * FROM classrooms").fetchall()
    conn.close()
    return [dict(r) for r in rooms]

@app.post("/api/classrooms")
def add_room(r: Classroom):
    try:
        conn = get_db()
        conn.execute("INSERT INTO classrooms (name, capacity, equipment) VALUES (?,?,?)", 
                     (r.name, r.capacity, r.equipment))
        conn.commit()
        conn.close()
        return r
    except:
        raise HTTPException(400, "Room already exists")

@app.get("/api/classes")
def get_classes():
    conn = get_db()
    classes = conn.execute("SELECT * FROM classes").fetchall()
    conn.close()
    return [dict(c) for c in classes]

@app.post("/api/classes")
def add_class(c: ClassItem):
    conn = get_db()
    # Simple conflict check
    conflict = conn.execute('''SELECT * FROM classes WHERE room_name=? AND day=? 
                               AND start_time=?''', (c.room_name, c.day, c.start_time)).fetchone()
    if conflict:
        conn.close()
        raise HTTPException(409, "Time slot conflict in this room")
    
    conn.execute("INSERT INTO classes (class_id, name, teacher, room_name, day, start_time, end_time) VALUES (?,?,?,?,?,?,?)",
                 (c.class_id, c.name, c.teacher, c.room_name, c.day, c.start_time, c.end_time))
    conn.commit()
    conn.close()
    return c

@app.delete("/api/classes/{id}")
def delete_class(id: int):
    conn = get_db()
    conn.execute("DELETE FROM classes WHERE id=?", (id,))
    conn.commit()
    conn.close()
    return {"msg": "Deleted"}
