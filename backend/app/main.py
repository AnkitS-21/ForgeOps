from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="ForgeOps API",
    description="Enterprise Infrastructure Operations Platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)

@app.get("/")
def root():
    return {"message": "Welcome to ForgeOps API"}

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "ForgeOps Backend"
    }