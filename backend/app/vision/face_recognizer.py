import cv2
import numpy as np
from typing import List, Tuple, Optional
from app.core.config import settings

class LocalFaceRecognizer:
    def __init__(self, similarity_threshold: float = settings.FACE_SIMILARITY_THRESHOLD):
        self.similarity_threshold = similarity_threshold
        self.facenet = None
        
        # Initialize OpenCV Haar Cascade for face detection
        cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        self.face_cascade = cv2.CascadeClassifier(cascade_path)

        # Initialize FaceNet embedder
        try:
            import keras_facenet
            self.facenet = keras_facenet.FaceNet()
        except Exception as e:
            print(f"[LocalFaceRecognizer] Warning: Keras-FaceNet initialization notice: {e}")

    def detect_face(self, image: np.ndarray) -> Optional[np.ndarray]:
        """Detects and crops the primary frontal face from an image/roi."""
        if image is None or image.size == 0:
            return None

        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
        faces = self.face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(60, 60)
        )
        if len(faces) == 0:
            return None

        # Return largest face crop
        faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
        x, y, w, h = faces[0]
        # Margin around face
        pad_x = int(0.15 * w)
        pad_y = int(0.15 * h)
        x1 = max(0, x - pad_x)
        y1 = max(0, y - pad_y)
        x2 = min(image.shape[1], x + w + pad_x)
        y2 = min(image.shape[0], y + h + pad_y)
        return image[y1:y2, x1:x2]

    def extract_embedding(self, face_image: np.ndarray) -> Optional[np.ndarray]:
        """Extracts 512-dim normalized feature vector from a face image."""
        if face_image is None or face_image.size == 0 or self.facenet is None:
            return None

        try:
            rgb_face = cv2.cvtColor(face_image, cv2.COLOR_BGR2RGB) if len(face_image.shape) == 3 else face_image
            resized = cv2.resize(rgb_face, (160, 160))
            embeddings = self.facenet.embeddings([resized])
            if len(embeddings) > 0:
                vec = embeddings[0]
                norm = np.linalg.norm(vec)
                return (vec / norm) if norm > 0 else vec
        except Exception as e:
            print(f"[LocalFaceRecognizer] Embedding extraction error: {e}")
        return None

    def match_face(
        self,
        query_embedding: np.ndarray,
        enrolled_database: List[Tuple[int, str, np.ndarray]]  # (student_id, student_name, embedding_vector)
    ) -> Tuple[Optional[int], Optional[str], float]:
        """
        Performs cosine similarity matching against consented enrolled student embeddings.
        Returns: (student_id, student_name, confidence) if >= threshold, else (None, None, max_score)
        """
        if query_embedding is None or not enrolled_database:
            return None, None, 0.0

        best_score = -1.0
        best_student_id = None
        best_student_name = None

        q_norm = np.linalg.norm(query_embedding)
        if q_norm == 0:
            return None, None, 0.0
        q_vec = query_embedding / q_norm

        for s_id, s_name, emb in enrolled_database:
            emb_norm = np.linalg.norm(emb)
            if emb_norm == 0:
                continue
            cos_sim = float(np.dot(q_vec, emb / emb_norm))
            if cos_sim > best_score:
                best_score = cos_sim
                best_student_id = s_id
                best_student_name = s_name

        if best_score >= self.similarity_threshold:
            return best_student_id, best_student_name, best_score
        
        # If below threshold, strictly return unverified
        return None, None, max(0.0, best_score)
