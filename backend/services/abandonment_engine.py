from typing import List, Tuple
from datetime import datetime
from backend.models import Event

class AbandonmentEngine:
    """
    Computes an explainable behavioral proxy for early session abandonment risk.
    Note: Documented as an unsupervised behavioral proxy, NOT claimed as a validated supervised ML model.
    """
    
    @classmethod
    def calculate_risk(
        cls, 
        events: List[Event], 
        session_duration_sec: float,
        friction_score: float
    ) -> Tuple[float, str, str]:
        """
        Returns: (probability, risk_level, reason)
        """
        if not events:
            return 0.10, "LOW", "Session just initiated; baseline low abandonment risk."
            
        now = datetime.utcnow()
        last_event_time = events[-1].timestamp or now
        inactivity_sec = (now - last_event_time).total_seconds() if now > last_event_time else 0
        
        event_count = len(events)
        actions_count = sum(1 for e in events if e.action)
        back_events = sum(1 for e in events if e.event_type == "back" or e.action == "back")
        
        score = 0.10 # baseline
        reasons = []
        
        # Inactivity component
        if inactivity_sec > 180: # > 3 minutes idle
            score += 0.40
            reasons.append(f"Extended user idle period ({int(inactivity_sec)}s)")
        elif inactivity_sec > 60: # > 1 minute idle
            score += 0.20
            reasons.append(f"Moderate inactivity ({int(inactivity_sec)}s)")
            
        # Friction penalty
        if friction_score >= 70:
            score += 0.35
            reasons.append("High navigation friction and page looping detected")
        elif friction_score >= 40:
            score += 0.20
            reasons.append("Moderate navigation hesitation observed")
            
        # Rapid back events (frustration signal)
        if back_events >= 2:
            score += 0.20
            reasons.append(f"Multiple rapid back navigations ({back_events})")
            
        # Single-event / low-engagement early sessions
        if event_count <= 2 and session_duration_sec > 45:
            score += 0.25
            reasons.append("Slow pacing without meaningful content interaction")
            
        # Mitigating factor: high action engagement
        if actions_count >= 3:
            score = max(0.05, score - 0.20)
            reasons.append("Active interaction with content cards mitigates abandonment risk")
            
        probability = round(min(0.95, max(0.05, score)), 2)
        
        if probability < 0.30:
            risk_level = "LOW"
        elif probability < 0.70:
            risk_level = "MEDIUM"
        else:
            risk_level = "HIGH"
            
        reason_text = "Behavioral proxy: " + ("; ".join(reasons) if reasons else "Normal session pacing observed.")
        return probability, risk_level, reason_text
