import cv2
import numpy as np
from typing import Tuple, Optional

class HeadPoseEstimator:
    """
    Observable head orientation estimator using 2D-to-3D facial perspective correspondence (Perspective-n-Point).
    Calculates estimated yaw, pitch, and roll angles to determine forward-facing orientation.
    NOTE: Observable behavioral indicator only; not an inference of mental attention or comprehension.
    """
    def __init__(self):
        # 3D model reference points (in mm) from generic anthropometric face model
        self.model_points = np.array([
            (0.0, 0.0, 0.0),             # Nose tip
            (0.0, -330.0, -65.0),        # Chin
            (-225.0, 170.0, -135.0),     # Left eye left corner
            (225.0, 170.0, -135.0),      # Right eye right corner
            (-150.0, -150.0, -125.0),    # Left Mouth corner
            (150.0, -150.0, -125.0)      # Right mouth corner
        ], dtype=np.float64)

        eye_cascade_path = cv2.data.haarcascades + "haarcascade_eye.xml"
        self.eye_cascade = cv2.CascadeClassifier(eye_cascade_path)

    def estimate_orientation(self, face_bgr: np.ndarray) -> Tuple[bool, float, float, float]:
        """
        Estimates head orientation Euler angles.
        Returns: (is_forward_facing, yaw, pitch, roll)
        """
        if face_bgr is None or face_bgr.size == 0:
            return False, 0.0, 0.0, 0.0

        h, w = face_bgr.shape[:2]
        if h < 40 or w < 40:
            return False, 0.0, 0.0, 0.0

        # Approximate 2D image points from face geometry
        # Detect eyes in upper half of face
        gray = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2GRAY) if len(face_bgr.shape) == 3 else face_bgr
        upper_half = gray[0:int(h * 0.6), :]
        eyes = self.eye_cascade.detectMultiScale(upper_half, scaleFactor=1.1, minNeighbors=3, minSize=(15, 15))

        # Defaults based on standard facial ratios
        left_eye = (w * 0.3, h * 0.35)
        right_eye = (w * 0.7, h * 0.35)

        if len(eyes) >= 2:
            # Sort by x coordinate
            sorted_eyes = sorted(eyes, key=lambda e: e[0])
            e1 = sorted_eyes[0]
            e2 = sorted_eyes[-1]
            left_eye = (float(e1[0] + e1[2] / 2), float(e1[1] + e1[3] / 2))
            right_eye = (float(e2[0] + e2[2] / 2), float(e2[1] + e2[3] / 2))

        nose_tip = (w * 0.5, h * 0.52)
        chin = (w * 0.5, h * 0.92)
        mouth_left = (w * 0.35, h * 0.75)
        mouth_right = (w * 0.65, h * 0.75)

        image_points = np.array([
            nose_tip,
            chin,
            left_eye,
            right_eye,
            mouth_left,
            mouth_right
        ], dtype=np.float64)

        # Camera internals approximation
        focal_length = w
        center = (w / 2.0, h / 2.0)
        camera_matrix = np.array([
            [focal_length, 0, center[0]],
            [0, focal_length, center[1]],
            [0, 0, 1]
        ], dtype=np.float64)
        dist_coeffs = np.zeros((4, 1), dtype=np.float64)

        success, rotation_vector, translation_vector = cv2.solvePnP(
            self.model_points,
            image_points,
            camera_matrix,
            dist_coeffs,
            flags=cv2.SOLVEPNP_ITERATIVE
        )

        if not success:
            return False, 0.0, 0.0, 0.0

        # Convert rotation vector to rotation matrix
        rotation_matrix, _ = cv2.Rodrigues(rotation_vector)
        # Compute Euler angles
        proj_matrix = np.hstack((rotation_matrix, translation_vector))
        _, _, _, _, _, _, euler_angles = cv2.decomposeProjectionMatrix(proj_matrix)

        pitch = float(euler_angles[0][0])
        yaw = float(euler_angles[1][0])
        roll = float(euler_angles[2][0])

        # Forward facing condition: absolute yaw < 25 degrees and pitch < 22 degrees
        is_forward = (abs(yaw) <= 25.0) and (abs(pitch) <= 22.0)
        return is_forward, round(yaw, 1), round(pitch, 1), round(roll, 1)
