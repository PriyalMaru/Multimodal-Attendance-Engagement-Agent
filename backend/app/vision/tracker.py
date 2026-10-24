import numpy as np
from typing import List, Dict, Tuple, Optional

class TrackedObject:
    def __init__(self, track_id: int, bbox: Tuple[int, int, int, int], score: float):
        self.track_id = track_id
        self.bbox = bbox  # (x1, y1, x2, y2)
        self.score = score
        self.misses = 0
        self.hits = 1
        self.trajectory = [self.centroid]
        self.matched_student_id: Optional[int] = None
        self.matched_student_name: Optional[str] = None
        self.face_confidence: float = 0.0

    @property
    def centroid(self) -> Tuple[float, float]:
        x1, y1, x2, y2 = self.bbox
        return ((x1 + x2) / 2.0, (y1 + y2) / 2.0)

    def update(self, bbox: Tuple[int, int, int, int], score: float):
        self.bbox = bbox
        self.score = score
        self.misses = 0
        self.hits += 1
        self.trajectory.append(self.centroid)
        if len(self.trajectory) > 50:
            self.trajectory.pop(0)

class MultiPersonTracker:
    def __init__(self, max_misses: int = 15, iou_threshold: float = 0.25):
        self.max_misses = max_misses
        self.iou_threshold = iou_threshold
        self.next_id = 1
        self.tracks: Dict[int, TrackedObject] = {}

    @staticmethod
    def calculate_iou(boxA: Tuple[int, int, int, int], boxB: Tuple[int, int, int, int]) -> float:
        xA = max(boxA[0], boxB[0])
        yA = max(boxA[1], boxB[1])
        xB = min(boxA[2], boxB[2])
        yB = min(boxA[3], boxB[3])

        interArea = max(0, xB - xA) * max(0, yB - yA)
        if interArea == 0:
            return 0.0

        boxAArea = max(1, (boxA[2] - boxA[0]) * (boxA[3] - boxA[1]))
        boxBArea = max(1, (boxB[2] - boxB[0]) * (boxB[3] - boxB[1]))
        return interArea / float(boxAArea + boxBArea - interArea)

    def update(self, detections: List[Tuple[int, int, int, int, float]]) -> List[TrackedObject]:
        """
        Updates tracked objects with new frame detections.
        detections: list of (x1, y1, x2, y2, score)
        Returns active tracked objects.
        """
        if not detections:
            # Increment misses for all tracks
            dead_ids = []
            for tid, track in self.tracks.items():
                track.misses += 1
                if track.misses > self.max_misses:
                    dead_ids.append(tid)
            for tid in dead_ids:
                del self.tracks[tid]
            return [t for t in self.tracks.values() if t.misses == 0 or t.hits > 2]

        if not self.tracks:
            # Initialize tracks from all detections
            for det in detections:
                box = (det[0], det[1], det[2], det[3])
                track = TrackedObject(self.next_id, box, det[4])
                self.tracks[self.next_id] = track
                self.next_id += 1
            return list(self.tracks.values())

        # Build IoU association matrix
        track_ids = list(self.tracks.keys())
        iou_matrix = np.zeros((len(track_ids), len(detections)), dtype=np.float32)

        for i, tid in enumerate(track_ids):
            for j, det in enumerate(detections):
                det_box = (det[0], det[1], det[2], det[3])
                iou_matrix[i, j] = self.calculate_iou(self.tracks[tid].bbox, det_box)

        matched_tracks = set()
        matched_dets = set()

        # Greedy match by highest IoU
        while True:
            if iou_matrix.size == 0:
                break
            max_idx = np.unravel_index(np.argmax(iou_matrix), iou_matrix.shape)
            max_val = iou_matrix[max_idx]
            if max_val < self.iou_threshold:
                break

            t_idx, d_idx = max_idx
            tid = track_ids[t_idx]
            det = detections[d_idx]
            self.tracks[tid].update((det[0], det[1], det[2], det[3]), det[4])

            matched_tracks.add(tid)
            matched_dets.add(d_idx)

            iou_matrix[t_idx, :] = -1.0
            iou_matrix[:, d_idx] = -1.0

        # Unmatched existing tracks
        dead_ids = []
        for tid in track_ids:
            if tid not in matched_tracks:
                self.tracks[tid].misses += 1
                if self.tracks[tid].misses > self.max_misses:
                    dead_ids.append(tid)
        for tid in dead_ids:
            del self.tracks[tid]

        # New detections become new tracks
        for j, det in enumerate(detections):
            if j not in matched_dets:
                box = (det[0], det[1], det[2], det[3])
                track = TrackedObject(self.next_id, box, det[4])
                self.tracks[self.next_id] = track
                self.next_id += 1

        return [t for t in self.tracks.values() if t.misses <= 1]
