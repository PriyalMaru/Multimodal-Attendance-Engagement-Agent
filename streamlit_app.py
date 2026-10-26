"""Streamlit deployment entrypoint for the Multimodal Classroom Agent.

The app reuses the existing backend domain services directly, so Community Cloud
only needs to run one process. The ML pipeline remains lazy and is loaded only
from face-enrollment or video-processing interactions.
"""

from __future__ import annotations

import asyncio
import os
import sys
import tempfile
from pathlib import Path
from typing import Any, Awaitable, Callable

import streamlit as st

ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.init_db import init_database
from app.schemas.attendance import AttendanceUpdate
from app.schemas.session import SessionCreate
from app.schemas.student import StudentConsentUpdate, StudentCreate
from app.services.analytics_service import AnalyticsService
from app.services.attendance_service import AttendanceService
from app.services.session_service import SessionService
from app.services.student_service import StudentService
from app.services.suggestion_service import SuggestionService


st.set_page_config(
    page_title="Multimodal Classroom Agent",
    page_icon="🎓",
    layout="wide",
    initial_sidebar_state="expanded",
)


def run_async(awaitable: Awaitable[Any]) -> Any:
    """Run a backend coroutine from Streamlit's synchronous script runtime."""
    return asyncio.run(awaitable)


@st.cache_resource(show_spinner=False)
def initialise_store() -> bool:
    run_async(init_database())
    return True


async def with_db(action: Callable[[Any], Awaitable[Any]]) -> Any:
    async with AsyncSessionLocal() as db:
        return await action(db)


def serialise_student(student: Any) -> dict[str, Any]:
    return {
        "id": student.id,
        "student_id": student.student_id,
        "full_name": student.full_name,
        "course_name": student.course_name,
        "email": student.email or "",
        "has_consented": student.has_consented,
        "has_embedding": bool(student.embedding_path),
        "is_archived": student.is_archived,
        "created_at": student.created_at,
    }


def serialise_session(session: Any) -> dict[str, Any]:
    return {
        "id": session.id,
        "session_uid": session.session_uid,
        "course_title": session.course_title,
        "instructor_name": session.instructor_name,
        "room_number": session.room_number or "—",
        "target_class": session.target_class,
        "expected_duration_minutes": session.expected_duration_minutes,
        "status": session.status,
        "source_type": session.source_type,
        "created_at": session.created_at,
        "attendance_count": getattr(session, "attendance_count", 0) or 0,
        "present_count": getattr(session, "present_count", 0) or 0,
        "avg_engagement": getattr(session, "avg_engagement", 0.0) or 0.0,
    }


def get_students(include_archived: bool = False) -> list[dict[str, Any]]:
    async def action(db):
        return [serialise_student(s) for s in await StudentService.get_all(db, include_archived)]

    return run_async(with_db(action))


def get_sessions() -> list[dict[str, Any]]:
    async def action(db):
        return [serialise_session(s) for s in await SessionService.get_all(db)]

    return run_async(with_db(action))


def select_session(label: str = "Select a session") -> int | None:
    sessions = get_sessions()
    if not sessions:
        st.info("Create a classroom session to continue.")
        return None
    chosen = st.selectbox(
        label,
        sessions,
        index=next((i for i, item in enumerate(sessions) if item["id"] == st.session_state.get("active_session_id")), 0),
        format_func=lambda item: f"{item['course_title']} · {item['session_uid']} · {item['status']}",
    )
    st.session_state.active_session_id = chosen["id"]
    return chosen["id"]


@st.cache_resource(show_spinner=False)
def get_face_engine():
    from app.vision.face_recognizer import LocalFaceRecognizer

    return LocalFaceRecognizer()


@st.cache_resource(show_spinner=False)
def get_video_pipeline():
    from app.vision.pipeline import MultimodalPipeline

    return MultimodalPipeline()


def navigate_to(page: str) -> None:
    """Schedule navigation before the next rerun creates the radio widget."""
    st.session_state.pending_navigation = page


def apply_theme() -> None:
    st.markdown(
        """
        <style>
          /* Let Streamlit own the light/dark palette; these rules only shape the UI. */
          [data-testid="stSidebar"] { border-right: 1px solid rgba(148, 163, 184, .28); }
          [data-testid="stSidebar"] .stRadio label { padding: 0.32rem 0.45rem; border-radius: 0.5rem; }
          .brand { display:flex; align-items:center; gap:.75rem; padding:.2rem 0 1rem; }
          .brand-mark { background:linear-gradient(135deg,#2563eb,#14b8a6); color:#fff; width:2.45rem; height:2.45rem; border-radius:.8rem; display:flex; align-items:center; justify-content:center; font-size:1.25rem; }
          .eyebrow { font-size:.78rem; margin:0; opacity:.68; }
          .title { margin:.25rem 0 .2rem; font-size:1.7rem; font-weight:700; }
          .subtle { margin:0 0 1.4rem; opacity:.72; }
          [data-testid="stMetric"] { background:rgba(128, 128, 128, .055); border:1px solid rgba(148, 163, 184, .28); padding:.9rem; border-radius:.75rem; }
          .card { background:rgba(128, 128, 128, .055); border:1px solid rgba(148, 163, 184, .28); border-radius:.8rem; padding:1rem 1.1rem; }
          .status { color:#047857; font-size:.78rem; font-weight:600; }
          .notice { background:rgba(37, 99, 235, .10); border:1px solid rgba(37, 99, 235, .38); border-radius:.7rem; padding:.8rem 1rem; }
        </style>
        """,
        unsafe_allow_html=True,
    )


def heading(title: str, subtitle: str) -> None:
    st.markdown(f'<p class="eyebrow">CLASSROOM INTELLIGENCE</p><h1 class="title">{title}</h1><p class="subtle">{subtitle}</p>', unsafe_allow_html=True)


def render_dashboard() -> None:
    heading("Dashboard overview", "A privacy-first view of classroom attendance and observable engagement.")
    students, sessions = get_students(), get_sessions()
    completed = [item for item in sessions if item["status"] == "COMPLETED"]
    present = sum(item["present_count"] for item in sessions)
    avg_engagement = round(sum(item["avg_engagement"] for item in sessions) / len(sessions), 1) if sessions else 0.0
    a, b, c, d = st.columns(4)
    a.metric("Active students", len(students))
    b.metric("Sessions", len(sessions))
    c.metric("Confirmed present", present)
    d.metric("Avg. engagement", f"{avg_engagement}%")

    left, right = st.columns([1.45, 1])
    with left:
        st.subheader("Recent classroom sessions")
        if sessions:
            rows = [{"Course": x["course_title"], "Class": x["target_class"], "Status": x["status"], "Present": f"{x['present_count']}/{x['attendance_count']}", "Engagement": f"{x['avg_engagement']:.1f}%"} for x in sessions[:8]]
            st.dataframe(rows, hide_index=True, use_container_width=True)
        else:
            st.markdown('<div class="card">No sessions yet. Start a new session to populate your dashboard.</div>', unsafe_allow_html=True)
    with right:
        st.subheader("Quick actions")
        if st.button("＋ Add a student", use_container_width=True):
            navigate_to("Students")
            st.rerun()
        if st.button("▶ Start a session", use_container_width=True):
            navigate_to("Start session")
            st.rerun()
        st.markdown('<div class="notice">Model resources are loaded only when face enrollment or video analysis is started.</div>', unsafe_allow_html=True)


def render_students() -> None:
    heading("Student directory", "Manage enrolled learners, consent, and temporary face enrollment data.")
    with st.expander("Add student", expanded=False):
        with st.form("create_student", clear_on_submit=True):
            one, two = st.columns(2)
            student_id = one.text_input("Student ID", placeholder="CS-2024-001")
            full_name = two.text_input("Full name")
            course = one.text_input("Class / cohort", placeholder="Computer Science A")
            email = two.text_input("Email (optional)")
            consent = st.checkbox("Biometric consent has been granted")
            submitted = st.form_submit_button("Add student", type="primary")
        if submitted:
            if not all([student_id, full_name, course]):
                st.error("Student ID, full name, and class are required.")
            else:
                async def action(db):
                    return await StudentService.create(db, StudentCreate(student_id=student_id, full_name=full_name, course_name=course, email=email or None, has_consented=consent))
                try:
                    run_async(with_db(action))
                    st.success("Student added.")
                    st.rerun()
                except Exception as exc:
                    st.error(str(exc))

    students = get_students()
    if not students:
        st.info("No students have been added yet.")
        return
    rows = [{"ID": x["student_id"], "Name": x["full_name"], "Class": x["course_name"], "Consent": "Granted" if x["has_consented"] else "Not granted", "Face enrolled": "Yes" if x["has_embedding"] else "No"} for x in students]
    st.dataframe(rows, hide_index=True, use_container_width=True)
    chosen = st.selectbox("Manage a student", students, format_func=lambda x: f"{x['full_name']} · {x['student_id']}")
    first, second = st.columns(2)
    if first.button("Toggle biometric consent"):
        async def action(db):
            return await StudentService.update_consent(db, chosen["id"], StudentConsentUpdate(has_consented=not chosen["has_consented"], notes="Updated from Streamlit demo"))
        run_async(with_db(action))
        st.rerun()
    if second.button("Delete student", type="secondary"):
        async def action(db):
            return await StudentService.delete(db, chosen["id"])
        run_async(with_db(action))
        st.rerun()


def render_enrollment() -> None:
    heading("Student & face enrollment", "Face embeddings remain temporary and are cleared when the deployment restarts.")
    consented = [x for x in get_students() if x["has_consented"]]
    if not consented:
        st.warning("Add a student and grant biometric consent before enrollment.")
        return
    student = st.selectbox("Student", consented, format_func=lambda x: f"{x['full_name']} · {x['student_id']}")
    image = st.file_uploader("Upload a clear frontal face image", type=["jpg", "jpeg", "png"])
    if image:
        st.image(image, width=220)
    if st.button("Create temporary face embedding", type="primary", disabled=image is None):
        with st.spinner("Loading face model and creating embedding…"):
            try:
                import cv2
                import numpy as np
                raw = image.getvalue()
                frame = cv2.imdecode(np.frombuffer(raw, np.uint8), cv2.IMREAD_COLOR)
                engine = get_face_engine()
                face = engine.detect_face(frame)
                embedding = engine.extract_embedding(face) if face is not None else None
                if embedding is None:
                    st.error("No usable face embedding could be created from that image.")
                    return
                async def action(db):
                    return await StudentService.store_face_embedding(db, student["id"], embedding, raw)
                run_async(with_db(action))
                st.success("Face embedding created for this deployment session.")
            except Exception as exc:
                st.error(f"Enrollment failed: {exc}")


def render_start_session() -> None:
    heading("Start a new session", "Create a live, recorded-video, or demo classroom session.")
    with st.form("create_session"):
        left, right = st.columns(2)
        course_title = left.text_input("Course title", placeholder="Introduction to Algorithms")
        target_class = right.text_input("Target class", placeholder="Computer Science A")
        instructor = left.text_input("Instructor name")
        room = right.text_input("Room / location", placeholder="Lab 204")
        duration = left.number_input("Expected duration (minutes)", min_value=5, max_value=360, value=60)
        source = right.selectbox("Session mode", ["LIVE", "VIDEO_UPLOAD", "DEMO"], format_func=lambda x: {"LIVE": "Live camera", "VIDEO_UPLOAD": "Recorded video", "DEMO": "Demo session"}[x])
        created = st.form_submit_button("Create session", type="primary")
    if created:
        if not all([course_title, target_class, instructor]):
            st.error("Course title, target class, and instructor are required.")
            return
        async def action(db):
            return await SessionService.create(db, SessionCreate(course_title=course_title, target_class=target_class, instructor_name=instructor, room_number=room or None, expected_duration_minutes=int(duration), source_type=source))
        session = run_async(with_db(action))
        st.session_state.active_session_id = session.id
        navigate_to("Live attendance" if source != "VIDEO_UPLOAD" else "Video upload")
        st.success("Session created.")
        st.rerun()


def render_live_attendance() -> None:
    heading("Live attendance tracking", "Review attendance records created by live-frame processing.")
    session_id = select_session()
    if session_id is None:
        return
    async def get_records(db):
        return await AttendanceService.get_by_session(db, session_id)
    records = run_async(with_db(get_records))
    st.caption("Live camera capture is intentionally not started automatically. Use the Video upload page for a full demo analysis.")
    if records:
        st.dataframe([{ "Student": r["student_name"], "Status": r["status"], "Observations": r["observation_count"], "Confidence": r["avg_confidence"], "Manual": r["is_manual_override"] } for r in records], hide_index=True, use_container_width=True)
        record = st.selectbox("Override an attendance record", records, format_func=lambda r: f"{r['student_name']} · {r['status']}")
        status = st.selectbox("Attendance status", ["PRESENT", "LATE", "ABSENT", "LEFT_EARLY", "UNVERIFIED", "PENDING"], index=0)
        if st.button("Save manual override"):
            async def action(db):
                return await AttendanceService.manual_override(db, record["id"], AttendanceUpdate(status=status, notes="Updated from Streamlit dashboard"))
            run_async(with_db(action))
            st.rerun()
    else:
        st.info("No attendance observations have been recorded for this session.")


def render_video_upload() -> None:
    heading("Recorded video ingestion", "Upload a classroom recording to generate attendance and observable engagement analytics.")
    session_id = select_session()
    if session_id is None:
        return
    upload = st.file_uploader("Classroom recording", type=["mp4", "avi", "mov", "mkv", "webm"])
    if st.button("Analyze video", type="primary", disabled=upload is None):
        suffix = Path(upload.name).suffix or ".mp4"
        temp_path = None
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
                temp_file.write(upload.getvalue())
                temp_path = temp_file.name
            with st.spinner("Loading computer-vision models and analyzing the recording…"):
                pipeline = get_video_pipeline()
                async def process(db):
                    session = await SessionService.update_status(db, session_id, "LIVE")
                    enrolled = await StudentService.load_all_consented_embeddings(db, course_name=session.target_class)
                    cache = [(item.id, item.full_name, embedding) for item, embedding in enrolled]
                    result = await pipeline.process_video_file(db, session_id, temp_path, cache)
                    await SessionService.update_status(db, session_id, "COMPLETED")
                    await SuggestionService().generate_and_save_for_session(db, session_id)
                    return result
                run_async(with_db(process))
            st.success("Video processing completed. Open analytics for the results.")
        except Exception as exc:
            st.error(f"Video processing failed: {exc}")
        finally:
            if temp_path and os.path.exists(temp_path):
                os.remove(temp_path)


def render_analytics() -> None:
    heading("Session engagement analytics", "Review attendance, activity, orientation, movement, and audio signals.")
    session_id = select_session()
    if session_id is None:
        return
    async def action(db):
        return await AnalyticsService.get_session_analytics(db, session_id)
    analytics = run_async(with_db(action)).model_dump()
    a, b, c, d = st.columns(4)
    a.metric("Attendance", f"{analytics['attendance_rate']}%")
    b.metric("Present / late", f"{analytics['present_count']} / {analytics['late_count']}")
    c.metric("Interaction", f"{analytics['avg_interaction_score']}%")
    d.metric("Forward-facing", f"{analytics['avg_forward_facing_ratio'] * 100:.0f}%")
    if analytics["timeline"]:
        chart = [{"Window": f"{x['start_seconds']:.0f}s", "Engagement": x["interaction_activity_score"], "Movement": x["movement_intensity"] * 100, "Speech": x["speech_active_ratio"] * 100} for x in analytics["timeline"]]
        st.line_chart(chart, x="Window", y=["Engagement", "Movement", "Speech"])
    else:
        st.info("Process a video or send live frames to populate engagement analytics.")
    st.subheader("Observations")
    for note in analytics["notable_changes"]:
        st.markdown(f"- {note}")


def render_suggestions() -> None:
    heading("AI teaching suggestions", "Rule-based teaching prompts generated from observed engagement and attendance patterns.")
    session_id = select_session()
    if session_id is None:
        return
    service = SuggestionService()
    async def get_items(db):
        return await service.get_by_session(db, session_id)
    suggestions = run_async(with_db(get_items))
    if st.button("Generate suggestions", type="primary"):
        async def generate(db):
            return await service.generate_and_save_for_session(db, session_id)
        suggestions = run_async(with_db(generate))
        st.rerun()
    if not suggestions:
        st.info("No suggestions yet. Generate them after creating attendance or engagement records.")
        return
    for item in suggestions:
        with st.container(border=True):
            st.markdown(f"**{item.title}**  ")
            st.caption(f"{item.urgency} priority · {item.generated_by}")
            st.write(item.description)
            st.caption(item.evidence)
            if not item.acknowledged and st.button("Acknowledge", key=f"ack-{item.id}"):
                async def acknowledge(db, suggestion_id=item.id):
                    return await service.acknowledge(db, suggestion_id)
                run_async(with_db(acknowledge))
                st.rerun()


def render_history() -> None:
    heading("Classroom session history", "Browse every temporary session created in this deployment.")
    sessions = get_sessions()
    if not sessions:
        st.info("No sessions yet.")
        return
    rows = [{"Session": x["session_uid"], "Course": x["course_title"], "Class": x["target_class"], "Status": x["status"], "Mode": x["source_type"], "Present": f"{x['present_count']}/{x['attendance_count']}", "Engagement": f"{x['avg_engagement']:.1f}%"} for x in sessions]
    st.dataframe(rows, hide_index=True, use_container_width=True)


def render_settings() -> None:
    heading("System settings & privacy", "This Streamlit demo is designed for ephemeral, low-traffic usage.")
    st.markdown("""
    <div class="card">
      <p class="status">● Ephemeral deployment mode</p>
      <p>Student records, embeddings, uploaded media, and SQLite data are stored only in the running container. They can disappear when Streamlit Community Cloud restarts the app.</p>
      <p>Computer-vision models are not loaded until a face or video workflow requests them.</p>
    </div>
    """, unsafe_allow_html=True)
    st.code("OLLAMA_BASE_URL=http://localhost:11434\nOLLAMA_MODEL=llama3.2", language="bash")


def main() -> None:
    initialise_store()
    apply_theme()
    pages = ["Dashboard", "Students", "Enroll face", "Start session", "Live attendance", "Video upload", "Session analytics", "Teaching suggestions", "Session history", "Settings & privacy"]
    if "page" not in st.session_state:
        st.session_state.page = "Dashboard"
    if "navigation" not in st.session_state:
        st.session_state.navigation = st.session_state.page
    if "pending_navigation" in st.session_state:
        target_page = st.session_state.pop("pending_navigation")
        st.session_state.navigation = target_page
        st.session_state.page = target_page
    with st.sidebar:
        st.markdown('<div class="brand"><div class="brand-mark">🎓</div><div><b>Multimodal Agent</b><br><span class="eyebrow">Classroom intelligence</span></div></div>', unsafe_allow_html=True)
        selected = st.radio("Navigation", pages, key="navigation", label_visibility="collapsed")
        st.session_state.page = selected
        st.divider()
        st.markdown('<p class="status">● ONLINE · EPHEMERAL DEMO</p>', unsafe_allow_html=True)
        st.caption("Data is intentionally not persistent. ML resources load only when requested.")

    renderers = {
        "Dashboard": render_dashboard,
        "Students": render_students,
        "Enroll face": render_enrollment,
        "Start session": render_start_session,
        "Live attendance": render_live_attendance,
        "Video upload": render_video_upload,
        "Session analytics": render_analytics,
        "Teaching suggestions": render_suggestions,
        "Session history": render_history,
        "Settings & privacy": render_settings,
    }
    renderers[st.session_state.page]()


if __name__ == "__main__":
    main()
