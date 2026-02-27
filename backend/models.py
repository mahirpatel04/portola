from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel
from sqlalchemy import Column, Integer, String, Float, DateTime, Enum as SQLEnum
from sqlalchemy.sql import func

from db import Base


class TransactionStatus(str, Enum):
    pending = "pending"
    failed = "failed"
    cleared = "cleared"


# SQLAlchemy model (DB table)
class TransactionModel(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    client_name = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    status = Column(SQLEnum(TransactionStatus), nullable=False, default=TransactionStatus.pending)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())


# Pydantic schemas (API request/response)
class TransactionCreate(BaseModel):
    client_name: str
    amount: float
    status: TransactionStatus = TransactionStatus.pending


class TransactionResponse(BaseModel):
    id: int
    client_name: str
    amount: float
    status: TransactionStatus
    timestamp: datetime

    class Config:
        from_attributes = True
