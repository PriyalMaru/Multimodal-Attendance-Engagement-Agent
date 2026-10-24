import json
import httpx
import numpy as np
from typing import List, Dict, Optional
from app.core.config import settings

class TeachingSuggestionAgent:
    """
    Offline-first AI Teaching Suggestion Engine.
    Implements a multi-step analytical workflow:
    1. Metrics Retrieval & Data Sufficiency Check
    2. Behavioral Pattern Identification (Drops, audio silence, volatility)
    3. Context-aware Pedagogical Suggestion Generation
    4. Validation & Safe Educational Fallbacks
    """
    def __init__(self, ollama_url: str = settings.OLLAMA_BASE_URL, model_name: str = settings.OLLAMA_MODEL):
        self.ollama_url = ollama_url
        self.model_name = model_name

    def analyze_patterns(self, windows: List[Dict], attendance_stats: Dict) -> Dict:
        """Step 2: Detect patterns from observable window signals."""
        if not windows:
            return {"insufficient_data": True}

        scores = [w.get("interaction_activity_score", 0.0) for w in windows]
        motions = [w.get("movement_intensity", 0.0) for w in windows]
        speeches = [w.get("speech_active_ratio", 0.0) for w in windows]
        forwards = [w.get("forward_facing_ratio", 0.0) for w in windows]
        
        has_audio = any(w.get("is_audio_available", False) for w in windows)

        # Detect consecutive drops in last 3 windows
        consecutive_drops = 0
        for i in range(1, len(scores)):
            if scores[i] < scores[i - 1] - 5.0:
                consecutive_drops += 1
            else:
                consecutive_drops = 0

        # Detect volatility (standard deviation)
        volatility = float(np.std(scores)) if len(scores) > 1 else 0.0

        # Detect prolonged low audio
        avg_speech = float(np.mean(speeches)) if speeches else 0.0

        # Detect low forward-facing orientation
        avg_fwd = float(np.mean(forwards)) if forwards else 0.0

        # Attendance verification needs
        unverified_count = attendance_stats.get("unverified_count", 0)

        return {
            "insufficient_data": len(windows) < 1,
            "windows_count": len(windows),
            "consecutive_drops": consecutive_drops >= 2,
            "high_volatility": volatility > 18.0,
            "prolonged_silence": has_audio and (avg_speech < 0.08),
            "low_forward_orientation": avg_fwd < 0.35,
            "unverified_attendance": unverified_count > 0,
            "avg_score": float(np.mean(scores)),
            "volatility": volatility,
            "has_audio": has_audio
        }

    def generate_rule_based_suggestions(self, patterns: Dict, attendance_stats: Dict) -> List[Dict]:
        """Deterministic rule-based pedagogical expert fallback."""
        suggestions = []

        if patterns.get("insufficient_data"):
            return [{
                "suggestion_type": "DATA_NOTICE",
                "title": "Awaiting Additional Session Observations",
                "description": "Session has fewer than 1 observation window. Continue recording to generate meaningful suggestions.",
                "evidence": "Observed window count is zero or session just initiated.",
                "urgency": "LOW",
                "generated_by": "RULE_BASED"
            }]

        if patterns.get("consecutive_drops"):
            suggestions.append({
                "suggestion_type": "ENGAGEMENT_DROP",
                "title": "Introduce Interactive Check-in or Think-Pair-Share",
                "description": "Observable physical movement and forward orientation have decreased across successive observation windows. Consider pausing for an interactive poll or brief peer discussion.",
                "evidence": f"Observable activity score declined across consecutive windows (Current average: {patterns.get('avg_score', 0):.1f}/100).",
                "urgency": "MEDIUM",
                "generated_by": "RULE_BASED"
            })

        if patterns.get("prolonged_silence"):
            suggestions.append({
                "suggestion_type": "LOW_AUDIO",
                "title": "Encourage Verbal Participation or Q&A",
                "description": "Audio activity has remained consistently low. Consider posing an open-ended question or calling for volunteer responses.",
                "evidence": "Microphone audio analysis detected under 8% speech activity over recent intervals.",
                "urgency": "LOW",
                "generated_by": "RULE_BASED"
            })

        if patterns.get("high_volatility"):
            suggestions.append({
                "suggestion_type": "INTERACTION_PEAK",
                "title": "Review Lesson Transition Pacing",
                "description": "Activity signals show marked fluctuations. Verify that transitions between instructional lecturing and independent/group exercises are clearly signposted.",
                "evidence": f"Activity standard deviation is elevated ({patterns.get('volatility', 0):.1f} points).",
                "urgency": "MEDIUM",
                "generated_by": "RULE_BASED"
            })

        if patterns.get("unverified_attendance"):
            unv = attendance_stats.get("unverified_count", 0)
            suggestions.append({
                "suggestion_type": "ATTENDANCE_VERIFICATION",
                "title": f"Manual Verification Required for {unv} Unverified Presence(s)",
                "description": "Several detected attendees could not be confirmed against consented biometric records. Please review the unverified attendance queue.",
                "evidence": f"{unv} presence sightings had low face similarity match scores or belong to un-enrolled students.",
                "urgency": "HIGH",
                "generated_by": "RULE_BASED"
            })

        if not suggestions:
            suggestions.append({
                "suggestion_type": "STEADY_FLOW",
                "title": "Maintain Current Instructional Rhythm",
                "description": "Observed behavioral indicators reflect stable, sustained classroom interaction. Current delivery pacing appears effective.",
                "evidence": f"Signals are consistent across {patterns.get('windows_count', 0)} windows with moderate baseline activity ({patterns.get('avg_score', 0):.1f}/100).",
                "urgency": "LOW",
                "generated_by": "RULE_BASED"
            })

        return suggestions

    async def generate_ollama_suggestions(self, patterns: Dict, attendance_stats: Dict) -> Optional[List[Dict]]:
        """Optional local LLM inference via Ollama with strict deterministic fallback."""
        prompt = f"""
You are an expert pedagogical advisor analyzing offline classroom observations.
Based strictly on observable behavioral indicators below, produce 1 to 3 concise, actionable teaching suggestions for the instructor.
Do NOT make assumptions about internal thoughts, intelligence, or comprehension.
Signals:
- Windows recorded: {patterns.get('windows_count')}
- Average observable score: {patterns.get('avg_score', 0):.1f}/100
- Consecutive activity drops: {patterns.get('consecutive_drops')}
- Prolonged audio silence: {patterns.get('prolonged_silence')}
- High volatility in movement: {patterns.get('high_volatility')}
- Unverified attendees: {attendance_stats.get('unverified_count', 0)}

Return ONLY a valid JSON list of objects with keys: "suggestion_type", "title", "description", "evidence", "urgency" (LOW/MEDIUM/HIGH).
"""
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.post(
                    f"{self.ollama_url}/api/generate",
                    json={
                        "model": self.model_name,
                        "prompt": prompt,
                        "stream": False,
                        "format": "json"
                    }
                )
                if res.status_code == 200:
                    data = res.json()
                    raw_text = data.get("response", "")
                    parsed = json.loads(raw_text)
                    if isinstance(parsed, list):
                        for item in parsed:
                            item["generated_by"] = "OLLAMA"
                        return parsed
        except Exception:
            # Silently fall back to rule-based engine
            pass
        return None

    async def get_suggestions(self, windows: List[Dict], attendance_stats: Dict) -> List[Dict]:
        """Unified orchestrator: analyzes patterns, attempts Ollama, falls back to deterministic rule engine."""
        patterns = self.analyze_patterns(windows, attendance_stats)
        
        # Attempt local LLM
        ollama_results = await self.generate_ollama_suggestions(patterns, attendance_stats)
        if ollama_results:
            return ollama_results

        # Rule-based fallback
        return self.generate_rule_based_suggestions(patterns, attendance_stats)
