import random
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# File-based SQLite (persists; same DB for all requests)
DATABASE_URL = "sqlite:///./portola.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def init_db():
    """Create all tables and seed data."""
    from models import TransactionModel  # avoid circular import: models imports db.Base
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    # Ensure minimum 50 mock transactions are inserted. If there are less than 50, insert more to equal 50:
    if db.query(TransactionModel).count() < 50:
        for i in range(50 - db.query(TransactionModel).count()):
            client_name = f"Client {i}"
            
            if random.random() < 0.5:
                amount = random.uniform(1, 1000)
            else:
                amount = random.uniform(1000, 1000000)
            
            
            
            db.add(TransactionModel(
                client_name=client_name,
                amount=amount,
            ))
        db.commit()
    db.close()


def add_random_transaction():
    """Add one transaction: 50% small (1-1000), 50% large (1000-1000000)."""
    from models import TransactionModel
    db = SessionLocal()
    try:
        if random.random() < 0.5:
            amount = random.uniform(1, 1000)
        else:
            amount = random.uniform(1000, 1000000)
        client_name = f"Client {random.randint(10000, 99999)}"
        db.add(TransactionModel(client_name=client_name, amount=amount))
        db.commit()
    finally:
        db.close()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
