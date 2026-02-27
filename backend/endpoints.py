import asyncio
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import random

from db import get_db
from models import (
    TransactionModel,
    TransactionCreate,
    TransactionResponse,
    TransactionStatus,
)

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("/", response_model=list[TransactionResponse])
def list_transactions(db: Session = Depends(get_db)):
    return db.query(TransactionModel).order_by(TransactionModel.timestamp.desc()).all()


@router.get("/{transaction_id}", response_model=TransactionResponse)
def get_transaction(transaction_id: int, db: Session = Depends(get_db)):
    t = db.query(TransactionModel).filter(TransactionModel.id == transaction_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return t


@router.post("/create-transaction", response_model=TransactionResponse, status_code=201)
def create_transaction(body: TransactionCreate, db: Session = Depends(get_db)):
    t = TransactionModel(
        client_name=body.client_name,
        amount=body.amount,
        status=body.status,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return t



@router.post("/{transaction_id}/clear-funds", response_model=TransactionResponse)
async def clear_funds(transaction_id: int, db: Session = Depends(get_db)):
    await asyncio.sleep(1.5)  # mock API delay
    t = db.query(TransactionModel).filter(TransactionModel.id == transaction_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if t.status != TransactionStatus.pending:
        raise HTTPException(status_code=400, detail="Only pending transactions can be cleared")
    
    # 10% chance of failure
    if random.random() < 0.1:
        t.status = TransactionStatus.failed
        
    else:
        t.status = TransactionStatus.cleared
        
    db.commit()
    db.refresh(t)
    return t