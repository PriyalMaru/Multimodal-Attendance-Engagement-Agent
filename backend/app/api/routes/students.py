import os
import cv2
import numpy as np
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.config import settings
from app.schemas.student import StudentCreate, StudentUpdate, StudentConsentUpdate, StudentResponse
from app.services.student_service import StudentService
from app.vision.face_recognizer import LocalFaceRecognizer

router = APIRouter()
face_engine = None

def get_face_engine() -> LocalFaceRecognizer:
    """Load FaceNet only when a face enrollment request needs it."""
    global face_engine
    if face_engine is None:
        face_engine = LocalFaceRecognizer()
    return face_engine

@router.get("", response_model=List[StudentResponse])
async def list_students(include_archived: bool = False, db: AsyncSession = Depends(get_db)):
    students = await StudentService.get_all(db, include_archived=include_archived)
    # Check if embedding file exists for each
    result = []
    for s in students:
        s_dict = StudentResponse.model_validate(s)
        s_dict.has_embedding = bool(s.embedding_path and os.path.exists(s.embedding_path))
        result.append(s_dict)
    return result

@router.get("/{student_id}", response_model=StudentResponse)
async def get_student(student_id: int, db: AsyncSession = Depends(get_db)):
    student = await StudentService.get_by_id(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")
    res = StudentResponse.model_validate(student)
    res.has_embedding = bool(student.embedding_path and os.path.exists(student.embedding_path))
    return res

@router.post("", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
async def create_student(data: StudentCreate, db: AsyncSession = Depends(get_db)):
    student = await StudentService.create(db, data)
    res = StudentResponse.model_validate(student)
    res.has_embedding = False
    return res

@router.put("/{student_id}", response_model=StudentResponse)
async def update_student(student_id: int, data: StudentUpdate, db: AsyncSession = Depends(get_db)):
    student = await StudentService.update(db, student_id, data)
    res = StudentResponse.model_validate(student)
    res.has_embedding = bool(student.embedding_path and os.path.exists(student.embedding_path))
    return res

@router.put("/{student_id}/consent", response_model=StudentResponse)
async def update_consent(student_id: int, consent_data: StudentConsentUpdate, db: AsyncSession = Depends(get_db)):
    student = await StudentService.update_consent(db, student_id, consent_data)
    res = StudentResponse.model_validate(student)
    res.has_embedding = bool(student.embedding_path and os.path.exists(student.embedding_path))
    return res

@router.post("/{student_id}/enroll-face", response_model=StudentResponse)
async def enroll_face(
    student_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    student = await StudentService.get_by_id(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    if not student.has_consented:
        raise HTTPException(
            status_code=403,
            detail="Student consent has not been recorded. Face enrollment is prohibited under local privacy policy."
        )

    # Read image
    content = await file.read()
    nparr = np.frombuffer(content, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image file format.")

    # Detect face
    engine = get_face_engine()
    face_crop = engine.detect_face(img)
    if face_crop is None:
        raise HTTPException(status_code=400, detail="No clear face detected in the uploaded image. Please provide a clear, well-lit frontal face image.")

    # Extract embedding
    embedding = engine.extract_embedding(face_crop)
    if embedding is None:
        raise HTTPException(status_code=500, detail="Facial embedding extraction failed. Check local FaceNet model.")

    # Store embedding and photo
    updated = await StudentService.store_face_embedding(
        db=db,
        student_pk=student.id,
        embedding=embedding,
        image_bytes=content
    )
    res = StudentResponse.model_validate(updated)
    res.has_embedding = True
    return res

@router.get("/{student_id}/photo")
async def get_student_photo(student_id: int, db: AsyncSession = Depends(get_db)):
    photo_path = settings.UPLOAD_DIR / f"avatar_{student_id}.jpg"
    if not os.path.exists(photo_path):
        raise HTTPException(status_code=404, detail="Student avatar not found.")
    return FileResponse(photo_path, media_type="image/jpeg")

@router.delete("/{student_id}")
async def delete_student(student_id: int, db: AsyncSession = Depends(get_db)):
    await StudentService.delete(db, student_id)
    return {"status": "success", "message": "Student record and biometric embeddings deleted permanently."}
