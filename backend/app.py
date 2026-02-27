import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from db import init_db, add_random_transaction
from endpoints import router


async def _add_transaction_every_2s():
    while True:
        await asyncio.sleep(2)
        await asyncio.to_thread(add_random_transaction)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    task = asyncio.create_task(_add_transaction_every_2s())
    try:
        yield
    finally:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass


app = FastAPI(title="Portola Backend", lifespan=lifespan)

# add CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
def root():
    return {"message": "Portola API", "docs": "/docs"}

